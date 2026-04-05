/// <reference types="vite/client" />
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { formatDisplayName } from './DisplayNameUtils';
import DisplayItemInfo from './DisplayItemInfo';
import { fetchEquipmentSlotDefinitions, getEquipmentSlotLabelForItem, isEquipmentItem } from './EquipmentUtils';
import '../Styles/InventoryStyles.css';

const HOTBAR_SLOTS = 9;
const TOTAL_SLOTS = 36;
const SELLING_SELECTED_ITEM_STORAGE_KEY = 'sellingSelectedInventoryItem';

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

const normalizeSlot = (slot) => ({
	idPlayerInventorySlots: slot.idPlayerInventorySlots ?? slot.IdPlayerInventorySlots,
	slotIndex: slot.slotIndex ?? slot.SlotIndex,
	quantity: slot.quantity ?? slot.Quantity ?? 0,
	fkItemidItem: slot.fkItemidItem ?? slot.FkItemidItem ?? null,
	itemName: formatDisplayName(slot.itemName ?? slot.ItemName ?? ''),
	itemCategory: slot.itemCategory ?? slot.ItemCategory ?? slot.category ?? slot.Category ?? '',
	itemIcon: slot.itemIcon ?? slot.ItemIcon ?? '',
	sellValue: slot.sellValue ?? slot.SellValue ?? 0,
});

