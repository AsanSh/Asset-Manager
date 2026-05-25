import { useQueryClient } from "@tanstack/react-query";
import { useSortable } from "@/lib/use-sortable";
import { useColResize } from "@/lib/use-col-resize";
import { ChevronDown, ChevronUp, ChevronsUpDown, Info, Pencil, Plus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import {
	type CreateLeaseContractBodyStatus,
	getListLeaseContractsQueryKey,
	type LeaseContract,
	useCreateLeaseContract,
	useListLeaseContracts,
	useListRentalProperties,
	useListTenants,
	useUpdateLeaseContract,
} from "@/api-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// ── Auth helper ───────────────────────────────────────────────────────────────

/** Делает авторизованный fetch с Bearer токеном из localStorage */
function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
	const token = localStorage.getItem("auth_token");
	return fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(options.headers || {}),
		},
	});
}

// ── helpers ──────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800",
	active: "bg-emerald-100 text-emerald-800",
	expired: "bg-amber-100 text-amber-800",
	terminated: "bg-rose-100 text-rose-800",
};
const statusLabels: Record<string, string> = {
	draft: "Черновик",
	active: "Активный",
	expired: "Истёк",
	terminated: "Расторгнут",
};

function fmt(amount: number | string, currency = "KGS") {
	const num = typeof amount === "string" ? parseFloat(amount) : amount;
	if (Number.isNaN(num)) return "—";
	try {
		return new Intl.NumberFormat("ru-KG", {
			style: "currency",
			currency,
		}).format(num);
	} catch {
		return `${num.toLocaleString("ru-KG")} ${currency}`;
	}
}

function fmtDate(date: string | null | undefined) {
	if (!date) return "—";
	return new Date(date).toLocaleDateString("ru-RU");
}

const MONTHS_RU = [
	"Январь",
	"Февраль",
	"Март",
	"Апрель",
	"Май",
	"Июнь",
	"Июль",
	"Август",
	"Сентябрь",
	"Октябрь",
	"Ноябрь",
	"Декабрь",
];

function computeProratePreview(
	startDate: string,
	endDate: string,
	rentAmount: number,
): {
	firstMonth: { label: string; amount: number; isProrated: boolean } | null;
	lastMonth: { label: string; amount: number; isProrated: boolean } | null;
} | null {
	if (!startDate || Number.isNaN(rentAmount) || rentAmount <= 0) return null;
	const start = new Date(startDate);
	if (Number.isNaN(start.getTime())) return null;

	const firstDim = new Date(
		start.getFullYear(),
		start.getMonth() + 1,
		0,
	).getDate();
	const firstDay = start.getDate();
	const firstIsProrated = firstDay > 1;
	const firstAmount = firstIsProrated
		? Math.round((rentAmount / firstDim) * (firstDim - firstDay + 1) * 100) /
			100
		: rentAmount;
	const firstLabel = `${MONTHS_RU[start.getMonth()]} ${start.getFullYear()}`;

	let lastMonthResult: {
		label: string;
		amount: number;
		isProrated: boolean;
	} | null = null;
	if (endDate) {
		const end = new Date(endDate);
		if (!Number.isNaN(end.getTime())) {
			const lastDim = new Date(
				end.getFullYear(),
				end.getMonth() + 1,
				0,
			).getDate();
			const lastDay = end.getDate();
			const isSameMonth =
				start.getFullYear() === end.getFullYear() &&
				start.getMonth() === end.getMonth();
			const lastIsProrated = !isSameMonth && lastDay < lastDim;
			const lastAmount = isSameMonth
				? Math.round((rentAmount / lastDim) * (lastDay - firstDay + 1) * 100) /
					100
				: lastIsProrated
					? Math.round((rentAmount / lastDim) * lastDay * 100) / 100
					: rentAmount;
			const lastLabel = `${MONTHS_RU[end.getMonth()]} ${end.getFullYear()}`;
			if (lastIsProrated || isSameMonth) {
				lastMonthResult = {
					label: lastLabel,
					amount: lastAmount,
					isProrated: true,
				};
			}
		}
	}

	return {
		firstMonth: {
			label: firstLabel,
			amount: firstAmount,
			isProrated: firstIsProrated,
		},
		lastMonth: lastMonthResult,
	};
}

// ── ProrationPreview ──────────────────────────────────────────────────────────

