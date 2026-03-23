const MiningBlock = ({
    label,
    currentHealth,
    maxHealth,
    onMine,
    ariaLabel,
    blockClassName = '',
    blockStyle,
}) => {
    const healthPercent = Math.max(0, (currentHealth / maxHealth) * 100);
    const resolvedClassName = ['mining-block', blockClassName].filter(Boolean).join(' ');

    return (
        <section className="mining-arena" aria-label="Mining arena">
            <button
                type="button"
                className={resolvedClassName}
                style={blockStyle}
                onClick={onMine}
                aria-label={ariaLabel ?? `Mine ${label}`}
            >
                <span className="block-label">{label}</span>
                <span className="block-health">HITS: {currentHealth}/{maxHealth}</span>
            </button>

            <div className="healthbar-shell" role="presentation">
                <div className="healthbar-fill" style={{ width: `${healthPercent}%` }} />
            </div>
        </section>
    );
};

export default MiningBlock;
