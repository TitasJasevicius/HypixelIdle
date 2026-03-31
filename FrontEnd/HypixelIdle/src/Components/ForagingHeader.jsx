const ForagingHeader = ({
	title = 'Foraging Nodes',
	skillLabel = 'Foraging',
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
	playerForagingLevel,
	selectedNode,
	isSelectedNodeUnlocked,
	selectedNodeRequiredLevel,
}) => (
	<header className="foraging-header">
		<div className="foraging-header-top">
			<h1>{title}</h1>
			<div className="foraging-header-actions">
				<button
					type="button"
					className="foraging-zone-picker-button"
					onClick={onOpenZone}
					disabled={!hasZones}
				>
					Select Zone: {selectedZone || 'None'}
				</button>
				<button
					type="button"
					className="foraging-zone-picker-button"
					onClick={onOpenNode}
					disabled={!hasNodesInZone}
				>
					Select Node: {selectedNodeButtonLabel}
				</button>
			</div>
		</div>
		{isLoadingNodes ? <p>Loading node data...</p> : null}
		{isLoadingSkill ? <p>Loading {skillLabel.toLowerCase()} level...</p> : null}
		{nodeError ? <p>{nodeError}</p> : null}
		{skillError ? <p>{skillError}</p> : null}
		{dropError ? <p>{dropError}</p> : null}
		<p className="foraging-node-meta">{skillLabel} level: {playerForagingLevel}</p>
		{selectedNode && !isSelectedNodeUnlocked ? (
			<p className="foraging-node-meta">Locked until {skillLabel} level {selectedNodeRequiredLevel}.</p>
		) : null}
		{selectedNode?.requiredToolType ? (
			<p className="foraging-node-meta">Required tool: {selectedNode.requiredToolType}</p>
		) : null}
	</header>
);

export default ForagingHeader;
