import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	Banknote,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	DollarSign,
	Filter,
	ListOrdered,
	RotateCcw,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import {
	accrualPaymentPeriod,
	buildContractPeriodMap,
	PERIOD_LABELS,
	type PaymentPeriod,
} from "@/lib/accrual-period";
import {
	DATE_RANGE_LABELS,
	formatRangeLabel,
	isDueDateInRange,
	resolveDateRange,
	type DateRangeKey,
} from "@/lib/accrual-date-filter";
import { computePaymentAllocation } from "@/lib/payment-allocation";

const STATUS_CONFIG: Record<
	string,
	{ label: string; color: string; icon: React.ElementType }
> = {
	pending: {
		label: "Ожидает",
		color: "bg-gray-100 text-gray-600 border-gray-200",
		icon: Clock,
	},
	partial: {
		label: "Частично",
		color: "bg-amber-100 text-amber-700 border-amber-200",
		icon: DollarSign,
	},
	paid: {
		label: "Оплачен",
		color: "bg-emerald-100 text-emerald-700 border-emerald-200",
		icon: CheckCircle2,
	},
	overdue: {
		label: "Просрочен",
		color: "bg-rose-100 text-rose-700 border-rose-200",
		icon: AlertTriangle,
	},
};

type AccrualRow = {
	id: number;
	contractId: number;
	projectId?: number;
	installmentNumber: number;
	dueDate: string;
	amount: string;
	paidAmount: string;
	remainingAmount: string;
	status: string;
	currency: string;
	isOverdue?: boolean;
	buyerName?: string;
	buyerKey?: string;
	contractNumber?: string;
	paymentPeriod?: PaymentPeriod;
};

function fmt(n: any) {
	const v = parseFloat(n);
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(v);
}

function isOverdue(dueDate: string, status: string) {
	return status !== "paid" && new Date(dueDate) < new Date();
}

function remainingAmount(a: AccrualRow) {
	return (
		parseFloat(a.remainingAmount || "0") ||
		Math.max(
			0,
			parseFloat(a.amount || "0") - parseFloat(a.paidAmount || "0"),
		)
	);
}

function PaymentRow({
	a,
	contract,
	onPay,
	onCancel,
}: {
	a: AccrualRow;
	contract?: { contractNumber?: string; buyerName?: string };
	onPay: (row: AccrualRow) => void;
	onCancel: (row: AccrualRow) => void;
}) {
	const statusKey = a.isOverdue && a.status !== "paid" ? "overdue" : a.status;
	const sc = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
	const Icon = sc.icon;
	const pct =
		parseFloat(a.amount) > 0
			? Math.round(
					(parseFloat(a.paidAmount || "0") / parseFloat(a.amount)) * 100,
				)
			: 0;
	const hasPayment = parseFloat(a.paidAmount || "0") > 0;
	const canAccept = remainingAmount(a) > 0;

	return (
		<tr
			className={`border-b border-gray-50 hover:bg-gray-50/50 ${a.isOverdue && a.status !== "paid" ? "bg-rose-50/30" : ""}`}
		>
			<td className="px-4 py-3 text-gray-500 text-xs">{a.installmentNumber}</td>
			<td className="px-4 py-3">
				<div className="font-medium text-gray-900 text-xs font-mono">
					{contract?.contractNumber || a.contractNumber || `#${a.contractId}`}
				</div>
				<div className="text-xs text-gray-400">{a.buyerName || contract?.buyerName}</div>
			</td>
			<td className="px-4 py-3">
				<div
					className={
						a.isOverdue && a.status !== "paid"
							? "text-rose-600 font-medium"
							: "text-gray-600"
					}
				>
					{a.dueDate}
				</div>
				{a.paymentPeriod && (
					<div className="text-xs text-blue-600">
						{PERIOD_LABELS[a.paymentPeriod]}
					</div>
				)}
				{a.isOverdue && a.status !== "paid" && (
					<div className="text-xs text-rose-600">
						{Math.ceil(
							(Date.now() - new Date(a.dueDate).getTime()) / 86400000,
						)}{" "}
						дн. просрочки
					</div>
				)}
			</td>
			<td className="px-4 py-3">
				<Badge variant="outline" className={`${sc.color} text-xs`}>
					<Icon className="w-3 h-3 mr-1" />
					{sc.label}
				</Badge>
			</td>
			<td className="px-4 py-3 text-right font-mono font-medium">
				{fmt(a.amount)} {a.currency}
			</td>
			<td className="px-4 py-3 text-right">
				<div className="font-mono text-emerald-600">{fmt(a.paidAmount)}</div>
				<div className="w-16 ml-auto mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
					<div
						className="h-full bg-emerald-400 rounded-full"
						style={{ width: `${pct}%` }}
					/>
				</div>
			</td>
			<td className="px-4 py-3 text-right font-mono font-bold text-amber-600">
				{fmt(a.remainingAmount)}
			</td>
			<td className="px-4 py-3">
				<div className="flex flex-col gap-1 items-end">
					{canAccept && (
						<Button
							size="sm"
							variant="outline"
							className="h-7 text-xs"
							onClick={() => onPay(a)}
						>
							Оплачен
						</Button>
					)}
					{hasPayment && (
						<Button
							size="sm"
							variant="ghost"
							className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
							onClick={() => onCancel(a)}
						>
							<RotateCcw className="w-3 h-3 mr-1" />
							Отменить
						</Button>
					)}
				</div>
			</td>
		</tr>
	);
}

