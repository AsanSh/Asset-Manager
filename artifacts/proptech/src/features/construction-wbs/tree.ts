import type { FlatWbsNode, WbsStage } from "./types";

export const WBS_INDENT_PX = 28;

export function stageParentId(s: WbsStage): number | null {
	const raw = s.parentStageId ?? (s as WbsStage & { parent_stage_id?: number | null }).parent_stage_id;
	if (raw == null) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
}

function bySortOrder(a: WbsStage, b: WbsStage) {
	return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id;
}

export function buildChildrenMap(stages: WbsStage[]): Map<number | null, WbsStage[]> {
	const map = new Map<number | null, WbsStage[]>();
	const ids = new Set(stages.map((s) => s.id));

	for (const s of stages) {
		let pid = stageParentId(s);
		if (pid != null && !ids.has(pid)) pid = null;
		const arr = map.get(pid) ?? [];
		arr.push(s);
		map.set(pid, arr);
	}
	for (const arr of map.values()) arr.sort(bySortOrder);
	return map;
}

export function collectDescendantIds(stages: WbsStage[], rootId: number): Set<number> {
	const childrenMap = buildChildrenMap(stages);
	const out = new Set<number>();
	const stack = [...(childrenMap.get(rootId) ?? [])];
	while (stack.length) {
		const node = stack.pop()!;
		out.add(node.id);
		stack.push(...(childrenMap.get(node.id) ?? []));
	}
	return out;
}

export function flattenWbsTree(
	stages: WbsStage[],
	metricsById: Map<number, FlatWbsNode["metrics"]>,
): FlatWbsNode[] {
	const childrenMap = buildChildrenMap(stages);
	const result: FlatWbsNode[] = [];
	const emptyMetrics = (): FlatWbsNode["metrics"] => ({
		budgetKgs: 0,
		spentKgs: 0,
		remainderKgs: 0,
		deviationKgs: 0,
		planPct: 0,
		factPct: 0,
		taskCount: 0,
		issueCount: 0,
		childCount: 0,
		effectiveProgress: 0,
	});

	function walk(parentId: number | null, depth: number, codePrefix: number[]) {
		const children = childrenMap.get(parentId) ?? [];
		for (let i = 0; i < children.length; i++) {
			const s = children[i];
			const codeParts = [...codePrefix, i + 1];
			const childList = childrenMap.get(s.id) ?? [];
			result.push({
				id: s.id,
				stage: s,
				depth,
				parentId: stageParentId(s),
				wbsCode: codeParts.join("."),
				childrenCount: childList.length,
				metrics: metricsById.get(s.id) ?? emptyMetrics(),
			});
			walk(s.id, depth + 1, codeParts);
		}
	}

	walk(null, 0, []);

	const placed = new Set(result.map((n) => n.id));
	for (const s of stages) {
		if (!placed.has(s.id)) {
			result.push({
				id: s.id,
				stage: s,
				depth: 0,
				parentId: null,
				wbsCode: "?",
				childrenCount: (childrenMap.get(s.id) ?? []).length,
				metrics: metricsById.get(s.id) ?? emptyMetrics(),
			});
		}
	}
	return result;
}

export function flatToReorderPayload(flat: FlatWbsNode[]): { id: number; parentStageId: number | null }[] {
	return flat.map((n) => ({ id: n.id, parentStageId: n.parentId }));
}

/** Parent for target depth based on flat list before insert position */
export function resolveParentId(
	flatWithoutActive: FlatWbsNode[],
	insertIndex: number,
	targetDepth: number,
): number | null {
	if (targetDepth <= 0) return null;
	for (let i = insertIndex - 1; i >= 0; i--) {
		if (flatWithoutActive[i].depth === targetDepth - 1) return flatWithoutActive[i].id;
		if (flatWithoutActive[i].depth < targetDepth - 1) break;
	}
	if (insertIndex > 0 && flatWithoutActive[insertIndex - 1].depth >= targetDepth - 1) {
		return flatWithoutActive[insertIndex - 1].id;
	}
	return null;
}

export function depthFromPointer(clientX: number, rowLeft: number, maxDepth: number): number {
	const relative = clientX - rowLeft - 48;
	const depth = Math.round(relative / WBS_INDENT_PX);
	return Math.max(0, Math.min(maxDepth, depth));
}

export function projectTreeMove(
	stages: WbsStage[],
	flat: FlatWbsNode[],
	activeId: number,
	overId: number,
	targetDepth: number,
): FlatWbsNode[] | null {
	if (activeId === overId) return null;
	const descendants = collectDescendantIds(stages, activeId);
	if (descendants.has(overId)) return null;

	const activeNode = flat.find((n) => n.id === activeId);
	if (!activeNode) return null;

	const withoutActive = flat.filter((n) => n.id !== activeId && !descendants.has(n.id));
	let overIndex = withoutActive.findIndex((n) => n.id === overId);
	if (overIndex < 0) overIndex = withoutActive.length;

	const maxDepth = withoutActive[overIndex]?.depth != null
		? withoutActive[overIndex].depth + 1
		: 0;
	const depth = Math.min(targetDepth, maxDepth + (overIndex < withoutActive.length ? 1 : 0));
	const parentId = resolveParentId(withoutActive, overIndex, depth);

	const movedStage: WbsStage = {
		...activeNode.stage,
		parentStageId: parentId,
	};

	const nextStages = stages
		.filter((s) => s.id !== activeId && !descendants.has(s.id))
		.concat(movedStage);

	const childrenMap = buildChildrenMap(nextStages);
	const siblings = (parentId != null ? childrenMap.get(parentId) : childrenMap.get(null)) ?? [];
	const reorderedSiblings = [...siblings.filter((s) => s.id !== activeId)];
	const overSibling = withoutActive[overIndex];
	const insertSiblingIdx = overSibling
		? reorderedSiblings.findIndex((s) => s.id === overSibling.id)
		: reorderedSiblings.length;
	reorderedSiblings.splice(Math.max(0, insertSiblingIdx), 0, movedStage);

	const sortPatch = new Map<number, number>();
	reorderedSiblings.forEach((s, i) => sortPatch.set(s.id, (i + 1) * 10));

	const patchedStages = nextStages.map((s) =>
		sortPatch.has(s.id) ? { ...s, sortOrder: sortPatch.get(s.id)! } : s,
	);

	const metricsMap = new Map(flat.map((n) => [n.id, n.metrics]));
	return flattenWbsTree(patchedStages, metricsMap);
}
