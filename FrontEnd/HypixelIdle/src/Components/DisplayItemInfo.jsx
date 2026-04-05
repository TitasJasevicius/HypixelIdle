import { useMemo } from 'react';
import { formatDisplayName } from './DisplayNameUtils';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const DisplayItemInfo = ({
	item,
	stats = [],
	anchorRect,
	iconPath = '',
	isVisible = false,
	primaryActionLabel = '',
	onPrimaryAction = null,
	primaryActionDisabled = false,
	primaryActionHint = '',
}) => {
	const positionStyle = useMemo(() => {
		if (!anchorRect || !isVisible) {
			return null;
		}

		const viewportWidth = window.innerWidth || 1280;
		const viewportHeight = window.innerHeight || 720;
		const tooltipWidth = Math.max(180, Math.min(236, viewportWidth - 16));
		const tooltipEstimatedHeight = Math.min(260, Math.max(140, Math.floor(viewportHeight * 0.4)));
		const maxLeft = Math.max(8, viewportWidth - tooltipWidth - 8);
		const left = clamp(
			anchorRect.left + (anchorRect.width / 2) - (tooltipWidth / 2),
			8,
			maxLeft
		);

		const spaceAbove = Math.max(0, anchorRect.top - 8);
		const spaceBelow = Math.max(0, viewportHeight - anchorRect.bottom - 8);
		const placeAbove = spaceAbove >= tooltipEstimatedHeight || spaceAbove >= spaceBelow;
		const top = placeAbove
			? clamp(anchorRect.top - 14, tooltipEstimatedHeight + 8, viewportHeight - 8)
			: clamp(anchorRect.bottom + 14, 8, viewportHeight - tooltipEstimatedHeight - 8);

		return {
			left: `${left}px`,
			top: `${top}px`,
			transform: placeAbove ? 'translateY(-100%)' : 'translateY(0)',
		};
	}, [anchorRect, isVisible]);

	if (!item || !isVisible) {
		return null;
	}

	const displayName = formatDisplayName(item.itemName ?? item.ItemName ?? `Item ${item.fkItemidItem}`);

	return (
		<div className="item-info-popover" style={positionStyle ?? undefined} role="dialog" aria-label="Selected item details">
			<div className="item-info-title-row">
				{iconPath ? <img src={iconPath} alt={displayName} className="item-info-icon" /> : null}
				<h4>{displayName}</h4>
			</div>

			{stats.length > 0 ? (
				<div className="item-info-stats">
					{stats.map((stat) => (
						<p key={`${stat.name}-${stat.value}-${stat.percentageValue}`}>
							<span className="item-info-stat-name">{stat.name}:</span>{' '}
							<span className="item-info-stat-value">{stat.displayValue}</span>
						</p>
					))}
				</div>
			) : (
				<p className="item-info-empty">No stats available.</p>
			)}

			{primaryActionLabel && onPrimaryAction ? (
				<button
					type="button"
					className="item-info-action-button"
					onClick={onPrimaryAction}
					disabled={primaryActionDisabled}
					title={primaryActionHint || primaryActionLabel}
				>
					{primaryActionLabel}
				</button>
			) : null}
		</div>
	);
};

export default DisplayItemInfo;
