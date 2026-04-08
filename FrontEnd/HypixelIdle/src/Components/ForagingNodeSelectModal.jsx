import { formatDisplayName } from './DisplayNameUtils';

const ForagingNodeSelectModal = ({
	isOpen,
	nodes,
	itemsById,
	playerForagingLevel,
	selectedNodeId,
	isUnlockingNode,
	onSelectNode,
	onClose,
}) => {
	if (!isOpen) {
		return null;
	}

	return (
		<div className="foraging-zone-modal-overlay" onClick={onClose} role="presentation">
			<div
				className="foraging-zone-modal"
				onClick={(event) => event.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label="Select foraging node"
			>
				<div className="foraging-zone-modal-header">
					<h2>Select Node</h2>
					<button type="button" className="foraging-zone-modal-close" onClick={onClose}>Close</button>
				</div>
				<div className="foraging-zone-modal-list">
					{nodes.length ? (
						nodes.map((node) => {
							const zoneNodeItem = itemsById[node.fkNodeitemidItem];
							const zoneOutputItem = itemsById[node.fkOutputitemidItem];
							const sourceName = formatDisplayName(zoneNodeItem?.name ?? 'Unknown');
							const outputName = formatDisplayName(zoneOutputItem?.name ?? 'Unknown');
							const label = `${sourceName} -> ${outputName}`;
							const isLevelMet = (node.requiredLevel ?? 1) <= playerForagingLevel;
							const isUnlocked = node.isUnlocked;

							return (
								<button
									type="button"
									key={node.idNode}
									className={`foraging-zone-option ${node.idNode === selectedNodeId ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`.trim()}
									disabled={!isLevelMet || isUnlockingNode}
									onClick={() => onSelectNode(node)}
								>
									<span>{label}</span>
									<span>{!isLevelMet ? `Locked (Lvl ${node.requiredLevel})` : (isUnlocked ? `Lvl ${node.requiredLevel}` : `Click to unlock ${Number(node.unlockPrice ?? 0).toFixed(2)}c`)}</span>
								</button>
							);
						})
					) : (
						<p className="foraging-node-meta">No nodes available in this zone.</p>
					)}
				</div>
			</div>
		</div>
	);
};

export default ForagingNodeSelectModal;
