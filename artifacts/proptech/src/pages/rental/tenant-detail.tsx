import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	ArrowLeft,
	Building2,
	Check,
	CheckCircle,
	CreditCard,
	FileText,
	Mail,
	Phone,
	Printer,
	Send,
	User,
	UserPlus,
	Wallet,
	X,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { getListTenantsQueryKey, getListLeaseContractsQueryKey } from "@/lib/rental-query-keys";

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

function StatCard({
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
		<div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
			<div
				className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
			>
				{icon}
			</div>
			<div className="min-w-0">
				<p className="text-xs text-gray-500 font-medium">{label}</p>
				<p className="text-lg font-bold text-gray-900 mt-0.5 truncate">
					{value}
				</p>
				{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
			</div>
		</div>
	);
}

export default function TenantDetail() {
	const params = useParams<{ id: string }>();
	const [, navigate] = useLocation();
	const id = parseInt(params.id, 10);

	const { data: allTenants = [], isLoading } = useQuery<any[]>({
		queryKey: getListTenantsQueryKey(),
		queryFn: () => api.get("/rental/tenants").then((r) => r.data),
	});

	const { data: allContracts = [] } = useQuery<any[]>({
		queryKey: getListLeaseContractsQueryKey(),
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});

	const { data: allPayments = [] } = useQuery<any[]>({
		queryKey: ["rental-payments"],
		queryFn: () => api.get("/rental/payments").then((r) => r.data),
	});

	const { data: allAccruals = [] } = useQuery<any[]>({
		queryKey: ["rental-accruals"],
		queryFn: () => api.get("/rental/accruals").then((r) => r.data),
	});

	const tenant = allTenants.find((t: any) => t.id === id);
	const myContracts = allContracts.filter((c: any) => c.tenantId === id);
	const contractIds = myContracts.map((c: any) => c.id);
	const myAccruals = allAccruals.filter((a: any) =>
		contractIds.includes(a.leaseContractId),
	);
	const myPayments = allPayments.filter((p: any) =>
		contractIds.includes(p.leaseContractId),
	);

	const totalCharged = myAccruals.reduce(
		(s: number, a: any) => s + parseFloat(a.amount || 0),
		0,
	);
	const totalPaid = myPayments.reduce(
		(s: number, p: any) => s + parseFloat(p.amount || 0),
		0,
	);
	const balance = totalCharged - totalPaid;
	const activeContracts = myContracts.filter((c: any) => c.status === "active");

	const [showPortalDialog, setShowPortalDialog] = useState(false);
	const [portalForm, setPortalForm] = useState({
		phone: "",
		email: "",
		firstName: "",
		lastName: "",
	});
	const [portalStatus, setPortalStatus] = useState<{
		type: "success" | "error";
		msg: string;
	} | null>(null);
	const [portalLoading, setPortalLoading] = useState(false);

	async function createPortalAccount() {
		if (!portalForm.phone || !portalForm.firstName || !portalForm.lastName) {
			setPortalStatus({ type: "error", msg: "Заполните телефон, имя и фамилию" });
			return;
		}
		setPortalLoading(true);
		setPortalStatus(null);
		try {
			await api.post("/portal/create-tenant-account", {
				tenantId: id,
				phone: portalForm.phone,
				email: portalForm.email || undefined,
				firstName: portalForm.firstName,
				lastName: portalForm.lastName,
			});
			setPortalStatus({
				type: "success",
				msg: "Доступ создан. Арендатор войдёт по номеру и SMS-коду.",
			});
			setPortalForm({ phone: "", email: "", firstName: "", lastName: "" });
		} catch (e: any) {
			setPortalStatus({
				type: "error",
				msg: getApiErrorMessage(e, "Ошибка создания аккаунта"),
			});
		} finally {
			setPortalLoading(false);
		}
	}

	function handlePrint() {
		window.print();
	}

	if (isLoading)
		return (
			<div className="flex items-center justify-center h-64 text-gray-400">
				Загрузка...
			</div>
		);
	if (!tenant)
		return (
			<div className="flex items-center justify-center h-64 text-gray-400">
				Арендатор не найден
			</div>
		);

	return (
		<div className="p-6 max-w-5xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<button
					onClick={() => navigate("/rental/tenants")}
					className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
				>
					<ArrowLeft className="w-4 h-4 text-gray-600" />
				</button>
				<div className="flex-1">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 bg-teal-600 rounded-xl flex items-center justify-center text-white text-base font-bold">
							{(tenant.fullName || tenant.name || "А").charAt(0)}
						</div>
						<div>
							<h1 className="text-xl font-bold text-gray-900">
								{tenant.fullName || tenant.name}
							</h1>
							<div className="flex items-center gap-2 mt-0.5">
								<Badge
									className={
										tenant.status === "active"
											? "bg-emerald-100 text-emerald-700 border-emerald-200"
											: "bg-gray-100 text-gray-700"
									}
								>
									{tenant.status === "active" ? "Активный" : "Неактивный"}
								</Badge>
								<span className="text-xs text-gray-400">Арендатор</span>
							</div>
						</div>
					</div>
				</div>
				<div className="flex gap-2">
					<Button
						onClick={() => {
							setShowPortalDialog(true);
							setPortalStatus(null);
						}}
						variant="outline"
						size="sm"
						className="gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50"
					>
						<UserPlus className="w-4 h-4" /> Создать доступ
					</Button>
					<Button
						onClick={handlePrint}
						variant="outline"
						size="sm"
						className="gap-1.5"
					>
						<Printer className="w-4 h-4" /> Акт сверки
					</Button>
				</div>
			</div>

			{/* Portal account dialog */}
			{showPortalDialog && (
				<div className="fixed inset-0 bg-slate-950/50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
						<div className="flex items-center justify-between px-6 py-4 border-b">
							<div className="flex items-center gap-3">
								<div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
									<UserPlus className="w-5 h-5 text-teal-600" />
								</div>
								<div>
									<h2 className="font-bold text-gray-900">
										Создать доступ к порталу
									</h2>
									<p className="text-xs text-gray-500">
										{tenant.fullName || tenant.name}
									</p>
								</div>
							</div>
							<button
								onClick={() => setShowPortalDialog(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="px-6 py-4 space-y-3">
							<p className="text-sm text-gray-500">
								Арендатор получит отдельный логин для просмотра своих договоров
								и платежей.
							</p>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-xs font-medium text-gray-700 mb-1 block">
										Имя
									</label>
									<Input
										value={portalForm.firstName}
										onChange={(e) =>
											setPortalForm((p) => ({
												...p,
												firstName: e.target.value,
											}))
										}
										placeholder="Иван"
									/>
								</div>
								<div>
									<label className="text-xs font-medium text-gray-700 mb-1 block">
										Фамилия
									</label>
									<Input
										value={portalForm.lastName}
										onChange={(e) =>
											setPortalForm((p) => ({ ...p, lastName: e.target.value }))
										}
										placeholder="Петров"
									/>
								</div>
							</div>
							<div>
								<label className="text-xs font-medium text-gray-700 mb-1 block">
									Телефон (вход по SMS-коду) *
								</label>
								<Input
									type="tel"
									value={portalForm.phone}
									onChange={(e) =>
										setPortalForm((p) => ({ ...p, phone: e.target.value }))
									}
									placeholder="+996 700 123 456"
								/>
							</div>
							<div>
								<label className="text-xs font-medium text-gray-700 mb-1 block">
									Email (необязательно)
								</label>
								<Input
									type="email"
									value={portalForm.email}
									onChange={(e) =>
										setPortalForm((p) => ({ ...p, email: e.target.value }))
									}
									placeholder="tenant@email.com"
								/>
							</div>
							{portalStatus && (
								<div
									className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${portalStatus.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
								>
									{portalStatus.type === "success" ? (
										<Check className="w-4 h-4 flex-shrink-0" />
									) : (
										<X className="w-4 h-4 flex-shrink-0" />
									)}
									{portalStatus.msg}
								</div>
							)}
						</div>
						<div className="flex gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
							<Button
								variant="outline"
								onClick={() => setShowPortalDialog(false)}
								className="flex-1"
							>
								Отмена
							</Button>
							<Button
								onClick={createPortalAccount}
								disabled={portalLoading}
								className="flex-1 bg-teal-600 hover:bg-teal-700"
							>
								{portalLoading ? "Создание..." : "Создать аккаунт"}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Contact & info */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
					<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
						Контакты
					</h3>
					{tenant.phone && (
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
								<Phone className="w-3.5 h-3.5 text-emerald-600" />
							</div>
							<div>
								<p className="text-[10px] text-gray-400">Телефон</p>
								<p className="text-sm font-medium text-gray-900">
									{tenant.phone}
								</p>
							</div>
						</div>
					)}
					{tenant.email && (
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
								<Mail className="w-3.5 h-3.5 text-blue-600" />
							</div>
							<div>
								<p className="text-[10px] text-gray-400">Email</p>
								<p className="text-sm font-medium text-gray-900">
									{tenant.email}
								</p>
							</div>
						</div>
					)}
					{tenant.telegramId && (
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
								<Send className="w-3.5 h-3.5 text-sky-500" />
							</div>
							<div>
								<p className="text-[10px] text-gray-400">Telegram</p>
								<p className="text-sm font-medium text-gray-900">
									@{tenant.telegramId}
								</p>
							</div>
						</div>
					)}
					{tenant.iin && (
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
								<User className="w-3.5 h-3.5 text-gray-500" />
							</div>
							<div>
								<p className="text-[10px] text-gray-400">ИИН</p>
								<p className="text-sm font-medium text-gray-900">
									{tenant.iin}
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Stats */}
				<div className="lg:col-span-2 grid grid-cols-2 gap-3">
					<StatCard
						icon={<Building2 className="w-5 h-5 text-blue-600" />}
						label="Активных договоров"
						value={`${activeContracts.length}`}
						sub={`всего ${myContracts.length}`}
						color="bg-blue-50"
					/>
					<StatCard
						icon={<Wallet className="w-5 h-5 text-emerald-600" />}
						label="Оплачено"
						value={`${fmt(totalPaid)} KGS`}
						sub={`${myPayments.length} платежей`}
						color="bg-emerald-50"
					/>
					<StatCard
						icon={<CreditCard className="w-5 h-5 text-amber-600" />}
						label="Начислено"
						value={`${fmt(totalCharged)} KGS`}
						sub="всего начислено"
						color="bg-amber-50"
					/>
					<StatCard
						icon={
							balance > 0 ? (
								<AlertCircle className="w-5 h-5 text-rose-600" />
							) : (
								<CheckCircle className="w-5 h-5 text-emerald-600" />
							)
						}
						label="Задолженность"
						value={`${fmt(Math.abs(balance))} KGS`}
						sub={
							balance > 0
								? "долг арендатора"
								: balance < 0
									? "переплата"
									: "нет долга"
						}
						color={balance > 0 ? "bg-rose-50" : "bg-emerald-50"}
					/>
				</div>
			</div>

			{/* Contracts */}
			<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
				<div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-b">
					<FileText className="w-4 h-4 text-gray-500" />
					<h2 className="text-sm font-semibold text-gray-900">
						Договоры аренды
					</h2>
					<span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
						{myContracts.length}
					</span>
				</div>
				{myContracts.length === 0 ? (
					<div className="text-center py-10 text-gray-400 text-sm">
						Нет договоров
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-xs text-gray-500 border-b bg-gray-50/50">
									<th className="text-left px-5 py-2.5 font-medium">Объект</th>
									<th className="text-right px-5 py-2.5 font-medium">
										Аренда / мес
									</th>
									<th className="text-left px-5 py-2.5 font-medium">Период</th>
									<th className="text-left px-5 py-2.5 font-medium">Статус</th>
								</tr>
							</thead>
							<tbody>
								{myContracts.map((c: any) => (
									<tr
										key={c.id}
										className="border-b last:border-0 hover:bg-gray-50"
									>
										<td className="px-5 py-3">
											<div className="flex items-center gap-2">
												<div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center">
													<Building2 className="w-3.5 h-3.5 text-teal-600" />
												</div>
												<div>
													<p className="font-medium text-gray-900">
														{c.propertyName || c.propertyId || "—"}
													</p>
													{c.contractNumber && (
														<p className="text-xs text-gray-400">
															Дог. {c.contractNumber}
														</p>
													)}
												</div>
											</div>
										</td>
										<td className="px-5 py-3 text-right font-semibold">
											{fmt(c.rentAmount)} KGS
										</td>
										<td className="px-5 py-3 text-gray-500 text-xs">
											{fmtDate(c.startDate)} —{" "}
											{c.endDate ? fmtDate(c.endDate) : "бессрочно"}
										</td>
										<td className="px-5 py-3">
											<span
												className={`text-xs px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}
											>
												{c.status === "active"
													? "Активный"
													: c.status === "terminated"
														? "Расторгнут"
														: c.status}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Payments reconciliation act */}
			<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
				<div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-b">
					<CreditCard className="w-4 h-4 text-gray-500" />
					<h2 className="text-sm font-semibold text-gray-900">
						Акт сверки — История платежей
					</h2>
					<span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
						{myPayments.length}
					</span>
				</div>

				<div className="px-5 py-3 border-b bg-blue-50/40">
					<div className="flex items-center justify-between text-xs text-gray-500">
						<span>
							Арендатор:{" "}
							<span className="font-medium text-gray-700">
								{tenant.fullName || tenant.name}
							</span>
						</span>
						<span>Сформирован: {fmtDate(new Date().toISOString())}</span>
					</div>
				</div>

				{myPayments.length === 0 ? (
					<div className="text-center py-10 text-gray-400 text-sm">
						Нет платежей
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-xs text-gray-500 border-b bg-gray-50/50">
									<th className="text-left px-5 py-2.5 font-medium">Дата</th>
									<th className="text-left px-5 py-2.5 font-medium">
										Назначение
									</th>
									<th className="text-left px-5 py-2.5 font-medium">Способ</th>
									<th className="text-right px-5 py-2.5 font-medium">
										Начислено
									</th>
									<th className="text-right px-5 py-2.5 font-medium">
										Оплачено
									</th>
									<th className="text-right px-5 py-2.5 font-medium">Баланс</th>
								</tr>
							</thead>
							<tbody>
								{(() => {
									let running = 0;
									return myPayments.map((p: any) => {
										const paid = parseFloat(p.amount || 0);
										running -= paid;
										return (
											<tr
												key={p.id}
												className="border-b last:border-0 hover:bg-gray-50"
											>
												<td className="px-5 py-3 text-gray-500 text-xs">
													{fmtDate(p.paymentDate || p.createdAt)}
												</td>
												<td className="px-5 py-3 text-gray-700">
													{p.notes || p.paymentMethod || "Аренда"}
												</td>
												<td className="px-5 py-3">
													<span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
														{p.paymentMethod === "cash"
															? "Наличные"
															: p.paymentMethod === "bank"
																? "Банк"
																: p.paymentMethod || "—"}
													</span>
												</td>
												<td className="px-5 py-3 text-right text-gray-400">
													—
												</td>
												<td className="px-5 py-3 text-right font-medium text-emerald-700">
													+{fmt(paid)} KGS
												</td>
												<td
													className={`px-5 py-3 text-right font-medium text-xs ${running > 0 ? "text-rose-600" : "text-emerald-700"}`}
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
								<tr className="bg-gray-50 font-semibold border-t-2">
									<td colSpan={3} className="px-5 py-3 text-gray-700">
										ИТОГО
									</td>
									<td className="px-5 py-3 text-right text-gray-700">
										{fmt(totalCharged)} KGS
									</td>
									<td className="px-5 py-3 text-right text-emerald-700">
										+{fmt(totalPaid)} KGS
									</td>
									<td
										className={`px-5 py-3 text-right ${balance > 0 ? "text-rose-600" : "text-emerald-700"}`}
									>
										{balance > 0
											? `-${fmt(balance)}`
											: `+${fmt(Math.abs(balance))}`}{" "}
										KGS
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
