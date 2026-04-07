import { memo, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import DisplayItemInfo from './DisplayItemInfo';
import { formatDisplayName } from './DisplayNameUtils';
import {
	fetchEquipmentSlotDefinitions,
	getEquipmentSlotKeyFromBackendName,
} from './EquipmentUtils';
import '../Styles/InventoryStyles.css';

/** @type {Record<string, string>} */
const BLOCK_TEXTURES = import.meta.glob('../Assets/Blocks/*.{png,jpg,jpeg,webp,gif,svg}', {
	eager: true,
	import: 'default',
});

/** @type {Record<string, string>} */
const BLOCK_TEXTURE_BY_FILE = Object.fromEntries(
	Object.entries(BLOCK_TEXTURES).map(([modulePath, assetUrl]) => [
		modulePath.split('/').pop().toLowerCase(),
		assetUrl,
	])
);

const DEFAULT_ITEM_ICON = BLOCK_TEXTURE_BY_FILE['cobblestone_texture.png'] ?? '';

const getAuthHeaders = () => {
	const accessToken = localStorage.getItem('accessToken');
	if (!accessToken) {
		return {};
	}

	return {
		Authorization: `Bearer ${accessToken}`,
	};
};

const resolveIconPath = (iconPath) => {
	if (!iconPath || typeof iconPath !== 'string') {
		return '';
	}

	const trimmedPath = iconPath.trim();
	if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
		return trimmedPath;
	}

	const lowerPath = trimmedPath.replaceAll('\\', '/').replace(/^\/+/, '').toLowerCase();
	const pathWithoutPrefix = lowerPath
		.replace(/^src\/assets\/blocks\//, '')
		.replace(/^assets\/blocks\//, '');

	const hasFileExtension = /\.(png|jpe?g|webp|gif|svg)$/i.test(pathWithoutPrefix);
	const fileName = pathWithoutPrefix.split('/').pop();

	if (!fileName) {
		return '';
	}

	if (hasFileExtension) {
		return BLOCK_TEXTURE_BY_FILE[fileName] ?? '';
	}

	const extensionCandidates = ['png', 'gif', 'webp', 'jpg', 'jpeg', 'svg'];
	for (const extension of extensionCandidates) {
		const candidate = `${fileName}.${extension}`;
		if (BLOCK_TEXTURE_BY_FILE[candidate]) {
			return BLOCK_TEXTURE_BY_FILE[candidate];
		}
	}

	return '';
};

const normalizeEquipmentRow = (row) => ({
	idPlayerEquipment: row.idPlayerEquipment ?? row.IdPlayerEquipment ?? null,
	slot: row.slot ?? row.Slot ?? row.slotNavigation?.idEquipmentTypes ?? row.SlotNavigation?.IdEquipmentTypes ?? null,
	slotName: formatDisplayName(row.slotNavigation?.name ?? row.SlotNavigation?.Name ?? ''),
	fkItemidItem: row.fkItemidItem ?? row.FkItemidItem ?? null,
	itemName: formatDisplayName(row.fkItemidItemNavigation?.name ?? row.FkItemidItemNavigation?.Name ?? ''),
	itemCategory: row.fkItemidItemNavigation?.category ?? row.FkItemidItemNavigation?.Category ?? '',
	itemIcon: row.fkItemidItemNavigation?.icon ?? row.FkItemidItemNavigation?.Icon ?? '',
});

const PlayerEquipment = ({
	playerId,
	refreshKey = 0,
	onInventoryChanged = null,
	onEquipmentChanged = null,
}) => {
	const [equipmentRows, setEquipmentRows] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedSlotKey, setSelectedSlotKey] = useState(null);
	const [selectedAnchorRect, setSelectedAnchorRect] = useState(null);
	const [isUnequipping, setIsUnequipping] = useState(false);
	const [equipmentSlotDefinitions, setEquipmentSlotDefinitions] = useState([]);
	const [statsById, setStatsById] = useState({});
	const [itemStatsByItemId, setItemStatsByItemId] = useState({});

	useEffect(() => {
		const loadEquipmentDefinitions = async () => {
			try {
				const definitions = await fetchEquipmentSlotDefinitions();
				setEquipmentSlotDefinitions(definitions);
			} catch (loadError) {
				console.error('Failed to load equipment slot definitions:', loadError);
				setEquipmentSlotDefinitions([]);
			}
		};

		loadEquipmentDefinitions();
	}, []);

	useEffect(() => {
		const fetchPlayerEquipment = async () => {
			if (!playerId) {
				setEquipmentRows([]);
				setError('Missing player id.');
				setIsLoading(false);
				return;
			}

			try {
				setIsLoading(true);
				setError('');

				const response = await axios.get('http://localhost:5091/api/PlayerEquipment/GetPlayerEquipment', {
					params: { playerId },
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				setEquipmentRows(Array.isArray(response.data) ? response.data.map(normalizeEquipmentRow) : []);
			} catch (fetchError) {
				console.error('Failed to load player equipment:', fetchError);
				setError('Failed to load player equipment.');
			} finally {
				setIsLoading(false);
			}
		};

		fetchPlayerEquipment();
	}, [playerId, refreshKey]);

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
				const mapped = {};
				for (const stat of statList) {
					const id = stat.idStats ?? stat.IdStats;
					if (id != null) {
						mapped[id] = {
							id,
							name: formatDisplayName(stat.name ?? stat.Name ?? `Stat ${id}`),
						};
					}
				}

				setStatsById(mapped);
			} catch (fetchError) {
				console.error('Failed to load stats catalog:', fetchError);
			}
		};

		fetchStatsCatalog();
	}, []);

	const equipmentRowsByKey = useMemo(() => {
		const map = new Map();
		for (const row of equipmentRows) {
			const slotKey = getEquipmentSlotKeyFromBackendName(row.slotName) ?? getEquipmentSlotKeyFromBackendName(row.slot);
			if (slotKey) {
				map.set(slotKey, row);
			}
		}
		return map;
	}, [equipmentRows]);

	const selectedRow = selectedSlotKey ? equipmentRowsByKey.get(selectedSlotKey) ?? null : null;
	const selectedItemLabel = selectedRow?.itemName ?? '';
	const selectedItemIcon = selectedRow?.itemIcon ? (resolveIconPath(selectedRow.itemIcon) || DEFAULT_ITEM_ICON) : '';
	const hasEquippedItem = Boolean(selectedRow?.fkItemidItem);

	useEffect(() => {
		if (!selectedRow?.fkItemidItem) {
			return;
		}

		const itemId = selectedRow.fkItemidItem;
		if (itemStatsByItemId[itemId]) {
			return;
		}

		const fetchItemStats = async () => {
			try {
				const response = await axios.get('http://localhost:5091/api/Stats/GetItemStats', {
					params: { itemId },
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				const mapped = Array.isArray(response.data)
					? response.data.map((entry) => ({
						statId: entry.fkStatsidStats ?? entry.FkStatsidStats,
						value: entry.value ?? entry.Value ?? null,
						percentageValue: entry.percentageValue ?? entry.PercentageValue ?? null,
					}))
					: [];

				setItemStatsByItemId((prev) => ({
					...prev,
					[itemId]: mapped,
				}));
			} catch (fetchError) {
				console.error('Failed to load equipped item stats:', fetchError);
				setItemStatsByItemId((prev) => ({
					...prev,
					[itemId]: [],
				}));
			}
		};

		fetchItemStats();
	}, [selectedRow, itemStatsByItemId]);

	const selectedItemStats = useMemo(() => {
		if (!selectedRow?.fkItemidItem) {
			return [];
		}

		const rawStats = itemStatsByItemId[selectedRow.fkItemidItem] ?? [];

		return rawStats
			.map((entry) => {
				const statName = statsById[entry.statId]?.name ?? `Stat ${entry.statId}`;
				const hasAbsolute = entry.value != null;
				const hasPercent = entry.percentageValue != null;

				if (!hasAbsolute && !hasPercent) {
					return null;
				}

				const displayValue = hasPercent
					? `${entry.percentageValue > 0 ? '+' : ''}${entry.percentageValue}%`
					: `${entry.value > 0 ? '+' : ''}${entry.value}`;

				return {
					name: statName,
					displayValue,
					value: entry.value,
					percentageValue: entry.percentageValue,
				};
			})
			.filter(Boolean);
	}, [selectedRow, itemStatsByItemId, statsById]);

	const handleUnequip = async () => {
		if (!playerId || !selectedRow?.slot) {
			return;
		}

		try {
			setIsUnequipping(true);
			await axios.post('http://localhost:5091/api/PlayerEquipment/UnequipPlayerItem', {
				playerId,
				equipmentSlotId: selectedRow.slot,
			}, {
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});

			setSelectedSlotKey(null);
			setSelectedAnchorRect(null);
			if (onInventoryChanged) {
				onInventoryChanged();
			}
			if (onEquipmentChanged) {
				onEquipmentChanged();
			}
		} catch (unequipError) {
			console.error('Failed to unequip item:', unequipError);
			setError('Failed to unequip item.');
		} finally {
			setIsUnequipping(false);
		}
	};

	const renderSlot = (slotDefinition) => {
		const equippedRow = equipmentRowsByKey.get(slotDefinition.key) ?? null;
		const isFilled = Boolean(equippedRow?.fkItemidItem);
		const isSelected = selectedSlotKey === slotDefinition.key;
		const slotIcon = isFilled ? (resolveIconPath(equippedRow.itemIcon) || DEFAULT_ITEM_ICON) : '';
		const slotLabel = isFilled ? equippedRow.itemName : `Empty ${slotDefinition.label}`;

		return (
			<button
				type="button"
				key={slotDefinition.key}
				className={`equipment-slot ${isSelected ? 'equipment-slot-active' : ''} ${isFilled ? 'filled' : ''}`.trim()}
				onClick={(event) => {
					if (isFilled) {
						const nextRect = event.currentTarget.getBoundingClientRect();
						setSelectedSlotKey((prev) => (prev === slotDefinition.key ? null : slotDefinition.key));
						setSelectedAnchorRect(nextRect);
						return;
					}

					setSelectedSlotKey(null);
					setSelectedAnchorRect(null);
				}}
				title={slotLabel}
			>
				{isFilled ? (
					<>
						<img src={slotIcon} alt={slotLabel} className="equipment-slot-image" draggable={false} />
						<span className="equipment-slot-name">{slotDefinition.label}</span>
					</>
				) : (
					<span className="equipment-slot-empty">{slotDefinition.label}</span>
				)}
			</button>
		);
	};

	return (
		<section className="player-equipment-panel" aria-label="Player equipment">
			<header className="inventory-header">
				<h3>Equipment</h3>
				{isLoading ? <p>Loading equipment...</p> : null}
				{error ? <p>{error}</p> : null}
			</header>

			<div className="player-equipment-grid" role="presentation">
				{equipmentSlotDefinitions.map((slotDefinition) => renderSlot(slotDefinition))}
			</div>

			<DisplayItemInfo
				item={selectedRow}
				stats={selectedItemStats}
				anchorRect={selectedAnchorRect}
				iconPath={selectedItemIcon}
				isVisible={Boolean(selectedRow && selectedAnchorRect)}
				primaryActionLabel={hasEquippedItem ? 'Unequip' : ''}
				onPrimaryAction={hasEquippedItem ? handleUnequip : null}
				primaryActionDisabled={isUnequipping}
				primaryActionHint={hasEquippedItem ? `Return ${selectedItemLabel} to inventory.` : ''}
			/>
		</section>
	);
};

export default memo(PlayerEquipment);
