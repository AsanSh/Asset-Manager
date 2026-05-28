import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Eye, FileText, Plus, Search, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContractStatusStepper } from "@/components/contract-status-stepper";
import { ContractTab } from "@/components/contract-tab";
import { ContractFileUpload } from "@/components/contract-file-upload";
import {
	AdminReconciliationAct,
	reconciliationFmtMoney,
} from "@/components/admin-reconciliation-act";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
	draft: {
		label: "Черновик",
		color: "bg-gray-100 text-gray-600 border-gray-200",
	},
	review: {
		label: "На утверждение",
		color: "bg-amber-100 text-amber-700 border-amber-200",
	},
	signed: {
		label: "Подписан",
		color: "bg-emerald-100 text-emerald-700 border-emerald-200",
	},
	cancelled: {
		label: "Расторгнут",
		color: "bg-rose-100 text-rose-700 border-rose-200",
	},
	completed: {
		label: "Завершён",
		color: "bg-blue-100 text-blue-700 border-blue-200",
	},
};

function fmt(n: any) {
	const v = parseFloat(n);
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

function ContractDetailSummary({
	contract,
	proj,
	statusMut,
	scheduleMut,
	onRefresh,
}: {
	contract: any;
	proj: any;
	statusMut: any;
	scheduleMut: any;
	onRefresh: () => void;
}) {
	const [portalForm, setPortalForm] = useState({
		email: "",
		firstName: "",
		lastName: "",
		password: "",
	});
	const [portalLoading, setPortalLoading] = useState(false);
	const [, navigate] = useLocation();

	const { data: reconciliationData } = useQuery({
		queryKey: ["contract-sales-reconciliation", contract.id],
		queryFn: () =>
			api
				.get(`/construction/contracts-sales/${contract.id}/reconciliation`)
				.then((r) => r.data),
	});

	useEffect(() => {
		const parts = (contract.buyerName || "").trim().split(/\s+/);
		setPortalForm({
			email: contract.buyerEmail || "",
			firstName: parts[0] || "",
			lastName: parts.slice(1).join(" ") || "",
			password: "",
		});
	}, [contract.id, contract.buyerName, contract.buyerEmail]);

	const reconciliation = reconciliationData?.reconciliation;
	const currency = contract.currency || "KGS";

	const createPortalAccount = async () => {
		if (
			!portalForm.email ||
			!portalForm.firstName ||
			!portalForm.lastName ||
			!portalForm.password
		) {
			toast.error("Заполните все поля портала");
			return;
		}
		setPortalLoading(true);
		try {
			const { data: resp } = await api.post("/portal/create-buyer-account", {
				buyerId: contract.buyerId || undefined,
				contractId: contract.id,
				buyerName: contract.buyerName || `${portalForm.firstName} ${portalForm.lastName}`.trim(),
				phone: contract.buyerPhone || undefined,
				...portalForm,
			});
			if (resp?.emailSent) {
				toast.success(`Доступ создан · письмо отправлено на ${portalForm.email}`);
			} else {
				toast.success(
					`Доступ создан · ${resp?.emailError ? `письмо не отправлено (${resp.emailError})` : "письмо не отправлено"}`,
				);
			}
			onRefresh();
		} catch (err: unknown) {
			toast.error(getApiErrorMessage(err, "Не удалось создать доступ"));
		} finally {
			setPortalLoading(false);
		}
	};

	return (
		<div className="space-y-4 mt-4">
			<div className="grid grid-cols-2 gap-3 text-sm">
				<div>
					<span className="text-gray-500">Покупатель:</span>{" "}
					<span className="font-medium">{contract.buyerName}</span>
				</div>
				<div>
					<span className="text-gray-500">Телефон:</span>{" "}
					<span>{contract.buyerPhone || "—"}</span>
				</div>
				<div>
					<span className="text-gray-500">Проект:</span>{" "}
					<span>{proj?.name || "—"}</span>
				</div>
				<div>
					<span className="text-gray-500">Дата:</span>{" "}
					<span>{contract.contractDate}</span>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3 text-center text-sm">
				<div>
					<div className="text-xs text-gray-500">Сумма</div>
					<div className="font-bold">
						{fmt(contract.totalAmount)} {currency}
					</div>
				</div>
				<div>
					<div className="text-xs text-gray-500">Оплачено</div>
					<div className="font-bold text-emerald-600">{fmt(contract.paidAmount)}</div>
				</div>
				<div>
					<div className="text-xs text-gray-500">Остаток</div>
					<div className="font-bold text-amber-600">{fmt(contract.remainingAmount)}</div>
				</div>
			</div>
			<ContractStatusStepper
				status={contract.status}
				loading={statusMut.isPending}
				onStatusChange={(nextStatus: string) =>
					statusMut.mutate({ id: contract.id, status: nextStatus })
				}
			/>
			<div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
				<p className="text-xs text-blue-900">
					<strong>График платежей</strong> — отдельное действие после подписания:
					создаёт начисления в разделе «Начисления».
				</p>
				<Button
					className="w-full bg-blue-600 hover:bg-blue-700"
					onClick={() => scheduleMut.mutate(contract.id)}
					disabled={scheduleMut.isPending}
				>
					{scheduleMut.isPending ? "Генерация..." : "Сформировать график платежей"}
				</Button>
			</div>

			<ContractFileUpload
				entityType="buyer"
				entityId={contract.id}
				contractDocument={contract.contractDocument}
				onUploaded={onRefresh}
				portalPrompt={
					contract.buyerId
						? {
								entityType: "buyer",
								entityId: contract.buyerId,
								entityName: contract.buyerName,
								defaultEmail: portalForm.email,
							}
						: undefined
				}
			/>

			{reconciliation && (
				<AdminReconciliationAct
					mode="buyer"
					subjectLabel="Покупатель"
					subjectName={contract.buyerName || "—"}
					contractLabel={`Договор №${contract.contractNumber}`}
					currency={reconciliation.currency ?? currency}
					summary={[
						{
							label: "Договор",
							value: reconciliationFmtMoney(reconciliation.contractAmount, currency),
						},
						{
							label: "По графику",
							value: reconciliationFmtMoney(reconciliation.totalCharged, currency),
						},
						{
							label: "Оплачено",
							value: reconciliationFmtMoney(reconciliation.totalPaid, currency),
							tone: "emerald",
						},
						{
							label: "Остаток",
							value: reconciliationFmtMoney(reconciliation.outstanding, currency),
							tone: "amber",
						},
					]}
					lines={reconciliation.lines ?? []}
				/>
			)}

			<div className="border rounded-lg p-3 space-y-3">
					<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
						Доступ в портал покупателя
					</p>
					{!contract.buyerId && (
						<p className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
							ℹ️ При создании аккаунта покупатель будет автоматически добавлен в справочник контрагентов
						</p>
					)}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Email</Label>
							<Input
								className="mt-1"
								type="email"
								value={portalForm.email}
								onChange={(e) =>
									setPortalForm((p) => ({ ...p, email: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label>Пароль</Label>
							<Input
								className="mt-1"
								type="password"
								value={portalForm.password}
								onChange={(e) =>
									setPortalForm((p) => ({ ...p, password: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label>Имя</Label>
							<Input
								className="mt-1"
								value={portalForm.firstName}
								onChange={(e) =>
									setPortalForm((p) => ({ ...p, firstName: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label>Фамилия</Label>
							<Input
								className="mt-1"
								value={portalForm.lastName}
								onChange={(e) =>
									setPortalForm((p) => ({ ...p, lastName: e.target.value }))
								}
							/>
						</div>
					</div>
					<div className="flex gap-2 flex-wrap">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() => void createPortalAccount()}
							disabled={portalLoading}
						>
							<UserPlus className="w-4 h-4" />
							{portalLoading ? "..." : "Создать доступ + отправить email"}
						</Button>
						{contract.buyerId && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() => navigate(`/admin/portal/buyer/${contract.buyerId}`)}
							>
								<Eye className="w-4 h-4" />
								Глазами покупателя
							</Button>
						)}
					</div>
				</div>
		</div>
	);
}

export default function ConstructionContractsSales() {
	const qc = useQueryClient();
	const urlSearch = useSearch();
	const urlParams = new URLSearchParams(urlSearch);
	const highlightFromUrl = urlParams.get("highlight");
	const statusFromUrl = urlParams.get("status");

	const [open, setOpen] = useState(false);
	const [detailId, setDetailId] = useState<number | null>(null);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>(
		statusFromUrl || "all",
	);
	const [form, setForm] = useState({
		projectId: "",
		unitId: "",
		buyerName: "",
		buyerPhone: "",
		totalAmount: "",
		downPayment: "",
		installmentMonths: "12",
		currency: "KGS",
		exchangeRate: "1",
		contractDate: new Date().toISOString().slice(0, 10),
		notes: "",
		status: "draft",
	});

	const { data: contracts = [], isLoading } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});
	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: units = [] } = useQuery({
		queryKey: ["construction-units-all"],
		queryFn: () => api.get("/construction/units").then((r) => r.data),
	});

	const createMut = useMutation({
		mutationFn: (data: any) =>
			api.post("/construction/contracts-sales", data).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
			setOpen(false);
			toast.success("Договор создан");
			resetForm();
		},
		onError: () => toast.error("Ошибка создания договора"),
	});

	const statusMut = useMutation({
		mutationFn: ({ id, status }: { id: number; status: string }) =>
			api
				.patch(`/construction/contracts-sales/${id}`, { status })
				.then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
			qc.invalidateQueries({ queryKey: ["construction-units"] });
			qc.invalidateQueries({ queryKey: ["construction-units-overview"] });
			toast.success("Статус обновлён");
		},
		onError: (err: unknown) => {
			toast.error(getApiErrorMessage(err, "Не удалось изменить статус"));
		},
	});

	const scheduleMut = useMutation({
		mutationFn: (id: number) =>
			api
				.post(`/construction/contracts-sales/${id}/generate-schedule`, {})
				.then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["construction-accruals"] });
			toast.success("График платежей сформирован!");
		},
		onError: () => toast.error("Ошибка генерации графика"),
	});

	function resetForm() {
		setForm({
			projectId: "",
			unitId: "",
			buyerName: "",
			buyerPhone: "",
			totalAmount: "",
			downPayment: "",
			installmentMonths: "12",
			currency: "KGS",
			exchangeRate: "1",
			contractDate: new Date().toISOString().slice(0, 10),
			notes: "",
			status: "draft",
		});
	}

	const remaining = Math.max(
		0,
		parseFloat(form.totalAmount || "0") - parseFloat(form.downPayment || "0"),
	);
	const monthly = form.installmentMonths
		? remaining / parseFloat(form.installmentMonths)
		: 0;
	const filteredUnits = form.projectId
		? units.filter(
				(u: any) =>
					u.projectId === Number(form.projectId) && u.status === "available",
			)
		: [];
	useEffect(() => {
		if (highlightFromUrl) {
			setDetailId(Number(highlightFromUrl));
		}
		if (statusFromUrl) {
			setStatusFilter(statusFromUrl);
		}
	}, [highlightFromUrl, statusFromUrl]);

	const filtered = contracts.filter((c: any) => {
		if (statusFilter !== "all" && c.status !== statusFilter) return false;
		if (
			!search ||
			c.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
			c.contractNumber?.toLowerCase().includes(search.toLowerCase())
		) {
			return true;
		}
		return !search;
	});

	const totalContracts = contracts.length;
	const totalSold = contracts.filter(
		(c: any) => c.status === "signed" || c.status === "completed",
	).length;
	const totalAmount = contracts.reduce(
		(s: number, c: any) => s + parseFloat(c.totalAmount || "0"),
		0,
	);
	const totalPaid = contracts.reduce(
		(s: number, c: any) => s + parseFloat(c.paidAmount || "0"),
		0,
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Договоры продажи</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Воронка сделок и договоры ДКП
					</p>
				</div>
				<Button
					onClick={() => setOpen(true)}
					className="bg-amber-500 hover:bg-orange-600"
				>
					<Plus className="w-4 h-4 mr-2" /> Новый договор
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-4 gap-4 mb-6">
				{[
					{
						label: "Всего договоров",
						value: totalContracts,
						color: "text-gray-900",
					},
					{ label: "Подписанных", value: totalSold, color: "text-emerald-600" },
					{
						label: "Сумма договоров",
						value: `${fmt(totalAmount)} KGS`,
						color: "text-blue-600",
					},
					{
						label: "Получено",
						value: `${fmt(totalPaid)} KGS`,
						color: "text-amber-600",
					},
				].map((stat) => (
					<div
						key={stat.label}
						className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
					>
						<div className="text-xs text-gray-500 mb-1">{stat.label}</div>
						<div className={`text-xl font-bold ${stat.color}`}>
							{stat.value}
						</div>
					</div>
				))}
			</div>

			{/* Search + filter */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 p-3 flex flex-wrap gap-3 items-center">
				<div className="relative max-w-xs flex-1 min-w-[200px]">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<Input
						className="pl-9 h-8 text-sm"
						placeholder="Поиск по покупателю или №..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				<div className="flex gap-2 flex-wrap">
					{[
						{ id: "all", label: "Все" },
						{ id: "review", label: "На утверждение" },
						{ id: "signed", label: "Подписан" },
						{ id: "draft", label: "Черновик" },
					].map((f) => (
						<button
							key={f.id}
							type="button"
							onClick={() => setStatusFilter(f.id)}
							className={`px-3 py-1.5 rounded-full text-xs font-medium ${
								statusFilter === f.id
									? "bg-amber-500 text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							{f.label}
						</button>
					))}
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-gray-50 border-b border-gray-100">
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								№ договора
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								Покупатель
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								Проект
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								Статус
							</th>
							<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
								Сумма
							</th>
							<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
								Оплачено
							</th>
							<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
								Остаток
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
								Дата
							</th>
							<th className="px-4 py-3"></th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td colSpan={9} className="text-center py-12 text-gray-400">
									Загрузка...
								</td>
							</tr>
						) : filtered.length === 0 ? (
							<tr>
								<td colSpan={9} className="text-center py-12 text-gray-400">
									<FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
									Нет договоров. Нажмите «Новый договор»
								</td>
							</tr>
						) : (
							filtered.map((c: any) => {
								const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
								const proj = projects.find((p: any) => p.id === c.projectId);
								const pct =
									c.totalAmount > 0
										? Math.round(
												(parseFloat(c.paidAmount || "0") /
													parseFloat(c.totalAmount)) *
													100,
											)
										: 0;
								const isHighlight =
									highlightFromUrl && Number(highlightFromUrl) === c.id;
								return (
									<tr
										key={c.id}
										className={`border-b border-gray-50 hover:bg-amber-50/30 transition-colors cursor-pointer ${
											isHighlight ? "bg-amber-100/60 ring-1 ring-amber-400" : ""
										}`}
										onClick={() => setDetailId(c.id)}
									>
										<td className="px-4 py-3 font-mono text-xs font-medium text-amber-600">
											{c.contractNumber}
										</td>
										<td className="px-4 py-3">
											<div className="font-medium text-gray-900">
												{c.buyerName || "—"}
											</div>
											{c.buyerPhone && (
												<div className="text-xs text-gray-400">
													{c.buyerPhone}
												</div>
											)}
										</td>
										<td className="px-4 py-3 text-gray-600">
											{proj?.name || "—"}
										</td>
										<td className="px-4 py-3">
											<Badge
												variant="outline"
												className={`${sc.color} text-xs`}
											>
												{sc.label}
											</Badge>
										</td>
										<td className="px-4 py-3 text-right font-mono font-medium">
											{fmt(c.totalAmount)} {c.currency}
										</td>
										<td className="px-4 py-3 text-right">
											<div className="font-mono font-medium text-emerald-600">
												{fmt(c.paidAmount)}
											</div>
											<div className="w-16 ml-auto mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
												<div
													className="h-full bg-emerald-400 rounded-full"
													style={{ width: `${pct}%` }}
												/>
											</div>
										</td>
										<td className="px-4 py-3 text-right font-mono text-amber-600 font-medium">
											{fmt(c.remainingAmount)}
										</td>
										<td className="px-4 py-3 text-gray-400 text-xs">
											{c.contractDate}
										</td>
										<td className="px-4 py-3">
											<ChevronRight className="w-4 h-4 text-gray-300" />
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* Create Dialog */}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Новый договор продажи (ДКП)</DialogTitle>
						<DialogDescription className="sr-only">
							Форма создания договора купли-продажи
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 mt-2">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label className="text-xs">Проект *</Label>
								<Select
									value={form.projectId}
									onValueChange={(v) =>
										setForm((f) => ({ ...f, projectId: v, unitId: "" }))
									}
								>
									<SelectTrigger className="mt-1 h-8 text-sm">
										<SelectValue placeholder="Выберите проект" />
									</SelectTrigger>
									<SelectContent>
										{projects.map((p: any) => (
											<SelectItem key={p.id} value={String(p.id)}>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label className="text-xs">Квартира/помещение</Label>
								<Select
									value={form.unitId}
									onValueChange={(v) => setForm((f) => ({ ...f, unitId: v }))}
								>
									<SelectTrigger className="mt-1 h-8 text-sm">
										<SelectValue placeholder="Из шахматки" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Без привязки</SelectItem>
										{filteredUnits.map((u: any) => (
											<SelectItem key={u.id} value={String(u.id)}>
												Эт.{u.floor} №{u.unitNumber} ({u.area}м²)
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="border-t border-gray-100 pt-3">
							<div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
								Покупатель
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label className="text-xs">ФИО / Название *</Label>
									<Input
										value={form.buyerName}
										onChange={(e) =>
											setForm((f) => ({ ...f, buyerName: e.target.value }))
										}
										className="mt-1 h-8 text-sm"
										placeholder="Иванов Иван Иванович"
									/>
								</div>
								<div>
									<Label className="text-xs">Телефон</Label>
									<Input
										value={form.buyerPhone}
										onChange={(e) =>
											setForm((f) => ({ ...f, buyerPhone: e.target.value }))
										}
										className="mt-1 h-8 text-sm"
										placeholder="+996 XXX XXX XXX"
									/>
								</div>
							</div>
						</div>

						<div className="border-t border-gray-100 pt-3">
							<div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
								Финансовые условия
							</div>
							<div className="grid grid-cols-3 gap-3">
								<div>
									<Label className="text-xs">Сумма договора *</Label>
									<Input
										type="number"
										value={form.totalAmount}
										onChange={(e) =>
											setForm((f) => ({ ...f, totalAmount: e.target.value }))
										}
										className="mt-1 h-8 text-sm"
										placeholder="0"
									/>
								</div>
								<div>
									<Label className="text-xs">Первый взнос</Label>
									<Input
										type="number"
										value={form.downPayment}
										onChange={(e) =>
											setForm((f) => ({ ...f, downPayment: e.target.value }))
										}
										className="mt-1 h-8 text-sm"
										placeholder="0"
									/>
								</div>
								<div>
									<Label className="text-xs">Рассрочка (мес.)</Label>
									<Input
										type="number"
										value={form.installmentMonths}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												installmentMonths: e.target.value,
											}))
										}
										className="mt-1 h-8 text-sm"
										placeholder="12"
									/>
								</div>
							</div>
							{form.totalAmount && (
								<div className="mt-2 bg-amber-50 rounded-lg px-3 py-2 text-sm">
									<div className="grid grid-cols-3 gap-2 text-center">
										<div>
											<div className="text-xs text-gray-500">Остаток</div>
											<div className="font-bold text-amber-600">
												{fmt(remaining)}
											</div>
										</div>
										<div>
											<div className="text-xs text-gray-500">В месяц</div>
											<div className="font-bold text-blue-600">
												{fmt(monthly)}
											</div>
										</div>
										<div>
											<div className="text-xs text-gray-500">Валюта</div>
											<Select
												value={form.currency}
												onValueChange={(v) =>
													setForm((f) => ({ ...f, currency: v }))
												}
											>
												<SelectTrigger className="h-6 text-xs mt-0.5">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{["KGS", "USD", "EUR"].map((c) => (
														<SelectItem key={c} value={c}>
															{c}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
								</div>
							)}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label className="text-xs">Дата договора</Label>
								<Input
									type="date"
									value={form.contractDate}
									onChange={(e) =>
										setForm((f) => ({ ...f, contractDate: e.target.value }))
									}
									className="mt-1 h-8 text-sm"
								/>
							</div>
							<div>
								<Label className="text-xs">Статус</Label>
								<Select
									value={form.status}
									onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
								>
									<SelectTrigger className="mt-1 h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(STATUS_CONFIG).map(([k, v]) => (
											<SelectItem key={k} value={k}>
												{v.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div>
							<Label className="text-xs">Примечание</Label>
							<Textarea
								value={form.notes}
								onChange={(e) =>
									setForm((f) => ({ ...f, notes: e.target.value }))
								}
								className="mt-1 text-sm resize-none"
								rows={2}
							/>
						</div>

						<div className="flex gap-2 pt-2">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => {
									setOpen(false);
									resetForm();
								}}
							>
								Отмена
							</Button>
							<Button
								className="flex-1 bg-amber-500 hover:bg-orange-600"
								disabled={
									createMut.isPending ||
									!form.projectId ||
									!form.buyerName ||
									!form.totalAmount
								}
								onClick={() =>
									createMut.mutate({
										...form,
										projectId: Number(form.projectId),
										unitId:
											form.unitId && form.unitId !== "none"
												? Number(form.unitId)
												: null,
									})
								}
							>
								{createMut.isPending ? "Создание..." : "Создать договор"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Detail Dialog */}
			{detailId &&
				(() => {
					const contract = contracts.find((c: any) => c.id === detailId);
					if (!contract) return null;
					const proj = projects.find((p: any) => p.id === contract.projectId);
					const sc = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
					return (
						<Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
							<DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
								<DialogHeader>
									<DialogTitle className="flex items-center gap-2">
										<span className="font-mono text-amber-600">
											{contract.contractNumber}
										</span>
										<Badge variant="outline" className={`${sc.color} text-xs`}>
											{sc.label}
										</Badge>
									</DialogTitle>
									<DialogDescription className="sr-only">
										Карточка договора: сводка, этапы сделки и текст договора
									</DialogDescription>
								</DialogHeader>
								<Tabs defaultValue="summary">
									<TabsList>
										<TabsTrigger value="summary">Сводка</TabsTrigger>
										<TabsTrigger value="contract">Договор</TabsTrigger>
									</TabsList>
									<TabsContent value="summary">
										<ContractDetailSummary
											contract={contract}
											proj={proj}
											statusMut={statusMut}
											scheduleMut={scheduleMut}
											onRefresh={() => {
												qc.invalidateQueries({
													queryKey: ["construction-contracts-sales"],
												});
												qc.invalidateQueries({
													queryKey: [
														"contract-sales-reconciliation",
														contract.id,
													],
												});
											}}
										/>
									</TabsContent>
									<TabsContent value="contract" className="mt-4">
										<ContractTab
											salesContractId={contract.id}
											projectId={contract.projectId}
										/>
									</TabsContent>
								</Tabs>
							</DialogContent>
						</Dialog>
					);
				})()}
		</div>
	);
}
