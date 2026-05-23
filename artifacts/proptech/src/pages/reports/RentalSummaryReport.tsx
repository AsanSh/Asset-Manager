import { useQuery } from "@tanstack/react-query";
import {
	CreditCard,
	Receipt,
	RefreshCw,
	Scale,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

function StatCard({
	title,
	value,
	sub,
	icon: Icon,
	className,
}: {
	title: string;
	value: string;
	sub?: string;
	icon: React.ElementType;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"bg-white rounded-xl border border-gray-200 p-5",
				className,
			)}
		>
			<div className="flex items-center gap-3 mb-2">
				<Icon className="w-4 h-4 text-gray-400" />
				<p className="text-sm text-gray-500">{title}</p>
			</div>
			<p className="text-2xl font-bold text-gray-900">{value}</p>
			{sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
		</div>
	);
}

const MONTH_NAMES: Record<string, string> = {
	"01": "Янв",
	"02": "Фев",
	"03": "Мар",
	"04": "Апр",
	"05": "Май",
	"06": "Июн",
	"07": "Июл",
	"08": "Авг",
	"09": "Сен",
	"10": "Окт",
	"11": "Ноя",
	"12": "Дек",
};

function formatPeriod(period: string) {
	const [year, month] = period.split("-");
	return `${MONTH_NAMES[month] ?? month} ${year}`;
}

export default function RentalSummaryReport() {
	const currentYear = new Date().getFullYear();
	const [from, setFrom] = useState(`${currentYear}-01`);
	const [to, setTo] = useState(`${currentYear}-12`);

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["reports", "rental-summary", from, to],
		queryFn: () =>
			api
				.get("/reports/rental-summary", { params: { from, to } })
				.then((r) => r.data),
	});

	const { summary, byMonth } = data ?? { summary: {}, byMonth: [] };

	const maxVal = Math.max(
		...(byMonth ?? []).map((r: any) => Math.max(r.charged, r.paid)),
		1,
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Сводка по аренде</h1>
					<p className="text-sm text-gray-500 mt-1">
						Начисления и оплаты за выбранный период
					</p>
				</div>
				<div className="flex items-center gap-3 flex-wrap">
					<div className="flex items-center gap-2">
						<Label className="text-xs text-gray-500 whitespace-nowrap">
							С месяца
						</Label>
						<Input
							type="month"
							value={from}
							onChange={(e) => setFrom(e.target.value)}
							className="h-8 text-sm w-36"
						/>
					</div>
					<div className="flex items-center gap-2">
						<Label className="text-xs text-gray-500 whitespace-nowrap">
							По месяц
						</Label>
						<Input
							type="month"
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

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<StatCard
					title="Начислено"
					value={formatCurrency(summary?.totalCharged ?? 0)}
					icon={Receipt}
				/>
				<StatCard
					title="Скидки / Льготы"
					value={formatCurrency(summary?.totalDiscount ?? 0)}
					icon={Scale}
				/>
				<StatCard
					title="Оплачено"
					value={formatCurrency(summary?.totalPaid ?? 0)}
					icon={CreditCard}
				/>
				<StatCard
					title="Собираемость"
					value={`${summary?.collectionRate ?? 0}%`}
					sub="оплачено от начисленного"
					icon={TrendingUp}
					className={
						summary?.collectionRate >= 90
							? "border-emerald-200 bg-emerald-50"
							: summary?.collectionRate >= 70
								? "border-amber-200 bg-amber-50"
								: "border-rose-200 bg-rose-50"
					}
				/>
			</div>

			{/* Chart */}
			<div className="bg-white rounded-xl border border-gray-200 p-6">
				<h2 className="font-semibold text-gray-900 mb-4">
					Динамика по месяцам
				</h2>
				{isLoading ? (
					<div className="h-48 flex items-center justify-center">
						<RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
					</div>
				) : byMonth?.length === 0 ? (
					<div className="h-48 flex items-center justify-center text-gray-400 text-sm">
						Нет данных за выбранный период
					</div>
				) : (
					<div className="space-y-3">
						{(byMonth ?? []).map((row: any) => (
							<div key={row.period} className="flex items-center gap-3">
								<div className="w-14 text-xs text-gray-500 text-right flex-shrink-0">
									{formatPeriod(row.period)}
								</div>
								<div className="flex-1 space-y-1">
									<div className="flex items-center gap-2">
										<div
											className="h-4 bg-blue-100 rounded"
											style={{
												width: `${(row.charged / maxVal) * 100}%`,
												minWidth: 4,
											}}
										/>
										<span className="text-xs text-gray-600">
											{formatCurrency(row.charged)}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<div
											className="h-4 bg-emerald-600 rounded"
											style={{
												width: `${(row.paid / maxVal) * 100}%`,
												minWidth: 4,
											}}
										/>
										<span className="text-xs text-gray-600">
											{formatCurrency(row.paid)}
										</span>
									</div>
								</div>
								<div className="w-16 text-right flex-shrink-0">
									{row.balance > 0 ? (
										<span className="text-xs text-rose-600 font-medium">
											-{formatCurrency(row.balance)}
										</span>
									) : (
										<span className="text-xs text-emerald-600 font-medium">
											✓
										</span>
									)}
								</div>
							</div>
						))}
						<div className="flex items-center gap-4 pt-2 text-xs text-gray-500">
							<div className="flex items-center gap-1.5">
								<div className="w-3 h-3 bg-blue-100 rounded" /> Начислено
							</div>
							<div className="flex items-center gap-1.5">
								<div className="w-3 h-3 bg-emerald-600 rounded" /> Оплачено
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100">
					<h2 className="font-semibold text-gray-900">
						Детализация по периодам
					</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-gray-50 border-b border-gray-100">
							<tr>
								<th className="text-left px-6 py-3 font-medium text-gray-500">
									Период
								</th>
								<th className="text-right px-6 py-3 font-medium text-gray-500">
									Начислено
								</th>
								<th className="text-right px-6 py-3 font-medium text-gray-500">
									Оплачено
								</th>
								<th className="text-right px-6 py-3 font-medium text-gray-500">
									Долг
								</th>
								<th className="text-right px-6 py-3 font-medium text-gray-500">
									Договоров
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{(byMonth ?? []).map((row: any) => (
								<tr
									key={row.period}
									className="hover:bg-gray-50 transition-colors"
								>
									<td className="px-6 py-3.5 font-medium text-gray-900">
										{formatPeriod(row.period)}
									</td>
									<td className="px-6 py-3.5 text-right text-gray-700">
										{formatCurrency(row.charged)}
									</td>
									<td className="px-6 py-3.5 text-right text-emerald-600 font-medium">
										{formatCurrency(row.paid)}
									</td>
									<td className="px-6 py-3.5 text-right">
										{row.balance > 0 ? (
											<span className="text-rose-600 font-medium">
												{formatCurrency(row.balance)}
											</span>
										) : (
											<span className="text-gray-300">—</span>
										)}
									</td>
									<td className="px-6 py-3.5 text-right text-gray-500">
										{row.count ?? 0}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
