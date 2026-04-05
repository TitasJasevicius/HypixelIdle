import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { getAuthHeaders, toNumberOrNull } from './MiningUtils';

const SELLING_SELECTED_ITEM_STORAGE_KEY = 'sellingSelectedInventoryItem';

const DEFAULT_MINING_HITS_CONFIG = {
	guaranteedHits: 1,
	bonusChance: 0,
	miningSpeed: null,
	source: 'default',
};

const normalizeStatName = (value) => (value ?? '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const parseSelectedInventoryItem = () => {
	try {
		const raw = localStorage.getItem(SELLING_SELECTED_ITEM_STORAGE_KEY);
		if (!raw) {
			return null;
		}

		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : null;
	} catch {
		return null;
	}
};

const buildMiningHitsConfig = (miningSpeed) => {
	const safeSpeed = Math.max(0, Number(miningSpeed) || 0);
	const guaranteedHits = 1 + Math.floor(safeSpeed / 100);
	const remainder = safeSpeed % 100;

	return {
		guaranteedHits,
		bonusChance: remainder / 100,
		miningSpeed: safeSpeed,
		source: 'mining_speed',
	};
};

export const rollHitsForClick = (hitConfig) => {
	if (!hitConfig) {
		return 1;
	}

	const guaranteed = Math.max(0, Math.floor(Number(hitConfig.guaranteedHits) || 0));
	const chance = Math.max(0, Math.min(1, Number(hitConfig.bonusChance) || 0));
	const bonus = chance > 0 && Math.random() < chance ? 1 : 0;
	return guaranteed + bonus;
};

export const useCalculateMiningSpeed = () => {
	const [selectedMiningItem, setSelectedMiningItem] = useState(parseSelectedInventoryItem);
	const [statsById, setStatsById] = useState({});
	const [miningHitsConfig, setMiningHitsConfig] = useState({ ...DEFAULT_MINING_HITS_CONFIG });
	const miningHitConfigCacheRef = useRef(new Map());

	useEffect(() => {
		const fetchStatsCatalog = async () => {
			try {
				const response = await axios.get('http://localhost:5091/api/Stats/GetStats', {
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				const statList = Array.isArray(response.data) ? response.data : [];
				const nextStatsById = {};

				for (const stat of statList) {
					const statId = toNumberOrNull(stat.idStats ?? stat.IdStats);
					if (statId == null) {
						continue;
					}

					nextStatsById[statId] = {
						name: stat.name ?? stat.Name ?? '',
					};
				}

				setStatsById(nextStatsById);
			} catch (error) {
				console.error('Failed to load stats catalog for mining speed:', error);
			}
		};

		fetchStatsCatalog();
	}, []);

	useEffect(() => {
		const syncFromStorage = () => {
			setSelectedMiningItem(parseSelectedInventoryItem());
		};

		const handleItemSelected = (event) => {
			if (event?.detail === undefined) {
				syncFromStorage();
				return;
			}

			setSelectedMiningItem(event.detail ?? null);
		};

		window.addEventListener('selling-item-selected', handleItemSelected);
		window.addEventListener('storage', syncFromStorage);
		syncFromStorage();

		return () => {
			window.removeEventListener('selling-item-selected', handleItemSelected);
			window.removeEventListener('storage', syncFromStorage);
		};
	}, []);

	const selectedMiningItemId = useMemo(
		() => toNumberOrNull(selectedMiningItem?.fkItemidItem ?? selectedMiningItem?.FkItemidItem),
		[selectedMiningItem]
	);

	useEffect(() => {
		if (selectedMiningItemId == null) {
			setMiningHitsConfig({ ...DEFAULT_MINING_HITS_CONFIG });
			return;
		}

		const cached = miningHitConfigCacheRef.current.get(selectedMiningItemId);
		if (cached) {
			setMiningHitsConfig(cached);
			return;
		}

		if (!Object.keys(statsById).length) {
			return;
		}

		let isCancelled = false;

		const fetchItemMiningSpeed = async () => {
			try {
				const response = await axios.get('http://localhost:5091/api/Stats/GetItemStats', {
					params: {
						itemId: selectedMiningItemId,
					},
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				const itemStats = Array.isArray(response.data) ? response.data : [];
				let miningSpeedValue = 0;
				let foundMiningSpeed = false;

				for (const statEntry of itemStats) {
					const statId = toNumberOrNull(statEntry.fkStatsidStats ?? statEntry.FkStatsidStats);
					if (statId == null) {
						continue;
					}

					const statName = normalizeStatName(statsById[statId]?.name);
					if (statName !== 'miningspeed') {
						continue;
					}

					const statValue = Number(statEntry.value ?? statEntry.Value ?? 0);
					if (Number.isFinite(statValue)) {
						miningSpeedValue += statValue;
						foundMiningSpeed = true;
					}
				}

				const nextConfig = foundMiningSpeed
					? buildMiningHitsConfig(miningSpeedValue)
					: { ...DEFAULT_MINING_HITS_CONFIG };

				miningHitConfigCacheRef.current.set(selectedMiningItemId, nextConfig);
				if (!isCancelled) {
					setMiningHitsConfig(nextConfig);
				}
			} catch (error) {
				console.error('Failed to load selected item mining speed:', error);
				const fallbackConfig = { ...DEFAULT_MINING_HITS_CONFIG };
				miningHitConfigCacheRef.current.set(selectedMiningItemId, fallbackConfig);
				if (!isCancelled) {
					setMiningHitsConfig(fallbackConfig);
				}
			}
		};

		fetchItemMiningSpeed();

		return () => {
			isCancelled = true;
		};
	}, [selectedMiningItemId, statsById]);

	return {
		miningHitsConfig,
		selectedMiningItemId,
	};
};
