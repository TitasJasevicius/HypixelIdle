import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import ContractPointsShopItem from '../Components/ContractPointsShopItem';
import '../Styles/ContractPointsShopStyles.css';

const getPlayerId = () => {
	const rawPlayerId = localStorage.getItem('playerId');
	const parsedPlayerId = Number(rawPlayerId);
	return Number.isFinite(parsedPlayerId) && parsedPlayerId > 0 ? parsedPlayerId : null;
};

const normalizeShopItem = (shopItem) => ({
	shopItemId: Number(shopItem.shopItemId ?? shopItem.ShopItemId ?? 0),
	itemId: Number(shopItem.itemId ?? shopItem.ItemId ?? 0),
	itemName: shopItem.itemName ?? shopItem.ItemName ?? 'Unknown',
	itemIcon: shopItem.itemIcon ?? shopItem.ItemIcon ?? null,
	price: Number(shopItem.price ?? shopItem.Price ?? 0),
	quantity: Number(shopItem.quantity ?? shopItem.Quantity ?? 1),
	collectionName: shopItem.collectionName ?? shopItem.CollectionName ?? null,
	requiredCollectionTier: shopItem.requiredCollectionTier ?? shopItem.RequiredCollectionTier ?? null,
	playerCollectionTier: Number(shopItem.playerCollectionTier ?? shopItem.PlayerCollectionTier ?? 0),
	skillName: shopItem.skillName ?? shopItem.SkillName ?? null,
	requiredSkillLevel: shopItem.requiredSkillLevel ?? shopItem.RequiredSkillLevel ?? null,
	playerSkillLevel: Number(shopItem.playerSkillLevel ?? shopItem.PlayerSkillLevel ?? 0),
	startAt: shopItem.startAt ?? shopItem.StartAt ?? null,
	endAt: shopItem.endAt ?? shopItem.EndAt ?? null,
	isWithinActiveWindow: Boolean(shopItem.isWithinActiveWindow ?? shopItem.IsWithinActiveWindow ?? true),
	meetsCollectionRequirement: Boolean(shopItem.meetsCollectionRequirement ?? shopItem.MeetsCollectionRequirement ?? true),
	meetsSkillRequirement: Boolean(shopItem.meetsSkillRequirement ?? shopItem.MeetsSkillRequirement ?? true),
	isEligible: Boolean(shopItem.isEligible ?? shopItem.IsEligible ?? true),
});

const ContractPointsShop = () => {
	const [playerId] = useState(getPlayerId);
	const [items, setItems] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [statusMessage, setStatusMessage] = useState('');
	const [busyShopItemId, setBusyShopItemId] = useState(null);

	const fetchShop = useCallback(async () => {
		if (!playerId) {
			setError('Missing playerId in localStorage. Please relogin.');
			return;
		}

		setIsLoading(true);
		setError('');

		try {
			const shopResponse = await axios.get(`${API_BASE}/ContractPointsShop/GetContractPointsShopItems`, {
				params: { playerId },
				headers: { Accept: 'application/json' },
			});

			const normalizedItems = Array.isArray(shopResponse.data)
				? shopResponse.data.map(normalizeShopItem)
				: [];

			setItems(normalizedItems);
		} catch (requestError) {
			console.error('Failed to load contract points shop', requestError);
			setError('Failed to load contract points shop.');
		} finally {
			setIsLoading(false);
		}
	}, [playerId]);

	useEffect(() => {
		fetchShop();
	}, [fetchShop]);

	const sortedItems = useMemo(() => {
		return [...items].sort((left, right) => {
			if (left.isEligible !== right.isEligible) {
				return left.isEligible ? -1 : 1;
			}

			if (left.price !== right.price) {
				return left.price - right.price;
			}

			return left.itemName.localeCompare(right.itemName);
		});
	}, [items]);

	const handlePurchase = async (item, purchaseCount) => {
		if (!playerId || !item?.shopItemId) {
			return;
		}

		setBusyShopItemId(item.shopItemId);
		setStatusMessage('');

		try {
			const response = await axios.post(`${API_BASE}/ContractPointsShop/PurchaseContractPointsShopItem`, {
				playerId,
				shopItemId: item.shopItemId,
				purchaseCount,
			}, {
				headers: { 'Content-Type': 'application/json' },
			});

			const grantedQuantity = Number(response.data?.grantedQuantity ?? response.data?.GrantedQuantity ?? 0);
			const totalCost = Number(response.data?.totalCostContractPoints ?? response.data?.TotalCostContractPoints ?? 0);
			setStatusMessage(`Purchased ${grantedQuantity} ${item.itemName} for ${totalCost} Contract Points.`);

			window.dispatchEvent(new Event('contracts-updated'));
			window.dispatchEvent(new Event('purse-updated'));
			await fetchShop();
		} catch (requestError) {
			console.error('Failed to purchase shop item', requestError);
			const apiMessage = requestError?.response?.data;
			setStatusMessage(typeof apiMessage === 'string' ? apiMessage : 'Purchase failed.');
		} finally {
			setBusyShopItemId(null);
		}
	};

	return (
		<section className="contract-points-shop-page">
			<header className="contract-points-shop-header">
				<div>
					<h2>Contract Points Shop</h2>
					<p>Spend Contract Points on items and unlock more options through progression.</p>
				</div>
			</header>

			{error ? <p className="contract-points-shop-error">{error}</p> : null}
			{statusMessage ? <p className="contract-points-shop-status">{statusMessage}</p> : null}

			{isLoading ? <p className="contract-points-shop-empty">Loading shop items...</p> : null}

			{!isLoading && sortedItems.length === 0 ? (
				<p className="contract-points-shop-empty">No shop items configured.</p>
			) : null}

			<div className="contract-points-shop-grid">
				{sortedItems.map((shopItem) => (
					<ContractPointsShopItem
						key={shopItem.shopItemId}
						item={shopItem}
						onPurchase={handlePurchase}
						isBusy={busyShopItemId === shopItem.shopItemId}
					/>
				))}
			</div>
		</section>
	);
};

export default ContractPointsShop;
