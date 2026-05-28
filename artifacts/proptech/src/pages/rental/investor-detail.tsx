import { useQuery } from "@tanstack/react-query";
import {
	getListAccrualsQueryKey,
	getListLeaseContractsQueryKey,
	getListPaymentsQueryKey,
	getListRentalPropertiesQueryKey,
	getListTenantsQueryKey,
	getRentalAccountsQueryKey,
	getDistributionsQueryKey,
	getRentalPaymentsAllQueryKey,
	getRentalExpensesAllQueryKey,
	getAccrualsOpenQueryKey,
} from "@/lib/rental-query-keys";
import {
	ArrowLeft,
	BadgeDollarSign,
	Building2,
	Check,
	FileText,
	Mail,
	Percent,
	Phone,
	Printer,
	Send,
	TrendingUp,
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

export default function InvestorDetail() {
	const params = useParams<{ id: string }>();
	const [, navigate] = useLocation();
	const id = parseInt(params.id, 10);

	const { data: investor, isLoading } = useQuery<any>({
		queryKey: ["investor", id],
		queryFn: () =>
			api
				.get(`/rental/investors/${id}`)
				.then((r) => r.data)
				.catch(() =>
					api
						.get("/rental/investors")
						.then((r) => r.data.find((inv: any) => inv.id === id)),
				),
	});

	const { data: allInvestments = [] } = useQuery<any[]>({
		queryKey: ["investments"],
		queryFn: () => api.get("/rental/investments").then((r) => r.data),
	});

	const { data: allDistributions = [] } = useQuery<any[]>({
		queryKey: getDistributionsQueryKey(),
		queryFn: () => api.get("/rental/distributions").then((r) => r.data),
	});

	const myInvestments = allInvestments.filter(
		(inv: any) => inv.investorId === id,
	);
	const myDistributions = allDistributions.filter(
		(d: any) => d.investorId === id,
	);

	const totalInvested = myInvestments.reduce(
		(s: number, inv: any) => s + parseFloat(inv.capitalInvested || 0),
		0,
	);
	const totalReceived = myDistributions.reduce(
		(s: number, d: any) => s + parseFloat(d.amount || 0),
		0,
	);
	const roi = totalInvested > 0 ? (totalReceived / totalInvested) * 100 : 0;

	const [showPortalDialog, setShowPortalDialog] = useState(false);
	const [portalForm, setPortalForm] = useState({
		email: "",
		firstName: "",
		lastName: "",
		password: "",
	});
	const [portalStatus, setPortalStatus] = useState<{
		type: "success" | "error";
		msg: string;
	} | null>(null);
	const [portalLoading, setPortalLoading] = useState(false);

	async function createPortalAccount() {
		if (
			!portalForm.email ||
			!portalForm.firstName ||
			!portalForm.lastName ||
			!portalForm.password
		) {
			setPortalStatus({ type: "error", msg: "Заполните все поля" });
			return;
		}
		setPortalLoading(true);
		setPortalStatus(null);
		try {
			await api.post("/portal/create-investor-account", {
				investorId: id,
				...portalForm,
			});
			setPortalStatus({
				type: "success",
				msg: "Аккаунт успешно создан. Инвестор может войти через portal.",
			});
			setPortalForm({ email: "", firstName: "", lastName: "", password: "" });
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
	if (!investor)
		return (
			<div className="flex items-center justify-center h-64 text-gray-400">
				Инвестор не найден
			</div>
		);

	return (
		<div className="p-6 max-w-5xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<button
					onClick={() => navigate("/rental/investors")}
					className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
				>
					<ArrowLeft className="w-4 h-4 text-gray-600" />
				</button>
				<div className="flex-1">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white text-base font-bold">
							{(investor.fullName || "И").charAt(0)}
						</div>
						<div>
							<h1 className="text-xl font-bold text-gray-900">
								{investor.fullName}
							</h1>
							<div className="flex items-center gap-2 mt-0.5">
								<Badge
									className={
										investor.status === "active"
											? "bg-emerald-100 text-emerald-700 border-emerald-200"
											: "bg-gray-100 text-gray-700"
									}
								>
									{investor.status === "active" ? "Активный" : "Неактивный"}
								</Badge>
								<span className="text-xs text-gray-400">
									{investor.type === "company" ? "Юр. лицо" : "Физ. лицо"}
								</span>
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
						className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
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
								<div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
									<UserPlus className="w-5 h-5 text-blue-600" />
								</div>
								<div>
									<h2 className="font-bold text-gray-900">
										Создать доступ к порталу
									</h2>
									<p className="text-xs text-gray-500">{investor.fullName}</p>
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
								Инвестор получит отдельный логин для просмотра своих данных в
								портале.
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
									Email (логин)
								</label>
								<Input
									type="email"
									value={portalForm.email}
									onChange={(e) =>
										setPortalForm((p) => ({ ...p, email: e.target.value }))
									}
									placeholder="investor@email.com"
								/>
							</div>
							<div>
								<label className="text-xs font-medium text-gray-700 mb-1 block">
									Пароль
								</label>
								<Input
									type="password"
									value={portalForm.password}
									onChange={(e) =>
										setPortalForm((p) => ({ ...p, password: e.target.value }))
									}
									placeholder="Минимум 6 символов"
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
								className="flex-1 bg-blue-600 hover:bg-purple-700"
							>
								{portalLoading ? "Создание..." : "Создать аккаунт"}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Contact & info */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Contacts */}
				<div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
					<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
						Контакты
					</h3>
					{investor.phone && (
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
								<Phone className="w-3.5 h-3.5 text-emerald-600" />
							</div>
							<div>
								<p className="text-[10px] text-gray-400">Телефон</p>
								<p className="text-sm font-medium text-gray-900">
									{investor.phone}
								</p>
							</div>
						</div>
					)}
					{investor.email && (
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
								<Mail className="w-3.5 h-3.5 text-blue-600" />
							</div>
							<div>
								<p className="text-[10px] text-gray-400">Email</p>
								<p className="text-sm font-medium text-gray-900">
									{investor.email}
								</p>
							</div>
						</div>
					)}
					{investor.telegramId && (
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
								<Send className="w-3.5 h-3.5 text-sky-500" />
							</div>
							<div>
								<p className="text-[10px] text-gray-400">Telegram</p>
								<p className="text-sm font-medium text-gray-900">
									@{investor.telegramId}
								</p>
							</div>
						</div>
					)}
					{investor.iin && (
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
								<User className="w-3.5 h-3.5 text-gray-500" />
							</div>
							<div>
								<p className="text-[10px] text-gray-400">ИИН / БИН</p>
								<p className="text-sm font-medium text-gray-900">
									{investor.iin}
								</p>
							</div>
						</div>
					)}
					{investor.notes && (
						<div className="pt-2 border-t">
							<p className="text-[10px] text-gray-400 mb-1">Примечания</p>
							<p className="text-xs text-gray-600">{investor.notes}</p>
						</div>
					)}
				</div>

				{/* Stats */}
				<div className="lg:col-span-2 grid grid-cols-2 gap-3">
					<StatCard
						icon={<Wallet className="w-5 h-5 text-blue-600" />}
						label="Инвестировано"
						value={`${fmt(totalInvested)} KGS`}
						sub={`${myInvestments.length} объект(а)`}
						color="bg-blue-50"
					/>
					<StatCard
						icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
						label="Получено выплат"
						value={`${fmt(totalReceived)} KGS`}
						sub={`${myDistributions.length} транзакций`}
						color="bg-emerald-50"
					/>
					<StatCard
						icon={<Percent className="w-5 h-5 text-blue-600" />}
						label="Средняя доля"
						value={
							myInvestments.length > 0
								? `${(myInvestments.reduce((s: number, i: any) => s + parseFloat(i.sharePercent || 0), 0) / myInvestments.length).toFixed(1)}%`
								: "0%"
						}
						sub="по всем объектам"
						color="bg-blue-50"
					/>
					<StatCard
						icon={<BadgeDollarSign className="w-5 h-5 text-amber-600" />}
						label="ROI"
						value={`${roi.toFixed(1)}%`}
						sub="возврат на инвестиции"
						color="bg-amber-50"
					/>
				</div>
			</div>

			{/* Investments */}
			<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
				<div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-b">
					<Building2 className="w-4 h-4 text-gray-500" />
					<h2 className="text-sm font-semibold text-gray-900">
						Объекты инвестирования
					</h2>
					<span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
						{myInvestments.length}
					</span>
				</div>
				{myInvestments.length === 0 ? (
					<div className="text-center py-10 text-gray-400 text-sm">
						Нет связанных объектов
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-xs text-gray-500 border-b bg-gray-50/50">
									<th className="text-left px-5 py-2.5 font-medium">Объект</th>
									<th className="text-right px-5 py-2.5 font-medium">
										Доля, %
									</th>
									<th className="text-right px-5 py-2.5 font-medium">
										Инвестировано
									</th>
									<th className="text-right px-5 py-2.5 font-medium">Дата</th>
								</tr>
							</thead>
							<tbody>
								{myInvestments.map((inv: any) => (
									<tr
										key={inv.id}
										className="border-b last:border-0 hover:bg-gray-50"
									>
										<td className="px-5 py-3">
											<div className="flex items-center gap-2">
												<div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
													<Building2 className="w-3.5 h-3.5 text-blue-600" />
												</div>
												<div>
													<p className="font-medium text-gray-900">
														{inv.propertyName || "—"}
													</p>
													{inv.propertyUnit && (
														<p className="text-xs text-gray-400">
															Ед. {inv.propertyUnit}
														</p>
													)}
												</div>
											</div>
										</td>
										<td className="px-5 py-3 text-right font-semibold text-blue-700">
											{parseFloat(inv.sharePercent || 0).toFixed(1)}%
										</td>
										<td className="px-5 py-3 text-right font-semibold">
											{fmt(inv.capitalInvested)} {inv.currency || "KGS"}
										</td>
										<td className="px-5 py-3 text-right text-gray-500">
											{fmtDate(inv.investedAt || inv.createdAt)}
										</td>
									</tr>
								))}
							</tbody>
							<tfoot>
								<tr className="bg-gray-50 font-semibold border-t">
									<td className="px-5 py-2.5 text-gray-700">Итого</td>
									<td className="px-5 py-2.5 text-right text-gray-700">—</td>
									<td className="px-5 py-2.5 text-right text-gray-900">
										{fmt(totalInvested)} KGS
									</td>
									<td className="px-5 py-2.5"></td>
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</div>

			{/* Distributions / Reconciliation */}
			<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
				<div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-b">
					<FileText className="w-4 h-4 text-gray-500" />
					<h2 className="text-sm font-semibold text-gray-900">
						Акт сверки — Выплаты владельцу
					</h2>
					<span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
						{myDistributions.length}
					</span>
				</div>

				{/* Reconciliation act header (printable) */}
				<div className="px-5 py-3 border-b bg-blue-50/40">
					<div className="flex items-center justify-between text-xs text-gray-500">
						<span>Период: все время</span>
						<span>Сформирован: {fmtDate(new Date().toISOString())}</span>
					</div>
				</div>

				{myDistributions.length === 0 ? (
					<div className="text-center py-10 text-gray-400 text-sm">
						Нет выплат
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-xs text-gray-500 border-b bg-gray-50/50">
									<th className="text-left px-5 py-2.5 font-medium">Дата</th>
									<th className="text-left px-5 py-2.5 font-medium">Объект</th>
									<th className="text-left px-5 py-2.5 font-medium">Тип</th>
									<th className="text-right px-5 py-2.5 font-medium">Сумма</th>
									<th className="text-left px-5 py-2.5 font-medium">Статус</th>
								</tr>
							</thead>
							<tbody>
								{myDistributions.map((d: any, _i: number) => (
									<tr
										key={d.id}
										className="border-b last:border-0 hover:bg-gray-50"
									>
										<td className="px-5 py-3 text-gray-500">
											{fmtDate(d.distributionDate || d.createdAt)}
										</td>
										<td className="px-5 py-3 text-gray-700">
											{d.propertyName || "—"}
										</td>
										<td className="px-5 py-3">
											<span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
												{d.type === "dividend"
													? "Дивиденд"
													: d.type === "profit_share"
														? "Доля прибыли"
														: d.type || "Выплата"}
											</span>
										</td>
										<td className="px-5 py-3 text-right font-semibold text-emerald-700">
											+{fmt(d.amount)} KGS
										</td>
										<td className="px-5 py-3">
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
								<tr className="bg-gray-50 font-semibold border-t-2">
									<td colSpan={3} className="px-5 py-3 text-gray-700">
										ИТОГО ВЫПЛАТ
									</td>
									<td className="px-5 py-3 text-right text-emerald-700 text-base">
										+{fmt(totalReceived)} KGS
									</td>
									<td className="px-5 py-3"></td>
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
