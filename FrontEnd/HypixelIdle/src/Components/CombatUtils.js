import { formatDisplayName } from './DisplayNameUtils';
import { toNumberOrNull } from './MiningUtils';

export const ATTACK_STYLES = {
	melee: {
		label: 'Melee',
		baseMin: 16,
		baseMax: 24,
		intervalMs: 1100,
	},
	ranged: {
		label: 'Ranged',
		baseMin: 12,
		baseMax: 20,
		intervalMs: 1350,
	},
};

export const battleModes = [
	{ key: 'manual', label: 'Manual' },
	{ key: 'auto', label: 'Auto' },
];

export const getPlayerId = () => {
	const storedPlayerId = localStorage.getItem('playerId');
	if (!storedPlayerId) {
		return null;
	}

	const parsedPlayerId = Number(storedPlayerId);
	return Number.isNaN(parsedPlayerId) ? null : parsedPlayerId;
};

export const normalizeMob = (mob) => ({
	idMob: toNumberOrNull(mob.idMob ?? mob.IdMob),
	name: formatDisplayName(mob.name ?? mob.Name ?? 'Mob'),
	mobType: mob.mobType ?? mob.MobType ?? '',
	baseHealth: toNumberOrNull(mob.baseHealth ?? mob.BaseHealth) ?? 1,
	baseDamage: toNumberOrNull(mob.baseDamage ?? mob.BaseDamage) ?? 1,
	coinsOnDeath: toNumberOrNull(mob.coinsOnDeath ?? mob.CoinsOnDeath) ?? 0,
	expOrbs: toNumberOrNull(mob.expOrbs ?? mob.ExpOrbs) ?? 0,
	skillXpAmount: Number(mob.skillXpAmount ?? mob.SkillXpAmount ?? 0),
	location: mob.location ?? mob.Location ?? '',
	icon: mob.icon ?? mob.Icon ?? '',
	skillXpType: toNumberOrNull(mob.skillXpType ?? mob.SkillXpType),
	skillXpTypeName: (mob.skillXpTypeName ?? mob.SkillXpTypeName ?? '').trim(),
	drops: Array.isArray(mob.drops ?? mob.Drops)
		? (mob.drops ?? mob.Drops).map((drop) => ({
			idMobDropTable: toNumberOrNull(drop.idMobDropTable ?? drop.IdMobDropTable),
			itemId: toNumberOrNull(drop.itemId ?? drop.ItemId),
			itemName: formatDisplayName(drop.itemName ?? drop.ItemName ?? 'Item'),
			itemCategory: drop.itemCategory ?? drop.ItemCategory ?? '',
			itemIcon: drop.itemIcon ?? drop.ItemIcon ?? '',
			dropChance: Number(drop.dropChance ?? drop.DropChance ?? 0),
			minQuantity: toNumberOrNull(drop.minQuantity ?? drop.MinQuantity) ?? 1,
			maxQuantity: toNumberOrNull(drop.maxQuantity ?? drop.MaxQuantity) ?? 1,
		}))
		: [],
});

export const rollInteger = (min, max) => {
	const safeMin = Math.floor(Math.min(min, max));
	const safeMax = Math.floor(Math.max(min, max));
	return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
};

export const getDropQuantityRange = (minQuantity, maxQuantity) => {
	const parsedMin = Number(minQuantity);
	const parsedMax = Number(maxQuantity);
	const safeMin = Number.isFinite(parsedMin) ? Math.max(1, Math.floor(parsedMin)) : 1;
	const safeMax = Number.isFinite(parsedMax) ? Math.max(1, Math.floor(parsedMax)) : safeMin;

	return {
		min: Math.min(safeMin, safeMax),
		max: Math.max(safeMin, safeMax),
	};
};

export const rollDropQuantity = (minQuantity, maxQuantity) => {
	const range = getDropQuantityRange(minQuantity, maxQuantity);

	if (range.max > range.min) {
		return rollInteger(range.min, range.max);
	}

	return range.min;
};

export const formatDropQuantityRange = (minQuantity, maxQuantity) => {
	const range = getDropQuantityRange(minQuantity, maxQuantity);
	return range.min === range.max ? `x${range.min}` : `x${range.min}-${range.max}`;
};

export const calculateMitigatedDamage = (incomingDamage, defense) => {
	const safeIncomingDamage = Math.max(0, Number(incomingDamage) || 0);
	const safeDefense = Math.max(0, Number(defense) || 0);

	if (safeIncomingDamage <= 0) {
		return 0;
	}

	const damageMultiplier = 100 / (100 + safeDefense);
	const reducedDamage = Math.ceil(safeIncomingDamage * damageMultiplier);
	return Math.max(1, reducedDamage);
};

export const calculateEffectiveHealth = (health, defense) => {
	const safeHealth = Math.max(0, Number(health) || 0);
	const safeDefense = Math.max(0, Number(defense) || 0);
	return Math.floor(safeHealth * (1 + safeDefense / 100));
};
