import { useCallback, useMemo, useState } from 'react';

export const DEFAULT_TITANIUM_SPAWN_CHANCE = 0.02;

const clampChance = (value, fallback) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}

	if (parsed < 0) {
		return 0;
	}

	if (parsed > 1) {
		return 1;
	}

	return parsed;
};

const useTitaniumEvent = ({
	spawnChance = DEFAULT_TITANIUM_SPAWN_CHANCE,
	miningTypeNodes,
	itemsById,
	onSelectZone,
	onSelectNode,
	onMessage,
}) => {
	const [activeTitaniumNodeId, setActiveTitaniumNodeId] = useState(null);
	const [lastMithrilNodeId, setLastMithrilNodeId] = useState(null);

	const normalizedSpawnChance = useMemo(
		() => clampChance(spawnChance, DEFAULT_TITANIUM_SPAWN_CHANCE),
		[spawnChance]
	);

	const getNodeSearchName = useCallback((node) => {
		if (!node) {
			return '';
		}

		const sourceName = (itemsById[node.fkNodeitemidItem]?.name ?? '').toString().trim().toLowerCase();
		const outputName = (itemsById[node.fkOutputitemidItem]?.name ?? '').toString().trim().toLowerCase();
		return `${sourceName} ${outputName}`.trim();
	}, [itemsById]);

	const isMithrilNode = useCallback((node) => {
		const name = getNodeSearchName(node);
		return name.includes('mithril') && !name.includes('titanium');
	}, [getNodeSearchName]);

	const isTitaniumNode = useCallback((node) => getNodeSearchName(node).includes('titanium'), [getNodeSearchName]);

	const getTitaniumNodeForZone = useCallback((zone) => {
		const normalizedZone = (zone || 'Unzoned').trim();

		const zoneTitanium = miningTypeNodes.find(
			(node) => (node.zone || 'Unzoned').trim() === normalizedZone && isTitaniumNode(node)
		);

		if (zoneTitanium) {
			return zoneTitanium;
		}

		return miningTypeNodes.find((node) => isTitaniumNode(node)) ?? null;
	}, [miningTypeNodes, isTitaniumNode]);

	const isActiveTitaniumNode = useCallback(
		(nodeId) => activeTitaniumNodeId != null && nodeId === activeTitaniumNodeId,
		[activeTitaniumNodeId]
	);

	const canSelectNode = useCallback((nodeId) => {
		if (activeTitaniumNodeId && nodeId !== activeTitaniumNodeId) {
			onMessage?.('A Titanium node is active. Mine it once before switching nodes.');
			return false;
		}

		return true;
	}, [activeTitaniumNodeId, onMessage]);

	const handleMinedNode = useCallback((minedNode) => {
		if (!minedNode) {
			return;
		}

		const minedActiveTitanium = activeTitaniumNodeId != null && minedNode.idNode === activeTitaniumNodeId;
		if (minedActiveTitanium) {
			const previousMithrilId = lastMithrilNodeId;
			setActiveTitaniumNodeId(null);
			setLastMithrilNodeId(null);
			onSelectNode(previousMithrilId ?? null);
			return;
		}

		if (activeTitaniumNodeId || !isMithrilNode(minedNode)) {
			return;
		}

		const didProcTitanium = Math.random() < normalizedSpawnChance;
		if (!didProcTitanium) {
			return;
		}

		const titaniumNode = getTitaniumNodeForZone(minedNode.zone);
		if (!titaniumNode) {
			return;
		}

		setActiveTitaniumNodeId(titaniumNode.idNode);
		setLastMithrilNodeId(minedNode.idNode);
		onSelectZone((titaniumNode.zone || 'Unzoned').trim());
		onSelectNode(titaniumNode.idNode);
		onMessage?.('Titanium spawned. Mine it before continuing back to mithril.');
	}, [
		activeTitaniumNodeId,
		lastMithrilNodeId,
		isMithrilNode,
		normalizedSpawnChance,
		getTitaniumNodeForZone,
		onSelectZone,
		onSelectNode,
		onMessage,
	]);

	return {
		activeTitaniumNodeId,
		canSelectNode,
		handleMinedNode,
		isActiveTitaniumNode,
	};
};

export default useTitaniumEvent;
