import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

const MONTHS = [
	"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
	"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function fmt(v: number) {
	if (v === 0) return "—";
	return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v);
}

function fmtDelta(v: number) {
	if (v === 0) return "—";
	return (v > 0 ? "+" : "") + new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v);
}

function getMonthIdx(dateStr: string, year: string): number {
	if (!dateStr?.startsWith(year)) return -1;
	return parseInt(dateStr.slice(5, 7), 10) - 1;
}

function daysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

/**
 * For a given contract active in [startDate, endDate], compute how much rent
 * falls in each month of `year`. Prorates the first and last partial months.
 */
function planByMonth(
	startDateStr: string,
	endDateStr: string | null | undefined,
	rentAmount: number,
	year: number,
): number[] {
	const result: number[] = Array(12).fill(0);
	if (!startDateStr || rentAmount <= 0) return result;

	const contractStart = new Date(startDateStr);
	const contractEnd = endDateStr ? new Date(endDateStr) : null;
	if (isNaN(contractStart.getTime())) return result;

	for (let m = 0; m < 12; m++) {
		const monthStart = new Date(year, m, 1);
		const monthEnd = new Date(year, m, daysInMonth(year, m));

		// Skip if contract hasn't started yet or already ended
		if (contractStart > monthEnd) continue;
		if (contractEnd && contractEnd < monthStart) continue;

		const activeDays =
			Math.min(monthEnd.getTime(), contractEnd ? contractEnd.getTime() : monthEnd.getTime()) -
			Math.max(monthStart.getTime(), contractStart.getTime());
		const activeDaysCount = Math.round(activeDays / 86400000) + 1;
		const totalDays = daysInMonth(year, m);

		if (activeDaysCount >= totalDays) {
			result[m] = rentAmount;
		} else {
			// Prorated
			result[m] = Math.round((rentAmount / totalDays) * activeDaysCount);
		}
	}

	return result;
}

