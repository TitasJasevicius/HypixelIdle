const ForagingBlock = ({
	label,
	currentHealth,
	maxHealth,
	onMine,
	ariaLabel,
	blockClassName = '',
	blockStyle,
	isDisabled = false,
	helperText = '',
	overlayContent = null,
}) => {
	const healthPercent = maxHealth > 0
		? Math.max(0, (currentHealth / maxHealth) * 100)
		: 0;
	const resolvedClassName = ['foraging-block', blockClassName].filter(Boolean).join(' ');

	return (
		<section className="foraging-arena" aria-label="Foraging arena">
			<div className="foraging-block-shell">
				<button
					type="button"
					className={resolvedClassName}
					style={blockStyle}
					onClick={onMine}
					aria-label={ariaLabel ?? `Gather ${label}`}
					disabled={isDisabled}
				>
					<span className="foraging-block-label">{label}</span>
					<span className="foraging-block-health">HITS: {currentHealth}/{maxHealth}</span>
				</button>

				{overlayContent}
			</div>

			{helperText ? <p className="foraging-block-helper">{helperText}</p> : null}

			<div className="foraging-healthbar-shell" role="presentation">
				<div className="foraging-healthbar-fill" style={{ width: `${healthPercent}%` }} />
			</div>
		</section>
	);
};

export default ForagingBlock;
