import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../Styles/PurseStyles.css';

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
	idPurse: purse.idPurse ?? purse.IdPurse ?? null,
	fkPlayeridPlayer: purse.fkPlayeridPlayer ?? purse.FkPlayeridPlayer ?? null,
});

const Purse = ({ className = '', playerId = null, refreshKey = 0 }) => {
	const [purse, setPurse] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [eventRefreshTick, setEventRefreshTick] = useState(0);

	const resolvedPlayerId = useMemo(() => {
		if (playerId != null) {
			return playerId;
		}

		return getStoredPlayerId();
	}, [playerId]);

	useEffect(() => {
		const handlePurseUpdated = () => {
			setEventRefreshTick((prev) => prev + 1);
		};

		window.addEventListener('purse-updated', handlePurseUpdated);

		return () => {
			window.removeEventListener('purse-updated', handlePurseUpdated);
		};
	}, []);

	useEffect(() => {
		const fetchPurse = async () => {
			if (!resolvedPlayerId) {
				setPurse(null);
				setError('Missing player id.');
				setIsLoading(false);
				return;
			}

			try {
				setIsLoading(true);
				setError('');

				const response = await axios.get('http://localhost:5091/api/Purse/GetPurse', {
					params: {
						playerId: resolvedPlayerId,
					},
					headers: {
						Accept: 'application/json',
					},
				});

				setPurse(normalizePurse(response.data ?? {}));
			} catch (fetchError) {
				console.error('Failed to load purse:', fetchError);
				setError('Failed to load purse.');
				setPurse(null);
			} finally {
				setIsLoading(false);
			}
		};

		fetchPurse();
	}, [resolvedPlayerId, refreshKey, eventRefreshTick]);

	const balanceText = purse ? Number(purse.balance).toFixed(2) : '0.00';
	const bitsText = purse ? String(purse.bits) : '0';

	return (
		<section className={`purse-card ${className}`.trim()} aria-label="Purse">
			<div className="purse-row">
				<span className="purse-label">Purse</span>
				<strong className="purse-value">{isLoading ? 'Loading...' : `${balanceText} coins`}</strong>
			</div>
			<div className="purse-row">
				<span className="purse-label">Bits</span>
				<strong className="purse-value">{isLoading ? '...' : bitsText}</strong>
			</div>
			{error ? <p className="purse-error">{error}</p> : null}
		</section>
	);
};

export default Purse;
