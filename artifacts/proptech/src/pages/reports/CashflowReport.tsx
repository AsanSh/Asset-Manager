import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, TrendingDown, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { defaultPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

type DrillType = "inflow" | "outflow" | null;

function DrillDownModal({
	type,
	payments,
	expenses,
	onClose,
}: {
	type: DrillType;
	payments: any[];
	expenses: any[];
	onClose: () => void;
}) {
	if (!type) return null;
	const rows = type === "inflow" ? payments : expenses;
	const title = type === "inflow" ? "Поступления" : "Расходы";

	return (
		<div className="fixed inset-0 bg-slate-950/40 z-50 flex items-start justify-end">
			<div className="bg-white h-full w-full max-w-lg shadow-2xl flex flex-col">
				<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
					<h2 className="font-semibold text-gray-900">{title} — детализация</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto divide-y divide-gray-50">
					{rows.length === 0 ? (
						<p className="text-center py-16 text-gray-400 text-sm">Нет данных</p>
					) : (
						rows.map((r: any, i: number) => (
							<div key={r.id ?? i} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="text-sm font-medium text-gray-900 truncate">
											{type === "inflow"
												? (r.tenantName || `Арендатор #${r.leaseContractId}`)
												: (r.description || r.category || "Расход")}
										</p>
										<p className="text-xs text-gray-400 mt-0.5">
											{new Date(type === "inflow" ? r.paymentDate : r.expenseDate).toLocaleDateString("ru-RU")}
											{type === "inflow" && r.paymentMethod
												? ` · ${r.paymentMethod}`
												: ""}
											{type === "outflow" && r.category
												? ` · ${r.category}`
												: ""}
										</p>
										{type === "inflow" && r.propertyUnitNumber && (
											<p className="text-xs text-blue-500 mt-0.5">{r.propertyUnitNumber}</p>
										)}
									</div>
									<p className={`text-sm font-semibold flex-shrink-0 ${
										type === "inflow" ? "text-emerald-600" : "text-rose-600"
									}`}>
										{type === "inflow" ? "+" : "-"}{formatCurrency(parseFloat(r.amount))}
									</p>
								</div>
							</div>
						))
					)}
				</div>
				<div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
					<div className="flex justify-between text-sm font-semibold">
						<span className="text-gray-600">Итого {title.toLowerCase()}</span>
						<span className={type === "inflow" ? "text-emerald-700" : "text-rose-700"}>
							{formatCurrency(rows.reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0))}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

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
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const [drill, setDrill] = useState<DrillType>(null);
	const from = period.from;
	const to = period.to;

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
			<div className="space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Денежный поток</h1>
						<p className="text-sm text-gray-500 mt-1">
							Поступления и расходы за период
						</p>
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
				<PeriodPicker value={period} onChange={setPeriod} />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<button
					onClick={() => setDrill("inflow")}
					className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md hover:border-emerald-200 transition-all"
				>
					<div className="flex items-center gap-3 mb-2">
						<TrendingUp className="w-5 h-5 text-emerald-600" />
						<p className="text-sm text-gray-500">Поступления</p>
					</div>
					<p className="text-2xl font-bold text-emerald-600">
						{formatCurrency(summary?.totalInflow ?? 0)}
					</p>
					<p className="text-xs text-emerald-500 mt-1">Нажмите для детализации →</p>
				</button>
				<button
					onClick={() => setDrill("outflow")}
					className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md hover:border-rose-200 transition-all"
				>
					<div className="flex items-center gap-3 mb-2">
						<TrendingDown className="w-5 h-5 text-rose-600" />
						<p className="text-sm text-gray-500">Расходы</p>
					</div>
					<p className="text-2xl font-bold text-rose-600">
						{formatCurrency(summary?.totalOutflow ?? 0)}
					</p>
					<p className="text-xs text-rose-400 mt-1">Нажмите для детализации →</p>
				</button>
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

			<DrillDownModal
				type={drill}
				payments={recentPayments ?? []}
				expenses={recentExpenses ?? []}
				onClose={() => setDrill(null)}
			/>
		</div>
	);
}
