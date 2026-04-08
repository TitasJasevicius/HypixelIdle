/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { formatDisplayName } from './DisplayNameUtils';
import DisplayItemInfo from './DisplayItemInfo';
import '../Styles/CraftingTableStyles.css';
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

const DEFAULT_ITEM_ICON = BLOCK_TEXTURE_BY_FILE['stone_texture.png'] ?? '';
const TOTAL_INVENTORY_SLOTS = 36;

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

	const lowerPath = trimmedPath
		.replaceAll('\\', '/')
		.replace(/^\/+/, '')
		.toLowerCase();

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

const withFallbackIcon = (iconPath) => {
	const resolved = resolveIconPath(iconPath);
	return resolved || DEFAULT_ITEM_ICON;
};

const normalizeSlot = (slot) => ({
	idPlayerInventorySlots: slot.idPlayerInventorySlots ?? slot.IdPlayerInventorySlots,
	slotIndex: slot.slotIndex ?? slot.SlotIndex,
	quantity: slot.quantity ?? slot.Quantity ?? 0,
	fkItemidItem: slot.fkItemidItem ?? slot.FkItemidItem ?? null,
	itemName: formatDisplayName(slot.itemName ?? slot.ItemName ?? ''),
	itemIcon: slot.itemIcon ?? slot.ItemIcon ?? '',
});

const getStoredPlayerId = () => {
	const storedPlayerId = localStorage.getItem('playerId');
	const parsedPlayerId = Number(storedPlayerId);
	return Number.isNaN(parsedPlayerId) ? null : parsedPlayerId;
};

