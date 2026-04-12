import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import ForagingBlock from '../Components/ForagingBlock';
import ForagingAppleSpecialEvent, {
	getRandomAppleOverlayPosition,
	isForagingAppleEventItem,
	rollForagingAppleSpawn,
} from '../Components/ForagingAppleSpecialEvent';
import Inventory from '../Components/Inventory';
import PlayerEquipment from '../Components/PlayerEquipment';
import PlayerCollection from '../Components/PlayerCollection';
import ForagingHeader from '../Components/ForagingHeader';
import ForagingZoneSelectModal from '../Components/ForagingZoneSelectModal';
import ForagingNodeSelectModal from '../Components/ForagingNodeSelectModal';
import SellingTab from '../Components/SellingTab';
import { rollHitsForClick, useCalculateForagingSpeed } from '../Components/CalculateGatheringSpeed';
import {
	BLOCK_TEXTURE_BY_FILE,
	DEFAULT_BLOCK_HEALTH,
	getAuthHeaders,
	normalizeItem,
	normalizeNode,
	resolveIconPath,
	toNumberOrNull,
} from '../Components/MiningUtils';
import { formatDisplayName } from '../Components/DisplayNameUtils';
import '../Styles/GlobalStyles.css';
import '../Styles/ForagingStyles.css';

const FORAGING_NODE_TYPE_ID = 2;
const FORAGING_SKILL_NAME = 'foraging';
const FORAGING_SESSION_STORAGE_KEY = 'foragingSessionMinedByOutputItem';
const FORAGING_FRUIT_COMBO_SESSION_KEY = 'foragingFruitSpecialCombo';

const loadForagingSessionMap = () => {
	try {
		const raw = localStorage.getItem(FORAGING_SESSION_STORAGE_KEY);
		if (!raw) {
			return {};
		}

		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return {};
		}

		return parsed;
	} catch (error) {
		console.warn('Failed to parse foraging session map:', error);
		return {};
	}
};

const loadForagingFruitCombo = () => {
	try {
		const raw = sessionStorage.getItem(FORAGING_FRUIT_COMBO_SESSION_KEY);
		const parsed = Number(raw);
		if (!Number.isFinite(parsed) || parsed < 0) {
			return 0;
		}

		return Math.floor(parsed);
	} catch (error) {
		console.warn('Failed to parse foraging fruit combo:', error);
		return 0;
	}
};

