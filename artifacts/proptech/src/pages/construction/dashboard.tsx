import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	ArrowRight,
	BarChart2,
	Building2,
	TrendingDown,
	TrendingUp,
	Users,
	Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { CashSummary } from "@/components/cash-summary";
import {
	defaultPeriod,
	inPeriod,
	PeriodPicker,
	type PeriodValue,
} from "@/components/period-picker";
import { api } from "@/lib/api";

function fmt(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(Math.round(v));
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

	// Top income clients (by contract payments)
	const clientIncome: Record<string, number> = {};
	contractsArray.forEach((c: any) => {
		const paid = parseFloat(c.paidAmount || "0");
		if (paid > 0)
			clientIncome[c.buyerName || "—"] =
				(clientIncome[c.buyerName] || 0) + paid;
	});
	const topClients = Object.entries(clientIncome)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5);
	const maxClientAmt = topClients[0]?.[1] || 1;

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

	return (
		<div className="space-y-4 -mt-1">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						{projectsArray[0]?.name?.split(" ")[0] || "BuildFlow"}
					</h1>
					<p className="text-sm text-gray-400">Строительный дашборд</p>
				</div>
				<div className="flex items-center gap-2">
					<CashSummary accounts={accountsArray} />
				</div>
			</div>

			{/* Period / project filter */}
			<div className="flex items-center gap-2 flex-wrap">
				<PeriodPicker value={period} onChange={setPeriod} />
				<div className="flex gap-1 bg-gray-100 rounded-lg p-1">
					<button
						onClick={() => setFilterProject("all")}
						className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filterProject === "all" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
					>
						Все проекты
					</button>
					{projectsArray.slice(0, 3).map((p: any) => (
						<button
							key={p.id}
							onClick={() => setFilterProject(String(p.id))}
							className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filterProject === String(p.id) ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
						>
							{p.name}
						</button>
					))}
				</div>
			</div>

			{/* KPI Cards - like Adesk */}
			<div className="grid grid-cols-4 gap-4">
				{/* Доходы */}
				<Link href="/construction/operations" className="block no-underline">
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
					<div className="flex items-center justify-between mb-1">
						<span className="text-xs text-gray-400 font-medium">ДОХОДЫ</span>
						<TrendingUp className="w-4 h-4 text-emerald-400" />
					</div>
					<div className="text-2xl font-bold text-gray-900 mt-1">
						{fmt(totalIncome)}
					</div>
					<div className="text-xs text-gray-400 mt-0.5">KGS</div>
					{/* Mini sparkline */}
					<div className="flex items-end gap-0.5 h-6 mt-2">
						{monthlyData.map(({ m, inc }) => (
							<div
								key={m}
								className="flex-1 bg-emerald-100 rounded-sm"
								style={{
									height: `${maxMonthly > 0 ? Math.max(4, (inc / maxMonthly) * 24) : 4}px`,
								}}
							/>
						))}
					</div>
					</div>
				</Link>

				{/* Расходы */}
				<Link href="/construction/operations" className="block no-underline">
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
					<div className="flex items-center justify-between mb-1">
						<span className="text-xs text-gray-400 font-medium">РАСХОДЫ</span>
						<TrendingDown className="w-4 h-4 text-rose-600" />
					</div>
					<div className="text-2xl font-bold text-gray-900 mt-1">
						{fmt(totalExpense)}
					</div>
					<div className="text-xs text-gray-400 mt-0.5">KGS</div>
					<div className="flex items-end gap-0.5 h-6 mt-2">
						{monthlyData.map(({ m, exp }) => (
							<div
								key={m}
								className="flex-1 bg-rose-100 rounded-sm"
								style={{
									height: `${maxMonthly > 0 ? Math.max(4, (exp / maxMonthly) * 24) : 4}px`,
								}}
							/>
						))}
					</div>
				</div>
				</Link>

				{/* Чистая прибыль */}
				<Link href="/construction/operations" className="block no-underline">
				<div
					className={`rounded-2xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all ${netProfit >= 0 ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200" : "bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200"}`}
				>
					<div className="flex items-center justify-between mb-1">
						<span
							className={`text-xs font-medium ${netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}
						>
							ЧИСТАЯ ПРИБЫЛЬ
						</span>
						<BarChart2
							className={`w-4 h-4 ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
						/>
					</div>
					<div
						className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}
					>
						{netProfit >= 0 ? "+" : ""}
						{fmt(netProfit)}
					</div>
					<div
						className={`text-xs mt-0.5 ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
					>
						KGS · рентабельность {margin.toFixed(1)}%
					</div>
					<div className="flex items-end gap-0.5 h-6 mt-2">
						{monthlyData.map(({ m, inc, exp }) => {
							const net = inc - exp;
							return (
								<div
									key={m}
									className={`flex-1 rounded-sm ${netProfit >= 0 ? "bg-emerald-600/30" : "bg-rose-600/30"}`}
									style={{
										height: `${maxMonthly > 0 ? Math.max(4, (Math.abs(net) / maxMonthly) * 24) : 4}px`,
									}}
								/>
							);
						})}
					</div>
				</div>
				</Link>

				{/* Деньги бизнеса */}
				<Link href="/construction/accounts" className="block no-underline">
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
					<div className="flex items-center justify-between mb-1">
						<span className="text-xs text-gray-400 font-medium">
							ДЕНЬГИ БИЗНЕСА
						</span>
						<Wallet className="w-4 h-4 text-blue-400" />
					</div>
					<div className="text-2xl font-bold text-gray-900 mt-1">
						{fmt(totalAccountsKgs)}
					</div>
					<div className="text-xs text-gray-400 mt-0.5">
						KGS · {accountsArray.length} счетов
					</div>
					<div className="mt-2 space-y-0.5">
						{accountsArray.slice(0, 3).map((a: any) => (
							<div
								key={a.id}
								className="flex justify-between text-[10px] text-gray-400"
							>
								<span className="truncate max-w-[80px]">{a.name}</span>
								<span className="font-mono">{fmtShort(a.currentBalance)}</span>
							</div>
						))}
					</div>
				</div>
				</Link>
			</div>

			{/* Second row */}
			<div className="grid grid-cols-3 gap-4">
				{/* Cashflow chart */}
				<div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
					<div className="flex items-center justify-between mb-4">
						<div className="text-sm font-semibold text-gray-700">
							Деньги на счетах (за 6 мес.)
						</div>
						<div className="flex items-center gap-3 text-xs text-gray-400">
							<span className="flex items-center gap-1">
								<span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
								Приходы
							</span>
							<span className="flex items-center gap-1">
								<span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
								Расходы
							</span>
						</div>
					</div>
					<div className="flex items-end gap-3 h-32">
						{monthlyData.map(({ m, inc, exp }, _i) => {
							const mIdx = parseInt(m.split("-")[1], 10) - 1;
							const incH = Math.round((inc / maxMonthly) * 120);
							const expH = Math.round((exp / maxMonthly) * 120);
							const isCurrentMonth = m === currentMonth;
							return (
								<div
									key={m}
									className="flex-1 flex flex-col items-center gap-1"
								>
									<div className="flex items-end gap-0.5 h-28 w-full">
										<div
											className={`flex-1 rounded-t-sm transition-all ${isCurrentMonth ? "bg-emerald-400" : "bg-emerald-200"}`}
											style={{ height: Math.max(2, incH) }}
											title={`Приход: ${fmt(inc)}`}
										/>
										<div
											className={`flex-1 rounded-t-sm transition-all ${isCurrentMonth ? "bg-red-400" : "bg-red-200"}`}
											style={{ height: Math.max(2, expH) }}
											title={`Расход: ${fmt(exp)}`}
										/>
									</div>
									<div
										className={`text-[10px] ${isCurrentMonth ? "text-gray-700 font-semibold" : "text-gray-400"}`}
									>
										{MONTHS_SHORT[mIdx]}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Рентабельность + Задолженность */}
				<div className="flex flex-col gap-4">
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex-1">
						<div className="flex items-center justify-between mb-1">
							<span className="text-xs text-gray-400 font-medium">
								РЕНТАБЕЛЬНОСТЬ
							</span>
							<span className="text-xs text-gray-300">→ 100%</span>
						</div>
						<div
							className={`text-3xl font-bold mt-1 ${margin >= 0 ? "text-gray-900" : "text-rose-600"}`}
						>
							{margin.toFixed(1)}%
						</div>
						<div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
							<div
								className="h-full bg-emerald-400 rounded-full"
								style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
							/>
						</div>
					</div>
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex-1">
						<div className="flex items-center gap-1 mb-1">
							<AlertCircle className="w-3 h-3 text-rose-600" />
							<span className="text-xs text-gray-400 font-medium">
								ДЕБИТОРСКАЯ ЗАДОЛЖЕННОСТЬ
							</span>
						</div>
						<div className="text-2xl font-bold text-rose-600 mt-1">
							{fmt(overdueDebt)}
						</div>
						<div className="text-xs text-gray-400 mt-0.5">KGS просрочено</div>
					</div>
				</div>
			</div>

			{/* Third row: expense dynamics + structure */}
			<div className="grid grid-cols-3 gap-4">
				{/* Динамика расходов по статьям */}
				<div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
					<div className="text-sm font-semibold text-gray-700 mb-4">
						Динамика расходов
					</div>
					{expCatSorted.length === 0 ? (
						<div className="text-center py-8 text-gray-300 text-sm">
							Нет расходных операций
						</div>
					) : (
						<div className="space-y-2">
							{expCatSorted.slice(0, 8).map(([cat, amount], i) => {
								const pct = Math.round((amount / maxExpCat) * 100);
								const color = CAT_COLORS[i % CAT_COLORS.length];
								return (
									<div key={cat} className="flex items-center gap-3">
										<div className="w-24 text-xs text-gray-500 truncate text-right flex-shrink-0">
											{cat}
										</div>
										<div className="flex-1 h-6 bg-gray-50 rounded overflow-hidden">
											<div
												className="h-full rounded flex items-center px-2"
												style={{
													width: `${pct}%`,
													backgroundColor: `${color}cc`,
													minWidth: 8,
												}}
											>
												<span className="text-[10px] text-white font-medium">
													{pct > 15 ? fmtShort(amount) : ""}
												</span>
											</div>
										</div>
										<div className="w-20 text-xs font-mono text-right text-gray-600">
											{fmt(amount)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Структура расходов (donut-style) */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
					<div className="text-sm font-semibold text-gray-700 mb-4">
						Структура расходов
					</div>
					{expCatSorted.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-32 text-gray-200">
							<BarChart2 className="w-12 h-12" />
						</div>
					) : (
						<>
							{/* Simple svg donut */}
							<DonutChart data={expCatSorted.slice(0, 6)} />
							<div className="space-y-1.5 mt-3">
								{expCatSorted.slice(0, 5).map(([cat, amount], i) => (
									<div key={cat} className="flex items-center gap-2 text-xs">
										<div
											className="w-2 h-2 rounded-full flex-shrink-0"
											style={{ backgroundColor: CAT_COLORS[i] }}
										/>
										<span className="flex-1 truncate text-gray-600">{cat}</span>
										<span className="font-mono text-gray-500">
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

			{/* Bottom: Top clients + top expense */}
			<div className="grid grid-cols-2 gap-4">
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
					<div className="flex items-center gap-2 mb-4">
						<Users className="w-4 h-4 text-emerald-500" />
						<div className="text-sm font-semibold text-gray-700">
							Самые доходные клиенты
						</div>
					</div>
					{topClients.length === 0 ? (
						<div className="text-center py-4 text-gray-300 text-sm">
							Нет данных
						</div>
					) : (
						<div className="space-y-2">
							{topClients.map(([name, amount]) => (
								<div key={name}>
									<div className="flex items-center justify-between text-sm mb-0.5">
										<span className="text-gray-700 truncate max-w-[200px]">
											{name}
										</span>
										<span className="font-mono font-medium text-emerald-600">
											{fmt(amount)}
										</span>
									</div>
									<div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
										<div
											className="h-full bg-emerald-400 rounded-full"
											style={{
												width: `${Math.round((amount / maxClientAmt) * 100)}%`,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
					<div className="flex items-center gap-2 mb-4">
						<Building2 className="w-4 h-4 text-rose-600" />
						<div className="text-sm font-semibold text-gray-700">
							Контрагенты с наибольшими расходами
						</div>
					</div>
					{topContExp.length === 0 ? (
						<div className="text-center py-4 text-gray-300 text-sm">
							Нет расходных операций
						</div>
					) : (
						<div className="space-y-2">
							{topContExp.map(([name, amount]) => (
								<div key={name}>
									<div className="flex items-center justify-between text-sm mb-0.5">
										<span className="text-gray-700 truncate max-w-[200px]">
											{name}
										</span>
										<span className="font-mono font-medium text-rose-600">
											{fmt(amount)}
										</span>
									</div>
									<div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
										<div
											className="h-full bg-red-400 rounded-full"
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

			{/* Recent ops */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
					<div className="text-sm font-semibold text-gray-700">
						Последние операции
					</div>
					<Link href="/construction/operations">
						<button className="text-xs text-amber-600 hover:text-amber-600 flex items-center gap-1">
							Все операции <ArrowRight className="w-3 h-3" />
						</button>
					</Link>
				</div>
				{filteredOps.length === 0 ? (
					<div className="px-5 py-8 text-center text-gray-400 text-sm">
						Нет операций за период
					</div>
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
										className="flex items-center gap-4 px-5 py-2.5 border-b border-gray-50 hover:bg-gray-50/50"
									>
										<div className="text-xs text-gray-400 w-20 flex-shrink-0">
											{op.date}
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-sm text-gray-800 truncate">
												{op.description}
											</div>
											{op.category && (
												<div className="text-xs text-gray-400">
													{op.category}
												</div>
											)}
										</div>
										<div className="text-xs text-gray-400 flex-shrink-0">
											{proj?.name || ""}
										</div>
										<div
											className={`font-mono font-semibold text-sm flex-shrink-0 ${isIncome ? "text-emerald-600" : isTransfer ? "text-blue-600" : "text-rose-600"}`}
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
