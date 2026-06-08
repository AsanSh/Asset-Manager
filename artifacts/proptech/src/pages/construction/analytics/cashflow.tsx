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

type RowType = "section" | "group" | "item" | "total" | "balance";
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

export default function ConstructionCashflow() {
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

		// Income from operations
		const incomeByMonth: number[] = Array(12).fill(0);
		cfData.forEach((row: any) => {
			if (row.type !== "income") return;
			const m = parseInt((row.month || "").slice(5, 7), 10) - 1;
			if (m >= 0 && m < 12) incomeByMonth[m] += parseFloat(row.total || "0");
		});

		// Expense from operations
		const expenseByMonth: number[] = Array(12).fill(0);
		cfData.forEach((row: any) => {
			if (row.type !== "expense") return;
			const m = parseInt((row.month || "").slice(5, 7), 10) - 1;
			if (m >= 0 && m < 12) expenseByMonth[m] += parseFloat(row.total || "0");
		});

		// Accruals by month (planned inflows)
		const accrualByMonth: number[] = Array(12).fill(0);
		accruals.forEach((a: any) => {
			const d = a.accrualDate || a.dueDate || a.createdAt || "";
			if (!d.startsWith(year)) return;
			const m = parseInt(d.slice(5, 7), 10) - 1;
			if (m >= 0) accrualByMonth[m] += parseFloat(a.amount || "0");
		});

		// Expenses by project
		const expByProj: Record<number, number[]> = {};
		const expNoProj: number[] = Array(12).fill(0);
		expenses.forEach((e: any) => {
			const d = e.expenseDate || e.createdAt || "";
			if (!d.startsWith(year)) return;
			const m = parseInt(d.slice(5, 7), 10) - 1;
			if (m < 0) return;
			if (e.projectId) {
				if (!expByProj[e.projectId]) expByProj[e.projectId] = Array(12).fill(0);
				expByProj[e.projectId][m] += parseFloat(e.amount || "0");
			} else {
				expNoProj[m] += parseFloat(e.amount || "0");
			}
		});

		const result: Row[] = [];

		// ── OPERATING ────────────────────────────────────────────────────────────
		result.push({
			id: "ops",
			label: "I. Операционная деятельность",
			type: "section",
			indent: 0,
			collapsible: true,
			values: Array(12).fill(0),
			total: 0,
		});

		// Inflows
		result.push({
			id: "inflows",
			label: "Поступления",
			type: "group",
			indent: 1,
			parentId: "ops",
			collapsible: true,
			values: Array(12).fill(0),
			total: 0,
		});
		result.push({
			id: "sales_in",
			label: "Оплаты по договорам продажи",
			type: "item",
			indent: 2,
			parentId: "inflows",
			values: incomeByMonth,
			total: sumArr(incomeByMonth),
		});
		result.push({
			id: "accruals_in",
			label: "Начисления (план)",
			type: "item",
			indent: 2,
			parentId: "inflows",
			values: accrualByMonth,
			total: sumArr(accrualByMonth),
		});
		result.push({
			id: "other_in",
			label: "Прочие поступления",
			type: "item",
			indent: 2,
			parentId: "inflows",
			values: Array(12).fill(0),
			total: 0,
		});
		const inflowVals = incomeByMonth.map((v, i) => v + accrualByMonth[i]);
		result.find((r) => r.id === "inflows")!.values = inflowVals;
		result.find((r) => r.id === "inflows")!.total = sumArr(inflowVals);

		// Outflows
		result.push({
			id: "outflows",
			label: "Выплаты (расходы)",
			type: "group",
			indent: 1,
			parentId: "ops",
			collapsible: true,
			values: Array(12).fill(0),
			total: 0,
		});
		const projIds = Object.keys(expByProj).map(Number);
		projIds.forEach((pid) => {
			result.push({
				id: `exp_proj_${pid}`,
				label: `Расходы — ${projMap[pid] || `Проект ${pid}`}`,
				type: "item",
				indent: 2,
				parentId: "outflows",
				values: expByProj[pid],
				total: sumArr(expByProj[pid]),
			});
		});
		if (sumArr(expenseByMonth) > 0 && projIds.length === 0) {
			result.push({
				id: "op_exp",
				label: "Операционные расходы",
				type: "item",
				indent: 2,
				parentId: "outflows",
				values: expenseByMonth,
				total: sumArr(expenseByMonth),
			});
		}
		if (sumArr(expNoProj) > 0) {
			result.push({
				id: "exp_gen",
				label: "Общие расходы",
				type: "item",
				indent: 2,
				parentId: "outflows",
				values: expNoProj,
				total: sumArr(expNoProj),
			});
		}
		if (projIds.length === 0 && sumArr(expenseByMonth) === 0) {
			result.push({
				id: "outflow_none",
				label: "—",
				type: "item",
				indent: 2,
				parentId: "outflows",
				values: Array(12).fill(0),
				total: 0,
			});
		}
		const outflowBase =
			projIds.length > 0
				? projIds.reduce(
						(acc, pid) => acc.map((v, i) => v + expByProj[pid][i]),
						Array(12).fill(0) as number[],
					)
				: expenseByMonth;
		const outflowVals = outflowBase.map((v, i) => v + expNoProj[i]);
		result.find((r) => r.id === "outflows")!.values = outflowVals;
		result.find((r) => r.id === "outflows")!.total = sumArr(outflowVals);

		const netOpsVals = inflowVals.map((v, i) => v - outflowVals[i]);
		result.push({
			id: "net_ops",
			label: "Чистый поток от операционной деятельности",
			type: "total",
			indent: 1,
			parentId: "ops",
			values: netOpsVals,
			total: sumArr(netOpsVals),
		});
		result.find((r) => r.id === "ops")!.values = netOpsVals;
		result.find((r) => r.id === "ops")!.total = sumArr(netOpsVals);

		// ── INVESTING ─────────────────────────────────────────────────────────────
		result.push({
			id: "inv",
			label: "II. Инвестиционная деятельность",
			type: "section",
			indent: 0,
			collapsible: true,
			values: Array(12).fill(0),
			total: 0,
		});
		result.push({
			id: "inv_buy",
			label: "Приобретение строительных активов",
			type: "item",
			indent: 1,
			parentId: "inv",
			values: Array(12).fill(0),
			total: 0,
		});
		result.push({
			id: "inv_sell",
			label: "Поступления от продажи активов",
			type: "item",
			indent: 1,
			parentId: "inv",
			values: Array(12).fill(0),
			total: 0,
		});
		result.push({
			id: "net_inv",
			label: "Чистый поток от инвестиционной деятельности",
			type: "total",
			indent: 1,
			parentId: "inv",
			values: Array(12).fill(0),
			total: 0,
		});

		// ── FINANCING ─────────────────────────────────────────────────────────────
		result.push({
			id: "fin",
			label: "III. Финансовая деятельность",
			type: "section",
			indent: 0,
			collapsible: true,
			values: Array(12).fill(0),
			total: 0,
		});
		result.push({
			id: "fin_equity",
			label: "Взносы учредителей",
			type: "item",
			indent: 1,
			parentId: "fin",
			values: Array(12).fill(0),
			total: 0,
		});
		result.push({
			id: "fin_loan_in",
			label: "Получение кредитов",
			type: "item",
			indent: 1,
			parentId: "fin",
			values: Array(12).fill(0),
			total: 0,
		});
		result.push({
			id: "fin_loan_out",
			label: "Погашение кредитов",
			type: "item",
			indent: 1,
			parentId: "fin",
			values: Array(12).fill(0),
			total: 0,
		});
		result.push({
			id: "net_fin",
			label: "Чистый поток от финансовой деятельности",
			type: "total",
			indent: 1,
			parentId: "fin",
			values: Array(12).fill(0),
			total: 0,
		});

		// ── SUMMARY ───────────────────────────────────────────────────────────────
		result.push({
			id: "total_net",
			label: "Итого чистый денежный поток",
			type: "total",
			indent: 0,
			values: netOpsVals,
			total: sumArr(netOpsVals),
		});

		const beginBalance: number[] = Array(12).fill(0);
		const endBalance: number[] = Array(12).fill(0);
		let running = 0;
		netOpsVals.forEach((v, i) => {
			beginBalance[i] = running;
			running += v;
			endBalance[i] = running;
		});
		result.push({
			id: "begin_bal",
			label: "Остаток на начало периода",
			type: "balance",
			indent: 0,
			values: beginBalance,
			total: beginBalance[0],
		});
		result.push({
			id: "end_bal",
			label: "Остаток на конец периода",
			type: "balance",
			indent: 0,
			values: endBalance,
			total: endBalance[11],
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
					const p = rows.find((r) => r.id === pid);
					pid = p?.parentId;
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
			return row ? selectedTotal(row, visibleMonths) : 0;
		};
		return {
			inflows: byId("inflows"),
			outflows: byId("outflows"),
			operating: byId("net_ops"),
			net: byId("total_net"),
		};
	}, [rows, visibleMonths]);
	const labelPad = [0, 12, 24, 36];
	const stickyBg: Record<string, string> = {
		section: "bg-gray-100",
		group: "bg-gray-50",
		total: "bg-blue-50",
		balance: "bg-emerald-50",
		item: "bg-white",
	};

	function rowClass(r: Row) {
		switch (r.type) {
			case "section":
				return "bg-gray-100 font-bold text-gray-900 border-y border-gray-200";
			case "group":
				return "bg-gray-50 font-semibold text-gray-800 border-b border-gray-100";
			case "total":
				return "bg-blue-50 font-bold text-blue-900 border-y border-blue-100";
			case "balance":
				return "bg-emerald-50 font-semibold text-emerald-800 border-b border-emerald-100";
			default:
				return "bg-white text-gray-700 border-b border-gray-50";
		}
	}

	return (
		<div className="h-full flex flex-col rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-4">
			<div className="mb-4 flex flex-shrink-0 flex-col gap-4 rounded-[24px] border border-white bg-white/80 p-4 shadow-sm backdrop-blur xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
						Финансовая матрица
					</p>
					<h1 className="mt-1 text-3xl font-semibold text-slate-950">ОДДС</h1>
					<p className="mt-1 text-sm text-slate-500">
						Отчёт о движении денежных средств
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<DateRangePicker value={period} onChange={setPeriod} />
				</div>
			</div>
			<div className="mb-4 grid gap-3 md:grid-cols-4">
				{[
					{ label: "Поступления", value: periodTotals.inflows, tone: "text-cyan-700", bg: "bg-cyan-50 border-cyan-100" },
					{ label: "Выплаты", value: Math.abs(periodTotals.outflows), tone: "text-rose-700", bg: "bg-rose-50 border-rose-100" },
					{ label: "Опер. поток", value: periodTotals.operating, tone: periodTotals.operating < 0 ? "text-rose-700" : "text-emerald-700", bg: "bg-white border-slate-200" },
					{ label: "Чистый поток", value: periodTotals.net, tone: periodTotals.net < 0 ? "text-rose-700" : "text-slate-950", bg: "bg-slate-950 border-slate-950 text-white" },
				].map((card) => (
					<div key={card.label} className={`am-kpi-card ${card.bg}`}>
						<div className={cn("text-xs font-semibold uppercase tracking-wide", card.bg.includes("slate-950") ? "text-white/55" : "text-slate-400")}>
							{card.label}
						</div>
						<div className={cn("mt-2 font-mono text-xl font-black", card.bg.includes("slate-950") ? "text-white" : card.tone)}>
							{fmt2(card.value)}
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
								style={{ minWidth: "260px", width: "260px" }}
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
											<span className="text-xs leading-tight">{row.label}</span>
										</div>
									</td>
									{visibleMonths.map((i) => {
										const v = row.values[i] || 0;
										return (
										<td
											key={i}
											className={`border-r border-slate-100 px-3 py-2.5 text-right text-xs ${i === curMonth && String(new Date().getFullYear()) === year ? "bg-lime-50" : ""} ${v < 0 ? "text-rose-700" : ""}`}
										>
											{fmt2(v)}
										</td>
										);
									})}
									<td
										className={`sticky right-0 z-10 border-l border-slate-200 bg-white px-4 py-2.5 text-right text-xs font-bold shadow-[-12px_0_24px_-22px_rgba(15,23,42,0.8)] ${selectedTotal(row, visibleMonths) < 0 ? "text-rose-700" : "text-slate-950"}`}
									>
										{fmt2(selectedTotal(row, visibleMonths))}
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
