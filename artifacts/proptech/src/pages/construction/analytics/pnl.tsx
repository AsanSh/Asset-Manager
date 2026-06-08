import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
	DateRangePicker,
	defaultPeriod,
	type PeriodValue,
} from "@/components/am/DateRangePicker";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const fmt2 = (v: number) =>
	new Intl.NumberFormat("ru-KG", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(v);
const fmtPct = (v: number) =>
	`${new Intl.NumberFormat("ru-KG", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(v)}%`;

const MONTH_SHORT = [
	"Январь",
	"Февраль",
	"Март",
	"Апрель",
	"Май",
	"Июнь",
	"Июль",
	"Август",
	"Сентябрь",
	"Октябрь",
	"Ноябрь",
	"Декабрь",
];

function getMonthIdx(dateStr: string, year: string) {
	if (!dateStr) return -1;
	const d = dateStr.startsWith(`${year}-`)
		? dateStr
		: dateStr.startsWith(year)
			? dateStr
			: "";
	if (!d) return -1;
	return parseInt(d.slice(5, 7), 10) - 1;
}

type RowType = "section" | "group" | "item" | "subitem" | "total" | "percent";
interface Row {
	id: string;
	label: string;
	type: RowType;
	indent: number;
	values: number[];
	total: number;
	collapsible?: boolean;
	parentId?: string;
}

function yearFromPeriod(period: PeriodValue) {
	return String(new Date(`${period.from}T00:00:00`).getFullYear());
}

function monthIndexesInPeriod(period: PeriodValue, year: string) {
	const from = new Date(`${period.from}T00:00:00`);
	const to = new Date(`${period.to}T00:00:00`);
	return MONTH_SHORT.map((_, month) => {
		const monthStart = new Date(Number(year), month, 1);
		const monthEnd = new Date(Number(year), month + 1, 0);
		return monthEnd >= from && monthStart <= to ? month : -1;
	}).filter((month) => month >= 0);
}

function selectedTotal(row: Row, months: number[]) {
	return months.reduce((sum, month) => sum + (row.values[month] || 0), 0);
}

function selectedDisplayTotal(row: Row, months: number[]) {
	if (row.type !== "percent") return selectedTotal(row, months);
	const values = months.map((month) => row.values[month] || 0);
	const meaningful = values.filter((value) => value !== 0);
	if (meaningful.length === 0) return 0;
	return meaningful.reduce((sum, value) => sum + value, 0) / meaningful.length;
}

const CONST_EXPENSE_CATS: Record<string, string> = {
	materials: "Материалы",
	labor: "Оплата труда",
	equipment: "Техника/Оборудование",
	subcontract: "Субподряд",
	design: "Проектирование",
	permits: "Разрешения/Согласования",
	utilities: "Коммуналка",
	transport: "Транспорт",
	admin: "Административные",
	other: "Прочие расходы",
};

export default function ConstructionPnL() {
	const [period, setPeriod] = useState<PeriodValue>(() => defaultPeriod("year"));
	const year = yearFromPeriod(period);
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
	const toggle = (id: string) =>
		setCollapsed((prev) => {
			const n = new Set(prev);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});

	const { data: cfData = [] } = useQuery<any[]>({
		queryKey: ["construction-cashflow", year],
		queryFn: () =>
			api
				.get(`/construction/analytics/cashflow?year=${year}`)
				.then((r) => r.data),
	});
	const { data: accruals = [] } = useQuery<any[]>({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});
	const { data: expenses = [] } = useQuery<any[]>({
		queryKey: ["construction-expenses"],
		queryFn: () => api.get("/construction/expenses").then((r) => r.data),
	});
	const { data: projects = [] } = useQuery<any[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	const rows = useMemo(() => {
		const sumArr = (a: number[]) => a.reduce((s, v) => s + v, 0);

		const projMap: Record<number, string> = {};
		projects.forEach((p: any) => {
			projMap[p.id] = p.name || `Проект ${p.id}`;
		});

		// Revenue from operations (type=income) from cashflow endpoint
		const incomeByMonth: number[] = Array(12).fill(0);
		cfData.forEach((row: any) => {
			if (row.type !== "income") return;
			const m = parseInt((row.month || "").slice(5, 7), 10) - 1;
			if (m >= 0 && m < 12) incomeByMonth[m] += parseFloat(row.total || "0");
		});

		// Revenue from accruals by month
		const accrualByMonth: number[] = Array(12).fill(0);
		accruals.forEach((a: any) => {
			const m = getMonthIdx(a.accrualDate || a.dueDate || a.createdAt, year);
			if (m < 0) return;
			accrualByMonth[m] += parseFloat(a.amount || "0");
		});

		// Expenses from operations (type=expense)
		const expenseByMonth: number[] = Array(12).fill(0);
		cfData.forEach((row: any) => {
			if (row.type !== "expense") return;
			const m = parseInt((row.month || "").slice(5, 7), 10) - 1;
			if (m >= 0 && m < 12) expenseByMonth[m] += parseFloat(row.total || "0");
		});

		// Construction expenses by project and category
		const expByProj: Record<number, Record<string, number[]>> = {};
		const expNoProjByCat: Record<string, number[]> = {};
		expenses.forEach((e: any) => {
			const m = getMonthIdx(e.expenseDate || e.createdAt, year);
			if (m < 0) return;
			const cat = e.category || "other";
			if (e.projectId) {
				if (!expByProj[e.projectId]) expByProj[e.projectId] = {};
				if (!expByProj[e.projectId][cat])
					expByProj[e.projectId][cat] = Array(12).fill(0);
				expByProj[e.projectId][cat][m] += parseFloat(e.amount || "0");
			} else {
				if (!expNoProjByCat[cat]) expNoProjByCat[cat] = Array(12).fill(0);
				expNoProjByCat[cat][m] += parseFloat(e.amount || "0");
			}
		});

		const result: Row[] = [];

		// ═══ REVENUES ════════════════════════════════════════════════════════
		const revenueVals = incomeByMonth;
		result.push({
			id: "revenue",
			label: "Выручка",
			type: "section",
			indent: 0,
			collapsible: true,
			values: revenueVals,
			total: sumArr(revenueVals),
		});

		// Sales income (from operations income)
		result.push({
			id: "sales_income",
			label: "Продажи недвижимости",
			type: "group",
			indent: 1,
			parentId: "revenue",
			collapsible: true,
			values: incomeByMonth,
			total: sumArr(incomeByMonth),
		});
		if (sumArr(incomeByMonth) === 0) {
			result.push({
				id: "sales_none",
				label: "—",
				type: "item",
				indent: 2,
				parentId: "sales_income",
				values: Array(12).fill(0),
				total: 0,
			});
		}

		// Accruals (planned revenue)
		result.push({
			id: "accruals",
			label: "Начисления (план)",
			type: "group",
			indent: 1,
			parentId: "revenue",
			values: accrualByMonth,
			total: sumArr(accrualByMonth),
		});

		// Other income
		result.push({
			id: "other_income",
			label: "Прочие доходы",
			type: "item",
			indent: 1,
			parentId: "revenue",
			values: Array(12).fill(0),
			total: 0,
		});

		// ═══ DIRECT COSTS ════════════════════════════════════════════════════
		// Combine expenses from operations and from construction expenses table
		const combinedExpenses = expenseByMonth.map((v, i) => {
			const expFromTable =
				Object.values(expByProj).reduce(
					(acc, p) => acc + Object.values(p).reduce((s, arr) => s + arr[i], 0),
					0,
				) + Object.values(expNoProjByCat).reduce((s, arr) => s + arr[i], 0);
			return Math.max(v, expFromTable);
		});

		result.push({
			id: "direct_costs",
			label: "Прямые расходы",
			type: "section",
			indent: 0,
			collapsible: true,
			values: combinedExpenses,
			total: sumArr(combinedExpenses),
		});

		// Variable by project
		const varSection: Row = {
			id: "var_costs",
			label: "Переменные расходы (по проектам)",
			type: "group",
			indent: 1,
			parentId: "direct_costs",
			collapsible: true,
			values: Array(12).fill(0),
			total: 0,
		};
		const projIds = Object.keys(expByProj).map(Number);
		let varTotals: number[] = Array(12).fill(0);

		result.push(varSection);
		projIds.forEach((pid) => {
			const projTotals: number[] = Array(12).fill(0);
			const projSection: Row = {
				id: `proj_${pid}`,
				label: projMap[pid] || `Проект ${pid}`,
				type: "item",
				indent: 2,
				parentId: "var_costs",
				collapsible: true,
				values: Array(12).fill(0),
				total: 0,
			};
			result.push(projSection);
			Object.entries(expByProj[pid]).forEach(([cat, vals]) => {
				result.push({
					id: `proj_${pid}_${cat}`,
					label: CONST_EXPENSE_CATS[cat] || cat,
					type: "subitem",
					indent: 3,
					parentId: `proj_${pid}`,
					values: vals,
					total: sumArr(vals),
				});
				vals.forEach((v, i) => {
					projTotals[i] += v;
				});
			});
			projSection.values = [...projTotals];
			projSection.total = sumArr(projTotals);
			projTotals.forEach((v, i) => {
				varTotals[i] += v;
			});
		});
		if (projIds.length === 0) {
			// Use operations expense data
			result.push({
				id: "op_expenses",
				label: "Операционные расходы",
				type: "item",
				indent: 2,
				parentId: "var_costs",
				values: expenseByMonth,
				total: sumArr(expenseByMonth),
			});
			varTotals = [...expenseByMonth];
		}
		varSection.values = [...varTotals];
		varSection.total = sumArr(varTotals);

		// Fixed costs (no project)
		const fixedSection: Row = {
			id: "fixed_costs",
			label: "Постоянные расходы",
			type: "group",
			indent: 1,
			parentId: "direct_costs",
			collapsible: true,
			values: Array(12).fill(0),
			total: 0,
		};
		result.push(fixedSection);
		const fixedTotals: number[] = Array(12).fill(0);
		Object.entries(expNoProjByCat).forEach(([cat, vals]) => {
			result.push({
				id: `fixed_${cat}`,
				label: CONST_EXPENSE_CATS[cat] || cat,
				type: "item",
				indent: 2,
				parentId: "fixed_costs",
				values: vals,
				total: sumArr(vals),
			});
			vals.forEach((v, i) => {
				fixedTotals[i] += v;
			});
		});
		if (Object.keys(expNoProjByCat).length === 0) {
			result.push({
				id: "fixed_none",
				label: "—",
				type: "item",
				indent: 2,
				parentId: "fixed_costs",
				values: Array(12).fill(0),
				total: 0,
			});
		}
		fixedSection.values = [...fixedTotals];
		fixedSection.total = sumArr(fixedTotals);

		// ═══ METRICS ════════════════════════════════════════════════════════
		const gpVals = revenueVals.map((v, i) => v - combinedExpenses[i]);
		result.push({
			id: "gross_profit",
			label: "Валовая прибыль",
			type: "total",
			indent: 0,
			values: gpVals,
			total: sumArr(gpVals),
		});
		result.push({
			id: "gp_pct",
			label: "Рентабельность по валовой прибыли, %",
			type: "percent",
			indent: 0,
			values: gpVals.map((v, i) =>
				revenueVals[i] > 0 ? (v / revenueVals[i]) * 100 : 0,
			),
			total:
				sumArr(revenueVals) > 0
					? (sumArr(gpVals) / sumArr(revenueVals)) * 100
					: 0,
		});
		result.push({
			id: "op_profit",
			label: "Операционная прибыль",
			type: "total",
			indent: 0,
			values: gpVals,
			total: sumArr(gpVals),
		});
		result.push({
			id: "op_pct",
			label: "Операционная рентабельность, %",
			type: "percent",
			indent: 0,
			values: gpVals.map((v, i) =>
				revenueVals[i] > 0 ? (v / revenueVals[i]) * 100 : 0,
			),
			total:
				sumArr(revenueVals) > 0
					? (sumArr(gpVals) / sumArr(revenueVals)) * 100
					: 0,
		});
		result.push({
			id: "net_profit",
			label: "Чистая прибыль",
			type: "total",
			indent: 0,
			values: gpVals,
			total: sumArr(gpVals),
		});
		result.push({
			id: "net_pct",
			label: "Рентабельность по чистой прибыли, %",
			type: "percent",
			indent: 0,
			values: gpVals.map((v, i) =>
				revenueVals[i] > 0 ? (v / revenueVals[i]) * 100 : 0,
			),
			total:
				sumArr(revenueVals) > 0
					? (sumArr(gpVals) / sumArr(revenueVals)) * 100
					: 0,
		});
		result.push({
			id: "distrib",
			label: "Вывод прибыли из бизнеса",
			type: "item",
			indent: 0,
			values: Array(12).fill(0),
			total: 0,
		});
		result.push({
			id: "retained",
			label: "Нераспределённая прибыль",
			type: "total",
			indent: 0,
			values: gpVals,
			total: sumArr(gpVals),
		});

		return result;
	}, [cfData, accruals, expenses, projects, year]);

	const visibleRows = useMemo(
		() =>
			rows.filter((row) => {
				if (!row.parentId) return true;
				let pid: string | undefined = row.parentId;
				while (pid) {
					if (collapsed.has(pid)) return false;
					const parent = rows.find((r) => r.id === pid);
					pid = parent?.parentId;
				}
				return true;
			}),
		[rows, collapsed],
	);

	const curMonth = new Date().getMonth();
	const visibleMonths = useMemo(() => {
		const months = monthIndexesInPeriod(period, year);
		return months.length ? months : Array.from({ length: 12 }, (_, i) => i);
	}, [period, year]);
	const periodTotals = useMemo(() => {
		const byId = (id: string) => {
			const row = rows.find((r) => r.id === id);
			return row ? selectedDisplayTotal(row, visibleMonths) : 0;
		};
		return {
			revenue: byId("revenue"),
			costs: byId("direct_costs"),
			gross: byId("gross_profit"),
			margin: byId("gp_pct"),
			net: byId("net_profit"),
		};
	}, [rows, visibleMonths]);
	const labelPad = [0, 12, 24, 36];
	const stickyBg: Record<string, string> = {
		section: "bg-gray-100",
		group: "bg-gray-50",
		total: "bg-gray-50",
		percent: "bg-blue-50",
		item: "bg-white",
		subitem: "bg-white",
	};

	function rowClass(r: Row) {
		switch (r.type) {
			case "section":
				return "bg-gray-100 font-bold text-gray-900 border-y border-gray-200";
			case "group":
				return "bg-gray-50 font-semibold text-gray-800 border-b border-gray-100";
			case "total":
				return "bg-gray-50 font-bold text-gray-900 border-y border-gray-200";
			case "percent":
				return "bg-blue-50 text-blue-700 italic border-b border-blue-100";
			default:
				return "bg-white text-gray-700 border-b border-gray-50";
		}
	}

	return (
		<div className="h-full flex flex-col rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-4">
			<div className="mb-4 flex flex-shrink-0 flex-col gap-4 rounded-[24px] border border-white bg-white/80 p-4 shadow-sm backdrop-blur xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
						Финансовая матрица
					</p>
					<h1 className="mt-1 text-3xl font-semibold text-slate-950">ОПУ</h1>
					<p className="mt-1 text-sm text-slate-500">
						Отчёт о прибылях и убытках
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<DateRangePicker value={period} onChange={setPeriod} />
				</div>
			</div>
			<div className="mb-4 grid gap-3 md:grid-cols-5">
				{[
					{ label: "Выручка", value: fmt2(periodTotals.revenue), tone: "text-cyan-700", bg: "bg-cyan-50 border-cyan-100" },
					{ label: "Расходы", value: fmt2(Math.abs(periodTotals.costs)), tone: "text-rose-700", bg: "bg-rose-50 border-rose-100" },
					{ label: "Валовая прибыль", value: fmt2(periodTotals.gross), tone: periodTotals.gross < 0 ? "text-rose-700" : "text-emerald-700", bg: "bg-white border-slate-200" },
					{ label: "Маржа", value: fmtPct(periodTotals.margin), tone: periodTotals.margin < 0 ? "text-rose-700" : "text-blue-700", bg: "bg-white border-slate-200" },
					{ label: "Чистая прибыль", value: fmt2(periodTotals.net), tone: periodTotals.net < 0 ? "text-rose-700" : "text-white", bg: "bg-slate-950 border-slate-950" },
				].map((card) => (
					<div key={card.label} className={`am-kpi-card ${card.bg}`}>
						<div className={cn("text-xs font-semibold uppercase tracking-wide", card.bg.includes("slate-950") ? "text-white/55" : "text-slate-400")}>
							{card.label}
						</div>
						<div className={cn("mt-2 font-mono text-xl font-black", card.tone)}>
							{card.value}
						</div>
					</div>
				))}
			</div>
			<div className="am-card flex-1 overflow-auto rounded-[28px] border border-white/80 bg-white/78 shadow-2xl shadow-slate-950/8 backdrop-blur-xl">
				<table
					className="text-sm border-collapse"
					style={{ minWidth: `${360 + visibleMonths.length * 112 + 128}px` }}
				>
					<thead>
						<tr className="sticky top-0 z-20 bg-slate-950 text-xs font-semibold text-white/75">
							<th
								className="sticky left-0 z-30 border-r border-white/10 bg-slate-950 px-4 py-3 text-left text-white/85"
								style={{ minWidth: "240px", width: "240px" }}
							>
								Статья
							</th>
							{visibleMonths.map((i) => (
								<th
									key={i}
									className={`border-r border-white/10 px-3 py-3 text-right ${i === curMonth && String(new Date().getFullYear()) === year ? "bg-cyan-500/18 text-cyan-100" : ""}`}
									style={{ minWidth: "112px" }}
								>
									{MONTH_SHORT[i].slice(0, 3)} {year.slice(2)}
								</th>
							))}
							<th
								className="sticky right-0 z-30 border-l border-slate-300 bg-slate-950 px-4 py-3 text-right font-bold text-white shadow-[-12px_0_24px_-20px_rgba(15,23,42,0.9)]"
								style={{ minWidth: "128px" }}
							>
								ИТОГО
							</th>
						</tr>
					</thead>
					<tbody>
						{visibleRows.map((row) => {
							const hasChildren = rows.some((r) => r.parentId === row.id);
							const isCollapsed = collapsed.has(row.id);
							return (
								<tr
									key={row.id}
									className={`${rowClass(row)} hover:brightness-[0.98]`}
								>
									<td
										className={`sticky left-0 z-10 border-r border-slate-200 py-2.5 pr-3 ${stickyBg[row.type] || "bg-white"}`}
										style={{
											paddingLeft: `${(labelPad[Math.min(row.indent, 3)] || 0) + 14}px`,
										}}
									>
										<div className="flex items-center gap-1">
											{hasChildren && row.collapsible ? (
												<button
													onClick={() => toggle(row.id)}
													className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-gray-600 hover:text-gray-700"
												>
													{isCollapsed ? (
														<ChevronRight className="w-3 h-3" />
													) : (
														<ChevronDown className="w-3 h-3" />
													)}
												</button>
											) : (
												<span className="w-4" />
											)}
											<span
												className={`${row.type === "subitem" ? "text-[11px]" : "text-xs"} leading-tight`}
											>
												{row.label}
											</span>
										</div>
									</td>
									{visibleMonths.map((i) => {
										const v = row.values[i] || 0;
										return (
										<td
											key={i}
											className={`border-r border-slate-100 px-3 py-2.5 text-right text-xs ${i === curMonth && String(new Date().getFullYear()) === year ? "bg-lime-50" : ""} ${v < 0 ? "text-rose-700" : row.type === "percent" ? "text-blue-700" : ""}`}
										>
											{row.type === "percent" ? fmtPct(v) : fmt2(v)}
										</td>
										);
									})}
									<td
										className={`sticky right-0 z-10 border-l border-slate-200 bg-white px-4 py-2.5 text-right text-xs font-bold shadow-[-12px_0_24px_-22px_rgba(15,23,42,0.8)] ${selectedDisplayTotal(row, visibleMonths) < 0 ? "text-rose-700" : row.type === "percent" ? "text-blue-700" : "text-slate-950"}`}
									>
										{row.type === "percent"
											? fmtPct(selectedDisplayTotal(row, visibleMonths))
											: fmt2(selectedDisplayTotal(row, visibleMonths))}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
