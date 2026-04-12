import { useState } from 'react';
import ForagingSkillCheckEvent from './ForagingSkillCheckEvent';
import { formatDisplayName } from './DisplayNameUtils';

const LEGACY_APPLE_CATEGORY_NAME = 'foraging_apple_event';
const FRUIT_EVENT_CATEGORY_PREFIX = 'foraging_event_fruit_';
const normalizeCategory = (value) =>
	String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '_');

export const isForagingAppleEventItem = (item) =>
	(() => {
		const category = normalizeCategory(item?.category);
		return category === LEGACY_APPLE_CATEGORY_NAME || category.startsWith(FRUIT_EVENT_CATEGORY_PREFIX);
	})();

const getAppleValue = (item) => {
	const explicitValue = Number(item?.value ?? item?.Value);
	if (Number.isFinite(explicitValue) && explicitValue > 0) {
		return explicitValue;
	}

	const sellValue = Number(item?.sellValue);
	if (Number.isFinite(sellValue) && sellValue > 0) {
		return sellValue;
	}

	const stackValue = Number(item?.stackValue);
	if (Number.isFinite(stackValue) && stackValue > 0) {
		return stackValue;
	}

	return 1;
};

export const getRandomAppleOverlayPosition = () => ({
	leftPercent: 8 + Math.random() * 84,
	topPercent: 12 + Math.random() * 70,
});

export const getForagingAppleSpawnChance = (item) => {
	const value = getAppleValue(item);

	
	// value=10 => 10% and value=1000 => 1%
	const chance = Math.sqrt(0.1 / value);
	return Math.max(0, Math.min(1, chance));
};

export const rollForagingAppleSpawn = (appleItems) => {
	if (!Array.isArray(appleItems) || !appleItems.length) {
		return null;
	}

	const sortedByValueDesc = [...appleItems].sort((a, b) => {
		const valueA = Number(a?.stackValue ?? a?.sellValue ?? 0);
		const valueB = Number(b?.stackValue ?? b?.sellValue ?? 0);
		return valueB - valueA;
	});

	for (const item of sortedByValueDesc) {
		if (Math.random() < getForagingAppleSpawnChance(item)) {
			return item;
		}
	}

	return null;
};

const ForagingAppleSpecialEvent = ({
	appleItem,
	appleIcon,
	position,
	comboStreak = 0,
	onResolve,
	isCollecting,
}) => {
	const [isSkillCheckOpen, setIsSkillCheckOpen] = useState(false);

	if (!appleItem) {
		return null;
	}

	const displayName = formatDisplayName(appleItem.name ?? 'Apple');

	const handleResolve = (result) => {
		onResolve?.(result);
		setIsSkillCheckOpen(false);
	};

	return (
		<>
			<button
				type="button"
				className="foraging-apple-event-button"
				style={position ? { left: `${position.leftPercent}%`, top: `${position.topPercent}%` } : undefined}
				onClick={() => setIsSkillCheckOpen(true)}
				disabled={isCollecting}
				aria-label={`Collect ${displayName}`}
				title={displayName}
			>
				{appleIcon ? (
					<img src={appleIcon} alt={displayName} className="foraging-apple-event-icon" />
				) : (
					<span className="foraging-apple-event-fallback">{displayName}</span>
				)}
			</button>

			{isSkillCheckOpen ? (
				<ForagingSkillCheckEvent
					item={appleItem}
					comboStreak={comboStreak}
					onResolve={handleResolve}
					isCollecting={isCollecting}
				/>
			) : null}
		</>
	);
};

export default ForagingAppleSpecialEvent;
