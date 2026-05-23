import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

const MONTH_NAMES: Record<string, string> = {
	"01": "Январь",
	"02": "Февраль",
	"03": "Март",
	"04": "Апрель",
	"05": "Май",
	"06": "Июнь",
	"07": "Июль",
	"08": "Август",
	"09": "Сентябрь",
	"10": "Октябрь",
	"11": "Ноябрь",
	"12": "Декабрь",
};

function formatPeriod(period: string) {
	const [year, month] = period.split("-");
	return `${MONTH_NAMES[month] ?? month} ${year}`;
}

function formatDate(d: string) {
	return new Date(d).toLocaleDateString("ru-RU");
}

export default function CashflowReport() {
	const now = new Date();
	const [from, setFrom] = useState(`${now.getFullYear()}-01-01`);
	const [to, setTo] = useState(`${now.getFullYear()}-12-31`);

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["reports", "cashflow", from, to],
		queryFn: () =>
			api
				.get("/reports/cashflow", { params: { from, to } })
				.then((r) => r.data),
	});

	const { summary, byMonth, recentPayments, recentExpenses } = data ?? {
		summary: {},
		byMonth: [],
		recentPayments: [],
		recentExpenses: [],
	};

	const maxVal = Math.max(
		...(byMonth ?? []).map((r: any) => Math.max(r.inflow, r.outflow)),
		1,
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Денежный поток</h1>
					<p className="text-sm text-gray-500 mt-1">
						Поступления и расходы за период
					</p>
				</div>
				<div className="flex items-center gap-3 flex-wrap">
					<div className="flex items-center gap-2">
						<Label className="text-xs text-gray-500">С</Label>
						<Input
							type="date"
							value={from}
							onChange={(e) => setFrom(e.target.value)}
							className="h-8 text-sm w-36"
						/>
					</div>
					<div className="flex items-center gap-2">
						<Label className="text-xs text-gray-500">По</Label>
						<Input
							type="date"
							value={to}
							onChange={(e) => setTo(e.target.value)}
							className="h-8 text-sm w-36"
						/>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isLoading}
					>
						<RefreshCw
							className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")}
						/>{" "}
						Обновить
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white rounded-xl border border-gray-200 p-5">
					<div className="flex items-center gap-3 mb-2">
						<TrendingUp className="w-5 h-5 text-emerald-600" />
						<p className="text-sm text-gray-500">Поступления</p>
					</div>
					<p className="text-2xl font-bold text-emerald-600">
						{formatCurrency(summary?.totalInflow ?? 0)}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-5">
					<div className="flex items-center gap-3 mb-2">
						<TrendingDown className="w-5 h-5 text-rose-600" />
						<p className="text-sm text-gray-500">Расходы</p>
					</div>
					<p className="text-2xl font-bold text-rose-600">
						{formatCurrency(summary?.totalOutflow ?? 0)}
					</p>
				</div>
				<div
					className={cn(
						"rounded-xl border p-5",
						(summary?.netCashflow ?? 0) >= 0
							? "bg-emerald-50 border-emerald-200"
							: "bg-rose-50 border-rose-200",
					)}
				>
					<div className="flex items-center gap-3 mb-2">
						<Activity className="w-5 h-5 text-gray-500" />
						<p className="text-sm text-gray-500">Чистый поток</p>
					</div>
					<p
						className={cn(
							"text-2xl font-bold",
							(summary?.netCashflow ?? 0) >= 0
								? "text-emerald-700"
								: "text-rose-700",
						)}
					>
						{formatCurrency(summary?.netCashflow ?? 0)}
					</p>
				</div>
			</div>

			{/* Chart */}
			<div className="bg-white rounded-xl border border-gray-200 p-6">
				<h2 className="font-semibold text-gray-900 mb-4">По месяцам</h2>
				{isLoading ? (
					<div className="h-40 flex items-center justify-center">
						<RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
					</div>
				) : (byMonth?.length ?? 0) === 0 ? (
					<p className="text-center text-gray-400 py-10 text-sm">Нет данных</p>
				) : (
					<div className="space-y-3">
						{(byMonth ?? []).map((row: any) => (
							<div key={row.period} className="flex items-center gap-3">
								<div className="w-28 text-xs text-gray-500 text-right flex-shrink-0">
									{formatPeriod(row.period)}
								</div>
								<div className="flex-1 space-y-1">
									<div className="flex items-center gap-2">
										<div
											className="h-3.5 bg-green-400 rounded"
											style={{
												width: `${(row.inflow / maxVal) * 100}%`,
												minWidth: 4,
											}}
										/>
										<span className="text-xs text-gray-600">
											{formatCurrency(row.inflow)}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<div
											className="h-3.5 bg-red-400 rounded"
											style={{
												width: `${(row.outflow / maxVal) * 100}%`,
												minWidth: 4,
											}}
										/>
										<span className="text-xs text-gray-600">
											{formatCurrency(row.outflow)}
										</span>
									</div>
								</div>
								<div className="w-24 text-right flex-shrink-0">
									<span
										className={cn(
											"text-xs font-medium",
											row.net >= 0 ? "text-emerald-600" : "text-rose-600",
										)}
									>
										{row.net >= 0 ? "+" : ""}
										{formatCurrency(row.net)}
									</span>
								</div>
							</div>
						))}
						<div className="flex items-center gap-4 pt-2 text-xs text-gray-500">
							<div className="flex items-center gap-1.5">
								<div className="w-3 h-3 bg-green-400 rounded" /> Поступления
							</div>
							<div className="flex items-center gap-1.5">
								<div className="w-3 h-3 bg-red-400 rounded" /> Расходы
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div className="px-5 py-4 border-b border-gray-100">
						<h2 className="font-semibold text-gray-900">
							Последние поступления
						</h2>
					</div>
					<div className="divide-y divide-gray-50">
						{(recentPayments ?? []).slice(0, 8).map((p: any) => (
							<div
								key={p.id}
								className="px-5 py-3 flex items-center justify-between"
							>
								<div>
									<p className="text-sm font-medium text-gray-800">
										{formatDate(p.paymentDate)}
									</p>
									<p className="text-xs text-gray-400">
										{p.paymentMethod || "Без метода"}
									</p>
								</div>
								<span className="text-sm font-semibold text-emerald-600">
									{formatCurrency(parseFloat(p.amount))}
								</span>
							</div>
						))}
						{(recentPayments ?? []).length === 0 && (
							<p className="text-center text-gray-400 py-8 text-sm">
								Нет платежей
							</p>
						)}
					</div>
				</div>

				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div className="px-5 py-4 border-b border-gray-100">
						<h2 className="font-semibold text-gray-900">Последние расходы</h2>
					</div>
					<div className="divide-y divide-gray-50">
						{(recentExpenses ?? []).slice(0, 8).map((e: any) => (
							<div
								key={e.id}
								className="px-5 py-3 flex items-center justify-between"
							>
								<div>
									<p className="text-sm font-medium text-gray-800">
										{e.description || "Расход"}
									</p>
									<p className="text-xs text-gray-400">
										{formatDate(e.expenseDate)}
									</p>
								</div>
								<span className="text-sm font-semibold text-rose-600">
									{formatCurrency(parseFloat(e.amount))}
								</span>
							</div>
						))}
						{(recentExpenses ?? []).length === 0 && (
							<p className="text-center text-gray-400 py-8 text-sm">
								Нет расходов
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
