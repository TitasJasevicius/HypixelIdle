import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import MiningBlock from '../Components/MiningBlock';
import Inventory from '../Components/Inventory';
import PlayerEquipment from '../Components/PlayerEquipment';
import PlayerCollection from '../Components/PlayerCollection';
import MiningHeader from '../Components/MiningHeader';
import ZoneSelectModal from '../Components/ZoneSelectModal';
import NodeSelectModal from '../Components/NodeSelectModal';
import SellingTab from '../Components/SellingTab';
import useTitaniumEvent from '../Components/TitaniumEventLogic';
import { rollHitsForClick, useCalculateMiningSpeed } from '../Components/CalculateMiningSpeed';
import {
	BLOCK_TEXTURE_BY_FILE,
	DEFAULT_BLOCK_HEALTH,
	MINED_SESSION_STORAGE_KEY,
	MINING_NODE_TYPE_ID,
	MINING_SKILL_NAME,
	getAuthHeaders,
	getUnlockedNodesStorageKey,
	loadMinedSessionMap,
	loadUnlockedNodeMap,
	normalizeItem,
	normalizeNode,
	resolveIconPath,
	toNumberOrNull,
} from '../Components/MiningUtils';
import { formatDisplayName } from '../Components/DisplayNameUtils';
import '../Styles/GlobalStyles.css';
import '../Styles/MiningStyles.css';

const TITANIUM_SPAWN_CHANCE = 0.05;

