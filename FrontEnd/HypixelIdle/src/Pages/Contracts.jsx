import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import Contract from '../Components/Contract';
import '../Styles/ContractsStyles.css';


const getPlayerId = () => {
	const rawPlayerId = localStorage.getItem('playerId');
	const parsedPlayerId = Number(rawPlayerId);
	return Number.isFinite(parsedPlayerId) && parsedPlayerId > 0 ? parsedPlayerId : null;
};

const normalizeContract = (contract) => ({
	contractId: Number(contract.contractId ?? contract.ContractId ?? 0),
	contractName: contract.contractName ?? contract.ContractName ?? 'Unnamed Contract',
	difficultyId: Number(contract.difficultyId ?? contract.DifficultyId ?? Number.MAX_SAFE_INTEGER),
	difficulty: contract.difficulty ?? contract.Difficulty ?? 'Easy',
	targetCount: Number(contract.targetCount ?? contract.TargetCount ?? 1),
	skillName: contract.skillName ?? contract.SkillName ?? 'Unknown',
	targetMobId: contract.targetMobId ?? contract.TargetMobId ?? null,
	targetMobName: contract.targetMobName ?? contract.TargetMobName ?? null,
	targetNodeId: contract.targetNodeId ?? contract.TargetNodeId ?? null,
	targetNodeName: contract.targetNodeName ?? contract.TargetNodeName ?? null,
	progressCount: Number(contract.progressCount ?? contract.ProgressCount ?? 0),
	rewards: Array.isArray(contract.rewards ?? contract.Rewards)
		? (contract.rewards ?? contract.Rewards).map((reward) => ({
			contractRewardId: reward.contractRewardId ?? reward.ContractRewardId,
			chance: Number(reward.chance ?? reward.Chance ?? 0),
			xpReward: reward.xpReward ?? reward.XpReward ?? 0,
			coinReward: reward.coinReward ?? reward.CoinReward ?? 0,
			contractPoints: Number(reward.contractPoints ?? reward.ContractPoints ?? 0),
			itemRewardId: reward.itemRewardId ?? reward.ItemRewardId ?? null,
			itemRewardName: reward.itemRewardName ?? reward.ItemRewardName ?? null,
		}))
		: [],
});

const getPotentialContractPoints = (contract) => {
	const rewards = Array.isArray(contract?.rewards) ? contract.rewards : [];
	return rewards.reduce((sum, reward) => sum + Math.max(0, Number(reward?.contractPoints ?? 0)), 0);
};

const formatDisplayName = (value) => {
	const normalized = (value ?? '').toString().trim();
	if (!normalized) {
		return 'Unknown';
	}

	return normalized.replace(/_/g, ' ');
};

const formatStatusMessage = (value, fallbackMessage) => {
	if (typeof value !== 'string') {
		return fallbackMessage;
	}

	const normalized = value.trim();
	if (!normalized) {
		return fallbackMessage;
	}

	return normalized.replace(/_/g, ' ');
};