function AcceptPaymentDialog({
	accrual,
	contract,
	contractAccruals,
	accounts,
	open,
	onClose,
	onSuccess,
}: {
	accrual: AccrualRow | null;
	contract: { contractNumber?: string; buyerName?: string; projectId?: number; currency?: string } | null;
	contractAccruals: AccrualRow[];
	accounts: { id: number; name: string; currency: string }[];
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}) {
	const [amount, setAmount] = useState("");
	const [accountId, setAccountId] = useState("");
	const [paymentMethod, setPaymentMethod] = useState("cash");
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [notes, setNotes] = useState("");

	const balance = accrual ? remainingAmount(accrual) : 0;
	const payAmountNum = parseFloat(amount || "0") || 0;

	const allocationPreview = useMemo(() => {
		if (!accrual || payAmountNum <= 0) return null;
		return computePaymentAllocation(
			contractAccruals,
			accrual.id,
			payAmountNum,
		);
	}, [accrual, contractAccruals, payAmountNum]);

	useEffect(() => {
		if (accrual && open) {
			setAmount(String(remainingAmount(accrual)));
			setAccountId(accounts[0] ? String(accounts[0].id) : "");
			setPaymentMethod("cash");
			setDate(new Date().toISOString().slice(0, 10));
			setNotes("");
		}
	}, [accrual?.id, open, accounts]);

	const payMut = useMutation({
		mutationFn: async () => {
			if (!accrual) return;
			const payAmount = parseFloat(amount);
			if (!payAmount || payAmount <= 0) {
				throw new Error("Укажите сумму больше нуля");
			}
			if (!accountId) {
				throw new Error("Выберите счёт зачисления");
			}
			const { data } = await api.post<{
				allocations?: Array<{
					installmentNumber: number;
					applied: number;
					remainingAmount: number;
					status: string;
					dueDate: string;
				}>;
			}>("/construction/cashier/payment", {
				contractId: accrual.contractId,
				projectId: contract?.projectId ?? accrual.projectId,
				accrualId: accrual.id,
				amount: String(payAmount),
				currency: accrual.currency || contract?.currency || "KGS",
				accountId: Number(accountId),
				paymentMethod,
				date,
				notes:
					notes ||
					`Платёж №${accrual.installmentNumber} (начисления)`,
			});
			return data;
		},
		onSuccess: (data) => {
			const lines = data?.allocations || [];
			if (lines.length > 0) {
				const summary = lines
					.map((l) => {
						const month = l.dueDate?.slice(0, 7) || "";
						const st =
							l.status === "paid"
								? "оплачен"
								: `остаток ${fmt(l.remainingAmount)}`;
						return `№${l.installmentNumber} (${month}): ${st}`;
					})
					.join("; ");
				toast.success(`Платёж распределён: ${summary}`);
			} else {
				toast.success("Платёж принят");
			}
			onSuccess();
			onClose();
		},
		onError: (err: Error) => {
			toast.error(err.message || "Не удалось принять платёж");
		},
	});

	if (!accrual) return null;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Banknote className="w-4 h-4 text-emerald-600" />
						Принять платёж
					</DialogTitle>
					<DialogDescription>
						{contract?.contractNumber} · {contract?.buyerName}
						<br />
						Платёж №{accrual.installmentNumber} · остаток{" "}
						<strong>
							{fmt(balance)} {accrual.currency}
						</strong>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<Label>Сумма *</Label>
						<Input
							type="number"
							min="0.01"
							step="0.01"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							className="mt-1"
						/>
						<p className="text-xs text-gray-400 mt-1">
							Сумма распределится по графику: сначала выбранный платёж,
							затем следующие месяцы. Меньше суммы — частичная оплата и
							остаток (просрочка, если срок прошёл).
						</p>
						{allocationPreview && allocationPreview.lines.length > 0 && (
							<div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/80 p-2.5 text-xs space-y-1">
								<div className="font-semibold text-emerald-800">
									Распределение:
								</div>
								{allocationPreview.lines.map((line) => (
									<div
										key={line.accrualId}
										className="flex justify-between gap-2 text-emerald-900"
									>
										<span>
											Платёж №{line.installmentNumber} · {line.dueDate}
										</span>
										<span className="text-right shrink-0">
											+{fmt(line.applied)}{" "}
											{line.status === "paid"
												? "✓ оплачен"
												: `ост. ${fmt(line.remainingAfter)}`}
										</span>
									</div>
								))}
								{allocationPreview.unallocated > 0.01 && (
									<div className="text-amber-700 pt-1 border-t border-emerald-200">
										Сверх графика: {fmt(allocationPreview.unallocated)}{" "}
										{accrual.currency} (не распределено)
									</div>
								)}
							</div>
						)}
					</div>

					<div>
						<Label>Счёт зачисления *</Label>
						<Select value={accountId} onValueChange={setAccountId}>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите счёт" />
							</SelectTrigger>
							<SelectContent>
								{accounts.map((a) => (
									<SelectItem key={a.id} value={String(a.id)}>
										{a.name} ({a.currency})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Способ оплаты</Label>
							<Select
								value={paymentMethod}
								onValueChange={setPaymentMethod}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="cash">Наличные</SelectItem>
									<SelectItem value="transfer">Перевод</SelectItem>
									<SelectItem value="card">Карта</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Дата</Label>
							<Input
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								className="mt-1"
							/>
						</div>
					</div>

					<div>
						<Label>Примечание</Label>
						<Input
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Необязательно"
							className="mt-1"
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={payMut.isPending}>
						Отмена
					</Button>
					<Button
						className="bg-emerald-600 hover:bg-emerald-700"
						disabled={payMut.isPending || !accountId}
						onClick={() => payMut.mutate()}
					>
						{payMut.isPending ? "Проведение..." : "Подтвердить платёж"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default function ConstructionAccruals() {
	const qc = useQueryClient();
	const [filterStatus, setFilterStatus] = useState("all");
	const [filterContract, setFilterContract] = useState("all");
	const [viewMode, setViewMode] = useState<"list" | "counterparties">("list");
	const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("all");
	const [customFrom, setCustomFrom] = useState("");
	const [customTo, setCustomTo] = useState("");
	const [expandedBuyers, setExpandedBuyers] = useState<Set<string>>(
		() => new Set(),
	);
	const [payTarget, setPayTarget] = useState<AccrualRow | null>(null);
	const [cancelTarget, setCancelTarget] = useState<AccrualRow | null>(null);

	const { data: accruals = [], isLoading } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});
	const { data: accounts = [] } = useQuery({
		queryKey: ["construction-accounts"],
		queryFn: () => api.get("/construction/accounts").then((r) => r.data),
	});

	const invalidateAll = () => {
		qc.invalidateQueries({ queryKey: ["construction-accruals"] });
		qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
		qc.invalidateQueries({ queryKey: ["construction-operations"] });
	};

	const cancelMut = useMutation({
		mutationFn: (id: number) =>
			api.post(`/construction/accruals/${id}/cancel-payment`).then((r) => r.data),
		onSuccess: () => {
			invalidateAll();
			toast.success("Платёж отменён, начисление снова ожидает оплаты");
			setCancelTarget(null);
		},
		onError: (err: Error) => {
			toast.error(err.message || "Не удалось отменить платёж");
		},
	});

	const accrualsArray = Array.isArray(accruals) ? accruals : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];
	const accountsArray = Array.isArray(accounts) ? accounts : [];

	const contractById = useMemo(() => {
		const m = new Map<number, any>();
		for (const c of contractsArray) m.set(c.id, c);
		return m;
	}, [contractsArray]);

	const periodByContract = useMemo(
		() => buildContractPeriodMap(accrualsArray),
		[accrualsArray],
	);

	const enriched: AccrualRow[] = useMemo(
		() =>
			accrualsArray.map((a: any) => {
				const contract = contractById.get(a.contractId);
				const buyerName =
					contract?.buyerName?.trim() || "Без покупателя";
				const buyerKey = contract?.buyerId
					? `id:${contract.buyerId}`
					: `name:${buyerName.toLowerCase()}`;
				const contractPeriod =
					periodByContract.get(a.contractId) || "monthly";
				return {
					...a,
					isOverdue: isOverdue(a.dueDate, a.status),
					buyerName,
					buyerKey,
					contractNumber: contract?.contractNumber,
					paymentPeriod: accrualPaymentPeriod(a, contractPeriod),
				};
			}),
		[accrualsArray, contractById, periodByContract],
	);

	const dateRange = useMemo(
		() => resolveDateRange(dateRangeKey, customFrom, customTo),
		[dateRangeKey, customFrom, customTo],
	);

	const filtered = useMemo(() => {
		return enriched.filter((a) => {
			const statusKey =
				a.isOverdue && a.status !== "paid" ? "overdue" : a.status;
			if (filterStatus !== "all" && statusKey !== filterStatus) return false;
			if (filterContract !== "all" && a.contractId !== Number(filterContract))
				return false;
			if (!isDueDateInRange(a.dueDate, dateRange)) return false;
			return true;
		});
	}, [enriched, filterStatus, filterContract, dateRange]);

	const counterpartyGroups = useMemo(() => {
		const map = new Map<
			string,
			{
				key: string;
				name: string;
				payments: AccrualRow[];
				totalAccrued: number;
				totalPaid: number;
				totalRemaining: number;
				currency: string;
			}
		>();
		for (const a of filtered) {
			const key = a.buyerKey || a.buyerName || "unknown";
			const name = a.buyerName || "Без покупателя";
			if (!map.has(key)) {
				map.set(key, {
					key,
					name,
					payments: [],
					totalAccrued: 0,
					totalPaid: 0,
					totalRemaining: 0,
					currency: a.currency,
				});
			}
			const g = map.get(key)!;
			g.payments.push(a);
			g.totalAccrued += parseFloat(a.amount || "0");
			g.totalPaid += parseFloat(a.paidAmount || "0");
			g.totalRemaining += parseFloat(a.remainingAmount || "0");
		}
		for (const g of map.values()) {
			g.payments.sort(
				(a, b) =>
					a.dueDate.localeCompare(b.dueDate) ||
					a.installmentNumber - b.installmentNumber,
			);
		}
		return [...map.values()].sort((a, b) =>
			a.name.localeCompare(b.name, "ru"),
		);
	}, [filtered]);

	const filterButtonLabel = useMemo(() => {
		if (viewMode === "counterparties") return "Контрагенты";
		if (dateRangeKey !== "all") {
			return formatRangeLabel(dateRangeKey, customFrom, customTo);
		}
		return "Фильтр";
	}, [viewMode, dateRangeKey, customFrom, customTo]);

	const toggleBuyerExpanded = (key: string) => {
		setExpandedBuyers((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const totalPending = filtered
		.filter((a: any) => a.status !== "paid")
		.reduce((s: number, a: any) => s + parseFloat(a.remainingAmount || "0"), 0);
	const totalPaid = filtered.reduce(
		(s: number, a: any) => s + parseFloat(a.paidAmount || "0"),
		0,
	);
	const totalOverdue = filtered
		.filter((a: any) => a.isOverdue)
		.reduce((s: number, a: any) => s + parseFloat(a.remainingAmount || "0"), 0);
	const countOverdue = filtered.filter((a: any) => a.isOverdue).length;

	const payContract = payTarget
		? contractsArray.find((c: any) => c.id === payTarget.contractId)
		: null;

	const payContractAccruals = useMemo(
		() =>
			payTarget
				? enriched.filter((a) => a.contractId === payTarget.contractId)
				: [],
		[enriched, payTarget],
	);

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Начисления</h1>
				<p className="text-gray-500 text-sm mt-0.5">
					График платежей по договорам
				</p>
			</div>

			<div className="grid grid-cols-4 gap-4 mb-6">
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">К получению</div>
					<div className="text-xl font-bold text-blue-600">
						{fmt(totalPending)}
					</div>
				</div>
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">Получено</div>
					<div className="text-xl font-bold text-emerald-600">
						{fmt(totalPaid)}
					</div>
				</div>
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">Просрочено</div>
					<div className="text-xl font-bold text-rose-600">
						{fmt(totalOverdue)}
					</div>
				</div>
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">Просроченных</div>
					<div className="text-xl font-bold text-rose-600">
						{countOverdue} шт.
					</div>
				</div>
			</div>

			<div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 p-3 flex gap-3 items-center">
				<div className="flex gap-2">
					{["all", "pending", "partial", "paid", "overdue"].map((s) => (
						<button
							key={s}
							onClick={() => setFilterStatus(s)}
							className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterStatus === s ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
						>
							{s === "all"
								? "Все"
								: s === "pending"
									? "Ожидает"
									: s === "partial"
										? "Частично"
										: s === "paid"
											? "Оплачен"
											: "Просрочен"}
						</button>
					))}
				</div>
				<Select value={filterContract} onValueChange={setFilterContract}>
					<SelectTrigger className="w-48 h-8 text-xs">
						<SelectValue placeholder="Все договоры" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все договоры</SelectItem>
						{contractsArray.map((c: any) => (
							<SelectItem key={c.id} value={String(c.id)}>
								{c.contractNumber} — {c.buyerName}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" className="h-8 gap-2 text-xs">
							<Filter className="w-3.5 h-3.5" />
							{filterButtonLabel}
							<ChevronDown className="w-3.5 h-3.5 opacity-60" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-52">
						<DropdownMenuLabel>Режим</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={() => {
								setViewMode("list");
							}}
						>
							Список платежей
							{viewMode === "list" && dateRangeKey === "all" && (
								<span className="ml-auto text-amber-600">✓</span>
							)}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setViewMode("counterparties");
								setExpandedBuyers(new Set());
							}}
						>
							Контрагенты
							{viewMode === "counterparties" && (
								<span className="ml-auto text-amber-600">✓</span>
							)}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Срок платежа</DropdownMenuLabel>
						{(Object.keys(DATE_RANGE_LABELS) as DateRangeKey[]).map(
							(key) => (
								<DropdownMenuItem
									key={key}
									onClick={() => {
										setDateRangeKey(key);
										if (key !== "custom") setViewMode("list");
									}}
								>
									{DATE_RANGE_LABELS[key]}
									{dateRangeKey === key && (
										<span className="ml-auto text-amber-600">✓</span>
									)}
								</DropdownMenuItem>
							),
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => {
								setViewMode("list");
								setDateRangeKey("all");
								setCustomFrom("");
								setCustomTo("");
							}}
						>
							Сбросить фильтры
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{dateRangeKey === "custom" && (
				<div className="mb-4 flex flex-wrap items-end gap-2">
					<div>
						<Label className="text-xs">С</Label>
						<Input
							type="date"
							className="h-8 text-xs mt-1 w-36"
							value={customFrom}
							onChange={(e) => setCustomFrom(e.target.value)}
						/>
					</div>
					<div>
						<Label className="text-xs">По</Label>
						<Input
							type="date"
							className="h-8 text-xs mt-1 w-36"
							value={customTo}
							onChange={(e) => setCustomTo(e.target.value)}
						/>
					</div>
					<Button
						size="sm"
						variant="outline"
						className="h-8 text-xs"
						disabled={!customFrom || !customTo}
						onClick={() => setViewMode("list")}
					>
						Применить период
					</Button>
				</div>
			)}

			{(viewMode === "counterparties" || dateRangeKey !== "all") && (
				<div className="mb-4 flex flex-wrap gap-2 items-center text-sm">
					{viewMode === "counterparties" && (
						<Badge variant="secondary">Режим: контрагенты</Badge>
					)}
					{dateRangeKey !== "all" && (
						<Badge variant="secondary">
							Период: {formatRangeLabel(dateRangeKey, customFrom, customTo)}
						</Badge>
					)}
				</div>
			)}

			<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				{viewMode === "counterparties" ? (
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b border-gray-100">
								<th className="w-10 px-2" />
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
									Контрагент
								</th>
								<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
									Начислено за период
								</th>
								<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
									Оплачено
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
							) : counterpartyGroups.length === 0 ? (
								<tr>
									<td colSpan={5} className="text-center py-12 text-gray-400">
										Нет данных за выбранный период
									</td>
								</tr>
							) : (
								counterpartyGroups.map((buyer) => {
									const open = expandedBuyers.has(buyer.key);
									return (
										<Fragment key={buyer.key}>
											<tr
												className="border-b border-gray-100 hover:bg-amber-50/40 cursor-pointer"
												onClick={() => toggleBuyerExpanded(buyer.key)}
											>
												<td className="px-2 py-3 text-center">
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="h-7 w-7 p-0"
														onClick={(e) => {
															e.stopPropagation();
															toggleBuyerExpanded(buyer.key);
														}}
													>
														{open ? (
															<ChevronDown className="w-4 h-4" />
														) : (
															<ChevronRight className="w-4 h-4" />
														)}
													</Button>
												</td>
												<td className="px-4 py-3 font-medium">
													{buyer.name}
													<span className="text-xs text-gray-400 ml-2">
														({buyer.payments.length} плат.)
													</span>
												</td>
												<td className="px-4 py-3 text-right font-mono font-medium">
													{fmt(buyer.totalAccrued)} {buyer.currency}
												</td>
												<td className="px-4 py-3 text-right font-mono text-emerald-600">
													{fmt(buyer.totalPaid)}
												</td>
												<td className="px-4 py-3 text-right font-mono font-bold text-amber-600">
													{fmt(buyer.totalRemaining)}
												</td>
											</tr>
											{open && (
												<tr>
													<td colSpan={5} className="p-0 bg-gray-50/80">
														<table className="w-full text-sm">
															<thead>
																<tr className="border-b border-gray-200">
																	<th className="text-left px-4 py-2 text-xs text-gray-500">
																		№
																	</th>
																	<th className="text-left px-4 py-2 text-xs text-gray-500">
																		Договор
																	</th>
																	<th className="text-left px-4 py-2 text-xs text-gray-500">
																		Срок
																	</th>
																	<th className="text-left px-4 py-2 text-xs text-gray-500">
																		Статус
																	</th>
																	<th className="text-right px-4 py-2 text-xs text-gray-500">
																		Начислено
																	</th>
																	<th className="text-right px-4 py-2 text-xs text-gray-500">
																		Оплачено
																	</th>
																	<th className="text-right px-4 py-2 text-xs text-gray-500">
																		Остаток
																	</th>
																	<th className="px-4 py-2" />
																</tr>
															</thead>
															<tbody>
																{buyer.payments.map((a) => (
																	<PaymentRow
																		key={a.id}
																		a={a}
																		contract={contractById.get(
																			a.contractId,
																		)}
																		onPay={setPayTarget}
																		onCancel={setCancelTarget}
																	/>
																))}
															</tbody>
														</table>
													</td>
												</tr>
											)}
										</Fragment>
									);
								})
							)}
						</tbody>
					</table>
				) : (
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b border-gray-100">
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
									№
								</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
									Договор / Покупатель
								</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
									Срок / период
								</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
									Статус
								</th>
								<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
									Начислено
								</th>
								<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
									Оплачено
								</th>
								<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
									Остаток
								</th>
								<th className="px-4 py-3" />
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								<tr>
									<td colSpan={8} className="text-center py-12 text-gray-400">
										Загрузка...
									</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td colSpan={8} className="text-center py-12 text-gray-400">
										<ListOrdered className="w-10 h-10 mx-auto mb-2 text-gray-200" />
										Нет платежей за выбранный период
									</td>
								</tr>
							) : (
								filtered.map((a) => (
									<PaymentRow
										key={a.id}
										a={a}
										contract={contractById.get(a.contractId)}
										onPay={setPayTarget}
										onCancel={setCancelTarget}
									/>
								))
							)}
						</tbody>
					</table>
				)}
			</div>

			<AcceptPaymentDialog
				accrual={payTarget}
				contract={payContract}
				contractAccruals={payContractAccruals}
				accounts={accountsArray}
				open={!!payTarget}
				onClose={() => setPayTarget(null)}
				onSuccess={invalidateAll}
			/>

			<AlertDialog
				open={!!cancelTarget}
				onOpenChange={(v) => !v && setCancelTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Отменить платёж?</AlertDialogTitle>
						<AlertDialogDescription>
							Начисление №{cancelTarget?.installmentNumber} вернётся в статус
							«Ожидает», сумма{" "}
							<strong>
								{fmt(cancelTarget?.paidAmount)} {cancelTarget?.currency}
							</strong>{" "}
							будет снята с договора, операция в кассе будет отменена.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={cancelMut.isPending}>
							Назад
						</AlertDialogCancel>
						<Button
							variant="destructive"
							disabled={cancelMut.isPending || !cancelTarget}
							onClick={() => {
								if (cancelTarget) cancelMut.mutate(cancelTarget.id);
							}}
						>
							{cancelMut.isPending ? "Отмена..." : "Да, отменить платёж"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
