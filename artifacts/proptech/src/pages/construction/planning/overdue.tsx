import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

function fmtFull(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

export default function ConstructionOverdue() {
	const qc = useQueryClient();

	const { data: accruals = [], isLoading } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});

	const patchMut = useMutation({
		mutationFn: ({ id, data }: { id: number; data: any }) =>
			api.patch(`/construction/accruals/${id}`, data).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["construction-accruals"] });
			toast.success("Статус обновлён");
		},
	});

	const overdue = accruals.filter(
		(a: any) => a.status !== "paid" && new Date(a.dueDate) < new Date(),
	);
	const totalOverdue = overdue.reduce(
		(s: number, a: any) => s + parseFloat(a.remainingAmount || "0"),
		0,
	);
	const totalPaid = overdue.reduce(
		(s: number, a: any) => s + parseFloat(a.paidAmount || "0"),
		0,
	);

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Просрочки</h1>
				<p className="text-gray-500 text-sm mt-0.5">
					Реестр просроченных платежей по договорам
				</p>
			</div>

			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-rose-50 rounded-xl p-4 border border-rose-100 shadow-sm">
					<div className="flex items-center gap-1 text-xs text-rose-600 mb-1">
						<AlertTriangle className="w-3 h-3" />
						Сумма просрочки
					</div>
					<div className="text-2xl font-bold text-rose-600">
						{fmtFull(totalOverdue)}
					</div>
				</div>
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">Частично оплачено</div>
					<div className="text-2xl font-bold text-amber-600">
						{fmtFull(totalPaid)}
					</div>
				</div>
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">
						Просроченных платежей
					</div>
					<div className="text-2xl font-bold text-rose-600">
						{overdue.length} шт.
					</div>
				</div>
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
								Срок платежа
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								Просрочка
							</th>
							<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
								Долг
							</th>
							<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
								Оплачено
							</th>
							<th className="px-4 py-3"></th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td colSpan={7} className="text-center py-12 text-gray-400">
									Загрузка...
								</td>
							</tr>
						) : overdue.length === 0 ? (
							<tr>
								<td colSpan={7} className="text-center py-12 text-gray-400">
									<CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
									Нет просрочек — все платежи в порядке!
								</td>
							</tr>
						) : (
							overdue.map((a: any) => {
								const contract = contracts.find(
									(c: any) => c.id === a.contractId,
								);
								const days = Math.ceil(
									(Date.now()- new Date(a.dueDate).getTime()) /
										86400000,
								);
								const severity =
									days <= 30 ? "yellow" : days <= 60 ? "orange" : "red";
								const colorMap = {
									yellow: "bg-amber-100 text-amber-700 border-amber-200",
									orange: "bg-amber-100 text-amber-700 border-amber-200",
									red: "bg-rose-100 text-rose-700 border-rose-200",
								};
								return (
									<tr
										key={a.id}
										className="border-b border-gray-50 hover:bg-rose-50/30 transition-colors"
									>
										<td className="px-4 py-3 font-mono text-xs font-medium text-amber-600">
											{contract?.contractNumber || `#${a.contractId}`}
										</td>
										<td className="px-4 py-3 font-medium">
											{contract?.buyerName || "—"}
										</td>
										<td className="px-4 py-3 text-gray-600">{a.dueDate}</td>
										<td className="px-4 py-3">
											<Badge
												variant="outline"
												className={`${colorMap[severity]} text-xs`}
											>
												{days} дн.
											</Badge>
										</td>
										<td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
											{fmtFull(a.remainingAmount)}
										</td>
										<td className="px-4 py-3 text-right font-mono text-emerald-600">
											{fmtFull(a.paidAmount)}
										</td>
										<td className="px-4 py-3">
											<Button
												size="sm"
												variant="outline"
												className="h-7 text-xs"
												onClick={() =>
													patchMut.mutate({
														id: a.id,
														data: {
															status: "paid",
															paidAmount: a.amount,
															remainingAmount: "0",
															paidAt: new Date().toISOString().slice(0, 10),
														},
													})
												}
											>
												Закрыть
											</Button>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
