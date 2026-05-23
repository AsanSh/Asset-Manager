import { useQuery } from "@tanstack/react-query";
import { CreditCard, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

function formatDate(d: string) {
	return new Date(d).toLocaleDateString("ru-RU");
}

const METHOD_LABELS: Record<string, string> = {
	cash: "Наличные",
	bank_transfer: "Перевод",
	card: "Карта",
	online: "Онлайн",
	check: "Чек",
};

export default function PaymentsReport() {
	const now = new Date();
	const [from, setFrom] = useState(`${now.getFullYear()}-01-01`);
	const [to, setTo] = useState(`${now.getFullYear()}-12-31`);

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["reports", "payments", from, to],
		queryFn: () =>
			api
				.get("/reports/payments", { params: { from, to } })
				.then((r) => r.data),
	});

	const { total, count, rows } = data ?? { total: 0, count: 0, rows: [] };

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">История платежей</h1>
					<p className="text-sm text-gray-500 mt-1">
						Все поступления за выбранный период
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

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
					<div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
						<CreditCard className="w-5 h-5 text-white" />
					</div>
					<div>
						<p className="text-sm text-gray-500">Всего получено</p>
						<p className="text-2xl font-bold text-gray-900 mt-0.5">
							{formatCurrency(total ?? 0)}
						</p>
					</div>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
					<div>
						<p className="text-sm text-gray-500">Количество платежей</p>
						<p className="text-2xl font-bold text-gray-900 mt-0.5">
							{count ?? 0}
						</p>
					</div>
					{count > 0 && (
						<div>
							<p className="text-sm text-gray-500">Средний платёж</p>
							<p className="text-lg font-semibold text-gray-700 mt-0.5">
								{formatCurrency((total ?? 0) / (count || 1))}
							</p>
						</div>
					)}
				</div>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
					<h2 className="font-semibold text-gray-900">Список платежей</h2>
					<span className="text-sm text-gray-500">{count} записей</span>
				</div>
				{isLoading ? (
					<div className="h-40 flex items-center justify-center">
						<RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
					</div>
				) : (rows ?? []).length === 0 ? (
					<div className="text-center py-16 text-gray-400">
						<CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-300" />
						<p>Нет платежей за выбранный период</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-gray-50 border-b border-gray-100">
								<tr>
									<th className="text-left px-6 py-3 font-medium text-gray-500">
										Дата
									</th>
									<th className="text-left px-6 py-3 font-medium text-gray-500">
										Арендатор
									</th>
									<th className="text-left px-6 py-3 font-medium text-gray-500">
										Объект
									</th>
									<th className="text-left px-6 py-3 font-medium text-gray-500">
										Договор №
									</th>
									<th className="text-left px-6 py-3 font-medium text-gray-500">
										Метод
									</th>
									<th className="text-right px-6 py-3 font-medium text-gray-500">
										Сумма
									</th>
									<th className="text-left px-6 py-3 font-medium text-gray-500">
										Аллокации
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{(rows ?? []).map((p: any) => (
									<tr key={p.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 text-gray-700 whitespace-nowrap">
											{formatDate(p.paymentDate)}
										</td>
										<td className="px-6 py-4 font-medium text-gray-900">
											{p.tenantName}
										</td>
										<td className="px-6 py-4 text-gray-600">
											{p.propertyUnitNumber}
										</td>
										<td className="px-6 py-4 text-gray-500 text-xs">
											{p.contractNumber}
										</td>
										<td className="px-6 py-4">
											<Badge variant="outline" className="text-xs">
												{METHOD_LABELS[p.paymentMethod] ||
													p.paymentMethod ||
													"—"}
											</Badge>
										</td>
										<td className="px-6 py-4 text-right font-semibold text-emerald-600">
											{formatCurrency(p.amount)}
										</td>
										<td className="px-6 py-4 text-xs text-gray-400">
											{p.allocations?.length > 0
												? `${p.allocations.length} начислений`
												: "—"}
										</td>
									</tr>
								))}
							</tbody>
							<tfoot className="border-t border-gray-200 bg-gray-50">
								<tr>
									<td
										colSpan={5}
										className="px-6 py-3 text-sm font-semibold text-gray-700"
									>
										Итого
									</td>
									<td className="px-6 py-3 text-right font-bold text-gray-900">
										{formatCurrency(total ?? 0)}
									</td>
									<td />
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
