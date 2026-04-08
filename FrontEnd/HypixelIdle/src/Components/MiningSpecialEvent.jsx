const MiningSpecialEvent = ({
	isTileActive = false,
	isBoostActive = false,
	onActivateTile = null,
	damageMultiplier = 1.5,
	durationMs = 60000,
}) => {
	const normalizedMultiplier = Number.isFinite(Number(damageMultiplier))
		? Math.max(1, Number(damageMultiplier))
		: 1;
	const multiplierDisplay = normalizedMultiplier.toFixed(Number.isInteger(normalizedMultiplier) ? 0 : 1);
	const bonusPercent = Math.max(0, Math.round((normalizedMultiplier - 1) * 100));
	const durationSeconds = Number.isFinite(Number(durationMs))
		? Math.max(1, Math.round(Number(durationMs) / 1000))
		: 60;

	if (!isTileActive && !isBoostActive) {
		return null;
	}

	return (
		<section className="mining-special-event" aria-label="Mining special event">
			{isTileActive ? (
				<>
					<div className="mining-special-event-copy">
						<span className="mining-special-event-kicker">Special Event</span>
						<h2>Enhanced damage</h2>
						<p>Click the tile to receive {multiplierDisplay}x (+{bonusPercent}%) mining damage for {durationSeconds} seconds.</p>
					</div>

					<button type="button" className="mining-special-event-tile combat-action-button secondary" onClick={onActivateTile}>
						<span>Boost</span>
					</button>
				</>
			) : null}

			{isBoostActive ? (
				<div className="mining-special-event-copy mining-special-event-copy--boost">
					<span className="mining-special-event-kicker">Boost Active</span>
					<h2>{multiplierDisplay}x (+{bonusPercent}%) Mining Damage</h2>
					<p>Your next mining hits are empowered for {durationSeconds} seconds.</p>
				</div>
			) : null}
		</section>
	);
};

export default MiningSpecialEvent;