function ProrationPreview({
	startDate,
	endDate,
	rentAmount,
	currency,
}: {
	startDate: string;
	endDate: string;
	rentAmount: string;
	currency: string;
}) {
	const amount = parseFloat(rentAmount);
	const preview = useMemo(
		() => computeProratePreview(startDate, endDate, amount),
		[startDate, endDate, amount],
	);
	if (!preview) return null;
	const { firstMonth, lastMonth } = preview;
	if (!firstMonth?.isProrated && !lastMonth?.isProrated) return null;

	return (
		<Alert className="border-blue-200 bg-blue-50 text-blue-900 text-sm">
			<Info className="h-4 w-4 text-blue-600" />
			<AlertDescription className="space-y-1">
				<div className="font-semibold text-blue-800 mb-1">
					Пропорциональный расчёт
				</div>
				{firstMonth?.isProrated && (
					<div>
						<span className="text-blue-600">{firstMonth.label}:</span>{" "}
						<span className="font-semibold">
							{fmt(firstMonth.amount, currency)}
						</span>{" "}
						<span className="text-blue-500">
							(с {new Date(startDate).toLocaleDateString("ru-RU")} до конца
							месяца)
						</span>
					</div>
				)}
				{lastMonth?.isProrated && (
					<div>
						<span className="text-blue-600">{lastMonth.label}:</span>{" "}
						<span className="font-semibold">
							{fmt(lastMonth.amount, currency)}
						</span>{" "}
						<span className="text-blue-500">
							(до {new Date(endDate).toLocaleDateString("ru-RU")})
						</span>
					</div>
				)}
				<div className="text-blue-500 text-xs mt-1">
					Остальные месяцы — {fmt(amount, currency)}
				</div>
			</AlertDescription>
		</Alert>
	);
}

// ── FormState ────────────────────────────────────────────────────────────────

type FormState = {
	propertyId: string;
	tenantId: string;
	contractNumber: string;
	signDate: string;
	startDate: string;
	endDate: string;
	rentAmount: string;
	currency: string;
	depositAmount: string;
	accrualDay: string;
	status: CreateLeaseContractBodyStatus;
	comment: string;
};

const EMPTY_FORM: FormState = {
	propertyId: "",
	tenantId: "",
	contractNumber: "",
	signDate: "",
	startDate: "",
	endDate: "",
	rentAmount: "",
	currency: "KGS",
	depositAmount: "",
	accrualDay: "1",
	status: "active",
	comment: "",
};

// ── Shared form fields ────────────────────────────────────────────────────────