const resolveIconPath = (iconPath) => {
	if (!iconPath || typeof iconPath !== 'string') {
		return '';
	}

	const trimmedPath = iconPath.trim();

	if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
		return trimmedPath;
	}

	const lowerPath = trimmedPath
		.replaceAll('\\', '/')
		.replace(/^\/+/, '')
		.toLowerCase();

	const pathWithoutPrefix = lowerPath
		.replace(/^src\/assets\/blocks\//, '')
		.replace(/^assets\/blocks\//, '');

	const hasFileExtension = /\.(png|jpe?g|webp|gif|svg)$/i.test(pathWithoutPrefix);
	const fileName = (hasFileExtension ? pathWithoutPrefix : `${pathWithoutPrefix}.png`).split('/').pop();

	return fileName ? (BLOCK_TEXTURE_BY_FILE[fileName] ?? '') : '';
};

const Inventory = ({
	playerId,
	className = '',
	refreshKey = 0,
	onInventoryChanged = null,
	onEquipmentChanged = null,
}) => {
	const [activeHotbarIndex, setActiveHotbarIndex] = useState(0);
	const [slots, setSlots] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedInfoSlotIndex, setSelectedInfoSlotIndex] = useState(null);
	const [selectedInfoAnchorRect, setSelectedInfoAnchorRect] = useState(null);
	const [statsById, setStatsById] = useState({});
	const [itemStatsByItemId, setItemStatsByItemId] = useState({});
	const [equipmentSlotDefinitions, setEquipmentSlotDefinitions] = useState([]);
	const [isEquipping, setIsEquipping] = useState(false);
	const hasLoadedOnceRef = useRef(false);

	useEffect(() => {
		const loadEquipmentDefinitions = async () => {
			try {
				const definitions = await fetchEquipmentSlotDefinitions();
				setEquipmentSlotDefinitions(definitions);
			} catch (loadError) {
				console.error('Failed to load equipment slot definitions:', loadError);
			}
		};

		loadEquipmentDefinitions();
	}, []);

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

	useEffect(() => {
		const fetchInventory = async () => {
			if (!playerId) {
				setSlots([]);
				setError('Missing player id.');
				setIsLoading(false);
				return;
			}

			try {
				if (!hasLoadedOnceRef.current) {
					setIsLoading(true);
				}
				setError('');

				const response = await axios.get('http://localhost:5091/api/Inventory/GetInventory', {
					params: {
						playerId,
					},
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				const normalizedSlots = Array.isArray(response.data)
					? response.data.map(normalizeSlot)
					: [];

				setSlots(normalizedSlots);
			} catch (fetchError) {
				console.error('Failed to load inventory:', fetchError);
				setError('Failed to load inventory slots.');
			} finally {
				if (!hasLoadedOnceRef.current) {
					hasLoadedOnceRef.current = true;
					setIsLoading(false);
				}
			}
		};

		fetchInventory();
	}, [playerId, refreshKey]);

	const slotsByIndex = useMemo(() => {
		const map = new Map();

		for (const slot of slots) {
			if (typeof slot.slotIndex === 'number') {
				map.set(slot.slotIndex, slot);
			}
		}

		return map;
	}, [slots]);

	const fullSlotList = useMemo(
		() => Array.from({ length: TOTAL_SLOTS }, (_, index) => slotsByIndex.get(index) ?? {
			idPlayerInventorySlots: null,
			slotIndex: index,
			quantity: 0,
			fkItemidItem: null,
		}),
		[slotsByIndex]
	);

	const hotbarSlots = useMemo(() => fullSlotList.slice(0, HOTBAR_SLOTS), [fullSlotList]);
	const mainInventorySlots = useMemo(() => fullSlotList.slice(HOTBAR_SLOTS), [fullSlotList]);

	useEffect(() => {
		if (selectedInfoSlotIndex == null) {
			return;
		}

		const selectedSlot = fullSlotList[selectedInfoSlotIndex];
		if (!selectedSlot?.fkItemidItem) {
			return;
		}

		const itemId = selectedSlot.fkItemidItem;
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
				console.error('Failed to load item stats:', fetchError);
				setItemStatsByItemId((prev) => ({
					...prev,
					[itemId]: [],
				}));
			}
		};

		fetchItemStats();
	}, [selectedInfoSlotIndex, fullSlotList, itemStatsByItemId]);

	const publishSellingSelection = (slot) => {
		const hasItem = slot && slot.idPlayerInventorySlots != null && slot.quantity > 0 && slot.fkItemidItem != null;
		const payload = hasItem
			? {
				idPlayerInventorySlots: slot.idPlayerInventorySlots,
				slotIndex: slot.slotIndex,
				quantity: Number(slot.quantity ?? 0),
				fkItemidItem: slot.fkItemidItem,
				itemName: slot.itemName ?? '',
				itemIcon: slot.itemIcon ?? '',
				sellValue: Number(slot.sellValue ?? 0),
			}
			: null;

		if (payload) {
			localStorage.setItem(SELLING_SELECTED_ITEM_STORAGE_KEY, JSON.stringify(payload));
		} else {
			localStorage.removeItem(SELLING_SELECTED_ITEM_STORAGE_KEY);
		}

		window.dispatchEvent(new CustomEvent('selling-item-selected', { detail: payload }));
	};

	const handleEquipSelectedItem = async () => {
		if (!playerId || selectedInfoSlotIndex == null) {
			return;
		}

		const selectedSlot = fullSlotList[selectedInfoSlotIndex];
		if (!selectedSlot?.idPlayerInventorySlots || !isEquipmentItem(selectedSlot)) {
			return;
		}

		try {
			setIsEquipping(true);

			await axios.post('http://localhost:5091/api/PlayerEquipment/EquipPlayerItem', {
				playerId,
				inventorySlotId: selectedSlot.idPlayerInventorySlots,
			}, {
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});

			setSelectedInfoSlotIndex(null);
			setSelectedInfoAnchorRect(null);
			if (onInventoryChanged) {
				onInventoryChanged();
			}
			if (onEquipmentChanged) {
				onEquipmentChanged();
			}
		} catch (equipError) {
			console.error('Failed to equip item:', equipError);
			setError('Failed to equip item.');
		} finally {
			setIsEquipping(false);
		}
	};

	const selectedInfoSlot = selectedInfoSlotIndex != null ? fullSlotList[selectedInfoSlotIndex] : null;
	const selectedInfoSlotEquipmentLabel = selectedInfoSlot
		? getEquipmentSlotLabelForItem(selectedInfoSlot, equipmentSlotDefinitions)
		: null;
	const canEquipSelectedItem = Boolean(selectedInfoSlot && isEquipmentItem(selectedInfoSlot));
	const selectedItemStats = useMemo(() => {
		if (!selectedInfoSlot?.fkItemidItem) {
			return [];
		}

		const rawStats = itemStatsByItemId[selectedInfoSlot.fkItemidItem] ?? [];

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
	}, [selectedInfoSlot, itemStatsByItemId, statsById]);

	const renderSlot = (slot, index, isHotbar = false) => {
		const isActiveHotbar = isHotbar && index === activeHotbarIndex;
		const isLocked = slot.idPlayerInventorySlots == null;
		const hasItem = !isLocked && slot.quantity > 0;
		const resolvedIconPath = hasItem ? resolveIconPath(slot.itemIcon) : '';
		const itemImage = hasItem
			? (resolvedIconPath || DEFAULT_ITEM_ICON)
			: '';
		const displayName = formatDisplayName(slot.itemName) || `Item ${slot.fkItemidItem}`;

		return (
			<button
				key={`slot-${slot.slotIndex}`}
				type="button"
				className={`inventory-slot ${isActiveHotbar ? 'inventory-slot-active' : ''} ${isLocked ? 'inventory-slot-locked' : ''}`.trim()}
				onClick={(event) => {
					if (isLocked) {
						setSelectedInfoSlotIndex(null);
						setSelectedInfoAnchorRect(null);
						publishSellingSelection(null);
						return;
					}

					if (isHotbar) {
						setActiveHotbarIndex(index);
					}

					if (hasItem) {
						const nextRect = event.currentTarget.getBoundingClientRect();
						setSelectedInfoSlotIndex((prev) => {
							if (prev === slot.slotIndex) {
								setSelectedInfoAnchorRect(null);
								return null;
							}

							setSelectedInfoAnchorRect(nextRect);
							return slot.slotIndex;
						});
					} else {
						setSelectedInfoSlotIndex(null);
						setSelectedInfoAnchorRect(null);
					}

					publishSellingSelection(hasItem ? slot : null);
				}}
				aria-label={`Inventory slot ${slot.slotIndex}`}
				disabled={isLocked}
			>
				{hasItem ? (
					<>
						<img
							src={itemImage}
							alt={displayName}
							className="inventory-slot-item-image"
							draggable={false}
							onError={(event) => {
								const img = event.currentTarget;
								if (img.dataset.fallbackApplied === 'true') {
									return;
								}

								img.dataset.fallbackApplied = 'true';
								img.src = DEFAULT_ITEM_ICON;
							}}
						/>
						<span className="inventory-slot-item-label">{formatDisplayName(slot.itemName) || `#${slot.fkItemidItem}`}</span>
						<span className="inventory-slot-quantity">{slot.quantity}</span>
					</>
				) : null}
			</button>
		);
	};

	return (
		<section className={`inventory-panel ${className}`.trim()} aria-label="Player inventory">
			<DisplayItemInfo
				item={selectedInfoSlot}
				stats={selectedItemStats}
				anchorRect={selectedInfoAnchorRect}
				iconPath={selectedInfoSlot?.quantity > 0 ? (resolveIconPath(selectedInfoSlot.itemIcon) || DEFAULT_ITEM_ICON) : ''}
				isVisible={Boolean(selectedInfoSlot && selectedInfoAnchorRect && selectedInfoSlot.quantity > 0)}
				primaryActionLabel={canEquipSelectedItem ? (selectedInfoSlotEquipmentLabel ? `Equip to ${selectedInfoSlotEquipmentLabel}` : 'Equip') : ''}
				onPrimaryAction={canEquipSelectedItem ? handleEquipSelectedItem : null}
				primaryActionDisabled={isEquipping}
				primaryActionHint={canEquipSelectedItem ? (selectedInfoSlotEquipmentLabel ? `Equip this item to the ${selectedInfoSlotEquipmentLabel} slot.` : 'Equip this item.') : ''}
			/>
			<header className="inventory-header">
				<h3>Inventory</h3>
				{isLoading ? <p>Loading slots...</p> : null}
				{error ? <p>{error}</p> : null}
			</header>

			<div className="inventory-main-grid" role="presentation">
				{mainInventorySlots.map((slot, index) => renderSlot(slot, index, false))}
			</div>

			<div className="inventory-hotbar" role="presentation">
				{hotbarSlots.map((slot, index) => renderSlot(slot, index, true))}
			</div>
		</section>
	);
};

export default memo(Inventory);