export default function PlanFact() {
	const curYear = new Date().getFullYear();
	const [year, setYear] = useState(String(curYear));

	const { data: payments = [] } = useQuery<any[]>({
		queryKey: ["rental-payments-all"],
		queryFn: () => api.get("/rental/payments").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery<any[]>({
		queryKey: ["rental-contracts"],
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});
	const { data: properties = [] } = useQuery<any[]>({
		queryKey: ["rental-properties"],
		queryFn: () => api.get("/rental/properties").then((r) => r.data),
	});

	const paymentsArr = Array.isArray(payments) ? payments : [];
	const contractsArr = Array.isArray(contracts) ? contracts : [];
	const propertiesArr = Array.isArray(properties) ? properties : [];

	const { rows, totals } = useMemo(() => {
		const yr = parseInt(year, 10);

		const propNameMap: Record<number, string> = {};
		propertiesArr.forEach((p: any) => {
			propNameMap[p.id] =
				[p.projectName, p.unitNumber].filter(Boolean).join(" — ") ||
				`Объект ${p.id}`;
		});

		// Plan: derive from contract schedules
		const plan: Record<number, number[]> = {};
		contractsArr.forEach((c: any) => {
			if (!c.propertyId) return;
			const rentAmount = parseFloat(c.rentAmount || "0");
			if (rentAmount <= 0) return;

			const monthly = planByMonth(
				c.startDate,
				c.endDate,
				rentAmount,
				yr,
			);
			const hasAny = monthly.some((v) => v > 0);
			if (!hasAny) return;

			if (!plan[c.propertyId]) plan[c.propertyId] = Array(12).fill(0);
			monthly.forEach((v, i) => { plan[c.propertyId][i] += v; });
		});

		// Fact: actual payments by payment date
		const fact: Record<number, number[]> = {};
		const contractMap: Record<number, number> = {};
		contractsArr.forEach((c: any) => {
			if (c.id && c.propertyId) contractMap[c.id] = c.propertyId;
		});
		paymentsArr.forEach((p: any) => {
			const m = getMonthIdx(p.paymentDate || p.createdAt, year);
			if (m < 0) return;
			const pid = contractMap[p.leaseContractId];
			if (!pid) return;
			if (!fact[pid]) fact[pid] = Array(12).fill(0);
			fact[pid][m] += parseFloat(p.amount || "0");
		});

		const allPids = new Set([...Object.keys(plan), ...Object.keys(fact)].map(Number));
		const rows = Array.from(allPids)
			.map((pid) => ({
				pid,
				name: propNameMap[pid] || `Объект ${pid}`,
				plan: plan[pid] || (Array(12).fill(0) as number[]),
				fact: fact[pid] || (Array(12).fill(0) as number[]),
			}))
			.sort((a, b) => a.name.localeCompare(b.name, "ru"));

		const totals = {
			plan: Array(12).fill(0) as number[],
			fact: Array(12).fill(0) as number[],
		};
		rows.forEach((r) => {
			r.plan.forEach((v, i) => { totals.plan[i] += v; });
			r.fact.forEach((v, i) => { totals.fact[i] += v; });
		});

		return { rows, totals };
	}, [paymentsArr, contractsArr, propertiesArr, year]);

	const curMonth = new Date().getMonth();
	const totalPlan = totals.plan.reduce((s, v) => s + v, 0);
	const totalFact = totals.fact.reduce((s, v) => s + v, 0);
	const totalDelta = totalFact - totalPlan;

	return (
		<div className="h-full flex flex-col">
			<div className="flex items-center justify-between mb-4 flex-shrink-0">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">План-факт</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Плановая аренда (из договоров) против фактических оплат по объектам
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
				<table className="text-xs border-collapse" style={{ minWidth: "1700px" }}>
					<thead>
						{/* Row 1: month group headers */}
						<tr className="bg-gray-200 text-gray-700 font-semibold sticky top-0 z-20">
							<th
								rowSpan={2}
								className="text-left py-2 px-3 sticky left-0 bg-gray-200 z-30 border-r border-gray-300 align-bottom"
								style={{ minWidth: "220px", width: "220px" }}
							>
								Объект
							</th>
							{MONTHS.map((m, i) => {
								const isCur =
									i === curMonth &&
									String(new Date().getFullYear()) === year;
								return (
									<th
										key={i}
										colSpan={2}
										className={`text-center py-1.5 border-r border-gray-300 ${isCur ? "bg-amber-100 text-amber-800" : ""}`}
										style={{ minWidth: "130px" }}
									>
										{m.slice(0, 3)} {year.slice(2)}
									</th>
								);
							})}
							<th
								colSpan={3}
								className="text-center py-1.5 bg-gray-300 border-r border-gray-400"
								style={{ minWidth: "240px" }}
							>
								Итого
							</th>
						</tr>
						{/* Row 2: П / Ф sub-headers */}
						<tr
							className="bg-gray-100 text-gray-500 sticky z-20"
							style={{ top: "33px" }}
						>
							{MONTHS.map((_, i) => {
								const isCur =
									i === curMonth &&
									String(new Date().getFullYear()) === year;
								return (
									<>
										<th
											key={`p${i}`}
											className={`text-right py-1 px-2 border-r border-gray-100 ${isCur ? "bg-amber-50" : ""}`}
										>
											П
										</th>
										<th
											key={`f${i}`}
											className={`text-right py-1 px-2 border-r border-gray-300 ${isCur ? "bg-amber-50" : ""}`}
										>
											Ф
										</th>
									</>
								);
							})}
							<th className="text-right py-1 px-2 border-r border-gray-200 bg-gray-200 font-semibold text-gray-600">
								П
							</th>
							<th className="text-right py-1 px-2 border-r border-gray-200 bg-gray-200 font-semibold text-gray-600">
								Ф
							</th>
							<th className="text-right py-1 px-2 border-r border-gray-400 bg-gray-200 font-semibold text-gray-600">
								Δ
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.length === 0 ? (
							<tr>
								<td
									colSpan={12 * 2 + 4}
									className="text-center py-8 text-gray-400"
								>
									Нет активных договоров за {year} год
								</td>
							</tr>
						) : (
							rows.map((row) => {
								const rPlan = row.plan.reduce((s, v) => s + v, 0);
								const rFact = row.fact.reduce((s, v) => s + v, 0);
								const rDelta = rFact - rPlan;
								return (
									<tr
										key={row.pid}
										className="border-b border-gray-100 hover:bg-gray-50"
									>
										<td className="py-1.5 px-3 sticky left-0 bg-white border-r border-gray-200 font-medium text-gray-800 hover:bg-gray-50">
											{row.name}
										</td>
										{row.plan.map((p, i) => {
											const f = row.fact[i];
											const isCur =
												i === curMonth &&
												String(new Date().getFullYear()) === year;
											return (
												<>
													<td
														key={`p${i}`}
														className={`py-1.5 px-2 text-right border-r border-gray-100 text-gray-500 ${isCur ? "bg-amber-50/40" : ""}`}
													>
														{fmt(p)}
													</td>
													<td
														key={`f${i}`}
														className={`py-1.5 px-2 text-right border-r border-gray-200 font-medium ${
															f > p && p > 0
																? "text-emerald-700"
																: f < p && p > 0
																	? "text-rose-700"
																	: ""
														} ${isCur ? "bg-amber-50/40" : ""}`}
													>
														{fmt(f)}
													</td>
												</>
											);
										})}
										<td className="py-1.5 px-2 text-right border-r border-gray-200 bg-gray-50 text-gray-500">
											{fmt(rPlan)}
										</td>
										<td className="py-1.5 px-2 text-right border-r border-gray-200 bg-gray-50 font-semibold">
											{fmt(rFact)}
										</td>
										<td
											className={`py-1.5 px-2 text-right border-r border-gray-300 bg-gray-50 font-semibold ${
												rDelta < 0
													? "text-rose-700"
													: rDelta > 0
														? "text-emerald-700"
														: "text-gray-400"
											}`}
										>
											{fmtDelta(rDelta)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
					{rows.length > 0 && (
						<tfoot>
							<tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
								<td className="py-2 px-3 sticky left-0 bg-blue-50 border-r border-gray-200 text-blue-900">
									Итого
								</td>
								{totals.plan.map((p, i) => {
									const f = totals.fact[i];
									const isCur =
										i === curMonth &&
										String(new Date().getFullYear()) === year;
									return (
										<>
											<td
												key={`p${i}`}
												className={`py-2 px-2 text-right border-r border-gray-100 text-gray-600 ${isCur ? "bg-amber-100" : ""}`}
											>
												{fmt(p)}
											</td>
											<td
												key={`f${i}`}
												className={`py-2 px-2 text-right border-r border-gray-200 font-bold ${isCur ? "bg-amber-100" : ""}`}
											>
												{fmt(f)}
											</td>
										</>
									);
								})}
								<td className="py-2 px-2 text-right border-r border-gray-200 bg-blue-100 text-gray-700">
									{fmt(totalPlan)}
								</td>
								<td className="py-2 px-2 text-right border-r border-gray-200 bg-blue-100 font-bold">
									{fmt(totalFact)}
								</td>
								<td
									className={`py-2 px-2 text-right border-r border-gray-300 bg-blue-100 font-bold ${
										totalDelta < 0
											? "text-rose-700"
											: totalDelta > 0
												? "text-emerald-700"
												: "text-gray-400"
									}`}
								>
									{fmtDelta(totalDelta)}
								</td>
							</tr>
						</tfoot>
					)}
				</table>
			</div>
		</div>
	);
}
