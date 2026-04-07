import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Inventory from '../Components/Inventory';
import PlayerEquipment from '../Components/PlayerEquipment';
import CombatBattle from '../Components/CombatBattle';
import { BLOCK_TEXTURE_BY_FILE, getAuthHeaders, resolveIconPath, toNumberOrNull } from '../Components/MiningUtils';
import {
	ATTACK_STYLES,
	battleModes,
	calculateMitigatedDamage,
	calculatePlayerHitDamage,
	formatDropQuantityRange,
	formatDropChancePercent,
	getPlayerId,
	normalizeMob,
	rollDropQuantity,
} from '../Components/CombatUtils';
import '../Styles/GlobalStyles.css';
import '../Styles/CombatStyles.css';
import '../Styles/InventoryStyles.css';

const COMBAT_HELD_ITEM_STORAGE_KEY = 'combatHeldInventoryItem';
const COMBAT_MELEE_ITEM_STORAGE_KEY = 'combatMeleeInventoryItem';
const COMBAT_BOW_ITEM_STORAGE_KEY = 'combatBowInventoryItem';
const COMBAT_ARROW_ITEM_STORAGE_KEY = 'combatArrowInventoryItem';
const SELLING_SELECTED_ITEM_STORAGE_KEY = 'sellingSelectedInventoryItem';

const toCategoryKey = (value) => (value ?? '').toString().trim().toLowerCase();

const isBowCategory = (category) => toCategoryKey(category) === 'combat_weapon_bows';

const isArrowCategory = (category) => toCategoryKey(category).includes('arrow');

const isMeleeWeaponCategory = (category) => {
	const normalized = toCategoryKey(category);
	return normalized.includes('combat_weapon') && !isBowCategory(normalized) && !isArrowCategory(normalized);
};

const formatLocationLabel = (location) => {
	const normalized = (location ?? '').toString().trim();
	if (!normalized) {
		return 'Unknown';
	}

	return normalized.replace(/_/g, ' ');
};

const normalizeInventorySlot = (slot) => ({
	idPlayerInventorySlots: toNumberOrNull(slot.idPlayerInventorySlots ?? slot.IdPlayerInventorySlots),
	slotIndex: toNumberOrNull(slot.slotIndex ?? slot.SlotIndex),
	quantity: toNumberOrNull(slot.quantity ?? slot.Quantity) ?? 0,
	fkItemidItem: toNumberOrNull(slot.fkItemidItem ?? slot.FkItemidItem),
	itemName: slot.itemName ?? slot.ItemName ?? '',
	itemIcon: slot.itemIcon ?? slot.ItemIcon ?? '',
	itemCategory: slot.itemCategory ?? slot.ItemCategory ?? slot.category ?? slot.Category ?? '',
});

const parseStoredSelection = (storageKey) => {
	const raw = localStorage.getItem(storageKey);
	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
};

