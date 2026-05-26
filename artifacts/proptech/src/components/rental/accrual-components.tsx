import { useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	Banknote,
	Check,
	CheckCircle,
	ChevronsUpDown,
	Search,
	Settings,
	Tag,
	XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiBase } from "@/lib/api-base";
import { getRentalAccountsQueryKey } from "@/lib/rental-query-keys";
import { cn } from "@/lib/utils";

export const statusColors: Record<string, string> = {
	pending: "bg-amber-100 text-amber-800",
	approved: "bg-blue-100 text-blue-800",
	partial: "bg-amber-100 text-amber-800",
	paid: "bg-emerald-100 text-emerald-800",
	overdue: "bg-rose-100 text-rose-800",
	cancelled: "bg-gray-100 text-gray-700",
};

export const statusLabels: Record<string, string> = {
	pending: "Ожидает",
	approved: "Подтверждено",
	partial: "Частично",
	paid: "Оплачено",
	overdue: "Просрочено",
	cancelled: "Отменено",
};

export function fmtCurrency(amount: number | string) {
	const num = typeof amount === "string" ? parseFloat(amount) : amount;
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(num);
}

export function formatDate(date: string) {
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

async function applyDiscount(id: number, body: Record<string, unknown>) {
	const res = await fetch(`${BASE}/rental/accruals/${id}/discount`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error("Ошибка применения льготы");
	return res.json();
}

export interface Accrual {
	id: number;
	leaseContractId: number;
	period: string;
	amount: string;
	paidAmount: string;
	balance: string;
	dueDate: string;
	status: string;
	currency: string;
	discountType?: string | null;
	discountAmount?: string | null;
	discountReason?: string | null;
}

interface DiscountDialogProps {
	accrual: Accrual | null;
	onClose: () => void;
	onSaved: () => void;
}

export function DiscountDialog({ accrual, onClose, onSaved }: DiscountDialogProps) {
	const { toast } = useToast();
	const [discountType, setDiscountType] = useState("percent");
	const [discountValue, setDiscountValue] = useState("");
	const [reason, setReason] = useState("");
	const [graceDays, setGraceDays] = useState("7");
	const [loading, setLoading] = useState(false);

	if (!accrual) return null;

	const baseAmount = parseFloat(accrual.amount);
	let preview = 0;
	if (discountType === "percent" && discountValue)
		preview = (baseAmount * parseFloat(discountValue)) / 100;
	else if (discountType === "fixed" && discountValue)
		preview = parseFloat(discountValue);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			await applyDiscount(accrual.id, {
				discountType,
				discountValue:
					discountType !== "grace"
						? parseFloat(discountValue)
						: parseFloat(graceDays),
				reason,
				gracePeriodDays:
					discountType === "grace" ? parseInt(graceDays, 10) : undefined,
			});
			toast({
				title: "Льгота применена",
				description:
					discountType === "grace"
						? `Срок продлён на ${graceDays} дн.`
						: `Скидка ${fmtCurrency(preview)}`,
			});
			onSaved();
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
		<Dialog open={!!accrual} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Tag className="w-4 h-4 text-blue-600" /> Применить льготу
					</DialogTitle>
					<DialogDescription>
						Период {accrual.period} · Сумма:{" "}
						{fmtCurrency(parseFloat(accrual.amount))}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label>Тип льготы</Label>
						<Select value={discountType} onValueChange={setDiscountType}>
							<SelectTrigger className="mt-1">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="percent">Скидка в процентах (%)</SelectItem>
								<SelectItem value="fixed">
									Фиксированная скидка (сом)
								</SelectItem>
								<SelectItem value="grace">Отсрочка платежа (дней)</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{discountType === "grace" ? (
						<div>
							<Label>Количество дней отсрочки</Label>
							<Input
								type="number"
								min="1"
								max="90"
								value={graceDays}
								onChange={(e) => setGraceDays(e.target.value)}
								placeholder="7"
								className="mt-1"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Текущий срок: {formatDate(accrual.dueDate)} → новый срок
								сдвинется на {graceDays} дней
							</p>
						</div>
					) : (
						<div>
							<Label>
								{discountType === "percent"
									? "Размер скидки (%)"
									: "Сумма скидки (KGS)"}
							</Label>
							<Input
								type="number"
								min="0"
								max={discountType === "percent" ? "100" : String(baseAmount)}
								value={discountValue}
								onChange={(e) => setDiscountValue(e.target.value)}
								placeholder={discountType === "percent" ? "10" : "5000"}
								className="mt-1"
							/>
							{preview > 0 && (
								<p className="text-xs text-emerald-600 font-medium mt-1">
									Скидка: {fmtCurrency(preview)} → итог:{" "}
									{fmtCurrency(Math.max(0, baseAmount - preview))}
								</p>
							)}
						</div>
					)}

					<div>
						<Label>Основание / Причина</Label>
						<Input
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Семейные обстоятельства, первый месяц и т.д."
							className="mt-1"
						/>
					</div>

					{accrual.discountType && (
						<div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
							<AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
							<span className="text-amber-700">
								Ранее уже применена льгота типа «{accrual.discountType}». Она
								будет заменена.
							</span>
						</div>
					)}

					<div className="flex justify-end gap-2 pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
							Отмена
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Применение..." : "Применить льготу"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function LeaseCombobox({
	value,
	onValueChange,
	leases,
}: {
	value: string;
	onValueChange: (v: string) => void;
	leases: any[];
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		const leasesArray = Array.isArray(leases) ? leases : [];
		const q = search.toLowerCase();
		return leasesArray.filter(
			(l) =>
				l.contractNumber?.toLowerCase().includes(q) ||
				(l.tenantName || "").toLowerCase().includes(q),
		);
	}, [leases, search]);

	const selectedLabel = useMemo(() => {
		if (value === "all") return "Все договоры";
		const leasesArray = Array.isArray(leases) ? leases : [];
		const l = leasesArray.find((x) => String(x.id) === value);
		return l ? `${l.contractNumber} — ${l.tenantName || ""}` : "Все договоры";
	}, [value, leases]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-56 h-9 justify-between font-normal"
				>
					<span className="truncate">{selectedLabel}</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-72 p-0" align="start">
				<div className="flex items-center border-b px-3 py-2 gap-2">
					<Search className="h-4 w-4 text-muted-foreground shrink-0" />
					<input
						className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						placeholder="Поиск по договору или арендатору..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				<div className="max-h-64 overflow-y-auto py-1">
					<button
						className={cn(
							"w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent",
							value === "all" && "font-medium",
						)}
						onClick={() => {
							onValueChange("all");
							setOpen(false);
							setSearch("");
						}}
					>
						<Check
							className={cn(
								"h-4 w-4",
								value === "all" ? "opacity-100" : "opacity-0",
							)}
						/>
						Все договоры
					</button>
					{filtered.length === 0 ? (
						<p className="px-3 py-4 text-sm text-center text-muted-foreground">
							Ничего не найдено
						</p>
					) : (
						filtered.map((l: any) => (
							<button
								key={l.id}
								className={cn(
									"w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent",
									String(l.id) === value && "font-medium",
								)}
								onClick={() => {
									onValueChange(String(l.id));
									setOpen(false);
									setSearch("");
								}}
							>
								<Check
									className={cn(
										"h-4 w-4",
										String(l.id) === value ? "opacity-100" : "opacity-0",
									)}
								/>
								<span>
									<span className="font-medium">{l.contractNumber}</span>
									{l.tenantName && (
										<span className="text-muted-foreground ml-1">
											— {l.tenantName}
										</span>
									)}
								</span>
							</button>
						))
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

interface BankAccount {
	id: number;
	name: string;
	currency: string;
	currentBalance: string;
}

export function QuickPayDialog({
	accrual,
	leaseContractId,
	onClose,
	onSaved,
}: {
	accrual: Accrual | null;
	leaseContractId: number | null;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const [paymentDate, setPaymentDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [paymentMethod, setPaymentMethod] = useState("cash");
	const [amount, setAmount] = useState("");
	const [accountId, setAccountId] = useState<string>("");
	const [note, setNote] = useState("");
	const [loading, setLoading] = useState(false);
	const [creatingAccount, setCreatingAccount] = useState(false);
	const [newAccountName, setNewAccountName] = useState("");

	const { data: accounts = [], refetch: refetchAccounts } = useQuery<BankAccount[]>({
		queryKey: getRentalAccountsQueryKey(),
		queryFn: () => api.get("/rental/accounts").then((r) => r.data),
		enabled: !!accrual,
	});

	useEffect(() => {
		if (accrual) {
			const bal = String(Math.max(0, parseFloat(accrual.balance)));
			setAmount(bal);
			setNote("");
			setPaymentDate(new Date().toISOString().split("T")[0]);
			setPaymentMethod("cash");
			setAccountId(accounts[0] ? String(accounts[0].id) : "");
			setCreatingAccount(false);
			setNewAccountName("");
		}
	}, [accrual?.id, accounts]);

	const balanceNum = accrual ? Math.max(0, parseFloat(accrual.balance)) : 0;

	if (!accrual || !leaseContractId) return null;

	const handleCreateAccount = async () => {
		if (!newAccountName.trim()) return;
		setLoading(true);
		try {
			const res = await api.post("/rental/accounts", {
				name: newAccountName.trim(),
				currency: "KGS",
				type: "cash",
			});
			await refetchAccounts();
			setAccountId(String(res.data.id));
			setCreatingAccount(false);
			setNewAccountName("");
			toast({ title: "Счёт создан", description: newAccountName.trim() });
		} catch {
			toast({ title: "Ошибка", description: "Не удалось создать счёт", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const sendAmount = parseFloat(amount) || balanceNum;
		if (sendAmount <= 0) {
			toast({ title: "Ошибка", description: "Укажите сумму платежа", variant: "destructive" });
			return;
		}
		if (!accountId) {
			toast({ title: "Выберите расчётный счёт", description: "Без счёта принять платёж невозможно", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(`${BASE}/rental/payments`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					leaseContractId,
					amount: sendAmount,
					currency: accrual.currency || "KGS",
					paymentDate,
					paymentMethod,
					accountId: parseInt(accountId, 10),
					note: note || null,
					allocations: [{ accrualId: accrual.id, amount: sendAmount }],
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Ошибка создания платежа");
			}
			toast({
				title: "Платёж принят",
				description: `${fmtCurrency(sendAmount)} · ${accrual.period}`,
			});
			onSaved();
			onClose();
		} catch (err: any) {
			toast({ title: "Ошибка", description: err.message, variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!accrual} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Banknote className="w-4 h-4 text-emerald-600" /> Принять платёж
					</DialogTitle>
					<DialogDescription>
						Период {accrual.period} · Остаток:{" "}
						{fmtCurrency(balanceNum)}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label>Сумма ({accrual.currency || "KGS"})</Label>
						<Input
							type="number"
							min="0.01"
							step="0.01"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							className="mt-1"
							autoFocus
						/>
					</div>
					<div>
						<Label>Дата платежа</Label>
						<Input
							type="date"
							value={paymentDate}
							onChange={(e) => setPaymentDate(e.target.value)}
							className="mt-1"
						/>
					</div>
					<div>
						<Label>Способ оплаты</Label>
						<Select value={paymentMethod} onValueChange={setPaymentMethod}>
							<SelectTrigger className="mt-1">
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
					</div>

					<div>
						<Label>Счёт зачисления</Label>
						{accounts.length > 0 && !creatingAccount ? (
							<div className="flex gap-2 mt-1">
								<Select value={accountId} onValueChange={setAccountId}>
									<SelectTrigger className={`flex-1 ${!accountId ? "border-rose-300" : ""}`}>
										<SelectValue placeholder="Выберите счёт *" />
									</SelectTrigger>
									<SelectContent>
										{accounts.map((a) => (
											<SelectItem key={a.id} value={String(a.id)}>
												{a.name} ({a.currency})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button type="button" variant="outline" size="sm" className="px-2 shrink-0"
									onClick={() => setCreatingAccount(true)}>+</Button>
							</div>
						) : creatingAccount ? (
							<div className="flex gap-2 mt-1">
								<Input
									placeholder="Название счёта"
									value={newAccountName}
									onChange={(e) => setNewAccountName(e.target.value)}
									className="flex-1"
								/>
								<Button type="button" size="sm" onClick={handleCreateAccount} disabled={loading || !newAccountName.trim()}>
									Создать
								</Button>
								<Button type="button" variant="outline" size="sm" onClick={() => setCreatingAccount(false)}>
									✕
								</Button>
							</div>
						) : (
							<div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-rose-300 bg-rose-50 px-3 py-2">
								<span className="text-xs text-rose-700 flex-1">Необходимо создать счёт</span>
								<Button type="button" size="sm" variant="outline" className="text-xs h-7 border-rose-400 text-rose-700"
									onClick={() => setCreatingAccount(true)}>
									Создать счёт
								</Button>
							</div>
						)}
					</div>

					<div>
						<Label>Примечание</Label>
						<Input
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="Необязательно"
							className="mt-1"
						/>
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button type="button" variant="outline" onClick={onClose} disabled={loading}>
							Отмена
						</Button>
						<Button type="submit" disabled={loading || !accountId} className="bg-green-600 hover:bg-green-700 text-white">
							{loading ? "Сохранение..." : "Подтвердить платёж"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function AccrualActionButtons({
	accrual,
	loadingId,
	onAccept,
	onStatusChange,
	onDiscount,
}: {
	accrual: Accrual;
	loadingId: number | null;
	onAccept: (a: Accrual) => void;
	onStatusChange: (id: number, status: string) => void;
	onDiscount: (a: Accrual) => void;
}) {
	const isBusy = loadingId === accrual.id;
	const canApprove =
		accrual.status === "pending" || accrual.status === "overdue";
	const canCancel =
		accrual.status === "pending" || accrual.status === "approved";
	const showDiscount =
		accrual.status !== "paid" && accrual.status !== "cancelled";

	if (!canApprove && !canCancel && !showDiscount) {
		return <span className="text-gray-300 text-[10px]">—</span>;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					disabled={isBusy}
					className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
					title="Действия"
				>
					<Settings className="w-4 h-4" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40">
				<DropdownMenuItem
					disabled={!canApprove || isBusy}
					onClick={() => onAccept(accrual)}
					className="text-emerald-700 focus:text-emerald-700"
				>
					<CheckCircle className="w-4 h-4 mr-2" />
					Принять
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={!canCancel || isBusy}
					onClick={() => onStatusChange(accrual.id, "cancelled")}
					className="text-rose-700 focus:text-rose-700"
				>
					<XCircle className="w-4 h-4 mr-2" />
					Отменить
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={!showDiscount || isBusy}
					onClick={() => onDiscount(accrual)}
					className="text-blue-700 focus:text-blue-700"
				>
					<Tag className="w-4 h-4 mr-2" />
					Льгота
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function AccrualRow({
	accrual,
	label,
	loadingId,
	onAccept,
	onStatusChange,
	onDiscount,
}: {
	accrual: Accrual;
	label: string;
	loadingId: number | null;
	onAccept: (a: Accrual) => void;
	onStatusChange: (id: number, status: string) => void;
	onDiscount: (a: Accrual) => void;
}) {
	const hasDiscount = parseFloat(accrual.discountAmount || "0") > 0;

	return (
		<TableRow className="hover:bg-gray-50">
			<TableCell className="text-sm text-gray-600">{label}</TableCell>
			<TableCell className="font-medium text-gray-900">
				{accrual.period}
			</TableCell>
			<TableCell>{fmtCurrency(parseFloat(accrual.amount))}</TableCell>
			<TableCell>
				{hasDiscount ? (
					<span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
						-{fmtCurrency(parseFloat(accrual.discountAmount!))}
					</span>
				) : (
					<span className="text-gray-300 text-xs">—</span>
				)}
			</TableCell>
			<TableCell className="text-gray-600">
				{fmtCurrency(parseFloat(accrual.paidAmount))}
			</TableCell>
			<TableCell
				className={cn(
					"font-medium",
					parseFloat(accrual.balance) > 0
						? "text-rose-600"
						: "text-emerald-600",
				)}
			>
				{fmtCurrency(parseFloat(accrual.balance))}
			</TableCell>
			<TableCell className="text-gray-500">
				{formatDate(accrual.dueDate)}
			</TableCell>
			<TableCell>
				<Badge
					className={statusColors[accrual.status] || ""}
					variant="secondary"
				>
					{statusLabels[accrual.status] || accrual.status}
				</Badge>
			</TableCell>
			<TableCell>
				<AccrualActionButtons
					accrual={accrual}
					loadingId={loadingId}
					onAccept={onAccept}
					onStatusChange={onStatusChange}
					onDiscount={onDiscount}
				/>
			</TableCell>
		</TableRow>
	);
}

export function AccrualsTableHeader({ label = "Договор" }: { label?: string }) {
	return (
		<TableHeader>
			<TableRow className="bg-gray-50">
				<TableHead>{label}</TableHead>
				<TableHead>Период</TableHead>
				<TableHead>Сумма</TableHead>
				<TableHead>Скидка</TableHead>
				<TableHead>Оплачено</TableHead>
				<TableHead>Остаток</TableHead>
				<TableHead>Срок оплаты</TableHead>
				<TableHead>Статус</TableHead>
				<TableHead className="text-center">Действия</TableHead>
			</TableRow>
		</TableHeader>
	);
}