const Mining = () => {
	const [blockHealth, setBlockHealth] = useState(DEFAULT_BLOCK_HEALTH);
	const [sessionMinedByItem, setSessionMinedByItem] = useState(loadMinedSessionMap);
	const [nodes, setNodes] = useState([]);
	const [itemsById, setItemsById] = useState({});
	const [isLoadingNodes, setIsLoadingNodes] = useState(true);
	const [nodeError, setNodeError] = useState('');
	const [isLoadingSkill, setIsLoadingSkill] = useState(true);
	const [skillError, setSkillError] = useState('');
	const [playerMiningLevel, setPlayerMiningLevel] = useState(0);
	const [miningSkillId, setMiningSkillId] = useState(null);
	const [playerMiningSkillState, setPlayerMiningSkillState] = useState(null);
	const [purseBalance, setPurseBalance] = useState(0);
	const [isLoadingPurse, setIsLoadingPurse] = useState(true);
	const [purseError, setPurseError] = useState('');
	const [isUnlockingNode, setIsUnlockingNode] = useState(false);
	const [unlockedNodeMap, setUnlockedNodeMap] = useState({});
	const [dropError, setDropError] = useState('');
	const [isSavingDrop, setIsSavingDrop] = useState(false);
	const [inventoryRefreshTick, setInventoryRefreshTick] = useState(0);
	const [equipmentRefreshTick, setEquipmentRefreshTick] = useState(0);
	const [collectionProgressTick, setCollectionProgressTick] = useState(0);
	const [selectedZone, setSelectedZone] = useState('');
	const [selectedNodeId, setSelectedNodeId] = useState(null);
	const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
	const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
	const { miningHitsConfig } = useCalculateMiningSpeed();
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

	const unlockedNodesStorageKey = useMemo(() => getUnlockedNodesStorageKey(playerId), [playerId]);

	useEffect(() => {
		setUnlockedNodeMap(loadUnlockedNodeMap(unlockedNodesStorageKey));
	}, [unlockedNodesStorageKey]);

	useEffect(() => {
		const fetchMiningData = async () => {
			try {
				setIsLoadingNodes(true);
				setIsLoadingSkill(true);
				setIsLoadingPurse(true);
				setNodeError('');
				setSkillError('');
				setPurseError('');

				const requests = [
					axios.get('http://localhost:5091/api/Node/GetNodes', {
						params: playerId ? { playerId } : undefined,
						headers: {
							Accept: 'application/json',
						},
					}),
					axios.get('http://localhost:5091/api/Item/GetItems', {
						headers: {
							Accept: 'application/json',
						},
					}),
					axios.get('http://localhost:5091/api/Skills/GetSkills', {
						headers: {
							Accept: 'application/json',
						},
					}),
				];

				if (playerId) {
					requests.push(
						axios.get('http://localhost:5091/api/PlayerSkills/GetPlayerSkills', {
							params: {
								playerId,
							},
							validateStatus: (status) => status === 200 || status === 404,
							headers: {
								Accept: 'application/json',
								...getAuthHeaders(),
							},
						})
						);

						requests.push(
							axios.get('http://localhost:5091/api/Purse/GetPurse', {
								params: {
									playerId,
								},
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
				const miningSkill = skills.find((skill) => {
					const name = (skill.name ?? skill.Name ?? '').toString().trim().toLowerCase();
					return name === MINING_SKILL_NAME;
				});

				const miningSkillId = toNumberOrNull(miningSkill?.idSkills ?? miningSkill?.IdSkills);
				setMiningSkillId(miningSkillId);
				const playerSkills = playerSkillsResponse?.status === 404
					? []
					: (Array.isArray(playerSkillsResponse?.data) ? playerSkillsResponse.data : []);
				const playerMiningSkill = miningSkillId != null
					? playerSkills.find((skill) => toNumberOrNull(skill.fkSkillsidSkills ?? skill.FkSkillsidSkills) === miningSkillId)
					: null;

				setPlayerMiningSkillState(playerMiningSkill
					? {
						idPlayerSkills: toNumberOrNull(playerMiningSkill.idPlayerSkills ?? playerMiningSkill.IdPlayerSkills),
						fkSkillsidSkills: toNumberOrNull(playerMiningSkill.fkSkillsidSkills ?? playerMiningSkill.FkSkillsidSkills),
						level: toNumberOrNull(playerMiningSkill.level ?? playerMiningSkill.Level) ?? 1,
						xp: Number(playerMiningSkill.xp ?? playerMiningSkill.Xp ?? 0),
					}
					: null);

				setPlayerMiningLevel(toNumberOrNull(playerMiningSkill?.level ?? playerMiningSkill?.Level) ?? 0);

				setPurseBalance(toNumberOrNull(purseResponse?.data?.balance ?? purseResponse?.data?.Balance) ?? 0);
			} catch (error) {
				console.error('Failed to load mining nodes:', error);
				setNodeError('Failed to load mining nodes from API.');
				setSkillError('Failed to load player mining level.');
				setPurseError('Failed to load purse balance.');
			} finally {
				setIsLoadingNodes(false);
				setIsLoadingSkill(false);
				setIsLoadingPurse(false);
			}
		};

		fetchMiningData();
	}, [playerId]);

	const awardMiningSkillXp = useCallback(async (xpReward) => {
		const xpToAdd = Math.max(0, Number(xpReward ?? 0));
		if (!playerId || xpToAdd <= 0) {
			return;
		}

		const skillId = miningSkillId ?? playerMiningSkillState?.fkSkillsidSkills;
		if (!skillId) {
			return;
		}

		try {
			const response = await axios.post('http://localhost:5091/api/PlayerSkills/GrantSkillXp', {
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
				setPlayerMiningSkillState({
					idPlayerSkills: toNumberOrNull(updatedSkill.idPlayerSkills ?? updatedSkill.IdPlayerSkills),
					fkSkillsidSkills: toNumberOrNull(updatedSkill.fkSkillsidSkills ?? updatedSkill.FkSkillsidSkills) ?? skillId,
					level: toNumberOrNull(updatedSkill.level ?? updatedSkill.Level) ?? 1,
					xp: Number(updatedSkill.xp ?? updatedSkill.Xp ?? 0),
				});
				setPlayerMiningLevel(toNumberOrNull(updatedSkill.level ?? updatedSkill.Level) ?? playerMiningLevel);
			}
		} catch (error) {
			console.error('Failed to update mining skill XP:', error);
		}
	}, [playerId, miningSkillId, playerMiningSkillState, playerMiningLevel]);

	const miningTypeNodes = useMemo(
		() => nodes.filter((node) => node.fkNodetypeidNodeType === MINING_NODE_TYPE_ID),
		[nodes]
	);

	const {
		activeTitaniumNodeId,
		canSelectNode,
		handleMinedNode,
		isActiveTitaniumNode,
	} = useTitaniumEvent({
		spawnChance: TITANIUM_SPAWN_CHANCE,
		miningTypeNodes,
		itemsById,
		onSelectZone: setSelectedZone,
		onSelectNode: setSelectedNodeId,
		onMessage: setDropError,
	});

	const miningNodes = useMemo(() => {
		const enabledNodes = miningTypeNodes.filter((node) => node.isEnabled || node.idNode === activeTitaniumNodeId);
		return enabledNodes.length ? enabledNodes : miningTypeNodes;
	}, [miningTypeNodes, activeTitaniumNodeId]);

	const zones = useMemo(() => {
		const set = new Set();
		for (const node of miningNodes) {
			set.add((node.zone || 'Unzoned').trim());
		}
		return [...set].sort((a, b) => a.localeCompare(b));
	}, [miningNodes]);

	useEffect(() => {
		if (!zones.length) {
			setSelectedZone('');
			return;
		}

		if (!selectedZone || !zones.includes(selectedZone)) {
			setSelectedZone(zones[0]);
		}
	}, [zones, selectedZone]);

	const nodesInSelectedZone = useMemo(
		() => miningNodes.filter((node) => (node.zone || 'Unzoned').trim() === selectedZone),
		[miningNodes, selectedZone]
	);

	useEffect(() => {
		if (activeTitaniumNodeId && selectedNodeId === activeTitaniumNodeId) {
			return;
		}

		if (!nodesInSelectedZone.length) {
			setSelectedNodeId(null);
			return;
		}

		const levelMetNodes = nodesInSelectedZone.filter((node) => (node.requiredLevel ?? 1) <= playerMiningLevel);
		const fullyUnlockedNodes = levelMetNodes.filter((node) => node.isUnlocked || unlockedNodeMap[node.idNode]);
		const preferredNode = fullyUnlockedNodes[0] ?? null;
		const selectedNodeIsUnlocked = selectedNodeId
			? fullyUnlockedNodes.some((node) => node.idNode === selectedNodeId)
			: false;

		if (!selectedNodeIsUnlocked) {
			setSelectedNodeId(preferredNode?.idNode ?? null);
		}
	}, [nodesInSelectedZone, selectedNodeId, playerMiningLevel, unlockedNodeMap, activeTitaniumNodeId]);

	const selectedNode = useMemo(
		() => miningTypeNodes.find((node) => node.idNode === selectedNodeId) ?? null,
		[miningTypeNodes, selectedNodeId]
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

	const addMinedItemToInventory = async () => {
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

			await axios.post('http://localhost:5091/api/Inventory/AddItemToInventory', {
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

					localStorage.setItem(MINED_SESSION_STORAGE_KEY, JSON.stringify(next));
					return next;
				});
			}
			setInventoryRefreshTick((prev) => prev + 1);
			setCollectionProgressTick((prev) => prev + quantity);
			return true;
		} catch (error) {
			console.error('Failed to add mined item to inventory:', error);
			setDropError('Failed to add mined drop to inventory. It may be full.');
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
		const isLevelMet = requiredLevel <= playerMiningLevel;
		const isAlreadyUnlocked = nodeToUnlock.isUnlocked || Boolean(unlockedNodeMap[nodeToUnlock.idNode]);

		if (!isLevelMet) {
			setDropError(`You need Mining level ${requiredLevel} first.`);
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

			if (unlockPrice > 0) {
				await axios.put('http://localhost:5091/api/Purse/UpdatePurse', null, {
					params: {
						playerId,
						amountBalance: -unlockPrice,
						amountBits: 0,
					},
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});
			}

			setPurseBalance((prev) => prev - unlockPrice);
			setUnlockedNodeMap((prev) => {
				const next = {
					...prev,
					[nodeToUnlock.idNode]: true,
				};

				localStorage.setItem(unlockedNodesStorageKey, JSON.stringify(next));
				return next;
			});
			return true;
		} catch (error) {
			console.error('Failed to unlock node:', error);
			setDropError('Failed to unlock node.');
			return false;
		} finally {
			setIsUnlockingNode(false);
		}
	};

	const mineBlock = async () => {
		if (isSavingDrop || !selectedNode) {
			return;
		}

		if (!isSelectedNodeUnlocked) {
			if (!isSelectedNodeLevelMet) {
				setDropError(`Node locked. Requires Mining level ${selectedNodeRequiredLevel}.`);
			} else {
				setDropError(`Node locked. Unlock costs ${selectedNodeUnlockPrice.toFixed(2)} coins.`);
			}
			return;
		}

		const maxHealth = selectedNode.nodeHealth || DEFAULT_BLOCK_HEALTH;
		const hitsThisClick = rollHitsForClick(miningHitsConfig);

		if (hitsThisClick <= 0) {
			return;
		}

		if (blockHealth > hitsThisClick) {
			setBlockHealth((prev) => Math.max(0, prev - hitsThisClick));
			return;
		}

		const minedNode = selectedNode;
		setBlockHealth(maxHealth);
		const didMine = await addMinedItemToInventory();
		if (!didMine) {
			return;
		}

		await awardMiningSkillXp(minedNode?.xpReward);

		handleMinedNode(minedNode);
	};

	const selectedNodeDisplay = selectedNode
		? `${formatDisplayName(nodeItem?.name ?? 'Unknown Node')} -> ${formatDisplayName(outputItem?.name ?? 'Unknown Drop')}`
		: 'No node selected';

	const selectedNodeRequiredLevel = selectedNode?.requiredLevel ?? 1;
	const isNodeUnlockedByPrice = (node) => {
		if (!node?.idNode) {
			return false;
		}

		if (node.isUnlocked) {
			return true;
		}

		return Boolean(unlockedNodeMap[node.idNode]);
	};

	const isSelectedNodeUnlockedByPrice = selectedNode ? isNodeUnlockedByPrice(selectedNode) : false;
	const isSelectedNodeLevelMet = selectedNode ? selectedNodeRequiredLevel <= playerMiningLevel : false;
	const isSelectedTitaniumEventNode = selectedNode ? isActiveTitaniumNode(selectedNode.idNode) : false;
	const isSelectedNodeUnlocked = selectedNode
		? (isSelectedNodeLevelMet && (isSelectedNodeUnlockedByPrice || isSelectedTitaniumEventNode))
		: false;
 	const selectedNodeUnlockPrice = selectedNode?.unlockPrice ?? 0;

	const selectedNodeButtonLabel = selectedNode
		? `${formatDisplayName(nodeItem?.name ?? 'Unknown')} -> ${formatDisplayName(outputItem?.name ?? 'Unknown')}`
		: 'None';

	const handleSelectZone = (zone) => {
		setSelectedZone(zone);
		setIsZoneModalOpen(false);
	};

	const handleSelectNode = async (node) => {
		if (!canSelectNode(node.idNode)) {
			return;
		}

		const isUnlocked = node.isUnlocked || Boolean(unlockedNodeMap[node.idNode]);

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
		<div className="mining-page-layout">
			<section className="mining-content">
				<MiningHeader
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
					playerMiningLevel={playerMiningLevel}
					selectedNode={selectedNode}
					isSelectedNodeUnlocked={isSelectedNodeUnlocked}
					selectedNodeRequiredLevel={selectedNodeRequiredLevel}
				/>

				<MiningBlock
					label={itemName}
					currentHealth={blockHealth}
					maxHealth={selectedNode?.nodeHealth ?? DEFAULT_BLOCK_HEALTH}
					onMine={mineBlock}
					ariaLabel={`Mine ${itemName} block`}
					blockClassName="mining-block--cobblestone"
					blockStyle={nodeTextureStyle}
					isDisabled={!selectedNode || isSavingDrop}
					helperText={
						!selectedNode
							? 'Select a node first.'
							: (!isSelectedNodeLevelMet
								? `Locked until Mining level ${selectedNodeRequiredLevel}.`
								: (isSelectedNodeUnlocked ? '' : `Unlock this node for ${selectedNodeUnlockPrice.toFixed(2)} coins.`))
					}
				/>

				<section className="mining-stats" aria-label="Mining stats">
					<article>
						<h2>{itemName} Mined This Session</h2>
						<p>{currentSessionMined}</p>
					</article>
					<PlayerCollection
						playerId={playerId}
						itemName={itemName}
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

				<ZoneSelectModal
					isOpen={isZoneModalOpen}
					zones={zones}
					miningNodes={miningNodes}
					selectedZone={selectedZone}
					onSelectZone={handleSelectZone}
					onClose={() => setIsZoneModalOpen(false)}
				/>

				<NodeSelectModal
					isOpen={isNodeModalOpen}
					nodes={nodesInSelectedZone}
					itemsById={itemsById}
					playerMiningLevel={playerMiningLevel}
					unlockedNodeMap={unlockedNodeMap}
					selectedNodeId={selectedNodeId}
					isUnlockingNode={isUnlockingNode}
					onSelectNode={handleSelectNode}
					onClose={() => setIsNodeModalOpen(false)}
				/>
			</section>

			<aside className="mining-selling-panel" aria-label="Sell and equipment panel">
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

export default Mining;
