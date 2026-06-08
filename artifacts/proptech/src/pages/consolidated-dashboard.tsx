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
	CreditCard,
	FileText,
	Grid3X3,
	LockKeyhole,
	Megaphone,
	ReceiptText,
	Scale,
	ShieldAlert,
	TrendingUp,
	Users,
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

const CORE_CHAIN = [
	"Компания",
	"Проект",
	"Юнит",
	"Контрагент",
	"Договор",
	"Начисления",
	"Оплаты",
	"Акт сверки",
	"Портал",
];

const SALES_FLOW = [
	{
		title: "Шахматка",
		text: "Единый источник доступности и статусов по каждому юниту.",
		href: "/construction/chess",
		icon: Grid3X3,
	},
	{
		title: "Цена утверждена",
		text: "Коммерческий директор задаёт базу, коэффициент и открывает продажу.",
		href: "/construction/chess",
		icon: LockKeyhole,
	},
	{
		title: "Бронь и клиент",
		text: "Продажник работает только с объектами, доступными для продажи.",
		href: "/crm/deals",
		icon: Users,
	},
	{
		title: "Договор",
		text: "Договор фиксирует покупателя, объект, сумму и график платежей.",
		href: "/construction/contracts-sales",
		icon: FileText,
	},
	{
		title: "Начисления",
		text: "Первый взнос, рассрочка и корректировки создаются автоматически.",
		href: "/construction/accruals",
		icon: ReceiptText,
	},
	{
		title: "Оплаты",
		text: "Платёж закрывает начисления, а не висит отдельной суммой.",
		href: "/construction/cashier",
		icon: CreditCard,
	},
	{
		title: "Сверка",
		text: "Финансист видит долг, просрочку и акт сверки по клиенту.",
		href: "/construction/reconciliation",
		icon: Scale,
	},
	{
		title: "Портал клиента",
		text: "Клиент видит объект, договор, платежи, документы и предложения.",
		href: "/crm/client-relations",
		icon: Megaphone,
	},
];

const ROLE_FOCUS = [
	{
		role: "Коммерческий директор",
		focus: "цены, коэффициенты, открытие юнитов, скидки, бронь",
	},
	{
		role: "Продажник",
		focus: "активные объекты, клиент, сделка, договор, статус оплаты",
	},
	{
		role: "Финансист",
		focus: "начисления, оплаты, просрочка, сверка, ОДДС/ОПУ",
	},
	{
		role: "Клиентский сервис",
		focus: "портал, новости, акции, обращения, сегменты и рассылки",
	},
];

