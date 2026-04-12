import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { formatDisplayName } from './DisplayNameUtils';

const getAuthHeaders = () => {
	const accessToken = localStorage.getItem('accessToken');

	if (!accessToken) {
		return {};
	}

	return {
		Authorization: `Bearer ${accessToken}`,
	};
};

const PlayerCollection = ({ playerId, itemName, itemId, collectionId, progressTick = 0 }) => {
	const [progress, setProgress] = useState({
		hasCollection: false,
		collectionName: '',
		totalCollected: 0,
		isLoading: false,
		error: '',
	});
	const lastProcessedTickRef = useRef(progressTick);
	const normalizedItemName = formatDisplayName(typeof itemName === 'string' ? itemName.trim() : '');
	const normalizedItemId = Number.isInteger(itemId) ? itemId : null;
	const normalizedCollectionId = Number.isInteger(collectionId) ? collectionId : null;

	useEffect(() => {
		const loadProgress = async () => {
			if (!playerId || (!normalizedItemName && !normalizedCollectionId)) {
				setProgress({
					hasCollection: false,
					collectionName: '',
					totalCollected: 0,
					isLoading: false,
					error: '',
				});
				return;
			}

			try {
				setProgress((prev) => ({
					...prev,
					isLoading: true,
					error: '',
				}));

				let resolvedCollectionId = normalizedCollectionId;
				let resolvedCollectionName = normalizedItemName;

				if (!resolvedCollectionId && normalizedItemName) {
					const collectionResponse = await axios.get(API_BASE + '/Collection/GetCollection', {
						params: {
							name: normalizedItemName,
						},
						headers: {
							Accept: 'application/json',
							...getAuthHeaders(),
						},
					});

					const collection = collectionResponse.data ?? null;
					resolvedCollectionId = collection?.idCollection ?? collection?.IdCollection ?? null;
					resolvedCollectionName = formatDisplayName(collection?.name ?? collection?.Name ?? normalizedItemName);
				}

				if (!resolvedCollectionId) {
					setProgress({
						hasCollection: false,
						collectionName: '',
						totalCollected: 0,
						isLoading: false,
						error: '',
					});
					return;
				}

				try {
					const playerCollectionResponse = await axios.get(API_BASE + '/PlayerCollections/GetPlayerCollection', {
						params: {
							playerId,
							collectionId: resolvedCollectionId,
						},
						headers: {
							Accept: 'application/json',
							...getAuthHeaders(),
						},
					});

					const playerCollection = playerCollectionResponse.data ?? null;
					const totalCollected = playerCollection?.totalCollected ?? playerCollection?.TotalCollected ?? 0;

					setProgress({
						hasCollection: true,
						collectionName: formatDisplayName(resolvedCollectionName || 'Collection'),
						totalCollected,
						isLoading: false,
						error: '',
					});
				} catch (playerCollectionError) {
					if (playerCollectionError?.response?.status === 404) {
						setProgress({
							hasCollection: true,
							collectionName: formatDisplayName(resolvedCollectionName || 'Collection'),
							totalCollected: 0,
							isLoading: false,
							error: '',
						});
						return;
					}

					throw playerCollectionError;
				}
			} catch (collectionError) {
				if (collectionError?.response?.status === 404) {
					setProgress({
						hasCollection: false,
						collectionName: '',
						totalCollected: 0,
						isLoading: false,
						error: '',
					});
					return;
				}

				console.error('Failed to load collection progress:', collectionError);
				setProgress((prev) => ({
					...prev,
					isLoading: false,
					error: 'Failed to load collection progress.',
				}));
			}
		};

		loadProgress();
	}, [playerId, normalizedItemName, normalizedCollectionId]);

	useEffect(() => {
		const previousTick = lastProcessedTickRef.current;
		if (progressTick <= previousTick) {
			return;
		}

		lastProcessedTickRef.current = progressTick;

		if (!playerId || (!normalizedItemName && !normalizedCollectionId)) {
			return;
		}

		const amountToAdd = progressTick - previousTick;

		const addProgress = async () => {
			try {
				const response = await axios.post(API_BASE + '/PlayerCollections/AddOrUpdateCollectionProgress', {
					playerId,
					itemId: normalizedItemId,
					collectionName: normalizedItemName,
					collectionId: normalizedCollectionId,
					amountToAdd,
				}, {
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				const updatedProgress = response.data ?? null;
				const totalCollected = updatedProgress?.totalCollected ?? updatedProgress?.TotalCollected;
				const collectionName = formatDisplayName(updatedProgress?.collectionName ?? updatedProgress?.CollectionName ?? normalizedItemName);

				if (typeof totalCollected === 'number') {
					setProgress((prev) => ({
						...prev,
						hasCollection: true,
						collectionName,
						totalCollected,
						error: '',
					}));
				}
			} catch (progressError) {
				if (progressError?.response?.status === 404) {
					setProgress({
						hasCollection: false,
						collectionName: '',
						totalCollected: 0,
						isLoading: false,
						error: '',
					});
					return;
				}

				console.error('Failed to update collection progress:', progressError);
				setProgress((prev) => ({
					...prev,
					error: 'Failed to update collection progress.',
				}));
			}
		};

		addProgress();
	}, [progressTick, playerId, normalizedItemName, normalizedItemId, normalizedCollectionId]);

	return (
		<article>
			<h2>{progress.hasCollection ? `${progress.collectionName} Collection` : 'Collection Progress'}</h2>
			<p>{progress.hasCollection ? progress.totalCollected : 'N/A'}</p>
			{progress.isLoading ? <small>Loading collection...</small> : null}
			{progress.error ? <small>{progress.error}</small> : null}
			{!progress.hasCollection ? <small>No collection tied to this item.</small> : null}
		</article>
	);
};

export default PlayerCollection;
