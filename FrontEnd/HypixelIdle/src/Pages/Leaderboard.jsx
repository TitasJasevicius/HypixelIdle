import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../Styles/GlobalStyles.css';
import '../Styles/LeaderboardStyles.css';

const LEADERBOARD_MODES = [
	{ key: 'level', label: 'Skyblock Level' },
	{ key: 'collections', label: 'Collections' },
	{ key: 'coins', label: 'Coins' },
];

const toNumber = (value, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeEntry = (entry) => ({
	rank: toNumber(entry.rank ?? entry.Rank),
	playerId: toNumber(entry.playerId ?? entry.PlayerId),
	username: (entry.username ?? entry.Username ?? 'Unknown').toString(),
	skyblockLevel: toNumber(entry.skyblockLevel ?? entry.SkyblockLevel),
	purseBalance: toNumber(entry.purseBalance ?? entry.PurseBalance),
	totalCollected: toNumber(entry.totalCollected ?? entry.TotalCollected),
});

const normalizeItem = (item) => ({
	idItem: toNumber(item.idItem ?? item.IdItem, null),
	name: (item.name ?? item.Name ?? 'Unknown').toString(),
	fkCollectionidCollection: toNumber(item.fkCollectionidCollection ?? item.FkCollectionidCollection, null),
});

const formatDisplayName = (value) => (value ?? '').toString().replace(/_/g, ' ').trim();

const numberFormatter = new Intl.NumberFormat('en-US');

const Leaderboard = () => {
	const [mode, setMode] = useState('level');
	const [collectionItemId, setCollectionItemId] = useState('global');
	const [hideZeroValues, setHideZeroValues] = useState(false);
	const [entries, setEntries] = useState([]);
	const [items, setItems] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [itemsError, setItemsError] = useState('');

	const collectionItems = useMemo(() => {
		return items.filter((item) => item.fkCollectionidCollection != null);
	}, [items]);

	const selectedCollectionItem = useMemo(() => {
		if (collectionItemId === 'global') {
			return null;
		}

		return collectionItems.find((item) => String(item.idItem) === String(collectionItemId)) ?? null;
	}, [collectionItemId, collectionItems]);

	useEffect(() => {
		const loadLeaderboard = async () => {
			try {
				setIsLoading(true);
				setError('');

				const response = await axios.get('http://localhost:5091/api/Player/GetLeaderboard', {
					params: {
						sortBy: mode,
						take: 50,
						itemId: mode === 'collections' && selectedCollectionItem
							? selectedCollectionItem.idItem
							: undefined,
					},
					headers: {
						Accept: 'application/json',
					},
				});

				const normalizedEntries = Array.isArray(response.data)
					? response.data.map(normalizeEntry)
					: [];

				setEntries(normalizedEntries);
			} catch (loadError) {
				console.error('Failed to load leaderboard:', loadError);
				setError('Failed to load leaderboard data.');
				setEntries([]);
			} finally {
				setIsLoading(false);
			}
		};

		loadLeaderboard();
	}, [mode, selectedCollectionItem]);

	useEffect(() => {
		const loadItems = async () => {
			try {
				setItemsError('');
				const response = await axios.get('http://localhost:5091/api/Item/GetItems', {
					headers: {
						Accept: 'application/json',
					},
				});

				const normalizedItems = Array.isArray(response.data)
					? response.data.map(normalizeItem)
					: [];

				setItems(normalizedItems);
			} catch (loadError) {
				console.error('Failed to load collection items:', loadError);
				setItems([]);
				setItemsError('Failed to load collection items.');
			}
		};

		loadItems();
	}, []);

	const modeLabel = useMemo(() => {
		return LEADERBOARD_MODES.find((entry) => entry.key === mode)?.label ?? 'Skyblock Level';
	}, [mode]);

	const formatModeValue = (entry) => {
		switch (mode) {
			case 'collections':
				return `${numberFormatter.format(entry.totalCollected)} Collected`;
			case 'coins':
				return `${numberFormatter.format(Math.floor(entry.purseBalance))} Coins`;
			default:
				return `Level ${numberFormatter.format(entry.skyblockLevel)}`;
		}
	};

	const visibleEntries = useMemo(() => {
		if (!hideZeroValues) {
			return entries;
		}

		return entries.filter((entry) => {
			switch (mode) {
				case 'collections':
					return entry.totalCollected > 0;
				case 'coins':
					return entry.purseBalance > 0;
				default:
					return entry.skyblockLevel > 0;
			}
		});
	}, [entries, hideZeroValues, mode]);

	const activeMetricLabel = mode === 'collections' && selectedCollectionItem
		? `${formatDisplayName(selectedCollectionItem.name)} Collected`
		: modeLabel;

	return (
		<section className="leaderboard-page">
			<header className="leaderboard-header">
				<h1>Leaderboard</h1>
				<p>Compare your progress with other players across different hiscore categories.</p>
			</header>

			<div className="leaderboard-mode-list" role="tablist" aria-label="Leaderboard sort mode">
				{LEADERBOARD_MODES.map((entry) => (
					<button
						key={entry.key}
						type="button"
						className={`leaderboard-mode-button ${mode === entry.key ? 'active' : ''}`}
						onClick={() => setMode(entry.key)}
					>
						{entry.label}
					</button>
				))}
			</div>

			<div className="leaderboard-controls">
				{mode === 'collections' ? (
					<div className="leaderboard-collection-filter">
						<label htmlFor="collectionItemId">Collections view</label>
						<select
							id="collectionItemId"
							value={collectionItemId}
							onChange={(event) => setCollectionItemId(event.target.value)}
						>
							<option value="global">Global Collections</option>
							{collectionItems.map((item) => (
								<option key={item.idItem} value={item.idItem}>
									{formatDisplayName(item.name)}
								</option>
							))}
						</select>
					</div>
				) : null}

				<button
					type="button"
					className={`leaderboard-filter-button ${hideZeroValues ? 'active' : ''}`}
					onClick={() => setHideZeroValues((current) => !current)}
				>
					{hideZeroValues ? 'Show 0 Values' : 'Hide 0 Values'}
				</button>
			</div>

			{mode === 'collections' && itemsError ? (
				<div className="leaderboard-state error">{itemsError}</div>
			) : null}

			{isLoading ? (
				<div className="leaderboard-state">Loading leaderboard...</div>
			) : null}
			{!isLoading && error ? (
				<div className="leaderboard-state error">{error}</div>
			) : null}

			{!isLoading && !error ? (
				<div className="leaderboard-table-wrap">
					<table className="leaderboard-table">
						<thead>
							<tr>
								<th>Rank</th>
								<th>Player</th>
								<th>{activeMetricLabel}</th>
							</tr>
						</thead>
						<tbody>
							{visibleEntries.map((entry) => (
								<tr key={entry.playerId || entry.rank}>
									<td>#{entry.rank}</td>
									<td>{entry.username}</td>
									<td>{formatModeValue(entry)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}
		</section>
	);
};

export default Leaderboard;