const SECOND_LAYER_MODULES = [
	{ label: "Себестоимость", href: "/construction/budget", note: "этапы, задачи, материалы, подрядчики, план/факт" },
	{ label: "Снабжение", href: "/warehouse/requests", note: "заявка → согласование → заказ → склад → списание" },
	{ label: "Аренда", href: "/rental/contracts", note: "тот же core: объект, договор, начисление, оплата" },
	{ label: "Marketplace", href: "/warehouse/marketplace", note: "внешний источник поставщиков и товаров для supply" },
];

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
			{ href: "/crm/client-relations", label: "Клиентский сервис" },
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
						className="font-medium text-am-text-strong hover:text-cyan-700 truncate block"
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
					className="text-sm font-medium text-cyan-700 hover:underline"
				>
					Повторить
				</button>
			</div>
		);
	}

	return (
		<div className="am-page">
		<div className="flex flex-col gap-6">

		<div className="flex-1 min-w-0 space-y-6 w-full">
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
				<div className="border-b border-slate-100 bg-slate-950 px-5 py-5 text-white">
					<div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
						<div className="max-w-3xl">
							<p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
								Planalityc 1.0
							</p>
							<h1 className="mt-2 text-2xl font-bold tracking-tight">
								Шахматка → договор → деньги → клиентский портал
							</h1>
							<p className="mt-2 text-sm leading-6 text-slate-300">
								Первый продаваемый продукт: контроль продаж недвижимости для
								строительной компании. Все модули собираются вокруг объекта,
								договора, начислений, оплат и прозрачности для клиента.
							</p>
						</div>
						<div className="grid gap-2 text-center sm:grid-cols-3">
							<div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
								<p className="text-lg font-bold tabular-nums">
									{kpis?.unitsSold ?? totals.sold}/{kpis?.unitsTotal ?? totals.units}
								</p>
								<p className="text-[10px] text-slate-400">юнитов</p>
							</div>
							<div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
								<p className="text-lg font-bold tabular-nums">
									{kpis?.salesPct ?? (totals.units > 0 ? Math.round((totals.sold / totals.units) * 100) : 0)}%
								</p>
								<p className="text-[10px] text-slate-400">продаж</p>
							</div>
							<div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
								<p className="text-lg font-bold tabular-nums">
									{fmtFull(kpis?.overdueAmount ?? totals.overdue)}
								</p>
								<p className="text-[10px] text-slate-400">просрочка</p>
							</div>
						</div>
					</div>
				</div>

				<div className="px-5 py-4 border-b border-slate-100">
					<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
						Единое ядро данных
					</p>
					<div className="flex flex-wrap items-center gap-2">
						{CORE_CHAIN.map((item, index) => (
							<div key={item} className="flex items-center gap-2">
								<span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">
									{item}
								</span>
								{index < CORE_CHAIN.length - 1 && (
									<ArrowRight className="h-3.5 w-3.5 text-slate-300" />
								)}
							</div>
						))}
					</div>
				</div>

				<div className="grid gap-0 xl:grid-cols-[1fr_280px]">
					<div className="grid sm:grid-cols-2 xl:grid-cols-4">
						{SALES_FLOW.map((step, index) => {
							const Icon = step.icon;
							return (
								<Link key={step.title} href={step.href}>
									<div className="group h-full min-h-[154px] border-b border-r border-slate-100 p-4 transition-colors hover:bg-cyan-50/50 cursor-pointer">
										<div className="flex items-start justify-between gap-3">
											<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 group-hover:bg-cyan-600 group-hover:text-white">
												<Icon className="h-4 w-4" />
											</div>
											<span className="text-[10px] font-semibold text-slate-300">
												{String(index + 1).padStart(2, "0")}
											</span>
										</div>
										<h3 className="mt-3 text-sm font-semibold text-slate-950">
											{step.title}
										</h3>
										<p className="mt-1.5 text-xs leading-5 text-slate-500">
											{step.text}
										</p>
									</div>
								</Link>
							);
						})}
					</div>

					<div className="border-l border-slate-100 bg-slate-50/70 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							Фокус по ролям
						</p>
						<div className="mt-3 space-y-3">
							{ROLE_FOCUS.map((item) => (
								<div key={item.role} className="rounded-lg border border-slate-200 bg-white p-3">
									<p className="text-xs font-semibold text-slate-950">
										{item.role}
									</p>
									<p className="mt-1 text-[11px] leading-4 text-slate-500">
										{item.focus}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			<AttentionQueue />

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{[
					{
						label: "Проектов",
						value: String(kpis?.projectCount ?? projectRows.length),
						sub: "в выборке",
						icon: Building2,
						color: "text-cyan-700 bg-cyan-50",
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
						color: "text-rose-600 bg-rose-50",
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
							<p className="text-[10px] text-gray-600">{c.sub}</p>
						</div>
					);
				})}
			</div>

			{canAccessDashboardTab("finance", role, permissions, allowedModules) && (
			<div className="flex justify-end">
				<Link
					href={dashboardHref("finance")}
					className="text-xs text-cyan-700 hover:underline inline-flex items-center gap-1"
				>
					Детальная финансовая аналитика <ArrowRight className="w-3 h-3" />
				</Link>
			</div>
			)}

			<div className="space-y-2">
				<div className="flex items-center justify-between px-1">
					<h2 className="font-semibold text-gray-900">Свод по каждому проекту</h2>
					<Link href="/construction/projects">
						<span className="text-xs text-cyan-700 hover:text-cyan-800 inline-flex items-center gap-1 cursor-pointer">
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
							<tr>
								<td colSpan={projectColumns.length} className="p-0">
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
								</td>
							</tr>
						) : undefined
					}
				/>
			</div>
		</div>

		<div className="grid w-full gap-4 lg:grid-cols-4">
			<div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 lg:col-span-2">
				<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
					Подключаемые модули
				</p>
				<div className="mt-3 grid gap-2 sm:grid-cols-2">
					{SECOND_LAYER_MODULES.map((module) => (
						<Link key={module.label} href={module.href}>
							<div className="rounded-lg border border-slate-200 p-3 hover:border-cyan-200 hover:bg-cyan-50/40 cursor-pointer transition-colors">
								<div className="flex items-center justify-between gap-2">
									<p className="text-xs font-semibold text-slate-900">
										{module.label}
									</p>
									<ArrowRight className="h-3.5 w-3.5 text-slate-300" />
								</div>
								<p className="mt-1 text-[11px] leading-4 text-slate-500">
									{module.note}
								</p>
							</div>
						</Link>
					))}
				</div>
			</div>

			<div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
				<div className="px-4 py-3 border-b flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CheckSquare className="w-4 h-4 text-blue-600" />
						<span className="text-sm font-semibold text-gray-900">Задачи</span>
					</div>
					<Link href="/construction/tasks">
						<span className="text-xs text-cyan-700 hover:text-cyan-800 cursor-pointer flex items-center gap-0.5">
							Все <ArrowRight className="w-3 h-3" />
						</span>
					</Link>
				</div>
				<div className="px-4 py-3 grid gap-2 text-center sm:grid-cols-3">
					<div>
						<p className="text-lg font-bold text-cyan-700">{tasksSummary?.todo ?? 0}</p>
						<p className="text-[10px] text-gray-600">В работе</p>
					</div>
					<div>
						<p className="text-lg font-bold text-rose-600">{tasksSummary?.overdue ?? 0}</p>
						<p className="text-[10px] text-gray-600">Просрочено</p>
					</div>
					<div>
						<p className="text-lg font-bold text-emerald-600">{tasksSummary?.done ?? 0}</p>
						<p className="text-[10px] text-gray-600">Выполнено</p>
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

			<div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
				<div className="px-4 py-3 border-b flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TrendingUp className="w-4 h-4 text-gray-500" />
						<span className="text-sm font-semibold text-gray-900">Последние операции</span>
					</div>
					<Link href="/construction/operations">
						<span className="text-xs text-cyan-700 hover:text-cyan-800 cursor-pointer flex items-center gap-0.5">
							Все <ArrowRight className="w-3 h-3" />
						</span>
					</Link>
				</div>
				{recentOps.length === 0 ? (
					<p className="px-4 py-6 text-xs text-gray-600 text-center">Нет операций</p>
				) : (
					<div>
						{recentOps.map((op) => {
							const isIncome = op.type === "income";
							const isTransfer = op.type === "transfer";
							return (
								<div key={op.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 last:border-0">
									<div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isIncome ? "bg-emerald-600" : isTransfer ? "bg-blue-500" : "bg-rose-500"}`} />
									<div className="flex-1 min-w-0">
										<p className="text-xs text-gray-800 truncate">{op.description}</p>
										<p className="text-[10px] text-gray-600">{op.date}</p>
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

			<div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 space-y-2">
				<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Быстрый переход</p>
				{quickLinks.map((l) => (
					<Link key={l.label} href={l.href}>
						<div className="flex items-center gap-2 text-xs text-gray-600 hover:text-cyan-700 py-1 cursor-pointer">
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
