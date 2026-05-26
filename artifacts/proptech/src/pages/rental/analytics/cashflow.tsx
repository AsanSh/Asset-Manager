import { useQuery } from "@tanstack/react-query";
import {
	ArrowDownRight,
	ArrowUpRight,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

const MONTHS = [
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

function fmtFull(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0 ₸";
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(v);
}

export default function RentalCashflow() {
	const [year, setYear] = useState(new Date().getFullYear().toString());

	const { data: payments = [] } = useQuery<any[]>({
		queryKey: getRentalPaymentsAllQueryKey(),
		queryFn: () => api.get("/rental/payments").then((r) => r.data),
	});
	const { data: expenses = [] } = useQuery<any[]>({
		queryKey: getRentalExpensesAllQueryKey(),
		queryFn: () => api.get("/rental/expenses").then((r) => r.data),
	});

	const paymentsArray = Array.isArray(payments) ? payments : [];
	const expensesArray = Array.isArray(expenses) ? expenses : [];

	const monthly: Record<string, { income: number; expense: number }> = {};
	for (let m = 1; m <= 12; m++) {
		monthly[String(m).padStart(2, "0")] = { income: 0, expense: 0 };
	}

	paymentsArray.forEach((p: any) => {
		const d = p.paymentDate || p.createdAt;
		if (!d?.startsWith(year)) return;
		const mon = d.slice(5, 7);
		if (monthly[mon]) monthly[mon].income += parseFloat(p.amount || "0");
	});
	expensesArray.forEach((e: any) => {
		const d = e.expenseDate || e.createdAt;
		if (!d?.startsWith(year)) return;
		const mon = d.slice(5, 7);
		if (monthly[mon]) monthly[mon].expense += parseFloat(e.amount || "0");
	});

	const months = Object.entries(monthly);
	const maxVal = Math.max(
		...months.map(([, v]) => Math.max(v.income, v.expense)),
		1,
	);
	const totalIncome = months.reduce((s, [, v]) => s + v.income, 0);
	const totalExpense = months.reduce((s, [, v]) => s + v.expense, 0);
	const net = totalIncome - totalExpense;

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Движение денег</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Поступления и расходы по месяцам
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

			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-white border rounded-lg p-4">
					<div className="flex items-center gap-2 mb-1">
						<ArrowUpRight className="w-4 h-4 text-emerald-600" />
						<span className="text-sm text-gray-500">Поступления</span>
					</div>
					<p className="text-xl font-bold text-emerald-600">
						{fmtFull(totalIncome)}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<div className="flex items-center gap-2 mb-1">
						<ArrowDownRight className="w-4 h-4 text-rose-600" />
						<span className="text-sm text-gray-500">Расходы</span>
					</div>
					<p className="text-xl font-bold text-rose-700">
						{fmtFull(totalExpense)}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<div className="flex items-center gap-2 mb-1">
						{net >= 0 ? (
							<TrendingUp className="w-4 h-4 text-blue-600" />
						) : (
							<TrendingDown className="w-4 h-4 text-amber-600" />
						)}
						<span className="text-sm text-gray-500">Чистый поток</span>
					</div>
					<p
						className={`text-xl font-bold ${net >= 0 ? "text-blue-600" : "text-amber-600"}`}
					>
						{fmtFull(net)}
					</p>
				</div>
			</div>

			<div className="bg-white border rounded-lg p-6">
				<div className="flex items-center gap-4 mb-4">
					<div className="flex items-center gap-1.5">
						<div className="w-3 h-3 rounded-sm bg-blue-600" />
						<span className="text-xs text-gray-700">Поступления</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="w-3 h-3 rounded-sm bg-rose-600" />
						<span className="text-xs text-gray-700">Расходы</span>
					</div>
				</div>
				<div className="flex items-end gap-2 h-48">
					{months.map(([mon, vals]) => (
						<div
							key={mon}
							className="flex-1 flex flex-col items-center gap-0.5"
						>
							<div className="w-full flex items-end gap-0.5 h-40">
								<div
									className="flex-1 bg-blue-600 rounded-t-sm transition-all"
									style={{
										height: `${(vals.income / maxVal) * 100}%`,
										minHeight: vals.income > 0 ? "2px" : "0",
									}}
								/>
								<div
									className="flex-1 bg-rose-600 rounded-t-sm transition-all"
									style={{
										height: `${(vals.expense / maxVal) * 100}%`,
										minHeight: vals.expense > 0 ? "2px" : "0",
									}}
								/>
							</div>
							<span className="text-xs text-gray-400">
								{MONTHS[parseInt(mon, 10) - 1]}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className="bg-white border rounded-lg mt-4 overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="text-left p-3 font-medium text-gray-600">Месяц</th>
							<th className="text-right p-3 font-medium text-gray-600">
								Поступления
							</th>
							<th className="text-right p-3 font-medium text-gray-600">
								Расходы
							</th>
							<th className="text-right p-3 font-medium text-gray-600">
								Нетто
							</th>
						</tr>
					</thead>
					<tbody>
						{months.map(([mon, vals]) => {
							const n = vals.income - vals.expense;
							return (
								<tr key={mon} className="border-t hover:bg-gray-50">
									<td className="p-3 text-gray-700">
										{MONTHS[parseInt(mon, 10) - 1]} {year}
									</td>
									<td className="p-3 text-right font-medium text-emerald-600">
										{vals.income > 0 ? fmtFull(vals.income) : "—"}
									</td>
									<td className="p-3 text-right font-medium text-rose-600">
										{vals.expense > 0 ? fmtFull(vals.expense) : "—"}
									</td>
									<td
										className={`p-3 text-right font-semibold ${n > 0 ? "text-blue-600" : n < 0 ? "text-amber-600" : "text-gray-400"}`}
									>
										{vals.income > 0 || vals.expense > 0 ? fmtFull(n) : "—"}
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
