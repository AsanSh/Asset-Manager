import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

function StatCard({
	title,
	value,
	sub,
	icon: Icon,
	color,
}: {
	title: string;
	value: string;
	sub?: string;
	icon: React.ElementType;
	color: string;
}) {
	return (
		<div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
			<div
				className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
			>
				<Icon className="w-5 h-5 text-white" />
			</div>
			<div>
				<p className="text-sm text-gray-500">{title}</p>
				<p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
				{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
			</div>
		</div>
	);
}

export default function DebtReport() {
	const { data, isLoading, refetch } = useQuery({
		queryKey: ["reports", "debt"],
		queryFn: () => api.get("/reports/debt").then((r) => r.data),
	});

	if (isLoading)
		return (
			<div className="flex items-center justify-center h-64">
				<RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
			</div>
		);

	const { summary, rows } = data ?? { summary: {}, rows: [] };

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Отчёт по задолженностям
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Просроченные и текущие долги арендаторов
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={() => refetch()}>
					<RefreshCw className="w-4 h-4 mr-2" /> Обновить
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<StatCard
					title="Всего должников"
					value={String(summary?.totalDebtors ?? 0)}
					icon={Users}
					color="bg-amber-500"
				/>
				<StatCard
					title="Общий долг"
					value={formatCurrency(summary?.totalDebt ?? 0)}
					icon={TrendingUp}
					color="bg-rose-600"
				/>
				<StatCard
					title="Просрочено"
					value={formatCurrency(summary?.totalOverdue ?? 0)}
					sub="Срок оплаты истёк"
					icon={AlertTriangle}
					color="bg-rose-600"
				/>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
					<h2 className="font-semibold text-gray-900">
						Детализация по договорам
					</h2>
					<span className="text-sm text-gray-500">{rows.length} записей</span>
				</div>
				{rows.length === 0 ? (
					<div className="text-center py-16 text-gray-400">
						<AlertTriangle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
						<p className="font-medium">Задолженностей нет</p>
						<p className="text-sm mt-1">Все арендаторы оплачивают вовремя</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-gray-50 border-b border-gray-100">
								<tr>
									<th className="text-left px-6 py-3 font-medium text-gray-500">
										Арендатор
									</th>
									<th className="text-left px-6 py-3 font-medium text-gray-500">
										Объект
									</th>
									<th className="text-right px-6 py-3 font-medium text-gray-500">
										Общий долг
									</th>
									<th className="text-right px-6 py-3 font-medium text-gray-500">
										Просрочено
									</th>
									<th className="text-left px-6 py-3 font-medium text-gray-500">
										Периоды
									</th>
									<th className="text-left px-6 py-3 font-medium text-gray-500">
										Статус
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{rows.map((row: any) => (
									<tr
										key={row.contractId}
										className="hover:bg-gray-50 transition-colors"
									>
										<td className="px-6 py-4 font-medium text-gray-900">
											{row.tenantName}
										</td>
										<td className="px-6 py-4 text-gray-600">
											{row.propertyUnitNumber}
										</td>
										<td className="px-6 py-4 text-right font-semibold text-gray-900">
											{formatCurrency(row.totalDebt)}
										</td>
										<td className="px-6 py-4 text-right">
											{row.overdueDebt > 0 ? (
												<span className="font-semibold text-rose-600">
													{formatCurrency(row.overdueDebt)}
												</span>
											) : (
												<span className="text-gray-400">—</span>
											)}
										</td>
										<td className="px-6 py-4 text-gray-500 text-xs">
											{row.periods?.slice(0, 3).join(", ")}
											{row.periods?.length > 3 ? "..." : ""}
										</td>
										<td className="px-6 py-4">
											{row.overdueDebt > 0 ? (
												<Badge variant="destructive" className="text-xs">
													Просрочено
												</Badge>
											) : (
												<Badge variant="secondary" className="text-xs">
													Текущий
												</Badge>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
