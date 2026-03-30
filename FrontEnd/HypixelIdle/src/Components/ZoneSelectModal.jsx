const ZoneSelectModal = ({ isOpen, zones, miningNodes, selectedZone, onSelectZone, onClose }) => {
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
				aria-label="Select mining zone"
			>
				<div className="zone-modal-header">
					<h2>Select Zone</h2>
					<button type="button" className="zone-modal-close" onClick={onClose}>Close</button>
				</div>
				<div className="zone-modal-list">
					{zones.map((zone) => {
						const zoneCount = miningNodes.filter((node) => (node.zone || 'Unzoned').trim() === zone).length;

						return (
							<button
								type="button"
								key={zone}
								className={`zone-option ${zone === selectedZone ? 'selected' : ''}`}
								onClick={() => onSelectZone(zone)}
							>
								<span>{zone}</span>
								<span>{zoneCount} node{zoneCount === 1 ? '' : 's'}</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default ZoneSelectModal;
