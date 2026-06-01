import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import {
	AlertCircle,
	ArrowRight,
	Building2,
	CheckSquare,
	Circle,
	Clock,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
	status?: string;
	income: number;
	expense: number;
	profit: number;
	unitsTotal: number;
	unitsSold: number;
	salesSum: number;
	paidSum: number;
	overdue: number;
};

const PROJECT_STATUS: Record<string, { label: string; className: string }> = {
	planning: { label: "Планирование", className: "bg-slate-100 text-slate-700" },
	active: { label: "В работе", className: "bg-emerald-100 text-emerald-800" },
	completed: { label: "Завершён", className: "bg-blue-100 text-blue-800" },
	paused: { label: "Пауза", className: "bg-amber-100 text-amber-800" },
};

export default function ConsolidatedDashboard() {
	const { user } = useAuth();

	const { data: projects = [], isLoading: loadingProjects } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: ops = [] } = useQuery({
		queryKey: ["construction-operations"],
		queryFn: () => api.get("/construction/operations").then((r) => r.data),
	});
	const { data: units = [] } = useQuery({
		queryKey: ["construction-units-all"],
		queryFn: () => api.get("/construction/units").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});
	const { data: accruals = [] } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});
	const { data: accounts = [] } = useQuery({
		queryKey: ["construction-accounts"],
		queryFn: () => api.get("/construction/accounts").then((r) => r.data),
	});
	const { data: tasks = [] } = useQuery({
		queryKey: ["construction-tasks"],
		queryFn: () => api.get("/construction/tasks").then((r) => r.data),
	});

	const projectsArray = Array.isArray(projects) ? projects : [];
	const opsArray = Array.isArray(ops) ? ops : [];
	const unitsArray = Array.isArray(units) ? units : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];
	const accrualsArray = Array.isArray(accruals) ? accruals : [];
	const accountsArray = Array.isArray(accounts) ? accounts : [];

	const projectRows = projectsArray.map((p: { id: number; name: string; status?: string; totalBudget?: string; currency?: string }) => {
		const pid = p.id;
		const income = opsArray
			.filter((o: { projectId?: number; type?: string }) => o.projectId === pid && o.type === "income")
			.reduce((s: number, o: { amountKgs?: string }) => s + parseFloat(o.amountKgs || "0"), 0);
		const expense = opsArray
			.filter((o: { projectId?: number; type?: string }) => o.projectId === pid && o.type === "expense")
			.reduce((s: number, o: { amountKgs?: string }) => s + parseFloat(o.amountKgs || "0"), 0);
		const projectUnits = unitsArray.filter((u: { projectId?: number }) => u.projectId === pid);
		const sold = projectUnits.filter(
			(u: { status?: string }) => u.status === "sold" || u.status === "registered",
		).length;
		const projectContracts = contractsArray.filter(
			(c: { projectId?: number }) => c.projectId === pid,
		);
		const salesSum = projectContracts.reduce(
			(s: number, c: { totalAmount?: string }) => s + parseFloat(c.totalAmount || "0"),
			0,
		);
		const paidSum = projectContracts.reduce(
			(s: number, c: { paidAmount?: string }) => s + parseFloat(c.paidAmount || "0"),
			0,
		);
		const contractIds = new Set(projectContracts.map((c: { id: number }) => c.id));
		const overdue = accrualsArray
			.filter(
				(a: { contractId?: number; status?: string; dueDate?: string }) =>
					contractIds.has(a.contractId!) &&
					a.status !== "paid" &&
					new Date(a.dueDate || "") < new Date(),
			)
			.reduce(
				(s: number, a: { remainingAmount?: string }) =>
					s + parseFloat(a.remainingAmount || "0"),
				0,
			);
		const budget = parseFloat(p.totalBudget || "0");
		return {
			...p,
			income,
			expense,
			profit: income - expense,
			unitsTotal: projectUnits.length,
			unitsSold: sold,
			salesSum,
			paidSum,
			remainingSales: Math.max(0, salesSum - paidSum),
			overdue,
			budget,
			budgetUsedPct: budget > 0 ? Math.min(100, (expense / budget) * 100) : 0,
		};
	});

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

	const cashBalance = accountsArray
		.filter((a: { currency?: string }) => a.currency === "KGS")
		.reduce(
			(s: number, a: { currentBalance?: string }) =>
				s + parseFloat(a.currentBalance || "0"),
			0,
		);

	const tasksArray = Array.isArray(tasks) ? tasks : [];
	const today = new Date().toISOString().slice(0, 10);
	const tasksTodo = tasksArray.filter((t: any) => t.status === "todo" || t.status === "in_progress");
	const tasksOverdue = tasksArray.filter(
		(t: any) => t.dueDate && t.dueDate.slice(0, 10) < today && t.status !== "done",
	);
	const tasksDone = tasksArray.filter((t: any) => t.status === "done").length;

	const recentOps = [...opsArray]
		.sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""))
		.slice(0, 7);

	return (
		<div className="max-w-7xl">
		<div className="flex gap-6 items-start">

		{/* ── Left main column ───────────────────────────────────────────────── */}
		<div className="flex-1 min-w-0 space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Сводное по проектам</h1>
				<p className="text-sm text-gray-500 mt-1">
					Общая картина по всем строительным проектам компании
					{user?.firstName ? ` · ${user.firstName}` : ""}
				</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				{[
					{
						label: "Проектов",
						value: String(projectsArray.length),
						sub: "в системе",
						icon: Building2,
						color: "text-indigo-600 bg-indigo-50",
					},
					{
						label: "Доходы",
						value: fmtFull(totals.income),
						sub: "KGS",
						icon: TrendingUp,
						color: "text-emerald-600 bg-emerald-50",
					},
					{
						label: "Расходы",
						value: fmtFull(totals.expense),
						sub: "KGS",
						icon: TrendingDown,
						color: "text-rose-600 bg-rose-50",
					},
					{
						label: "Остатки на счетах",
						value: fmtFull(cashBalance),
						sub: "KGS",
						icon: Wallet,
						color: "text-blue-600 bg-blue-50",
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

			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
				<div className="bg-white rounded-xl border p-3">
					<span className="text-gray-500 text-xs">Продажи (договоры)</span>
					<p className="font-bold text-lg mt-1">{fmtFull(totals.sales)} KGS</p>
				</div>
				<div className="bg-white rounded-xl border p-3">
					<span className="text-gray-500 text-xs">Оплачено покупателями</span>
					<p className="font-bold text-lg mt-1 text-emerald-600">
						{fmtFull(totals.paid)} KGS
					</p>
				</div>
				<div className="bg-white rounded-xl border p-3">
					<span className="text-gray-500 text-xs">Квартир в шахматке</span>
					<p className="font-bold text-lg mt-1">
						{totals.sold} / {totals.units}{" "}
						<span className="text-xs font-normal text-gray-400">продано</span>
					</p>
				</div>
				<div className="bg-white rounded-xl border p-3">
					<span className="text-gray-500 text-xs">Просрочка по проектам</span>
					<p className="font-bold text-lg mt-1 text-rose-600 flex items-center gap-1">
						{totals.overdue > 0 && <AlertCircle className="w-4 h-4" />}
						{fmtFull(totals.overdue)} KGS
					</p>
				</div>
			</div>

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
					data={projectRows as ProjectRow[]}
					isLoading={loadingProjects}
					initialSorting={[{ id: "name", desc: false }]}
					emptyState={
						<p className="py-8 text-center text-am-text-muted text-sm">
							Нет проектов. Создайте проекты в модуле «Строительство».
						</p>
					}
					footer={
						projectRows.length > 0 ? (
							<div className="grid grid-cols-[minmax(140px,1fr)_repeat(6,minmax(90px,1fr))] gap-2 px-3 py-2.5 text-xs font-semibold bg-gray-50/90 border-t border-am-border">
								<span className="col-span-2">Итого</span>
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

			<p className="text-xs text-gray-400 text-center">
				Детальная аналитика — в модуле «Контроль строительства» → Дашборд и отчёты
			</p>
		</div>

		{/* ── Right sidebar ──────────────────────────────────────────────────── */}
		<div className="w-72 flex-shrink-0 space-y-4 sticky top-4">

			{/* Tasks widget */}
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
						<p className="text-lg font-bold text-amber-600">{tasksTodo.length}</p>
						<p className="text-[10px] text-gray-400">В работе</p>
					</div>
					<div>
						<p className="text-lg font-bold text-rose-600">{tasksOverdue.length}</p>
						<p className="text-[10px] text-gray-400">Просрочено</p>
					</div>
					<div>
						<p className="text-lg font-bold text-emerald-600">{tasksDone}</p>
						<p className="text-[10px] text-gray-400">Выполнено</p>
					</div>
				</div>
				{tasksOverdue.length > 0 && (
					<div className="px-4 pb-3 space-y-1.5">
						{tasksOverdue.slice(0, 3).map((t: any) => (
							<div key={t.id} className="flex items-start gap-2 text-xs">
								<AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
								<span className="text-gray-700 truncate">{t.title}</span>
							</div>
						))}
						{tasksOverdue.length > 3 && (
							<p className="text-[10px] text-rose-500 pl-5">+ ещё {tasksOverdue.length - 3}</p>
						)}
					</div>
				)}
				{tasksTodo.slice(0, 4).filter((t: any) => !tasksOverdue.find((o: any) => o.id === t.id)).map((t: any) => (
					<div key={t.id} className="px-4 pb-2 flex items-start gap-2 text-xs">
						{t.status === "in_progress"
							? <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
							: <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />}
						<span className="text-gray-700 truncate">{t.title}</span>
					</div>
				))}
			</div>

			{/* Recent operations widget */}
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
						{recentOps.map((op: any) => {
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

			{/* Quick links */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
				<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Быстрый переход</p>
				{[
					{ href: "/dashboard?tab=construction", label: "Стройка — dashboard" },
					{ href: "/construction/operations", label: "Операции" },
					{ href: "/construction/tasks", label: "Задачи" },
					{ href: "/construction/chess", label: "Шахматка" },
					{ href: "/dashboard?tab=rental", label: "Аренда — dashboard" },
				].map((l) => (
					<Link key={l.href} href={l.href}>
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
