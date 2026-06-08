import { Progress } from "@/components/ui/progress";
import { inferStageStatus, statusMeta } from "./status";
import type { FlatWbsNode, WbsStage } from "./types";

export function WbsCardsView({
	flat,
	fmt,
	onSelect,
}: {
	flat: FlatWbsNode[];
	fmt: (kgs: number) => string;
	onSelect: (s: WbsStage) => void;
}) {
	const roots = flat.filter((n) => n.depth === 0);

	if (roots.length === 0) {
		return (
			<div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-600">
				Нет этапов — добавьте корневой элемент WBS
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
			{roots.map((node) => {
				const st = inferStageStatus(node.stage, node.metrics);
				const meta = statusMeta(st);
				const subs = flat.filter((n) => n.parentId === node.id);

				return (
					<button
						key={node.id}
						type="button"
						onClick={() => onSelect(node.stage)}
						className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-amber-300 hover:shadow-sm transition-all"
					>
						<div className="flex items-start justify-between gap-2 mb-2">
							<div className="min-w-0">
								<p className="text-[10px] font-mono text-gray-600">{node.wbsCode}</p>
								<p className="font-semibold text-gray-900 truncate">{node.stage.name}</p>
							</div>
							<span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${meta.badge}`}>
								{meta.label}
							</span>
						</div>
						<Progress value={node.metrics.effectiveProgress} className="h-1.5 mb-1" />
						<p className="text-xs text-gray-600 mb-3">{node.metrics.effectiveProgress}% выполнено</p>
						<div className="grid gap-2 text-[11px] text-gray-500 sm:grid-cols-2">
							<span>Бюджет: {fmt(node.metrics.budgetKgs)}</span>
							<span>Освоено: {fmt(node.metrics.spentKgs)}</span>
							<span
								className={node.metrics.remainderKgs >= 0 ? "text-emerald-700" : "text-rose-700 font-medium"}
							>
								{node.metrics.remainderKgs >= 0
									? `Остаток: ${fmt(node.metrics.remainderKgs)}`
									: `Перерасход: ${fmt(Math.abs(node.metrics.remainderKgs))}`}
							</span>
							<span>Освоение: {node.metrics.budgetKgs > 0 ? `${node.metrics.factPct}%` : "—"}</span>
							<span>Задачи: {node.metrics.taskCount}</span>
							<span>Подэтапы: {subs.length}</span>
						</div>
						{node.metrics.issueCount > 0 && (
							<p className="text-[11px] text-rose-600 mt-2 font-medium">
								Проблемы: {node.metrics.issueCount}
							</p>
						)}
					</button>
				);
			})}
		</div>
	);
}
