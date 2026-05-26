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
	ChevronDown,
	CreditCard,
	Plus,
	Receipt,
	TrendingUp,
	Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { RentalExcelTable, type RentalExcelColumn } from "@/components/rental/rental-excel-table";
import { RentalViewModeToggle } from "@/components/rental/rental-view-mode-toggle";
import { useRentalViewMode } from "@/hooks/use-rental-view-mode";
import { useSortable } from "@/lib/use-sortable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { RentalQueryState } from "@/components/rental/rental-query-state";
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

	const accountsArray = Array.isArray(accounts) ? accounts : [];

	useEffect(() => {
		if (!open) return;
		setFormData((prev) => ({
			...prev,
			accountId: prev.accountId || (accountsArray[0] ? String(accountsArray[0].id) : ""),
		}));
	}, [open, accountsArray]);

	// Load open accruals for selected contract
	const { data: openAccruals = [] } = useQuery<OpenAccrual[]>({
		queryKey: getAccrualsOpenQueryKey(formData.leaseContractId),
		queryFn: async () => {
			if (!formData.leaseContractId) return [];
			const all = await api.get("/rental/accruals").then((r) => r.data);
			const allArray = Array.isArray(all) ? all : [];
			return allArray
				.filter(
					(a: any) =>
						String(a.leaseContractId) === formData.leaseContractId &&
						parseFloat(a.balance) > 0,
				)
				.sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate));
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
				currency: formData.currency,
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
			if (!res.ok) throw new Error("Ошибка сохранения платежа");

			const result = await res.json();
			const allocCount = result.allocations?.length ?? 0;
			const unallocAmt = result.unallocated ?? 0;

			toast({
				title: "Платёж зарегистрирован",
				description: `${fmtCurrency(parseFloat(formData.amount))} · распределено по ${allocCount} начислениям${unallocAmt > 0 ? ` · нераспред.: ${fmtCurrency(unallocAmt)}` : ""}`,
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
					<div>
						<Label>Договор аренды *</Label>
						<Select
							value={formData.leaseContractId}
							onValueChange={(v) => {
								setFormData({ ...formData, leaseContractId: v });
								setManualAllocations({});
							}}
						>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите договор" />
							</SelectTrigger>
							<SelectContent>
								{(leases || []).map((l: any) => (
									<SelectItem key={l.id} value={String(l.id)}>
										{l.contractNumber} —{" "}
										{l.tenantName || `Арендатор #${l.tenantId}`}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

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

					<div className="grid grid-cols-3 gap-3">
						<div className="col-span-2">
							<Label>Сумма *</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.amount}
								onChange={(e) =>
									setFormData({ ...formData, amount: e.target.value })
								}
								placeholder="150000"
								required
								className="mt-1"
							/>
						</div>
						<div>
							<Label>Валюта</Label>
							<Select
								value={formData.currency}
								onValueChange={(v) => setFormData({ ...formData, currency: v })}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="KGS">Сом</SelectItem>
									<SelectItem value="USD">USD</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Дата платежа *</Label>
							<Input
								type="date"
								value={formData.paymentDate}
								onChange={(e) =>
									setFormData({ ...formData, paymentDate: e.target.value })
								}
								required
								className="mt-1"
							/>
						</div>
						<div>
							<Label>Способ оплаты</Label>
							<Select
								value={formData.paymentMethod}
								onValueChange={(v) =>
									setFormData({ ...formData, paymentMethod: v })
								}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="cash">Наличные</SelectItem>
									<SelectItem value="bank_transfer">
										Банковский перевод
									</SelectItem>
									<SelectItem value="card">Карта</SelectItem>
									<SelectItem value="online">Онлайн</SelectItem>
									<SelectItem value="other">Другое</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div>
						<Label>Расчётный счёт *</Label>
						<Select
							value={formData.accountId}
							onValueChange={(v) =>
								setFormData({ ...formData, accountId: v })
							}
						>
							<SelectTrigger className={`mt-1 ${!formData.accountId ? "border-rose-300" : ""}`}>
								<SelectValue placeholder="Выберите счёт *" />
							</SelectTrigger>
							<SelectContent>
								{(accounts as any[]).length === 0 ? (
									<SelectItem value="_empty" disabled>Нет счетов — создайте в Расчётных счетах</SelectItem>
								) : (
									(accounts as any[]).map((a: any) => (
										<SelectItem key={a.id} value={String(a.id)}>
											{a.name}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</div>

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
												<span className="text-gray-400 ml-2">
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

					<div>
						<Label>Примечание</Label>
						<Input
							value={formData.note}
							onChange={(e) =>
								setFormData({ ...formData, note: e.target.value })
							}
							placeholder="Оплата за апрель 2026"
							className="mt-1"
						/>
					</div>

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
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const [viewMode, setViewMode] = useRentalViewMode("payments");

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

	const toggleGroup = (key: string) => {
		setExpandedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
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
	const { sorted: sortedPayments, sortKey, sortDir, toggle } = useSortable(
		enrichedPayments,
		"paymentDate",
	);

	const grouped = useMemo(() => {
		const map = new Map<string, any[]>();
		for (const p of filteredPayments) {
			const key = leaseInfo[p.leaseContractId]?.projectName || "Без проекта";
			if (!map.has(key)) map.set(key, []);
			map.get(key)?.push(p);
		}
		return map;
	}, [filteredPayments, leaseInfo]);

	const paymentColumns: RentalExcelColumn<(typeof enrichedPayments)[number]>[] = useMemo(
		() => [
		{ key: "projectName", label: "Объект", width: 140, render: (r) => r.projectName },
		{ key: "contractLabel", label: "Договор", width: 180, render: (r) => r.contractLabel },
		{ key: "paymentDate", label: "Дата", width: 100, render: (r) => formatDate(r.paymentDate) },
		{ key: "amount", label: "Сумма", width: 120, align: "right", render: (r) => fmtCurrency(r.amount) },
		{
			key: "paymentMethod", label: "Способ", width: 110,
			render: (r) => r.paymentMethod ? methodLabels[r.paymentMethod] || r.paymentMethod : "—",
		},
		{ key: "note", label: "Примечание", width: 160, sortable: false, render: (r) => r.note || "—" },
		{
			key: "actions",
			label: "",
			width: 44,
			align: "center",
			sortable: false,
			resizable: false,
			render: (r) => (
				<button
					type="button"
					title="Отменить платёж"
					onClick={() => handleCancel(r)}
					className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
				>
					<Undo2 className="w-3.5 h-3.5" />
				</button>
			),
		},
	],
		[handleCancel],
	);

	return (
		<div className="space-y-3">
			<KpiRow>
				<KpiCard variant="strip" label="Платежей" value={filteredPayments.length} sub="за период" icon={Receipt} color="blue" loading={isLoading} />
				<KpiCard variant="strip" label="Получено" value={fmtCurrency(totalPaid)} sub="за период" icon={TrendingUp} color="green" loading={isLoading} />
				<KpiCard variant="strip" label="Объектов" value={new Set(enrichedPayments.map((p) => p.projectName)).size} sub="с платежами" icon={Building2} color="purple" loading={isLoading} />
				<KpiCard variant="strip" label="Средний платёж" value={filteredPayments.length ? fmtCurrency(totalPaid / filteredPayments.length) : "—"} sub="за период" icon={Banknote} color="yellow" loading={isLoading} />
			</KpiRow>

			<div className="flex justify-between items-start flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Платежи</h1>
					<p className="text-sm text-gray-500 mt-1">
						История поступивших платежей
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<RentalViewModeToggle mode={viewMode} onChange={setViewMode} />
					<Button onClick={() => setDialogOpen(true)}>
						<Plus className="w-4 h-4 mr-2" /> Зарегистрировать
					</Button>
				</div>
			</div>

			<div className="flex items-center justify-between flex-wrap gap-2">
				<PeriodPicker value={period} onChange={setPeriod} />
				<p className="text-xs text-gray-500">{sortedPayments.length} записей</p>
			</div>

			<RentalQueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
			{!filteredPayments.length ? (
				<div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
					<CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
					<p className="text-sm">Платежи не найдены</p>
				</div>
			) : viewMode === "report" ? (
				<RentalExcelTable
					columns={paymentColumns}
					rows={sortedPayments}
					sortKey={sortKey}
					sortDir={sortDir}
					onSort={toggle}
					emptyMessage="Платежи не найдены"
					rowKey={(r) => r.id}
					footer={[
						{ colSpan: 3, content: `Итого: ${filteredPayments.length}` },
						{ content: fmtCurrency(totalPaid), align: "right" },
						{ colSpan: 3, content: "" },
					]}
				/>
			) : (
				<div className="space-y-3">
					{Array.from(grouped.entries()).map(([projectName, rows]) => {
						const rowsArray = Array.isArray(rows) ? rows : [];
						const groupTotal = rowsArray.reduce(
							(s: number, p: any) => s + (parseFloat(p.amount) || 0),
							0,
						);
						const isExpanded = expandedGroups.has(projectName);
						return (
							<div
								key={projectName}
								className="bg-white rounded-xl border border-gray-200 overflow-hidden"
							>
								<button
									type="button"
									className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
									onClick={() => toggleGroup(projectName)}
								>
									<div className="flex items-center gap-2">
										<ChevronDown
											className={cn(
												"w-4 h-4 text-gray-400 transition-transform duration-200",
												!isExpanded && "-rotate-90",
											)}
										/>
										<Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
										<span className="font-semibold text-gray-800 text-sm">
											{projectName}
										</span>
										<span className="text-gray-400 text-xs">
											· {rowsArray.length} платежей
										</span>
									</div>
									<span className="text-sm font-bold text-emerald-600">
										{fmtCurrency(groupTotal)}
									</span>
								</button>

								{isExpanded && (
									<Table>
										<TableHeader>
											<TableRow className="bg-gray-50/50">
												<TableHead>Договор</TableHead>
												<TableHead>Дата</TableHead>
												<TableHead>Сумма</TableHead>
												<TableHead>Способ оплаты</TableHead>
												<TableHead>Примечание</TableHead>
												<TableHead className="text-center w-16"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{rowsArray.map((payment: any) => (
												<TableRow key={payment.id} className="hover:bg-gray-50">
													<TableCell className="text-sm text-gray-700">
														{leaseInfo[payment.leaseContractId]?.label ||
															`Договор #${payment.leaseContractId}`}
													</TableCell>
													<TableCell className="text-gray-600">
														{formatDate(payment.paymentDate)}
													</TableCell>
													<TableCell className="font-semibold text-emerald-600">
														{fmtCurrency(payment.amount)}
													</TableCell>
													<TableCell>
														<Badge variant="outline" className="text-xs">
															{payment.paymentMethod
																? methodLabels[payment.paymentMethod] ||
																	payment.paymentMethod
																: "—"}
														</Badge>
													</TableCell>
													<TableCell className="text-gray-500 text-sm">
														{payment.note || "—"}
													</TableCell>
													<TableCell className="text-center">
														<Button
															size="sm"
															variant="ghost"
															className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600"
															title="Отменить платёж"
															onClick={() => handleCancel(payment)}
														>
															<Undo2 className="w-3.5 h-3.5" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</div>
						);
					})}
				</div>
			)}
			</RentalQueryState>

			<PaymentDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
		</div>
	);
}