const Contracts = () => {
	const [playerId] = useState(getPlayerId);
	const [selectedDifficulty, setSelectedDifficulty] = useState('');
	const [allContracts, setAllContracts] = useState([]);
	const [activeContracts, setActiveContracts] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [statusMessage, setStatusMessage] = useState('');
	const [busyContractId, setBusyContractId] = useState(null);
	const [pendingCancel, setPendingCancel] = useState(null);

	const fetchContracts = useCallback(async () => {
		if (!playerId) {
			setError('Missing playerId in localStorage. Please relogin.');
			return;
		}

		setIsLoading(true);
		setError('');

		try {
			const [availableResponse, activeResponse] = await Promise.all([
				axios.get(`${API_BASE}/Contract/GetContractsWithRewards`, {
					headers: { Accept: 'application/json' },
				}),
				axios.get(`${API_BASE}/PlayerContracts/GetPlayerContracts`, {
					params: { playerId },
					headers: { Accept: 'application/json' },
				}),
			]);

			const available = Array.isArray(availableResponse.data)
				? availableResponse.data.map(normalizeContract)
				: [];

			const activeSummaries = Array.isArray(activeResponse.data)
				? activeResponse.data
				: [];

			const activeByContractId = new Map(
				activeSummaries.map((entry) => [
					Number(entry.contractId ?? entry.ContractId),
					{
						progressCount: Number(entry.progressCount ?? entry.ProgressCount ?? 0),
						targetCount: Number(entry.targetCount ?? entry.TargetCount ?? 1),
						isReadyToComplete: Boolean(entry.isReadyToComplete ?? entry.IsReadyToComplete),
					},
				])
			);

			setAllContracts(available);

			const activeMerged = available
				.filter((contract) => activeByContractId.has(contract.contractId))
				.map((contract) => ({
					...contract,
					progressCount: activeByContractId.get(contract.contractId)?.progressCount ?? 0,
					targetCount: activeByContractId.get(contract.contractId)?.targetCount ?? contract.targetCount,
					isReadyToComplete: activeByContractId.get(contract.contractId)?.isReadyToComplete ?? false,
				}));

			setActiveContracts(activeMerged);
		} catch (requestError) {
			console.error('Failed to fetch contracts', requestError);
			setError('Failed to load contracts.');
		} finally {
			setIsLoading(false);
		}
	}, [playerId]);

	useEffect(() => {
		fetchContracts();
	}, [fetchContracts]);

	useEffect(() => {
		const handleContractsUpdated = () => {
			fetchContracts();
		};

		window.addEventListener('contracts-updated', handleContractsUpdated);
		return () => window.removeEventListener('contracts-updated', handleContractsUpdated);
	}, [fetchContracts]);

	const difficultyOptions = useMemo(() => {
		const values = new Map();
		for (const contract of allContracts) {
			const difficulty = (contract.difficulty ?? '').toString().trim();
			if (difficulty) {
				const difficultyId = Number.isFinite(contract.difficultyId)
					? contract.difficultyId
					: Number.MAX_SAFE_INTEGER;

				const existingDifficultyId = values.get(difficulty);
				if (existingDifficultyId === undefined || difficultyId < existingDifficultyId) {
					values.set(difficulty, difficultyId);
				}
			}
		}

		return Array.from(values.entries())
			.sort((left, right) => {
				if (left[1] !== right[1]) {
					return left[1] - right[1];
				}

				return left[0].localeCompare(right[0]);
			})
			.map(([difficulty]) => difficulty);
	}, [allContracts]);

	useEffect(() => {
		if (difficultyOptions.length === 0) {
			if (selectedDifficulty !== '') {
				setSelectedDifficulty('');
			}
			return;
		}

		if (!selectedDifficulty || !difficultyOptions.includes(selectedDifficulty)) {
			setSelectedDifficulty(difficultyOptions[0]);
		}
	}, [difficultyOptions, selectedDifficulty]);

	const activeContractIds = useMemo(
		() => new Set(activeContracts.map((contract) => contract.contractId)),
		[activeContracts]
	);

	const visibleAvailableContracts = useMemo(
		() => allContracts.filter((contract) => {
			if (!selectedDifficulty) {
				return false;
			}

			return contract.difficulty === selectedDifficulty && !activeContractIds.has(contract.contractId);
		}),
		[allContracts, activeContractIds, selectedDifficulty]
	);

	const assignContract = async (contractId) => {
		if (!playerId) {
			return;
		}

		setBusyContractId(contractId);
		setStatusMessage('');

		try {
			await axios.post(`${API_BASE}/PlayerContracts/AssignContract`, {
				playerId,
				contractId,
			}, {
				headers: { 'Content-Type': 'application/json' },
			});

			setStatusMessage('Contract accepted.');
			await fetchContracts();
		} catch (requestError) {
			console.error('Failed to assign contract', requestError);
			const apiMessage = requestError?.response?.data;
			setStatusMessage(formatStatusMessage(apiMessage, 'Failed to accept contract.'));
		} finally {
			setBusyContractId(null);
		}
	};

	const completeContract = async (contractId) => {
		if (!playerId) {
			return;
		}

		setBusyContractId(contractId);
		setStatusMessage('');

		try {
			const response = await axios.post(`${API_BASE}/PlayerContracts/CompleteContract`, {
				playerId,
				contractId,
			}, {
				headers: { 'Content-Type': 'application/json' },
			});

			const coins = Number(response.data?.totalCoinsAwarded ?? response.data?.TotalCoinsAwarded ?? 0);
			const xp = Number(response.data?.totalXpAwarded ?? response.data?.TotalXpAwarded ?? 0);
			const itemRewards = response.data?.itemRewardsAwarded ?? response.data?.ItemRewardsAwarded ?? [];
			const totalItems = Array.isArray(itemRewards)
				? itemRewards.reduce((sum, reward) => sum + Number(reward?.quantity ?? reward?.Quantity ?? 0), 0)
				: 0;
			setStatusMessage(`Contract completed. Rewards: ${coins} coins, ${xp} XP, ${totalItems} item(s).`);
			window.dispatchEvent(new Event('contracts-updated'));
			window.dispatchEvent(new Event('purse-updated'));

			await fetchContracts();
		} catch (requestError) {
			const apiMessage = requestError?.response?.data;
			console.error('Failed to complete contract', requestError);
			setStatusMessage(formatStatusMessage(apiMessage, 'Contract is not ready to complete.'));
		} finally {
			setBusyContractId(null);
		}
	};

	const cancelContract = async (contractId) => {
		if (!playerId) {
			return;
		}

		setBusyContractId(contractId);
		setStatusMessage('');

		try {
			const response = await axios.post(`${API_BASE}/PlayerContracts/CancelContract`, {
				playerId,
				contractId,
			}, {
				headers: { 'Content-Type': 'application/json' },
			});

			const cancelCost = Number(response.data?.cancelCostContractPoints ?? response.data?.CancelCostContractPoints ?? 0);
			const remainingPoints = Number(response.data?.remainingContractPoints ?? response.data?.RemainingContractPoints ?? 0);
			setStatusMessage(`Contract cancelled. Cost: ${cancelCost} contract points. Remaining: ${remainingPoints}.`);
			window.dispatchEvent(new Event('contracts-updated'));

			await fetchContracts();
		} catch (requestError) {
			const apiMessage = requestError?.response?.data;
			console.error('Failed to cancel contract', requestError);
			setStatusMessage(formatStatusMessage(apiMessage, 'Failed to cancel contract.'));
		} finally {
			setBusyContractId(null);
		}
	};

	const openCancelConfirmation = (contract) => {
		const potentialContractPoints = getPotentialContractPoints(contract);
		const cancelCostPoints = Math.ceil(potentialContractPoints / 2);

		setPendingCancel({
			contractId: contract.contractId,
			contractName: formatDisplayName(contract.contractName),
			potentialContractPoints,
			cancelCostPoints,
		});
	};

	const closeCancelConfirmation = () => {
		setPendingCancel(null);
	};

	const confirmCancelContract = async () => {
		if (!pendingCancel) {
			return;
		}

		const contractId = pendingCancel.contractId;
		await cancelContract(contractId);
		closeCancelConfirmation();
	};

	return (
		<section className="contracts-page">
			<header className="contracts-header">
				<h2>Contracts</h2>
				<p>Pick contracts by difficulty, progress them, and claim rewards on completion.</p>
			</header>

			<div className="contracts-difficulty-picker">
				{difficultyOptions.map((difficulty) => (
					<button
						key={difficulty}
						type="button"
						className={`difficulty-button ${selectedDifficulty === difficulty ? 'is-active' : ''}`}
						onClick={() => setSelectedDifficulty(difficulty)}
						disabled={isLoading}
					>
						{difficulty}
					</button>
				))}
				{difficultyOptions.length === 0 ? (
					<p className="contracts-empty">No contract difficulties found.</p>
				) : null}
			</div>

			{error ? <p className="contracts-error">{error}</p> : null}
			{statusMessage ? <p className="contracts-status">{statusMessage}</p> : null}

			{pendingCancel ? (
				<div className="contracts-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-contract-title">
					<div className="contracts-modal-card">
						<h4 id="cancel-contract-title">Cancel Contract?</h4>
						<p>
							Are you sure you want to cancel <strong>{pendingCancel.contractName}</strong>?
						</p>
						<p>
							Potential contract points: <strong>{pendingCancel.potentialContractPoints}</strong>
						</p>
						<p>
							Cancel cost: <strong>{pendingCancel.cancelCostPoints}</strong> contract points
						</p>
						<div className="contracts-modal-actions">
							<button
								type="button"
								className="contract-button"
								onClick={closeCancelConfirmation}
								disabled={busyContractId === pendingCancel.contractId}
							>
								Keep Contract
							</button>
							<button
								type="button"
								className="contract-cancel-button"
								onClick={confirmCancelContract}
								disabled={busyContractId === pendingCancel.contractId}
							>
								Yes, Cancel Contract
							</button>
						</div>
					</div>
				</div>
			) : null}

			<div className="contracts-columns">
				<section>
					<h3>Available ({selectedDifficulty})</h3>
					<div className="contracts-list">
						{visibleAvailableContracts.length === 0 ? (
							<p className="contracts-empty">No available contracts for this difficulty.</p>
						) : visibleAvailableContracts.map((contract) => (
							<Contract
								key={`available-${contract.contractId}`}
								contract={contract}
								actions={(
									<button type="button" className="contract-button" onClick={() => assignContract(contract.contractId)} disabled={busyContractId === contract.contractId}>
										Accept Contract
									</button>
								)}
							/>
						))}
					</div>
				</section>

				<section>
					<h3>Active Contracts</h3>
					<div className="contracts-list">
						{activeContracts.length === 0 ? (
							<p className="contracts-empty">No active contracts yet.</p>
						) : activeContracts.map((contract) => (
							<Contract
								key={`active-${contract.contractId}`}
								contract={contract}
								actions={(
									<>
										<button
											type="button"
											className="contract-button"
											onClick={() => completeContract(contract.contractId)}
											disabled={busyContractId === contract.contractId || !contract.isReadyToComplete}
										>
											{contract.isReadyToComplete ? 'Complete Contract' : 'In Progress'}
										</button>
										<button
											type="button"
											className="contract-cancel-button"
											onClick={() => openCancelConfirmation(contract)}
											disabled={busyContractId === contract.contractId}
										>
											Cancel Contract
										</button>
									</>
								)}
							/>
						))}
					</div>
				</section>
			</div>
		</section>
	);
};

export default Contracts;
