import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import MiningBlock from '../Components/MiningBlock';
import Inventory from '../Components/Inventory';
import PlayerCollection from '../Components/PlayerCollection';
import '../Styles/GlobalStyles.css';
import '../Styles/MiningStyles.css';

const MAX_BLOCK_HEALTH = 10;

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

const Mining = () => {
	const [blockHealth, setBlockHealth] = useState(MAX_BLOCK_HEALTH);
	const [cobblestone, setCobblestone] = useState(0);
	const [cobblestoneItem, setCobblestoneItem] = useState(null);
	const [isLoadingItem, setIsLoadingItem] = useState(true);
	const [itemError, setItemError] = useState('');
	const [dropError, setDropError] = useState('');
	const [isSavingDrop, setIsSavingDrop] = useState(false);
	const [inventoryRefreshTick, setInventoryRefreshTick] = useState(0);

	const playerId = useMemo(() => {
		const storedPlayerId = localStorage.getItem('playerId');

		if (!storedPlayerId) {
			return null;
		}

		const parsedPlayerId = Number(storedPlayerId);
		return Number.isNaN(parsedPlayerId) ? null : parsedPlayerId;
	}, []);

	useEffect(() => {
		const fetchCobblestoneItem = async () => {
			try {
				setIsLoadingItem(true);
				setItemError('');

				const response = await axios.get('http://localhost:5091/api/Item/GetItem', {
					params: {
						name: 'Cobblestone',
					},
					headers: {
						Accept: 'application/json',
					},
				});

				setCobblestoneItem(response.data ?? null);
			} catch (error) {
				console.error('Failed to load cobblestone item:', error);
				setItemError('Failed to load item data from API.');
			} finally {
				setIsLoadingItem(false);
			}
		};

		fetchCobblestoneItem();
	}, []);

	const itemName = useMemo(
		() => cobblestoneItem?.name ?? cobblestoneItem?.Name ?? 'Cobblestone',
		[cobblestoneItem]
	);

	const collectionId = useMemo(() => {
		const id = cobblestoneItem?.fkCollectionidCollection ?? cobblestoneItem?.FkCollectionidCollection;
		return typeof id === 'number' ? id : null;
	}, [cobblestoneItem]);

	const cobblestoneTextureStyle = useMemo(() => {
		const iconPath = cobblestoneItem?.icon ?? cobblestoneItem?.Icon;
		const resolvedIconPath = resolveIconPath(iconPath);

		if (!resolvedIconPath) {
			return undefined;
		}

		return {
			backgroundImage: `url("${resolvedIconPath}")`,
			backgroundRepeat: 'repeat',
			backgroundSize: '64px 64px',
			imageRendering: 'pixelated',
		};
	}, [cobblestoneItem]);

	const addMinedItemToInventory = async () => {
		setDropError('');

		const itemId = cobblestoneItem?.idItem ?? cobblestoneItem?.IdItem;
		if (!itemId) {
			setDropError('Cannot add drop: item id is missing.');
			return false;
		}

		if (!playerId) {
			setDropError('Cannot add drop: player id is missing. Log in again.');
			return false;
		}

		try {
			setIsSavingDrop(true);

			await axios.post('http://localhost:5091/api/Inventory/AddItemToInventory', {
				playerId,
				itemId,
				quantity: 1,
			}, {
				headers: {
					Accept: 'application/json',
					...getAuthHeaders(),
				},
			});

			setCobblestone((prev) => prev + 1);
			setInventoryRefreshTick((prev) => prev + 1);
			return true;
		} catch (error) {
			console.error('Failed to add mined item to inventory:', error);
			setDropError('Failed to add mined drop to inventory. It may be full.');
			return false;
		} finally {
			setIsSavingDrop(false);
		}
	};

	const mineBlock = async () => {
		if (isSavingDrop) {
			return;
		}

		if (blockHealth > 1) {
			setBlockHealth((prev) => prev - 1);
			return;
		}

		setBlockHealth(MAX_BLOCK_HEALTH);
		await addMinedItemToInventory();
	};

	return (
		<section className="mining-content">
				<header className="mining-header">
					<h1>{itemName} Node</h1>
					<p>Click the block to mine it. When hits reaches zero, it respawns and gives 1 {itemName}.</p>
					{isLoadingItem ? <p>Loading item data...</p> : null}
					{itemError ? <p>{itemError}</p> : null}
					{dropError ? <p>{dropError}</p> : null}
				</header>

				<MiningBlock
					label={itemName}
					currentHealth={blockHealth}
					maxHealth={MAX_BLOCK_HEALTH}
					onMine={mineBlock}
					ariaLabel={`Mine ${itemName} block`}
					blockClassName="mining-block--cobblestone"
					blockStyle={cobblestoneTextureStyle}
				/>

				<section className="mining-stats" aria-label="Mining stats">
					<article>
						<h2>{itemName} Mined This Session</h2>
						<p>{cobblestone}</p>
					</article>
					<PlayerCollection
						playerId={playerId}
						itemName={itemName}
						collectionId={collectionId}
						progressTick={inventoryRefreshTick}
					/>
				</section>

				<Inventory playerId={playerId} refreshKey={inventoryRefreshTick} />
		</section>
	);
};

export default Mining;
