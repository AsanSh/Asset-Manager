import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	ArrowRight,
	BarChart2,
	Banknote,
	Building2,
	CalendarClock,
	ClipboardCheck,
	FileSpreadsheet,
	Landmark,
	ListChecks,
	ReceiptText,
	Scale,
	TrendingDown,
	TrendingUp,
	Users,
	Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { EmptyState } from "@/components/am/misc";
import { CashSummary } from "@/components/cash-summary";
import { ModuleCommandCenter } from "@/components/dashboard/module-command-center";
import {
	defaultPeriod,
	inPeriod,
	PeriodPicker,
	type PeriodValue,
} from "@/components/period-picker";
import { api } from "@/lib/api";

const CURRENCY_LABEL = "сом";

function fmt(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(
		Math.round(v),
	);
}
function fmtShort(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} млн`;
	if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} тыс`;
	return String(Math.round(v));
}

const CAT_COLORS = [
	"#3b82f6",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#06b6d4",
	"#f97316",
	"#6b7280",
];

const MONTHS_SHORT = [
	"Янв",
	"Фев",
	"Мар",
	"Апр",
	"Май",
	"Июн",
	"Июл",
	"Авг",
	"Сен",
	"Окт",
	"Ноя",
	"Дек",
];

export default function ConstructionDashboard() {
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const [filterProject, setFilterProject] = useState("all");

	const { data: ops = [] } = useQuery({
		queryKey: ["construction-operations"],
		queryFn: () => api.get("/construction/operations").then((r) => r.data),
	});
	const { data: accounts = [] } = useQuery({
		queryKey: ["construction-accounts"],
		queryFn: () => api.get("/construction/accounts").then((r) => r.data),
	});
	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: accruals = [] } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});

	const now = new Date();
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

	// Safe array wrappers
	const opsArray = Array.isArray(ops) ? ops : [];
	const accountsArray = Array.isArray(accounts) ? accounts : [];
	const projectsArray = Array.isArray(projects) ? projects : [];
	const accrualsArray = Array.isArray(accruals) ? accruals : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];

	const filteredOps = opsArray.filter((o: any) => {
		if (!inPeriod(o.date, period)) return false;
		if (filterProject !== "all" && String(o.projectId) !== filterProject)
			return false;
		return true;
	});

	const totalIncome = filteredOps
		.filter((o: any) => o.type === "income")
		.reduce((s: number, o: any) => s + parseFloat(o.amountKgs || "0"), 0);
	const totalExpense = filteredOps
		.filter((o: any) => o.type === "expense")
		.reduce((s: number, o: any) => s + parseFloat(o.amountKgs || "0"), 0);
	const netProfit = totalIncome - totalExpense;
	const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

	const totalAccountsKgs = accountsArray
		.filter((a: any) => a.currency === "KGS")
		.reduce((s: number, a: any) => s + parseFloat(a.currentBalance || "0"), 0);
	const overdueDebt = accrualsArray
		.filter((a: any) => a.status !== "paid" && new Date(a.dueDate) < now)
		.reduce((s: number, a: any) => s + parseFloat(a.remainingAmount || "0"), 0);

	// Expense by category
	const expByCat: Record<string, number> = {};
	filteredOps
		.filter((o: any) => o.type === "expense")
		.forEach((o: any) => {
			const cat = o.category || "Прочее";
			expByCat[cat] = (expByCat[cat] || 0) + parseFloat(o.amountKgs || "0");
		});
	const expCatSorted = Object.entries(expByCat).sort((a, b) => b[1] - a[1]);
	const maxExpCat = expCatSorted[0]?.[1] || 1;

	// Monthly cashflow (last 6 months)
	const last6 = Array.from({ length: 6 }, (_, i) => {
		const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
	});
	const monthlyData = last6.map((m) => {
		const inc = opsArray
			.filter((o: any) => o.type === "income" && o.date?.startsWith(m))
			.reduce((s: number, o: any) => s + parseFloat(o.amountKgs || "0"), 0);
		const exp = opsArray
			.filter((o: any) => o.type === "expense" && o.date?.startsWith(m))
			.reduce((s: number, o: any) => s + parseFloat(o.amountKgs || "0"), 0);
		return { m, inc, exp };
	});
	const maxMonthly = Math.max(
		...monthlyData.map((d) => Math.max(d.inc, d.exp)),
		1,
	);

	// Top income clients (by contract total amount)
	const clientData: Record<string, { total: number; paid: number }> = {};
	contractsArray.forEach((c: any) => {
		const total = parseFloat(c.totalAmount || "0");
		const paid = parseFloat(c.paidAmount || "0");
		const name = c.buyerName || "—";
		if (!clientData[name]) clientData[name] = { total: 0, paid: 0 };
		clientData[name].total += total;
		clientData[name].paid += paid;
	});
	const topClients = Object.entries(clientData)
		.filter(([_, d]) => d.total > 0)
		.sort((a, b) => b[1].total - a[1].total)
		.slice(0, 5);

	// Top expense counterparties
	const contExp: Record<string, number> = {};
	filteredOps
		.filter((o: any) => o.type === "expense")
		.forEach((o: any) => {
			if (o.description)
				contExp[o.description] =
					(contExp[o.description] || 0) + parseFloat(o.amountKgs || "0");
		});
	const topContExp = Object.entries(contExp)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5);
	const maxContAmt = topContExp[0]?.[1] || 1;
	const financeMetrics = [
		{
			label: "Деньги бизнеса",
			value: fmtShort(totalAccountsKgs),
			description: `${accountsArray.length} счетов под контролем`,
			href: "/construction/accounts",
			icon: Wallet,
			tone: "blue" as const,
		},
		{
			label: "Поступления",
			value: fmtShort(totalIncome),
			description: "Деньги по выбранному периоду",
			href: "/construction/operations",
			icon: TrendingUp,
			tone: "emerald" as const,
		},
		{
			label: "Расходы",
			value: fmtShort(totalExpense),
			description: "Оплаты, подрядчики, материалы",
			href: "/construction/operations",
			icon: TrendingDown,
			tone: "amber" as const,
		},
		{
			label: "Дебиторка",
			value: fmtShort(overdueDebt),
			description: "Просроченные обязательства клиентов",
			href: "/construction/analytics/debt",
			icon: AlertCircle,
			tone: overdueDebt > 0 ? ("amber" as const) : ("emerald" as const),
		},
	];
	const financeSteps = [
		{
			title: "Счета и кассы",
			description: "Сначала видим деньги по банкам, кассе и валютам.",
			href: "/construction/accounts",
			icon: Landmark,
			meta: "остатки",
			tone: "blue" as const,
		},
		{
			title: "Операции",
			description: "Фиксируем приход и расход с проектом, статьей и контрагентом.",
			href: "/construction/operations",
			icon: Banknote,
			meta: "первичный учет",
			tone: "emerald" as const,
		},
		{
			title: "Начисления",
			description: "Договор автоматически превращается в график начислений.",
			href: "/construction/accruals",
			icon: ReceiptText,
			meta: "график оплат",
			tone: "cyan" as const,
		},
		{
			title: "ОДДС",
			description: "Движение денег по периодам: статья строкой, месяцы столбцами.",
			href: "/construction/analytics/cashflow",
			icon: FileSpreadsheet,
			meta: "cash flow",
			tone: "violet" as const,
		},
		{
			title: "ОПУ",
			description: "Доходы, расходы и прибыль без смешивания с кассовыми остатками.",
			href: "/construction/analytics/pnl",
			icon: BarChart2,
			meta: "profit & loss",
			tone: "amber" as const,
		},
		{
			title: "План оплат",
			description: "Будущие поступления, просрочки и задолженности в одном ритме.",
			href: "/construction/planning/forecast",
			icon: CalendarClock,
			meta: "контроль сроков",
			tone: "cyan" as const,
		},
	];
	const financeLanes = [
		{
			title: "Финансист",
			description: "операции, счета, сверки",
			value: `${filteredOps.length}`,
			progress: Math.min(100, filteredOps.length * 8),
		},
		{
			title: "Коммерческий директор",
			description: "цены, коэффициенты, договоры",
			value: `${contractsArray.length}`,
			progress: Math.min(100, contractsArray.length * 12),
		},
		{
			title: "Бухгалтерия",
			description: "1С, подтверждение, закрытие",
			value: "1С",
			progress: 62,
		},
	];
	const financeQuickLinks = [
		{
			title: "Сверка 1С",
			description: "банк, импорт, подтверждение",
			href: "/construction/reconciliation",
			icon: Scale,
		},
		{
			title: "Согласование",
			description: "платежи до проведения",
			href: "/construction/planning/approvals",
			icon: ClipboardCheck,
		},
		{
			title: "Бюджет",
			description: "план-факт по проектам",
			href: "/construction/budget",
			icon: ListChecks,
		},
	];

	return (
		<div className="am-page space-y-4 -mt-1">
			<ModuleCommandCenter
				eyebrow="Финансовый контур"
				title="От договора до денег, ОДДС, ОПУ и контроля долгов"
				description="Финансовый модуль должен вести пользователя по процессу: счета, операции, начисления, отчеты, будущие платежи и просрочки. Ниже остаются графики и детализация."
				primaryHref="/construction/operations"
				primaryLabel="Провести операцию"
				metrics={financeMetrics}
				steps={financeSteps}
				lanes={financeLanes}
				quickLinks={financeQuickLinks}
			/>

			{/* Period / project filter */}
			<div className="am-shell-filter flex flex-wrap items-center justify-between gap-3 p-2.5">
				<div className="flex flex-wrap items-center gap-2">
					<PeriodPicker value={period} onChange={setPeriod} />
					<div className="flex flex-wrap gap-1.5">
						<button
							type="button"
							onClick={() => setFilterProject("all")}
							className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
								filterProject === "all"
									? "bg-cyan-600 text-white shadow-sm"
									: "bg-white/80 text-am-text-muted hover:bg-white"
							}`}
						>
							Все проекты
						</button>
						{projectsArray.slice(0, 3).map((p: any) => (
							<button
								type="button"
								key={p.id}
								onClick={() => setFilterProject(String(p.id))}
								className={`max-w-[140px] truncate rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
									filterProject === String(p.id)
										? "bg-cyan-600 text-white shadow-sm"
										: "bg-white/80 text-am-text-muted hover:bg-white"
								}`}
							>
								{p.name}
							</button>
						))}
					</div>
				</div>
				<CashSummary accounts={accountsArray} />
			</div>

			{/* KPI */}
			<div className="am-kpi-grid">
				<Link href="/construction/operations" className="group block no-underline">
					<div className="am-kpi-card h-full transition-all group-hover:border-emerald-400/40">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-am-text-muted">
								Доходы
							</span>
							<TrendingUp className="h-4 w-4 text-emerald-500" />
						</div>
						<div className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-700">
							{fmt(totalIncome)}
						</div>
						<div className="mt-0.5 text-xs text-am-text-muted">{CURRENCY_LABEL}</div>
						<div className="mt-3 flex h-6 items-end gap-0.5">
							{monthlyData.map(({ m, inc }) => (
								<div
									key={m}
									className="flex-1 rounded-sm bg-emerald-200/80"
									style={{
										height: `${maxMonthly > 0 ? Math.max(4, (inc / maxMonthly) * 24) : 4}px`,
									}}
								/>
							))}
						</div>
					</div>
				</Link>

				<Link href="/construction/operations" className="group block no-underline">
					<div className="am-kpi-card h-full transition-all group-hover:border-rose-400/40">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-am-text-muted">
								Расходы
							</span>
							<TrendingDown className="h-4 w-4 text-rose-500" />
						</div>
						<div className="mt-2 font-mono text-2xl font-bold tabular-nums text-rose-700">
							{fmt(totalExpense)}
						</div>
						<div className="mt-0.5 text-xs text-am-text-muted">{CURRENCY_LABEL}</div>
						<div className="mt-3 flex h-6 items-end gap-0.5">
							{monthlyData.map(({ m, exp }) => (
								<div
									key={m}
									className="flex-1 rounded-sm bg-rose-200/80"
									style={{
										height: `${maxMonthly > 0 ? Math.max(4, (exp / maxMonthly) * 24) : 4}px`,
									}}
								/>
							))}
						</div>
					</div>
				</Link>

				<Link href="/construction/operations" className="group block no-underline">
					<div
						className={`am-kpi-card h-full transition-all ${
							netProfit >= 0
								? "border-emerald-200/80 bg-emerald-50/70 group-hover:border-emerald-400/50"
								: "border-rose-200/80 bg-rose-50/70 group-hover:border-rose-400/50"
						}`}
					>
						<div className="flex items-center justify-between">
							<span
								className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
									netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
								}`}
							>
								Чистая прибыль
							</span>
							<BarChart2
								className={`h-4 w-4 ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
							/>
						</div>
						<div
							className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
								netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
							}`}
						>
							{netProfit >= 0 ? "+" : ""}
							{fmt(netProfit)}
						</div>
						<div
							className={`mt-0.5 text-xs ${
								netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
							}`}
						>
							{CURRENCY_LABEL} · рентабельность {margin.toFixed(1)}%
						</div>
						<div className="mt-3 flex h-6 items-end gap-0.5">
							{monthlyData.map(({ m, inc, exp }) => {
								const net = inc - exp;
								return (
									<div
										key={m}
										className={`flex-1 rounded-sm ${
											netProfit >= 0 ? "bg-emerald-400/40" : "bg-rose-400/40"
										}`}
										style={{
											height: `${maxMonthly > 0 ? Math.max(4, (Math.abs(net) / maxMonthly) * 24) : 4}px`,
										}}
									/>
								);
							})}
						</div>
					</div>
				</Link>

				<Link href="/construction/accounts" className="group block no-underline">
					<div className="am-kpi-card h-full transition-all group-hover:border-cyan-400/40">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-am-text-muted">
								Деньги бизнеса
							</span>
							<Wallet className="h-4 w-4 text-cyan-600" />
						</div>
						<div className="mt-2 font-mono text-2xl font-bold tabular-nums text-am-text-strong">
							{fmt(totalAccountsKgs)}
						</div>
						<div className="mt-0.5 text-xs text-am-text-muted">
							{CURRENCY_LABEL} · {accountsArray.length} счетов
						</div>
						<div className="mt-2 space-y-0.5">
							{accountsArray.slice(0, 3).map((a: any) => (
								<div
									key={a.id}
									className="flex justify-between text-[10px] text-am-text-muted"
								>
									<span className="max-w-[80px] truncate">{a.name}</span>
									<span className="font-mono tabular-nums">{fmtShort(a.currentBalance)}</span>
								</div>
							))}
						</div>
					</div>
				</Link>
			</div>

			{/* Charts + side metrics */}
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<div className="am-panel p-5 sm:col-span-2">
					<div className="mb-4 flex items-center justify-between gap-3">
						<div className="text-sm font-semibold text-am-text-strong">
							Деньги на счетах (за 6 мес.)
						</div>
						<div className="flex items-center gap-3 text-xs text-am-text-muted">
							<span className="flex items-center gap-1">
								<span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
								Приходы
							</span>
							<span className="flex items-center gap-1">
								<span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
								Расходы
							</span>
						</div>
					</div>
					<div className="flex h-32 items-end gap-3">
						{monthlyData.map(({ m, inc, exp }) => {
							const mIdx = parseInt(m.split("-")[1], 10) - 1;
							const incH = Math.round((inc / maxMonthly) * 120);
							const expH = Math.round((exp / maxMonthly) * 120);
							const isCurrentMonth = m === currentMonth;
							return (
								<div key={m} className="flex flex-1 flex-col items-center gap-1">
									<div className="flex h-28 w-full items-end gap-0.5">
										<div
											className={`flex-1 rounded-t-md transition-all ${
												isCurrentMonth ? "bg-emerald-500" : "bg-emerald-200"
											}`}
											style={{ height: Math.max(2, incH) }}
											title={`Приход: ${fmt(inc)} ${CURRENCY_LABEL}`}
										/>
										<div
											className={`flex-1 rounded-t-md transition-all ${
												isCurrentMonth ? "bg-rose-500" : "bg-rose-200"
											}`}
											style={{ height: Math.max(2, expH) }}
											title={`Расход: ${fmt(exp)} ${CURRENCY_LABEL}`}
										/>
									</div>
									<div
										className={`text-[10px] ${
											isCurrentMonth
												? "font-semibold text-am-text-strong"
												: "text-am-text-muted"
										}`}
									>
										{MONTHS_SHORT[mIdx]}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<div className="flex flex-col gap-4">
					<div className="am-kpi-card flex-1">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-am-text-muted">
								Рентабельность
							</span>
							<span className="text-[10px] text-am-text-subtle">→ 100%</span>
						</div>
						<div
							className={`mt-2 font-mono text-3xl font-bold tabular-nums ${
								margin >= 0 ? "text-am-text-strong" : "text-rose-600"
							}`}
						>
							{margin.toFixed(1)}%
						</div>
						<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
							<div
								className="h-full rounded-full bg-emerald-500"
								style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
							/>
						</div>
					</div>
					<div className="am-kpi-card flex-1 border-rose-200/80 bg-rose-50/60">
						<div className="mb-1 flex items-center gap-1">
							<AlertCircle className="h-3.5 w-3.5 text-rose-600" />
							<span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">
								Дебиторская задолженность
							</span>
						</div>
						<div className="mt-2 font-mono text-2xl font-bold tabular-nums text-rose-600">
							{fmt(overdueDebt)}
						</div>
						<div className="mt-0.5 text-xs text-rose-600/80">
							{CURRENCY_LABEL} просрочено
						</div>
					</div>
				</div>
			</div>

			{/* Expense dynamics + structure */}
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<div className="am-panel p-5 sm:col-span-2">
					<div className="mb-4 text-sm font-semibold text-am-text-strong">
						Динамика расходов
					</div>
					{expCatSorted.length === 0 ? (
						<EmptyState
							compact
							icon={<BarChart2 className="h-8 w-8" />}
							title="Нет расходных операций"
							description="Проведите расход в выбранном периоде — статьи появятся здесь."
						/>
					) : (
						<div className="space-y-2">
							{expCatSorted.slice(0, 8).map(([cat, amount], i) => {
								const pct = Math.round((amount / maxExpCat) * 100);
								const color = CAT_COLORS[i % CAT_COLORS.length];
								return (
									<div key={cat} className="flex items-center gap-3">
										<div className="w-24 flex-shrink-0 truncate text-right text-xs text-am-text-muted">
											{cat}
										</div>
										<div className="h-6 flex-1 overflow-hidden rounded-lg bg-slate-50">
											<div
												className="flex h-full items-center rounded-lg px-2"
												style={{
													width: `${pct}%`,
													backgroundColor: `${color}cc`,
													minWidth: 8,
												}}
											>
												<span className="text-[10px] font-medium text-white">
													{pct > 15 ? fmtShort(amount) : ""}
												</span>
											</div>
										</div>
										<div className="w-20 text-right font-mono text-xs tabular-nums text-am-text-muted">
											{fmt(amount)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				<div className="am-panel p-5">
					<div className="mb-4 text-sm font-semibold text-am-text-strong">
						Структура расходов
					</div>
					{expCatSorted.length === 0 ? (
						<EmptyState
							compact
							icon={<BarChart2 className="h-10 w-10" />}
							title="Нет данных для диаграммы"
						/>
					) : (
						<>
							<DonutChart data={expCatSorted.slice(0, 6)} />
							<div className="mt-3 space-y-1.5">
								{expCatSorted.slice(0, 5).map(([cat, amount], i) => (
									<div key={cat} className="flex items-center gap-2 text-xs">
										<div
											className="h-2 w-2 flex-shrink-0 rounded-full"
											style={{ backgroundColor: CAT_COLORS[i] }}
										/>
										<span className="flex-1 truncate text-am-text-muted">{cat}</span>
										<span className="font-mono tabular-nums text-am-text-muted">
											{totalExpense > 0
												? Math.round((amount / totalExpense) * 100)
												: 0}
											%
										</span>
									</div>
								))}
							</div>
						</>
					)}
				</div>
			</div>

			{/* Top clients + top expense counterparties */}
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="am-panel p-5">
					<div className="mb-4 flex items-center gap-2">
						<Users className="h-4 w-4 text-emerald-600" />
						<div className="text-sm font-semibold text-am-text-strong">
							Самые доходные клиенты
						</div>
					</div>
					{topClients.length === 0 ? (
						<EmptyState compact title="Нет данных по договорам" />
					) : (
						<div className="space-y-3">
							{topClients.map(([name, data]) => {
								const paidPct = (data.paid / data.total) * 100;
								const remaining = data.total - data.paid;
								return (
									<div key={name}>
										<div className="mb-1 flex items-center justify-between text-sm">
											<span className="max-w-[180px] truncate text-am-text-strong">
												{name}
											</span>
											<span className="font-mono text-xs tabular-nums text-am-text-muted">
												{fmt(data.total)}
											</span>
										</div>
										<div className="mb-1 flex items-center gap-2 font-mono text-xs">
											<span className="text-emerald-600">✓ {fmt(data.paid)}</span>
											<span className="text-am-text-subtle">•</span>
											<span className="text-rose-600">{fmt(remaining)} осталось</span>
										</div>
										<div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
											<div
												className="h-full bg-emerald-400"
												style={{ width: `${paidPct.toFixed(1)}%` }}
											/>
											<div
												className="h-full bg-rose-400"
												style={{ width: `${(100 - paidPct).toFixed(1)}%` }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				<div className="am-panel p-5">
					<div className="mb-4 flex items-center gap-2">
						<Building2 className="h-4 w-4 text-rose-600" />
						<div className="text-sm font-semibold text-am-text-strong">
							Контрагенты с наибольшими расходами
						</div>
					</div>
					{topContExp.length === 0 ? (
						<EmptyState compact title="Нет расходных операций" />
					) : (
						<div className="space-y-2">
							{topContExp.map(([name, amount]) => (
								<div key={name}>
									<div className="mb-0.5 flex items-center justify-between text-sm">
										<span className="max-w-[200px] truncate text-am-text-strong">
											{name}
										</span>
										<span className="font-mono font-medium tabular-nums text-rose-600">
											{fmt(amount)}
										</span>
									</div>
									<div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
										<div
											className="h-full rounded-full bg-rose-400"
											style={{
												width: `${Math.round((amount / maxContAmt) * 100)}%`,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Recent operations */}
			<div className="am-panel overflow-hidden p-0">
				<div className="flex flex-col gap-3 border-b border-am-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="text-sm font-semibold text-am-text-strong">
						Последние операции
					</div>
					<Link href="/construction/operations">
						<button
							type="button"
							className="flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-800"
						>
							Все операции <ArrowRight className="h-3 w-3" />
						</button>
					</Link>
				</div>
				{filteredOps.length === 0 ? (
					<EmptyState
						compact
						title="Нет операций за период"
						description="Измените период или проведите первую операцию."
					/>
				) : (
					<div>
						{[...filteredOps]
							.reverse()
							.slice(0, 8)
							.map((op: any) => {
								const proj = projectsArray.find(
									(p: any) => p.id === op.projectId,
								);
								const isIncome = op.type === "income";
								const isTransfer = op.type === "transfer";
								return (
									<div
										key={op.id}
										className="flex items-center gap-4 border-b border-am-border/40 px-5 py-2.5 last:border-b-0 hover:bg-cyan-50/40"
									>
										<div className="w-20 flex-shrink-0 text-xs text-am-text-muted">
											{op.date}
										</div>
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm text-am-text-strong">
												{op.description}
											</div>
											{op.category && (
												<div className="text-xs text-am-text-muted">{op.category}</div>
											)}
										</div>
										<div className="flex-shrink-0 text-xs text-am-text-muted">
											{proj?.name || ""}
										</div>
										<div
											className={`flex-shrink-0 font-mono text-sm font-semibold tabular-nums ${
												isIncome
													? "text-emerald-600"
													: isTransfer
														? "text-blue-600"
														: "text-rose-600"
											}`}
										>
											{isIncome ? "+" : isTransfer ? "⇄" : "−"}
											{fmt(op.amountKgs)}
										</div>
									</div>
								);
							})}
					</div>
				)}
			</div>
		</div>
	);
}

function DonutChart({ data }: { data: [string, number][] }) {
	const total = data.reduce((s, [, v]) => s + v, 0);
	if (total === 0) return null;
	const colors = CAT_COLORS;
	const size = 100;
	const cx = size / 2,
		cy = size / 2,
		r = 35,
		strokeW = 16;
	let cumulative = 0;
	const segments = data.map(([cat, val], i) => {
		const pct = val / total;
		const startAngle = cumulative * 360 - 90;
		cumulative += pct;
		const endAngle = cumulative * 360 - 90;
		const start = polarToCartesian(cx, cy, r, endAngle);
		const end = polarToCartesian(cx, cy, r, startAngle);
		const largeArc = pct > 0.5 ? 1 : 0;
		return {
			d: `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
			color: colors[i % colors.length],
			cat,
			val,
		};
	});
	return (
		<div className="flex justify-center">
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				<circle
					cx={cx}
					cy={cy}
					r={r}
					fill="none"
					stroke="#f3f4f6"
					strokeWidth={strokeW}
				/>
				{segments.map((s, i) => (
					<path
						key={i}
						d={s.d}
						fill="none"
						stroke={s.color}
						strokeWidth={strokeW}
						strokeLinecap="butt"
					>
						<title>
							{s.cat}: {Math.round((s.val / total) * 100)}%
						</title>
					</path>
				))}
			</svg>
		</div>
	);
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
	const rad = (angleDeg * Math.PI) / 180;
	return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
