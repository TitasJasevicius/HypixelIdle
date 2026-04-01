/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Inventory from './Inventory';
import { formatDisplayName } from './DisplayNameUtils';
import '../Styles/CraftingTableStyles.css';

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
	const fileName = (hasFileExtension ? pathWithoutPrefix : `${pathWithoutPrefix}.png`).split('/').pop();

	return fileName ? (BLOCK_TEXTURE_BY_FILE[fileName] ?? '') : '';
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
	const [matchedRecipe, setMatchedRecipe] = useState(null);
	const [isRecipeBookOpen, setIsRecipeBookOpen] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [inventoryRefreshToken, setInventoryRefreshToken] = useState(0);

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

				const itemId = typeof item === 'string' ? parseInt(item, 10) : item;
				return Number.isNaN(itemId) ? null : itemId;
			});
		} catch (error) {
			console.error('Failed to parse recipe grid:', error);
			return Array(9).fill(null);
		}
	};

	const normalizeGridForComparison = (grid) => {
		return grid.map((itemId) => (itemId === null || itemId === undefined ? null : Number(itemId)));
	};

	const doesGridMatchRecipe = (currentGrid, recipeGrid) => {
		const normalized1 = normalizeGridForComparison(currentGrid);
		const normalized2 = normalizeGridForComparison(recipeGrid);

		return normalized1.every((item, idx) => {
			if (item === null && normalized2[idx] === null) {
				return true;
			}
			return item === normalized2[idx];
		});
	};

	const foundRecipe = useMemo(() => {
		for (const recipe of recipes) {
			const recipeGrid = parseRecipeGrid(recipe.gridJson ?? recipe.GridJson);
			if (doesGridMatchRecipe(craftingGrid, recipeGrid)) {
				return recipe;
			}
		}
		return null;
	}, [craftingGrid, recipes]);

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
		setCraftingGrid((prev) => {
			const newGrid = [...prev];

			if (newGrid[index] != null) {
				newGrid[index] = null;
				return newGrid;
			}

			return newGrid;
		});
	};

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

			recipeGrid.forEach((itemId) => {
				if (itemId !== null && itemId !== undefined) {
					ingredientMap[itemId] = (ingredientMap[itemId] ?? 0) + 1;
				}
			});

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
			setMatchedRecipe(null);
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

	return (
		<section className="crafting-table">
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
						<span className="book-icon">B</span>
					</button>

					<div className="crafting-grid-wrap">
						<div className="grid-3x3">
							{craftingGrid.map((itemId, index) => {
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
											</div>
										) : null}
									</button>
								);
							})}
						</div>

						<div className="craft-arrow">{'>'}</div>

						<div className="result-slot">
							{matchedRecipe ? (
								<div className="matched-result">
									<img src={resultIcon} alt={formatDisplayName(resultItem?.name ?? resultItem?.Name ?? 'Result')} />
									{resultQuantity > 1 ? <span className="result-qty">{resultQuantity}</span> : null}
								</div>
							) : (
								<div className="no-match">?</div>
							)}
						</div>
					</div>

					<div className="craft-controls">
						{matchedRecipe ? (
							<button className="craft-button" onClick={handleCraft} disabled={isCrafting}>
								{isCrafting ? 'Crafting...' : 'Craft'}
							</button>
						) : (
							<p className="crafting-tip">Select an item below, then click an empty crafting slot.</p>
						)}
						{craftError ? <p className="error">{craftError}</p> : null}
					</div>
				</div>

				<Inventory
					playerId={resolvedPlayerId}
					refreshKey={inventoryRefreshToken}
					className="crafting-table-inventory"
				/>

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
											{parseRecipeGrid(recipe.gridJson ?? recipe.GridJson).map((itemId, idx) => {
												const ingredientItem = itemId ? recipeItems[itemId] : null;
												const ingredientIcon = ingredientItem ? withFallbackIcon(ingredientItem?.icon ?? ingredientItem?.Icon) : '';

												return (
													<div key={idx} className="preview-slot">
														{ingredientIcon ? (
															<img 
																src={ingredientIcon} 
																alt={formatDisplayName(ingredientItem?.name ?? ingredientItem?.Name ?? `Item ${itemId}`)}
															/>
														) : null}
													</div>
												);
											})}
										</div>
										<div className="recipe-arrow">{'>'}</div>
										<div className="recipe-result-preview">
											<img src={recipeIcon} alt={recipeName || 'Result'} title={`${recipeName || 'Unknown'} x${recipeResultQty}`} />
											{recipeResultQty > 1 ? <span className="preview-qty">{recipeResultQty}</span> : null}
										</div>
									</div>
								);
							})}
						</div>
					</section>
				) : null}
			</div>
		</section>
	);
};

export default CraftingTable;
