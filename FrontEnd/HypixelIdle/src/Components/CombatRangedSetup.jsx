const CombatRangedSetup = ({
	bowSlot,
	arrowSlot,
	bowSlotMessage,
	arrowSlotMessage,
	onLoadBow,
	onClearBow,
	onLoadArrows,
	onClearArrows,
	resolveIcon,
}) => (
	<div className="combat-ranged-setup" aria-label="Ranged setup controls">
		<div className="combat-ranged-slot-card">
			<span>Bow Slot</span>
			<div className="combat-arrow-slot-main">
				<div className="combat-loot-icon">
					{bowSlot?.itemIcon ? <img src={resolveIcon(bowSlot.itemIcon)} alt={bowSlot.itemName || 'Bow'} /> : <span>BW</span>}
				</div>
				<div>
					<strong>{bowSlot?.itemName || 'No bow loaded'}</strong>
					<small>{bowSlot?.quantity ? `x${bowSlot.quantity}` : null}</small>
				</div>
			</div>
			<div className="combat-arrow-slot-actions">
				<button type="button" className="combat-action-button" onClick={onLoadBow}>
					Load Selected
				</button>
				<button type="button" className="combat-action-button secondary" onClick={onClearBow} disabled={!bowSlot}>
					Clear
				</button>
			</div>
			{bowSlotMessage ? <p className="combat-arrow-slot-message">{bowSlotMessage}</p> : null}
		</div>

		<div className="combat-ranged-slot-card">
			<span>Arrow Slot</span>
			<div className="combat-arrow-slot-main">
				<div className="combat-loot-icon">
					{arrowSlot?.itemIcon ? <img src={resolveIcon(arrowSlot.itemIcon)} alt={arrowSlot.itemName || 'Arrow'} /> : <span>AR</span>}
				</div>
				<div>
					<strong>{arrowSlot?.itemName || 'No arrows loaded'}</strong>
					<small>{arrowSlot?.quantity ? `x${arrowSlot.quantity}` : null}</small>
				</div>
			</div>
			<div className="combat-arrow-slot-actions">
				<button type="button" className="combat-action-button" onClick={onLoadArrows}>
					Load Selected
				</button>
				<button type="button" className="combat-action-button secondary" onClick={onClearArrows} disabled={!arrowSlot}>
					Clear
				</button>
			</div>
			{arrowSlotMessage ? <p className="combat-arrow-slot-message">{arrowSlotMessage}</p> : null}
		</div>
	</div>
);

export default CombatRangedSetup;
