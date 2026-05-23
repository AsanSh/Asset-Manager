import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

// ─── Formatters ──────────────────────────────────────────────────────────────
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
	if (!dateStr?.startsWith(year)) return -1;
	return parseInt(dateStr.slice(5, 7), 10) - 1;
}

// ─── Row types ───────────────────────────────────────────────────────────────
type RowType =
	| "section"
	| "group"
	| "item"
	| "subitem"
	| "total"
	| "percent"
	| "divider";

interface TableRow {
	id: string;
	label: string;
	type: RowType;
	indent: number;
	values: number[]; // 12 months
	total: number;
	collapsible?: boolean;
	parentId?: string;
	isNegative?: boolean; // costs are positive numbers but shown in expense context
}

// ─── Fixed cost category labels ───────────────────────────────────────────────
const FIXED_CATS: {
	key: string;
	label: string;
	subCats?: { key: string; label: string }[];
}[] = [
	{ key: "salary", label: "Зарплата" },
	{ key: "bonus", label: "Бонусы" },
	{ key: "marketing", label: "Маркетинг/Реклама" },
	{ key: "legal", label: "Юруслуги" },
	{ key: "transport", label: "Транспортные расходы" },
	{ key: "software", label: "Программное обеспечения" },
	{ key: "office", label: "Канцелярия" },
	{ key: "facilities", label: "Хозрасход" },
	{ key: "utilities", label: "Коммуналка" },
	{ key: "internet", label: "Интернет" },
	{ key: "communication", label: "Связь" },
	{ key: "maintenance", label: "Мелкий ремонт" },
	{
		key: "tax",
		label: "Налоги и взносы",
		subCats: [
			{ key: "tax_single", label: "Единый налог" },
			{ key: "tax_property", label: "Налог на имущество" },
			{ key: "tax_other", label: "Налог прочие" },
		],
	},
	{ key: "other", label: "Прочие расходы" },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function RentalOPU() {
	const curYear = new Date().getFullYear();
	const [year, setYear] = useState(String(curYear));
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
	const [hideZero, setHideZero] = useState(false);

	function toggle(id: string) {
		setCollapsed((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}

	const { data: payments = [] } = useQuery<any[]>({
		queryKey: ["rental-payments-all"],
		queryFn: () => api.get("/rental/payments").then((r) => r.data),
	});
	const { data: expenses = [] } = useQuery<any[]>({
		queryKey: ["rental-expenses-all"],
		queryFn: () => api.get("/rental/expenses").then((r) => r.data),
	});
	const { data: properties = [] } = useQuery<any[]>({
		queryKey: ["rental-properties"],
		queryFn: () => api.get("/rental/properties").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery<any[]>({
		queryKey: ["rental-contracts"],
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});
	const { data: distributions = [] } = useQuery<any[]>({
		queryKey: ["rental-distributions"],
		queryFn: () => api.get("/rental/distributions").then((r) => r.data),
	});

	const paymentsArray = Array.isArray(payments) ? payments : [];
	const expensesArray = Array.isArray(expenses) ? expenses : [];
	const propertiesArray = Array.isArray(properties) ? properties : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];
	const distributionsArray = Array.isArray(distributions) ? distributions : [];

	const rows = useMemo(() => {
		// Helper: contract → property
		const contractMap: Record<number, number> = {};
		contractsArray.forEach((c: any) => {
			if (c.id && c.propertyId) contractMap[c.id] = c.propertyId;
		});

		const propMap: Record<number, string> = {};
		propertiesArray.forEach((p: any) => {
			propMap[p.id] = p.address || p.name || `Объект ${p.id}`;
		});

		// ── Revenue by property ──────────────────────────────────────────────
		const rentByProp: Record<number, number[]> = {}; // propId → [12 months]
		paymentsArray.forEach((p: any) => {
			const m = getMonthIdx(p.paymentDate || p.createdAt, year);
			if (m < 0) return;
			const propId = contractMap[p.leaseContractId];
			if (!propId) return;
			if (!rentByProp[propId]) rentByProp[propId] = Array(12).fill(0);
			rentByProp[propId][m] += parseFloat(p.amount || "0");
		});

		// ── Variable expenses by property → by description ───────────────────
		const varExpByProp: Record<number, Record<string, number[]>> = {}; // propId → desc → [12m]
		expensesArray.forEach((e: any) => {
			if (!e.propertyId) return;
			const m = getMonthIdx(e.expenseDate, year);
			if (m < 0) return;
			const pid = e.propertyId;
			const desc = e.description || e.category || "Прочие";
			if (!varExpByProp[pid]) varExpByProp[pid] = {};
			if (!varExpByProp[pid][desc]) varExpByProp[pid][desc] = Array(12).fill(0);
			varExpByProp[pid][desc][m] += parseFloat(e.amount || "0");
		});

		// ── Fixed expenses by category ───────────────────────────────────────
		const fixedByCat: Record<string, number[]> = {};
		expensesArray.forEach((e: any) => {
			if (e.propertyId) return;
			const m = getMonthIdx(e.expenseDate, year);
			if (m < 0) return;
			const cat = e.category || "other";
			if (!fixedByCat[cat]) fixedByCat[cat] = Array(12).fill(0);
			fixedByCat[cat][m] += parseFloat(e.amount || "0");
		});

		// ── Distributions by month ───────────────────────────────────────────
		const distribByMonth: number[] = Array(12).fill(0);
		distributionsArray.forEach((d: any) => {
			const m = getMonthIdx(d.distributionDate || d.createdAt, year);
			if (m < 0) return;
			distribByMonth[m] += parseFloat(d.amount || "0");
		});

		// ── Build rows ───────────────────────────────────────────────────────
		const result: TableRow[] = [];

		function sumArr(a: number[]) {
			return a.reduce((s, v) => s + v, 0);
		}
		function addArrs(...arrs: number[][]) {
			return arrs.reduce(
				(acc, a) => acc.map((v, i) => v + a[i]),
				Array(12).fill(0),
			);
		}
		// ═══ REVENUES ════════════════════════════════════════════════════════
		// Rent by property
		const propIds = Object.keys(rentByProp).map(Number);
		const rentRows: number[][] = [];
		const rentSection: TableRow = {
			id: "rent",
			label: "Аренда",
			type: "group",
			indent: 1,
			collapsible: true,
			values: Array(12).fill(0),
			total: 0,
		};

		propIds.forEach((pid) => {
			const vals = rentByProp[pid];
			const propRow: TableRow = {
				id: `rent_${pid}`,
				label: propMap[pid] || `Объект ${pid}`,
				type: "item",
				indent: 2,
				parentId: "rent",
				values: vals,
				total: sumArr(vals),
			};
			result.push(propRow);
			rentRows.push(vals);
		});
		if (propIds.length === 0) {
			result.push({
				id: "rent_none",
				label: "—",
				type: "item",
				indent: 2,
				parentId: "rent",
				values: Array(12).fill(0),
				total: 0,
			});
		}
		rentSection.values = rentRows.reduce(
			(acc, v) => addArrs(acc, v),
			Array(12).fill(0),
		);
		rentSection.total = sumArr(rentSection.values);
		result.splice(
			result.findIndex((r) => r.id === `rent_${propIds[0] || "none"}`),
			0,
			rentSection,
		);

		// Service fees (placeholder)
		const serviceRow: TableRow = {
			id: "service",
			label: "Сервисные услуги",
			type: "group",
			indent: 1,
			collapsible: true,
			values: Array(12).fill(0),
			total: 0,
		};
		result.push(serviceRow);

		// Other income (payments without contract property)
		const otherIncomeVals: number[] = Array(12).fill(0);
		payments.forEach((p: any) => {
			const m = getMonthIdx(p.paymentDate || p.createdAt, year);
			if (m < 0) return;
			if (contractMap[p.leaseContractId]) return;
			otherIncomeVals[m] += parseFloat(p.amount || "0");
		});
		result.push({
			id: "other_income",
			label: "Прочий доход",
			type: "group",
			indent: 1,
			values: otherIncomeVals,
			total: sumArr(otherIncomeVals),
		});

		// Выручка total
		const revenueVals = addArrs(
			rentSection.values,
			serviceRow.values,
			otherIncomeVals,
		);
		const revenueRow: TableRow = {
			id: "revenue",
			label: "Выручка",
			type: "section",
			indent: 0,
			collapsible: true,
			values: revenueVals,
			total: sumArr(revenueVals),
		};
		result.splice(0, 0, revenueRow);

		// ═══ DIRECT COSTS ════════════════════════════════════════════════════
		// Variable costs per property
		const varCostSection: TableRow = {
			id: "var_costs",
			label: "Переменные расходы",
			type: "group",
			indent: 1,
			collapsible: true,
			values: Array(12).fill(0),
			total: 0,
		};
		const varCostRows: number[][] = [];

		const propWithExp = Object.keys(varExpByProp).map(Number);
		propWithExp.forEach((pid) => {
			const descMap = varExpByProp[pid];
			const propTotals: number[] = Array(12).fill(0);
			const propSection: TableRow = {
				id: `vprop_${pid}`,
				label: propMap[pid] || `Объект ${pid}`,
				type: "item",
				indent: 2,
				parentId: "var_costs",
				collapsible: true,
				values: Array(12).fill(0),
				total: 0,
			};
			result.push(propSection);
			Object.entries(descMap).forEach(([desc, vals]) => {
				result.push({
					id: `vprop_${pid}_${desc}`,
					label: desc,
					type: "subitem",
					indent: 3,
					parentId: `vprop_${pid}`,
					values: vals,
					total: sumArr(vals),
				});
				vals.forEach((v, i) => {
					propTotals[i] += v;
				});
			});
			propSection.values = [...propTotals];
			propSection.total = sumArr(propTotals);
			varCostRows.push(propTotals);
		});
		if (propWithExp.length === 0) {
			result.push({
				id: "vprop_none",
				label: "—",
				type: "item",
				indent: 2,
				parentId: "var_costs",
				values: Array(12).fill(0),
				total: 0,
			});
		}

		// Dividends
		const divSection: TableRow = {
			id: "dividends",
			label: "Выплата дивидендов",
			type: "item",
			indent: 2,
			parentId: "var_costs",
			values: distribByMonth,
			total: sumArr(distribByMonth),
		};
		result.push(divSection);
		varCostRows.push(distribByMonth);

		varCostSection.values = varCostRows.reduce(
			(acc, v) => addArrs(acc, v),
			Array(12).fill(0),
		);
		varCostSection.total = sumArr(varCostSection.values);
		// Insert var_costs section before first var item
		const varInsertIdx = result.findIndex(
			(r) => r.parentId === "var_costs" || r.id === "vprop_none",
		);
		if (varInsertIdx >= 0) result.splice(varInsertIdx, 0, varCostSection);
		else result.push(varCostSection);

		// Fixed costs
		const fixedSection: TableRow = {
			id: "fixed_costs",
			label: "Постоянные расходы УК",
			type: "group",
			indent: 1,
			collapsible: true,
			values: Array(12).fill(0),
			total: 0,
		};
		result.push(fixedSection);
		const fixedTotals: number[] = Array(12).fill(0);

		FIXED_CATS.forEach((cat) => {
			if (cat.subCats) {
				// Tax parent row
				const taxVals: number[] = Array(12).fill(0);
				const taxSection: TableRow = {
					id: `fixed_${cat.key}`,
					label: cat.label,
					type: "item",
					indent: 2,
					parentId: "fixed_costs",
					collapsible: true,
					values: Array(12).fill(0),
					total: 0,
				};
				result.push(taxSection);
				cat.subCats.forEach((sc) => {
					const sVals = fixedByCat[sc.key] || Array(12).fill(0);
					result.push({
						id: `fixed_${sc.key}`,
						label: sc.label,
						type: "subitem",
						indent: 3,
						parentId: `fixed_${cat.key}`,
						values: sVals,
						total: sumArr(sVals),
					});
					sVals.forEach((v, i) => {
						taxVals[i] += v;
						fixedTotals[i] += v;
					});
				});
				// Also add general "tax" category
				const generalTax = fixedByCat.tax || Array(12).fill(0);
				generalTax.forEach((v, i) => {
					taxVals[i] += v;
					fixedTotals[i] += v;
				});
				taxSection.values = [...taxVals];
				taxSection.total = sumArr(taxVals);
			} else {
				const vals = fixedByCat[cat.key] || Array(12).fill(0);
				result.push({
					id: `fixed_${cat.key}`,
					label: cat.label,
					type: "item",
					indent: 2,
					parentId: "fixed_costs",
					values: vals,
					total: sumArr(vals),
				});
				vals.forEach((v, i) => {
					fixedTotals[i] += v;
				});
			}
		});
		fixedSection.values = [...fixedTotals];
		fixedSection.total = sumArr(fixedTotals);

		// Direct costs total
		const directCostVals = addArrs(varCostSection.values, fixedSection.values);
		const directCostsRow: TableRow = {
			id: "direct_costs",
			label: "Прямые расходы",
			type: "section",
			indent: 0,
			collapsible: true,
			values: directCostVals,
			total: sumArr(directCostVals),
		};
		const dcInsertIdx = result.findIndex((r) => r.id === "var_costs");
		if (dcInsertIdx >= 0) result.splice(dcInsertIdx, 0, directCostsRow);
		else result.push(directCostsRow);

		// ═══ METRICS ════════════════════════════════════════════════════════
		const gpVals = revenueVals.map((v, i) => v - directCostVals[i]);
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
				revenueVals.reduce((s, v) => s + v, 0) > 0
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
				revenueVals.reduce((s, v) => s + v, 0) > 0
					? (sumArr(gpVals) / sumArr(revenueVals)) * 100
					: 0,
		});

		const netProfitVals = [...gpVals];
		result.push({
			id: "net_profit",
			label: "Чистая прибыль",
			type: "total",
			indent: 0,
			values: netProfitVals,
			total: sumArr(netProfitVals),
		});
		result.push({
			id: "net_pct",
			label: "Рентабельность по чистой прибыли, %",
			type: "percent",
			indent: 0,
			values: netProfitVals.map((v, i) =>
				revenueVals[i] > 0 ? (v / revenueVals[i]) * 100 : 0,
			),
			total:
				revenueVals.reduce((s, v) => s + v, 0) > 0
					? (sumArr(netProfitVals) / sumArr(revenueVals)) * 100
					: 0,
		});

		result.push({
			id: "distrib",
			label: "Вывод прибыли из бизнеса",
			type: "item",
			indent: 0,
			values: distribByMonth,
			total: sumArr(distribByMonth),
		});

		const retainedVals = netProfitVals.map((v, i) => v - distribByMonth[i]);
		result.push({
			id: "retained",
			label: "Нераспределённая прибыль",
			type: "total",
			indent: 0,
			values: retainedVals,
			total: sumArr(retainedVals),
		});

		return result;
	}, [
		paymentsArray, 
		expensesArray, 
		propertiesArray, 
		contractsArray, 
		distributionsArray, 
		year, payments.forEach
	]);

	// Filter hidden rows (collapsed parents + zero-value rows)
	const visibleRows = useMemo(() => {
		const STRUCTURAL = new Set(["section", "total", "percent"]);
		return rows.filter((row) => {
			// If hiding zeros: skip item/group/subitem rows with all-zero values
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

	const curMonth = new Date().getMonth();

	// ── Row styles ──────────────────────────────────────────────────────────────
	function rowClass(row: TableRow) {
		switch (row.type) {
			case "section":
				return "bg-gray-100 font-bold text-gray-900 border-y border-gray-200";
			case "group":
				return "bg-gray-50 font-semibold text-gray-800 border-b border-gray-100";
			case "total":
				return "bg-gray-50 font-bold text-gray-900 border-y border-gray-200";
			case "percent":
				return "bg-blue-50 text-blue-700 italic border-b border-blue-100";
			case "item":
				return "bg-white text-gray-700 border-b border-gray-50";
			case "subitem":
				return "bg-white text-gray-600 text-xs border-b border-gray-50";
			default:
				return "bg-white border-b border-gray-50";
		}
	}

	function formatCell(row: TableRow, val: number) {
		if (row.type === "percent") return fmtPct(val);
		return fmt2(val);
	}

	const labelPad = [0, 12, 24, 36];

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between mb-4 flex-shrink-0">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">ОПУ</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Отчёт о прибылях и убытках
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setHideZero((h) => !h)}
						className="gap-1.5 h-8 text-xs"
					>
						{hideZero ? (
							<Eye className="w-3.5 h-3.5" />
						) : (
							<EyeOff className="w-3.5 h-3.5" />
						)}
						{hideZero ? "Показать нули" : "Скрыть нули"}
					</Button>
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
			</div>

			{/* Table */}
			<div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-white">
				<table
					className="text-sm border-collapse"
					style={{ minWidth: "1400px" }}
				>
					<thead>
						<tr className="bg-gray-200 text-gray-700 text-xs font-semibold sticky top-0 z-20">
							<th
								className="text-left py-2 px-3 sticky left-0 bg-gray-200 z-30 border-r border-gray-300"
								style={{ minWidth: "240px", width: "240px" }}
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
									className={`${rowClass(row)} hover:brightness-95 transition-all`}
								>
									{/* Label cell */}
									<td
										className={`py-1.5 pr-3 sticky left-0 z-10 border-r border-gray-200 ${
											row.type === "section"
												? "bg-gray-100"
												: row.type === "group"
													? "bg-gray-50"
													: row.type === "total"
														? "bg-gray-50"
														: row.type === "percent"
															? "bg-blue-50"
															: "bg-white"
										}`}
										style={{
											paddingLeft: `${(labelPad[row.indent] || 0) + 8}px`,
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
											<span
												className={`${row.type === "subitem" ? "text-[11px]" : "text-xs"} leading-tight`}
											>
												{row.label}
											</span>
										</div>
									</td>
									{/* ИТОГО */}
									<td
										className={`py-1.5 px-3 text-right border-r border-gray-300 bg-gray-50 font-semibold text-xs ${
											row.total < 0
												? "text-rose-700"
												: row.type === "percent"
													? "text-blue-700"
													: ""
										}`}
									>
										{formatCell(row, row.total)}
									</td>
									{/* Months */}
									{row.values.map((v, i) => (
										<td
											key={i}
											className={`py-1.5 px-3 text-right border-r border-gray-100 text-xs ${
												i === curMonth &&
												String(new Date().getFullYear()) === year
													? "bg-amber-50"
													: ""
											} ${v < 0 ? "text-rose-700" : row.type === "percent" ? "text-blue-700" : ""}`}
										>
											{formatCell(row, v)}
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
