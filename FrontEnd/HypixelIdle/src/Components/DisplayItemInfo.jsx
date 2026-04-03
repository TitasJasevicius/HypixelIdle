import { useMemo } from 'react';
import { formatDisplayName } from './DisplayNameUtils';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const DisplayItemInfo = ({
	item,
	stats = [],
	anchorRect,
	iconPath = '',
	isVisible = false,
}) => {
	const positionStyle = useMemo(() => {
		if (!anchorRect || !isVisible) {
			return null;
		}

		const tooltipWidth = 280;
		const viewportWidth = window.innerWidth || 1280;
		const left = clamp(
			anchorRect.left + (anchorRect.width / 2) - (tooltipWidth / 2),
			8,
			viewportWidth - tooltipWidth - 8
		);

		return {
			left: `${left}px`,
			top: `${Math.max(8, anchorRect.top - 14)}px`,
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
		</div>
	);
};

export default DisplayItemInfo;
