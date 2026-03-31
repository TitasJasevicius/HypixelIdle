import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import ForagingBlock from '../Components/ForagingBlock';
import ForagingAppleSpecialEvent, {
	getRandomAppleOverlayPosition,
	isForagingAppleEventItem,
	rollForagingAppleSpawn,
} from '../Components/ForagingAppleSpecialEvent';
import Inventory from '../Components/Inventory';
import PlayerCollection from '../Components/PlayerCollection';
import ForagingHeader from '../Components/ForagingHeader';
import ForagingZoneSelectModal from '../Components/ForagingZoneSelectModal';
import ForagingNodeSelectModal from '../Components/ForagingNodeSelectModal';
import {
	BLOCK_TEXTURE_BY_FILE,
	DEFAULT_BLOCK_HEALTH,
	getAuthHeaders,
	loadUnlockedNodeMap,
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

const getForagingUnlockedNodesStorageKey = (playerId) => `foragingUnlockedNodesByPlayer_${playerId ?? 'guest'}`;

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
	const [purseBalance, setPurseBalance] = useState(0);
	const [isUnlockingNode, setIsUnlockingNode] = useState(false);
	const [unlockedNodeMap, setUnlockedNodeMap] = useState({});
	const [dropError, setDropError] = useState('');
	const [isSavingDrop, setIsSavingDrop] = useState(false);
	const [inventoryRefreshTick, setInventoryRefreshTick] = useState(0);
	const [selectedZone, setSelectedZone] = useState('');
	const [selectedNodeId, setSelectedNodeId] = useState(null);
	const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
	const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
	const [activeAppleItemId, setActiveAppleItemId] = useState(null);
	const [activeApplePosition, setActiveApplePosition] = useState(null);
	const [isCollectingApple, setIsCollectingApple] = useState(false);
	const [fruitSpecialCombo, setFruitSpecialCombo] = useState(loadForagingFruitCombo);

	const playerId = useMemo(() => {
		const storedPlayerId = localStorage.getItem('playerId');
		if (!storedPlayerId) {
			return null;
		}

		const parsedPlayerId = Number(storedPlayerId);
		return Number.isNaN(parsedPlayerId) ? null : parsedPlayerId;
	}, []);

	const unlockedNodesStorageKey = useMemo(
		() => getForagingUnlockedNodesStorageKey(playerId),
		[playerId]
	);

	useEffect(() => {
		setUnlockedNodeMap(loadUnlockedNodeMap(unlockedNodesStorageKey));
	}, [unlockedNodesStorageKey]);

	useEffect(() => {
		const fetchForagingData = async () => {
			try {
				setIsLoadingNodes(true);
				setIsLoadingSkill(true);
				setNodeError('');
				setSkillError('');

				const requests = [
					axios.get('http://localhost:5091/api/Node/GetNodes', {
						headers: { Accept: 'application/json' },
					}),
					axios.get('http://localhost:5091/api/Item/GetItems', {
						headers: { Accept: 'application/json' },
					}),
					axios.get('http://localhost:5091/api/Skills/GetSkills', {
						headers: { Accept: 'application/json' },
					}),
				];

				if (playerId) {
					requests.push(
						axios.get('http://localhost:5091/api/PlayerSkills/GetPlayerSkills', {
							params: { playerId },
							headers: {
								Accept: 'application/json',
								...getAuthHeaders(),
							},
						})
					);

					requests.push(
						axios.get('http://localhost:5091/api/Purse/GetPurse', {
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
				const playerSkills = Array.isArray(playerSkillsResponse?.data) ? playerSkillsResponse.data : [];
				const playerForagingSkill = foragingSkillId != null
					? playerSkills.find((skill) => toNumberOrNull(skill.fkSkillsidSkills ?? skill.FkSkillsidSkills) === foragingSkillId)
					: null;

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

		if (!selectedZone || !zones.includes(selectedZone)) {
			setSelectedZone(zones[0]);
		}
	}, [zones, selectedZone]);

	const nodesInSelectedZone = useMemo(
		() => foragingNodes.filter((node) => (node.zone || 'Unzoned').trim() === selectedZone),
		[foragingNodes, selectedZone]
	);

	useEffect(() => {
		if (!nodesInSelectedZone.length) {
			setSelectedNodeId(null);
			return;
		}

		const levelMetNodes = nodesInSelectedZone.filter((node) => (node.requiredLevel ?? 1) <= playerForagingLevel);
		const fullyUnlockedNodes = levelMetNodes.filter((node) => node.isUnlocked || unlockedNodeMap[node.idNode]);
		const preferredNode = fullyUnlockedNodes[0] ?? null;
		const selectedNodeIsUnlocked = selectedNodeId
			? fullyUnlockedNodes.some((node) => node.idNode === selectedNodeId)
			: false;

		if (!selectedNodeIsUnlocked) {
			setSelectedNodeId(preferredNode?.idNode ?? null);
		}
	}, [nodesInSelectedZone, selectedNodeId, playerForagingLevel, unlockedNodeMap]);

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

					localStorage.setItem(FORAGING_SESSION_STORAGE_KEY, JSON.stringify(next));
					return next;
				});
			}
			setInventoryRefreshTick((prev) => prev + 1);
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
		const isAlreadyUnlocked = nodeToUnlock.isUnlocked || Boolean(unlockedNodeMap[nodeToUnlock.idNode]);

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

		if (blockHealth > 1) {
			setBlockHealth((prev) => prev - 1);
			return;
		}

		setBlockHealth(maxHealth);
		const didGather = await addGatheredItemToInventory();
		if (!didGather) {
			return;
		}

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
				await axios.post('http://localhost:5091/api/Inventory/AddItemToInventory', {
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

		if (node.isUnlocked) {
			return true;
		}

		return Boolean(unlockedNodeMap[node.idNode]);
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
					collectionId={collectionId}
					progressTick={inventoryRefreshTick}
				/>
			</section>

			<Inventory playerId={playerId} refreshKey={inventoryRefreshTick} />

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
				unlockedNodeMap={unlockedNodeMap}
				selectedNodeId={selectedNodeId}
				isUnlockingNode={isUnlockingNode}
				onSelectNode={handleSelectNode}
				onClose={() => setIsNodeModalOpen(false)}
			/>
		</section>
	);
};

export default Foraging;
