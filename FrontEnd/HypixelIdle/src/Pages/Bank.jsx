import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Purse from '../Components/Purse';
import '../Styles/GlobalStyles.css';
import '../Styles/BankStyles.css';

const getStoredPlayerId = () => {
	const storedPlayerId = localStorage.getItem('playerId');
	if (!storedPlayerId) {
		return null;
	}

	const parsedPlayerId = Number(storedPlayerId);
	return Number.isNaN(parsedPlayerId) ? null : parsedPlayerId;
};

const normalizePurse = (purse) => ({
	balance: purse.balance ?? purse.Balance ?? 0,
	bits: purse.bits ?? purse.Bits ?? 0,
});

const normalizeBank = (bank) => ({
	balance: bank.balance ?? bank.Balance ?? 0,
});

const Bank = () => {
	const [bank, setBank] = useState(null);
	const [purse, setPurse] = useState(null);
	const [amountInput, setAmountInput] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [successMessage, setSuccessMessage] = useState('');

	const playerId = useMemo(getStoredPlayerId, []);

	const fetchBalances = async () => {
		if (!playerId) {
			setError('Missing player id. Please log in again.');
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			setError('');

			const [bankResponse, purseResponse] = await Promise.all([
				axios.get('http://localhost:5091/api/Bank/GetBank', {
					params: { playerId },
					headers: { Accept: 'application/json' },
				}),
				axios.get('http://localhost:5091/api/Purse/GetPurse', {
					params: { playerId },
					headers: { Accept: 'application/json' },
				}),
			]);

			setBank(normalizeBank(bankResponse.data ?? {}));
			setPurse(normalizePurse(purseResponse.data ?? {}));
		} catch (fetchError) {
			console.error('Failed to load bank/purse balances:', fetchError);
			setError('Failed to load bank data.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchBalances();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [playerId]);

	const parsedAmount = Number(amountInput);
	const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;

	const handleDeposit = async () => {
		if (!playerId || !purse || !isValidAmount) {
			setError('Enter a valid deposit amount.');
			return;
		}

		if (parsedAmount > purse.balance) {
			setError('Not enough coins in purse.');
			return;
		}

		try {
			setIsSubmitting(true);
			setError('');
			setSuccessMessage('');

			await axios.put('http://localhost:5091/api/Purse/UpdatePurse', null, {
				params: {
					playerId,
					amountBalance: -parsedAmount,
					amountBits: 0,
				},
				headers: { Accept: 'application/json' },
			});

			await axios.put('http://localhost:5091/api/Bank/UpdateBank', null, {
				params: {
					playerId,
					amountBalance: parsedAmount,
				},
				headers: { Accept: 'application/json' },
			});

			setAmountInput('');
			setSuccessMessage(`Deposited ${parsedAmount.toFixed(2)} coins.`);
			window.dispatchEvent(new CustomEvent('purse-updated'));
			await fetchBalances();
		} catch (submitError) {
			console.error('Failed to deposit coins:', submitError);
			setError('Deposit failed.');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleWithdraw = async () => {
		if (!playerId || !bank || !isValidAmount) {
			setError('Enter a valid withdrawal amount.');
			return;
		}

		if (parsedAmount > bank.balance) {
			setError('Not enough coins in bank.');
			return;
		}

		try {
			setIsSubmitting(true);
			setError('');
			setSuccessMessage('');

			await axios.put('http://localhost:5091/api/Bank/UpdateBank', null, {
				params: {
					playerId,
					amountBalance: -parsedAmount,
				},
				headers: { Accept: 'application/json' },
			});

			await axios.put('http://localhost:5091/api/Purse/UpdatePurse', null, {
				params: {
					playerId,
					amountBalance: parsedAmount,
					amountBits: 0,
				},
				headers: { Accept: 'application/json' },
			});

			setAmountInput('');
			setSuccessMessage(`Withdrew ${parsedAmount.toFixed(2)} coins.`);
			window.dispatchEvent(new CustomEvent('purse-updated'));
			await fetchBalances();
		} catch (submitError) {
			console.error('Failed to withdraw coins:', submitError);
			setError('Withdrawal failed.');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<section className="bank-page">
			<header className="bank-header">
				<h1>Bank</h1>
				<p>Deposit and withdraw coins between your purse and bank account.</p>
			</header>

			<div className="bank-balance-grid">
				<article className="bank-balance-card">
					<h2>Bank Balance</h2>
					<p>{isLoading ? 'Loading...' : `${Number(bank?.balance ?? 0).toFixed(2)} coins`}</p>
				</article>
				<Purse className="bank-purse-card" playerId={playerId} />
			</div>

			<section className="bank-actions" aria-label="Bank actions">
				<label htmlFor="bank-transfer-amount">Transfer Amount</label>
				<input
					id="bank-transfer-amount"
					type="number"
					min="0"
					step="0.01"
					value={amountInput}
					onChange={(event) => setAmountInput(event.target.value)}
					placeholder="0.00"
					disabled={isLoading || isSubmitting}
				/>
				<div className="bank-actions-row">
					<button type="button" onClick={handleDeposit} disabled={isLoading || isSubmitting}>Deposit</button>
					<button type="button" onClick={handleWithdraw} disabled={isLoading || isSubmitting}>Withdraw</button>
				</div>
				{error ? <p className="bank-error">{error}</p> : null}
				{successMessage ? <p className="bank-success">{successMessage}</p> : null}
			</section>
		</section>
	);
};

export default Bank;
