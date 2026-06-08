import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Eye, FileText, Plus, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
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
import {
	Field,
	FormGrid,
	FormSection,
	MoneyInput,
	PageShell,
	Status,
	Tablo,
} from "@/components/am";
import { ContractStatusStepper } from "@/components/contract-status-stepper";
import { ContractTab } from "@/components/contract-tab";
import { ContractFileUpload } from "@/components/contract-file-upload";
import {
	AdminReconciliationAct,
	reconciliationFmtMoney,
} from "@/components/admin-reconciliation-act";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const CONTRACT_STATUS_OPTIONS = [
	{ value: "draft", label: "Черновик" },
	{ value: "review", label: "На утверждение" },
	{ value: "signed", label: "Подписан" },
	{ value: "completed", label: "Завершён" },
	{ value: "cancelled", label: "Расторгнут" },
] as const;

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
	hideReconciliation,
}: {
	contract: any;
	proj: any;
	statusMut: any;
	scheduleMut: any;
	onRefresh: () => void;
	hideReconciliation?: boolean;
}) {
	const [portalForm, setPortalForm] = useState({
		phone: "",
		email: "",
		firstName: "",
		lastName: "",
	});
	const [portalLoading, setPortalLoading] = useState(false);
	const [, navigate] = useLocation();

	const { data: reconciliationData } = useQuery({
		queryKey: ["contract-sales-reconciliation", contract.id],
		queryFn: () =>
			api
				.get(`/construction/contracts-sales/${contract.id}/reconciliation`)
				.then((r) => r.data),
		enabled: !hideReconciliation,
	});

	useEffect(() => {
		const parts = (contract.buyerName || "").trim().split(/\s+/);
		setPortalForm({
			phone: contract.buyerPhone || "",
			email: contract.buyerEmail || "",
			firstName: parts[0] || "",
			lastName: parts.slice(1).join(" ") || "",
		});
	}, [contract.id, contract.buyerName, contract.buyerEmail, contract.buyerPhone]);

	const reconciliation = reconciliationData?.reconciliation;
	const currency = contract.currency || "KGS";

	const createPortalAccount = async () => {
		if (!portalForm.phone || !portalForm.firstName || !portalForm.lastName) {
			toast.error("Заполните телефон, имя и фамилию");
			return;
		}
		setPortalLoading(true);
		try {
			await api.post("/portal/create-buyer-account", {
				buyerId: contract.buyerId || undefined,
				contractId: contract.id,
				buyerName: contract.buyerName || `${portalForm.firstName} ${portalForm.lastName}`.trim(),
				phone: portalForm.phone,
				email: portalForm.email || undefined,
				firstName: portalForm.firstName,
				lastName: portalForm.lastName,
			});
			toast.success("Доступ создан. Покупатель войдёт по номеру и SMS-коду.");
			onRefresh();
		} catch (err: unknown) {
			toast.error(getApiErrorMessage(err, "Не удалось создать доступ"));
		} finally {
			setPortalLoading(false);
		}
	};

	return (
		<div className="space-y-4 mt-4">
			<div className="grid gap-3 sm:grid-cols-2 text-sm">
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
			<div className="grid gap-2 sm:grid-cols-3 bg-gray-50 rounded-xl p-3 text-center text-sm">
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

			{!hideReconciliation && reconciliation && (
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
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="sm:col-span-2 flex flex-col">
							<Label className="leading-tight mb-1.5">Телефон *</Label>
							<Input
								className="mt-auto"
								type="tel"
								placeholder="+996 700 123 456"
								value={portalForm.phone}
								onChange={(e) =>
									setPortalForm((p) => ({ ...p, phone: e.target.value }))
								}
							/>
							<p className="text-[10px] text-gray-600 mt-1">Покупатель войдёт по этому номеру и SMS-коду</p>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Имя *</Label>
							<Input
								className="mt-auto"
								value={portalForm.firstName}
								onChange={(e) =>
									setPortalForm((p) => ({ ...p, firstName: e.target.value }))
								}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Фамилия *</Label>
							<Input
								className="mt-auto"
								value={portalForm.lastName}
								onChange={(e) =>
									setPortalForm((p) => ({ ...p, lastName: e.target.value }))
								}
							/>
						</div>
						<div className="sm:col-span-2 flex flex-col">
							<Label className="leading-tight mb-1.5">Email (необязательно)</Label>
							<Input
								className="mt-auto"
								type="email"
								value={portalForm.email}
								onChange={(e) =>
									setPortalForm((p) => ({ ...p, email: e.target.value }))
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
							{portalLoading ? "..." : "Создать доступ в портал"}
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
	const { user } = useAuth();
	const isSalesOnly = user?.role === "sales_manager";
	const urlSearch = useSearch();
	const urlParams = new URLSearchParams(urlSearch);
	const highlightFromUrl = urlParams.get("highlight");
	const statusFromUrl = urlParams.get("status");

	const [open, setOpen] = useState(false);
	const [detailId, setDetailId] = useState<number | null>(null);
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

	const filtered = useMemo(
		() =>
			contracts.filter(
				(c: any) => statusFilter === "all" || c.status === statusFilter,
			),
		[contracts, statusFilter],
	);

	const columns = useMemo<ColumnDef<any, unknown>[]>(
		() => [
			{
				id: "contractNumber",
				header: "№ договора",
				size: 120,
				accessorKey: "contractNumber",
				meta: { exportLabel: "№ договора", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-mono text-xs font-medium text-amber-600">
						{row.original.contractNumber}
					</span>
				),
			},
			{
				id: "buyer",
				header: "Покупатель",
				size: 180,
				accessorFn: (row: any) => row.buyerName || "",
				meta: { exportLabel: "Покупатель", pinned: "left" },
				cell: ({ row }) => (
					<div>
						<div className="font-medium text-gray-900">
							{row.original.buyerName || "—"}
						</div>
						{row.original.buyerPhone && (
							<div className="text-xs text-gray-600">
								{row.original.buyerPhone}
							</div>
						)}
					</div>
				),
			},
			{
				id: "project",
				header: "Проект",
				size: 140,
				accessorFn: (row: any) =>
					projects.find((p: any) => p.id === row.projectId)?.name || "—",
				meta: { exportLabel: "Проект" },
			},
			{
				id: "status",
				header: "Статус",
				size: 130,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => {
					return (
						<Status
							value={row.original.status}
							label={
								CONTRACT_STATUS_OPTIONS.find((o) => o.value === row.original.status)
									?.label
							}
							dot
						/>
					);
				},
			},
			{
				id: "totalAmount",
				header: "Сумма",
				size: 120,
				accessorFn: (row: any) => parseFloat(row.totalAmount || "0"),
				meta: { exportLabel: "Сумма", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-medium">
						{fmt(row.original.totalAmount)} {row.original.currency}
					</span>
				),
			},
			{
				id: "paidAmount",
				header: "Оплачено",
				size: 130,
				accessorFn: (row: any) => parseFloat(row.paidAmount || "0"),
				meta: { exportLabel: "Оплачено", align: "right" },
				cell: ({ row }) => {
					const c = row.original;
					const pct =
						c.totalAmount > 0
							? Math.round(
									(parseFloat(c.paidAmount || "0") /
										parseFloat(c.totalAmount)) *
										100,
								)
							: 0;
					return (
						<div className="text-right">
							<div className="font-mono font-medium text-emerald-600">
								{fmt(c.paidAmount)}
							</div>
							<div className="w-16 ml-auto mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
								<div
									className="h-full bg-emerald-400 rounded-full"
									style={{ width: `${pct}%` }}
								/>
							</div>
						</div>
					);
				},
			},
			{
				id: "remainingAmount",
				header: "Остаток",
				size: 110,
				accessorFn: (row: any) => parseFloat(row.remainingAmount || "0"),
				meta: { exportLabel: "Остаток", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-amber-600 font-medium">
						{fmt(row.original.remainingAmount)}
					</span>
				),
			},
			{
				accessorKey: "contractDate",
				header: "Дата",
				size: 100,
				meta: { exportLabel: "Дата" },
				cell: ({ row }) => (
					<span className="text-gray-600 text-xs">
						{row.original.contractDate}
					</span>
				),
			},
			{
				id: "__chevron",
				header: "",
				size: 40,
				enableSorting: false,
				cell: () => <ChevronRight className="w-4 h-4 text-gray-300" />,
			},
		],
		[projects],
	);

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
		<PageShell.List
			title="Договоры продажи"
			subtitle="Воронка сделок и договоры ДКП"
			primaryAction={
				<Button
					onClick={() => setOpen(true)}
					className="bg-am-brand hover:bg-am-brand-hover text-white h-10"
				>
					<Plus className="w-4 h-4 mr-2" /> Новый договор
				</Button>
			}
			kpis={
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{[
						{
							label: "Всего договоров",
							value: totalContracts,
							color: "text-am-text-strong",
						},
						{ label: "Подписанных", value: totalSold, color: "text-am-success" },
						{
							label: "Сумма договоров",
							value: `${fmt(totalAmount)} сом`,
							color: "text-am-info",
						},
						{
							label: "Получено",
							value: `${fmt(totalPaid)} сом`,
							color: "text-am-brand",
						},
					].map((stat) => (
						<div
							key={stat.label}
							className="bg-am-bg rounded-lg p-4 border border-am-border shadow-sm"
						>
							<div className="text-xs text-am-text-muted mb-1">{stat.label}</div>
							<div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
						</div>
					))}
				</div>
			}
			filters={
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
							className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
								statusFilter === f.id
									? "bg-am-brand text-white border-am-brand"
									: "bg-am-bg text-am-text border-am-border hover:bg-am-brand-surface"
							}`}
						>
							{f.label}
						</button>
					))}
				</div>
			}
		>
			<Tablo
				title="Договоры ДКП"
				meta={`${filtered.length} записей`}
				tableId="construction-contracts-sales"
				columns={columns}
				data={filtered}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по покупателю или №..."
				initialSorting={[{ id: "contractDate", desc: true }]}
				onRowClick={(c: any) => setDetailId(c.id)}
				rowClassName={(c: any) => {
					const isHighlight =
						highlightFromUrl && Number(highlightFromUrl) === c.id;
					return `cursor-pointer hover:bg-am-brand-surface/50 ${
						isHighlight ? "bg-am-brand-surface ring-1 ring-am-brand" : ""
					}`;
				}}
				emptyState={
					<div className="flex flex-col items-center gap-2 py-8 text-am-text-muted">
						<FileText className="w-10 h-10 opacity-30" />
						<span>Нет договоров. Нажмите «Новый договор»</span>
					</div>
				}
			/>

			{/* Create Dialog */}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Новый договор продажи (ДКП)</DialogTitle>
						<DialogDescription className="sr-only">
							Форма создания договора купли-продажи
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-5 mt-2">
						<FormSection title="Объект">
							<Field label="Проект" required className="col-span-6">
								<Select
									value={form.projectId}
									onValueChange={(v) =>
										setForm((f) => ({ ...f, projectId: v, unitId: "" }))
									}
								>
									<SelectTrigger className="am-control w-full">
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
							</Field>
							<Field label="Квартира / помещение" className="col-span-6">
								<Select
									value={form.unitId}
									onValueChange={(v) => setForm((f) => ({ ...f, unitId: v }))}
								>
									<SelectTrigger className="am-control w-full">
										<SelectValue placeholder="Из шахматки" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Без привязки</SelectItem>
										{filteredUnits.map((u: any) => (
											<SelectItem key={u.id} value={String(u.id)}>
												Эт.{u.floor} №{u.unitNumber} ({u.area} м²)
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						</FormSection>

						<FormSection title="Покупатель">
							<Field label="ФИО / название" required className="col-span-6">
								<Input
									value={form.buyerName}
									onChange={(e) =>
										setForm((f) => ({ ...f, buyerName: e.target.value }))
									}
									className="am-control w-full"
									placeholder="Иванов Иван Иванович"
								/>
							</Field>
							<Field label="Телефон" className="col-span-6">
								<Input
									value={form.buyerPhone}
									onChange={(e) =>
										setForm((f) => ({ ...f, buyerPhone: e.target.value }))
									}
									className="am-control w-full"
									placeholder="+996 555 123456"
								/>
							</Field>
						</FormSection>

						<FormSection
							title="Финансовые условия"
							description="Суммы в выбранной валюте. Минимальная сумма договора — по условиям проекта."
						>
							<Field
								label="Сумма договора"
								required
								help="Полная стоимость по договору ДКП"
								className="col-span-4"
							>
								<MoneyInput
									value={form.totalAmount}
									onChange={(v) => setForm((f) => ({ ...f, totalAmount: v }))}
									currency={form.currency}
									onCurrencyChange={(c) => setForm((f) => ({ ...f, currency: c }))}
								/>
							</Field>
							<Field
								label="Первоначальный взнос"
								help="Сумма, внесённая при подписании"
								className="col-span-4"
							>
								<MoneyInput
									value={form.downPayment}
									onChange={(v) => setForm((f) => ({ ...f, downPayment: v }))}
									currency={form.currency}
								/>
							</Field>
							<Field label="Рассрочка" helper="Срок в месяцах" className="col-span-4">
								<Input
									type="number"
									min={1}
									value={form.installmentMonths}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											installmentMonths: e.target.value,
										}))
									}
									className="am-control w-full"
									placeholder="12"
								/>
							</Field>
							{form.totalAmount && (
								<div className="col-span-12 bg-am-brand-surface border border-am-border rounded-lg px-4 py-3">
									<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 text-center text-sm">
										<div>
											<p className="text-xs text-am-text-muted">Остаток</p>
											<p className="font-semibold text-am-brand tabular-nums">
												{fmt(remaining)} {form.currency === "KGS" ? "сом" : form.currency}
											</p>
										</div>
										<div>
											<p className="text-xs text-am-text-muted">В месяц</p>
											<p className="font-semibold text-am-info tabular-nums">
												{fmt(monthly)} {form.currency === "KGS" ? "сом" : form.currency}
											</p>
										</div>
										<div>
											<p className="text-xs text-am-text-muted">Платежей</p>
											<p className="font-semibold text-am-text-strong">
												{form.installmentMonths || "—"}
											</p>
										</div>
									</div>
								</div>
							)}
						</FormSection>

						<FormGrid>
							<Field label="Дата договора" className="col-span-6">
								<Input
									type="date"
									value={form.contractDate}
									onChange={(e) =>
										setForm((f) => ({ ...f, contractDate: e.target.value }))
									}
									className="am-control w-full"
								/>
							</Field>
							<Field label="Статус" className="col-span-6">
								<Select
									value={form.status}
									onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
								>
									<SelectTrigger className="am-control w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{CONTRACT_STATUS_OPTIONS.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field label="Примечание" className="col-span-12">
								<Textarea
									value={form.notes}
									onChange={(e) =>
										setForm((f) => ({ ...f, notes: e.target.value }))
									}
									className="am-control min-h-[80px] w-full resize-none"
									rows={2}
								/>
							</Field>
						</FormGrid>

						<div className="flex gap-2 pt-2 border-t border-am-border">
							<Button
								variant="outline"
								className="flex-1 h-10"
								onClick={() => {
									setOpen(false);
									resetForm();
								}}
							>
								Отмена
							</Button>
							<Button
								className="flex-1 h-10 bg-am-brand hover:bg-am-brand-hover text-white"
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
					return (
						<Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
							<DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
								<DialogHeader>
									<DialogTitle className="flex items-center gap-2">
										<span className="font-mono text-am-brand">
											{contract.contractNumber}
										</span>
										<Status
											value={contract.status}
											label={
												CONTRACT_STATUS_OPTIONS.find(
													(o) => o.value === contract.status,
												)?.label
											}
										/>
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
											hideReconciliation={isSalesOnly}
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
		</PageShell.List>
	);
}
