const NodeSelectModal = ({
	isOpen,
	nodes,
	itemsById,
	playerMiningLevel,
	unlockedNodeMap,
	selectedNodeId,
	isUnlockingNode,
	onSelectNode,
	onClose,
}) => {
	if (!isOpen) {
		return null;
	}

	return (
		<div className="zone-modal-overlay" onClick={onClose} role="presentation">
			<div
				className="zone-modal"
				onClick={(event) => event.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label="Select mining node"
			>
				<div className="zone-modal-header">
					<h2>Select Node</h2>
					<button type="button" className="zone-modal-close" onClick={onClose}>Close</button>
				</div>
				<div className="zone-modal-list">
					{nodes.length ? (
						nodes.map((node) => {
							const zoneNodeItem = itemsById[node.fkNodeitemidItem];
							const zoneOutputItem = itemsById[node.fkOutputitemidItem];
							const label = `${zoneNodeItem?.name ?? 'Unknown'} -> ${zoneOutputItem?.name ?? 'Unknown'}`;
							const isLevelMet = (node.requiredLevel ?? 1) <= playerMiningLevel;
							const isUnlocked = node.isUnlocked || Boolean(unlockedNodeMap[node.idNode]);

							return (
								<button
									type="button"
									key={node.idNode}
									className={`zone-option ${node.idNode === selectedNodeId ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`.trim()}
									disabled={!isLevelMet || isUnlockingNode}
									onClick={() => onSelectNode(node)}
								>
									<span>{label}</span>
									<span>{!isLevelMet ? `Locked (Lvl ${node.requiredLevel})` : (isUnlocked ? `Lvl ${node.requiredLevel}` : `Click to unlock ${Number(node.unlockPrice ?? 0).toFixed(2)}c`)}</span>
								</button>
							);
						})
					) : (
						<p className="node-meta">No nodes available in this zone.</p>
					)}
				</div>
			</div>
		</div>
	);
};

export default NodeSelectModal;
