import { useMemo } from "react";
import { inferStageStatus, statusMeta } from "./status";
import type { FlatWbsNode, WbsStage } from "./types";

export function WbsGanttView({
	flat,
	fmt,
	onSelect,
}: {
	flat: FlatWbsNode[];
	fmt: (kgs: number) => string;
	onSelect: (s: WbsStage) => void;
}) {
	const bars = useMemo(() => {
		const withDates = flat
			.map((node) => {
				const start = node.stage.startDate || node.stage.createdAt?.slice(0, 10);
				const end = node.stage.plannedEndDate || start;
				return { node, start: start ? String(start).slice(0, 10) : "", end: end ? String(end).slice(0, 10) : "" };
			})
			.filter((x) => x.start && x.end)
			.sort((a, b) => a.start.localeCompare(b.start) || a.node.depth - b.node.depth);

		if (!withDates.length) return [];

		const min = withDates[0].start;
		const max = withDates.reduce((m, x) => (x.end > m ? x.end : m), withDates[0].start);
		const minMs = new Date(min).getTime();
		const maxMs = new Date(max).getTime();
		const total = Math.max(1, maxMs - minMs);
		const todayMs = Date.now();

		return withDates.map((row) => {
			const startMs = new Date(row.start).getTime();
			const endMs = new Date(row.end).getTime();
			const left = ((startMs - minMs) / total) * 100;
			const width = (Math.max(1, endMs - startMs) / total) * 100;
			const scheduleProgress = row.node.metrics.effectiveProgress;
			const factPct = row.node.metrics.factPct;
			const st = inferStageStatus(row.node.stage, row.node.metrics);
			const isCritical =
				st === "behind" ||
				st === "over_budget" ||
				(endMs < todayMs && scheduleProgress < 100);
			const barColor =
				st === "over_budget"
					? "bg-rose-600"
					: st === "completed"
						? "bg-blue-500"
						: st === "behind"
							? "bg-rose-500"
							: st === "at_risk"
								? "bg-amber-500"
								: "bg-emerald-600";

			const budgetLabel =
				row.node.metrics.budgetKgs > 0
					? row.node.metrics.remainderKgs >= 0
						? `Остаток ${fmt(row.node.metrics.remainderKgs)}`
						: `Перерасход ${fmt(Math.abs(row.node.metrics.remainderKgs))}`
					: row.node.metrics.spentKgs > 0
						? `Освоено ${fmt(row.node.metrics.spentKgs)}`
						: null;

			return {
				...row,
				left,
				width,
				scheduleProgress,
				factPct,
				isCritical,
				barColor,
				budgetLabel,
				meta: statusMeta(st),
			};
		});
	}, [flat, fmt]);

	if (bars.length === 0) {
		return (
			<div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-600">
				Укажите даты начала и окончания этапов для диаграммы Ганта
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
			<p className="text-[11px] text-gray-600 px-1 mb-2">
				Заливка — освоение бюджета (расходы по этапу). Тёмная полоса — прогресс работ. Перерасход подсвечивается красным.
			</p>
			{bars.map((row) => (
				<button
					key={row.node.id}
					type="button"
					onClick={() => onSelect(row.node.stage)}
					className={`w-full text-left rounded-lg px-2 py-1.5 hover:bg-gray-50 ${
						row.isCritical ? "ring-1 ring-rose-200 bg-rose-50/30" : ""
					}`}
				>
					<div className="flex items-center justify-between gap-2 text-xs mb-1">
						<div className="flex items-center gap-2 min-w-0">
							<span className="font-mono text-[10px] text-gray-600 shrink-0">{row.node.wbsCode}</span>
							<span className="truncate text-gray-800" style={{ paddingLeft: row.node.depth * 8 }}>
								{row.node.stage.name}
							</span>
							<span className={`hidden sm:inline text-[10px] px-1 py-0 rounded border shrink-0 ${row.meta.badge}`}>
								{row.meta.label}
							</span>
						</div>
						<span className="text-gray-600 shrink-0 text-[10px]">
							{row.start} → {row.end}
						</span>
					</div>
					<div className="relative h-5 rounded bg-gray-100 overflow-hidden ml-6">
						<div
							className={`absolute top-0 h-full rounded opacity-90 ${row.barColor}`}
							style={{ left: `${row.left}%`, width: `${Math.max(row.width, 1.5)}%` }}
						/>
						<div
							className="absolute top-0 h-full bg-amber-400/80 rounded-l"
							style={{
								left: `${row.left}%`,
								width: `${Math.max(row.width * (Math.min(row.factPct, 100) / 100), 0.5)}%`,
							}}
						/>
						{row.factPct > 100 && (
							<div
								className="absolute top-0 h-full bg-rose-700/70 rounded-r"
								style={{
									left: `${row.left + row.width * (100 / Math.max(row.factPct, 100))}%`,
									width: `${Math.max(row.width * ((row.factPct - 100) / 100), 0.5)}%`,
								}}
							/>
						)}
						<div
							className="absolute top-0 h-1 bg-black/25 rounded-l"
							style={{
								left: `${row.left}%`,
								width: `${Math.max(row.width * (row.scheduleProgress / 100), 0.5)}%`,
							}}
						/>
					</div>
					<div className="ml-6 mt-0.5 flex flex-wrap gap-x-3 gap-y-0 text-[10px] text-gray-500">
						<span>
							Работы: <strong className="text-gray-700">{row.scheduleProgress}%</strong>
						</span>
						<span>
							Бюджет: <strong className="text-amber-700">{row.factPct}%</strong>
							{row.node.metrics.budgetKgs > 0 && (
								<>
									{" "}
									· {fmt(row.node.metrics.spentKgs)} / {fmt(row.node.metrics.budgetKgs)}
								</>
							)}
						</span>
						{row.budgetLabel && (
							<span className={row.node.metrics.remainderKgs < 0 ? "text-rose-600 font-medium" : "text-emerald-700"}>
								{row.budgetLabel}
							</span>
						)}
					</div>
				</button>
			))}
		</div>
	);
}
