import { useQuery } from "@tanstack/react-query";
import { Calendar, } from "lucide-react";
import { api } from "@/lib/api";

function fmtFull(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

const MONTHS = [
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

export default function ConstructionForecast() {
	const { data: accruals = [] } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});

	const pending = accruals.filter((a: any) => a.status !== "paid");

	// Group by month
	const byMonth: Record<
		string,
		{ total: number; count: number; items: any[] }
	> = {};
	pending.forEach((a: any) => {
		const key = a.dueDate?.slice(0, 7);
		if (!key) return;
		if (!byMonth[key]) byMonth[key] = { total: 0, count: 0, items: [] };
		byMonth[key].total += parseFloat(a.remainingAmount || "0");
		byMonth[key].count++;
		byMonth[key].items.push(a);
	});

	const monthsSorted = Object.entries(byMonth).sort(([a], [b]) =>
		a.localeCompare(b),
	);
	const maxMonthly = Math.max(...monthsSorted.map(([, v]) => v.total), 1);
	const totalForecast = monthsSorted.reduce((s, [, v]) => s + v.total, 0);

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">
					Будущие поступления
				</h1>
				<p className="text-gray-500 text-sm mt-0.5">
					Прогноз cashflow на основе действующих договоров и графиков
				</p>
			</div>

			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">Всего к получению</div>
					<div className="text-2xl font-bold text-blue-600">
						{fmtFull(totalForecast)}
					</div>
				</div>
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">Периодов</div>
					<div className="text-2xl font-bold text-gray-900">
						{monthsSorted.length}
					</div>
				</div>
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">Платежей</div>
					<div className="text-2xl font-bold text-gray-900">
						{pending.length}
					</div>
				</div>
			</div>

			<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
				<div className="text-sm font-semibold text-gray-700 mb-4">
					График поступлений
				</div>
				{monthsSorted.length === 0 ? (
					<div className="text-center py-8 text-gray-400 text-sm">
						<Calendar className="w-10 h-10 mx-auto mb-2 text-gray-200" />
						Нет данных. Создайте договоры и сформируйте графики платежей.
					</div>
				) : (
					<div className="space-y-3">
						{monthsSorted.map(([key, v]) => {
							const [y, m] = key.split("-");
							const isPast =
								new Date(key) <
								new Date(new Date().getFullYear(), new Date().getMonth());
							const pct = Math.round((v.total / maxMonthly) * 100);
							return (
								<div key={key}>
									<div className="flex items-center justify-between text-sm mb-1">
										<div className="flex items-center gap-2">
											<span
												className={`font-medium ${isPast ? "text-gray-400" : "text-gray-700"}`}
											>
												{MONTHS[parseInt(m, 10) - 1]} {y}
											</span>
											{isPast && (
												<span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
													прошлый
												</span>
											)}
										</div>
										<div className="text-right">
											<span className="font-mono font-bold text-blue-600">
												{fmtFull(v.total)}
											</span>
											<span className="text-xs text-gray-400 ml-2">
												{v.count} пл.
											</span>
										</div>
									</div>
									<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
										<div
											className={`h-full rounded-full transition-all ${isPast ? "bg-gray-300" : "bg-blue-400"}`}
											style={{ width: `${pct}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-gray-50 border-b border-gray-100">
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								Договор
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								Покупатель
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								Дата платежа
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								№ платежа
							</th>
							<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
								Сумма
							</th>
						</tr>
					</thead>
					<tbody>
						{pending.slice(0, 30).map((a: any) => {
							const contract = contracts.find(
								(c: any) => c.id === a.contractId,
							);
							const isOvd = new Date(a.dueDate) < new Date();
							return (
								<tr
									key={a.id}
									className={`border-b border-gray-50 hover:bg-gray-50/50 ${isOvd ? "bg-rose-50/30" : ""}`}
								>
									<td className="px-4 py-2.5 font-mono text-xs font-medium text-amber-600">
										{contract?.contractNumber || `#${a.contractId}`}
									</td>
									<td className="px-4 py-2.5 text-gray-600">
										{contract?.buyerName || "—"}
									</td>
									<td
										className={`px-4 py-2.5 ${isOvd ? "text-rose-600 font-medium" : "text-gray-600"}`}
									>
										{a.dueDate}
									</td>
									<td className="px-4 py-2.5 text-gray-400">
										#{a.installmentNumber}
									</td>
									<td className="px-4 py-2.5 text-right font-mono font-bold text-blue-600">
										{fmtFull(a.remainingAmount)}
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
