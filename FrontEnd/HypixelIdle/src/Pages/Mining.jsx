import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import MiningBlock from '../Components/MiningBlock';
import Inventory from '../Components/Inventory';
import PlayerCollection from '../Components/PlayerCollection';
import '../Styles/GlobalStyles.css';
import '../Styles/MiningStyles.css';

/** @type {Record<string, string>} */
const BLOCK_TEXTURES = import.meta.glob('../Assets/Blocks/*.{png,jpg,jpeg,webp,gif,svg}', {
	eager: true,
	import: 'default',
});

/** @type {Record<string, string>} */
const BLOCK_TEXTURE_BY_FILE = Object.fromEntries(
	Object.entries(BLOCK_TEXTURES).map(([modulePath, assetUrl]) => [
		modulePath.split('/').pop().toLowerCase(),
		assetUrl,
	])
);

const DEFAULT_BLOCK_HEALTH = 10;
const MINING_NODE_TYPE_ID = 1;
const MINED_SESSION_STORAGE_KEY = 'miningSessionMinedByOutputItem';

const loadMinedSessionMap = () => {
	try {
		const raw = localStorage.getItem(MINED_SESSION_STORAGE_KEY);
		if (!raw) {
			return {};
		}

		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return {};
		}

		return parsed;
	} catch (error) {
		console.warn('Failed to parse mined session map:', error);
		return {};
	}
};

const toNumberOrNull = (value) => {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const toBoolean = (value, fallback = false) => {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'number') {
		return value !== 0;
	}

	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true' || normalized === '1') {
			return true;
		}
		if (normalized === 'false' || normalized === '0') {
			return false;
		}
	}

	return fallback;
};

const getAuthHeaders = () => {
	const accessToken = localStorage.getItem('accessToken');

	if (!accessToken) {
		return {};
	}

	return {
		Authorization: `Bearer ${accessToken}`,
	};
};

