/** @type {Record<string, string>} */
export const BLOCK_TEXTURES = import.meta.glob('../Assets/Blocks/*.{png,jpg,jpeg,webp,gif,svg}', {
	eager: true,
	import: 'default',
});

/** @type {Record<string, string>} */
export const BLOCK_TEXTURE_BY_FILE = Object.fromEntries(
	Object.entries(BLOCK_TEXTURES).map(([modulePath, assetUrl]) => [
		modulePath.split('/').pop().toLowerCase(),
		assetUrl,
	])
);

export const DEFAULT_BLOCK_HEALTH = 10;
export const MINING_NODE_TYPE_ID = 1;
export const MINING_SKILL_NAME = 'mining';
export const MINED_SESSION_STORAGE_KEY = 'miningSessionMinedByOutputItem';

export const getUnlockedNodesStorageKey = (playerId) => `miningUnlockedNodesByPlayer_${playerId ?? 'guest'}`;

export const loadMinedSessionMap = () => {
	try {
		const raw = localStorage.getItem(MINED_SESSION_STORAGE_KEY);
		if (!raw) {
			return {};
		}

		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return {};
		}

		return parsed;
	} catch (error) {
		console.warn('Failed to parse mined session map:', error);
		return {};
	}
};

export const loadUnlockedNodeMap = (storageKey) => {
	try {
		const raw = localStorage.getItem(storageKey);
		if (!raw) {
			return {};
		}

		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return {};
		}

		return parsed;
	} catch (error) {
		console.warn('Failed to parse unlocked nodes map:', error);
		return {};
	}
};

export const toNumberOrNull = (value) => {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

export const toBoolean = (value, fallback = false) => {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'number') {
		return value !== 0;
	}

	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true' || normalized === '1') {
			return true;
		}
		if (normalized === 'false' || normalized === '0') {
			return false;
		}
	}

	return fallback;
};

export const getAuthHeaders = () => {
	const accessToken = localStorage.getItem('accessToken');

	if (!accessToken) {
		return {};
	}

	return {
		Authorization: `Bearer ${accessToken}`,
	};
};

export const resolveIconPath = (iconPath, textureByFile) => {
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

	return fileName ? (textureByFile[fileName] ?? '') : '';
};

export const normalizeNode = (node) => ({
	idNode: toNumberOrNull(node.idNode ?? node.IdNode),
	fkNodetypeidNodeType: toNumberOrNull(node.fkNodetypeidNodeType ?? node.FkNodetypeidNodeType),
	fkNodeitemidItem: toNumberOrNull(node.fkNodeitemidItem ?? node.FkNodeitemidItem),
	fkOutputitemidItem: toNumberOrNull(node.fkOutputitemidItem ?? node.FkOutputitemidItem),
	requiredLevel: toNumberOrNull(node.requiredLevel ?? node.RequiredLevel) ?? 1,
	isUnlocked: toBoolean(node.isUnlocked ?? node.IsUnlocked, false),
	unlockPrice: toNumberOrNull(node.unlockPrice ?? node.UnlockPrice) ?? 0,
	xpReward: toNumberOrNull(node.xpReward ?? node.XpReward) ?? 0,
	baseYieldQty: toNumberOrNull(
		node.baseYieldQty
			?? node.BaseYieldQty
			?? node.minimumYieldQty
			?? node.MinimumYieldQty
			?? node.minYieldQty
			?? node.MinYieldQty
	) ?? 1,
	respawnMs: toNumberOrNull(node.respawnMs ?? node.RespawnMs) ?? 3000,
	nodeHealth: toNumberOrNull(node.nodeHealth ?? node.NodeHealth) ?? DEFAULT_BLOCK_HEALTH,
	requiredToolType: node.requiredToolType ?? node.RequiredToolType ?? '',
	zone: node.zone ?? node.Zone ?? 'Unzoned',
	isEnabled: toBoolean(node.isEnabled ?? node.IsEnabled, true),
});

export const normalizeItem = (item) => ({
	idItem: toNumberOrNull(item.idItem ?? item.IdItem),
	name: item.name ?? item.Name ?? 'Unknown Item',
	icon: item.icon ?? item.Icon ?? '',
	fkCollectionidCollection: toNumberOrNull(item.fkCollectionidCollection ?? item.FkCollectionidCollection),
});