const CraftingTable = ({ playerId = null, inventoryRefreshTick = 0 } = {}) => {
	const [recipes, setRecipes] = useState([]);
	const [recipeItems, setRecipeItems] = useState({});
	const [inventorySlots, setInventorySlots] = useState([]);

	const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
	const [isLoadingInventory, setIsLoadingInventory] = useState(true);
	const [isCrafting, setIsCrafting] = useState(false);

	const [recipesError, setRecipesError] = useState('');
	const [inventoryError, setInventoryError] = useState('');
	const [craftError, setCraftError] = useState('');

	const [craftingGrid, setCraftingGrid] = useState(Array(9).fill(null));
	const [craftingGridQuantities, setCraftingGridQuantities] = useState(Array(9).fill(0));
	const [craftingGridSourceSlots, setCraftingGridSourceSlots] = useState(Array(9).fill(null));
	const [pendingPlacement, setPendingPlacement] = useState(null);
	const [placementQuantityInput, setPlacementQuantityInput] = useState('');
	const [matchedRecipe, setMatchedRecipe] = useState(null);
	const [selectedInfoItem, setSelectedInfoItem] = useState(null);
	const [selectedInfoAnchorRect, setSelectedInfoAnchorRect] = useState(null);
	const [selectedInventorySlotIndex, setSelectedInventorySlotIndex] = useState(null);
	const [isRecipeBookOpen, setIsRecipeBookOpen] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [inventoryRefreshToken, setInventoryRefreshToken] = useState(0);
	const [statsById, setStatsById] = useState({});
	const [itemStatsByItemId, setItemStatsByItemId] = useState({});

	const resolvedPlayerId = useMemo(() => {
		if (playerId != null) {
			return playerId;
		}
		return getStoredPlayerId();
	}, [playerId]);

	useEffect(() => {
		const fetchRecipes = async () => {
			try {
				setIsLoadingRecipes(true);
				setRecipesError('');

				
				const allItemsResponse = await axios.get('http://localhost:5091/api/Item/GetItems', {
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				const allItems = Array.isArray(allItemsResponse.data) ? allItemsResponse.data : [];
				const itemsMap = {};

				
				for (const item of allItems) {
					const itemId = item.idItem ?? item.IdItem;
					if (itemId) {
						itemsMap[itemId] = item;
					}
				}

				// Fetch recipes
				const response = await axios.get('http://localhost:5091/api/Recipes/GetRecipes', {
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				const recipeList = response.data ?? [];
				const enabledRecipes = recipeList.filter((recipe) => recipe.isEnabled ?? recipe.IsEnabled ?? false);
				setRecipes(enabledRecipes);
				setRecipeItems(itemsMap);
			} catch (error) {
				console.error('Failed to load recipes:', error);
				setRecipesError('Failed to load recipes from server.');
			} finally {
				setIsLoadingRecipes(false);
			}
		};

		fetchRecipes();
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
					const statId = stat.idStats ?? stat.IdStats;
					if (statId != null) {
						mapped[statId] = {
							id: statId,
							name: formatDisplayName(stat.name ?? stat.Name ?? `Stat ${statId}`),
						};
					}
				}

				setStatsById(mapped);
			} catch (error) {
				console.error('Failed to load stats catalog:', error);
			}
		};

		fetchStatsCatalog();
	}, []);

	useEffect(() => {
		if (!selectedInfoItem?.fkItemidItem) {
			return;
		}

		const itemId = selectedInfoItem.fkItemidItem;
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
			} catch (error) {
				console.error('Failed to load item stats:', error);
				setItemStatsByItemId((prev) => ({
					...prev,
					[itemId]: [],
				}));
			}
		};

		fetchItemStats();
	}, [selectedInfoItem, itemStatsByItemId]);

	useEffect(() => {
		const fetchInventory = async () => {
			if (!resolvedPlayerId) {
				setInventorySlots([]);
				setInventoryError('Missing player id.');
				setIsLoadingInventory(false);
				return;
			}

			try {
				setIsLoadingInventory(true);
				setInventoryError('');

				const response = await axios.get('http://localhost:5091/api/Inventory/GetInventory', {
					params: {
						playerId: resolvedPlayerId,
					},
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				const normalizedSlots = Array.isArray(response.data)
					? response.data.map(normalizeSlot)
					: [];

				setInventorySlots(normalizedSlots);
			} catch (error) {
				console.error('Failed to load inventory:', error);
				setInventoryError('Failed to load inventory slots.');
			} finally {
				setIsLoadingInventory(false);
			}
		};

		fetchInventory();
	}, [resolvedPlayerId, inventoryRefreshTick, inventoryRefreshToken]);

	const parseRecipeGrid = (gridJsonString) => {
		if (!gridJsonString) {
			return Array(9).fill(null);
		}

		try {
			const parsed = typeof gridJsonString === 'string' ? JSON.parse(gridJsonString) : gridJsonString;
			if (!Array.isArray(parsed.grid)) {
				return Array(9).fill(null);
			}

			return parsed.grid.map((item) => {
				if (item === null || item === undefined) {
					return null;
				}

				if (typeof item === 'string') {
					const [rawItemId, rawQuantity] = item.split(',').map((part) => part.trim());
					const itemId = parseInt(rawItemId, 10);
					if (Number.isNaN(itemId)) {
						return null;
					}

					const parsedQuantity = rawQuantity === undefined ? 1 : parseInt(rawQuantity, 10);
					const quantity = Number.isNaN(parsedQuantity) ? 1 : Math.max(1, parsedQuantity);
					return { itemId, quantity };
				}

				if (typeof item === 'number') {
					return Number.isNaN(item) ? null : { itemId: item, quantity: 1 };
				}

				if (typeof item === 'object') {
					const itemId = parseInt(item.itemId ?? item.id ?? item.ItemId ?? item.Id, 10);
					if (Number.isNaN(itemId)) {
						return null;
					}

					const parsedQuantity = parseInt(item.quantity ?? item.Quantity ?? 1, 10);
					const quantity = Number.isNaN(parsedQuantity) ? 1 : Math.max(1, parsedQuantity);
					return { itemId, quantity };
				}

				return null;
			});
		} catch (error) {
			console.error('Failed to parse recipe grid:', error);
			return Array(9).fill(null);
		}
	};

	const doesGridMatchRecipe = (currentGrid, currentQuantities, recipeGrid) => {
		return recipeGrid.every((recipeSlot, idx) => {
			const currentItemId = currentGrid[idx];
			const currentQuantity = Math.max(0, Number(currentQuantities[idx] ?? 0));

			if (!recipeSlot) {
				return currentItemId == null || currentQuantity <= 0;
			}

			return currentItemId === recipeSlot.itemId && currentQuantity >= recipeSlot.quantity;
		});
	};

	const foundRecipe = useMemo(() => {
		for (const recipe of recipes) {
			const recipeGrid = parseRecipeGrid(recipe.gridJson ?? recipe.GridJson);
			if (doesGridMatchRecipe(craftingGrid, craftingGridQuantities, recipeGrid)) {
				return recipe;
			}
		}
		return null;
	}, [craftingGrid, craftingGridQuantities, recipes]);

	useEffect(() => {
		setMatchedRecipe(foundRecipe);
	}, [foundRecipe]);

	const filteredRecipes = useMemo(() => {
		if (!searchQuery.trim()) {
			return recipes;
		}

		const query = searchQuery.toLowerCase().trim();

		return recipes.filter((recipe) => {
			const recipeItemId = recipe.fkItemidItem ?? recipe.FkItemidItem;
			const recipeItem = recipeItems[recipeItemId];
			const itemName = formatDisplayName(recipeItem?.name ?? recipeItem?.Name ?? `Item #${recipeItemId}`);
			return itemName.toLowerCase().includes(query);
		});
	}, [recipes, recipeItems, searchQuery]);

	const handleGridItemClick = (index) => {
		if (craftingGrid[index] != null) {
			const nextGrid = [...craftingGrid];
			const nextSources = [...craftingGridSourceSlots];
			const nextQuantities = [...craftingGridQuantities];

			nextGrid[index] = null;
			nextSources[index] = null;
			nextQuantities[index] = 0;

			setCraftingGrid(nextGrid);
			setCraftingGridSourceSlots(nextSources);
			setCraftingGridQuantities(nextQuantities);
			return;
		}

		if (selectedInventorySlotIndex == null) {
			return;
		}

		const selectedSlot = inventorySlotsByIndex[selectedInventorySlotIndex];
		if (!selectedSlot || !selectedSlot.fkItemidItem || Number(selectedSlot.quantity ?? 0) <= 0) {
			return;
		}

		const usedFromSelectedSlot = craftingGridSourceSlots.reduce((sum, slotIndex, slotIdx) => {
			if (slotIndex !== selectedInventorySlotIndex) {
				return sum;
			}
			return sum + Math.max(0, Number(craftingGridQuantities[slotIdx] ?? 0));
		}, 0);

		const availableFromSelectedSlot = Math.max(0, Number(selectedSlot.quantity ?? 0) - usedFromSelectedSlot);
		if (availableFromSelectedSlot <= 0) {
			return;
		}

		setPendingPlacement({
			gridIndex: index,
			sourceSlotIndex: selectedInventorySlotIndex,
			itemId: selectedSlot.fkItemidItem,
			itemName: selectedSlot.itemName,
			maxQuantity: availableFromSelectedSlot,
		});
		setPlacementQuantityInput(String(availableFromSelectedSlot));
	};

	const handleConfirmPlacementQuantity = () => {
		if (!pendingPlacement) {
			return;
		}

		const parsedQuantity = Number(placementQuantityInput);
		const safeQuantity = Number.isFinite(parsedQuantity)
			? Math.max(1, Math.min(pendingPlacement.maxQuantity, Math.floor(parsedQuantity)))
			: pendingPlacement.maxQuantity;

		const nextGrid = [...craftingGrid];
		const nextSources = [...craftingGridSourceSlots];
		const nextQuantities = [...craftingGridQuantities];

		nextGrid[pendingPlacement.gridIndex] = pendingPlacement.itemId;
		nextSources[pendingPlacement.gridIndex] = pendingPlacement.sourceSlotIndex;
		nextQuantities[pendingPlacement.gridIndex] = safeQuantity;

		setCraftingGrid(nextGrid);
		setCraftingGridSourceSlots(nextSources);
		setCraftingGridQuantities(nextQuantities);
		setPendingPlacement(null);
		setPlacementQuantityInput('');
	};

	const handleCancelPlacementQuantity = () => {
		setPendingPlacement(null);
		setPlacementQuantityInput('');
	};

	const inventorySlotsByIndex = useMemo(() => {
		const byIndex = new Map();
		for (const slot of inventorySlots) {
			if (typeof slot.slotIndex === 'number') {
				byIndex.set(slot.slotIndex, slot);
			}
		}

		return Array.from({ length: TOTAL_INVENTORY_SLOTS }, (_, index) => byIndex.get(index) ?? {
			slotIndex: index,
			quantity: 0,
			fkItemidItem: null,
			itemName: '',
			itemIcon: '',
		});
	}, [inventorySlots]);

	const craftingMainInventorySlots = useMemo(
		() => inventorySlotsByIndex.slice(9),
		[inventorySlotsByIndex]
	);

	const craftingHotbarSlots = useMemo(
		() => inventorySlotsByIndex.slice(0, 9),
		[inventorySlotsByIndex]
	);

	const usedQuantitiesBySlot = useMemo(() => {
		const counts = {};
		for (let index = 0; index < craftingGridSourceSlots.length; index += 1) {
			const slotIndex = craftingGridSourceSlots[index];
			const quantity = Math.max(0, Number(craftingGridQuantities[index] ?? 0));
			if (slotIndex == null) {
				continue;
			}
			counts[slotIndex] = (counts[slotIndex] ?? 0) + quantity;
		}
		return counts;
	}, [craftingGridQuantities, craftingGridSourceSlots]);

	const handleInventoryItemClick = (slot) => {
		if (!slot?.fkItemidItem || !slot?.quantity) {
			setSelectedInventorySlotIndex(null);
			return;
		}

		setSelectedInventorySlotIndex((prev) => (prev === slot.slotIndex ? null : slot.slotIndex));
	};

	const handleResultItemInfoClick = (event, item, quantity = 1) => {
		if (!item) {
			return;
		}

		const itemId = item.idItem ?? item.IdItem;
		if (!itemId) {
			return;
		}

		const nextAnchorRect = event.currentTarget.getBoundingClientRect();
		setSelectedInfoItem((prev) => {
			if (prev?.fkItemidItem === itemId) {
				setSelectedInfoAnchorRect(null);
				return null;
			}

			setSelectedInfoAnchorRect(nextAnchorRect);
			return {
				fkItemidItem: itemId,
				itemName: formatDisplayName(item.name ?? item.Name ?? `Item ${itemId}`),
				itemIcon: item.icon ?? item.Icon ?? '',
				quantity,
			};
		});
	};

	useEffect(() => {
		if (!selectedInfoItem) {
			return undefined;
		}

		const handleGlobalPointerDown = (event) => {
			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}

			if (target.closest('.item-info-popover')) {
				return;
			}

			if (target.closest('.matched-result') || target.closest('.recipe-result-preview-button')) {
				return;
			}

			setSelectedInfoItem(null);
			setSelectedInfoAnchorRect(null);
		};

		window.addEventListener('pointerdown', handleGlobalPointerDown);
		return () => {
			window.removeEventListener('pointerdown', handleGlobalPointerDown);
		};
	}, [selectedInfoItem]);

	const handleCraft = async () => {
		if (!matchedRecipe || !resolvedPlayerId) {
			setCraftError(matchedRecipe ? '' : 'No matching recipe found.');
			return;
		}

		try {
			setIsCrafting(true);
			setCraftError('');

			const recipeGrid = parseRecipeGrid(matchedRecipe.gridJson ?? matchedRecipe.GridJson);
			const ingredientMap = {};

			recipeGrid.forEach((slot) => {
				if (slot?.itemId != null) {
					ingredientMap[slot.itemId] = (ingredientMap[slot.itemId] ?? 0) + slot.quantity;
				}
			});

			const availableByItemId = {};
			for (const slot of inventorySlots) {
				const itemId = slot.fkItemidItem;
				if (!itemId) {
					continue;
				}

				availableByItemId[itemId] = (availableByItemId[itemId] ?? 0) + Math.max(0, Number(slot.quantity ?? 0));
			}

			for (const [itemId, requiredQuantity] of Object.entries(ingredientMap)) {
				const availableQuantity = availableByItemId[itemId] ?? 0;
				if (availableQuantity < requiredQuantity) {
					setCraftError('Not enough ingredients in inventory.');
					return;
				}
			}

			for (const [itemId, quantity] of Object.entries(ingredientMap)) {
				await axios.post(
					'http://localhost:5091/api/Inventory/RemoveItemFromInventory',
					{
						playerId: resolvedPlayerId,
						itemId: parseInt(itemId, 10),
						quantity,
					},
					{
						headers: {
							Accept: 'application/json',
							...getAuthHeaders(),
						},
					}
				);
			}

			const resultItemId = matchedRecipe.fkItemidItem ?? matchedRecipe.FkItemidItem;
			const resultQuantity = matchedRecipe.resultQuantity ?? matchedRecipe.ResultQuantity ?? 1;

			await axios.post(
				'http://localhost:5091/api/Inventory/AddItemToInventory',
				{
					playerId: resolvedPlayerId,
					itemId: resultItemId,
					quantity: resultQuantity,
				},
				{
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				}
			);

			setCraftingGrid(Array(9).fill(null));
			setCraftingGridQuantities(Array(9).fill(0));
			setCraftingGridSourceSlots(Array(9).fill(null));
			setMatchedRecipe(null);
			setSelectedInventorySlotIndex(null);
			setInventoryRefreshToken((prev) => prev + 1);
		} catch (error) {
			console.error('Failed to craft:', error);
			setCraftError('Failed to craft item. Check inventory space and ingredients.');
		} finally {
			setIsCrafting(false);
		}
	};

	const resultItem = matchedRecipe ? recipeItems[matchedRecipe.fkItemidItem ?? matchedRecipe.FkItemidItem] : null;
	const resultIcon = withFallbackIcon(resultItem?.icon ?? resultItem?.Icon);
	const resultQuantity = matchedRecipe ? (matchedRecipe.resultQuantity ?? matchedRecipe.ResultQuantity ?? 1) : 0;
	const selectedInfoStats = useMemo(() => {
		if (!selectedInfoItem?.fkItemidItem) {
			return [];
		}

		const rawStats = itemStatsByItemId[selectedInfoItem.fkItemidItem] ?? [];

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
	}, [selectedInfoItem, itemStatsByItemId, statsById]);
	const selectedInfoItemIcon = withFallbackIcon(selectedInfoItem?.itemIcon);

	return (
		<section className="crafting-table">
			<DisplayItemInfo
				item={selectedInfoItem}
				stats={selectedInfoStats}
				anchorRect={selectedInfoAnchorRect}
				iconPath={selectedInfoItem ? selectedInfoItemIcon : ''}
				isVisible={Boolean(selectedInfoItem && selectedInfoAnchorRect)}
			/>
			<header className="crafting-header">
				<h2>Crafting Table</h2>
				{isLoadingRecipes ? <p>Loading recipes...</p> : null}
				{recipesError ? <p className="error">{recipesError}</p> : null}
			</header>

			<div className="crafting-shell">
				<div className="crafting-top">
					<button
						type="button"
						className={`recipe-book-btn ${isRecipeBookOpen ? 'open' : ''}`}
						onClick={() => setIsRecipeBookOpen((prev) => !prev)}
						title="Toggle recipe book"
					>
						<span className="book-icon">R</span>
					</button>

					<div className="crafting-grid-wrap">
						<div className="grid-3x3">
							{craftingGrid.map((itemId, index) => {
								const slotQuantity = Math.max(0, Number(craftingGridQuantities[index] ?? 0));
								const item = itemId ? recipeItems[itemId] : null;
								const slotIcon = withFallbackIcon(item?.icon ?? item?.Icon);
								const slotItemName = formatDisplayName(item?.name ?? item?.Name ?? `Item #${itemId}`);

								return (
									<button
										type="button"
										key={index}
										className="grid-slot"
										onClick={() => handleGridItemClick(index)}
										title={itemId ? slotItemName : 'Click to place selected inventory item'}
									>
										{itemId ? (
											<div className="slot-item">
												<img src={slotIcon} alt={slotItemName} />
												{slotQuantity > 1 ? <span className="result-qty">{slotQuantity}</span> : null}
											</div>
										) : null}
									</button>
								);
							})}
						</div>

						<div className="craft-arrow">{'>'}</div>

						<div className="result-slot">
							{matchedRecipe ? (
								<button
									type="button"
									className="matched-result"
									onClick={handleCraft}
									disabled={isCrafting}
									title="Click to craft"
								>
									<img src={resultIcon} alt={formatDisplayName(resultItem?.name ?? resultItem?.Name ?? 'Result')} />
									{resultQuantity > 1 ? <span className="result-qty">{resultQuantity}</span> : null}
								</button>
							) : (
								<div className="no-match">?</div>
							)}
						</div>
					</div>

					<div className="craft-controls">
						{!matchedRecipe ? (
							<p className="crafting-tip">Select an inventory item, then click an empty crafting slot.</p>
						) : null}
						{craftError ? <p className="error">{craftError}</p> : null}
					</div>
				</div>

				<section className="inventory-panel crafting-table-inventory" aria-label="Crafting inventory selection">
					<header className="inventory-header">
						<h3>Inventory</h3>
					{isLoadingInventory ? <p>Loading inventory...</p> : null}
					{inventoryError ? <p className="error">{inventoryError}</p> : null}
					</header>

					<div className="inventory-main-grid" role="presentation">
						{craftingMainInventorySlots.map((slot) => {
							const hasItem = Boolean(slot.fkItemidItem) && Number(slot.quantity ?? 0) > 0;
							const iconPath = hasItem ? withFallbackIcon(slot.itemIcon) : '';
							const itemId = slot.fkItemidItem;
							const available = hasItem ? Math.max(0, Number(slot.quantity ?? 0) - (usedQuantitiesBySlot[slot.slotIndex] ?? 0)) : 0;
							const isSelected = hasItem && selectedInventorySlotIndex === slot.slotIndex;

							return (
								<button
									type="button"
									key={`craft-main-slot-${slot.slotIndex}`}
									className={`inventory-slot ${isSelected ? 'inventory-slot-active' : ''}`.trim()}
									onClick={() => handleInventoryItemClick(slot)}
									disabled={!hasItem || available <= 0}
									title={hasItem ? `${slot.itemName} (${available} available)` : 'Empty slot'}
								>
									{hasItem ? <img src={iconPath} alt={slot.itemName || `Item ${itemId}`} className="inventory-slot-item-image" /> : null}
									{hasItem ? <span className="inventory-slot-item-label">{slot.itemName}</span> : null}
									{hasItem ? <span className="inventory-slot-quantity">{available}</span> : null}
								</button>
							);
						})}
					</div>

					<div className="inventory-hotbar" role="presentation">
						{craftingHotbarSlots.map((slot) => {
							const hasItem = Boolean(slot.fkItemidItem) && Number(slot.quantity ?? 0) > 0;
							const iconPath = hasItem ? withFallbackIcon(slot.itemIcon) : '';
							const itemId = slot.fkItemidItem;
							const available = hasItem ? Math.max(0, Number(slot.quantity ?? 0) - (usedQuantitiesBySlot[slot.slotIndex] ?? 0)) : 0;
							const isSelected = hasItem && selectedInventorySlotIndex === slot.slotIndex;

							return (
								<button
									type="button"
									key={`craft-hotbar-slot-${slot.slotIndex}`}
									className={`inventory-slot ${isSelected ? 'inventory-slot-active' : ''}`.trim()}
									onClick={() => handleInventoryItemClick(slot)}
									disabled={!hasItem || available <= 0}
									title={hasItem ? `${slot.itemName} (${available} available)` : 'Empty slot'}
								>
									{hasItem ? <img src={iconPath} alt={slot.itemName || `Item ${itemId}`} className="inventory-slot-item-image" /> : null}
									{hasItem ? <span className="inventory-slot-item-label">{slot.itemName}</span> : null}
									{hasItem ? <span className="inventory-slot-quantity">{available}</span> : null}
								</button>
							);
						})}
					</div>
				</section>

				{isRecipeBookOpen ? (
					<section className="recipes-list">
						<h3>Recipes ({filteredRecipes.length}/{recipes.length})</h3>
						<input
							type="text"
							className="recipe-search"
							placeholder="Search recipes..."
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
						/>
						<div className="recipes-grid">
							{filteredRecipes.map((recipe) => {
								const recipeItemId = recipe.fkItemidItem ?? recipe.FkItemidItem;
								const recipeItem = recipeItems[recipeItemId];
								const recipeIcon = withFallbackIcon(recipeItem?.icon ?? recipeItem?.Icon);
								const recipeResultQty = recipe.resultQuantity ?? recipe.ResultQuantity ?? 1;
								const recipeName = formatDisplayName(recipeItem?.name ?? recipeItem?.Name ?? 'Unknown');

								return (
									<div key={recipe.idRecipes ?? recipe.IdRecipes} className="recipe-card">
										<div className="recipe-grid-preview">
											{parseRecipeGrid(recipe.gridJson ?? recipe.GridJson).map((slot, idx) => {
												const ingredientItemId = slot?.itemId;
												const ingredientItem = ingredientItemId ? recipeItems[ingredientItemId] : null;
												const ingredientIcon = ingredientItem ? withFallbackIcon(ingredientItem?.icon ?? ingredientItem?.Icon) : '';

												return (
													<div key={idx} className="preview-slot">
														{ingredientIcon ? (
															<>
																<img
																	src={ingredientIcon}
																	alt={formatDisplayName(ingredientItem?.name ?? ingredientItem?.Name ?? `Item ${ingredientItemId}`)}
																/>
																{slot?.quantity > 1 ? <span className="preview-qty">{slot.quantity}</span> : null}
															</>
														) : null}
													</div>
												);
											})}
										</div>
										<div className="recipe-arrow">{'>'}</div>
										<div className="recipe-result-preview">
											<button
												type="button"
												className="recipe-result-preview-button"
												onClick={(event) => handleResultItemInfoClick(event, recipeItem, recipeResultQty)}
												title="Click to view item details"
											>
												<img src={recipeIcon} alt={recipeName || 'Result'} />
											</button>
											{recipeResultQty > 1 ? <span className="preview-qty">{recipeResultQty}</span> : null}
										</div>
									</div>
								);
							})}
						</div>
					</section>
				) : null}
			</div>

			{pendingPlacement ? (
				<div className="crafting-quantity-modal-backdrop" role="presentation" onClick={handleCancelPlacementQuantity}>
					<div className="crafting-quantity-modal" role="dialog" aria-modal="true" aria-label="Select quantity" onClick={(event) => event.stopPropagation()}>
						<h3>Add to Crafting Slot</h3>
						<p>{pendingPlacement.itemName || `Item ${pendingPlacement.itemId}`}</p>
						<label htmlFor="crafting-quantity-input">
							Quantity (max {pendingPlacement.maxQuantity})
						</label>
						<input
							id="crafting-quantity-input"
							type="number"
							min="1"
							max={pendingPlacement.maxQuantity}
							value={placementQuantityInput}
							onChange={(event) => setPlacementQuantityInput(event.target.value)}
						/>
						<div className="crafting-quantity-modal-actions">
							<button type="button" onClick={handleCancelPlacementQuantity}>Cancel</button>
							<button type="button" onClick={handleConfirmPlacementQuantity}>OK</button>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
};

export default CraftingTable;