function LeaseFormFields({
	form,
	setForm,
	mode,
}: {
	form: FormState;
	setForm: (f: FormState) => void;
	mode: "create" | "edit";
}) {
	const { data: tenants } = useListTenants();
	const tenantsArray = Array.isArray(tenants) ? tenants : [];
	const { data: properties } = useListRentalProperties();
	const propertiesArray = Array.isArray(properties) ? properties : [];

	const availableProperties =
		mode === "create"
			? propertiesArray.filter((p) => p.rentalStatus === "free")
			: propertiesArray;

	const f =
		(field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
			setForm({ ...form, [field]: e.target.value });

	return (
		<div className="space-y-3">
			{/* Объект и Арендатор */}
			<div className="grid grid-cols-2 gap-3">
				<div>
					<Label>Объект {mode === "create" && "*"}</Label>
					<Select
						value={form.propertyId}
						onValueChange={(v) => setForm({ ...form, propertyId: v })}
						disabled={mode === "edit"}
					>
						<SelectTrigger>
							<SelectValue placeholder="Выберите объект" />
						</SelectTrigger>
						<SelectContent>
							{availableProperties.map((p) => (
								<SelectItem key={p.id} value={String(p.id)}>
									{p.projectName} {p.unitNumber}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div>
					<Label>Арендатор {mode === "create" && "*"}</Label>
					<Select
						value={form.tenantId}
						onValueChange={(v) => setForm({ ...form, tenantId: v })}
						disabled={mode === "edit"}
					>
						<SelectTrigger>
							<SelectValue placeholder="Выберите арендатора" />
						</SelectTrigger>
						<SelectContent>
							{tenantsArray.map((t) => (
								<SelectItem key={t.id} value={String(t.id)}>
									{t.fullName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Номер договора */}
			<div>
				<Label>Номер договора *</Label>
				<Input
					value={form.contractNumber}
					onChange={f("contractNumber")}
					placeholder="ДА-2026-001"
					required
				/>
			</div>

			{/* Три ключевые даты */}
			<div className="border rounded-lg p-3 space-y-2 bg-muted/30">
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
					Даты договора
				</p>
				<div className="grid grid-cols-2 gap-3">
					<div>
						<Label className="text-sm">
							Начало начислений <span className="text-destructive">*</span>
						</Label>
						<Input
							type="date"
							value={form.startDate}
							onChange={f("startDate")}
							required
							className="mt-1"
						/>
					</div>
					<div>
						<Label className="text-sm text-muted-foreground">
							Завершение договора
						</Label>
						<Input
							type="date"
							value={form.endDate}
							onChange={f("endDate")}
							className="mt-1"
						/>
					</div>
				</div>
				<div className="w-1/2 pr-1.5">
					<Label className="text-sm text-muted-foreground">
						Дата подписания
					</Label>
					<Input
						type="date"
						value={form.signDate}
						onChange={f("signDate")}
						className="mt-1"
					/>
				</div>
			</div>

			{/* Сумма */}
			<div className="grid grid-cols-3 gap-3">
				<div className="col-span-2">
					<Label>Сумма аренды в месяц *</Label>
					<Input
						type="number"
						value={form.rentAmount}
						onChange={f("rentAmount")}
						placeholder="150 000"
						required
						min={0}
					/>
				</div>
				<div>
					<Label>Валюта</Label>
					<Select
						value={form.currency}
						onValueChange={(v) => setForm({ ...form, currency: v })}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="KGS">Сом (KGS)</SelectItem>
							<SelectItem value="USD">Доллар (USD)</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Превью пропорции */}
			<ProrationPreview
				startDate={form.startDate}
				endDate={form.endDate}
				rentAmount={form.rentAmount}
				currency={form.currency}
			/>

			<div className="grid grid-cols-2 gap-3">
				<div>
					<Label>Депозит</Label>
					<Input
						type="number"
						value={form.depositAmount}
						onChange={f("depositAmount")}
						placeholder="300 000"
					/>
				</div>
				<div>
					<Label>
						День начисления
						<span className="text-muted-foreground text-xs ml-1">(1–31)</span>
					</Label>
					<Input
						type="number"
						min={1}
						max={31}
						value={form.accrualDay}
						onChange={f("accrualDay")}
					/>
				</div>
			</div>

			<div>
				<Label>Статус</Label>
				<Select
					value={form.status}
					onValueChange={(v) =>
						setForm({ ...form, status: v as CreateLeaseContractBodyStatus })
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="draft">Черновик</SelectItem>
						<SelectItem value="active">Активный</SelectItem>
						<SelectItem value="expired">Истёк</SelectItem>
						<SelectItem value="terminated">Расторгнут</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label>Комментарий</Label>
				<Input
					value={form.comment}
					onChange={f("comment")}
					placeholder="Дополнительные условия..."
				/>
			</div>
		</div>
	);
}

// ── Create dialog ─────────────────────────────────────────────────────────────

function generateContractNumber(): string {
	const now = new Date();
	const dd = String(now.getDate()).padStart(2, "0");
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const yyyy = String(now.getFullYear());
	const rnd = String(Math.floor(10 + Math.random() * 90));
	return `ДА-${dd}${mm}${yyyy}-${rnd}`;
}

function CreateLeaseDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const createMutation = useCreateLeaseContract();
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [form, setForm] = useState<FormState>(() => ({
		...EMPTY_FORM,
		contractNumber: generateContractNumber(),
	}));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await createMutation.mutateAsync({
				data: {
					propertyId: parseInt(form.propertyId, 10),
					tenantId: parseInt(form.tenantId, 10),
					contractNumber: form.contractNumber,
					signDate: form.signDate || null,
					startDate: form.startDate,
					endDate: form.endDate || null,
					rentAmount: parseFloat(form.rentAmount),
					currency: form.currency,
					depositAmount: form.depositAmount
						? parseFloat(form.depositAmount)
						: null,
					accrualDay: form.accrualDay ? parseInt(form.accrualDay, 10) : null,
					status: form.status,
					comment: form.comment || null,
				},
			});
			toast({ title: "Договор аренды создан" });
			queryClient.invalidateQueries({
				queryKey: getListLeaseContractsQueryKey(),
			});
			setForm({ ...EMPTY_FORM, contractNumber: generateContractNumber() });
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err?.message || "Не удалось создать договор",
				variant: "destructive",
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Новый договор аренды</DialogTitle>
					<DialogDescription>
						Если дата начала начисления не 1-е число, первый месяц
						рассчитывается пропорционально.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<LeaseFormFields form={form} setForm={setForm} mode="create" />
					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? "Создание..." : "Создать договор"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

function EditLeaseDialog({
	lease,
	open,
	onClose,
}: {
	lease: LeaseContract;
	open: boolean;
	onClose: () => void;
}) {
	const updateMutation = useUpdateLeaseContract();
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [recalcConfirm, setRecalcConfirm] = useState(false);
	const [recalcLoading, setRecalcLoading] = useState(false);

	const [form, setForm] = useState<FormState>({
		propertyId: String(lease.propertyId),
		tenantId: String(lease.tenantId),
		contractNumber: lease.contractNumber,
		signDate: lease.signDate ?? "",
		startDate: lease.startDate,
		endDate: lease.endDate ?? "",
		rentAmount: String(lease.rentAmount),
		currency: lease.currency,
		depositAmount: lease.depositAmount ? String(lease.depositAmount) : "",
		accrualDay: lease.accrualDay ? String(lease.accrualDay) : "1",
		status: lease.status as CreateLeaseContractBodyStatus,
		comment: lease.comment ?? "",
	});

	const keyFieldsChanged =
		form.startDate !== lease.startDate ||
		form.endDate !== (lease.endDate ?? "") ||
		form.rentAmount !== String(lease.rentAmount) ||
		form.accrualDay !== String(lease.accrualDay ?? 1);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await updateMutation.mutateAsync({
				id: lease.id,
				data: {
					signDate: form.signDate || null,
					startDate: form.startDate,
					endDate: form.endDate || null,
					rentAmount: parseFloat(form.rentAmount),
					currency: form.currency,
					depositAmount: form.depositAmount
						? parseFloat(form.depositAmount)
						: null,
					accrualDay: form.accrualDay ? parseInt(form.accrualDay, 10) : null,
					status: form.status,
					comment: form.comment || null,
				},
			});
			toast({ title: "Договор обновлён" });
			queryClient.invalidateQueries({
				queryKey: getListLeaseContractsQueryKey(),
			});

			if (keyFieldsChanged) {
				setRecalcConfirm(true);
			} else {
				onClose();
			}
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err?.message || "Не удалось обновить договор",
				variant: "destructive",
			});
		}
	};

	const handleRecalculate = async () => {
		setRecalcLoading(true);
		try {
			const res = await authFetch(`/api/rental/accruals/recalculate`, {
				method: "POST",
				body: JSON.stringify({ leaseContractId: lease.id }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Ошибка пересчёта");
			}
			const data = await res.json();
			toast({
				title: "Начисления пересчитаны",
				description: `Добавлено ${data.inserted} начислений`,
			});
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err?.message,
				variant: "destructive",
			});
		} finally {
			setRecalcLoading(false);
			setRecalcConfirm(false);
			onClose();
		}
	};

	if (recalcConfirm) {
		return (
			<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Пересчитать начисления?</DialogTitle>
						<DialogDescription>
							Условия договора изменились. Хотите пересчитать будущие начисления
							с учётом пропорционального расчёта первого месяца?
							<br />
							<span className="text-amber-600 font-medium">
								Оплаченные начисления сохранятся.
							</span>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex gap-2">
						<Button
							variant="outline"
							onClick={onClose}
							disabled={recalcLoading}
						>
							Не пересчитывать
						</Button>
						<Button onClick={handleRecalculate} disabled={recalcLoading}>
							{recalcLoading ? "Пересчёт..." : "Пересчитать начисления"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Редактировать договор</DialogTitle>
					<DialogDescription>
						Договор <strong>{lease.contractNumber}</strong>. При изменении
						ставки или дат — предложим пересчитать начисления.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<LeaseFormFields form={form} setForm={setForm} mode="edit" />
					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending
								? "Сохранение..."
								: "Сохранить изменения"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ── Recalculate dialog ────────────────────────────────────────────────────────

function RecalcDialog({
	lease,
	open,
	onClose,
}: {
	lease: LeaseContract;
	open: boolean;
	onClose: () => void;
}) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);

	const handleRecalculate = async () => {
		setLoading(true);
		try {
			const res = await authFetch(`/api/rental/accruals/recalculate`, {
				method: "POST",
				body: JSON.stringify({ leaseContractId: lease.id }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Ошибка пересчёта");
			}
			const data = await res.json();
			toast({
				title: "Начисления пересчитаны",
				description: `Добавлено ${data.inserted} новых начислений.`,
			});
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err?.message,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Пересчитать начисления</DialogTitle>
					<DialogDescription>
						Договор <strong>{lease.contractNumber}</strong>. Будут пересозданы
						неоплаченные начисления с пропорциональным расчётом первого и
						последнего месяца.
						<br />
						<span className="text-amber-600 font-medium">
							Оплаченные начисления не затронуты.
						</span>
					</DialogDescription>
				</DialogHeader>
				<div className="py-2 text-sm text-muted-foreground space-y-1">
					{lease.signDate && (
						<div>
							Дата подписания: <strong>{fmtDate(lease.signDate)}</strong>
						</div>
					)}
					<div>
						Дата начала начисления: <strong>{fmtDate(lease.startDate)}</strong>
					</div>
					{lease.endDate && (
						<div>
							Дата завершения: <strong>{fmtDate(lease.endDate)}</strong>
						</div>
					)}
					<div>
						Ставка аренды:{" "}
						<strong>{fmt(lease.rentAmount, lease.currency)}</strong>/мес.
					</div>
				</div>
				<DialogFooter className="flex gap-2">
					<Button variant="outline" onClick={onClose} disabled={loading}>
						Отмена
					</Button>
					<Button onClick={handleRecalculate} disabled={loading}>
						<RefreshCw className="w-4 h-4 mr-2" />
						{loading ? "Пересчёт..." : "Пересчитать"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Table component ───────────────────────────────────────────────────────────

const TH = "relative border border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap bg-gray-100 sticky top-0 z-10 select-none";
const TD = "border border-gray-200 px-2 py-1 text-gray-700";

function LeaseSortTh({ label, col, sortKey, sortDir, onToggle, widths, startResize }: {
	label: string; col: string; sortKey: string; sortDir: "asc" | "desc";
	onToggle: (k: string) => void; widths: Record<string, number>;
	startResize: (k: string) => (e: React.MouseEvent) => void;
}) {
	const active = sortKey === col;
	return (
		<th className={TH + " cursor-pointer hover:bg-gray-200"} style={{ width: widths[col], minWidth: widths[col] }} onClick={() => onToggle(col)}>
			<span className="inline-flex items-center gap-1">
				{label}
				{active ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
			</span>
			<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 z-20" onMouseDown={startResize(col)} onClick={(e) => e.stopPropagation()} />
		</th>
	);
}

function LeaseTable({ isLoading, leasesArray, sortedLeases, sortKey, sortDir, toggle, activeCount, totalRent, setEditLease, setRecalcLease }: {
	isLoading: boolean; leasesArray: any[]; sortedLeases: any[]; sortKey: string; sortDir: "asc" | "desc";
	toggle: (k: string) => void; activeCount: number; totalRent: number;
	setEditLease: (l: any) => void; setRecalcLease: (l: any) => void;
}) {
	const { widths, startResize } = useColResize({ contractNumber: 130, propertyUnitNumber: 140, tenantName: 180, signDate: 110, startDate: 120, endDate: 110, rentAmount: 120, status: 110, actions: 50 });
	return (
		<div className="overflow-auto border border-gray-200 rounded-lg">
			<table className="w-full text-xs border-collapse">
				<thead>
					<tr>
						<LeaseSortTh label="Номер" col="contractNumber" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<LeaseSortTh label="Объект" col="propertyUnitNumber" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<LeaseSortTh label="Арендатор" col="tenantName" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<LeaseSortTh label="Подписание" col="signDate" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<LeaseSortTh label="Нач. начислений" col="startDate" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<LeaseSortTh label="Завершение" col="endDate" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<LeaseSortTh label="Аренда/мес." col="rentAmount" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<LeaseSortTh label="Статус" col="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
						<th className={TH} style={{ width: widths.actions }} />
					</tr>
				</thead>
				<tbody>
					{isLoading ? (
						Array.from({ length: 3 }).map((_, i) => (
							<tr key={i}>{Array.from({ length: 9 }).map((_, j) => <td key={j} className={TD}><Skeleton className="h-3 w-full" /></td>)}</tr>
						))
					) : !leasesArray.length ? (
						<tr><td colSpan={9} className="text-center text-gray-400 py-8 text-sm">Договоры аренды не найдены</td></tr>
					) : (
						sortedLeases.map((lease, idx) => (
							<tr key={lease.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
								<td className={TD + " font-medium text-gray-900"}>{lease.contractNumber}</td>
								<td className={TD}>{(lease as any).propertyUnitNumber || `#${lease.propertyId}`}</td>
								<td className={TD}>{(lease as any).tenantName || `#${lease.tenantId}`}</td>
								<td className={TD + " text-gray-500"}>{fmtDate(lease.signDate)}</td>
								<td className={TD}>{fmtDate(lease.startDate)}</td>
								<td className={TD + " text-gray-500"}>{lease.endDate ? fmtDate(lease.endDate) : "бессрочный"}</td>
								<td className={TD + " tabular-nums text-right font-medium"}>{fmt(lease.rentAmount, lease.currency)}</td>
								<td className={TD}>
									<span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[lease.status] || "bg-gray-100 text-gray-600"}`}>
										{statusLabels[lease.status] || lease.status}
									</span>
								</td>
								<td className={TD + " text-center"}>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button className="text-gray-500 hover:text-gray-900"><ChevronDown className="w-3.5 h-3.5" /></button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={() => setEditLease(lease)}>
												<Pencil className="w-4 h-4 mr-2" />Редактировать
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => setRecalcLease(lease)}>
												<RefreshCw className="w-4 h-4 mr-2" />Пересчитать начисления
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</td>
							</tr>
						))
					)}
				</tbody>
				{!isLoading && leasesArray.length > 0 && (
					<tfoot>
						<tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
							<td className={TD + " text-gray-700"} colSpan={6}>Итого: {leasesArray.length} договоров, активных: {activeCount}</td>
							<td className={TD + " tabular-nums text-right text-gray-700"}>{new Intl.NumberFormat("ru-RU").format(totalRent)}</td>
							<td className={TD} colSpan={2} />
						</tr>
					</tfoot>
				)}
			</table>
		</div>
	);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RentalContracts() {
	const { data: leases, isLoading } = useListLeaseContracts();
	const leasesArray = Array.isArray(leases) ? leases : [];
	const { sorted: sortedLeases, sortKey, sortDir, toggle } = useSortable(leasesArray, "contractNumber");
	const activeCount = leasesArray.filter((l) => l.status === "active").length;
	const totalRent = leasesArray.reduce((s, l) => s + parseFloat(String((l as any).rentAmount || "0")), 0);
	const [createOpen, setCreateOpen] = useState(false);
	const [editLease, setEditLease] = useState<LeaseContract | null>(null);
	const [recalcLease, setRecalcLease] = useState<LeaseContract | null>(null);

	return (
		<div className="p-6 space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Договоры аренды</h1>
					<p className="text-muted-foreground text-sm">
						Управление договорами · пропорциональный расчёт первого и последнего
						месяца
					</p>
				</div>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus className="w-4 h-4 mr-2" />
					Новый договор
				</Button>
			</div>

			<LeaseTable
				isLoading={isLoading}
				leasesArray={leasesArray}
				sortedLeases={sortedLeases}
				sortKey={sortKey}
				sortDir={sortDir}
				toggle={toggle}
				activeCount={activeCount}
				totalRent={totalRent}
				setEditLease={setEditLease}
				setRecalcLease={setRecalcLease}
			/>

			<CreateLeaseDialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
			/>

			{editLease && (
				<EditLeaseDialog
					lease={editLease}
					open={!!editLease}
					onClose={() => setEditLease(null)}
				/>
			)}

			{recalcLease && (
				<RecalcDialog
					lease={recalcLease}
					open={!!recalcLease}
					onClose={() => setRecalcLease(null)}
				/>
			)}
		</div>
	);
}
