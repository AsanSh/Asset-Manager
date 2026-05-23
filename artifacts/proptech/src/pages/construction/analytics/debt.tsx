import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

function fmtFull(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

function daysOverdue(dueDate: string) {
	return Math.ceil(
		(Date.now()- new Date(dueDate).getTime()) / 86400000,
	);
}

export default function ConstructionDebt() {
	const { data: accruals = [], isLoading } = useQuery({
		queryKey: ["construction-debt"],
		queryFn: () => api.get("/construction/analytics/debt").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});

	const overdue = accruals.filter((a: any) => new Date(a.dueDate) < new Date());
	const upcoming = accruals.filter(
		(a: any) => new Date(a.dueDate) >= new Date(),
	);
	const totalDebt = accruals.reduce(
		(s: number, a: any) => s + parseFloat(a.remainingAmount || "0"),
		0,
	);
	const totalOverdue = overdue.reduce(
		(s: number, a: any) => s + parseFloat(a.remainingAmount || "0"),
		0,
	);
	const totalUpcoming = upcoming.reduce(
		(s: number, a: any) => s + parseFloat(a.remainingAmount || "0"),
		0,
	);

	// Aging buckets
	const aging = { d30: 0, d60: 0, d90: 0, d90plus: 0 };
	overdue.forEach((a: any) => {
		const d = daysOverdue(a.dueDate);
		const amt = parseFloat(a.remainingAmount || "0");
		if (d <= 30) aging.d30 += amt;
		else if (d <= 60) aging.d60 += amt;
		else if (d <= 90) aging.d90 += amt;
		else aging.d90plus += amt;
	});

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Задолженности</h1>
				<p className="text-gray-500 text-sm mt-0.5">
					Анализ дебиторской задолженности по договорам
				</p>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">Всего к получению</div>
					<div className="text-2xl font-bold text-blue-600">
						{fmtFull(totalDebt)}
					</div>
					<div className="text-xs text-gray-400">
						{accruals.length} платежей
					</div>
				</div>
				<div className="bg-rose-50 rounded-xl p-4 border border-rose-100 shadow-sm">
					<div className="flex items-center gap-1 text-xs text-rose-700 mb-1">
						<AlertTriangle className="w-3 h-3" />
						Просрочено
					</div>
					<div className="text-2xl font-bold text-rose-700">
						{fmtFull(totalOverdue)}
					</div>
					<div className="text-xs text-rose-600">{overdue.length} платежей</div>
				</div>
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
						<Clock className="w-3 h-3" />
						Предстоит
					</div>
					<div className="text-2xl font-bold text-amber-600">
						{fmtFull(totalUpcoming)}
					</div>
					<div className="text-xs text-gray-400">
						{upcoming.length} платежей
					</div>
				</div>
			</div>

			{/* Aging */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
				<div className="text-sm font-semibold text-gray-700 mb-4">
					Aging Report (просрочка по срокам)
				</div>
				<div className="grid grid-cols-4 gap-3">
					{[
						{
							label: "0–30 дней",
							amount: aging.d30,
							color: "bg-amber-100 border-amber-200 text-amber-700",
						},
						{
							label: "30–60 дней",
							amount: aging.d60,
							color: "bg-amber-100 border-amber-200 text-amber-700",
						},
						{
							label: "60–90 дней",
							amount: aging.d90,
							color: "bg-rose-100 border-rose-200 text-rose-700",
						},
						{
							label: "90+ дней",
							amount: aging.d90plus,
							color: "bg-rose-200 border-rose-300 text-rose-800",
						},
					].map((bucket) => (
						<div
							key={bucket.label}
							className={`rounded-lg border p-3 ${bucket.color}`}
						>
							<div className="text-xs font-medium mb-1">{bucket.label}</div>
							<div className="text-lg font-bold">{fmtFull(bucket.amount)}</div>
						</div>
					))}
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-gray-50 border-b border-gray-100">
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								Договор / Покупатель
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								Срок
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								Просрочка
							</th>
							<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
								Начислено
							</th>
							<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
								Остаток
							</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td colSpan={5} className="text-center py-12 text-gray-400">
									Загрузка...
								</td>
							</tr>
						) : accruals.length === 0 ? (
							<tr>
								<td colSpan={5} className="text-center py-12 text-gray-400">
									Нет задолженностей
								</td>
							</tr>
						) : (
							accruals.map((a: any) => {
								const contract = contracts.find(
									(c: any) => c.id === a.contractId,
								);
								const isOvd = new Date(a.dueDate) < new Date();
								const days = isOvd ? daysOverdue(a.dueDate) : 0;
								return (
									<tr
										key={a.id}
										className={`border-b border-gray-50 hover:bg-gray-50/50 ${isOvd ? "bg-rose-50/20" : ""}`}
									>
										<td className="px-4 py-2.5">
											<div className="font-mono text-xs font-medium text-amber-600">
												{contract?.contractNumber || `#${a.contractId}`}
											</div>
											<div className="text-xs text-gray-500">
												{contract?.buyerName}
											</div>
										</td>
										<td className="px-4 py-2.5 text-gray-600">{a.dueDate}</td>
										<td className="px-4 py-2.5">
											{isOvd ? (
												<Badge
													variant="outline"
													className="bg-rose-100 text-rose-700 border-rose-200 text-xs"
												>
													{days} дн.
												</Badge>
											) : (
												<span className="text-xs text-emerald-600">
													Не просрочен
												</span>
											)}
										</td>
										<td className="px-4 py-2.5 text-right font-mono">
											{fmtFull(a.amount)}
										</td>
										<td
											className={`px-4 py-2.5 text-right font-mono font-bold ${isOvd ? "text-rose-700" : "text-amber-600"}`}
										>
											{fmtFull(a.remainingAmount)}
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