const resolveIconPath = (iconPath) => {
	if (!iconPath || typeof iconPath !== 'string') {
		return '';
	}

	const trimmedPath = iconPath.trim();

	if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
		return trimmedPath;
	}

	const lowerPath = trimmedPath
		.replaceAll('\\', '/')
		.replace(/^\/+/, '')
		.toLowerCase();

	const pathWithoutPrefix = lowerPath
		.replace(/^src\/assets\/blocks\//, '')
		.replace(/^assets\/blocks\//, '');

	const hasFileExtension = /\.(png|jpe?g|webp|gif|svg)$/i.test(pathWithoutPrefix);
	const fileName = (hasFileExtension ? pathWithoutPrefix : `${pathWithoutPrefix}.png`).split('/').pop();

	return fileName ? (BLOCK_TEXTURE_BY_FILE[fileName] ?? '') : '';
};

const normalizeNode = (node) => ({
	idNode: toNumberOrNull(node.idNode ?? node.IdNode),
	fkNodetypeidNodeType: toNumberOrNull(node.fkNodetypeidNodeType ?? node.FkNodetypeidNodeType),
	fkNodeitemidItem: toNumberOrNull(node.fkNodeitemidItem ?? node.FkNodeitemidItem),
	fkOutputitemidItem: toNumberOrNull(node.fkOutputitemidItem ?? node.FkOutputitemidItem),
	requiredLevel: toNumberOrNull(node.requiredLevel ?? node.RequiredLevel) ?? 1,
	isUnlocked: toBoolean(node.isUnlocked ?? node.IsUnlocked, false),
	unlockPrice: toNumberOrNull(node.unlockPrice ?? node.UnlockPrice) ?? 0,
	xpReward: toNumberOrNull(node.xpReward ?? node.XpReward) ?? 0,
	baseYieldQty: toNumberOrNull(node.baseYieldQty ?? node.BaseYieldQty) ?? 1,
	respawnMs: toNumberOrNull(node.respawnMs ?? node.RespawnMs) ?? 3000,
	nodeHealth: toNumberOrNull(node.nodeHealth ?? node.NodeHealth) ?? DEFAULT_BLOCK_HEALTH,
	requiredToolType: node.requiredToolType ?? node.RequiredToolType ?? '',
	zone: node.zone ?? node.Zone ?? 'Unzoned',
	isEnabled: toBoolean(node.isEnabled ?? node.IsEnabled, true),
});

const normalizeItem = (item) => ({
	idItem: toNumberOrNull(item.idItem ?? item.IdItem),
	name: item.name ?? item.Name ?? 'Unknown Item',
	icon: item.icon ?? item.Icon ?? '',
	fkCollectionidCollection: toNumberOrNull(item.fkCollectionidCollection ?? item.FkCollectionidCollection),
});

const Mining = () => {
	const [blockHealth, setBlockHealth] = useState(DEFAULT_BLOCK_HEALTH);
	const [sessionMinedByItem, setSessionMinedByItem] = useState(loadMinedSessionMap);
	const [nodes, setNodes] = useState([]);
	const [itemsById, setItemsById] = useState({});
	const [isLoadingNodes, setIsLoadingNodes] = useState(true);
	const [nodeError, setNodeError] = useState('');
	const [dropError, setDropError] = useState('');
	const [isSavingDrop, setIsSavingDrop] = useState(false);
	const [inventoryRefreshTick, setInventoryRefreshTick] = useState(0);
	const [selectedZone, setSelectedZone] = useState('');
	const [selectedNodeId, setSelectedNodeId] = useState(null);
	const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);

	const playerId = useMemo(() => {
		const storedPlayerId = localStorage.getItem('playerId');

		if (!storedPlayerId) {
			return null;
		}

		const parsedPlayerId = Number(storedPlayerId);
		return Number.isNaN(parsedPlayerId) ? null : parsedPlayerId;
	}, []);

 	useEffect(() => {
		const fetchMiningData = async () => {
			try {
				setIsLoadingNodes(true);
				setNodeError('');

				const [nodesResponse, itemsResponse] = await Promise.all([
					axios.get('http://localhost:5091/api/Node/GetNodes', {
						headers: {
							Accept: 'application/json',
						},
					}),
					axios.get('http://localhost:5091/api/Item/GetItems', {
						headers: {
							Accept: 'application/json',
						},
					}),
				]);

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
			} catch (error) {
				console.error('Failed to load mining nodes:', error);
				setNodeError('Failed to load mining nodes from API.');
			} finally {
				setIsLoadingNodes(false);
			}
		};

		fetchMiningData();
	}, []);

	const miningNodes = useMemo(() => {
		const enabledNodes = nodes.filter((node) => node.isEnabled);
		const typedNodes = enabledNodes.filter((node) => node.fkNodetypeidNodeType === MINING_NODE_TYPE_ID);

		// If type ids differ between environments, fall back to all enabled nodes.
		return typedNodes.length ? typedNodes : enabledNodes;
	}, [nodes]);

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
		if (!nodesInSelectedZone.length) {
			setSelectedNodeId(null);
			return;
		}

		if (!selectedNodeId || !nodesInSelectedZone.some((node) => node.idNode === selectedNodeId)) {
			setSelectedNodeId(nodesInSelectedZone[0].idNode);
		}
	}, [nodesInSelectedZone, selectedNodeId]);

	const selectedNode = useMemo(
		() => miningNodes.find((node) => node.idNode === selectedNodeId) ?? null,
		[miningNodes, selectedNodeId]
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

	const itemName = outputItem?.name ?? nodeItem?.name ?? 'Node';

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
		const resolvedIconPath = resolveIconPath(iconPath);

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
				quantity: 1,
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
			return true;
		} catch (error) {
			console.error('Failed to add mined item to inventory:', error);
			setDropError('Failed to add mined drop to inventory. It may be full.');
			return false;
		} finally {
			setIsSavingDrop(false);
		}
	};

	const mineBlock = async () => {
		if (isSavingDrop || !selectedNode) {
			return;
		}

		const maxHealth = selectedNode.nodeHealth || DEFAULT_BLOCK_HEALTH;

		if (blockHealth > 1) {
			setBlockHealth((prev) => prev - 1);
			return;
		}

		setBlockHealth(maxHealth);
		await addMinedItemToInventory();
	};

	const selectedNodeDisplay = selectedNode
		? `${nodeItem?.name ?? 'Unknown Node'} -> ${outputItem?.name ?? 'Unknown Drop'}`
		: 'No node selected';

	return (
		<section className="mining-content">
				<header className="mining-header">
					<div className="mining-header-top">
						<h1>Mining Nodes</h1>
						<button
							type="button"
							className="zone-picker-button"
							onClick={() => setIsZoneModalOpen(true)}
							disabled={!zones.length}
						>
							Select Zone: {selectedZone || 'None'}
						</button>
					</div>
					<p>Pick a zone, choose a node, then mine it for drops.</p>
					{isLoadingNodes ? <p>Loading node data...</p> : null}
					{nodeError ? <p>{nodeError}</p> : null}
					{dropError ? <p>{dropError}</p> : null}
					{selectedNode ? <p className="node-meta">{selectedNodeDisplay}</p> : null}
					{selectedNode?.requiredToolType ? (
						<p className="node-meta">Required tool: {selectedNode.requiredToolType}</p>
					) : null}
				</header>

				<section className="zone-node-list" aria-label="Nodes in selected zone">
					{nodesInSelectedZone.length ? (
						nodesInSelectedZone.map((node) => {
							const zoneNodeItem = itemsById[node.fkNodeitemidItem];
							const zoneOutputItem = itemsById[node.fkOutputitemidItem];
							const label = `${zoneNodeItem?.name ?? 'Unknown'} -> ${zoneOutputItem?.name ?? 'Unknown'}`;

							return (
								<button
									type="button"
									key={node.idNode}
									className={`zone-node-button ${node.idNode === selectedNodeId ? 'selected' : ''}`}
									onClick={() => setSelectedNodeId(node.idNode)}
								>
									{label}
								</button>
							);
						})
					) : (
						<p className="node-meta">No nodes available in this zone.</p>
					)}
				</section>

				<MiningBlock
					label={itemName}
					currentHealth={blockHealth}
					maxHealth={selectedNode?.nodeHealth ?? DEFAULT_BLOCK_HEALTH}
					onMine={mineBlock}
					ariaLabel={`Mine ${itemName} block`}
					blockClassName="mining-block--cobblestone"
					blockStyle={nodeTextureStyle}
					isDisabled={!selectedNode || isSavingDrop}
					helperText={!selectedNode ? 'Select a node first.' : ''}
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
						progressTick={inventoryRefreshTick}
					/>
				</section>

				<Inventory playerId={playerId} refreshKey={inventoryRefreshTick} />

				{isZoneModalOpen ? (
					<div className="zone-modal-overlay" onClick={() => setIsZoneModalOpen(false)} role="presentation">
						<div className="zone-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Select mining zone">
							<div className="zone-modal-header">
								<h2>Select Zone</h2>
								<button type="button" className="zone-modal-close" onClick={() => setIsZoneModalOpen(false)}>Close</button>
							</div>
							<div className="zone-modal-list">
								{zones.map((zone) => {
									const zoneCount = miningNodes.filter((node) => (node.zone || 'Unzoned').trim() === zone).length;

									return (
										<button
											type="button"
											key={zone}
											className={`zone-option ${zone === selectedZone ? 'selected' : ''}`}
											onClick={() => {
												setSelectedZone(zone);
												setIsZoneModalOpen(false);
											}}
										>
											<span>{zone}</span>
											<span>{zoneCount} node{zoneCount === 1 ? '' : 's'}</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				) : null}
		</section>
	);
};

export default Mining;
