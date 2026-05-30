import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	Building2,
	CheckCircle,
	CreditCard,
	FileText,
	LogOut,
	Printer,
	Share2,
	Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { shareAct } from "@/lib/share-act";

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
		<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
			<div
				className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
			>
				{icon}
			</div>
			<div className="min-w-0">
				<p className="text-xs text-gray-500 font-medium">{label}</p>
				<p className="text-base sm:text-xl font-bold text-gray-900 mt-0.5 break-words">{value}</p>
				{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
			</div>
		</div>
	);
}

export default function TenantPortal({ previewTenantId }: { previewTenantId?: number } = {}) {
	const { user, logout } = useAuth();
	const { toast } = useToast();
	const isPreview = !!previewTenantId;

	const { data, isLoading } = useQuery<any>({
		queryKey: isPreview
			? ["portal-tenant-preview", previewTenantId]
			: ["portal-tenant-me"],
		queryFn: () =>
			api
				.get(
					isPreview
						? `/portal/tenant/preview/${previewTenantId}`
						: "/portal/tenant/me",
				)
				.then((r) => r.data),
	});

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	const tenant = data?.tenant;
	const contractsData = data?.contracts ?? [];
	const paymentsData = data?.payments ?? [];
	const accrualsData = data?.accruals ?? [];

	const contracts = Array.isArray(contractsData) ? contractsData : [];
	const payments = Array.isArray(paymentsData) ? paymentsData : [];
	const accruals = Array.isArray(accrualsData) ? accrualsData : [];

	const totalPaid = payments.reduce(
		(s: number, p: any) => s + (parseFloat(p.amount || 0) || 0),
		0,
	);
	const totalCharged = accruals.reduce(
		(s: number, a: any) => s + (parseFloat(a.amount || 0) || 0),
		0,
	);
	const balance = totalCharged - totalPaid;
	const activeContracts = contracts.filter((c: any) => c.status === "active");

	const userName = isPreview
		? tenant?.fullName || tenant?.name || "Арендатор"
		: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Арендатор";

	const handleShare = async () => {
		let running = 0;
		const actLines = payments.map((p: any) => {
			const paid = parseFloat(p.amount || 0) || 0;
			running -= paid;
			return {
				date: fmtDate(p.paymentDate || p.createdAt),
				description: p.notes || "Аренда",
				amount: `+${fmt(paid)} KGS`,
				balance:
					running > 0 ? `-${fmt(running)} KGS` : `+${fmt(Math.abs(running))} KGS`,
			};
		});
		const res = await shareAct({
			title: "Акт сверки",
			subjectLabel: "Арендатор",
			subjectName: tenant?.fullName || tenant?.name || userName,
			currency: "KGS",
			summaryRows: [
				{ label: "Начислено", value: `${fmt(totalCharged)} KGS` },
				{ label: "Оплачено", value: `${fmt(totalPaid)} KGS` },
				{ label: "Задолженность", value: `${fmt(balance)} KGS` },
			],
			lines: actLines,
		});
		if (res === "whatsapp") {
			toast({ title: "Открываем WhatsApp с текстом акта" });
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Portal Header */}
			<header className="bg-white border-b border-gray-200 sticky top-0 z-40">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center">
							<Building2 className="w-5 h-5 text-white" />
						</div>
						<div>
							<p className="text-sm font-bold text-gray-900">BuildFlow</p>
							<p className="text-[10px] text-gray-400 -mt-0.5">
								Портал арендатора
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 sm:gap-3">
						{isPreview && (
							<span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-semibold">
								👁 Предпросмотр
							</span>
						)}
						<span className="hidden sm:inline text-sm text-gray-600 font-medium max-w-[40vw] truncate">
							{userName}
						</span>
						{!isPreview && (
							<Button
								variant="ghost"
								size="sm"
								onClick={logout}
								className="text-gray-500 gap-1.5"
							>
								<LogOut className="w-4 h-4" /> Выйти
							</Button>
						)}
					</div>
				</div>
			</header>

			<div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
				{/* Welcome */}
				<div className="bg-gradient-to-r from-teal-600 to-blue-600 rounded-2xl p-5 sm:p-6 text-white">
					<p className="text-sm opacity-80 mb-1">Добро пожаловать,</p>
					<h1 className="text-2xl font-bold">
						{tenant?.fullName || tenant?.name || userName}
					</h1>
					<p className="text-sm opacity-70 mt-1">Личный портал арендатора</p>
				</div>

				{/* KPIs */}
				<div className="grid grid-cols-2 gap-4">
					<KPI
						icon={<Building2 className="w-6 h-6 text-blue-600" />}
						label="Активных договоров"
						value={`${activeContracts.length}`}
						sub={`всего ${contracts.length}`}
						color="bg-blue-50"
					/>
					<KPI
						icon={<Wallet className="w-6 h-6 text-emerald-600" />}
						label="Оплачено"
						value={`${fmt(totalPaid)} KGS`}
						sub={`${payments.length} платежей`}
						color="bg-emerald-50"
					/>
					<KPI
						icon={<CreditCard className="w-6 h-6 text-amber-600" />}
						label="Начислено"
						value={`${fmt(totalCharged)} KGS`}
						sub="всего начислено"
						color="bg-amber-50"
					/>
					<KPI
						icon={
							balance > 0 ? (
								<AlertCircle className="w-6 h-6 text-rose-600" />
							) : (
								<CheckCircle className="w-6 h-6 text-emerald-600" />
							)
						}
						label="Задолженность"
						value={`${fmt(Math.abs(balance))} KGS`}
						sub={balance > 0 ? "долг" : balance < 0 ? "переплата" : "нет долга"}
						color={balance > 0 ? "bg-rose-50" : "bg-emerald-50"}
					/>
				</div>

				{/* Contracts */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b bg-gray-50">
						<FileText className="w-4 h-4 text-gray-500" />
						<h2 className="font-semibold text-gray-900">Мои договоры аренды</h2>
					</div>
					{contracts.length === 0 ? (
						<div className="py-12 text-center text-gray-400">
							<FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
							<p className="text-sm">Нет договоров</p>
						</div>
					) : (
						<div className="divide-y">
							{contracts.map((c: any) => (
								<div key={c.id} className="px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
									<div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
										<Building2 className="w-5 h-5 text-teal-600" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="font-semibold text-gray-900 truncate">
											{c.propertyName || "Объект"}
										</p>
										{c.contractNumber && (
											<p className="text-xs text-gray-400">
												Договор {c.contractNumber}
											</p>
										)}
										<p className="text-xs text-gray-400">
											{fmtDate(c.startDate)} —{" "}
											{c.endDate ? fmtDate(c.endDate) : "бессрочно"}
										</p>
									</div>
									<div className="text-right flex-shrink-0">
										<p className="text-sm font-bold text-teal-700">
											{fmt(c.rentAmount)} KGS/мес
										</p>
										<span
											className={`text-xs px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}
										>
											{c.status === "active" ? "Активный" : "Расторгнут"}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Payments reconciliation */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none">
					<div className="flex items-center justify-between gap-2 flex-wrap px-4 sm:px-6 py-4 border-b bg-gray-50">
						<div className="flex items-center gap-3">
							<CreditCard className="w-4 h-4 text-gray-500" />
							<h2 className="font-semibold text-gray-900">
								Акт сверки — История платежей
							</h2>
						</div>
						<div className="flex items-center gap-2 print:hidden">
							<Button
								variant="outline"
								size="sm"
								onClick={() => void handleShare()}
								className="gap-1.5 text-xs bg-[#25D366]/10 border-[#25D366]/30 text-[#128C7E] hover:bg-[#25D366]/20"
							>
								<Share2 className="w-3.5 h-3.5" /> Поделиться
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => window.print()}
								className="gap-1.5 text-xs"
							>
								<Printer className="w-3.5 h-3.5" /> Распечатать
							</Button>
						</div>
					</div>
					{payments.length === 0 ? (
						<div className="py-12 text-center text-gray-400">
							<CreditCard className="w-10 h-10 mx-auto mb-2 opacity-20" />
							<p className="text-sm">Нет платежей</p>
						</div>
					) : (
						<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-xs text-gray-500 border-b bg-gray-50/50">
									<th className="text-left px-3 sm:px-6 py-3 font-medium">Дата</th>
									<th className="text-left px-3 sm:px-6 py-3 font-medium">
										Назначение
									</th>
									<th className="text-right px-3 sm:px-6 py-3 font-medium">Сумма</th>
									<th className="text-right px-3 sm:px-6 py-3 font-medium">Баланс</th>
								</tr>
							</thead>
							<tbody>
								{(() => {
									let running = 0;
									return payments.map((p: any) => {
										const paid = parseFloat(p.amount || 0);
										running -= paid;
										return (
											<tr
												key={p.id}
												className="border-b last:border-0 hover:bg-gray-50"
											>
												<td className="px-3 sm:px-6 py-3.5 text-gray-500 text-xs whitespace-nowrap">
													{fmtDate(p.paymentDate || p.createdAt)}
												</td>
												<td className="px-3 sm:px-6 py-3.5 text-gray-700">
													{p.notes || "Аренда"}
												</td>
												<td className="px-3 sm:px-6 py-3.5 text-right font-medium text-emerald-700 whitespace-nowrap">
													+{fmt(paid)} KGS
												</td>
												<td
													className={`px-3 sm:px-6 py-3.5 text-right text-xs font-medium whitespace-nowrap ${running > 0 ? "text-rose-600" : "text-emerald-700"}`}
												>
													{running > 0
														? `-${fmt(running)}`
														: `+${fmt(Math.abs(running))}`}
												</td>
											</tr>
										);
									});
								})()}
							</tbody>
							<tfoot>
								<tr className="bg-gray-50 border-t-2 font-bold">
									<td colSpan={2} className="px-3 sm:px-6 py-3 text-gray-700">
										ИТОГО ОПЛАЧЕНО
									</td>
									<td className="px-3 sm:px-6 py-3 text-right text-emerald-700 whitespace-nowrap">
										+{fmt(totalPaid)} KGS
									</td>
									<td
										className={`px-3 sm:px-6 py-3 text-right whitespace-nowrap ${balance > 0 ? "text-rose-600" : "text-emerald-700"}`}
									>
										{balance > 0
											? `-${fmt(balance)}`
											: `+${fmt(Math.abs(balance))}`}
									</td>
								</tr>
							</tfoot>
						</table>
						</div>
					)}
				</div>

				<div className="text-center text-xs text-gray-400 py-4">
					BuildFlow — Портал арендатора. Данные обновляются в реальном времени.
				</div>
			</div>
		</div>
	);
}
