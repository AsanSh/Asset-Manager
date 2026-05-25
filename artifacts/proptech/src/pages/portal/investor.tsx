import { useQuery } from "@tanstack/react-query";
import {
	BadgeDollarSign,
	Building2,
	CreditCard,
	FileText,
	LogOut,
	Percent,
	Printer,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function fmt(n: any) {
	const num = parseFloat(n ?? 0);
	return num.toLocaleString("ru-KG", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}
function fmtDate(d: string) {
	if (!d) return "—";
	return new Date(d).toLocaleDateString("ru-KG", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function KPI({
	icon,
	label,
	value,
	sub,
	color,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	sub?: string;
	color: string;
}) {
	return (
		<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
			<div
				className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
			>
				{icon}
			</div>
			<div>
				<p className="text-xs text-gray-500 font-medium">{label}</p>
				<p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
				{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
			</div>
		</div>
	);
}

export default function InvestorPortal() {
	const { user, logout } = useAuth();

	const { data, isLoading } = useQuery<any>({
		queryKey: ["portal-investor-me"],
		queryFn: () => api.get("/portal/investor/me").then((r) => r.data),
	});

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	const investor = data?.investor;
	const investments = data?.investments ?? [];
	const distributions = data?.distributions ?? [];

	const totalInvested = investments.reduce(
		(s: number, i: any) => s + parseFloat(i.capitalInvested || 0),
		0,
	);
	const totalReceived = distributions.reduce(
		(s: number, d: any) => s + parseFloat(d.amount || 0),
		0,
	);
	const roi = totalInvested > 0 ? (totalReceived / totalInvested) * 100 : 0;

	const userName =
		[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Владелец";

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Portal Header */}
			<header className="bg-white border-b border-gray-200 sticky top-0 z-40">
				<div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
							<TrendingUp className="w-5 h-5 text-white" />
						</div>
						<div>
							<p className="text-sm font-bold text-gray-900">BuildFlow</p>
							<p className="text-[10px] text-gray-400 -mt-0.5">
								Портал владельца
							</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm text-gray-600 font-medium">
							{userName}
						</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={logout}
							className="text-gray-500 gap-1.5"
						>
							<LogOut className="w-4 h-4" /> Выйти
						</Button>
					</div>
				</div>
			</header>

			<div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
				{/* Welcome */}
				<div className="bg-gradient-to-r from-blue-600 to-blue-600 rounded-2xl p-6 text-white">
					<p className="text-sm opacity-80 mb-1">Добро пожаловать,</p>
					<h1 className="text-2xl font-bold">
						{investor?.fullName || userName}
					</h1>
					<p className="text-sm opacity-70 mt-1">
						Личный инвестиционный портал
					</p>
				</div>

				{/* KPIs */}
				<div className="grid grid-cols-2 gap-4">
					<KPI
						icon={<Wallet className="w-6 h-6 text-blue-600" />}
						label="Инвестировано"
						value={`${fmt(totalInvested)} KGS`}
						sub={`${investments.length} объект(а)`}
						color="bg-blue-50"
					/>
					<KPI
						icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
						label="Получено выплат"
						value={`${fmt(totalReceived)} KGS`}
						sub={`${distributions.length} транзакций`}
						color="bg-emerald-50"
					/>
					<KPI
						icon={<BadgeDollarSign className="w-6 h-6 text-amber-600" />}
						label="ROI"
						value={`${roi.toFixed(1)}%`}
						sub="возврат на инвестиции"
						color="bg-amber-50"
					/>
					<KPI
						icon={<Percent className="w-6 h-6 text-blue-600" />}
						label="Объектов в портфеле"
						value={`${investments.length}`}
						sub="инвестиционных объектов"
						color="bg-blue-50"
					/>
				</div>

				{/* Investments */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
						<Building2 className="w-4 h-4 text-gray-500" />
						<h2 className="font-semibold text-gray-900">Мои объекты</h2>
					</div>
					{investments.length === 0 ? (
						<div className="py-12 text-center text-gray-400">
							<Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
							<p className="text-sm">Нет объектов</p>
						</div>
					) : (
						<div className="divide-y">
							{investments.map((inv: any) => (
								<div key={inv.id} className="px-6 py-4 flex items-center gap-4">
									<div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
										<Building2 className="w-5 h-5 text-blue-600" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="font-semibold text-gray-900 truncate">
											{inv.propertyName || "Объект"}
										</p>
										{inv.propertyUnit && (
											<p className="text-xs text-gray-400">
												Единица: {inv.propertyUnit}
											</p>
										)}
										<p className="text-xs text-gray-400">
											{fmtDate(inv.investedAt || inv.createdAt)}
										</p>
									</div>
									<div className="text-right flex-shrink-0">
										<p className="text-sm font-bold text-blue-700">
											{parseFloat(inv.sharePercent || 0).toFixed(1)}%
										</p>
										<p className="text-xs text-gray-500">
											{fmt(inv.capitalInvested)} KGS
										</p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Distributions / Reconciliation */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
						<div className="flex items-center gap-3">
							<CreditCard className="w-4 h-4 text-gray-500" />
							<h2 className="font-semibold text-gray-900">
								Акт сверки — Выплаты
							</h2>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => window.print()}
							className="gap-1.5 text-xs"
						>
							<Printer className="w-3.5 h-3.5" /> Распечатать
						</Button>
					</div>

					{distributions.length === 0 ? (
						<div className="py-12 text-center text-gray-400">
							<FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
							<p className="text-sm">Нет выплат</p>
						</div>
					) : (
						<div>
							<table className="w-full text-sm">
								<thead>
									<tr className="text-xs text-gray-500 border-b bg-gray-50/50">
										<th className="text-left px-6 py-3 font-medium">Дата</th>
										<th className="text-left px-6 py-3 font-medium">Тип</th>
										<th className="text-right px-6 py-3 font-medium">Сумма</th>
										<th className="text-left px-6 py-3 font-medium">Статус</th>
									</tr>
								</thead>
								<tbody>
									{distributions.map((d: any) => (
										<tr
											key={d.id}
											className="border-b last:border-0 hover:bg-gray-50"
										>
											<td className="px-6 py-3.5 text-gray-500 text-xs">
												{fmtDate(d.distributionDate || d.createdAt)}
											</td>
											<td className="px-6 py-3.5">
												<span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
													{d.type === "dividend"
														? "Дивиденд"
														: d.type === "profit_share"
															? "Доля прибыли"
															: "Выплата"}
												</span>
											</td>
											<td className="px-6 py-3.5 text-right font-bold text-emerald-700">
												+{fmt(d.amount)} KGS
											</td>
											<td className="px-6 py-3.5">
												<span
													className={`text-xs px-2 py-0.5 rounded-full ${d.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
												>
													{d.status === "paid" ? "Выплачено" : "Ожидает"}
												</span>
											</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr className="bg-gray-50 border-t-2 font-bold">
										<td colSpan={2} className="px-6 py-3 text-gray-700">
											ИТОГО
										</td>
										<td className="px-6 py-3 text-right text-emerald-700">
											+{fmt(totalReceived)} KGS
										</td>
										<td className="px-6 py-3"></td>
									</tr>
								</tfoot>
							</table>
						</div>
					)}
				</div>

				<div className="text-center text-xs text-gray-400 py-4">
					BuildFlow — Портал владельца. Данные обновляются в реальном времени.
				</div>
			</div>
		</div>
	);
}
