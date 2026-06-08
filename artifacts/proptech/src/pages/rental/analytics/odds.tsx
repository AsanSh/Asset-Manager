import { useQuery } from "@tanstack/react-query";
import {
	getListAccrualsQueryKey,
	getListLeaseContractsQueryKey,
	getListPaymentsQueryKey,
	getListRentalPropertiesQueryKey,
	getListTenantsQueryKey,
	getRentalAccountsQueryKey,
	getDistributionsQueryKey,
	getRentalPaymentsAllQueryKey,
	getRentalExpensesAllQueryKey,
	getAccrualsOpenQueryKey,
} from "@/lib/rental-query-keys";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DateRangePicker,
	defaultPeriod,
	type PeriodValue,
} from "@/components/am/DateRangePicker";
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

function getMonthIdx(dateStr: string, year: string) {
	if (!dateStr?.startsWith(year)) return -1;
	return parseInt(dateStr.slice(5, 7), 10) - 1;
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

function selectedTotal(row: { values: number[] }, months: number[]) {
	return months.reduce((sum, month) => sum + (row.values[month] || 0), 0);
}

type RowType = "section" | "group" | "item" | "subitem" | "total" | "balance";

interface ODDSRow {
	id: string;
	label: string;
	type: RowType;
	indent: number;
	values: number[];
	total: number;
	collapsible?: boolean;
	parentId?: string;
}

export default function RentalODDS() {
	const [period, setPeriod] = useState<PeriodValue>(() => defaultPeriod("year"));
	const year = yearFromPeriod(period);
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
	const [hideZero, setHideZero] = useState(true);

	function toggle(id: string) {
		setCollapsed((prev) => {
			const n = new Set(prev);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	}

	const { data: payments = [] } = useQuery<any[]>({
		queryKey: getRentalPaymentsAllQueryKey(),
		queryFn: () => api.get("/rental/payments").then((r) => r.data),
	});
	const { data: expenses = [] } = useQuery<any[]>({
		queryKey: getRentalExpensesAllQueryKey(),
		queryFn: () => api.get("/rental/expenses").then((r) => r.data),
	});
	const { data: properties = [] } = useQuery<any[]>({
		queryKey: getListRentalPropertiesQueryKey(),
		queryFn: () => api.get("/rental/properties").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery<any[]>({
		queryKey: getListLeaseContractsQueryKey(),
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});
	const { data: distributions = [] } = useQuery<any[]>({
		queryKey: getDistributionsQueryKey(),
		queryFn: () => api.get("/rental/distributions").then((r) => r.data),
	});

	const paymentsArray = Array.isArray(payments) ? payments : [];
	const expensesArray = Array.isArray(expenses) ? expenses : [];
	const propertiesArray = Array.isArray(properties) ? properties : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];
	const distributionsArray = Array.isArray(distributions) ? distributions : [];

	const rows = useMemo(() => {
		const sumArr = (a: number[]) => a.reduce((s, v) => s + v, 0);
		const addArrs = (...arrs: number[][]) =>
			arrs.reduce((acc, a) => acc.map((v, i) => v + a[i]), Array(12).fill(0));

		const contractMap: Record<number, number> = {};
		contractsArray.forEach((c: any) => {
			if (c.id && c.propertyId) contractMap[c.id] = c.propertyId;
		});
		const propMap: Record<number, string> = {};
		propertiesArray.forEach((p: any) => {
			propMap[p.id] = p.address || p.name || `Объект ${p.id}`;
		});

		// ── Cash INFLOWS ─────────────────────────────────────────────────────────
		// Payments received (rent income) by property
		const rentByProp: Record<number, number[]> = {};
		paymentsArray.forEach((p: any) => {
			const m = getMonthIdx(p.paymentDate || p.createdAt, year);
			if (m < 0) return;
			const pid = contractMap[p.leaseContractId];
			if (!pid) return;
			if (!rentByProp[pid]) rentByProp[pid] = Array(12).fill(0);
			rentByProp[pid][m] += parseFloat(p.amount || "0");
		});

		// Other payments (not linked to property)
		const otherPayVals: number[] = Array(12).fill(0);
		paymentsArray.forEach((p: any) => {
			const m = getMonthIdx(p.paymentDate || p.createdAt, year);
			if (m < 0) return;
			if (contractMap[p.leaseContractId]) return;
			otherPayVals[m] += parseFloat(p.amount || "0");
		});

		// ── Cash OUTFLOWS ─────────────────────────────────────────────────────────
		// Expenses by property
		const expByProp: Record<number, number[]> = {};
		const expByCat: Record<string, number[]> = {};
		expensesArray.forEach((e: any) => {
			const m = getMonthIdx(e.expenseDate, year);
			if (m < 0) return;
			if (e.propertyId) {
				if (!expByProp[e.propertyId])
					expByProp[e.propertyId] = Array(12).fill(0);
				expByProp[e.propertyId][m] += parseFloat(e.amount || "0");
			} else {
				const cat = e.category || "other";
				if (!expByCat[cat]) expByCat[cat] = Array(12).fill(0);
				expByCat[cat][m] += parseFloat(e.amount || "0");
			}
		});

		// Distributions
		const distribVals: number[] = Array(12).fill(0);
		distributionsArray.forEach((d: any) => {
			const m = getMonthIdx(d.distributionDate || d.createdAt, year);
			if (m < 0) return;
			distribVals[m] += parseFloat(d.amount || "0");
		});

		// ─── Build row list ──────────────────────────────────────────────────────
		const result: ODDSRow[] = [];

		// ── Sect 1: OPERATING ACTIVITIES ─────────────────────────────────────────
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
			collapsible: true,
			parentId: "ops",
			values: Array(12).fill(0),
			total: 0,
		});

		// Rent by property
		const rentPropIds = Object.keys(rentByProp).map(Number);
		rentPropIds.forEach((pid) => {
			result.push({
				id: `rent_in_${pid}`,
				label: `Оплата аренды — ${propMap[pid] || `Объект ${pid}`}`,
				type: "item",
				indent: 2,
				parentId: "inflows",
				values: rentByProp[pid],
				total: sumArr(rentByProp[pid]),
			});
		});
		if (rentPropIds.length === 0)
			result.push({
				id: "rent_in_none",
				label: "Оплата аренды",
				type: "item",
				indent: 2,
				parentId: "inflows",
				values: Array(12).fill(0),
				total: 0,
			});

		result.push({
			id: "other_in",
			label: "Прочие поступления",
			type: "item",
			indent: 2,
			parentId: "inflows",
			values: otherPayVals,
			total: sumArr(otherPayVals),
		});

		// Compute inflows total
		const inflowVals = result
			.filter((r) => r.parentId === "inflows")
			.reduce((acc, r) => addArrs(acc, r.values), Array(12).fill(0));
		result.find((r) => r.id === "inflows")!.values = inflowVals;
		result.find((r) => r.id === "inflows")!.total = sumArr(inflowVals);

		// Outflows
		result.push({
			id: "outflows",
			label: "Выплаты (расходы)",
			type: "group",
			indent: 1,
			collapsible: true,
			parentId: "ops",
			values: Array(12).fill(0),
			total: 0,
		});

		const expPropIds = Object.keys(expByProp).map(Number);
		expPropIds.forEach((pid) => {
			result.push({
				id: `exp_prop_${pid}`,
				label: `Расходы — ${propMap[pid] || `Объект ${pid}`}`,
				type: "item",
				indent: 2,
				parentId: "outflows",
				values: expByProp[pid],
				total: sumArr(expByProp[pid]),
			});
		});
		if (expPropIds.length === 0)
			result.push({
				id: "exp_prop_none",
				label: "Расходы на объекты",
				type: "item",
				indent: 2,
				parentId: "outflows",
				values: Array(12).fill(0),
				total: 0,
			});

		const catLabels: Record<string, string> = {
			salary: "Зарплата",
			bonus: "Бонусы",
			marketing: "Маркетинг/Реклама",
			legal: "Юруслуги",
			transport: "Транспортные расходы",
			software: "ПО",
			office: "Канцелярия",
			facilities: "Хозрасход",
			utilities: "Коммуналка",
			internet: "Интернет",
			communication: "Связь",
			maintenance: "Тех. обслуживание",
			tax: "Налоги",
			tax_single: "Единый налог",
			tax_property: "Налог на имущество",
			tax_other: "Налог прочие",
			other: "Прочие расходы",
		};
		Object.entries(expByCat).forEach(([cat, vals]) => {
			result.push({
				id: `exp_cat_${cat}`,
				label: catLabels[cat] || cat,
				type: "item",
				indent: 2,
				parentId: "outflows",
				values: vals,
				total: sumArr(vals),
			});
		});
		if (Object.keys(expByCat).length === 0 && expPropIds.length === 0) {
			result.push({
				id: "exp_admin",
				label: "Административные расходы",
				type: "item",
				indent: 2,
				parentId: "outflows",
				values: Array(12).fill(0),
				total: 0,
			});
		}

		const outflowVals = result
			.filter((r) => r.parentId === "outflows")
			.reduce((acc, r) => addArrs(acc, r.values), Array(12).fill(0));
		result.find((r) => r.id === "outflows")!.values = outflowVals;
		result.find((r) => r.id === "outflows")!.total = sumArr(outflowVals);

		// Net operating
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

		// Update ops section total
		const opsRow = result.find((r) => r.id === "ops")!;
		opsRow.values = [...netOpsVals];
		opsRow.total = sumArr(netOpsVals);

		// ── Sect 2: INVESTING ─────────────────────────────────────────────────────
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
			label: "Приобретение активов",
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

		// ── Sect 3: FINANCING ─────────────────────────────────────────────────────
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
			id: "fin_distrib",
			label: "Распределение прибыли (дивиденды)",
			type: "item",
			indent: 1,
			parentId: "fin",
			values: distribVals,
			total: sumArr(distribVals),
		});
		result.push({
			id: "fin_loan_in",
			label: "Получение займов",
			type: "item",
			indent: 1,
			parentId: "fin",
			values: Array(12).fill(0),
			total: 0,
		});
		result.push({
			id: "fin_loan_out",
			label: "Погашение займов",
			type: "item",
			indent: 1,
			parentId: "fin",
			values: Array(12).fill(0),
			total: 0,
		});
		const netFinVals = distribVals.map((v) => -v);
		result.push({
			id: "net_fin",
			label: "Чистый поток от финансовой деятельности",
			type: "total",
			indent: 1,
			parentId: "fin",
			values: netFinVals,
			total: sumArr(netFinVals),
		});
		result.find((r) => r.id === "fin")!.values = [...netFinVals];
		result.find((r) => r.id === "fin")!.total = sumArr(netFinVals);

		// ── SUMMARY ───────────────────────────────────────────────────────────────
		const totalNetVals = netOpsVals.map((v, i) => v + netFinVals[i]);
		result.push({
			id: "total_net",
			label: "Итого чистый денежный поток",
			type: "total",
			indent: 0,
			values: totalNetVals,
			total: sumArr(totalNetVals),
		});

		// Running balances
		const beginBalance: number[] = Array(12).fill(0);
		const endBalance: number[] = Array(12).fill(0);
		let running = 0;
		totalNetVals.forEach((v, i) => {
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
	}, [
		paymentsArray,
		expensesArray,
		propertiesArray,
		contractsArray,
		distributionsArray,
		year,
	]);

	const visibleRows = useMemo(() => {
		const STRUCTURAL = new Set(["section", "total", "balance"]);
		return rows.filter((row) => {
			if (
				hideZero &&
				!STRUCTURAL.has(row.type) &&
				row.total === 0 &&
				row.values.every((v) => v === 0)
			) {
				return false;
			}
			if (!row.parentId) return true;
			let pid: string | undefined = row.parentId;
			while (pid) {
				if (collapsed.has(pid)) return false;
				const parent = rows.find((r) => r.id === pid);
				pid = parent?.parentId;
			}
			return true;
		});
	}, [rows, collapsed, hideZero]);

	const visibleMonths = useMemo(() => {
		const months = monthIndexesInPeriod(period, year);
		return months.length ? months : Array.from({ length: 12 }, (_, i) => i);
	}, [period, year]);

	const curMonth = new Date().getMonth();

	function rowClass(row: ODDSRow) {
		switch (row.type) {
			case "section":
				return "bg-gray-100 font-bold text-gray-900 border-y border-gray-200";
			case "group":
				return "bg-gray-50 font-semibold text-gray-800 border-b border-gray-100";
			case "total":
				return "bg-blue-50 font-bold text-blue-900 border-y border-blue-100";
			case "balance":
				return "bg-emerald-50 font-semibold text-emerald-800 border-b border-emerald-100";
			case "item":
				return "bg-white text-gray-700 border-b border-gray-50";
			default:
				return "bg-white border-b border-gray-50";
		}
	}

	const labelPad = [0, 12, 24, 36];
	const stickyBg: Record<ODDSRow["type"], string> = {
		section: "bg-gray-100",
		group: "bg-gray-50",
		total: "bg-blue-50",
		balance: "bg-emerald-50",
		item: "bg-white",
		subitem: "bg-white",
	};

	return (
		<div className="min-h-full rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-4">
			<div className="mb-4 rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-700">
							Финансовая матрица
						</p>
						<h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
							ОДДС
						</h1>
						<p className="mt-1 text-sm text-slate-500">
							Отчёт о движении денежных средств
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setHideZero((h) => !h)}
							className="h-10 gap-2 rounded-xl border-slate-200 bg-white text-sm"
						>
							{hideZero ? (
								<Eye className="h-4 w-4" />
							) : (
								<EyeOff className="h-4 w-4" />
							)}
							{hideZero ? "Показать нули" : "Скрыть нули"}
						</Button>
						<DateRangePicker value={period} onChange={setPeriod} />
					</div>
				</div>
			</div>

			<div className="overflow-auto rounded-[24px] border border-slate-200 bg-white shadow-sm">
				<table
					className="border-collapse text-sm"
					style={{ minWidth: `${360 + visibleMonths.length * 112 + 128}px` }}
				>
					<thead>
						<tr className="sticky top-0 z-20 bg-slate-100 text-xs font-bold uppercase tracking-[0.04em] text-slate-600">
							<th
								className="sticky left-0 z-30 border-r border-slate-200 bg-slate-100 px-4 py-3 text-left"
								style={{ minWidth: "260px", width: "260px" }}
							>
								Статья
							</th>
							{visibleMonths.map((i) => (
								<th
									key={i}
									className={`border-r border-slate-200 px-4 py-3 text-right ${i === curMonth && String(new Date().getFullYear()) === year ? "bg-cyan-50 text-cyan-800" : ""}`}
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
									className={`${rowClass(row)} hover:brightness-95`}
								>
									<td
										className={`py-1.5 pr-3 sticky left-0 z-10 border-r border-gray-200 ${stickyBg[row.type]}`}
										style={{
											paddingLeft: `${(labelPad[Math.min(row.indent, 3)] || 0) + 8}px`,
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
											className={`py-1.5 px-3 text-right border-r border-gray-100 text-xs ${
												i === curMonth &&
												String(new Date().getFullYear()) === year
													? "bg-amber-50"
													: ""
											} ${v < 0 ? "text-rose-700" : ""}`}
										>
											{fmt2(v)}
										</td>
										);
									})}
									<td
										className={`sticky right-0 z-10 border-l border-slate-200 bg-white px-4 py-1.5 text-right text-xs font-bold shadow-[-12px_0_24px_-22px_rgba(15,23,42,0.9)] ${selectedTotal(row, visibleMonths) < 0 ? "text-rose-700" : "text-slate-950"}`}
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
