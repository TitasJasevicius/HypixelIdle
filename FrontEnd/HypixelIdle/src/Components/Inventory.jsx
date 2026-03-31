/// <reference types="vite/client" />
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { formatDisplayName } from './DisplayNameUtils';
import '../Styles/InventoryStyles.css';

const HOTBAR_SLOTS = 9;
const TOTAL_SLOTS = 36;

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
	itemIcon: slot.itemIcon ?? slot.ItemIcon ?? '',
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

const Inventory = ({ playerId, className = '', refreshKey = 0 }) => {
	const [activeHotbarIndex, setActiveHotbarIndex] = useState(0);
	const [slots, setSlots] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const hasLoadedOnceRef = useRef(false);

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
				onClick={isHotbar && !isLocked ? () => setActiveHotbarIndex(index) : undefined}
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
