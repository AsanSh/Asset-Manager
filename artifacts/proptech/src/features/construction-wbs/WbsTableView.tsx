import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { inferStageStatus, statusMeta } from "./status";
import type { FlatWbsNode, WbsStage } from "./types";

export function WbsTableView({
	flat,
	fmt,
	onSelect,
}: {
	flat: FlatWbsNode[];
	fmt: (kgs: number) => string;
	onSelect: (s: WbsStage) => void;
}) {
	const columns = useMemo<ColumnDef<FlatWbsNode>[]>(
		() => [
			{
				id: "wbsCode",
				header: "WBS",
				accessorKey: "wbsCode",
				cell: ({ row }) => (
					<span className="font-mono text-xs text-gray-500">{row.original.wbsCode}</span>
				),
				size: 72,
			},
			{
				id: "name",
				header: "Название",
				cell: ({ row }) => (
					<button
						type="button"
						className="text-left font-medium text-gray-900 hover:text-amber-700 truncate max-w-[240px]"
						style={{ paddingLeft: row.original.depth * 12 }}
						onClick={() => onSelect(row.original.stage)}
					>
						{row.original.stage.name}
					</button>
				),
			},
			{
				id: "progress",
				header: "Прогресс",
				cell: ({ row }) => (
					<span className="tabular-nums text-sm">{row.original.metrics.effectiveProgress}%</span>
				),
			},
			{
				id: "budget",
				header: "Бюджет",
				cell: ({ row }) => (
					<span className="tabular-nums text-sm text-right block">{fmt(row.original.metrics.budgetKgs)}</span>
				),
			},
			{
				id: "factPct",
				header: "Освоение",
				cell: ({ row }) => (
					<span
						className={`tabular-nums text-sm ${
							row.original.metrics.factPct > 100 ? "text-rose-700 font-semibold" : "text-amber-700"
						}`}
					>
						{row.original.metrics.budgetKgs > 0 ? `${row.original.metrics.factPct}%` : "—"}
					</span>
				),
			},
			{
				id: "spent",
				header: "Факт расходов",
				cell: ({ row }) => (
					<span className="tabular-nums text-sm text-amber-700 text-right block">
						{fmt(row.original.metrics.spentKgs)}
					</span>
				),
			},
			{
				id: "remainder",
				header: "Остаток",
				cell: ({ row }) => (
					<span
						className={`tabular-nums text-sm text-right block ${
							row.original.metrics.remainderKgs >= 0 ? "text-emerald-700" : "text-rose-700"
						}`}
					>
						{fmt(row.original.metrics.remainderKgs)}
					</span>
				),
			},
			{
				id: "tasks",
				header: "Задачи",
				cell: ({ row }) => row.original.metrics.taskCount,
			},
			{
				id: "issues",
				header: "Проблемы",
				cell: ({ row }) =>
					row.original.metrics.issueCount > 0 ? (
						<span className="text-rose-600 font-medium">{row.original.metrics.issueCount}</span>
					) : (
						"—"
					),
			},
			{
				id: "status",
				header: "Статус",
				cell: ({ row }) => {
					const st = inferStageStatus(row.original.stage, row.original.metrics);
					const meta = statusMeta(st);
					return (
						<span className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.badge}`}>{meta.label}</span>
					);
				},
			},
			{
				id: "start",
				header: "Начало",
				cell: ({ row }) => row.original.stage.startDate || "—",
			},
			{
				id: "end",
				header: "Окончание",
				cell: ({ row }) => row.original.stage.plannedEndDate || "—",
			},
		],
		[fmt, onSelect],
	);

	return (
		<DataTable
			tableId="construction-wbs-table"
			columns={columns}
			data={flat}
			emptyState="Нет этапов для отображения"
			onRowClick={(row) => onSelect(row.stage)}
		/>
	);
}
