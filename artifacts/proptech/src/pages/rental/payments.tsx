import { useQuery, useQueryClient } from "@tanstack/react-query";
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
	AlertCircle,
	Banknote,
	Building2,
	CreditCard,
	Plus,
	Receipt,
	TrendingUp,
	Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Field, FormGrid } from "@/components/am/Field";
import { MoneyInput } from "@/components/am/MoneyInput";
import { PageShell } from "@/components/am/PageShell";
import { Tablo } from "@/components/am/Tablo";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { RentalQueryState } from "@/components/rental/rental-query-state";
import { RentalPaymentFxNote } from "@/components/rental/rental-payment-fx-note";
import { fmtCurrencyAmount } from "@/lib/nbkr-currency";
import { api } from "@/lib/api";
import { getApiBase } from "@/lib/api-base";
import { cn } from "@/lib/utils";

const methodLabels: Record<string, string> = {
	cash: "Наличные",
	bank_transfer: "Перевод",
	card: "Карта",
	online: "Онлайн",
	other: "Другое",
};

function fmtCurrency(amount: number | string) {
	const num = typeof amount === "string" ? parseFloat(amount) : amount;
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(num);
}

function formatDate(date: string) {
	return new Date(date).toLocaleDateString("ru-KG");
}

const BASE = getApiBase();
const authHeaders = () => {
	const token = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
};

interface OpenAccrual {
	id: number;
	period: string;
	amount: string;
	balance: string;
	dueDate: string;
}

interface PaymentDialogProps {
	open: boolean;
	onClose: () => void;
}