const Combat = () => {
	const [playerId] = useState(getPlayerId);
	const [mobs, setMobs] = useState([]);
	const [skills, setSkills] = useState([]);
	const [playerSkills, setPlayerSkills] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedMobId, setSelectedMobId] = useState(null);
	const [battleMode, setBattleMode] = useState('manual');
	const [attackStyle, setAttackStyle] = useState('melee');
	const [playerHealth, setPlayerHealth] = useState(0);
	const [playerMaxHealth, setPlayerMaxHealth] = useState(0);
	const [playerDefense, setPlayerDefense] = useState(0);
	const [playerBaseDamage, setPlayerBaseDamage] = useState(1);
	const [playerStrength, setPlayerStrength] = useState(0);
	const [playerCritDamage, setPlayerCritDamage] = useState(0);
	const [meleeWeaponDamageBonus, setMeleeWeaponDamageBonus] = useState(0);
	const [bowDamageBonus, setBowDamageBonus] = useState(0);
	const [meleeSlot, setMeleeSlot] = useState(() => parseStoredSelection(COMBAT_MELEE_ITEM_STORAGE_KEY));
	const [bowSlot, setBowSlot] = useState(() => parseStoredSelection(COMBAT_BOW_ITEM_STORAGE_KEY));
	const [arrowSlot, setArrowSlot] = useState(() => parseStoredSelection(COMBAT_ARROW_ITEM_STORAGE_KEY));
	const [enemyDefense, setEnemyDefense] = useState(0);
	const [heldItemRefreshTick, setHeldItemRefreshTick] = useState(0);
	const [enemyHealth, setEnemyHealth] = useState(0);
	const [isBattling, setIsBattling] = useState(false);
	const [battleLog, setBattleLog] = useState([]);
	const [lootResults, setLootResults] = useState([]);
	const [rewardMessage, setRewardMessage] = useState('');
	const [meleeSlotMessage, setMeleeSlotMessage] = useState('');
	const [bowSlotMessage, setBowSlotMessage] = useState('');
	const [arrowSlotMessage, setArrowSlotMessage] = useState('');
	const [isRollingLoot, setIsRollingLoot] = useState(false);
	const [isDropsModalOpen, setIsDropsModalOpen] = useState(false);
	const [isMobSelectModalOpen, setIsMobSelectModalOpen] = useState(false);
	const [collapsedLocationGroups, setCollapsedLocationGroups] = useState({});
	const [inventoryRefreshTick, setInventoryRefreshTick] = useState(0);
	const [equipmentRefreshTick, setEquipmentRefreshTick] = useState(0);
	const selectedMobRef = useRef(null);
	const playerHealthRef = useRef(0);
	const enemyHealthRef = useRef(0);
	const battleModeRef = useRef('manual');
	const attackStyleRef = useRef('melee');
	const isBattlingRef = useRef(false);
	const attackLockRef = useRef(false);
	const pendingArrowConsumptionRef = useRef({
		itemId: null,
		quantity: 0,
	});

	const handleInventoryChanged = useCallback(() => {
		setInventoryRefreshTick((prev) => prev + 1);
	}, []);

	const handleEquipmentChanged = useCallback(() => {
		setEquipmentRefreshTick((prev) => prev + 1);
	}, []);

	useEffect(() => {
		selectedMobRef.current = mobs.find((mob) => mob.idMob === selectedMobId) ?? null;
	}, [mobs, selectedMobId]);

	useEffect(() => {
		playerHealthRef.current = playerHealth;
	}, [playerHealth]);

	useEffect(() => {
		enemyHealthRef.current = enemyHealth;
	}, [enemyHealth]);

	useEffect(() => {
		battleModeRef.current = battleMode;
	}, [battleMode]);

	useEffect(() => {
		attackStyleRef.current = attackStyle;
	}, [attackStyle]);

	useEffect(() => {
		isBattlingRef.current = isBattling;
	}, [isBattling]);

	useEffect(() => {
		const onHeldItemSelected = () => {
			setHeldItemRefreshTick((prev) => prev + 1);
		};

		const onStorageSync = (event) => {
			if (event?.key === COMBAT_HELD_ITEM_STORAGE_KEY
				|| event?.key === COMBAT_MELEE_ITEM_STORAGE_KEY
				|| event?.key === COMBAT_BOW_ITEM_STORAGE_KEY
				|| event?.key === COMBAT_ARROW_ITEM_STORAGE_KEY) {
				setHeldItemRefreshTick((prev) => prev + 1);
			}
		};

		window.addEventListener('combat-held-item-selected', onHeldItemSelected);
		window.addEventListener('storage', onStorageSync);
		return () => {
			window.removeEventListener('combat-held-item-selected', onHeldItemSelected);
			window.removeEventListener('storage', onStorageSync);
		};
	}, []);

	useEffect(() => {
		if (!isDropsModalOpen && !isMobSelectModalOpen) {
			return undefined;
		}

		const onEscape = (event) => {
			if (event.key === 'Escape') {
				setIsDropsModalOpen(false);
				setIsMobSelectModalOpen(false);
			}
		};

		window.addEventListener('keydown', onEscape);
		return () => window.removeEventListener('keydown', onEscape);
	}, [isDropsModalOpen, isMobSelectModalOpen]);

	useEffect(() => {
		const fetchCombatData = async () => {
			try {
				setIsLoading(true);
				setError('');

				const requests = [
					axios.get('http://localhost:5091/api/Mob/GetCombatMobs', {
						headers: { Accept: 'application/json' },
					}),
					axios.get('http://localhost:5091/api/Skills/GetSkills', {
						headers: { Accept: 'application/json' },
					}),
					axios.get('http://localhost:5091/api/Stats/GetStats', {
						headers: { Accept: 'application/json' },
					}),
				];

				if (playerId) {
					requests.push(
						axios.get('http://localhost:5091/api/PlayerSkills/GetPlayerSkills', {
							params: { playerId },
							validateStatus: (status) => status === 200 || status === 404,
							headers: {
								Accept: 'application/json',
								...getAuthHeaders(),
							},
						}),
						axios.get('http://localhost:5091/api/Stats/GetPlayerStats', {
							params: { playerId },
							validateStatus: (status) => status === 200 || status === 404,
							headers: {
								Accept: 'application/json',
								...getAuthHeaders(),
							},
						}),
						axios.get('http://localhost:5091/api/PlayerEquipment/GetPlayerEquipment', {
							params: { playerId },
							validateStatus: (status) => status === 200 || status === 404,
							headers: {
								Accept: 'application/json',
								...getAuthHeaders(),
							},
						}),
						axios.get('http://localhost:5091/api/Inventory/GetInventory', {
							params: { playerId },
							validateStatus: (status) => status === 200 || status === 404,
							headers: {
								Accept: 'application/json',
								...getAuthHeaders(),
							},
						})
					);
				}

				const [
					mobsResponse,
					skillsResponse,
					statsResponse,
					playerSkillsResponse,
					playerStatsResponse,
					playerEquipmentResponse,
					inventoryResponse,
				] = await Promise.all(requests);
				const normalizedMobs = Array.isArray(mobsResponse.data) ? mobsResponse.data.map(normalizeMob) : [];
				setMobs(normalizedMobs);
				setSkills(Array.isArray(skillsResponse.data) ? skillsResponse.data : []);
				setPlayerSkills(playerSkillsResponse?.status === 404
					? []
					: (Array.isArray(playerSkillsResponse?.data) ? playerSkillsResponse.data : []));

				const allStats = Array.isArray(statsResponse?.data) ? statsResponse.data : [];
				if (playerStatsResponse && playerStatsResponse.status === 200 && Array.isArray(playerStatsResponse.data)) {
					const healthStatDefinition = allStats.find((statDef) => {
						const statName = (statDef.name ?? statDef.Name ?? '').toLowerCase().trim();
						return statName === 'health';
					});
					const healthStatId = toNumberOrNull(healthStatDefinition?.idStats ?? healthStatDefinition?.IdStats);

					const defenseStatDefinition = allStats.find((statDef) => {
						const statName = (statDef.name ?? statDef.Name ?? '').toLowerCase().trim();
						return statName === 'defense';
					});
					const defenseStatId = toNumberOrNull(defenseStatDefinition?.idStats ?? defenseStatDefinition?.IdStats);

					const damageStatDefinition = allStats.find((statDef) => {
						const statName = (statDef.name ?? statDef.Name ?? '').toLowerCase().trim();
						return statName === 'damage';
					});
					const damageStatId = toNumberOrNull(damageStatDefinition?.idStats ?? damageStatDefinition?.IdStats);

					const strengthStatDefinition = allStats.find((statDef) => {
						const statName = (statDef.name ?? statDef.Name ?? '').toLowerCase().trim();
						return statName === 'strength';
					});
					const strengthStatId = toNumberOrNull(strengthStatDefinition?.idStats ?? strengthStatDefinition?.IdStats);

					const critDamageStatDefinition = allStats.find((statDef) => {
						const statName = (statDef.name ?? statDef.Name ?? '').toLowerCase().trim().replace(/\s+/g, '');
						return statName === 'critdamage';
					});
					const critDamageStatId = toNumberOrNull(critDamageStatDefinition?.idStats ?? critDamageStatDefinition?.IdStats);

					const healthStat = healthStatId == null
						? null
						: playerStatsResponse.data.find((stat) => toNumberOrNull(stat.fkStatsidStats ?? stat.FkStatsidStats) === healthStatId);

					if (healthStat) {
						const healthValue = toNumberOrNull(healthStat.value ?? healthStat.Value);
						if (healthValue !== null && healthValue > 0) {
							setPlayerMaxHealth(healthValue);
							if (isBattlingRef.current) {
								setPlayerHealth((currentHealth) => {
									const nextHealth = Math.min(currentHealth, healthValue);
									playerHealthRef.current = nextHealth;
									return nextHealth;
								});
							} else {
								setPlayerHealth(healthValue);
								playerHealthRef.current = healthValue;
							}
						}
					}

					const playerDefenseStat = defenseStatId == null
						? null
						: playerStatsResponse.data.find((stat) => toNumberOrNull(stat.fkStatsidStats ?? stat.FkStatsidStats) === defenseStatId);
					const playerBaseDefense = toNumberOrNull(playerDefenseStat?.value ?? playerDefenseStat?.Value) ?? 0;

					const playerDamageStat = damageStatId == null
						? null
						: playerStatsResponse.data.find((stat) => toNumberOrNull(stat.fkStatsidStats ?? stat.FkStatsidStats) === damageStatId);
					const playerBaseDamageFromStats = toNumberOrNull(playerDamageStat?.value ?? playerDamageStat?.Value) ?? 0;

					const playerStrengthStat = strengthStatId == null
						? null
						: playerStatsResponse.data.find((stat) => toNumberOrNull(stat.fkStatsidStats ?? stat.FkStatsidStats) === strengthStatId);
					const playerBaseStrength = toNumberOrNull(playerStrengthStat?.value ?? playerStrengthStat?.Value) ?? 0;

					const playerCritDamageStat = critDamageStatId == null
						? null
						: playerStatsResponse.data.find((stat) => toNumberOrNull(stat.fkStatsidStats ?? stat.FkStatsidStats) === critDamageStatId);
					const playerBaseCritDamage = toNumberOrNull(playerCritDamageStat?.value ?? playerCritDamageStat?.Value) ?? 0;

					const equipmentRows = Array.isArray(playerEquipmentResponse?.data) ? playerEquipmentResponse.data : [];
					const inventorySlots = Array.isArray(inventoryResponse?.data)
						? inventoryResponse.data.map(normalizeInventorySlot)
						: [];

					const persistedMelee = parseStoredSelection(COMBAT_MELEE_ITEM_STORAGE_KEY);
					const persistedMeleeItemId = toNumberOrNull(persistedMelee?.fkItemidItem);
					const persistedMeleeSlotIndex = toNumberOrNull(persistedMelee?.slotIndex);
					const matchedMeleeSlot = inventorySlots.find((slot) => {
						const slotItemId = toNumberOrNull(slot.fkItemidItem);
						const slotIndex = toNumberOrNull(slot.slotIndex);
						return persistedMeleeItemId != null
							&& slotItemId === persistedMeleeItemId
							&& slotIndex === persistedMeleeSlotIndex
							&& (toNumberOrNull(slot.quantity) ?? 0) > 0
							&& isMeleeWeaponCategory(slot.itemCategory);
					});

					const meleeItemId = toNumberOrNull(matchedMeleeSlot?.fkItemidItem);
					let bowItemId = null;

					if (matchedMeleeSlot) {
						const nextMeleeSlot = {
							idPlayerInventorySlots: matchedMeleeSlot.idPlayerInventorySlots,
							slotIndex: matchedMeleeSlot.slotIndex,
							fkItemidItem: matchedMeleeSlot.fkItemidItem,
							quantity: matchedMeleeSlot.quantity,
							itemName: matchedMeleeSlot.itemName,
							itemIcon: matchedMeleeSlot.itemIcon,
							itemCategory: matchedMeleeSlot.itemCategory,
						};

						setMeleeSlot(nextMeleeSlot);
						localStorage.setItem(COMBAT_MELEE_ITEM_STORAGE_KEY, JSON.stringify(nextMeleeSlot));
					} else {
						setMeleeSlot(null);
						setMeleeWeaponDamageBonus(0);
						localStorage.removeItem(COMBAT_MELEE_ITEM_STORAGE_KEY);
					}

					const persistedBow = parseStoredSelection(COMBAT_BOW_ITEM_STORAGE_KEY);
					const persistedBowItemId = toNumberOrNull(persistedBow?.fkItemidItem);
					const persistedBowSlotIndex = toNumberOrNull(persistedBow?.slotIndex);
					const matchedBowSlot = inventorySlots.find((slot) => {
						const slotItemId = toNumberOrNull(slot.fkItemidItem);
						const slotIndex = toNumberOrNull(slot.slotIndex);
						return persistedBowItemId != null
							&& slotItemId === persistedBowItemId
							&& slotIndex === persistedBowSlotIndex
							&& (toNumberOrNull(slot.quantity) ?? 0) > 0
							&& isBowCategory(slot.itemCategory);
					});

					if (matchedBowSlot) {
						const nextBowSlot = {
							idPlayerInventorySlots: matchedBowSlot.idPlayerInventorySlots,
							slotIndex: matchedBowSlot.slotIndex,
							fkItemidItem: matchedBowSlot.fkItemidItem,
							quantity: matchedBowSlot.quantity,
							itemName: matchedBowSlot.itemName,
							itemIcon: matchedBowSlot.itemIcon,
							itemCategory: matchedBowSlot.itemCategory,
						};
						bowItemId = toNumberOrNull(nextBowSlot.fkItemidItem);

						setBowSlot(nextBowSlot);
						localStorage.setItem(COMBAT_BOW_ITEM_STORAGE_KEY, JSON.stringify(nextBowSlot));
					} else {
						setBowSlot(null);
						setBowDamageBonus(0);
						localStorage.removeItem(COMBAT_BOW_ITEM_STORAGE_KEY);
					}

					const persistedArrow = parseStoredSelection(COMBAT_ARROW_ITEM_STORAGE_KEY);
					const persistedArrowItemId = toNumberOrNull(persistedArrow?.fkItemidItem);
					const persistedArrowSlotIndex = toNumberOrNull(persistedArrow?.slotIndex);
					const matchedArrowSlot = inventorySlots.find((slot) => {
						const slotItemId = toNumberOrNull(slot.fkItemidItem);
						const slotIndex = toNumberOrNull(slot.slotIndex);
						return persistedArrowItemId != null
							&& slotItemId === persistedArrowItemId
							&& slotIndex === persistedArrowSlotIndex
							&& (toNumberOrNull(slot.quantity) ?? 0) > 0
							&& isArrowCategory(slot.itemCategory);
					});

					if (matchedArrowSlot) {
						const nextArrowSlot = {
							idPlayerInventorySlots: matchedArrowSlot.idPlayerInventorySlots,
							slotIndex: matchedArrowSlot.slotIndex,
							fkItemidItem: matchedArrowSlot.fkItemidItem,
							quantity: matchedArrowSlot.quantity,
							itemName: matchedArrowSlot.itemName,
							itemIcon: matchedArrowSlot.itemIcon,
							itemCategory: matchedArrowSlot.itemCategory,
						};

						setArrowSlot(nextArrowSlot);
						localStorage.setItem(COMBAT_ARROW_ITEM_STORAGE_KEY, JSON.stringify(nextArrowSlot));
					} else {
						setArrowSlot(null);
						localStorage.removeItem(COMBAT_ARROW_ITEM_STORAGE_KEY);
					}

					const itemIdCounts = new Map();
					for (const row of equipmentRows) {
						const itemId = toNumberOrNull(row.fkItemidItem ?? row.FkItemidItem);
						if (itemId == null) {
							continue;
						}
						itemIdCounts.set(itemId, (itemIdCounts.get(itemId) ?? 0) + 1);
					}

					let gearAndHeldDefense = 0;
					let gearAndHeldDamage = 0;
					let gearAndHeldStrength = 0;
					let gearAndHeldCritDamage = 0;
					if (defenseStatId != null && itemIdCounts.size > 0) {
						const uniqueItemIds = [...itemIdCounts.keys()];
						const itemStatsResponses = await Promise.all(uniqueItemIds.map((itemId) => axios.get('http://localhost:5091/api/Stats/GetItemStats', {
							params: { itemId },
							validateStatus: (status) => status === 200 || status === 404,
							headers: {
								Accept: 'application/json',
								...getAuthHeaders(),
							},
						})));

						for (let index = 0; index < uniqueItemIds.length; index += 1) {
							const itemId = uniqueItemIds[index];
							const count = itemIdCounts.get(itemId) ?? 0;
							const itemStats = Array.isArray(itemStatsResponses[index]?.data) ? itemStatsResponses[index].data : [];
							const defenseEntry = itemStats.find((entry) => toNumberOrNull(entry.fkStatsidStats ?? entry.FkStatsidStats) === defenseStatId);
							const defenseValue = toNumberOrNull(defenseEntry?.value ?? defenseEntry?.Value) ?? 0;
							gearAndHeldDefense += defenseValue * count;

							if (damageStatId != null) {
								const damageEntry = itemStats.find((entry) => toNumberOrNull(entry.fkStatsidStats ?? entry.FkStatsidStats) === damageStatId);
								const damageValue = toNumberOrNull(damageEntry?.value ?? damageEntry?.Value) ?? 0;
								gearAndHeldDamage += damageValue * count;
							}

							if (strengthStatId != null) {
								const strengthEntry = itemStats.find((entry) => toNumberOrNull(entry.fkStatsidStats ?? entry.FkStatsidStats) === strengthStatId);
								const strengthValue = toNumberOrNull(strengthEntry?.value ?? strengthEntry?.Value) ?? 0;
								gearAndHeldStrength += strengthValue * count;
							}

							if (critDamageStatId != null) {
								const critDamageEntry = itemStats.find((entry) => toNumberOrNull(entry.fkStatsidStats ?? entry.FkStatsidStats) === critDamageStatId);
								const critDamageValue = toNumberOrNull(critDamageEntry?.value ?? critDamageEntry?.Value) ?? 0;
								gearAndHeldCritDamage += critDamageValue * count;
							}
						}
					}

					setPlayerDefense(Math.max(0, playerBaseDefense + gearAndHeldDefense));
					setPlayerBaseDamage(Math.max(1, playerBaseDamageFromStats + gearAndHeldDamage));
					setPlayerStrength(Math.max(0, playerBaseStrength + gearAndHeldStrength));
					setPlayerCritDamage(Math.max(0, playerBaseCritDamage + gearAndHeldCritDamage));

					if (meleeItemId != null && damageStatId != null) {
						try {
							const meleeStatsResponse = await axios.get('http://localhost:5091/api/Stats/GetItemStats', {
								params: { itemId: meleeItemId },
								validateStatus: (status) => status === 200 || status === 404,
								headers: {
									Accept: 'application/json',
									...getAuthHeaders(),
								},
							});

							const meleeStats = Array.isArray(meleeStatsResponse?.data) ? meleeStatsResponse.data : [];
							const meleeDamageEntry = meleeStats.find((entry) => toNumberOrNull(entry.fkStatsidStats ?? entry.FkStatsidStats) === damageStatId);
							const meleeDamageValue = toNumberOrNull(meleeDamageEntry?.value ?? meleeDamageEntry?.Value) ?? 0;
							setMeleeWeaponDamageBonus(Math.max(0, meleeDamageValue));
						} catch {
							setMeleeWeaponDamageBonus(0);
						}
					} else {
						setMeleeWeaponDamageBonus(0);
					}

					if (bowItemId != null && damageStatId != null) {
						try {
							const bowStatsResponse = await axios.get('http://localhost:5091/api/Stats/GetItemStats', {
								params: { itemId: bowItemId },
								validateStatus: (status) => status === 200 || status === 404,
								headers: {
									Accept: 'application/json',
									...getAuthHeaders(),
								},
							});

							const bowStats = Array.isArray(bowStatsResponse?.data) ? bowStatsResponse.data : [];
							const bowDamageEntry = bowStats.find((entry) => toNumberOrNull(entry.fkStatsidStats ?? entry.FkStatsidStats) === damageStatId);
							const bowDamageValue = toNumberOrNull(bowDamageEntry?.value ?? bowDamageEntry?.Value) ?? 0;
							setBowDamageBonus(Math.max(0, bowDamageValue));
						} catch {
							setBowDamageBonus(0);
						}
					} else {
						setBowDamageBonus(0);
					}
				}

				setSelectedMobId((currentSelectedMobId) => currentSelectedMobId ?? normalizedMobs[0]?.idMob ?? null);
			} catch (fetchError) {
				console.error('Failed to load combat data:', fetchError);
				setError('Failed to load combat data.');
			} finally {
				setIsLoading(false);
			}
		};

		fetchCombatData();
	}, [equipmentRefreshTick, heldItemRefreshTick, inventoryRefreshTick, playerId]);

	const selectedMob = useMemo(
		() => mobs.find((mob) => mob.idMob === selectedMobId) ?? null,
		[mobs, selectedMobId]
	);

	const selectedMobIcon = useMemo(() => {
		if (!selectedMob?.icon) {
			return '';
		}

		return resolveIconPath(selectedMob.icon, BLOCK_TEXTURE_BY_FILE);
	}, [selectedMob]);

	useEffect(() => {
		const fetchEnemyDefense = async () => {
			if (!selectedMob?.idMob) {
				setEnemyDefense(0);
				return;
			}

			try {
				const [statsResponse, mobStatsResponse] = await Promise.all([
					axios.get('http://localhost:5091/api/Stats/GetStats', {
						headers: {
							Accept: 'application/json',
							...getAuthHeaders(),
						},
					}),
					axios.get('http://localhost:5091/api/Stats/GetMobStats', {
						params: { mobId: selectedMob.idMob },
						validateStatus: (status) => status === 200 || status === 404,
						headers: {
							Accept: 'application/json',
							...getAuthHeaders(),
						},
					}),
				]);

				const allStats = Array.isArray(statsResponse.data) ? statsResponse.data : [];
				const defenseStatDefinition = allStats.find((statDef) => (statDef.name ?? statDef.Name ?? '').toLowerCase().trim() === 'defense');
				const defenseStatId = toNumberOrNull(defenseStatDefinition?.idStats ?? defenseStatDefinition?.IdStats);

				if (defenseStatId == null || mobStatsResponse.status === 404 || !Array.isArray(mobStatsResponse.data)) {
					setEnemyDefense(0);
					return;
				}

				const mobDefenseEntry = mobStatsResponse.data.find((entry) => toNumberOrNull(entry.fkStatsidStats ?? entry.FkStatsidStats) === defenseStatId);
				const mobDefenseValue = toNumberOrNull(mobDefenseEntry?.value ?? mobDefenseEntry?.Value) ?? 0;
				setEnemyDefense(Math.max(0, mobDefenseValue));
			} catch (fetchError) {
				console.error('Failed to load mob defense:', fetchError);
				setEnemyDefense(0);
			}
		};

		fetchEnemyDefense();
	}, [selectedMob?.idMob]);

	const combatSkillDefinition = useMemo(
		() => skills.find((skill) => (skill.name ?? skill.Name ?? '').trim().toLowerCase() === 'combat') ?? null,
		[skills]
	);

	const matchedSkill = useMemo(() => {
		if (combatSkillDefinition) {
			return combatSkillDefinition;
		}

		const selectedSkillTypeName = (selectedMob?.skillXpTypeName ?? '').trim().toLowerCase();
		if (!selectedSkillTypeName) {
			return null;
		}

		return skills.find((skill) => (skill.name ?? skill.Name ?? '').trim().toLowerCase() === selectedSkillTypeName) ?? null;
	}, [combatSkillDefinition, selectedMob, skills]);

	const playerCombatSkill = useMemo(() => {
		const matchedSkillId = matchedSkill ? toNumberOrNull(matchedSkill.idSkills ?? matchedSkill.IdSkills) : null;
		if (matchedSkillId == null) {
			return null;
		}

		return playerSkills.find((playerSkill) => toNumberOrNull(playerSkill.fkSkillsidSkills ?? playerSkill.FkSkillsidSkills) === matchedSkillId) ?? null;
	}, [matchedSkill, playerSkills]);

	const playerSkillLevel = playerCombatSkill ? (toNumberOrNull(playerCombatSkill.level ?? playerCombatSkill.Level) ?? 0) : 0;
	const hasMeleeWeaponLoaded = Boolean(meleeSlot?.fkItemidItem && (toNumberOrNull(meleeSlot?.quantity) ?? 0) > 0);
	const bowItemCategory = bowSlot?.itemCategory ?? '';
	const hasBowSelected = Boolean(bowSlot?.fkItemidItem && (toNumberOrNull(bowSlot?.quantity) ?? 0) > 0 && isBowCategory(bowItemCategory));
	const hasArrowLoaded = Boolean(arrowSlot?.fkItemidItem && (toNumberOrNull(arrowSlot?.quantity) ?? 0) > 0 && isArrowCategory(arrowSlot?.itemCategory));
	const canUseRanged = hasBowSelected && hasArrowLoaded;
	const rangedRequirementMessage = hasBowSelected
		? (hasArrowLoaded ? '' : 'Load arrows into the arrow slot to use ranged mode.')
		: 'Load a bow into the bow slot, then load arrows.';

	const pushLog = useCallback((message) => {
		setBattleLog((prev) => [message, ...prev].slice(0, 10));
	}, []);

	const flushPendingArrowConsumption = useCallback(async () => {
		const pending = pendingArrowConsumptionRef.current;
		const pendingItemId = toNumberOrNull(pending.itemId);
		const pendingQuantity = toNumberOrNull(pending.quantity) ?? 0;
		if (!playerId || pendingItemId == null || pendingQuantity <= 0) {
			return true;
		}

		try {
			await axios.post('http://localhost:5091/api/Inventory/RemoveItemFromInventory', {
				playerId,
				itemId: pendingItemId,
				quantity: pendingQuantity,
			}, {
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});

			pendingArrowConsumptionRef.current = {
				itemId: null,
				quantity: 0,
			};
			return true;
		} catch (flushError) {
			console.error('Failed to flush pending arrow consumption:', flushError);
			return false;
		}
	}, [playerId]);

	useEffect(() => {
		const flushOnUnload = () => {
			const pending = pendingArrowConsumptionRef.current;
			const pendingItemId = toNumberOrNull(pending.itemId);
			const pendingQuantity = toNumberOrNull(pending.quantity) ?? 0;
			if (!playerId || pendingItemId == null || pendingQuantity <= 0 || !navigator.sendBeacon) {
				return;
			}

			const payload = JSON.stringify({
				playerId,
				itemId: pendingItemId,
				quantity: pendingQuantity,
			});
			navigator.sendBeacon('http://localhost:5091/api/Inventory/RemoveItemFromInventory', new Blob([payload], { type: 'application/json' }));
		};

		window.addEventListener('beforeunload', flushOnUnload);
		return () => window.removeEventListener('beforeunload', flushOnUnload);
	}, [playerId]);

	const startBattle = useCallback((mob, isAutoRestart = false) => {
		if (!mob) {
			return;
		}

		if (attackStyleRef.current === 'ranged' && !canUseRanged) {
			const requirementMessage = hasBowSelected
				? 'Load arrows into the arrow slot before starting ranged combat.'
				: 'Load a bow into the bow slot before using ranged combat.';
			if (hasBowSelected) {
				setArrowSlotMessage(requirementMessage);
			} else {
				setBowSlotMessage(requirementMessage);
			}
			pushLog(requirementMessage);
			return;
		}

		selectedMobRef.current = mob;
		setSelectedMobId(mob.idMob);
		setPlayerHealth(playerMaxHealth);
		setEnemyHealth(mob.baseHealth);
		setBattleLog((prev) => isAutoRestart ? prev : [`Engaged ${mob.name}.`, ...prev].slice(0, 10));
		setLootResults([]);
		setRewardMessage('');
		setMeleeSlotMessage('');
		setBowSlotMessage('');
		setArrowSlotMessage('');
		setIsRollingLoot(false);
		setIsBattling(true);
		playerHealthRef.current = playerMaxHealth;
		enemyHealthRef.current = mob.baseHealth;
	}, [canUseRanged, hasBowSelected, playerMaxHealth, pushLog]);

	const consumeArrowForRangedShot = useCallback(() => {
		const arrowItemId = toNumberOrNull(arrowSlot?.fkItemidItem);
		if (arrowItemId == null) {
			return false;
		}

		const pending = pendingArrowConsumptionRef.current;
		if (pending.itemId == null) {
			pendingArrowConsumptionRef.current = {
				itemId: arrowItemId,
				quantity: 1,
			};
		} else if (toNumberOrNull(pending.itemId) === arrowItemId) {
			pendingArrowConsumptionRef.current = {
				itemId: arrowItemId,
				quantity: (toNumberOrNull(pending.quantity) ?? 0) + 1,
			};
		} else {
			return false;
		}

		setArrowSlot((previousArrowSlot) => {
			if (!previousArrowSlot) {
				return previousArrowSlot;
			}

			const currentQty = toNumberOrNull(previousArrowSlot.quantity) ?? 0;
			const nextQty = Math.max(0, currentQty - 1);
			if (nextQty <= 0) {
				localStorage.removeItem(COMBAT_ARROW_ITEM_STORAGE_KEY);
				return null;
			}

			const nextArrowState = {
				...previousArrowSlot,
				quantity: nextQty,
			};
			localStorage.setItem(COMBAT_ARROW_ITEM_STORAGE_KEY, JSON.stringify(nextArrowState));
			return nextArrowState;
		});

		return true;
	}, [arrowSlot]);

	const addLootToInventory = useCallback(async (lootDrops) => {
		if (!playerId || !lootDrops.length) {
			return;
		}

		for (const drop of lootDrops) {
			if (!drop.itemId || drop.quantity <= 0) {
				continue;
			}

			await axios.post('http://localhost:5091/api/Inventory/AddItemToInventory', {
				playerId,
				itemId: drop.itemId,
				quantity: drop.quantity,
			}, {
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});
		}

		setInventoryRefreshTick((prev) => prev + 1);
	}, [playerId]);

	const grantCombatSkillXp = useCallback(async (mob) => {
		if (!playerId || !mob?.skillXpAmount || mob.skillXpAmount <= 0 || !matchedSkill) {
			return;
		}

		const skillId = toNumberOrNull(matchedSkill.idSkills ?? matchedSkill.IdSkills);
		if (!skillId) {
			return;
		}

		try {
			const response = await axios.post('http://localhost:5091/api/PlayerSkills/GrantSkillXp', {
				playerId,
				skillId,
				xpToAdd: mob.skillXpAmount,
			}, {
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});

			const updatedSkill = response?.data ?? null;
			if (updatedSkill) {
				setPlayerSkills((prev) => {
					const updatedSkillId = toNumberOrNull(updatedSkill.fkSkillsidSkills ?? updatedSkill.FkSkillsidSkills) ?? skillId;
					const index = prev.findIndex((entry) => toNumberOrNull(entry.fkSkillsidSkills ?? entry.FkSkillsidSkills) === updatedSkillId);

					if (index === -1) {
						return [...prev, updatedSkill];
					}

					const next = [...prev];
					next[index] = updatedSkill;
					return next;
				});
			}
		} catch (grantError) {
			console.error('Failed to grant combat skill xp:', grantError);
		}
	}, [matchedSkill, playerId]);

	const grantCombatRewards = useCallback(async (mob, lootDrops) => {
		if (!playerId) {
			return;
		}

		if (mob.coinsOnDeath > 0) {
			await axios.put('http://localhost:5091/api/Purse/UpdatePurse', null, {
				params: {
					playerId,
					amountBalance: mob.coinsOnDeath,
					amountBits: 0,
				},
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});
		}

		await addLootToInventory(lootDrops);
		await grantCombatSkillXp(mob);
	}, [addLootToInventory, grantCombatSkillXp, playerId]);

	const rollMobDrops = useCallback((mob) => {
		if (!mob?.drops?.length) {
			return [];
		}

		const rewards = [];
		for (const drop of mob.drops) {
			const chance = Math.max(0, Math.min(1, Number(drop.dropChance ?? 0)));
			if (chance <= 0 || Math.random() > chance) {
				continue;
			}

			const quantity = rollDropQuantity(drop.minQuantity, drop.maxQuantity);
			rewards.push({
				itemId: drop.itemId,
				itemName: drop.itemName,
				itemIcon: drop.itemIcon,
				minQuantity: drop.minQuantity,
				maxQuantity: drop.maxQuantity,
				quantity,
			});
		}

		return rewards;
	}, []);

	const finishBattle = useCallback(async (mob) => {
		setIsBattling(false);
		setEnemyHealth(0);
		enemyHealthRef.current = 0;
		await flushPendingArrowConsumption();
		setInventoryRefreshTick((prev) => prev + 1);

		const drops = rollMobDrops(mob);
		setIsRollingLoot(true);
		setLootResults(drops);
		setRewardMessage(`Defeated ${mob.name}. Rolling rewards...`);

		try {
			await grantCombatRewards(mob, drops);
			pushLog(`Defeated ${mob.name} and received ${drops.length} drop${drops.length === 1 ? '' : 's'}.`);
			if (drops.length === 0) {
				setRewardMessage(`Defeated ${mob.name}. No drops this time.`);
			} else {
				setRewardMessage(`Defeated ${mob.name}. Loot claimed.`);
			}
		} catch (rewardError) {
			console.error('Failed to grant combat rewards:', rewardError);
			setRewardMessage(`Defeated ${mob.name}, but some rewards failed to save.`);
		}

		setIsRollingLoot(false);

		if (battleModeRef.current !== 'manual' && selectedMobRef.current?.idMob === mob.idMob) {
			window.setTimeout(() => {
				if (selectedMobRef.current?.idMob === mob.idMob) {
					startBattle(mob, true);
				}
			}, 900);
		}
	}, [flushPendingArrowConsumption, grantCombatRewards, pushLog, rollMobDrops, startBattle]);

	const performAttack = useCallback(async (styleOverride = null) => {
		if (attackLockRef.current) {
			return;
		}

		const mob = selectedMobRef.current;
		if (!mob || !isBattlingRef.current || enemyHealthRef.current <= 0 || playerHealthRef.current <= 0) {
			return;
		}

		attackLockRef.current = true;
		const styleKey = styleOverride ?? attackStyleRef.current;
		if (styleKey === 'ranged' && !canUseRanged) {
			const requirementMessage = hasBowSelected
				? 'Load arrows into the arrow slot before using ranged attacks.'
				: 'Load a bow into the bow slot before using ranged attacks.';
			if (hasBowSelected) {
				setArrowSlotMessage(requirementMessage);
			} else {
				setBowSlotMessage(requirementMessage);
			}
			pushLog(requirementMessage);
			attackLockRef.current = false;
			return;
		}

		if (styleKey === 'ranged') {
			setMeleeSlotMessage('');
			setBowSlotMessage('');
			setArrowSlotMessage('');
			const hasConsumedArrow = await consumeArrowForRangedShot();
			if (!hasConsumedArrow) {
				setArrowSlotMessage('You do not have enough arrows to shoot.');
				pushLog('Ranged shot failed: out of arrows.');
				attackLockRef.current = false;
				return;
			}
		}

		const style = ATTACK_STYLES[styleKey] ?? ATTACK_STYLES.melee;
		const computedBaseDamage = styleKey === 'ranged'
			? Math.max(1, playerBaseDamage + bowDamageBonus)
			: Math.max(1, playerBaseDamage + meleeWeaponDamageBonus);
		const playerDamage = calculatePlayerHitDamage({
			baseDamage: computedBaseDamage,
			strength: playerStrength,
			critDamage: playerCritDamage,
			enemyDefense,
		});
		const nextEnemyHealth = Math.max(0, enemyHealthRef.current - playerDamage);
		enemyHealthRef.current = nextEnemyHealth;
		setEnemyHealth(nextEnemyHealth);
		pushLog(`${style.label} hit ${mob.name} for ${playerDamage}.`);

		if (nextEnemyHealth <= 0) {
			await finishBattle(mob);
			attackLockRef.current = false;
			return;
		}

		let incomingDamage = calculateMitigatedDamage(mob.baseDamage, playerDefense);
		if (styleKey === 'ranged' && canUseRanged) {
			const dodgeChance = 0.35;
			if (Math.random() < dodgeChance) {
				pushLog(`${mob.name} missed you while you kept distance.`);
				attackLockRef.current = false;
				return;
			}

			incomingDamage = Math.max(1, Math.floor(incomingDamage * 0.45));
		}

		const nextPlayerHealth = Math.max(0, playerHealthRef.current - incomingDamage);
		playerHealthRef.current = nextPlayerHealth;
		setPlayerHealth(nextPlayerHealth);
		pushLog(`${mob.name} hit you for ${incomingDamage}`);

		if (nextPlayerHealth <= 0) {
			await flushPendingArrowConsumption();
			setInventoryRefreshTick((prev) => prev + 1);
			setIsBattling(false);
			setRewardMessage(`You were defeated by ${mob.name}.`);
			pushLog(`Defeated by ${mob.name}.`);
		}

		attackLockRef.current = false;
	}, [bowDamageBonus, canUseRanged, consumeArrowForRangedShot, enemyDefense, finishBattle, flushPendingArrowConsumption, hasBowSelected, meleeWeaponDamageBonus, playerBaseDamage, playerCritDamage, playerDefense, playerStrength, pushLog]);

	useEffect(() => {
		if (!isBattling || battleMode === 'manual') {
			return undefined;
		}

		const tickMs = ATTACK_STYLES[attackStyle]?.intervalMs ?? ATTACK_STYLES.melee.intervalMs;
		const timerId = window.setInterval(() => {
			performAttack();
		}, tickMs);

		return () => window.clearInterval(timerId);
	}, [attackStyle, battleMode, isBattling, performAttack]);

	const selectedMobLabel = selectedMob ? `${selectedMob.name} (${selectedMob.mobType})` : 'No mob selected';
	const selectedMobLocation = formatLocationLabel(selectedMob?.location);
	const selectedMobIconPath = selectedMobIcon || '';
	const isMeleeStyleSelected = attackStyle === 'melee';
	const isRangedStyleSelected = attackStyle === 'ranged';
	const canManualAttack = battleMode !== 'auto';
	const canAutoBattle = battleMode !== 'manual';
	const currentPlayerCombatLevel = playerSkillLevel;
	const selectedMobDrops = selectedMob?.drops ?? [];
	const canShowMobDrops = selectedMobDrops.length > 0;
	const isRangedStartBlocked = attackStyle === 'ranged' && !canUseRanged;

	const mobsByLocation = useMemo(() => {
		const grouped = new Map();

		for (const mob of mobs) {
			const location = mob?.location?.trim() || 'Unknown';
			if (!grouped.has(location)) {
				grouped.set(location, []);
			}

			grouped.get(location).push(mob);
		}

		return [...grouped.entries()]
			.map(([location, groupedMobs]) => ({
				locationKey: location,
				locationLabel: formatLocationLabel(location),
				mobs: groupedMobs,
			}))
			.sort((a, b) => a.locationLabel.localeCompare(b.locationLabel));
	}, [mobs]);

	useEffect(() => {
		if (!isMobSelectModalOpen) {
			return;
		}

		setCollapsedLocationGroups((prev) => {
			const nextState = { ...prev };
			for (const group of mobsByLocation) {
				if (!(group.locationKey in nextState)) {
					nextState[group.locationKey] = true;
				}
			}

			const selectedLocationKey = selectedMob?.location?.trim() || 'Unknown';
			nextState[selectedLocationKey] = false;
			return nextState;
		});
	}, [isMobSelectModalOpen, mobsByLocation, selectedMob]);

	const toggleLocationGroup = useCallback((locationKey) => {
		setCollapsedLocationGroups((prev) => ({
			...prev,
			[locationKey]: !prev[locationKey],
		}));
	}, []);

	const handleSelectMob = (mobId) => {
		setSelectedMobId(mobId);
		const nextSelectedMob = mobs.find((mob) => mob.idMob === mobId);
		const locationKey = nextSelectedMob?.location?.trim() || 'Unknown';
		setCollapsedLocationGroups((prev) => ({
			...prev,
			[locationKey]: false,
		}));
		setIsMobSelectModalOpen(false);
	};

	const handleLoadMeleeWeapon = useCallback(() => {
		const selectedInventoryItem = parseStoredSelection(SELLING_SELECTED_ITEM_STORAGE_KEY);
		const quantity = toNumberOrNull(selectedInventoryItem?.quantity) ?? 0;

		if (!selectedInventoryItem?.fkItemidItem || quantity <= 0) {
			setMeleeSlotMessage('Select an inventory item first, then load it as a melee weapon.');
			return;
		}

		if (!isMeleeWeaponCategory(selectedInventoryItem?.itemCategory)) {
			setMeleeSlotMessage('Selected item is not a melee weapon.');
			return;
		}

		const nextMeleeSlot = {
			idPlayerInventorySlots: selectedInventoryItem.idPlayerInventorySlots,
			slotIndex: selectedInventoryItem.slotIndex,
			fkItemidItem: selectedInventoryItem.fkItemidItem,
			quantity,
			itemName: selectedInventoryItem.itemName ?? '',
			itemIcon: selectedInventoryItem.itemIcon ?? '',
			itemCategory: selectedInventoryItem.itemCategory ?? '',
		};

		setMeleeSlot(nextMeleeSlot);
		localStorage.setItem(COMBAT_MELEE_ITEM_STORAGE_KEY, JSON.stringify(nextMeleeSlot));
		setHeldItemRefreshTick((prev) => prev + 1);
		setMeleeSlotMessage('');
	}, []);

	const handleClearMeleeWeapon = useCallback(() => {
		setMeleeSlot(null);
		setMeleeWeaponDamageBonus(0);
		localStorage.removeItem(COMBAT_MELEE_ITEM_STORAGE_KEY);
		setHeldItemRefreshTick((prev) => prev + 1);
		setMeleeSlotMessage('');
	}, []);

	const handleLoadBow = useCallback(() => {
		const selectedInventoryItem = parseStoredSelection(SELLING_SELECTED_ITEM_STORAGE_KEY);
		const quantity = toNumberOrNull(selectedInventoryItem?.quantity) ?? 0;

		if (!selectedInventoryItem?.fkItemidItem || quantity <= 0) {
			setBowSlotMessage('Select an inventory item first, then load it as a bow.');
			return;
		}

		if (!isBowCategory(selectedInventoryItem?.itemCategory)) {
			setBowSlotMessage('Selected item is not a Bow.');
			return;
		}

		const nextBowSlot = {
			idPlayerInventorySlots: selectedInventoryItem.idPlayerInventorySlots,
			slotIndex: selectedInventoryItem.slotIndex,
			fkItemidItem: selectedInventoryItem.fkItemidItem,
			quantity,
			itemName: selectedInventoryItem.itemName ?? '',
			itemIcon: selectedInventoryItem.itemIcon ?? '',
			itemCategory: selectedInventoryItem.itemCategory ?? '',
		};

		setBowSlot(nextBowSlot);
		localStorage.setItem(COMBAT_BOW_ITEM_STORAGE_KEY, JSON.stringify(nextBowSlot));
		setBowSlotMessage('');
	}, []);

	const handleClearBow = useCallback(() => {
		setBowSlot(null);
		localStorage.removeItem(COMBAT_BOW_ITEM_STORAGE_KEY);
		setBowSlotMessage('');
	}, []);

	const handleLoadArrows = useCallback(async () => {
		const selectedInventoryItem = parseStoredSelection(SELLING_SELECTED_ITEM_STORAGE_KEY);
		const quantity = toNumberOrNull(selectedInventoryItem?.quantity) ?? 0;

		if (!selectedInventoryItem?.fkItemidItem || quantity <= 0) {
			setArrowSlotMessage('Select an inventory item first, then load it as arrows.');
			return;
		}

		if (!isArrowCategory(selectedInventoryItem?.itemCategory)) {
			setArrowSlotMessage('Selected item is not an arrow stack.');
			return;
		}

		await flushPendingArrowConsumption();
		setInventoryRefreshTick((prev) => prev + 1);

		const nextArrowSlot = {
			idPlayerInventorySlots: selectedInventoryItem.idPlayerInventorySlots,
			slotIndex: selectedInventoryItem.slotIndex,
			fkItemidItem: selectedInventoryItem.fkItemidItem,
			quantity,
			itemName: selectedInventoryItem.itemName ?? '',
			itemIcon: selectedInventoryItem.itemIcon ?? '',
			itemCategory: selectedInventoryItem.itemCategory ?? '',
		};

		setArrowSlot(nextArrowSlot);
		localStorage.setItem(COMBAT_ARROW_ITEM_STORAGE_KEY, JSON.stringify(nextArrowSlot));
		setArrowSlotMessage('');
	}, [flushPendingArrowConsumption]);

	const handleClearArrows = useCallback(async () => {
		await flushPendingArrowConsumption();
		setInventoryRefreshTick((prev) => prev + 1);
		setArrowSlot(null);
		localStorage.removeItem(COMBAT_ARROW_ITEM_STORAGE_KEY);
		setArrowSlotMessage('');
	}, [flushPendingArrowConsumption]);

	const resolveCombatIcon = useCallback((iconPath) => resolveIconPath(iconPath, BLOCK_TEXTURE_BY_FILE), []);

	return (
		<div className="combat-page-layout">
			<section className="combat-main-panel">
				<header className="combat-header">
					<div>
						<h1>Combat</h1>
					</div>
					<div className="combat-battle-modes">
						{battleModes.map((mode) => (
							<button
								key={mode.key}
								type="button"
								className={`combat-mode-button ${battleMode === mode.key ? 'active' : ''}`}
								onClick={() => setBattleMode(mode.key)}
							>
								{mode.label}
							</button>
						))}
					</div>
				</header>

				{isLoading ? <p className="combat-status">Loading combat data...</p> : null}
				{error ? <p className="combat-status combat-status-error">{error}</p> : null}

				<section className="combat-mob-selector" aria-label="Mob selection controls">
					<div className="combat-mob-selector-main">
						<div className="combat-mob-card-icon">
							{selectedMobIconPath ? <img src={selectedMobIconPath} alt={selectedMob?.name ?? 'Mob'} /> : <span>{selectedMob?.name?.slice(0, 2) ?? '??'}</span>}
						</div>
						<div>
							<strong>{selectedMob?.name ?? 'No mob selected'}</strong>
							<p>{selectedMob ? `${selectedMobLocation} • HP ${selectedMob.baseHealth} • DMG ${selectedMob.baseDamage}` : 'Select a mob to begin combat.'}</p>
						</div>
					</div>
					<button type="button" className="combat-action-button" onClick={() => setIsMobSelectModalOpen(true)}>
						Select Mob
					</button>
				</section>

				<CombatBattle
					selectedMob={selectedMob}
					selectedMobIconPath={selectedMobIconPath}
					attackStyle={attackStyle}
					setAttackStyle={setAttackStyle}
					isBattling={isBattling}
					canManualAttack={canManualAttack}
					canAutoBattle={canAutoBattle}
					isRangedStartBlocked={isRangedStartBlocked}
					canUseRanged={canUseRanged}
					isMeleeStyleSelected={isMeleeStyleSelected}
					isRangedStyleSelected={isRangedStyleSelected}
					currentPlayerCombatLevel={currentPlayerCombatLevel}
					playerHealth={playerHealth}
					playerMaxHealth={playerMaxHealth}
					enemyHealth={enemyHealth}
					onStartBattle={startBattle}
					onPerformAttack={performAttack}
					onStopAuto={() => setBattleMode('manual')}
					onOpenDropsModal={() => setIsDropsModalOpen(true)}
					selectedMobDrops={selectedMobDrops}
					canShowMobDrops={canShowMobDrops}
					lootResults={lootResults}
					battleLog={battleLog}
					rewardMessage={rewardMessage}
					isRollingLoot={isRollingLoot}
					meleeSlot={meleeSlot}
					meleeSlotMessage={meleeSlotMessage}
					hasMeleeWeaponLoaded={hasMeleeWeaponLoaded}
					onLoadMeleeWeapon={handleLoadMeleeWeapon}
					onClearMeleeWeapon={handleClearMeleeWeapon}
					bowSlot={bowSlot}
					arrowSlot={arrowSlot}
					bowSlotMessage={bowSlotMessage}
					arrowSlotMessage={arrowSlotMessage}
					onLoadBow={handleLoadBow}
					onClearBow={handleClearBow}
					onLoadArrows={handleLoadArrows}
					onClearArrows={handleClearArrows}
					resolveIcon={resolveCombatIcon}
				/>
			</section>

			<aside className="combat-side-panel" aria-label="Inventory and equipment panel">
				<Inventory
					playerId={playerId}
					refreshKey={inventoryRefreshTick}
					onInventoryChanged={handleInventoryChanged}
					onEquipmentChanged={handleEquipmentChanged}
				/>

				<PlayerEquipment
					playerId={playerId}
					refreshKey={equipmentRefreshTick}
					onInventoryChanged={handleInventoryChanged}
					onEquipmentChanged={handleEquipmentChanged}
				/>
			</aside>

			{isDropsModalOpen ? (
				<div className="combat-modal-backdrop" role="presentation" onClick={() => setIsDropsModalOpen(false)}>
					<div
						className="combat-modal"
						role="dialog"
						aria-modal="true"
						aria-label="Mob drop table"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="combat-modal-header">
							<h3>{selectedMob ? `${selectedMob.name} Drop Table` : 'Drop Table'}</h3>
							<button type="button" className="combat-action-button secondary" onClick={() => setIsDropsModalOpen(false)}>
								Close
							</button>
						</div>

						{canShowMobDrops ? (
							<ul className="combat-modal-drop-list">
								{selectedMobDrops.map((drop) => {
									const dropIcon = drop.itemIcon ? resolveIconPath(drop.itemIcon, BLOCK_TEXTURE_BY_FILE) : '';
									const chance = formatDropChancePercent(drop.dropChance);
									const quantity = formatDropQuantityRange(drop.minQuantity, drop.maxQuantity);

									return (
										<li key={`${drop.idMobDropTable}-${drop.itemId}`} className="combat-modal-drop-item">
											<div className="combat-loot-icon">{dropIcon ? <img src={dropIcon} alt={drop.itemName} /> : <span>{drop.itemName.slice(0, 2)}</span>}</div>
											<div className="combat-modal-drop-meta">
												<strong>{drop.itemName}</strong>
												<p>{quantity}</p>
											</div>
											<span className="combat-modal-drop-chance">{chance}</span>
										</li>
									);
								})}
							</ul>
						) : (
							<p className="combat-empty-state">No configured drops for this mob.</p>
						)}
					</div>
				</div>
			) : null}

			{isMobSelectModalOpen ? (
				<div className="combat-modal-backdrop" role="presentation" onClick={() => setIsMobSelectModalOpen(false)}>
					<div
						className="combat-modal"
						role="dialog"
						aria-modal="true"
						aria-label="Mob selector"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="combat-modal-header">
							<h3>Select Mob</h3>
							<button type="button" className="combat-action-button secondary" onClick={() => setIsMobSelectModalOpen(false)}>
								Close
							</button>
						</div>

						<div className="combat-mob-location-list">
							{mobsByLocation.map((group) => (
								<section key={group.locationKey} className="combat-mob-location-group" aria-label={`${group.locationLabel} mobs`}>
									<button
										type="button"
										className="combat-location-toggle"
										onClick={() => toggleLocationGroup(group.locationKey)}
										aria-expanded={!collapsedLocationGroups[group.locationKey]}
									>
										<h4>{group.locationLabel}</h4>
										<span>{group.mobs.length} mob{group.mobs.length === 1 ? '' : 's'} · {collapsedLocationGroups[group.locationKey] ? 'Show' : 'Hide'}</span>
									</button>
									{collapsedLocationGroups[group.locationKey] ? null : <div className="combat-roster">
										{group.mobs.map((mob) => {
											const mobIcon = mob.icon ? resolveIconPath(mob.icon, BLOCK_TEXTURE_BY_FILE) : '';
											const isSelected = mob.idMob === selectedMobId;

											return (
												<button
													type="button"
													key={mob.idMob}
													className={`combat-mob-card ${isSelected ? 'selected' : ''}`}
													onClick={() => handleSelectMob(mob.idMob)}
												>
													<div className="combat-mob-card-icon">
														{mobIcon ? <img src={mobIcon} alt={mob.name} /> : <span>{mob.name.slice(0, 2)}</span>}
													</div>
													<div className="combat-mob-card-body">
														<strong>{mob.name}</strong>
														<p>{formatLocationLabel(mob.location) || mob.mobType}</p>
														<small>HP {mob.baseHealth} | DMG {mob.baseDamage}</small>
													</div>
												</button>
											);
										})}
									</div>}
								</section>
							))}
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
};

export default Combat;