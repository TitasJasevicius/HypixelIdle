import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BLOCK_TEXTURE_BY_FILE, normalizeItem, resolveIconPath } from './MiningUtils';
import { formatDisplayName } from './DisplayNameUtils';
import { formatDropChancePercent, formatDropQuantityRange } from './CombatUtils';
import '../Styles/ItemSearchStyles.css';

const DEFAULT_ITEM_ICON = String(BLOCK_TEXTURE_BY_FILE['cobblestone_texture.png'] ?? '');

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
				const itemId = Number.parseInt(rawItemId, 10);
				if (Number.isNaN(itemId)) {
					return null;
				}

				const parsedQuantity = rawQuantity === undefined ? 1 : Number.parseInt(rawQuantity, 10);
				const quantity = Number.isNaN(parsedQuantity) ? 1 : Math.max(1, parsedQuantity);
				return { itemId, quantity };
			}

			if (typeof item === 'number') {
				return Number.isNaN(item) ? null : { itemId: item, quantity: 1 };
			}

			if (typeof item === 'object') {
				const itemId = Number.parseInt(item.itemId ?? item.id ?? item.ItemId ?? item.Id, 10);
				if (Number.isNaN(itemId)) {
					return null;
				}

				const parsedQuantity = Number.parseInt(item.quantity ?? item.Quantity ?? 1, 10);
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

const formatStatValue = (statEntry) => {
	if (!statEntry) {
		return '';
	}

	if (statEntry.percentageValue != null) {
		return `${Number(statEntry.percentageValue).toFixed(1)}%`;
	}

	if (statEntry.value != null) {
		return String(statEntry.value);
	}

	return '';
};

const ItemSearch = ({
	itemsEndpoint = 'http://localhost:5091/api/Item/GetItems',
	recipesEndpoint = 'http://localhost:5091/api/Recipes/GetRecipes',
	statsEndpoint = 'http://localhost:5091/api/Stats/GetStats',
	mobsEndpoint = 'http://localhost:5091/api/Mob/GetCombatMobs',
	title = 'Item Search',
	triggerLabel = 'Items',
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [loadError, setLoadError] = useState('');
	const [items, setItems] = useState([]);
	const [recipes, setRecipes] = useState([]);
	const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
	const [recipesError, setRecipesError] = useState('');
	const [mobs, setMobs] = useState([]);
	const [isLoadingMobs, setIsLoadingMobs] = useState(false);
	const [mobsError, setMobsError] = useState('');
	const [statsById, setStatsById] = useState({});
	const [itemStatsByItemId, setItemStatsByItemId] = useState({});
	const [query, setQuery] = useState('');
	const [categoryFilter, setCategoryFilter] = useState('all');
	const [sortBy, setSortBy] = useState('name-asc');
	const [selectedItemId, setSelectedItemId] = useState(null);

	useEffect(() => {
		if (!isOpen) {
			document.body.classList.remove('item-search-open');
			document.body.classList.remove('item-search-no-scroll');
			return undefined;
		}

		document.body.classList.add('item-search-open');
		document.body.classList.add('item-search-no-scroll');

		const onEscape = (event) => {
			if (event.key === 'Escape') {
				setIsOpen(false);
			}
		};

		window.addEventListener('keydown', onEscape);
		return () => {
			window.removeEventListener('keydown', onEscape);
			document.body.classList.remove('item-search-open');
			document.body.classList.remove('item-search-no-scroll');
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen || items.length > 0 || isLoading) {
			return;
		}

		const fetchItems = async () => {
			try {
				setIsLoading(true);
				setLoadError('');

				const response = await axios.get(itemsEndpoint, {
					headers: {
						Accept: 'application/json',
					},
				});

				const normalizedItems = Array.isArray(response?.data)
					? response.data.map(normalizeItem)
					: [];

				setItems(normalizedItems);
			} catch (error) {
				console.error('Failed to load items for search:', error);
				setLoadError('Failed to load items.');
			} finally {
				setIsLoading(false);
			}
		};

		fetchItems();
	}, [isOpen, items.length, isLoading, itemsEndpoint]);

	useEffect(() => {
		if (!isOpen || recipes.length > 0 || isLoadingRecipes) {
			return;
		}

		const fetchRecipes = async () => {
			try {
				setIsLoadingRecipes(true);
				setRecipesError('');

				const response = await axios.get(recipesEndpoint, {
					headers: {
						Accept: 'application/json',
					},
				});

				const recipeList = Array.isArray(response?.data) ? response.data : [];
				setRecipes(recipeList.filter((recipe) => recipe.isEnabled ?? recipe.IsEnabled ?? false));
			} catch (error) {
				console.error('Failed to load recipes for search:', error);
				setRecipesError('Failed to load recipes.');
			} finally {
				setIsLoadingRecipes(false);
			}
		};

		fetchRecipes();
	}, [isOpen, isLoadingRecipes, recipes.length, recipesEndpoint]);

	useEffect(() => {
		if (!isOpen || mobs.length > 0 || isLoadingMobs) {
			return;
		}

		const fetchMobs = async () => {
			try {
				setIsLoadingMobs(true);
				setMobsError('');

				const response = await axios.get(mobsEndpoint, {
					headers: {
						Accept: 'application/json',
					},
				});

				setMobs(Array.isArray(response?.data) ? response.data : []);
			} catch (error) {
				console.error('Failed to load mob sources for item search:', error);
				setMobsError('Failed to load mob sources.');
			} finally {
				setIsLoadingMobs(false);
			}
		};

		fetchMobs();
	}, [isOpen, isLoadingMobs, mobs.length, mobsEndpoint]);

	useEffect(() => {
		if (!isOpen || Object.keys(statsById).length > 0) {
			return;
		}

		const fetchStatsCatalog = async () => {
			try {
				const response = await axios.get(statsEndpoint, {
					headers: {
						Accept: 'application/json',
					},
				});

				const statList = Array.isArray(response?.data) ? response.data : [];
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
				console.error('Failed to load stat catalog for item search:', error);
			}
		};

		fetchStatsCatalog();
	}, [isOpen, statsById, statsEndpoint]);

	useEffect(() => {
		if (selectedItemId == null) {
			return;
		}

		const previewItem = items.find((item) => item.idItem === selectedItemId) ?? null;
		if (!previewItem?.idItem) {
			return;
		}

		const itemId = previewItem.idItem;
		if (itemStatsByItemId[itemId]) {
			return;
		}

		const fetchItemStats = async () => {
			try {
				const response = await axios.get('http://localhost:5091/api/Stats/GetItemStats', {
					params: { itemId },
					headers: {
						Accept: 'application/json',
					},
				});

				const mapped = Array.isArray(response?.data)
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
				console.error('Failed to load item stats for search preview:', error);
				setItemStatsByItemId((prev) => ({
					...prev,
					[itemId]: [],
				}));
			}
		};

		fetchItemStats();
	}, [items, itemStatsByItemId, selectedItemId]);

	const categories = useMemo(() => {
		const allCategories = new Set();

		for (const item of items) {
			const category = (item.category ?? '').toString().trim();
			if (category) {
				allCategories.add(category);
			}
		}

		return ['all', ...[...allCategories].sort((a, b) => a.localeCompare(b))];
	}, [items]);

	const visibleItems = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		const filtered = items.filter((item) => {
			const name = (item.name ?? '').toString().toLowerCase();
			const category = (item.category ?? '').toString();
			const categoryLower = category.toLowerCase();

			const matchesCategory = categoryFilter === 'all' || categoryLower === categoryFilter.toLowerCase();
			const matchesQuery = normalizedQuery.length === 0
				|| name.includes(normalizedQuery)
				|| categoryLower.includes(normalizedQuery);

			return matchesCategory && matchesQuery;
		});

		const sorted = [...filtered];
		sorted.sort((left, right) => {
			if (sortBy === 'name-desc') {
				return (right.name ?? '').localeCompare(left.name ?? '');
			}

			if (sortBy === 'sell-desc') {
				return Number(right.sellValue ?? 0) - Number(left.sellValue ?? 0);
			}

			if (sortBy === 'sell-asc') {
				return Number(left.sellValue ?? 0) - Number(right.sellValue ?? 0);
			}

			return (left.name ?? '').localeCompare(right.name ?? '');
		});

		return sorted;
	}, [categoryFilter, items, query, sortBy]);

	useEffect(() => {
		if (!isOpen) {
			setSelectedItemId(null);
			return;
		}

		if (visibleItems.length === 0) {
			setSelectedItemId(null);
			return;
		}

		setSelectedItemId((currentSelectedId) => {
			const currentSelectedExists = visibleItems.some((item) => item.idItem === currentSelectedId);
			return currentSelectedExists ? currentSelectedId : visibleItems[0].idItem;
		});
	}, [isOpen, visibleItems]);

	const selectedItem = useMemo(() => {
		if (selectedItemId == null) {
			return null;
		}

		return items.find((item) => item.idItem === selectedItemId) ?? null;
	}, [items, selectedItemId]);

	const selectedItemStats = useMemo(() => {
		if (!selectedItem?.idItem) {
			return [];
		}

		return itemStatsByItemId[selectedItem.idItem] ?? [];
	}, [selectedItem, itemStatsByItemId]);

	const selectedItemRecipes = useMemo(() => {
		if (!selectedItem?.idItem) {
			return [];
		}

		const itemId = selectedItem.idItem;
		return recipes.filter((recipe) => Number(recipe.fkItemidItem ?? recipe.FkItemidItem) === itemId);
	}, [recipes, selectedItem]);

	const selectedRecipeViews = useMemo(() => selectedItemRecipes.map((recipe) => ({
		recipe,
		grid: parseRecipeGrid(recipe.gridJson ?? recipe.GridJson),
	})), [selectedItemRecipes]);

	const selectedItemMobSources = useMemo(() => {
		if (!selectedItem?.idItem) {
			return [];
		}

		const itemId = selectedItem.idItem;
		const sources = [];

		for (const mob of mobs) {
			const matchingDrop = (mob.drops ?? []).find((drop) => Number(drop.itemId ?? drop.ItemId) === itemId);
			if (!matchingDrop) {
				continue;
			}

			sources.push({
				mobId: mob.idMob ?? mob.IdMob,
				mobName: formatDisplayName(mob.name ?? mob.Name ?? 'Mob'),
				location: mob.location ?? mob.Location ?? '',
				dropChance: matchingDrop.dropChance ?? matchingDrop.DropChance ?? 0,
				minQuantity: matchingDrop.minQuantity ?? matchingDrop.MinQuantity ?? 1,
				maxQuantity: matchingDrop.maxQuantity ?? matchingDrop.MaxQuantity ?? 1,
			});
		}

		return sources.sort((left, right) => Number(right.dropChance ?? 0) - Number(left.dropChance ?? 0));
	}, [mobs, selectedItem]);

	const selectedItemStatRows = useMemo(() => selectedItemStats.map((statEntry) => {
		const statId = statEntry.statId ?? statEntry.FkStatsidStats ?? statEntry.fkStatsidStats;
		const statDefinition = statsById[statId];

		return {
			key: `${statId}-${statEntry.value ?? statEntry.percentageValue ?? 'stat'}`,
			name: statDefinition?.name ?? `Stat ${statId}`,
			value: formatStatValue(statEntry),
		};
	}), [selectedItemStats, statsById]);

	const handleSelectItem = (item) => {
		setSelectedItemId(item?.idItem ?? null);
	};

	return (
		<div className="item-search-root-global">
			<button
				type="button"
				className="item-search-trigger"
				onClick={() => setIsOpen(true)}
				aria-label="Open item search"
			>
				{triggerLabel}
			</button>

			{isOpen ? (
				<div
					className="item-search-overlay"
					role="presentation"
					onClick={() => setIsOpen(false)}
				>
					<section
						className="item-search-modal"
						role="dialog"
						aria-modal="true"
						aria-label={title}
						onClick={(event) => event.stopPropagation()}
					>
						<header className="item-search-header">
							<h2>{title}</h2>
							<button type="button" className="item-search-close" onClick={() => setIsOpen(false)}>
								Close
							</button>
						</header>

						<div className="item-search-controls">
							<input
								type="search"
								className="item-search-input"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search by item name or category..."
							/>

							<div className="item-search-filter-row">
								<label className="item-search-select-wrap" htmlFor="item-search-category-filter">
									<span>Filter</span>
									<select
										id="item-search-category-filter"
										value={categoryFilter}
										onChange={(event) => setCategoryFilter(event.target.value)}
									>
										{categories.map((category) => (
											<option key={category} value={category}>
												{category === 'all' ? 'All categories' : formatDisplayName(category)}
											</option>
										))}
									</select>
								</label>

								<label className="item-search-select-wrap" htmlFor="item-search-sort-by">
									<span>Sort</span>
									<select
										id="item-search-sort-by"
										value={sortBy}
										onChange={(event) => setSortBy(event.target.value)}
									>
										<option value="name-asc">Name A-Z</option>
										<option value="name-desc">Name Z-A</option>
										<option value="sell-desc">Sell value high to low</option>
										<option value="sell-asc">Sell value low to high</option>
									</select>
								</label>
							</div>
						</div>

						<div className="item-search-body">
							<section className="item-search-results" aria-label="Search results">
								{isLoading ? <p className="item-search-empty">Loading items...</p> : null}
								{!isLoading && loadError ? <p className="item-search-empty item-search-empty-error">{loadError}</p> : null}
								{!isLoading && !loadError && visibleItems.length === 0 ? (
									<p className="item-search-empty">No items match your search.</p>
								) : null}

								{!isLoading && !loadError && visibleItems.length > 0 ? (
									<div className="item-search-grid">
										{visibleItems.map((item) => {
											const itemIcon = resolveIconPath(item.icon, BLOCK_TEXTURE_BY_FILE) || DEFAULT_ITEM_ICON;
											const isSelected = item.idItem === selectedItemId;

											return (
												<button
													type="button"
													key={item.idItem ?? `${item.name}-${item.category}`}
													className={`item-search-card ${isSelected ? 'selected' : ''}`}
													onClick={() => handleSelectItem(item)}
												>
													<div className="item-search-card-icon-wrap">
														<img src={itemIcon} alt={item.name ?? 'Item'} className="item-search-card-icon" />
													</div>
													<div className="item-search-card-content">
														<h3>{item.name}</h3>
														<p>{formatDisplayName(item.category || 'Uncategorized')}</p>
														<div className="item-search-card-meta">
															<span>Sell: {Number(item.sellValue ?? 0).toFixed(2)}c</span>
															<span>Stack: {Number(item.stackValue ?? 0) > 0 ? Number(item.stackValue) : '-'}</span>
														</div>
													</div>
												</button>
											);
										})}
									</div>
								) : null}
							</section>

							<aside className="item-search-preview" aria-label="Item preview">
								{selectedItem ? (
									<>
										<div className="item-search-preview-header">
											<div className="item-search-preview-icon-wrap">
												<img
													src={resolveIconPath(selectedItem.icon, BLOCK_TEXTURE_BY_FILE) || DEFAULT_ITEM_ICON}
													alt={selectedItem.name ?? 'Item'}
													className="item-search-preview-icon"
												/>
											</div>
											<div>
												<h3>{selectedItem.name}</h3>
												<p>{formatDisplayName(selectedItem.category || 'Uncategorized')}</p>
											</div>
										</div>

										<section className="item-search-preview-section">
											<h4>Stats</h4>
											{selectedItemStatRows.length > 0 ? (
												<ul className="item-search-preview-list">
													{selectedItemStatRows.map((row) => (
														<li key={row.key}>
															<span>{row.name}</span>
															<strong>{row.value}</strong>
														</li>
													))}
												</ul>
											) : (
												<p className="item-search-empty">No stats found for this item.</p>
											)}
										</section>

										<section className="item-search-preview-section">
											<h4>Recipes</h4>
											{isLoadingRecipes ? <p className="item-search-empty">Loading recipes...</p> : null}
											{!isLoadingRecipes && recipesError ? <p className="item-search-empty item-search-empty-error">{recipesError}</p> : null}
											{!isLoadingRecipes && !recipesError && selectedRecipeViews.length === 0 ? (
												<p className="item-search-empty">No recipes found for this item.</p>
											) : null}

											{selectedRecipeViews.map(({ recipe, grid }) => {
												const recipeName = formatDisplayName(recipe.name ?? recipe.Name ?? selectedItem.name ?? 'Recipe');
												const resultQuantity = Number(recipe.resultQuantity ?? recipe.ResultQuantity ?? 1);

												return (
													<article key={recipe.idRecipes ?? recipe.IdRecipes ?? recipeName} className="item-search-recipe-card">
														<div className="item-search-recipe-header">
															<div>
																<strong>{recipeName}</strong>
																<p>Produces x{resultQuantity}</p>
															</div>
														</div>

														<div className="item-search-recipe-grid">
															{grid.map((slot, index) => {
																if (!slot) {
																	return <div key={`${recipe.idRecipes ?? index}-empty-${index}`} className="item-search-recipe-slot empty" />;
																}

																const ingredient = items.find((item) => item.idItem === slot.itemId);
																const ingredientIcon = resolveIconPath(ingredient?.icon, BLOCK_TEXTURE_BY_FILE) || DEFAULT_ITEM_ICON;

																return (
																	<div key={`${recipe.idRecipes ?? index}-${slot.itemId}-${index}`} className="item-search-recipe-slot">
																		<img src={ingredientIcon} alt={ingredient?.name ?? `Item ${slot.itemId}`} />
																		<span>{ingredient?.name ?? `Item #${slot.itemId}`}</span>
																		<small>x{slot.quantity}</small>
																	</div>
																);
																})}
														</div>
													</article>
												);
											})}
										</section>

										<section className="item-search-preview-section">
											<h4>Mob Drops</h4>
											{isLoadingMobs ? <p className="item-search-empty">Loading mob sources...</p> : null}
											{!isLoadingMobs && mobsError ? <p className="item-search-empty item-search-empty-error">{mobsError}</p> : null}
											{!isLoadingMobs && !mobsError && selectedItemMobSources.length === 0 ? (
												<p className="item-search-empty">This item is not listed as a mob drop.</p>
											) : null}
											{selectedItemMobSources.length > 0 ? (
												<ul className="item-search-preview-list">
													{selectedItemMobSources.map((source) => (
														<li key={`${source.mobId}-${source.mobName}`}>
															<div className="item-search-mob-source-topline">
																<span className="item-search-mob-source-name">{source.mobName}</span>
																<strong>
																	{formatDropChancePercent(source.dropChance)} · {formatDropQuantityRange(source.minQuantity, source.maxQuantity)}
																</strong>
															</div>
															<span className="item-search-mob-source-location">{source.location ? source.location.replace(/_/g, ' ') : 'Unknown location'}</span>
														</li>
													))}
												</ul>
											) : null}
										</section>
									</>
								) : (
									<p className="item-search-empty">Select an item to preview its stats and recipes.</p>
								)}
							</aside>
						</div>
					</section>
				</div>
			) : null}
		</div>
	);
};

export default ItemSearch;
