import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

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

export default function ConstructionCashflow() {
	const curYear = new Date().getFullYear();
	const [year, setYear] = useState(String(curYear));
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
		<div className="h-full flex flex-col">
			<div className="flex items-center justify-between mb-4 flex-shrink-0">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">ОДДС</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Отчёт о движении денежных средств
					</p>
				</div>
				<Select value={year} onValueChange={setYear}>
					<SelectTrigger className="w-28 h-8 text-sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{[2024, 2025, 2026, 2027].map((y) => (
							<SelectItem key={y} value={String(y)}>
								{y}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-white">
				<table
					className="text-sm border-collapse"
					style={{ minWidth: "1400px" }}
				>
					<thead>
						<tr className="bg-gray-200 text-gray-700 text-xs font-semibold sticky top-0 z-20">
							<th
								className="text-left py-2 px-3 sticky left-0 bg-gray-200 z-30 border-r border-gray-300"
								style={{ minWidth: "260px", width: "260px" }}
							>
								Статья
							</th>
							<th
								className="text-right py-2 px-3 border-r border-gray-300 bg-gray-300 font-bold"
								style={{ minWidth: "90px" }}
							>
								ИТОГО
							</th>
							{MONTH_SHORT.map((m, i) => (
								<th
									key={i}
									className={`text-right py-2 px-3 border-r border-gray-200 ${i === curMonth && String(new Date().getFullYear()) === year ? "bg-amber-100 text-amber-800" : ""}`}
									style={{ minWidth: "90px" }}
								>
									{m.slice(0, 3)} {year.slice(2)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{visibleRows.map((row) => {
							const hasChildren = rows.some((r) => r.parentId === row.id);
							const isCollapsed = collapsed.has(row.id);
							return (
								<tr
									key={row.id}
									className={`${rowClass(row)} hover:brightness-95`}
								>
									<td
										className={`py-1.5 pr-3 sticky left-0 z-10 border-r border-gray-200 ${stickyBg[row.type] || "bg-white"}`}
										style={{
											paddingLeft: `${(labelPad[Math.min(row.indent, 3)] || 0) + 8}px`,
										}}
									>
										<div className="flex items-center gap-1">
											{hasChildren && row.collapsible ? (
												<button
													onClick={() => toggle(row.id)}
													className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-gray-700"
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
									<td
										className={`py-1.5 px-3 text-right border-r border-gray-300 bg-gray-50 font-semibold text-xs ${row.total < 0 ? "text-rose-700" : ""}`}
									>
										{fmt2(row.total)}
									</td>
									{row.values.map((v, i) => (
										<td
											key={i}
											className={`py-1.5 px-3 text-right border-r border-gray-100 text-xs ${i === curMonth && String(new Date().getFullYear()) === year ? "bg-amber-50" : ""} ${v < 0 ? "text-rose-700" : ""}`}
										>
											{fmt2(v)}
										</td>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
