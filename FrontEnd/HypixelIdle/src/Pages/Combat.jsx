import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Inventory from '../Components/Inventory';
import PlayerEquipment from '../Components/PlayerEquipment';
import { BLOCK_TEXTURE_BY_FILE, getAuthHeaders, resolveIconPath, toNumberOrNull } from '../Components/MiningUtils';
import {
	ATTACK_STYLES,
	battleModes,
	calculateEffectiveHealth,
	calculateMitigatedDamage,
	formatDropQuantityRange,
	getPlayerId,
	normalizeMob,
	rollDropQuantity,
	rollInteger,
} from '../Components/CombatUtils';
import '../Styles/GlobalStyles.css';
import '../Styles/CombatStyles.css';
import '../Styles/InventoryStyles.css';

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
	const [enemyHealth, setEnemyHealth] = useState(0);
	const [isBattling, setIsBattling] = useState(false);
	const [battleLog, setBattleLog] = useState([]);
	const [lootResults, setLootResults] = useState([]);
	const [rewardMessage, setRewardMessage] = useState('');
	const [isRollingLoot, setIsRollingLoot] = useState(false);
	const [isDropsModalOpen, setIsDropsModalOpen] = useState(false);
	const [inventoryRefreshTick, setInventoryRefreshTick] = useState(0);
	const [equipmentRefreshTick, setEquipmentRefreshTick] = useState(0);
	const selectedMobRef = useRef(null);
	const playerHealthRef = useRef(0);
	const enemyHealthRef = useRef(0);
	const battleModeRef = useRef('manual');
	const attackStyleRef = useRef('melee');
	const isBattlingRef = useRef(false);
	const attackLockRef = useRef(false);

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
		if (!isDropsModalOpen) {
			return undefined;
		}

		const onEscape = (event) => {
			if (event.key === 'Escape') {
				setIsDropsModalOpen(false);
			}
		};

		window.addEventListener('keydown', onEscape);
		return () => window.removeEventListener('keydown', onEscape);
	}, [isDropsModalOpen]);

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

					const healthStat = healthStatId == null
						? null
						: playerStatsResponse.data.find((stat) => toNumberOrNull(stat.fkStatsidStats ?? stat.FkStatsidStats) === healthStatId);

					if (healthStat) {
						const healthValue = toNumberOrNull(healthStat.value ?? healthStat.Value);
						if (healthValue !== null && healthValue > 0) {
							setPlayerMaxHealth(healthValue);
							setPlayerHealth(healthValue);
							playerHealthRef.current = healthValue;
						}
					}

					const playerDefenseStat = defenseStatId == null
						? null
						: playerStatsResponse.data.find((stat) => toNumberOrNull(stat.fkStatsidStats ?? stat.FkStatsidStats) === defenseStatId);
					const playerBaseDefense = toNumberOrNull(playerDefenseStat?.value ?? playerDefenseStat?.Value) ?? 0;

					const equipmentRows = Array.isArray(playerEquipmentResponse?.data) ? playerEquipmentResponse.data : [];
					const inventorySlots = Array.isArray(inventoryResponse?.data) ? inventoryResponse.data : [];

					const heldSlot = inventorySlots.find((slot) => toNumberOrNull(slot.slotIndex ?? slot.SlotIndex) === 0);
					const heldItemId = toNumberOrNull(heldSlot?.fkItemidItem ?? heldSlot?.FkItemidItem);

					const itemIdCounts = new Map();
					for (const row of equipmentRows) {
						const itemId = toNumberOrNull(row.fkItemidItem ?? row.FkItemidItem);
						if (itemId == null) {
							continue;
						}
						itemIdCounts.set(itemId, (itemIdCounts.get(itemId) ?? 0) + 1);
					}

					if (heldItemId != null) {
						itemIdCounts.set(heldItemId, (itemIdCounts.get(heldItemId) ?? 0) + 1);
					}

					let gearAndHeldDefense = 0;
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
						}
					}

					setPlayerDefense(Math.max(0, playerBaseDefense + gearAndHeldDefense));
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
	}, [equipmentRefreshTick, inventoryRefreshTick, playerId]);

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

	const pushLog = useCallback((message) => {
		setBattleLog((prev) => [message, ...prev].slice(0, 10));
	}, []);

	const startBattle = useCallback((mob, isAutoRestart = false) => {
		if (!mob) {
			return;
		}

		selectedMobRef.current = mob;
		setSelectedMobId(mob.idMob);
		setPlayerHealth(playerMaxHealth);
		setEnemyHealth(mob.baseHealth);
		setBattleLog((prev) => isAutoRestart ? prev : [`Engaged ${mob.name}.`, ...prev].slice(0, 10));
		setLootResults([]);
		setRewardMessage('');
		setIsRollingLoot(false);
		setIsBattling(true);
		playerHealthRef.current = playerMaxHealth;
		enemyHealthRef.current = mob.baseHealth;
	}, [playerMaxHealth]);

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
			await axios.post('http://localhost:5091/api/PlayerSkills/GrantSkillXp', {
				playerId,
				skillId,
				xpToAdd: mob.skillXpAmount,
			}, {
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});
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
	}, [grantCombatRewards, pushLog, rollMobDrops, startBattle]);

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
		const style = ATTACK_STYLES[styleKey] ?? ATTACK_STYLES.melee;
		const playerDamage = rollInteger(style.baseMin, style.baseMax);
		const nextEnemyHealth = Math.max(0, enemyHealthRef.current - playerDamage);
		enemyHealthRef.current = nextEnemyHealth;
		setEnemyHealth(nextEnemyHealth);
		pushLog(`${style.label} hit ${mob.name} for ${playerDamage}.`);

		if (nextEnemyHealth <= 0) {
			await finishBattle(mob);
			attackLockRef.current = false;
			return;
		}

		const mitigatedDamage = calculateMitigatedDamage(mob.baseDamage, playerDefense);
		const nextPlayerHealth = Math.max(0, playerHealthRef.current - mitigatedDamage);
		playerHealthRef.current = nextPlayerHealth;
		setPlayerHealth(nextPlayerHealth);
		//pushLog(`${mob.name} hit you for ${mitigatedDamage} (${Math.max(1, mob.baseDamage)} raw, ${playerDefense} DEF).`);
		pushLog(`${mob.name} hit you for ${mitigatedDamage}`);

		if (nextPlayerHealth <= 0) {
			setIsBattling(false);
			setRewardMessage(`You were defeated by ${mob.name}.`);
			pushLog(`Defeated by ${mob.name}.`);
		}

		attackLockRef.current = false;
	}, [finishBattle, playerDefense, pushLog]);

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
	const selectedMobIconPath = selectedMobIcon || '';
	const canManualAttack = battleMode !== 'auto';
	const canAutoBattle = battleMode !== 'manual';
	const currentPlayerCombatLevel = playerSkillLevel;
	const effectiveHealth = useMemo(
		() => calculateEffectiveHealth(playerMaxHealth, playerDefense),
		[playerDefense, playerMaxHealth]
	);
	const selectedMobDrops = selectedMob?.drops ?? [];
	const canShowMobDrops = selectedMobDrops.length > 0;

	return (
		<div className="combat-page-layout">
			<section className="combat-main-panel">
				<header className="combat-header">
					<div>
						<h1>Combat</h1>
						<p>Hybrid melee and ranged combat with auto-battler support.</p>
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

				<section className="combat-roster" aria-label="Available mobs">
					{mobs.map((mob) => {
						const mobIcon = mob.icon ? resolveIconPath(mob.icon, BLOCK_TEXTURE_BY_FILE) : '';
						const isSelected = mob.idMob === selectedMobId;

						return (
							<button
								type="button"
								key={mob.idMob}
								className={`combat-mob-card ${isSelected ? 'selected' : ''}`}
								onClick={() => setSelectedMobId(mob.idMob)}
							>
								<div className="combat-mob-card-icon">
									{mobIcon ? <img src={mobIcon} alt={mob.name} /> : <span>{mob.name.slice(0, 2)}</span>}
								</div>
								<div className="combat-mob-card-body">
									<strong>{mob.name}</strong>
									<p>{mob.location || mob.mobType}</p>
									<small>HP {mob.baseHealth} | DMG {mob.baseDamage}</small>
								</div>
							</button>
						);
					})}
				</section>

				<section className="combat-arena" aria-label="Combat arena">
					<div className="combat-arena-top">
						<div className="combat-creature-card">
							<div className="combat-creature-portrait">
								{selectedMobIconPath ? <img src={selectedMobIconPath} alt={selectedMob?.name ?? 'Mob'} /> : <span>{selectedMob?.name?.slice(0, 2) ?? '??'}</span>}
							</div>
							<div>
								<h2>{selectedMobLabel}</h2>
								<p>Skill XP: {selectedMob?.skillXpTypeName || 'None'} {selectedMob?.skillXpAmount ? `+${selectedMob.skillXpAmount}` : ''}</p>
							</div>
						</div>

						<div className="combat-stat-grid">
							<article>
								<span>Player HP</span>
								<strong>{playerHealth}/{playerMaxHealth}</strong>
								{/*<small className="combat-stat-meta">EHP {effectiveHealth}</small>*/}
							</article>
							<article>
								<span>Enemy HP</span>
								<strong>{enemyHealth}/{selectedMob?.baseHealth ?? 0}</strong>
							</article>
							<article>
								<span>Combat Skill</span>
								<strong>{currentPlayerCombatLevel > 0 ? `Level ${currentPlayerCombatLevel}` : 'Untrained'}</strong>
							</article>
						</div>
					</div>

					<div className="combat-hp-shell">
						<div className="combat-hp-fill combat-hp-fill-player" style={{ width: `${playerMaxHealth > 0 ? Math.max(0, Math.min(100, (playerHealth / playerMaxHealth) * 100)) : 0}%` }} />
					</div>
					<div className="combat-hp-shell enemy-shell">
						<div className="combat-hp-fill combat-hp-fill-enemy" style={{ width: `${selectedMob?.baseHealth ? Math.max(0, Math.min(100, (enemyHealth / selectedMob.baseHealth) * 100)) : 0}%` }} />
					</div>

					<div className="combat-controls">
						<div className="combat-style-switch">
							{Object.entries(ATTACK_STYLES).map(([styleKey, style]) => (
								<button
									key={styleKey}
									type="button"
									className={`combat-style-button ${attackStyle === styleKey ? 'active' : ''}`}
									onClick={() => setAttackStyle(styleKey)}
								>
									{style.label}
								</button>
							))}
						</div>

						<div className="combat-action-row">
							<button type="button" className="combat-action-button primary" disabled={!selectedMob || isBattling} onClick={() => startBattle(selectedMob)}>
								Start Fight
							</button>
							<button type="button" className="combat-action-button" disabled={!isBattling || !canManualAttack} onClick={() => performAttack('melee')}>
								Melee Attack
							</button>
							<button type="button" className="combat-action-button" disabled={!isBattling || !canManualAttack} onClick={() => performAttack('ranged')}>
								Ranged Shot
							</button>
							<button type="button" className="combat-action-button secondary" disabled={!isBattling || !canAutoBattle} onClick={() => setBattleMode('manual')}>
								Stop Auto
							</button>
						</div>

						{rewardMessage ? <p className="combat-reward-message">{rewardMessage}</p> : null}
						{isRollingLoot ? <p className="combat-loot-status">Rolling drops...</p> : null}
					</div>

					<section className="combat-loot-panel" aria-label="Loot rolls">
						<div className="combat-loot-panel-header">
							<h3>Drop Roll</h3>
							<button
								type="button"
								className="combat-action-button"
								onClick={() => setIsDropsModalOpen(true)}
								disabled={!selectedMob}
							>
								View Mob Drops
							</button>
						</div>
						{lootResults.length > 0 ? (
							<div className="combat-loot-list">
								{lootResults.map((loot) => {
									const lootIcon = loot.itemIcon ? (resolveIconPath(loot.itemIcon, BLOCK_TEXTURE_BY_FILE)) : '';
									const quantityRangeText = formatDropQuantityRange(loot.minQuantity, loot.maxQuantity);
									return (
										<div className="combat-loot-item" key={`${loot.itemId}-${loot.itemName}`}>
											<div className="combat-loot-icon">{lootIcon ? <img src={lootIcon} alt={loot.itemName} /> : <span>{loot.itemName.slice(0, 2)}</span>}</div>
											<div>
												<strong>{loot.itemName}</strong>
												<p>x{loot.quantity} (range {quantityRangeText})</p>
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<p className="combat-empty-state">No loot rolled yet.</p>
						)}
					</section>

					<section className="combat-log-panel" aria-label="Battle log">
						<h3>Battle Log</h3>
						{battleLog.length > 0 ? (
							<ul>
								{battleLog.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}
							</ul>
						) : (
							<p className="combat-empty-state">No combat actions yet.</p>
						)}
					</section>
				</section>
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
									const chance = `${(Number(drop.dropChance ?? 0) * 100).toFixed(2)}%`;
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
		</div>
	);
};

export default Combat;