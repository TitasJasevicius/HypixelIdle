import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDisplayName } from './DisplayNameUtils';

const BASE_POINTER_SPEED_DEG_PER_SEC = 120;
const SPEED_PER_COMBO_DEG_PER_SEC = 22;
const MAX_POINTER_SPEED_DEG_PER_SEC = 520;
const SPECIAL_ZONE_MIN_WIDTH_DEG = 20;
const SPECIAL_ZONE_MAX_WIDTH_DEG = 32;
const GREEN_HIT_TOLERANCE_DEG = 3;

const normalizeAngle = (value) => {
	const mod = value % 360;
	return mod < 0 ? mod + 360 : mod;
};

const shortestAngularDistance = (a, b) => {
	const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
	return Math.min(diff, 360 - diff);
};

const getRandomZoneConfig = () => {
	const specialWidthDeg = SPECIAL_ZONE_MIN_WIDTH_DEG + Math.random() * (SPECIAL_ZONE_MAX_WIDTH_DEG - SPECIAL_ZONE_MIN_WIDTH_DEG);
	const specialCenterDeg = Math.random() * 360;

	return {
		specialCenterDeg,
		specialWidthDeg,
	};
};

const getMaxStackSize = (item) => {
	const rawStack = Number(item?.stackValue ?? item?.StackValue);
	if (Number.isFinite(rawStack) && rawStack > 0) {
		return Math.floor(rawStack);
	}

	return 64;
};

const ForagingSkillCheckEvent = ({
	item,
	comboStreak = 0,
	onResolve,
	isCollecting,
}) => {
	const [pointerAngleDeg, setPointerAngleDeg] = useState(0);
	const [zoneConfig, setZoneConfig] = useState(getRandomZoneConfig);
	const rafIdRef = useRef(null);
	const lastFrameMsRef = useRef(null);
	const specialZoneRef = useRef(null);
	const pointerRef = useRef(null);

	const pointerSpeedDegPerSec = useMemo(() => (
		Math.min(
			MAX_POINTER_SPEED_DEG_PER_SEC,
			BASE_POINTER_SPEED_DEG_PER_SEC + (Math.max(0, comboStreak) * SPEED_PER_COMBO_DEG_PER_SEC)
		)
	), [comboStreak]);

	useEffect(() => {
		setPointerAngleDeg(0);
		setZoneConfig(getRandomZoneConfig());
	}, [item?.idItem]);

	useEffect(() => {
		if (!item) {
			return undefined;
		}

		const animate = (timestamp) => {
			if (lastFrameMsRef.current == null) {
				lastFrameMsRef.current = timestamp;
			}

			const deltaSec = (timestamp - lastFrameMsRef.current) / 1000;
			lastFrameMsRef.current = timestamp;

			setPointerAngleDeg((prev) => normalizeAngle(prev + (pointerSpeedDegPerSec * deltaSec)));
			rafIdRef.current = window.requestAnimationFrame(animate);
		};

		rafIdRef.current = window.requestAnimationFrame(animate);

		return () => {
			if (rafIdRef.current != null) {
				window.cancelAnimationFrame(rafIdRef.current);
			}
			rafIdRef.current = null;
			lastFrameMsRef.current = null;
		};
	}, [item, pointerSpeedDegPerSec]);

	useEffect(() => {
		if (!specialZoneRef.current) {
			return;
		}

		specialZoneRef.current.style.setProperty('--special-zone-rotate', `${zoneConfig.specialCenterDeg - (zoneConfig.specialWidthDeg / 2)}deg`);
		specialZoneRef.current.style.setProperty('--special-zone-width', `${zoneConfig.specialWidthDeg}deg`);
	}, [zoneConfig]);

	useEffect(() => {
		if (!pointerRef.current) {
			return;
		}

		pointerRef.current.style.setProperty('--pointer-angle', `${pointerAngleDeg}deg`);
	}, [pointerAngleDeg]);

	if (!item) {
		return null;
	}

	const displayName = formatDisplayName(item.name ?? 'Apple');

	const handleSkillCheckClick = () => {
		if (isCollecting) {
			return;
		}

		const distanceToSpecialCenter = shortestAngularDistance(pointerAngleDeg, zoneConfig.specialCenterDeg);
		const hitGreenZone = distanceToSpecialCenter <= ((zoneConfig.specialWidthDeg / 2) + GREEN_HIT_TOLERANCE_DEG);

		const hitZone = hitGreenZone ? 'green' : 'regular';
		const quantityByZone = hitGreenZone ? 2 : 1;
		const quantity = Math.min(getMaxStackSize(item), quantityByZone);
		const nextCombo = hitGreenZone
			? (Math.max(0, comboStreak) + 1)
			: 0;

		onResolve?.({
			quantity,
			hitZone,
			isSpecialHit: hitGreenZone,
			nextCombo,
			displayName,
		});
	};

	return (
		<div className="foraging-skill-check-modal-overlay" role="presentation">
			<section
				className="foraging-skill-check-modal"
				role="dialog"
				aria-modal="true"
				aria-label={`Skill check for ${displayName}`}
			>
				<h3 className="foraging-skill-check-title">{displayName} Skill Check</h3>
				<div className="foraging-skill-check-ring">
					<div ref={specialZoneRef} className="foraging-skill-check-special-zone" />
					<div ref={pointerRef} className="foraging-skill-check-pointer" />
					<div className="foraging-skill-check-center">
						<span className="foraging-skill-check-center-dot" />
					</div>
				</div>
				<div className="foraging-skill-check-actions">
					<button
						type="button"
						className="foraging-zone-picker-button"
						onMouseDown={(event) => {
							event.preventDefault();
							handleSkillCheckClick();
						}}
						onTouchStart={(event) => {
							event.preventDefault();
							handleSkillCheckClick();
						}}
						onClick={(event) => event.preventDefault()}
						disabled={isCollecting}
					>
						Hit
					</button>
				</div>
			</section>
		</div>
	);
};

export default ForagingSkillCheckEvent;