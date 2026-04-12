import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { formatDisplayName } from './DisplayNameUtils';
import '../Styles/SellingTabStyles.css';

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

const DEFAULT_ITEM_ICON = String(BLOCK_TEXTURE_BY_FILE['cobblestone_texture.png'] ?? '');

const getAuthHeaders = () => {
	const accessToken = localStorage.getItem('accessToken');
	if (!accessToken) {
		return {};
	}

	return { Authorization: `Bearer ${accessToken}` };
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

const loadStoredSellingItem = () => {
	try {
		const raw = localStorage.getItem(SELLING_SELECTED_ITEM_STORAGE_KEY);
		if (!raw) {
			return null;
		}

		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') {
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
};

const SellingTab = ({ playerId, refreshInventory }) => {
	const [error, setError] = useState('');
	const [selectedItem, setSelectedItem] = useState(loadStoredSellingItem);
	const [sellSlotItem, setSellSlotItem] = useState(null);
	const [isSelling, setIsSelling] = useState(false);
	const [sellValueByItemId, setSellValueByItemId] = useState({});

	useEffect(() => {
		if (!playerId) {
			setError('Missing player ID');
			return;
		}

		setError('');
	}, [playerId]);

	useEffect(() => {
		const fetchItemSellValues = async () => {
			try {
				const response = await axios.get(API_BASE + '/Item/GetItems', {
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				const items = Array.isArray(response.data) ? response.data : [];
				const nextMap = {};

				for (const item of items) {
					const itemId = Number(item?.idItem ?? item?.IdItem);
					const sellValue = Number(item?.sellValue ?? item?.SellValue ?? 0);

					if (Number.isFinite(itemId) && itemId > 0) {
						nextMap[itemId] = Number.isFinite(sellValue) ? sellValue : 0;
					}
				}

				setSellValueByItemId(nextMap);
			} catch (fetchError) {
				console.error('Failed to load sell values:', fetchError);
			}
		};

		fetchItemSellValues();
	}, []);

	const resolveUnitSellValue = (item) => {
		const directValue = Number(item?.sellValue ?? item?.SellValue ?? 0);
		if (Number.isFinite(directValue) && directValue > 0) {
			return directValue;
		}

		const itemId = Number(item?.fkItemidItem ?? item?.FkItemidItem ?? 0);
		const fallbackValue = Number(sellValueByItemId[itemId] ?? 0);
		return Number.isFinite(fallbackValue) ? fallbackValue : 0;
	};

	useEffect(() => {
		const handleSellingItemSelected = (event) => {
			const nextItem = event?.detail ?? null;
			setSelectedItem(nextItem);

			if (nextItem) {
				localStorage.setItem(SELLING_SELECTED_ITEM_STORAGE_KEY, JSON.stringify(nextItem));
			} else {
				localStorage.removeItem(SELLING_SELECTED_ITEM_STORAGE_KEY);
			}
		};

		window.addEventListener('selling-item-selected', handleSellingItemSelected);

		return () => {
			window.removeEventListener('selling-item-selected', handleSellingItemSelected);
		};
	}, []);

	const handlePlaceInSellSlot = () => {
		if (!selectedItem || Number(selectedItem.quantity ?? selectedItem.Quantity ?? 0) <= 0) {
			return;
		}

		setSellSlotItem({
			...selectedItem,
			sellValue: resolveUnitSellValue(selectedItem),
		});
	};

	const handleSell = async () => {
		if (!sellSlotItem || !playerId) {
			return;
		}

		const inventorySlotId = Number(sellSlotItem.idPlayerInventorySlots ?? 0);
		const quantity = Math.max(0, Number(sellSlotItem.quantity ?? sellSlotItem.Quantity ?? 0));
		const unitSellValue = Math.max(0, resolveUnitSellValue(sellSlotItem));
		const itemId = sellSlotItem.fkItemidItem ?? sellSlotItem.FkItemidItem;
		const totalSellValue = quantity * unitSellValue;

		if (quantity <= 0 || itemId == null || inventorySlotId <= 0) {
			setError('Invalid item in sell slot.');
			return;
		}

		if (unitSellValue <= 0) {
			setError('This item cannot be sold.');
			return;
		}

		try {
			setIsSelling(true);
			setError('');

			const sellResponse = await axios.post(API_BASE + '/Inventory/SellInventoryItem', {
				playerId,
				inventorySlotId,
				itemId,
				quantity,
			}, {
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});

			const coinsAwarded = Number(sellResponse?.data?.coinsAwarded ?? sellResponse?.data?.CoinsAwarded ?? totalSellValue);
			if (!Number.isFinite(coinsAwarded) || coinsAwarded <= 0) {
				setError('Failed to sell item.');
				return;
			}

			window.dispatchEvent(new CustomEvent('purse-updated'));
			setSelectedItem(null);
			setSellSlotItem(null);
			localStorage.removeItem(SELLING_SELECTED_ITEM_STORAGE_KEY);
			window.dispatchEvent(new CustomEvent('selling-item-selected', { detail: null }));
			if (refreshInventory) {
				refreshInventory();
			}
		} catch (sellError) {
			console.error('Failed to sell item:', sellError);
			setError('Failed to sell item.');
		} finally {
			setIsSelling(false);
		}
	};

	const sellSlotValueText = useMemo(() => {
		if (!sellSlotItem) {
            return;
			//return 'No item in sell slot.';
		}

		const quantity = Math.max(0, Number(sellSlotItem.quantity ?? sellSlotItem.Quantity ?? 0));
		const unitSellValue = Math.max(0, resolveUnitSellValue(sellSlotItem));
		return `Current item is worth: ${(quantity * unitSellValue).toFixed(2)} coins`;
	}, [sellSlotItem, sellValueByItemId]);

	const selectedItemText = useMemo(() => {
		if (!selectedItem) {
            return;
			//return 'Select an item from inventory first.';
		}

		const quantity = Math.max(0, Number(selectedItem.quantity ?? 0));
		const sellValue = Math.max(0, resolveUnitSellValue(selectedItem));
		return `Selected item in hand: ${formatDisplayName(selectedItem.itemName ?? selectedItem.ItemName ?? '')} x${quantity} (${sellValue.toFixed(2)} each)`;
	}, [selectedItem, sellValueByItemId]);

	return (
		<section className="selling-tab" aria-label="Selling tab">
			<h3 className="selling-title">Sell tab</h3>
			{error ? <p className="selling-error">{error}</p> : null}

			<div className="selling-slot-wrap">
				<button
					type="button"
					className={`selling-target-slot ${sellSlotItem ? 'filled' : ''}`}
					onClick={handlePlaceInSellSlot}
					disabled={!selectedItem}
					title={sellSlotItem ? formatDisplayName(sellSlotItem.itemName ?? sellSlotItem.ItemName ?? '') : 'Place selected item in sell slot'}
				>
					{sellSlotItem ? (
						<>
							<img
								src={resolveIconPath(sellSlotItem.itemIcon ?? sellSlotItem.ItemIcon ?? '') || DEFAULT_ITEM_ICON}
								alt={formatDisplayName(sellSlotItem.itemName ?? sellSlotItem.ItemName ?? '')}
								className="selling-item-icon"
							/>
							<span className="selling-slot-qty">{sellSlotItem.Quantity ?? sellSlotItem.quantity}</span>
						</>
					) : (
						<span className="selling-slot-placeholder">Empty</span>
					)}
				</button>

				<div className="selling-slot-meta">
					<p>
						{sellSlotItem
							? `Current item in the cell: ${formatDisplayName(sellSlotItem.itemName ?? sellSlotItem.ItemName ?? '')} x${sellSlotItem.Quantity ?? sellSlotItem.quantity}`
							: '1. Click an inventory item.  2. Click the empty slot.'}
					</p>			
					<p>{sellSlotValueText}</p>
                    <p>{selectedItemText}</p>
				</div>
			</div>

			<button
				type="button"
				className="selling-confirm-button"
				onClick={handleSell}
				disabled={!sellSlotItem || isSelling}
			>
				{isSelling ? 'Selling...' : 'Sell'}
			</button>
		</section>
	);
};

export default SellingTab;
