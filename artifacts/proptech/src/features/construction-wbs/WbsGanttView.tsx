import { useMemo } from "react";
import { inferWbsStatus, statusMeta } from "./status";
import type { FlatWbsNode, WbsStage } from "./types";

export function WbsGanttView({
	flat,
	onSelect,
}: {
	flat: FlatWbsNode[];
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
			const progress = row.node.metrics.effectiveProgress;
			const st = inferWbsStatus(row.node.stage, row.node.metrics.issueCount);
			const isCritical = st === "behind" || (endMs < todayMs && progress < 100);
			const barColor =
				st === "completed"
					? "bg-blue-500"
					: st === "behind"
						? "bg-rose-500"
						: st === "at_risk"
							? "bg-amber-500"
							: "bg-emerald-500";

			return { ...row, left, width, progress, isCritical, barColor, meta: statusMeta(st) };
		});
	}, [flat]);

	if (bars.length === 0) {
		return (
			<div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
				Укажите даты начала и окончания этапов для диаграммы Ганта
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
			<p className="text-[11px] text-gray-400 px-1 mb-2">
				Критический путь подсвечивается для просроченных и отстающих этапов
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
							<span className="font-mono text-[10px] text-gray-400 shrink-0">{row.node.wbsCode}</span>
							<span className="truncate text-gray-800" style={{ paddingLeft: row.node.depth * 8 }}>
								{row.node.stage.name}
							</span>
							<span className={`hidden sm:inline text-[10px] px-1 py-0 rounded border shrink-0 ${row.meta.badge}`}>
								{row.meta.label}
							</span>
						</div>
						<span className="text-gray-400 shrink-0 text-[10px]">
							{row.start} → {row.end}
						</span>
					</div>
					<div className="relative h-5 rounded bg-gray-100 overflow-hidden ml-6">
						<div
							className={`absolute top-0 h-full rounded opacity-90 ${row.barColor}`}
							style={{ left: `${row.left}%`, width: `${Math.max(row.width, 1.5)}%` }}
						/>
						<div
							className="absolute top-0 h-full bg-black/15 rounded-l"
							style={{
								left: `${row.left}%`,
								width: `${Math.max(row.width * (row.progress / 100), 0.5)}%`,
							}}
						/>
					</div>
				</button>
			))}
		</div>
	);
}
