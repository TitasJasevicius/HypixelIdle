import { useEffect, useMemo, useState } from 'react';
import { formatDisplayName } from './DisplayNameUtils';

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

const resolveIconPath = (iconPath) => {
	if (!iconPath || typeof iconPath !== 'string') {
		return '';
	}

	const trimmedPath = iconPath.trim();

	if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://') || trimmedPath.startsWith('data:')) {
		return trimmedPath;
	}

	const normalizedPath = trimmedPath.replaceAll('\\', '/');
	const lowerPath = normalizedPath.toLowerCase();
	const fileName = lowerPath.split('/').pop();

	if (!fileName) {
		return '';
	}

	if (BLOCK_TEXTURE_BY_FILE[fileName]) {
		return BLOCK_TEXTURE_BY_FILE[fileName];
	}

	const pathWithoutPrefix = lowerPath
		.replace(/^\/+/, '')
		.replace(/^src\/assets\/blocks\//, '')
		.replace(/^assets\/blocks\//, '')
		.replace(/^blocks\//, '');

	if (BLOCK_TEXTURE_BY_FILE[pathWithoutPrefix]) {
		return BLOCK_TEXTURE_BY_FILE[pathWithoutPrefix];
	}

	const bareFileName = pathWithoutPrefix.split('/').pop() || '';
	const extensionCandidates = ['png', 'gif', 'webp', 'jpg', 'jpeg', 'svg'];
	for (const extension of extensionCandidates) {
		const candidate = bareFileName.includes('.') ? bareFileName : `${bareFileName}.${extension}`;
		if (BLOCK_TEXTURE_BY_FILE[candidate]) {
			return BLOCK_TEXTURE_BY_FILE[candidate];
		}
	}

	if (trimmedPath.startsWith('/')) {
		return trimmedPath;
	}

	return '';
};

const toDateText = (rawValue) => {
	if (!rawValue) {
		return null;
	}

	const parsedDate = new Date(rawValue);
	if (Number.isNaN(parsedDate.getTime())) {
		return null;
	}

	return parsedDate.toLocaleDateString();
};

const ContractPointsShopItem = ({
	item,
	onPurchase,
	isBusy,
}) => {
	const [purchaseCount, setPurchaseCount] = useState(1);
	const [iconSrc, setIconSrc] = useState('');

	const quantityPerPurchase = Math.max(1, Number(item?.quantity ?? 1));
	const pricePerPurchase = Math.max(0, Number(item?.price ?? 0));
	const safePurchaseCount = Math.max(1, purchaseCount);
	const totalCost = pricePerPurchase * safePurchaseCount;

	const requirementText = useMemo(() => {
		const parts = [];

		if (item?.requiredCollectionTier && item?.collectionName) {
			parts.push(`Collection ${formatDisplayName(item.collectionName)} tier ${item.requiredCollectionTier}`);
		}

		if (item?.requiredSkillLevel && item?.skillName) {
			parts.push(`Skill ${formatDisplayName(item.skillName)} level ${item.requiredSkillLevel}`);
		}

		return parts;
	}, [item]);

	const startAtText = toDateText(item?.startAt);
	const endAtText = toDateText(item?.endAt);
	const hasWindow = Boolean(startAtText || endAtText);

	useEffect(() => {
		setIconSrc(resolveIconPath(item?.itemIcon) || DEFAULT_ITEM_ICON);
	}, [item?.itemIcon]);

	const handlePurchaseClick = () => {
		onPurchase(item, safePurchaseCount);
	};

	const handleQuantityInput = (event) => {
		const parsedValue = Number(event.target.value);
		if (!Number.isFinite(parsedValue)) {
			setPurchaseCount(1);
			return;
		}

		setPurchaseCount(Math.max(1, Math.min(999, Math.floor(parsedValue))));
	};

	return (
		<article className="contract-points-shop-item-card">
			<header className="contract-points-shop-item-header">
				<div className="contract-points-shop-item-title-wrap">
					<h3>{formatDisplayName(item?.itemName || 'Unknown item')}</h3>
					<p>
						{quantityPerPurchase} per purchase
					</p>
				</div>
				<div className="contract-points-shop-price-pill">
					{pricePerPurchase} Contract Points
				</div>
			</header>

			{iconSrc ? (
				<img
					src={iconSrc}
					alt={formatDisplayName(item?.itemName || 'Shop item')}
					className="contract-points-shop-item-icon"
					onError={() => {
						if (iconSrc !== DEFAULT_ITEM_ICON) {
							setIconSrc(DEFAULT_ITEM_ICON);
						}
					}}
				/>
			) : null}

			{requirementText.length > 0 ? (
				<div className="contract-points-shop-requirements">
					<strong>Requires:</strong>
					<ul>
						{requirementText.map((entry) => (
							<li key={entry}>{entry}</li>
						))}
					</ul>
				</div>
			) : (
				<p className="contract-points-shop-open-requirements">No unlock requirements.</p>
			)}

			{hasWindow ? (
				<p className="contract-points-shop-window">
					Available: {startAtText || 'Any time'} - {endAtText || 'No end date'}
				</p>
			) : null}

			<div className="contract-points-shop-actions">
				<label>
					Buy: 
					<input
						type="number"
						min={1}
						max={999}
						value={safePurchaseCount}
						onChange={handleQuantityInput}
						disabled={isBusy}
					/>
				</label>
				<button
					type="button"
					className="contract-button"
					onClick={handlePurchaseClick}
					disabled={isBusy || !item?.isEligible}
				>
					Purchase ({totalCost} Contract Points)
				</button>
			</div>
		</article>
	);
};

export default ContractPointsShopItem;
