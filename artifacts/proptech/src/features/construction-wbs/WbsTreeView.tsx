import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragMoveEvent,
	type DragOverEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { inferStageStatus, statusMeta } from "./status";
import {
	WBS_INDENT_PX,
	flatToReorderPayload,
	projectTreeMove,
} from "./tree";
import type { FlatWbsNode, WbsStage } from "./types";

function ProgressBar({ value, className }: { value: number; className?: string }) {
	const v = Math.min(100, Math.max(0, value));
	return (
		<div className={`flex items-center gap-2 min-w-[120px] ${className ?? ""}`}>
			<Progress value={v} className="h-1.5 flex-1 bg-gray-100 [&>div]:bg-amber-500" />
			<span className="text-[10px] font-semibold tabular-nums text-gray-600 w-8 text-right">
				{v}%
			</span>
		</div>
	);
}

function WbsRowContent({
	node,
	fmt,
	onSelect,
	onAddSub,
	isOverlay,
}: {
	node: FlatWbsNode;
	fmt: (kgs: number) => string;
	onSelect: (s: WbsStage) => void;
	onAddSub: (s: WbsStage) => void;
	isOverlay?: boolean;
}) {
	const st = inferStageStatus(node.stage, node.metrics);
	const meta = statusMeta(st);
	const behind = st === "behind";

	return (
		<div
			className={`flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 flex-1 min-w-0 py-2 pr-2 ${
				isOverlay ? "bg-white shadow-lg rounded-lg border border-amber-200 px-2" : ""
			}`}
			onClick={() => onSelect(node.stage)}
			onKeyDown={(e) => {
				if (e.key === "Enter") onSelect(node.stage);
			}}
			role="button"
			tabIndex={0}
		>
			<div className="flex items-center gap-2 min-w-0 flex-1">
				<span className="text-[11px] font-mono text-gray-600 w-10 shrink-0">{node.wbsCode}</span>
				<p className={`text-sm font-medium truncate ${behind ? "text-rose-800" : "text-gray-900"}`}>
					{node.stage.name}
				</p>
				<span className={`hidden md:inline-flex text-[10px] px-1.5 py-0.5 rounded border ${meta.badge}`}>
					{meta.label}
				</span>
			</div>
			<div className="hidden lg:block w-36 shrink-0">
				<ProgressBar value={node.metrics.effectiveProgress} />
			</div>
			<div className="hidden xl:flex items-center gap-3 text-[10px] text-gray-500 shrink-0">
				<span>
					Бюджет: <span className="font-semibold text-gray-800">{fmt(node.metrics.budgetKgs)}</span>
				</span>
				<span>
					Освоено: <span className="font-semibold text-amber-700">{fmt(node.metrics.spentKgs)}</span>
				</span>
				<span>
					Остаток:{" "}
					<span
						className={`font-semibold ${
							node.metrics.remainderKgs >= 0 ? "text-emerald-700" : "text-rose-700"
						}`}
					>
						{fmt(node.metrics.remainderKgs)}
					</span>
				</span>
			</div>
			<div className="flex items-center gap-2 text-[10px] text-gray-500 shrink-0">
				<span>Задачи: {node.metrics.taskCount}</span>
				{node.metrics.issueCount > 0 && (
					<span className="text-rose-600 font-semibold">Проблемы: {node.metrics.issueCount}</span>
				)}
				{node.childrenCount > 0 && (
					<span className="text-gray-600">Подэтапы: {node.childrenCount}</span>
				)}
			</div>
			{!isOverlay && (
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100"
					title="Добавить подэтап"
					onClick={(e) => {
						e.stopPropagation();
						onAddSub(node.stage);
					}}
				>
					<Plus className="w-3.5 h-3.5" />
				</Button>
			)}
		</div>
	);
}