function PaymentDialog({ open, onClose }: PaymentDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const { data: leases } = useQuery<any[]>({
		queryKey: getListLeaseContractsQueryKey(),
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});

	const { data: accounts = [] } = useQuery<any[]>({
		queryKey: getRentalAccountsQueryKey(),
		queryFn: () => api.get("/rental/accounts").then((r) => r.data),
	});

	const [formData, setFormData] = useState({
		leaseContractId: "",
		amount: "",
		currency: "KGS",
		paymentDate: new Date().toISOString().split("T")[0],
		paymentMethod: "bank_transfer",
		accountId: "",
		note: "",
	});

	const [allocationMode, setAllocationMode] = useState<"auto" | "manual">(
		"auto",
	);
	const [manualAllocations, setManualAllocations] = useState<
		Record<number, string>
	>({});
	const [loading, setLoading] = useState(false);

	const accountsArray = useMemo(
		() => (Array.isArray(accounts) ? accounts : []),
		[accounts],
	);
	const leasesArray = useMemo(
		() => (Array.isArray(leases) ? leases : []),
		[leases],
	);
	const defaultAccountId = accountsArray[0] ? String(accountsArray[0].id) : "";

	const selectedLease = leasesArray.find(
		(l) => String(l.id) === formData.leaseContractId,
	);
	const contractCurrency = (selectedLease?.currency || "KGS").toUpperCase();
	const selectedAccount = accountsArray.find(
		(a) => String(a.id) === formData.accountId,
	);
	const accountCurrency = (selectedAccount?.currency || "KGS").toUpperCase();

	useEffect(() => {
		if (!open || !defaultAccountId) return;
		setFormData((prev) => ({
			...prev,
			accountId: prev.accountId || defaultAccountId,
		}));
	}, [open, defaultAccountId]);

	// Load open accruals for selected contract
	const { data: openAccruals = [] } = useQuery<OpenAccrual[]>({
		queryKey: getAccrualsOpenQueryKey(formData.leaseContractId),
		queryFn: async () => {
			if (!formData.leaseContractId) return [];
			const rows = await api
				.get("/rental/accruals", {
					params: { leaseContractId: formData.leaseContractId },
				})
				.then((r) => r.data);
			const list = Array.isArray(rows) ? rows : [];
			return list
				.filter((a: OpenAccrual) => parseFloat(a.balance) > 0)
				.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
		},
		enabled: !!formData.leaseContractId,
	});

	const openAccrualsArray = Array.isArray(openAccruals) ? openAccruals : [];
	const totalOpen = openAccrualsArray.reduce(
		(s, a) => s + (parseFloat(a.balance) || 0),
		0,
	);
	const paymentAmount = parseFloat(formData.amount) || 0;

	const manualTotal = Object.values(manualAllocations).reduce(
		(s, v) => s + (parseFloat(v) || 0),
		0,
	);
	const unallocated = paymentAmount - manualTotal;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!formData.leaseContractId ||
			!formData.amount ||
			!formData.paymentDate
		) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		if (!formData.accountId) {
			toast({ title: "Выберите расчётный счёт", description: "Без счёта зарегистрировать платёж невозможно", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const body: any = {
				leaseContractId: parseInt(formData.leaseContractId, 10),
				amount: parseFloat(formData.amount),
				currency: contractCurrency,
				paymentDate: formData.paymentDate,
				paymentMethod: formData.paymentMethod,
				accountId: parseInt(formData.accountId, 10),
				note: formData.note || null,
			};

			if (
				allocationMode === "manual" &&
				Object.keys(manualAllocations).length > 0
			) {
				body.allocations = Object.entries(manualAllocations)
					.filter(([_, v]) => parseFloat(v) > 0)
					.map(([id, amount]) => ({
						accrualId: parseInt(id, 10),
						amount: parseFloat(amount),
					}));
			}

			const res = await fetch(`${BASE}/rental/payments`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Ошибка сохранения платежа");
			}

			const result = await res.json();
			const allocCount = result.allocations?.length ?? 0;
			const unallocAmt = result.unallocated ?? 0;
			const payAmt = parseFloat(formData.amount);
			const payLabel = fmtCurrencyAmount(
				payAmt,
				contractCurrency === "USD" ? "USD" : "KGS",
			);
			let desc = `${payLabel} · распределено по ${allocCount} начислениям`;
			if (unallocAmt > 0) {
				desc += ` · нераспред.: ${fmtCurrencyAmount(
					unallocAmt,
					contractCurrency === "USD" ? "USD" : "KGS",
				)}`;
			}
			if (
				result.accountAmount != null &&
				result.accountCurrency &&
				result.accountCurrency !== contractCurrency
			) {
				desc += ` · на счёт: ${fmtCurrencyAmount(
					Number(result.accountAmount),
					result.accountCurrency === "USD" ? "USD" : "KGS",
				)}`;
			}

			toast({
				title: "Платёж зарегистрирован",
				description: desc,
			});
			queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
			queryClient.invalidateQueries({ queryKey: getListAccrualsQueryKey() });
			queryClient.invalidateQueries({ queryKey: getRentalAccountsQueryKey() });
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CreditCard className="w-4 h-4 text-blue-600" /> Регистрация платежа
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<Field label="Договор аренды" required>
						<Select
							value={formData.leaseContractId}
							onValueChange={(v) => {
								const lease = leasesArray.find((l) => String(l.id) === v);
								setFormData({
									...formData,
									leaseContractId: v,
									currency: (lease?.currency || "KGS").toUpperCase(),
								});
								setManualAllocations({});
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Выберите договор" />
							</SelectTrigger>
							<SelectContent>
								{leasesArray.map((l: any) => (
									<SelectItem key={l.id} value={String(l.id)}>
										{l.contractNumber} —{" "}
										{l.tenantName || `Арендатор #${l.tenantId}`}
										{l.currency && l.currency !== "KGS"
											? ` · ${l.currency}`
											: ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					{openAccrualsArray.length > 0 && (
						<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
							<p className="text-xs font-semibold text-amber-700 mb-2">
								Открытые начисления: {openAccrualsArray.length} шт. · долг{" "}
								{fmtCurrency(totalOpen)}
							</p>
							<div className="space-y-1">
								{openAccrualsArray.slice(0, 3).map((a) => (
									<div
										key={a.id}
										className="flex items-center justify-between text-xs text-amber-800"
									>
										<span>{a.period}</span>
										<span className="font-semibold">
											{fmtCurrency(parseFloat(a.balance))}
										</span>
									</div>
								))}
								{openAccrualsArray.length > 3 && (
									<p className="text-xs text-amber-600">
										+ ещё {openAccrualsArray.length - 3} начислений
									</p>
								)}
							</div>
						</div>
					)}

					<FormGrid>
						<Field
							label={
								selectedLease
									? `Сумма платежа (${contractCurrency})`
									: "Сумма платежа"
							}
							required
							className="col-span-8"
						>
							<MoneyInput
								value={formData.amount}
								onChange={(v) => setFormData({ ...formData, amount: v })}
								currency={
									(contractCurrency === "USD" ? "USD" : "KGS") as
										| "KGS"
										| "USD"
								}
								placeholder={contractCurrency === "USD" ? "400" : "150 000"}
							/>
						</Field>
						<Field label="Дата платежа" required className="col-span-4">
							<Input
								type="date"
								className="am-control"
								value={formData.paymentDate}
								onChange={(e) =>
									setFormData({ ...formData, paymentDate: e.target.value })
								}
								required
							/>
						</Field>
						<Field label="Способ оплаты" className="col-span-6">
							<Select
								value={formData.paymentMethod}
								onValueChange={(v) =>
									setFormData({ ...formData, paymentMethod: v })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="cash">Наличные</SelectItem>
									<SelectItem value="bank_transfer">Банковский перевод</SelectItem>
									<SelectItem value="card">Карта</SelectItem>
									<SelectItem value="online">Онлайн</SelectItem>
									<SelectItem value="other">Другое</SelectItem>
								</SelectContent>
							</Select>
						</Field>
					</FormGrid>

					<Field label="Счёт зачисления (валюта счёта)" required>
						<Select
							value={formData.accountId}
							onValueChange={(v) =>
								setFormData({ ...formData, accountId: v })
							}
						>
							<SelectTrigger className={!formData.accountId ? "border-rose-300" : ""}>
								<SelectValue placeholder="Выберите счёт *" />
							</SelectTrigger>
							<SelectContent>
								{accountsArray.length === 0 ? (
									<SelectItem value="_empty" disabled>Нет счетов — создайте в Расчётных счетах</SelectItem>
								) : (
									accountsArray.map((a: any) => (
										<SelectItem key={a.id} value={String(a.id)}>
											{a.name} ({a.currency || "KGS"})
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</Field>

					{formData.leaseContractId && formData.accountId && paymentAmount > 0 && (
						<RentalPaymentFxNote
							paymentAmount={paymentAmount}
							paymentCurrency={contractCurrency}
							accountCurrency={accountCurrency}
							paymentDate={formData.paymentDate}
						/>
					)}

					{/* Allocation mode */}
					{openAccrualsArray.length > 0 && paymentAmount > 0 && (
						<div className="border border-gray-200 rounded-lg overflow-hidden">
							<div className="flex">
								<button
									type="button"
									onClick={() => setAllocationMode("auto")}
									className={cn(
										"flex-1 py-2 text-xs font-medium transition-colors",
										allocationMode === "auto"
											? "bg-blue-600 text-white"
											: "bg-gray-50 text-white hover:bg-gray-100",
									)}
								>
									Авто-аллокация
								</button>
								<button
									type="button"
									onClick={() => setAllocationMode("manual")}
									className={cn(
										"flex-1 py-2 text-xs font-medium transition-colors border-l border-gray-200",
										allocationMode === "manual"
											? "bg-blue-600 text-white"
											: "bg-gray-50 text-white hover:bg-gray-100",
									)}
								>
									Ручная аллокация
								</button>
							</div>

							{allocationMode === "auto" && (
								<div className="px-3 py-2.5 bg-blue-50">
									<p className="text-xs text-blue-700">
										Платёж {fmtCurrency(paymentAmount)} будет автоматически
										распределён по старейшим долгам
										{paymentAmount < totalOpen &&
											` (остаток ${fmtCurrency(totalOpen - paymentAmount)})`}
										{paymentAmount >= totalOpen && " — покроет весь долг"}
									</p>
								</div>
							)}

							{allocationMode === "manual" && (
								<div className="px-3 py-2.5 space-y-2">
									{openAccrualsArray.map((a) => (
										<div key={a.id} className="flex items-center gap-2">
											<div className="flex-1 text-xs">
												<span className="font-medium">{a.period}</span>
												<span className="text-gray-600 ml-2">
													до {fmtCurrency(parseFloat(a.balance))}
												</span>
											</div>
											<Input
												type="number"
												step="0.01"
												min="0"
												max={a.balance}
												className="w-28 h-7 text-xs"
												placeholder="0"
												value={manualAllocations[a.id] || ""}
												onChange={(e) =>
													setManualAllocations((prev) => ({
														...prev,
														[a.id]: e.target.value,
													}))
												}
											/>
										</div>
									))}
									<div className="flex items-center justify-between pt-1 border-t border-gray-200">
										<span className="text-xs text-gray-500">
											Нераспределено:
										</span>
										<span
											className={cn(
												"text-xs font-semibold",
												unallocated < 0
													? "text-rose-600"
													: unallocated > 0
														? "text-amber-600"
														: "text-emerald-600",
											)}
										>
											{fmtCurrency(unallocated)}
										</span>
									</div>
									{unallocated < 0 && (
										<div className="flex items-center gap-1.5 text-xs text-rose-600">
											<AlertCircle className="w-3.5 h-3.5" />
											<span>Сумма аллокаций превышает сумму платежа</span>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					<Field label="Примечание">
						<Input
							className="am-control"
							value={formData.note}
							onChange={(e) =>
								setFormData({ ...formData, note: e.target.value })
							}
							placeholder="Оплата за апрель 2026"
						/>
					</Field>

					<div className="flex justify-end gap-2 pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
							Отмена
						</Button>
						<Button
							type="submit"
							disabled={
								loading ||
								!formData.accountId ||
								(allocationMode === "manual" && unallocated < 0)
							}
						>
							{loading ? "Сохранение..." : "Зарегистрировать"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function Payments() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const handleCancel = async (payment: any) => {
		if (!confirm(`Отменить платёж ${fmtCurrency(payment.amount)} от ${formatDate(payment.paymentDate)}? Начисление будет восстановлено.`)) return;
		try {
			const res = await fetch(`${BASE}/rental/payments/${payment.id}`, {
				method: "DELETE",
				headers: authHeaders(),
			});
			if (!res.ok) throw new Error("Ошибка отмены платежа");
			toast({ title: "Платёж отменён", description: "Начисление восстановлено" });
			qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
			qc.invalidateQueries({ queryKey: getListAccrualsQueryKey() });
			qc.invalidateQueries({ queryKey: getRentalAccountsQueryKey() });
		} catch {
			toast({ title: "Ошибка", description: "Не удалось отменить платёж", variant: "destructive" });
		}
	};

	const { data: payments, isLoading, isError, error, refetch } = useQuery<any[]>({
		queryKey: getListPaymentsQueryKey(),
		queryFn: () => api.get("/rental/payments").then((r) => r.data),
	});

	const { data: leases } = useQuery<any[]>({
		queryKey: getListLeaseContractsQueryKey(),
		queryFn: () => api.get("/rental/contracts").then((r) => r.data),
	});

	// Map: leaseContractId → { contractNumber, tenantName, projectName }
	const leaseInfo = useMemo(() => {
		const leasesArray = Array.isArray(leases) ? leases : [];
		const map: Record<number, { label: string; projectName: string }> = {};
		for (const l of leasesArray) {
			map[l.id] = {
				label: `${l.contractNumber} — ${l.tenantName || ""}`.trim(),
				projectName: l.propertyProjectName || "Без проекта",
			};
		}
		return map;
	}, [leases]);

	const paymentsArray = Array.isArray(payments) ? payments : [];
	const filteredPayments = useMemo(
		() => paymentsArray.filter((p) => inPeriod(p.paymentDate, period)),
		[paymentsArray, period],
	);
	const totalPaid = filteredPayments.reduce(
		(s, p) => s + (parseFloat(p.amount) || 0),
		0,
	);

	// Group payments by project name
	const enrichedPayments = useMemo(
		() =>
			filteredPayments.map((p) => ({
				...p,
				projectName: leaseInfo[p.leaseContractId]?.projectName || "Без проекта",
				contractLabel:
					leaseInfo[p.leaseContractId]?.label || `Договор #${p.leaseContractId}`,
			})),
		[filteredPayments, leaseInfo],
	);
	type EnrichedPayment = (typeof enrichedPayments)[number];

	const tableColumns = useMemo<ColumnDef<EnrichedPayment, unknown>[]>(
		() => [
			{
				id: "projectName",
				header: "Объект",
				size: 140,
				accessorFn: (row) => row.projectName,
				meta: { exportLabel: "Объект", pinned: "left" },
				cell: ({ row }) => row.original.projectName,
			},
			{
				id: "contractLabel",
				header: "Договор",
				size: 280,
				minSize: 140,
				maxSize: 720,
				accessorFn: (row) => row.contractLabel,
				meta: { exportLabel: "Договор", grow: true },
				cell: ({ row }) => row.original.contractLabel,
			},
			{
				id: "paymentDate",
				header: "Дата",
				size: 110,
				accessorFn: (row) => row.paymentDate,
				meta: { exportLabel: "Дата", pinned: "left" },
				cell: ({ row }) => formatDate(row.original.paymentDate),
			},
			{
				id: "amount",
				header: "Сумма",
				size: 120,
				accessorFn: (row) => parseFloat(String(row.amount || "0")),
				meta: { exportLabel: "Сумма", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-semibold text-emerald-600">
						{fmtCurrency(row.original.amount)}
					</span>
				),
			},
			{
				id: "paymentMethod",
				header: "Способ",
				size: 120,
				accessorFn: (row) => row.paymentMethod || "",
				meta: { exportLabel: "Способ" },
				cell: ({ row }) =>
					row.original.paymentMethod ? (
						<Badge variant="outline" className="text-xs">
							{methodLabels[row.original.paymentMethod] || row.original.paymentMethod}
						</Badge>
					) : (
						"—"
					),
			},
			{
				id: "note",
				header: "Примечание",
				size: 160,
				accessorFn: (row) => row.note || "",
				meta: { exportLabel: "Примечание" },
				cell: ({ row }) => row.original.note || "—",
			},
			{
				id: "actions",
				header: "",
				size: 50,
				enableSorting: false,
				enableResizing: false,
				meta: { align: "center" },
				cell: ({ row }) => (
					<button
						type="button"
						title="Отменить платёж"
						onClick={() => handleCancel(row.original)}
						className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
					>
						<Undo2 className="w-3.5 h-3.5" />
					</button>
				),
			},
		],
		[handleCancel],
	);

	return (
		<PageShell.List
			title="Платежи"
			subtitle="История поступивших платежей"
			primaryAction={
				<Button onClick={() => setDialogOpen(true)} className="bg-am-brand hover:bg-am-brand-hover">
					<Plus className="w-4 h-4 mr-2" /> Зарегистрировать
				</Button>
			}
			kpis={
				<KpiRow>
					<KpiCard variant="strip" label="Платежей" value={filteredPayments.length} sub="за период" icon={Receipt} color="blue" loading={isLoading} />
					<KpiCard variant="strip" label="Получено" value={fmtCurrency(totalPaid)} sub="за период" icon={TrendingUp} color="green" loading={isLoading} />
					<KpiCard variant="strip" label="Объектов" value={new Set(enrichedPayments.map((p) => p.projectName)).size} sub="с платежами" icon={Building2} color="purple" loading={isLoading} />
					<KpiCard variant="strip" label="Средний платёж" value={filteredPayments.length ? fmtCurrency(totalPaid / filteredPayments.length) : "—"} sub="за период" icon={Banknote} color="yellow" loading={isLoading} />
				</KpiRow>
			}
			filters={
				<>
					<PeriodPicker value={period} onChange={setPeriod} />
					<p className="text-xs text-am-text-muted ml-auto">{enrichedPayments.length} записей</p>
				</>
			}
		>
			<RentalQueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
				<Tablo
					tableId="rental-payments"
					columns={tableColumns}
					data={enrichedPayments}
					isLoading={isLoading}
					enableSearch
					searchPlaceholder="Поиск по объекту, договору…"
					initialSorting={[{ id: "paymentDate", desc: true }]}
					meta={`${enrichedPayments.length} записей`}
					emptyState={
						<div className="flex flex-col items-center gap-2 py-8 text-am-text-muted">
							<CreditCard className="w-8 h-8 opacity-30" />
							<p className="text-sm">Платежи не найдены</p>
						</div>
					}
					footer={
						filteredPayments.length > 0 ? (
							<tr className="bg-am-surface font-semibold border-t border-am-border">
								<td colSpan={3} className="px-3 py-2 text-sm text-am-text-muted">
									Итого: {filteredPayments.length}
								</td>
								<td className="px-3 py-2 font-mono text-right text-emerald-700">
									{fmtCurrency(totalPaid)}
								</td>
								<td colSpan={3} />
							</tr>
						) : undefined
					}
				/>
			</RentalQueryState>

			<PaymentDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
		</PageShell.List>
	);
}
