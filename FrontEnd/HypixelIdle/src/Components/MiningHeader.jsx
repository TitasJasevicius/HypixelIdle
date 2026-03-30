const MiningHeader = ({
	selectedZone,
	onOpenZone,
	hasZones,
	onOpenNode,
	hasNodesInZone,
	selectedNodeButtonLabel,
	isLoadingNodes,
	isLoadingSkill,
	nodeError,
	skillError,
	dropError,
	playerMiningLevel,
	selectedNode,
	isSelectedNodeUnlocked,
	selectedNodeRequiredLevel,
}) => (
	<header className="mining-header">
		<div className="mining-header-top">
			<h1>Mining Nodes</h1>
			<div className="mining-header-actions">
				<button
					type="button"
					className="zone-picker-button"
					onClick={onOpenZone}
					disabled={!hasZones}
				>
					Select Zone: {selectedZone || 'None'}
				</button>
				<button
					type="button"
					className="zone-picker-button"
					onClick={onOpenNode}
					disabled={!hasNodesInZone}
				>
					Select Node: {selectedNodeButtonLabel}
				</button>
			</div>
		</div>
		{isLoadingNodes ? <p>Loading node data...</p> : null}
		{isLoadingSkill ? <p>Loading mining level...</p> : null}
		{nodeError ? <p>{nodeError}</p> : null}
		{skillError ? <p>{skillError}</p> : null}
		{dropError ? <p>{dropError}</p> : null}
		<p className="node-meta">Mining level: {playerMiningLevel}</p>
		{selectedNode && !isSelectedNodeUnlocked ? (
			<p className="node-meta">Locked until Mining level {selectedNodeRequiredLevel}.</p>
		) : null}
		{selectedNode?.requiredToolType ? (
			<p className="node-meta">Required tool: {selectedNode.requiredToolType}</p>
		) : null}
	</header>
);

export default MiningHeader;
