import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../Styles/CraftingTableStyles.css';

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

	const hasFileExtension = /\.(png|jpe?g|webp|gif|svg)$/i.test(trimmedPath);
	const normalizedPath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;

	return hasFileExtension ? normalizedPath : `${normalizedPath}.png`;
};

const CraftingTable = ({ playerId, inventoryRefreshTick = 0 }) => {
	const [recipes, setRecipes] = useState([]);
	const [recipeItems, setRecipeItems] = useState({});
	const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
	const [recipesError, setRecipesError] = useState('');
	const [craftingGrid, setCraftingGrid] = useState(Array(9).fill(null));
	const [matchedRecipe, setMatchedRecipe] = useState(null);
	const [isCrafting, setIsCrafting] = useState(false);
	const [craftError, setCraftError] = useState('');

	useEffect(() => {
		const fetchRecipes = async () => {
			try {
				setIsLoadingRecipes(true);
				setRecipesError('');

				const response = await axios.get('http://localhost:5091/api/Recipes/GetRecipes', {
					headers: {
						Accept: 'application/json',
						...getAuthHeaders(),
					},
				});

				const recipeList = response.data ?? [];

				setRecipes(
					recipeList.filter(recipe => recipe.isEnabled || recipe.IsEnabled)
				);

				const itemsMap = {};
				for (const recipe of recipeList) {
					const itemId = recipe.fkItemidItem ?? recipe.FkItemidItem;
					if (itemId && !itemsMap[itemId]) {
						try {
							const itemResponse = await axios.get('http://localhost:5091/api/Item/GetItem', {
								params: {
									id: itemId,
								},
								headers: {
									Accept: 'application/json',
								},
							});
							itemsMap[itemId] = itemResponse.data ?? null;
						} catch (itemError) {
							console.warn(`Failed to load item ${itemId}:`, itemError);
							itemsMap[itemId] = null;
						}
					}
				}
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

	const parseRecipeGrid = (gridJsonString) => {
		if (!gridJsonString) {
			return Array(9).fill(null);
		}

		try {
			let parsed;
			if (typeof gridJsonString === 'string') {
				parsed = JSON.parse(gridJsonString);
			} else {
				parsed = gridJsonString;
			}

			if (Array.isArray(parsed.grid)) {
				return parsed.grid.map(item => {
					if (item === null || item === undefined) {
						return null;
					}
					const itemId = typeof item === 'string' ? parseInt(item, 10) : item;
					return Number.isNaN(itemId) ? null : itemId;
				});
			}

			return Array(9).fill(null);
		} catch (parseError) {
			console.error('Failed to parse recipe grid:', parseError);
			return Array(9).fill(null);
		}
	};

	const normalizeGridForComparison = (grid) => {
		return grid.map(itemId => (itemId === null || itemId === undefined ? null : Number(itemId)));
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

	const handleGridItemClick = (index) => {
		setCraftingGrid(prev => {
			const newGrid = [...prev];
			newGrid[index] = null;
			return newGrid;
		});
	};

	const handleAddItemToGrid = (itemId, index) => {
		setCraftingGrid(prev => {
			const newGrid = [...prev];
			newGrid[index] = itemId;
			return newGrid;
		});
	};

	const handleCraft = async () => {
		if (!matchedRecipe || !playerId) {
			setCraftError(matchedRecipe ? '' : 'No matching recipe found.');
			return;
		}

		try {
			setIsCrafting(true);
			setCraftError('');

			const recipeGrid = parseRecipeGrid(matchedRecipe.gridJson ?? matchedRecipe.GridJson);
			const ingredientMap = {};

			recipeGrid.forEach(itemId => {
				if (itemId !== null && itemId !== undefined) {
					ingredientMap[itemId] = (ingredientMap[itemId] ?? 0) + 1;
				}
			});

			for (const [itemId, quantity] of Object.entries(ingredientMap)) {
				await axios.post(
					'http://localhost:5091/api/Inventory/RemoveItemFromInventory',
					{
						playerId,
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
					playerId,
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
		} catch (error) {
			console.error('Failed to craft:', error);
			setCraftError('Failed to craft item. Check inventory space and ingredients.');
		} finally {
			setIsCrafting(false);
		}
	};

	const resultItem = matchedRecipe ? recipeItems[matchedRecipe.fkItemidItem ?? matchedRecipe.FkItemidItem] : null;
	const resultIcon = resultItem ? resolveIconPath(resultItem.icon ?? resultItem.Icon) : null;
	const resultQuantity = matchedRecipe ? (matchedRecipe.resultQuantity ?? matchedRecipe.ResultQuantity ?? 1) : 0;

	return (
		<section className="crafting-table">
			<header className="crafting-header">
				<h2>Crafting Table</h2>
				{isLoadingRecipes ? <p>Loading recipes...</p> : null}
				{recipesError ? <p className="error">{recipesError}</p> : null}
			</header>

			<div className="crafting-container">
				<div className="crafting-grid">
					<h3>Input Grid</h3>
					<div className="grid-3x3">
						{craftingGrid.map((itemId, index) => (
							<div
								key={index}
								className="grid-slot"
								onClick={() => handleGridItemClick(index)}
								title={itemId ? `Item ID: ${itemId}` : 'Click to remove'}
							>
								{itemId ? (
									<div className="slot-item">
										<span className="item-id">{itemId}</span>
									</div>
								) : null}
							</div>
						))}
					</div>
				</div>

				<div className="crafting-result">
					<h3>Result</h3>
					<div className="result-slot">
						{matchedRecipe && resultIcon ? (
							<div className="matched-result">
								<img src={resultIcon} alt={resultItem?.name ?? resultItem?.Name ?? 'Result'} />
								{resultQuantity > 1 ? <span className="result-qty">{resultQuantity}</span> : null}
							</div>
						) : (
							<div className="no-match">?</div>
						)}
					</div>
					{matchedRecipe ? (
						<button
							className="craft-button"
							onClick={handleCraft}
							disabled={isCrafting}
						>
							{isCrafting ? 'Crafting...' : 'Craft'}
						</button>
					) : null}
					{craftError ? <p className="error">{craftError}</p> : null}
				</div>
			</div>

			<div className="recipes-list">
				<h3>Available Recipes ({recipes.length})</h3>
				<div className="recipes-grid">
					{recipes.map(recipe => {
						const recipeItemId = recipe.fkItemidItem ?? recipe.FkItemidItem;
						const recipeItem = recipeItems[recipeItemId];
						const recipeIcon = recipeItem ? resolveIconPath(recipeItem.icon ?? recipeItem.Icon) : null;
						const recipeResultQty = recipe.resultQuantity ?? recipe.ResultQuantity ?? 1;

						return (
							<div key={recipe.idRecipes ?? recipe.IdRecipes} className="recipe-card">
								<div className="recipe-grid-preview">
									{parseRecipeGrid(recipe.gridJson ?? recipe.GridJson).map((itemId, idx) => (
										<div key={idx} className="preview-slot">
											{itemId ? <span className="preview-id">{itemId}</span> : null}
										</div>
									))}
								</div>
								<div className="recipe-arrow">→</div>
								<div className="recipe-result-preview">
									{recipeIcon ? (
										<img src={recipeIcon} alt={recipeItem?.name ?? recipeItem?.Name ?? 'Result'} title={`${recipeItem?.name ?? recipeItem?.Name} x${recipeResultQty}`} />
									) : (
										<div className="no-icon">?</div>
									)}
									{recipeResultQty > 1 ? <span className="preview-qty">{recipeResultQty}</span> : null}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
};

export default CraftingTable;
