import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { formatDisplayName } from './DisplayNameUtils';
import { BLOCK_TEXTURE_BY_FILE, resolveIconPath } from './MiningUtils';
import '../Styles/CollectionsStyles.css';

const DEFAULT_COLLECTION_ICON = String(BLOCK_TEXTURE_BY_FILE['cobblestone_texture.png'] ?? '');

const getStoredPlayerId = () => {
	const storedPlayerId = localStorage.getItem('playerId');

	if (!storedPlayerId) {
		return null;
	}

	const parsedPlayerId = Number(storedPlayerId);
	return Number.isNaN(parsedPlayerId) ? null : parsedPlayerId;
};

const toNumber = (value, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCollection = (collection) => {
	return {
		collectionId: toNumber(collection.collectionId ?? collection.CollectionId),
		name: formatDisplayName(collection.name ?? collection.Name ?? 'Collection'),
		description: (collection.description ?? collection.Description ?? '').trim(),
		icon: collection.icon ?? collection.Icon ?? '',
		displayIcon: collection.displayIcon ?? collection.DisplayIcon ?? '',
		unlocked: Boolean(collection.unlocked ?? collection.Unlocked),
		totalCollected: toNumber(collection.totalCollected ?? collection.TotalCollected),
		currentTier: toNumber(collection.currentTier ?? collection.CurrentTier),
		currentTierName: formatDisplayName(collection.currentTierName ?? collection.CurrentTierName ?? ''),
		currentTierRequiredItemsValue: toNumber(collection.currentTierRequiredItemsValue ?? collection.CurrentTierRequiredItemsValue),
		nextTierName: formatDisplayName(collection.nextTierName ?? collection.NextTierName ?? ''),
		nextTierRequiredItemsValue: toNumber(collection.nextTierRequiredItemsValue ?? collection.NextTierRequiredItemsValue),
		nextTierRewardSkyblockXp: toNumber(collection.nextTierRewardSkyblockXp ?? collection.NextTierRewardSkyblockXp),
		progressToNextTier: toNumber(collection.progressToNextTier ?? collection.ProgressToNextTier),
		progressRequiredForNextTier: toNumber(collection.progressRequiredForNextTier ?? collection.ProgressRequiredForNextTier),
		progressPercentToNextTier: Number(collection.progressPercentToNextTier ?? collection.ProgressPercentToNextTier ?? 0),
		isMaxTier: Boolean(collection.isMaxTier ?? collection.IsMaxTier),
	};
};

const formatCount = (value) => new Intl.NumberFormat('en-US').format(Number(value) || 0);

const Collection = ({ playerId: playerIdProp = null }) => {
	const [collections, setCollections] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [searchTerm, setSearchTerm] = useState('');

	const resolvedPlayerId = useMemo(() => {
		if (playerIdProp != null) {
			return playerIdProp;
		}

		return getStoredPlayerId();
	}, [playerIdProp]);

	useEffect(() => {
		const loadCollections = async () => {
			try {
				setIsLoading(true);
				setError('');

				const response = await axios.get('http://localhost:5091/api/Collection/GetCollectionOverview', {
					params: resolvedPlayerId ? { playerId: resolvedPlayerId } : undefined,
					headers: {
						Accept: 'application/json',
					},
				});

				const normalizedCollections = Array.isArray(response.data) ? response.data.map(normalizeCollection) : [];
				setCollections(normalizedCollections);
			} catch (loadError) {
				console.error('Failed to load collections:', loadError);
				setError('Failed to load collection data.');
				setCollections([]);
			} finally {
				setIsLoading(false);
			}
		};

		loadCollections();
	}, [resolvedPlayerId]);

	const filteredCollections = useMemo(() => {
		const normalizedSearch = searchTerm.trim().toLowerCase();

		if (!normalizedSearch) {
			return collections;
		}

		return collections.filter((collection) => {
			return [collection.name, collection.description, collection.currentTierName, collection.nextTierName]
				.filter(Boolean)
				.some((value) => value.toLowerCase().includes(normalizedSearch));
		});
	}, [collections, searchTerm]);

	const summary = useMemo(() => {
		const unlockedCollections = collections.filter((collection) => collection.unlocked || collection.totalCollected > 0).length;
		const maxTierUnlocked = collections.reduce((highestTier, collection) => {
			return Math.max(highestTier, collection.currentTier);
		}, 0);
		const totalCollected = collections.reduce((sum, collection) => sum + collection.totalCollected, 0);

		return {
			count: collections.length,
			unlockedCollections,
			maxTierUnlocked,
			totalCollected,
		};
	}, [collections]);

	if (isLoading) {
		return <div className="collections-panel collections-loading">Loading collections...</div>;
	}

	if (error) {
		return <div className="collections-panel collections-error">{error}</div>;
	}

	return (
		<section className="collections-panel">
			<div className="collections-toolbar">
				<label className="collections-search">
					<span>Search collections</span>
					<input
						type="search"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder="Name, or description."
					/>
				</label>

				<div className="collections-summary-grid">
					<div className="collections-summary-card">
						<span>Collections</span>
						<strong>{formatCount(summary.count)}</strong>
					</div>
					<div className="collections-summary-card">
						<span>Unlocked</span>
						<strong>{formatCount(summary.unlockedCollections)}</strong>
					</div>
					<div className="collections-summary-card">
						<span>Max Tier Unlocked</span>
						<strong>{formatCount(summary.maxTierUnlocked)}</strong>
					</div>
					<div className="collections-summary-card">
						<span>Total Collected</span>
						<strong>{formatCount(summary.totalCollected)}</strong>
					</div>
				</div>
			</div>

			{filteredCollections.length === 0 ? (
				<div className="collections-empty-state">No collections match your search.</div>
			) : (
				<div className="collections-grid">
					{filteredCollections.map((collection) => {
						const nextTierLabel = collection.isMaxTier
							? 'Maxed'
							: `Reward: ${formatCount(collection.nextTierRewardSkyblockXp)} Skyblock XP`;
						const iconPath = resolveIconPath(collection.displayIcon || collection.icon, BLOCK_TEXTURE_BY_FILE) || DEFAULT_COLLECTION_ICON;

						return (
							<article key={collection.collectionId} className="collection-card">
								<header className="collection-card-header">
									<div className="collection-icon-wrap">
										<img src={iconPath || DEFAULT_COLLECTION_ICON} alt={collection.name} className="collection-icon" />
									</div>
									<div className="collection-header-copy">
										<div className="collection-title-row">
											<h2>{collection.name}</h2>
											<span className={collection.isMaxTier ? 'collection-max-badge' : 'collection-tier-badge'}>
												{collection.isMaxTier ? 'Max Tier' : (collection.currentTier > 0 ? `Tier ${collection.currentTier}` : 'Tier 0')}
											</span>
										</div>
										<p>{collection.description || 'No description available.'}</p>
									</div>
								</header>

								<div className="collection-progress-block">
									<div className="collection-progress-meta">
										<span>{collection.isMaxTier ? 'Completed' : 'Progress to next tier'}</span>
										<strong>{collection.isMaxTier ? 'Maxed' : `${formatCount(collection.progressToNextTier)} / ${formatCount(collection.progressRequiredForNextTier)} items`}</strong>
									</div>
									<div className="collection-progress-bar" aria-hidden="true">
										<div
											className="collection-progress-fill"
											style={{ width: `${collection.progressPercentToNextTier}%` }}
										/>
									</div>
									<div className="collection-progress-footnote">
										<span>Collected {formatCount(collection.totalCollected)}</span>
										<span>{nextTierLabel}</span>
									</div>
								</div>

							</article>
						);
					})}
				</div>
			)}
		</section>
	);
};

export default Collection;
