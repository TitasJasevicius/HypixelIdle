const ForagingZoneSelectModal = ({ isOpen, zones, foragingNodes, selectedZone, onSelectZone, onClose }) => {
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
				aria-label="Select foraging zone"
			>
				<div className="foraging-zone-modal-header">
					<h2>Select Zone</h2>
					<button type="button" className="foraging-zone-modal-close" onClick={onClose}>Close</button>
				</div>
				<div className="foraging-zone-modal-list">
					{zones.map((zone) => {
						const zoneCount = foragingNodes.filter((node) => (node.zone || 'Unzoned').trim() === zone).length;

						return (
							<button
								type="button"
								key={zone}
								className={`foraging-zone-option ${zone === selectedZone ? 'selected' : ''}`}
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

export default ForagingZoneSelectModal;
