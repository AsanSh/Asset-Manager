import { AlertTriangle, CalendarClock, Layers, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { Progress } from "@/components/ui/progress";

export function WbsDashboard({
	fmt,
	dashboard,
	isLoading,
}: {
	fmt: (kgs: number) => string;
	dashboard: {
		avgProgress: number;
		planProgress: number;
		factProgress: number;
		lagPct: number;
		budgetKgs: number;
		spentKgs: number;
		remainderKgs: number;
		totalStages: number;
		risks: number;
		budgetOverruns: number;
		overdueTasks: number;
	};
	isLoading: boolean;
}) {
	const loading = isLoading ? "…" : undefined;

	return (
		<div className="space-y-3">
			<div className="rounded-xl border border-gray-200 bg-white p-4">
				<div className="flex flex-wrap items-end justify-between gap-3 mb-3">
					<div>
						<p className="text-xs text-gray-500">Общий прогресс проекта</p>
						<p className="text-2xl font-bold text-gray-900 tabular-nums">
							{loading ?? `${dashboard.avgProgress}%`}
						</p>
					</div>
					<div className="flex gap-4 text-xs text-gray-500">
						<span>
							План:{" "}
							<strong className="text-gray-800">{loading ?? `${dashboard.planProgress}%`}</strong>
						</span>
						<span>
							Факт:{" "}
							<strong className="text-amber-700">{loading ?? `${dashboard.factProgress}%`}</strong>
						</span>
						{dashboard.lagPct > 0 && (
							<span className="text-rose-600">
								Отставание: <strong>{dashboard.lagPct}%</strong>
							</span>
						)}
					</div>
				</div>
				<Progress value={dashboard.avgProgress} className="h-2 bg-gray-100 [&>div]:bg-amber-500" />
			</div>

			<KpiRow cols={6}>
				<KpiCard
					label="Бюджет WBS"
					value={loading ?? fmt(dashboard.budgetKgs)}
					icon={Wallet}
					color="blue"
					sub={`${dashboard.totalStages} этапов в структуре`}
				/>
				<KpiCard
					label="Освоение"
					value={loading ?? fmt(dashboard.spentKgs)}
					icon={TrendingDown}
					color="yellow"
					sub={
						dashboard.budgetKgs > 0
							? `${Math.round((dashboard.spentKgs / dashboard.budgetKgs) * 100)}% бюджета`
							: "—"
					}
				/>
				<KpiCard
					label="Остаток бюджета"
					value={loading ?? fmt(dashboard.remainderKgs)}
					icon={TrendingUp}
					color={dashboard.remainderKgs >= 0 ? "green" : "red"}
					sub={dashboard.remainderKgs < 0 ? "Перерасход" : "Доступно"}
				/>
				<KpiCard
					label="Риски / просрочки"
					value={loading ?? String(dashboard.risks + dashboard.overdueTasks)}
					icon={AlertTriangle}
					color={dashboard.risks + dashboard.overdueTasks > 0 ? "red" : "blue"}
					sub={`${dashboard.risks} этапов · ${dashboard.budgetOverruns} перерасход · ${dashboard.overdueTasks} задач`}
				/>
				<KpiCard
					label="Этапов в WBS"
					value={loading ?? String(dashboard.totalStages)}
					icon={Layers}
					color="purple"
					sub="Иерархия без ограничения глубины"
				/>
				<KpiCard
					label="Отставание"
					value={loading ?? (dashboard.lagPct > 0 ? `${dashboard.lagPct}%` : "—")}
					icon={CalendarClock}
					color={dashboard.lagPct > 0 ? "red" : "green"}
					sub="План vs факт освоения"
				/>
			</KpiRow>
		</div>
	);
}
