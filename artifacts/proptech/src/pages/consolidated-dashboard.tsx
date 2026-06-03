import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AttentionQueue } from "@/components/dashboard/AttentionQueue";
import { DataTable } from "@/components/data-table";
import {
	AlertCircle,
	ArrowRight,
	Building2,
	CheckSquare,
	Circle,
	Clock,
	ShieldAlert,
	TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useControlCenter } from "@/hooks/use-control-center";
import { useModuleAccess } from "@/hooks/use-module-access";
import {
	getModuleDashboardHref,
	dashboardHref,
	canAccessDashboardTab,
} from "@/lib/dashboard-access";

function fmtFull(n: unknown) {
	const v = parseFloat(String(n ?? "0"));
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(
		Math.round(v),
	);
}

type ProjectRow = {
	id: number;
	name: string;
	status?: string | null;
	income: number;
	expense: number;
	profit: number;
	unitsTotal: number;
	unitsSold: number;
	salesSum: number;
	paidSum: number;
	overdue: number;
	budget: number;
	budgetUsedPct: number;
	riskLevel: "critical" | "warning" | "ok";
};

const PROJECT_STATUS: Record<string, { label: string; className: string }> = {
	planning: { label: "Планирование", className: "bg-slate-100 text-slate-700" },
	active: { label: "В работе", className: "bg-emerald-100 text-emerald-800" },
	completed: { label: "Завершён", className: "bg-blue-100 text-blue-800" },
	paused: { label: "Пауза", className: "bg-amber-100 text-amber-800" },
};

