const CombatMeleeSetup = ({
	meleeSlot,
	meleeSlotMessage,
	hasMeleeWeaponLoaded,
	onLoadMeleeWeapon,
	onClearMeleeWeapon,
	resolveIcon,
}) => (
	<div className="combat-ranged-setup" aria-label="Melee setup controls">
		<div className="combat-ranged-slot-card">
			<span>Melee Weapon Slot</span>
			<div className="combat-arrow-slot-main">
				<div className="combat-loot-icon">
					{meleeSlot?.itemIcon ? <img src={resolveIcon(meleeSlot.itemIcon)} alt={meleeSlot.itemName || 'Weapon'} /> : <span>MW</span>}
				</div>
				<div>
					<strong>{meleeSlot?.itemName || 'No melee weapon loaded'}</strong>
					<small>{meleeSlot?.quantity ? `x${meleeSlot.quantity}` : null}</small>
				</div>
			</div>
			<div className="combat-arrow-slot-actions">
				<button type="button" className="combat-action-button" onClick={onLoadMeleeWeapon}>
					Load Selected
				</button>
				<button type="button" className="combat-action-button secondary" onClick={onClearMeleeWeapon} disabled={!hasMeleeWeaponLoaded}>
					Clear
				</button>
			</div>
			{meleeSlotMessage ? <p className="combat-arrow-slot-message">{meleeSlotMessage}</p> : null}
		</div>
	</div>
);

export default CombatMeleeSetup;