function SortableRow({
	node,
	overId,
	activeId,
	projectedDepth,
	fmt,
	onSelect,
	onAddSub,
	reorderEnabled,
}: {
	node: FlatWbsNode;
	overId: number | null;
	activeId: number | null;
	projectedDepth: number | null;
	fmt: (kgs: number) => string;
	onSelect: (s: WbsStage) => void;
	onAddSub: (s: WbsStage) => void;
	reorderEnabled: boolean;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: node.id,
		disabled: !reorderEnabled,
	});

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const displayDepth =
		activeId != null && overId === node.id && projectedDepth != null ? projectedDepth : node.depth;
	const showProjection = activeId != null && overId === node.id && projectedDepth != null;

	return (
		<div
			ref={setNodeRef}
			style={style}
			data-wbs-id={node.id}
			className={`group relative flex items-stretch border-b border-gray-100 bg-white ${
				isDragging ? "opacity-30" : "hover:bg-amber-50/30"
			}`}
		>
			{showProjection && (
				<div
					className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500 z-10 pointer-events-none"
					style={{ marginLeft: 12 + projectedDepth * WBS_INDENT_PX }}
				/>
			)}
			<div
				className="flex items-center shrink-0 pl-2 transition-[padding] duration-75"
				style={{ paddingLeft: 8 + displayDepth * WBS_INDENT_PX }}
			>
				<button
					type="button"
					className={`p-1 touch-none ${
						reorderEnabled
							? "cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
							: "cursor-default text-gray-200"
					}`}
					{...(reorderEnabled ? { ...attributes, ...listeners } : {})}
					onClick={(e) => e.stopPropagation()}
					disabled={!reorderEnabled}
				>
					<GripVertical className="w-4 h-4" />
				</button>
			</div>
			<WbsRowContent node={node} fmt={fmt} onSelect={onSelect} onAddSub={onAddSub} />
		</div>
	);
}

export function WbsTreeView({
	flat,
	stages,
	fmt,
	onSelect,
	onAddSub,
	onReorder,
	reorderEnabled = true,
}: {
	flat: FlatWbsNode[];
	stages: WbsStage[];
	fmt: (kgs: number) => string;
	onSelect: (s: WbsStage) => void;
	onAddSub: (s: WbsStage) => void;
	onReorder: (items: { id: number; parentStageId: number | null }[]) => Promise<void>;
	reorderEnabled?: boolean;
}) {
	const [activeId, setActiveId] = useState<number | null>(null);
	const [overId, setOverId] = useState<number | null>(null);
	const [projectedDepth, setProjectedDepth] = useState<number | null>(null);
	const [dragStartDepth, setDragStartDepth] = useState(0);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	const ids = useMemo(() => flat.map((n) => n.id), [flat]);
	const activeNode = activeId != null ? flat.find((n) => n.id === activeId) : null;

	const handleDragStart = (e: DragStartEvent) => {
		if (!reorderEnabled) return;
		const id = Number(e.active.id);
		setActiveId(id);
		const node = flat.find((n) => n.id === id);
		setDragStartDepth(node?.depth ?? 0);
		setProjectedDepth(node?.depth ?? 0);
	};

	const handleDragMove = (e: DragMoveEvent) => {
		if (!reorderEnabled) return;
		const depthDelta = Math.round(e.delta.x / WBS_INDENT_PX);
		setProjectedDepth(Math.max(0, dragStartDepth + depthDelta));
	};

	const handleDragOver = (e: DragOverEvent) => {
		setOverId(e.over ? Number(e.over.id) : null);
	};

	const handleDragEnd = async (e: DragEndEvent) => {
		if (!reorderEnabled) return;
		const targetOverId = e.over ? Number(e.over.id) : null;
		const fromId = activeId;
		const depth = projectedDepth ?? dragStartDepth;

		setActiveId(null);
		setOverId(null);
		setProjectedDepth(null);

		if (fromId == null || targetOverId == null || fromId === targetOverId) return;

		const nextFlat = projectTreeMove(stages, flat, fromId, targetOverId, depth);
		if (!nextFlat) return;
		await onReorder(flatToReorderPayload(nextFlat));
	};

	return (
		<div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
			<div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-[11px] text-gray-500 hidden md:grid md:grid-cols-[1fr_9rem_12rem_8rem] gap-2">
				<span>Структура WBS</span>
				<span>Прогресс</span>
				<span>Бюджет / освоение</span>
				<span>Задачи</span>
			</div>
			<p className="md:hidden px-3 py-1.5 text-[10px] text-gray-600 border-b border-gray-100">
				Перетащите влево/вправо для смены уровня вложенности
			</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragMove={handleDragMove}
				onDragOver={handleDragOver}
				onDragEnd={(e) => void handleDragEnd(e)}
				onDragCancel={() => {
					setActiveId(null);
					setOverId(null);
					setProjectedDepth(null);
				}}
			>
				<SortableContext items={ids} strategy={verticalListSortingStrategy}>
					{flat.map((node) => (
						<SortableRow
							key={node.id}
							node={node}
							overId={overId}
							activeId={activeId}
							projectedDepth={projectedDepth}
							fmt={fmt}
							onSelect={onSelect}
							onAddSub={onAddSub}
							reorderEnabled={reorderEnabled}
						/>
					))}
				</SortableContext>
				<DragOverlay>
					{activeNode ? (
						<div className="flex items-center pl-10">
							<WbsRowContent
								node={activeNode}
								fmt={fmt}
								onSelect={() => {}}
								onAddSub={() => {}}
								isOverlay
							/>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>
		</div>
	);
}
