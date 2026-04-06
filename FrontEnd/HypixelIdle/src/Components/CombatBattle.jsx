import { ATTACK_STYLES, formatDropChancePercent, formatDropQuantityRange } from './CombatUtils';
import { BLOCK_TEXTURE_BY_FILE, resolveIconPath } from './MiningUtils';
import CombatRangedSetup from './CombatRangedSetup';

const CombatBattle = ({
	selectedMob,
	selectedMobIconPath,
	attackStyle,
	setAttackStyle,
	isBattling,
	canManualAttack,
	canAutoBattle,
	isRangedStartBlocked,
	canUseRanged,
	isMeleeStyleSelected,
	isRangedStyleSelected,
	currentPlayerCombatLevel,
	playerHealth,
	playerMaxHealth,
	enemyHealth,
	onStartBattle,
	onPerformAttack,
	onStopAuto,
	onOpenDropsModal,
	selectedMobDrops,
	canShowMobDrops,
	lootResults,
	battleLog,
	rewardMessage,
	isRollingLoot,
	bowSlot,
	arrowSlot,
	bowSlotMessage,
	arrowSlotMessage,
	onLoadBow,
	onClearBow,
	onLoadArrows,
	onClearArrows,
	resolveIcon,
}) => {
	const selectedMobLabel = selectedMob ? `${selectedMob.name} (${selectedMob.mobType})` : 'No mob selected';
	const selectedMobLocation = selectedMob?.location?.trim() || 'Unknown';

	return (
		<section className="combat-arena" aria-label="Combat arena">
			<div className="combat-arena-top">
				<div className="combat-creature-card">
					<div className="combat-creature-portrait">
						{selectedMobIconPath ? <img src={selectedMobIconPath} alt={selectedMob?.name ?? 'Mob'} /> : <span>{selectedMob?.name?.slice(0, 2) ?? '??'}</span>}
					</div>
					<div>
						<h2>{selectedMobLabel}</h2>
						<p>Skill XP: {selectedMob?.skillXpTypeName || 'None'} {selectedMob?.skillXpAmount ? `+${selectedMob.skillXpAmount}` : ''}</p>
					</div>
				</div>

				<div className="combat-stat-grid">
					<article>
						<span>Player HP</span>
						<strong>{playerHealth}/{playerMaxHealth}</strong>
					</article>
					<article>
						<span>Enemy HP</span>
						<strong>{enemyHealth}/{selectedMob?.baseHealth ?? 0}</strong>
					</article>
					<article>
						<span>Combat Skill</span>
						<strong>{currentPlayerCombatLevel > 0 ? `Level ${currentPlayerCombatLevel}` : 'Untrained'}</strong>
					</article>
				</div>
			</div>

			<div className="combat-hp-shell">
				<div className="combat-hp-fill combat-hp-fill-player" style={{ width: `${playerMaxHealth > 0 ? Math.max(0, Math.min(100, (playerHealth / playerMaxHealth) * 100)) : 0}%` }} />
			</div>
			<div className="combat-hp-shell enemy-shell">
				<div className="combat-hp-fill combat-hp-fill-enemy" style={{ width: `${selectedMob?.baseHealth ? Math.max(0, Math.min(100, (enemyHealth / selectedMob.baseHealth) * 100)) : 0}%` }} />
			</div>

			<div className="combat-controls">
				<div className="combat-style-switch">
					{Object.entries(ATTACK_STYLES).map(([styleKey, style]) => (
						<button
							key={styleKey}
							type="button"
							className={`combat-style-button ${attackStyle === styleKey ? 'active' : ''}`}
							onClick={() => setAttackStyle(styleKey)}
						>
							{style.label}
						</button>
					))}
				</div>

				{isRangedStyleSelected ? (
					<CombatRangedSetup
						bowSlot={bowSlot}
						arrowSlot={arrowSlot}
						bowSlotMessage={bowSlotMessage}
						arrowSlotMessage={arrowSlotMessage}
						onLoadBow={onLoadBow}
						onClearBow={onClearBow}
						onLoadArrows={onLoadArrows}
						onClearArrows={onClearArrows}
						resolveIcon={resolveIcon}
					/>
				) : null}

				{isRangedStyleSelected && !canUseRanged ? <p className="combat-ranged-hint">{bowSlot ? 'Load arrows into the arrow slot to use ranged mode.' : 'Load a bow into the bow slot, then load arrows.'}</p> : null}

				<div className="combat-action-row">
					<button type="button" className="combat-action-button primary" disabled={!selectedMob || isBattling || isRangedStartBlocked} onClick={() => onStartBattle(selectedMob)}>
						Start Fight
					</button>
					<button type="button" className="combat-action-button" disabled={!isBattling || !canManualAttack || !isMeleeStyleSelected} onClick={() => onPerformAttack('melee')}>
						Melee Attack
					</button>
					<button type="button" className="combat-action-button" disabled={!isBattling || !canManualAttack || !isRangedStyleSelected || !canUseRanged} onClick={() => onPerformAttack('ranged')}>
						Ranged Shot
					</button>
					<button type="button" className="combat-action-button secondary" disabled={!isBattling || !canAutoBattle} onClick={onStopAuto}>
						Stop Auto
					</button>
				</div>

				{rewardMessage ? <p className="combat-reward-message">{rewardMessage}</p> : null}
				{isRollingLoot ? <p className="combat-loot-status">Rolling drops...</p> : null}
			</div>

			<section className="combat-loot-panel" aria-label="Loot rolls">
				<div className="combat-loot-panel-header">
					<h3>Drop Roll</h3>
					<button
						type="button"
						className="combat-action-button"
						onClick={onOpenDropsModal}
						disabled={!selectedMob}
					>
						View Mob Drops
					</button>
				</div>
				{canShowMobDrops ? (
					<div className="combat-loot-list">
						{lootResults.map((loot) => {
							const lootIcon = loot.itemIcon ? resolveIconPath(loot.itemIcon, BLOCK_TEXTURE_BY_FILE) : '';
							return (
								<div className="combat-loot-item" key={`${loot.itemId}-${loot.itemName}`}>
									<div className="combat-loot-icon">{lootIcon ? <img src={lootIcon} alt={loot.itemName} /> : <span>{loot.itemName.slice(0, 2)}</span>}</div>
									<div>
										<strong>{loot.itemName}</strong>
										<p>x{loot.quantity}</p>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<p className="combat-empty-state">No loot rolled yet.</p>
				)}
			</section>

			<section className="combat-log-panel" aria-label="Battle log">
				<h3>Battle Log</h3>
				{battleLog.length > 0 ? (
					<ul>
						{battleLog.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}
					</ul>
				) : (
					<p className="combat-empty-state">No combat actions yet.</p>
				)}
			</section>
		</section>
	);
};

export default CombatBattle;