export default function ConsolidatedDashboard() {
	const { role, permissions, allowedModules } = useModuleAccess();
	const { data, isLoading, isError, refetch } = useControlCenter();

	const quickLinks = useMemo(
		() => [
			{
				href: getModuleDashboardHref(
					"construction",
					role,
					permissions,
					allowedModules,
				),
				label: "Стройка — обзор",
			},
			{ href: "/construction/operations", label: "Операции" },
			{ href: "/construction/tasks", label: "Задачи" },
			{ href: "/construction/chess", label: "Шахматка" },
			{
				href: getModuleDashboardHref(
					"rental",
					role,
					permissions,
					allowedModules,
				),
				label: "Аренда — обзор",
			},
			...(canAccessDashboardTab("analytics", role, permissions, allowedModules)
				? [{ href: dashboardHref("analytics"), label: "Аналитика" }]
				: []),
			...(canAccessDashboardTab("investors", role, permissions, allowedModules)
				? [{ href: dashboardHref("investors"), label: "Инвесторы" }]
				: []),
		],
		[role, permissions, allowedModules],
	);

	const projectRows = (data?.projectRows ?? []) as ProjectRow[];
	const kpis = data?.kpis;
	const tasksSummary = data?.tasksSummary;
	const recentOps = data?.recentOps ?? [];
	const overdueTasksPreview = data?.overdueTasksPreview ?? [];
	const activeTasksPreview = data?.activeTasksPreview ?? [];

	const totals = projectRows.reduce(
		(acc, r) => ({
			income: acc.income + r.income,
			expense: acc.expense + r.expense,
			sales: acc.sales + r.salesSum,
			paid: acc.paid + r.paidSum,
			overdue: acc.overdue + r.overdue,
			units: acc.units + r.unitsTotal,
			sold: acc.sold + r.unitsSold,
		}),
		{ income: 0, expense: 0, sales: 0, paid: 0, overdue: 0, units: 0, sold: 0 },
	);
	const totalProfit = totals.income - totals.expense;

	const projectColumns = useMemo<ColumnDef<ProjectRow, unknown>[]>(
		() => [
			{
				id: "name",
				header: "Проект",
				size: 180,
				minSize: 140,
				maxSize: 280,
				accessorKey: "name",
				meta: { exportLabel: "Проект", grow: true, pinned: "left" },
				cell: ({ row }) => (
					<Link
						href="/construction/projects"
						className="font-medium text-am-text-strong hover:text-amber-600 truncate block"
						title={row.original.name}
					>
						{row.original.name}
					</Link>
				),
			},
			{
				id: "status",
				header: "Статус",
				size: 110,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => {
					const st =
						PROJECT_STATUS[row.original.status || ""] ||
						PROJECT_STATUS.planning;
					return (
						<Badge variant="outline" className={`text-[10px] ${st.className}`}>
							{st.label}
						</Badge>
					);
				},
			},
			{
				id: "risk",
				header: "Риск",
				size: 100,
				accessorKey: "riskLevel",
				meta: { exportLabel: "Риск" },
				cell: ({ row }) => {
					const r = row.original.riskLevel;
					if (r === "critical") {
						return (
							<Badge variant="outline" className="text-[10px] bg-rose-100 text-rose-700 border-rose-200">
								Бюджет
							</Badge>
						);
					}
					if (r === "warning") {
						return (
							<Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
								Дебиторка
							</Badge>
						);
					}
					return <span className="text-am-text-muted text-xs">—</span>;
				},
			},
			{
				id: "income",
				header: "Доходы",
				size: 110,
				accessorKey: "income",
				meta: { exportLabel: "Доходы", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span className="tabular-nums text-emerald-700">
						{fmtFull(row.original.income)} сом
					</span>
				),
			},
			{
				id: "expense",
				header: "Расходы",
				size: 110,
				accessorKey: "expense",
				meta: { exportLabel: "Расходы", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span className="tabular-nums text-rose-600">
						{fmtFull(row.original.expense)} сом
					</span>
				),
			},
			{
				id: "profit",
				header: "Прибыль",
				size: 110,
				accessorKey: "profit",
				meta: { exportLabel: "Прибыль", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span
						className={`tabular-nums font-semibold ${row.original.profit >= 0 ? "text-am-text-strong" : "text-rose-600"}`}
					>
						{fmtFull(row.original.profit)} сом
					</span>
				),
			},
			{
				id: "sales",
				header: "Продажи",
				size: 120,
				accessorKey: "salesSum",
				meta: { exportLabel: "Продажи", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<div className="text-right tabular-nums">
						<div>{fmtFull(row.original.salesSum)} сом</div>
						<div className="text-[10px] text-am-text-muted">
							опл. {fmtFull(row.original.paidSum)} сом
						</div>
					</div>
				),
			},
			{
				id: "chess",
				header: "Шахматка",
				size: 90,
				accessorFn: (r) => r.unitsSold,
				meta: { exportLabel: "Шахматка", align: "center" },
				cell: ({ row }) => (
					<span className="text-center block tabular-nums">
						{row.original.unitsSold} / {row.original.unitsTotal}
					</span>
				),
			},
			{
				id: "overdue",
				header: "Просрочка",
				size: 110,
				accessorKey: "overdue",
				meta: { exportLabel: "Просрочка", align: "right", financeAmount: true, pinned: "right" },
				cell: ({ row }) =>
					row.original.overdue > 0 ? (
						<span className="tabular-nums text-rose-600">
							{fmtFull(row.original.overdue)} сом
						</span>
					) : (
						<span className="text-am-text-muted">—</span>
					),
			},
		],
		[],
	);

	if (isLoading && !data) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-48 w-full rounded-xl" />
				<Skeleton className="h-32 w-full rounded-xl" />
				<Skeleton className="h-64 w-full rounded-xl" />
			</div>
		);
	}

	if (isError && !data) {
		return (
			<div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-6 text-center space-y-3">
				<p className="text-sm font-medium text-rose-800">
					Не удалось загрузить центр управления
				</p>
				<p className="text-xs text-rose-600">
					Проверьте подключение к API или обновите страницу.
				</p>
				<button
					type="button"
					onClick={() => refetch()}
					className="text-sm font-medium text-amber-700 hover:underline"
				>
					Повторить
				</button>
			</div>
		);
	}

	return (
		<div className="max-w-7xl">
		<div className="flex flex-col lg:flex-row gap-6 items-start">

		<div className="flex-1 min-w-0 space-y-6 w-full">
			<AttentionQueue />

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				{[
					{
						label: "Проектов",
						value: String(kpis?.projectCount ?? projectRows.length),
						sub: "в выборке",
						icon: Building2,
						color: "text-indigo-600 bg-indigo-50",
					},
					{
						label: "С риском",
						value: String(
							(kpis?.criticalProjects ?? 0) + (kpis?.budgetOverruns ?? 0),
						),
						sub: "требуют внимания",
						icon: ShieldAlert,
						color: "text-rose-600 bg-rose-50",
					},
					{
						label: "Просрочка",
						value: fmtFull(kpis?.overdueAmount ?? totals.overdue),
						sub: "сом",
						icon: AlertCircle,
						color: "text-amber-600 bg-amber-50",
					},
					{
						label: "Продажи",
						value: `${kpis?.salesPct ?? (totals.units > 0 ? Math.round((totals.sold / totals.units) * 100) : 0)}%`,
						sub: `${kpis?.unitsSold ?? totals.sold}/${kpis?.unitsTotal ?? totals.units} юнитов`,
						icon: TrendingUp,
						color: "text-emerald-600 bg-emerald-50",
					},
				].map((c) => {
					const Icon = c.icon;
					return (
						<div
							key={c.label}
							className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
						>
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs text-gray-500">{c.label}</span>
								<div
									className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.color}`}
								>
									<Icon className="w-4 h-4" />
								</div>
							</div>
							<p className="text-xl font-bold text-gray-900 tabular-nums">
								{c.value}
							</p>
							<p className="text-[10px] text-gray-400">{c.sub}</p>
						</div>
					);
				})}
			</div>

			{canAccessDashboardTab("finance", role, permissions, allowedModules) && (
			<div className="flex justify-end">
				<Link
					href={dashboardHref("finance")}
					className="text-xs text-amber-600 hover:underline inline-flex items-center gap-1"
				>
					Детальная финансовая аналитика <ArrowRight className="w-3 h-3" />
				</Link>
			</div>
			)}

			<div className="space-y-2">
				<div className="flex items-center justify-between px-1">
					<h2 className="font-semibold text-gray-900">Свод по каждому проекту</h2>
					<Link href="/construction/projects">
						<span className="text-xs text-amber-600 hover:text-orange-600 inline-flex items-center gap-1 cursor-pointer">
							Все проекты <ArrowRight className="w-3 h-3" />
						</span>
					</Link>
				</div>
				<DataTable
					tableId="consolidated-dashboard-projects"
					columns={projectColumns}
					data={projectRows}
					isLoading={isLoading}
					initialSorting={[{ id: "name", desc: false }]}
					emptyState={
						<p className="py-8 text-center text-am-text-muted text-sm">
							Нет проектов. Создайте проекты в модуле «Строительство».
						</p>
					}
					footer={
						projectRows.length > 0 ? (
							<div className="grid grid-cols-[minmax(140px,1fr)_repeat(7,minmax(80px,1fr))] gap-2 px-3 py-2.5 text-xs font-semibold bg-gray-50/90 border-t border-am-border">
								<span className="col-span-3">Итого</span>
								<span className="text-right tabular-nums text-emerald-700">
									{fmtFull(totals.income)} сом
								</span>
								<span className="text-right tabular-nums text-rose-600">
									{fmtFull(totals.expense)} сом
								</span>
								<span className="text-right tabular-nums">
									{fmtFull(totalProfit)} сом
								</span>
								<span className="text-right tabular-nums">
									{fmtFull(totals.sales)} сом
								</span>
								<span className="text-center tabular-nums">
									{totals.sold} / {totals.units}
								</span>
								<span className="text-right tabular-nums text-rose-600">
									{fmtFull(totals.overdue)} сом
								</span>
							</div>
						) : undefined
					}
				/>
			</div>
		</div>

		<div className="w-full lg:w-72 flex-shrink-0 space-y-4 lg:sticky lg:top-4">
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="px-4 py-3 border-b flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CheckSquare className="w-4 h-4 text-blue-600" />
						<span className="text-sm font-semibold text-gray-900">Задачи</span>
					</div>
					<Link href="/construction/tasks">
						<span className="text-xs text-amber-600 hover:text-orange-600 cursor-pointer flex items-center gap-0.5">
							Все <ArrowRight className="w-3 h-3" />
						</span>
					</Link>
				</div>
				<div className="px-4 py-3 grid grid-cols-3 gap-2 text-center">
					<div>
						<p className="text-lg font-bold text-amber-600">{tasksSummary?.todo ?? 0}</p>
						<p className="text-[10px] text-gray-400">В работе</p>
					</div>
					<div>
						<p className="text-lg font-bold text-rose-600">{tasksSummary?.overdue ?? 0}</p>
						<p className="text-[10px] text-gray-400">Просрочено</p>
					</div>
					<div>
						<p className="text-lg font-bold text-emerald-600">{tasksSummary?.done ?? 0}</p>
						<p className="text-[10px] text-gray-400">Выполнено</p>
					</div>
				</div>
				{overdueTasksPreview.length > 0 && (
					<div className="px-4 pb-3 space-y-1.5">
						{overdueTasksPreview.map((t) => (
							<div key={t.id} className="flex items-start gap-2 text-xs">
								<AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
								<span className="text-gray-700 truncate">{t.title}</span>
							</div>
						))}
						{(tasksSummary?.overdue ?? 0) > overdueTasksPreview.length && (
							<p className="text-[10px] text-rose-500 pl-5">
								+ ещё {(tasksSummary?.overdue ?? 0) - overdueTasksPreview.length}
							</p>
						)}
					</div>
				)}
				{activeTasksPreview.map((t) => (
					<div key={t.id} className="px-4 pb-2 flex items-start gap-2 text-xs">
						{t.status === "in_progress"
							? <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
							: <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />}
						<span className="text-gray-700 truncate">{t.title}</span>
					</div>
				))}
			</div>

			<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="px-4 py-3 border-b flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TrendingUp className="w-4 h-4 text-gray-500" />
						<span className="text-sm font-semibold text-gray-900">Последние операции</span>
					</div>
					<Link href="/construction/operations">
						<span className="text-xs text-amber-600 hover:text-orange-600 cursor-pointer flex items-center gap-0.5">
							Все <ArrowRight className="w-3 h-3" />
						</span>
					</Link>
				</div>
				{recentOps.length === 0 ? (
					<p className="px-4 py-6 text-xs text-gray-400 text-center">Нет операций</p>
				) : (
					<div>
						{recentOps.map((op) => {
							const isIncome = op.type === "income";
							const isTransfer = op.type === "transfer";
							return (
								<div key={op.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 last:border-0">
									<div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isIncome ? "bg-emerald-500" : isTransfer ? "bg-blue-500" : "bg-rose-500"}`} />
									<div className="flex-1 min-w-0">
										<p className="text-xs text-gray-800 truncate">{op.description}</p>
										<p className="text-[10px] text-gray-400">{op.date}</p>
									</div>
									<span className={`text-xs font-mono font-semibold flex-shrink-0 ${isIncome ? "text-emerald-600" : isTransfer ? "text-blue-600" : "text-rose-600"}`}>
										{isIncome ? "+" : isTransfer ? "⇄" : "−"}{fmtFull(op.amountKgs)}
									</span>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
				<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Быстрый переход</p>
				{quickLinks.map((l) => (
					<Link key={l.label} href={l.href}>
						<div className="flex items-center gap-2 text-xs text-gray-600 hover:text-amber-600 py-1 cursor-pointer">
							<ArrowRight className="w-3 h-3 flex-shrink-0" />
							{l.label}
						</div>
					</Link>
				))}
			</div>
		</div>

		</div>
		</div>
	);
}