const Foraging = () => {
	const [blockHealth, setBlockHealth] = useState(DEFAULT_BLOCK_HEALTH);
	const [sessionMinedByItem, setSessionMinedByItem] = useState(loadForagingSessionMap);
	const [nodes, setNodes] = useState([]);
	const [itemsById, setItemsById] = useState({});
	const [isLoadingNodes, setIsLoadingNodes] = useState(true);
	const [nodeError, setNodeError] = useState('');
	const [isLoadingSkill, setIsLoadingSkill] = useState(true);
	const [skillError, setSkillError] = useState('');
	const [playerForagingLevel, setPlayerForagingLevel] = useState(0);
	const [foragingSkillId, setForagingSkillId] = useState(null);
	const [playerForagingSkillState, setPlayerForagingSkillState] = useState(null);
	const [purseBalance, setPurseBalance] = useState(0);
	const [isUnlockingNode, setIsUnlockingNode] = useState(false);
	const [dropError, setDropError] = useState('');
	const [isSavingDrop, setIsSavingDrop] = useState(false);
	const [inventoryRefreshTick, setInventoryRefreshTick] = useState(0);
	const [equipmentRefreshTick, setEquipmentRefreshTick] = useState(0);
	const [collectionProgressTick, setCollectionProgressTick] = useState(0);
	const [selectedZone, setSelectedZone] = useState('');
	const [selectedNodeId, setSelectedNodeId] = useState(null);
	const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
	const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
	const [activeAppleItemId, setActiveAppleItemId] = useState(null);
	const [activeApplePosition, setActiveApplePosition] = useState(null);
	const [isCollectingApple, setIsCollectingApple] = useState(false);
	const [fruitSpecialCombo, setFruitSpecialCombo] = useState(loadForagingFruitCombo);
	const { foragingHitsConfig } = useCalculateForagingSpeed();
	const handleInventoryChanged = useCallback(() => {
		setInventoryRefreshTick((prev) => prev + 1);
	}, []);
	const handleEquipmentChanged = useCallback(() => {
		setEquipmentRefreshTick((prev) => prev + 1);
	}, []);

	const playerId = useMemo(() => {
		const storedPlayerId = localStorage.getItem('playerId');
		if (!storedPlayerId) {
			return null;
		}

		const parsedPlayerId = Number(storedPlayerId);
		return Number.isNaN(parsedPlayerId) ? null : parsedPlayerId;
	}, []);

	useEffect(() => {
		const fetchForagingData = async () => {
			try {
				setIsLoadingNodes(true);
				setIsLoadingSkill(true);
				setNodeError('');
				setSkillError('');

				const requests = [
					axios.get(API_BASE + '/Node/GetNodes', {
						params: playerId ? { playerId } : undefined,
						headers: { Accept: 'application/json' },
					}),
					axios.get(API_BASE + '/Item/GetItems', {
						headers: { Accept: 'application/json' },
					}),
					axios.get(API_BASE + '/Skills/GetSkills', {
						headers: { Accept: 'application/json' },
					}),
				];

				if (playerId) {
					requests.push(
						axios.get(API_BASE + '/PlayerSkills/GetPlayerSkills', {
							params: { playerId },
							validateStatus: (status) => status === 200 || status === 404,
							headers: {
								Accept: 'application/json',
								...getAuthHeaders(),
							},
						})
					);

					requests.push(
						axios.get(API_BASE + '/Purse/GetPurse', {
							params: { playerId },
							headers: {
								Accept: 'application/json',
								...getAuthHeaders(),
							},
						})
					);
				}

				const [nodesResponse, itemsResponse, skillsResponse, playerSkillsResponse, purseResponse] = await Promise.all(requests);

				const normalizedNodes = Array.isArray(nodesResponse.data)
					? nodesResponse.data.map(normalizeNode)
					: [];

				const normalizedItems = Array.isArray(itemsResponse.data)
					? itemsResponse.data.map(normalizeItem)
					: [];

				const itemMap = {};
				for (const item of normalizedItems) {
					if (item.idItem != null) {
						itemMap[item.idItem] = item;
					}
				}

				setNodes(normalizedNodes);
				setItemsById(itemMap);

				const skills = Array.isArray(skillsResponse?.data) ? skillsResponse.data : [];
				const foragingSkill = skills.find((skill) => {
					const name = (skill.name ?? skill.Name ?? '').toString().trim().toLowerCase();
					return name === FORAGING_SKILL_NAME;
				});

				const foragingSkillId = toNumberOrNull(foragingSkill?.idSkills ?? foragingSkill?.IdSkills);
				setForagingSkillId(foragingSkillId);
				const playerSkills = playerSkillsResponse?.status === 404
					? []
					: (Array.isArray(playerSkillsResponse?.data) ? playerSkillsResponse.data : []);
				const playerForagingSkill = foragingSkillId != null
					? playerSkills.find((skill) => toNumberOrNull(skill.fkSkillsidSkills ?? skill.FkSkillsidSkills) === foragingSkillId)
					: null;

				setPlayerForagingSkillState(playerForagingSkill
					? {
						idPlayerSkills: toNumberOrNull(playerForagingSkill.idPlayerSkills ?? playerForagingSkill.IdPlayerSkills),
						fkSkillsidSkills: toNumberOrNull(playerForagingSkill.fkSkillsidSkills ?? playerForagingSkill.FkSkillsidSkills),
						level: toNumberOrNull(playerForagingSkill.level ?? playerForagingSkill.Level) ?? 1,
						xp: Number(playerForagingSkill.xp ?? playerForagingSkill.Xp ?? 0),
					}
					: null);

				setPlayerForagingLevel(toNumberOrNull(playerForagingSkill?.level ?? playerForagingSkill?.Level) ?? 0);
				setPurseBalance(toNumberOrNull(purseResponse?.data?.balance ?? purseResponse?.data?.Balance) ?? 0);
			} catch (error) {
				console.error('Failed to load foraging nodes:', error);
				setNodeError('Failed to load foraging nodes from API.');
				setSkillError('Failed to load player foraging level.');
			} finally {
				setIsLoadingNodes(false);
				setIsLoadingSkill(false);
			}
		};

		fetchForagingData();
	}, [playerId]);

	const awardForagingSkillXp = useCallback(async (xpReward) => {
		const xpToAdd = Math.max(0, Number(xpReward ?? 0));
		if (!playerId || xpToAdd <= 0) {
			return;
		}

		const skillId = foragingSkillId ?? playerForagingSkillState?.fkSkillsidSkills;
		if (!skillId) {
			return;
		}

		try {
			const response = await axios.post(API_BASE + '/PlayerSkills/GrantSkillXp', {
				playerId,
				skillId,
				xpToAdd,
			}, {
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});

			const updatedSkill = response?.data ?? null;
			if (updatedSkill) {
				setPlayerForagingSkillState({
					idPlayerSkills: toNumberOrNull(updatedSkill.idPlayerSkills ?? updatedSkill.IdPlayerSkills),
					fkSkillsidSkills: toNumberOrNull(updatedSkill.fkSkillsidSkills ?? updatedSkill.FkSkillsidSkills) ?? skillId,
					level: toNumberOrNull(updatedSkill.level ?? updatedSkill.Level) ?? 1,
					xp: Number(updatedSkill.xp ?? updatedSkill.Xp ?? 0),
				});
				setPlayerForagingLevel(toNumberOrNull(updatedSkill.level ?? updatedSkill.Level) ?? playerForagingLevel);
			}
		} catch (error) {
			console.error('Failed to update foraging skill XP:', error);
		}
	}, [playerId, foragingSkillId, playerForagingSkillState, playerForagingLevel]);

	const foragingNodes = useMemo(() => {
		const enabledNodes = nodes.filter((node) => node.isEnabled);
		const typedNodes = enabledNodes.filter((node) => node.fkNodetypeidNodeType === FORAGING_NODE_TYPE_ID);
		return typedNodes.length ? typedNodes : enabledNodes;
	}, [nodes]);

	const zones = useMemo(() => {
		const set = new Set();
		for (const node of foragingNodes) {
			set.add((node.zone || 'Unzoned').trim());
		}
		return [...set].sort((a, b) => a.localeCompare(b));
	}, [foragingNodes]);

	useEffect(() => {
		if (!zones.length) {
			setSelectedZone('');
			return;
		}

		const firstSelectableNode = foragingNodes.find((node) => {
			const isLevelMet = (node.requiredLevel ?? 1) <= playerForagingLevel;
			return isLevelMet && node.isUnlocked;
		});

		const fallbackZone = firstSelectableNode
			? (firstSelectableNode.zone || 'Unzoned').trim()
			: zones[0];

		if (!selectedZone || !zones.includes(selectedZone)) {
			setSelectedZone(fallbackZone);
		}
	}, [zones, selectedZone, foragingNodes, playerForagingLevel]);

	const nodesInSelectedZone = useMemo(
		() => foragingNodes.filter((node) => (node.zone || 'Unzoned').trim() === selectedZone),
		[foragingNodes, selectedZone]
	);

	useEffect(() => {
		const firstSelectableNode = foragingNodes.find((node) => {
			const isLevelMet = (node.requiredLevel ?? 1) <= playerForagingLevel;
			return isLevelMet && node.isUnlocked;
		});

		if (!firstSelectableNode) {
			setSelectedNodeId(null);
			return;
		}

		if (!nodesInSelectedZone.length) {
			setSelectedZone((currentZone) => currentZone || (firstSelectableNode.zone || 'Unzoned').trim());
			setSelectedNodeId(firstSelectableNode.idNode);
			return;
		}

		const levelMetNodes = nodesInSelectedZone.filter((node) => (node.requiredLevel ?? 1) <= playerForagingLevel);
		const fullyUnlockedNodes = levelMetNodes.filter((node) => node.isUnlocked);
		const preferredNode = fullyUnlockedNodes[0] ?? null;
		const selectedNodeIsUnlocked = selectedNodeId
			? fullyUnlockedNodes.some((node) => node.idNode === selectedNodeId)
			: false;

		if (!selectedNodeIsUnlocked) {
			setSelectedNodeId(preferredNode?.idNode ?? null);
		}
	}, [nodesInSelectedZone, selectedNodeId, playerForagingLevel, foragingNodes]);

	const selectedNode = useMemo(
		() => foragingNodes.find((node) => node.idNode === selectedNodeId) ?? null,
		[foragingNodes, selectedNodeId]
	);

	useEffect(() => {
		const nextMaxHealth = selectedNode?.nodeHealth ?? DEFAULT_BLOCK_HEALTH;
		setBlockHealth(nextMaxHealth);
	}, [selectedNode?.idNode, selectedNode?.nodeHealth]);

	const nodeItem = useMemo(
		() => (selectedNode ? itemsById[selectedNode.fkNodeitemidItem] ?? null : null),
		[selectedNode, itemsById]
	);

	const outputItem = useMemo(
		() => (selectedNode ? itemsById[selectedNode.fkOutputitemidItem] ?? null : null),
		[selectedNode, itemsById]
	);

	const itemName = formatDisplayName(outputItem?.name ?? nodeItem?.name ?? 'Node');

	const currentOutputItemId = selectedNode?.fkOutputitemidItem ?? null;
	const currentSessionMined = currentOutputItemId != null
		? (sessionMinedByItem[currentOutputItemId] ?? 0)
		: 0;

	const collectionId = useMemo(() => {
		const id = outputItem?.fkCollectionidCollection;
		return typeof id === 'number' ? id : null;
	}, [outputItem]);

	const nodeTextureStyle = useMemo(() => {
		const iconPath = nodeItem?.icon;
		const resolvedIconPath = resolveIconPath(iconPath, BLOCK_TEXTURE_BY_FILE);

		if (!resolvedIconPath) {
			return undefined;
		}

		return {
			backgroundImage: `url("${resolvedIconPath}")`,
			backgroundRepeat: 'repeat',
			backgroundSize: '64px 64px',
			imageRendering: 'pixelated',
		};
	}, [nodeItem]);

	const foragingAppleEventItems = useMemo(
		() => Object.values(itemsById).filter((item) => isForagingAppleEventItem(item)),
		[itemsById]
	);

	const activeAppleItem = useMemo(
		() => (activeAppleItemId != null ? itemsById[activeAppleItemId] ?? null : null),
		[activeAppleItemId, itemsById]
	);

	const activeAppleIcon = useMemo(
		() => (activeAppleItem ? resolveIconPath(activeAppleItem.icon, BLOCK_TEXTURE_BY_FILE) : ''),
		[activeAppleItem]
	);

	const addGatheredItemToInventory = async () => {
		setDropError('');

		const itemId = selectedNode?.fkOutputitemidItem;
		const quantity = Math.max(1, Math.floor(Number(selectedNode?.baseYieldQty ?? 1)));
		if (!itemId) {
			setDropError('Cannot add drop: item id is missing.');
			return false;
		}

		if (!playerId) {
			setDropError('Cannot add drop: player id is missing. Log in again.');
			return false;
		}

		try {
			setIsSavingDrop(true);

			await axios.post(API_BASE + '/Inventory/AddItemToInventory', {
				playerId,
				itemId,
				quantity,
			}, {
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});

			if (currentOutputItemId != null) {
				setSessionMinedByItem((prev) => {
					const next = {
						...prev,
						[currentOutputItemId]: (prev[currentOutputItemId] ?? 0) + 1,
					};

					localStorage.setItem(FORAGING_SESSION_STORAGE_KEY, JSON.stringify(next));
					return next;
				});
			}

			if (selectedNode?.idNode) {
				try {
					await axios.post(API_BASE + '/PlayerContracts/AddNodeMineProgress', {
						playerId,
						nodeId: selectedNode.idNode,
						amountToAdd: 1,
					}, {
						headers: {
							Accept: 'application/json',
							...getAuthHeaders(),
						},
					});

					window.dispatchEvent(new Event('contracts-updated'));
				} catch (contractError) {
					console.error('Failed to update node contract progress:', contractError);
				}
			}

			setInventoryRefreshTick((prev) => prev + 1);
			setCollectionProgressTick((prev) => prev + quantity);
			return true;
		} catch (error) {
			console.error('Failed to add gathered item to inventory:', error);
			setDropError('Failed to add gathered drop to inventory. It may be full.');
			return false;
		} finally {
			setIsSavingDrop(false);
		}
	};

	const unlockNode = async (nodeToUnlock) => {
		if (!nodeToUnlock || !playerId || !nodeToUnlock.idNode) {
			return false;
		}

		const requiredLevel = nodeToUnlock.requiredLevel ?? 1;
		const unlockPrice = Number(nodeToUnlock.unlockPrice ?? 0);
		const isLevelMet = requiredLevel <= playerForagingLevel;
		const isAlreadyUnlocked = nodeToUnlock.isUnlocked;

		if (!isLevelMet) {
			setDropError(`You need Foraging level ${requiredLevel} first.`);
			return false;
		}

		if (isAlreadyUnlocked) {
			return true;
		}

		if (unlockPrice > purseBalance) {
			setDropError(`Not enough coins. Requires ${unlockPrice.toFixed(2)}.`);
			return false;
		}

		try {
			setIsUnlockingNode(true);
			setDropError('');

			await axios.post(API_BASE + '/Node/UnlockNode', {
				playerId,
				nodeId: nodeToUnlock.idNode,
			}, {
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});

			setPurseBalance((prev) => prev - unlockPrice);
			setNodes((prev) => prev.map((node) => (
				node.idNode === nodeToUnlock.idNode
					? { ...node, isUnlocked: true }
					: node
			)));
			return true;
		} catch (error) {
			console.error('Failed to unlock node:', error);
			setDropError(error?.response?.data?.message ?? error?.response?.data ?? 'Failed to unlock node.');
			return false;
		} finally {
			setIsUnlockingNode(false);
		}
	};

	const gatherBlock = async () => {
		if (isSavingDrop || !selectedNode) {
			return;
		}

		if (!isSelectedNodeUnlocked) {
			if (!isSelectedNodeLevelMet) {
				setDropError(`Node locked. Requires Foraging level ${selectedNodeRequiredLevel}.`);
			} else {
				setDropError(`Node locked. Unlock costs ${selectedNodeUnlockPrice.toFixed(2)} coins.`);
			}
			return;
		}

		const maxHealth = selectedNode.nodeHealth || DEFAULT_BLOCK_HEALTH;
		const hitsThisClick = rollHitsForClick(foragingHitsConfig);

		if (hitsThisClick <= 0) {
			return;
		}

		if (blockHealth > hitsThisClick) {
			setBlockHealth((prev) => Math.max(0, prev - hitsThisClick));
			return;
		}

		setBlockHealth(maxHealth);
		const didGather = await addGatheredItemToInventory();
		if (!didGather) {
			return;
		}

		await awardForagingSkillXp(selectedNode?.xpReward);

		if (!activeAppleItemId) {
			const spawnedApple = rollForagingAppleSpawn(foragingAppleEventItems);
			if (spawnedApple?.idItem != null) {
				setActiveAppleItemId(spawnedApple.idItem);
				setActiveApplePosition(getRandomAppleOverlayPosition());
				setDropError(`${formatDisplayName(spawnedApple.name)} spawned. Click it to collect.`);
			}
		}
	};

	const resolveFruitSkillCheck = async ({ quantity, hitZone, isSpecialHit, nextCombo, displayName }) => {
		if (!activeAppleItem || !playerId || isCollectingApple) {
			return;
		}

		try {
			setIsCollectingApple(true);
			setDropError('');

			if (quantity > 0) {
				await axios.post(API_BASE + '/Inventory/AddItemToInventory', {
					playerId,
					itemId: activeAppleItem.idItem,
					quantity,
				}, {
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				setInventoryRefreshTick((prev) => prev + 1);
			}

			setFruitSpecialCombo(nextCombo);
			sessionStorage.setItem(FORAGING_FRUIT_COMBO_SESSION_KEY, String(nextCombo));

			if (isSpecialHit) {
				setDropError(`Green zone! Collected ${quantity} ${displayName}. Combo ${nextCombo}.`);
			} else if (hitZone === 'regular') {
				setDropError(`Collected ${quantity} ${displayName}. Combo reset.`);
			} else {
				setDropError(`Collected ${quantity} ${displayName}. Combo ${nextCombo}.`);
			}

			setActiveAppleItemId(null);
			setActiveApplePosition(null);
		} catch (error) {
			console.error('Failed to collect spawned apple:', error);
			setDropError('Failed to collect apple.');
		} finally {
			setIsCollectingApple(false);
		}
	};

	const selectedNodeRequiredLevel = selectedNode?.requiredLevel ?? 1;
	const isNodeUnlockedByPrice = (node) => {
		if (!node?.idNode) {
			return false;
		}

		return Boolean(node.isUnlocked);
	};

	const isSelectedNodeUnlockedByPrice = selectedNode ? isNodeUnlockedByPrice(selectedNode) : false;
	const isSelectedNodeLevelMet = selectedNode ? selectedNodeRequiredLevel <= playerForagingLevel : false;
	const isSelectedNodeUnlocked = selectedNode ? (isSelectedNodeLevelMet && isSelectedNodeUnlockedByPrice) : false;
	const selectedNodeUnlockPrice = selectedNode?.unlockPrice ?? 0;

	const selectedNodeButtonLabel = selectedNode
		? `${formatDisplayName(nodeItem?.name ?? 'Unknown')} -> ${formatDisplayName(outputItem?.name ?? 'Unknown')}`
		: 'None';

	const handleSelectZone = (zone) => {
		setSelectedZone(zone);
		setIsZoneModalOpen(false);
	};

	const handleSelectNode = async (node) => {
		const isUnlocked = node.isUnlocked;

		if (!isUnlocked) {
			const didUnlock = await unlockNode(node);
			if (!didUnlock) {
				return;
			}
		}

		setSelectedNodeId(node.idNode);
		setIsNodeModalOpen(false);
	};

	return (
		<div className="foraging-page-layout">
			<section className="foraging-content">
				<ForagingHeader
					title="Foraging Nodes"
					skillLabel="Foraging"
					selectedZone={selectedZone}
					onOpenZone={() => setIsZoneModalOpen(true)}
					hasZones={zones.length > 0}
					onOpenNode={() => setIsNodeModalOpen(true)}
					hasNodesInZone={nodesInSelectedZone.length > 0}
					selectedNodeButtonLabel={selectedNodeButtonLabel}
					isLoadingNodes={isLoadingNodes}
					isLoadingSkill={isLoadingSkill}
					nodeError={nodeError}
					skillError={skillError}
					dropError={dropError}
					playerForagingLevel={playerForagingLevel}
					selectedNode={selectedNode}
					isSelectedNodeUnlocked={isSelectedNodeUnlocked}
					selectedNodeRequiredLevel={selectedNodeRequiredLevel}
				/>

				<ForagingBlock
					label={itemName}
					currentHealth={blockHealth}
					maxHealth={selectedNode?.nodeHealth ?? DEFAULT_BLOCK_HEALTH}
					onMine={gatherBlock}
					ariaLabel={`Gather ${itemName} block`}
					blockClassName="foraging-block--cobblestone"
					blockStyle={nodeTextureStyle}
					isDisabled={!selectedNode || isSavingDrop}
					overlayContent={
						<ForagingAppleSpecialEvent
							appleItem={activeAppleItem}
							appleIcon={activeAppleIcon}
							position={activeApplePosition}
							comboStreak={fruitSpecialCombo}
							onResolve={resolveFruitSkillCheck}
							isCollecting={isCollectingApple}
						/>
					}
					helperText={
						!selectedNode
							? 'Select a node first.'
							: (!isSelectedNodeLevelMet
								? `Locked until Foraging level ${selectedNodeRequiredLevel}.`
								: (isSelectedNodeUnlocked ? '' : `Unlock this node for ${selectedNodeUnlockPrice.toFixed(2)} coins.`))
					}
				/>

				<section className="foraging-stats" aria-label="Foraging stats">
					<article>
						<h2>{itemName} Gathered This Session</h2>
						<p>{currentSessionMined}</p>
					</article>
					<PlayerCollection
						playerId={playerId}
						itemName={itemName}
						itemId={currentOutputItemId}
						collectionId={collectionId}
						progressTick={collectionProgressTick}
					/>
				</section>

				<Inventory
					playerId={playerId}
					refreshKey={inventoryRefreshTick}
					onInventoryChanged={handleInventoryChanged}
					onEquipmentChanged={handleEquipmentChanged}
				/>

				<ForagingZoneSelectModal
					isOpen={isZoneModalOpen}
					zones={zones}
					foragingNodes={foragingNodes}
					selectedZone={selectedZone}
					onSelectZone={handleSelectZone}
					onClose={() => setIsZoneModalOpen(false)}
				/>

				<ForagingNodeSelectModal
					isOpen={isNodeModalOpen}
					nodes={nodesInSelectedZone}
					itemsById={itemsById}
					playerForagingLevel={playerForagingLevel}
					selectedNodeId={selectedNodeId}
					isUnlockingNode={isUnlockingNode}
					onSelectNode={handleSelectNode}
					onClose={() => setIsNodeModalOpen(false)}
				/>
			</section>

			<aside className="foraging-selling-panel" aria-label="Sell and equipment panel">
				<SellingTab
					playerId={playerId}
					refreshInventory={handleInventoryChanged}
				/>

				<PlayerEquipment
					playerId={playerId}
					refreshKey={equipmentRefreshTick}
					onInventoryChanged={handleInventoryChanged}
					onEquipmentChanged={handleEquipmentChanged}
				/>
			</aside>
		</div>
	);
};

export default Foraging;
