const formatChance = (chance) => {
	const numericChance = Number(chance);
	if (!Number.isFinite(numericChance)) {
		return '0%';
	}

	const normalized = numericChance <= 1 ? numericChance * 100 : numericChance;
	return `${Math.max(0, Math.min(100, normalized)).toFixed(1)}%`;
};

const formatDisplayName = (value) => {
	const normalized = (value ?? '').toString().trim();
	if (!normalized) {
		return 'Unknown';
	}

	return normalized.replace(/_/g, ' ');
};

const Contract = ({
	contract,
	actions = null,
}) => {
	const progressCount = Number(contract?.progressCount ?? 0);
	const targetCount = Math.max(1, Number(contract?.targetCount ?? 1));
	const progressPercent = Math.min(100, Math.round((progressCount / targetCount) * 100));
	const rewards = Array.isArray(contract?.rewards) ? contract.rewards : [];
	const potentialContractPoints = rewards.reduce((sum, reward) => sum + Math.max(0, Number(reward?.contractPoints ?? 0)), 0);

	const targetLabel = contract?.targetMobName
		? `Kill ${formatDisplayName(contract.targetMobName)}`
		: contract?.targetNodeName
			? `Mine ${formatDisplayName(contract.targetNodeName)}`
			: 'Complete objective';

	return (
		<article className="contract-card">
			<header className="contract-card-header">
				<div>
					<h3 className="contract-name">{formatDisplayName(contract?.contractName)}</h3>
					<p className="contract-meta">
						<span>{formatDisplayName(contract?.difficulty)}</span>
						<span> - </span>
						<span>{formatDisplayName(contract?.skillName)}</span>
					</p>
				</div>
			</header>

			<div className="contract-objective">
				<strong>Objective:</strong> {targetLabel} ({progressCount}/{targetCount})
			</div>

			<div className="contract-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={targetCount} aria-valuenow={progressCount}>
				<div className="contract-progress-fill" style={{ width: `${progressPercent}%` }} />
			</div>

			<ul className="contract-rewards">
				{rewards.length === 0 ? (
					<li>No rewards configured.</li>
				) : rewards.map((reward) => {
					const parts = [];
					if (reward.coinReward) {
						parts.push(`${reward.coinReward} coins`);
					}
					if (reward.xpReward) {
						parts.push(`${reward.xpReward} XP`);
					}
					if (reward.contractPoints) {
						parts.push(`${reward.contractPoints} contract points`);
					}
					if (reward.itemRewardName) {
						parts.push(formatDisplayName(reward.itemRewardName));
					}

					return (
						<li key={reward.contractRewardId ?? `${reward.itemRewardId}-${reward.chance}`}>
							{parts.join(' + ') || 'Empty reward'} ({formatChance(reward.chance)})
						</li>
					);
				})}
			</ul>

			<div className="contract-points-summary">
				<strong>Potential Contract Points:</strong> {potentialContractPoints}
			</div>

			{actions ? (
				<div className="contract-actions">
					{actions}
				</div>
			) : null}

		</article>
	);
};

export default Contract;
