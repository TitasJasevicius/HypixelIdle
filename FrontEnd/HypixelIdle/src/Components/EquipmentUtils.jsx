import axios from 'axios';

const normalizeText = (value) => (value ?? '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const EQUIPMENT_CATEGORY_NAMES = ['Equipment_armor', 'Equipment_jewelery'];
const EQUIPMENT_CATEGORY_KEYS = new Set(EQUIPMENT_CATEGORY_NAMES.map((value) => normalizeText(value)));

const toDisplayLabel = (value) => {
	if (!value || typeof value !== 'string') {
		return '';
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return '';
	}

	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const nameMatchesSlotKey = (normalizedItemName, normalizedSlotKey) => {
	if (!normalizedItemName || !normalizedSlotKey) {
		return false;
	}

	if (normalizedItemName.includes(normalizedSlotKey)) {
		return true;
	}

	if (normalizedSlotKey.endsWith('s')) {
		const singular = normalizedSlotKey.slice(0, -1);
		if (singular && normalizedItemName.includes(singular)) {
			return true;
		}
	} else if (normalizedItemName.includes(`${normalizedSlotKey}s`)) {
		return true;
	}

	return false;
};

const getAuthHeaders = () => {
	const accessToken = localStorage.getItem('accessToken');
	if (!accessToken) {
		return {};
	}

	return {
		Authorization: `Bearer ${accessToken}`,
	};
};

export const fetchEquipmentSlotDefinitions = async () => {
	const response = await axios.get('http://localhost:5091/api/PlayerEquipment/GetEquipmentTypes', {
		headers: {
			Accept: 'application/json',
			...getAuthHeaders(),
		},
	});

	const rows = Array.isArray(response.data) ? response.data : [];

	return rows
		.map((row) => {
			const id = row.idEquipmentTypes ?? row.IdEquipmentTypes;
			const rawName = row.name ?? row.Name ?? '';
			const key = getEquipmentSlotKeyFromBackendName(rawName);

			if (!key || id == null) {
				return null;
			}

			return {
				id,
				key,
				label: toDisplayLabel(rawName),
				name: rawName,
			};
		})
		.filter(Boolean);
};

export const isEquipmentItem = (item) => {
	const category = normalizeText(item?.itemCategory ?? item?.ItemCategory ?? item?.category ?? item?.Category);
	return EQUIPMENT_CATEGORY_KEYS.has(category);
};

export const getEquipmentSlotKeyForItem = (item, slotDefinitions = []) => {
	if (!isEquipmentItem(item)) {
		return null;
	}

	if (!Array.isArray(slotDefinitions) || !slotDefinitions.length) {
		return null;
	}

	const normalizedName = normalizeText(item?.itemName ?? item?.ItemName ?? item?.name ?? item?.Name);

	for (const slot of slotDefinitions) {
		const slotKey = normalizeText(slot?.key ?? slot?.name ?? slot?.label);
		if (!slotKey) {
			continue;
		}

		if (nameMatchesSlotKey(normalizedName, slotKey)) {
			return slotKey;
		}
	}

	return null;
};

export const getEquipmentSlotLabelForItem = (item, slotDefinitions = []) => {
	const slotKey = getEquipmentSlotKeyForItem(item, slotDefinitions);
	if (!slotKey) {
		return null;
	}

	const slot = slotDefinitions.find((entry) => entry.key === slotKey);
	return slot?.label ?? null;
};

export const getEquipmentSlotKeyFromBackendName = (slotName) => {
	return normalizeText(slotName);
};
