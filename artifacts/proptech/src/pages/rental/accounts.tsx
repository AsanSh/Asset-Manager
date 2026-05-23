import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	ArrowRightLeft,
	Building2,
	CreditCard,
	Pencil,
	Plus,
	RefreshCw,
	Trash2,
	Wallet,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
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
import { api } from "@/lib/api";

const typeLabels: Record<string, string> = {
	bank: "Банковский счёт",
	cash: "Касса",
	card: "Карта",
};
const typeColors: Record<string, string> = {
	bank: "bg-blue-100 text-blue-800",
	cash: "bg-emerald-100 text-emerald-800",
	card: "bg-blue-100 text-indigo-800",
};
const typeIcons: Record<string, ReactNode> = {
	bank: <Building2 className="w-4 h-4" />,
	cash: <Wallet className="w-4 h-4" />,
	card: <CreditCard className="w-4 h-4" />,
};

function fmt(n: string | number | null | undefined, currency = "KGS") {
	const v = parseFloat(String(n || "0"));
	if (Number.isNaN(v)) return "0";
	return (
		new Intl.NumberFormat("ru-KG", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(v) +
		" " +
		currency
	);
}

const emptyForm = {
	name: "",
	type: "bank",
	bank: "",
	bik: "",
	accountNumber: "",
	currency: "KGS",
	openingBalance: "0",
	notes: "",
};

const emptyTransfer = {
	fromAccountId: "",
	toAccountId: "",
	amount: "",
	date: new Date().toISOString().split("T")[0],
	note: "",
};

export default function RentalAccounts() {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [transferOpen, setTransferOpen] = useState(false);
	const [editing, setEditing] = useState<any>(null);
	const [form, setForm] = useState(emptyForm);
	const [transfer, setTransfer] = useState(emptyTransfer);
	const [nbkrRates, setNbkrRates] = useState<
		Record<string, { rate: string; scale: string }>
	>({});
	const [loadingRates, setLoadingRates] = useState(false);
	const [loading, setLoading] = useState(false);
	const [deleting, setDeleting] = useState<number | null>(null);

	const { data: accounts = [], isLoading } = useQuery<any[]>({
		queryKey: ["rental-accounts"],
		queryFn: () => api.get("/rental/accounts").then((r) => r.data),
	});

	const totalBalance = accounts
		.filter((a) => a.currency === "KGS")
		.reduce((s, a) => s + parseFloat(a.currentBalance || "0"), 0);

	// Fetch NBKR rates when transfer dialog opens
	useEffect(() => {
		if (!transferOpen) return;
		setLoadingRates(true);
		api
			.get("/nbkr/rates")
			.then((r) => {
				setNbkrRates(r.data.rates || {});
			})
			.catch(() => {})
			.finally(() => setLoadingRates(false));
	}, [transferOpen]);

	const fromAcc = accounts.find((a) => String(a.id) === transfer.fromAccountId);
	const toAcc = accounts.find((a) => String(a.id) === transfer.toAccountId);
	const diffCurrency = fromAcc && toAcc && fromAcc.currency !== toAcc.currency;

	// Compute exchange rate for display
	function getRate(): number | null {
		if (!fromAcc || !toAcc || !diffCurrency) return null;
		const fromCur = fromAcc.currency;
		const toCur = toAcc.currency;
		if (fromCur === "KGS") {
			const r = nbkrRates[toCur];
			if (r) return parseFloat(r.scale) / parseFloat(r.rate);
		} else if (toCur === "KGS") {
			const r = nbkrRates[fromCur];
			if (r) return parseFloat(r.rate) / parseFloat(r.scale);
		}
		return null;
	}

	const rate = getRate();
	const creditAmount =
		transfer.amount && rate
			? (parseFloat(transfer.amount) * rate).toFixed(2)
			: transfer.amount;

	function openCreate() {
		setEditing(null);
		setForm(emptyForm);
		setOpen(true);
	}
	function openEdit(acc: any) {
		setEditing(acc);
		setForm({
			name: acc.name || "",
			type: acc.type || "bank",
			bank: acc.bank || "",
			bik: acc.bik || "",
			accountNumber: acc.accountNumber || "",
			currency: acc.currency || "KGS",
			openingBalance: acc.openingBalance || "0",
			notes: acc.notes || "",
		});
		setOpen(true);
	}

	async function handleSave() {
		if (!form.name.trim()) {
			toast({ title: "Введите название счёта", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			if (editing) {
				await api.patch(`/rental/accounts/${editing.id}`, form);
				toast({ title: "Счёт обновлён" });
			} else {
				await api.post("/rental/accounts", form);
				toast({ title: "Счёт создан" });
			}
			queryClient.invalidateQueries({ queryKey: ["rental-accounts"] });
			setOpen(false);
		} catch {
			toast({ title: "Ошибка при сохранении", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	}

	async function handleDelete(id: number) {
		if (!confirm("Удалить расчётный счёт?")) return;
		setDeleting(id);
		try {
			await api.delete(`/rental/accounts/${id}`);
			queryClient.invalidateQueries({ queryKey: ["rental-accounts"] });
			toast({ title: "Счёт удалён" });
		} catch {
			toast({ title: "Ошибка при удалении", variant: "destructive" });
		} finally {
			setDeleting(null);
		}
	}

	async function handleTransfer() {
		if (!transfer.fromAccountId || !transfer.toAccountId || !transfer.amount) {
			toast({ title: "Заполните все поля перевода", variant: "destructive" });
			return;
		}
		if (transfer.fromAccountId === transfer.toAccountId) {
			toast({ title: "Выберите разные счета", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			await api.post("/rental/accounts/transfer", {
				fromAccountId: parseInt(transfer.fromAccountId, 10),
				toAccountId: parseInt(transfer.toAccountId, 10),
				amount: parseFloat(transfer.amount),
				rate: rate || undefined,
				date: transfer.date,
				note: transfer.note,
			});
			queryClient.invalidateQueries({ queryKey: ["rental-accounts"] });
			toast({
				title: "Перевод выполнен",
				description: `${fmt(transfer.amount, fromAcc?.currency)} → ${fmt(creditAmount, toAcc?.currency)}`,
			});
			setTransferOpen(false);
			setTransfer(emptyTransfer);
		} catch (e: any) {
			toast({
				title: "Ошибка перевода",
				description: e?.response?.data?.error || "Попробуйте снова",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Расчётные счета</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Только модуль «Аренда» — счета строительства и других модулей не видны
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => setTransferOpen(true)}
						className="gap-2"
					>
						<ArrowRightLeft className="w-4 h-4" /> Перевод
					</Button>
					<Button onClick={openCreate} className="gap-2">
						<Plus className="w-4 h-4" /> Добавить счёт
					</Button>
				</div>
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div className="bg-white border rounded-xl p-4">
					<p className="text-sm text-gray-500">Всего счетов</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">
						{accounts.length}
					</p>
				</div>
				<div className="bg-white border rounded-xl p-4">
					<p className="text-sm text-gray-500">Суммарный баланс (KGS)</p>
					<p className="text-2xl font-bold text-emerald-600 mt-1">
						{fmt(totalBalance, "KGS")}
					</p>
				</div>
				<div className="bg-white border rounded-xl p-4">
					<p className="text-sm text-gray-500">Активных счетов</p>
					<p className="text-2xl font-bold text-blue-600 mt-1">
						{
							accounts.filter((a) => parseFloat(a.currentBalance || "0") > 0)
								.length
						}
					</p>
				</div>
			</div>

			<div className="bg-white border rounded-xl overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Название</TableHead>
							<TableHead>Тип</TableHead>
							<TableHead>Банк</TableHead>
							<TableHead>Номер счёта</TableHead>
							<TableHead>Валюта</TableHead>
							<TableHead className="text-right">Баланс</TableHead>
							<TableHead className="w-20"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 3 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 7 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : accounts.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="text-center py-12 text-gray-400"
								>
									<Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
									<p className="text-sm">
										Нет расчётных счетов. Добавьте первый.
									</p>
								</TableCell>
							</TableRow>
						) : (
							accounts.map((acc) => (
								<TableRow key={acc.id} className="hover:bg-gray-50">
									<TableCell>
										<div className="flex items-center gap-2 font-medium text-gray-900">
											{typeIcons[acc.type] || typeIcons.bank}
											{acc.name}
										</div>
										{acc.notes && (
											<p className="text-xs text-gray-400 mt-0.5 ml-6">
												{acc.notes}
											</p>
										)}
									</TableCell>
									<TableCell>
										<Badge className={typeColors[acc.type] || typeColors.bank}>
											{typeLabels[acc.type] || acc.type}
										</Badge>
									</TableCell>
									<TableCell className="text-gray-600">
										{acc.bank || "—"}
									</TableCell>
									<TableCell className="font-mono text-sm text-gray-600">
										{acc.accountNumber || "—"}
									</TableCell>
									<TableCell>
										{acc.currency !== "KGS" ? (
											<Badge
												variant="outline"
												className="text-amber-700 border-amber-300 bg-amber-50"
											>
												{acc.currency}
											</Badge>
										) : (
											<span className="text-gray-600">{acc.currency}</span>
										)}
									</TableCell>
									<TableCell className="text-right font-semibold">
										<span
											className={
												parseFloat(acc.currentBalance || "0") >= 0
													? "text-emerald-600"
													: "text-rose-600"
											}
										>
											{fmt(acc.currentBalance, acc.currency)}
										</span>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1 justify-end">
											<Button
												variant="ghost"
												size="sm"
												className="h-7 w-7 p-0"
												onClick={() => openEdit(acc)}
											>
												<Pencil className="w-3.5 h-3.5 text-gray-400" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="h-7 w-7 p-0"
												disabled={deleting === acc.id}
												onClick={() => handleDelete(acc.id)}
											>
												<Trash2 className="w-3.5 h-3.5 text-rose-600" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Create/Edit dialog */}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editing ? "Редактировать счёт" : "Добавить расчётный счёт"}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div>
							<Label className="text-sm font-medium">Название *</Label>
							<Input
								className="mt-1.5"
								placeholder="Основной счёт"
								value={form.name}
								onChange={(e) =>
									setForm((f) => ({ ...f, name: e.target.value }))
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label className="text-sm font-medium">Тип</Label>
								<Select
									value={form.type}
									onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
								>
									<SelectTrigger className="mt-1.5">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="bank">Банковский счёт</SelectItem>
										<SelectItem value="cash">Касса</SelectItem>
										<SelectItem value="card">Карта</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label className="text-sm font-medium">Валюта</Label>
								<Select
									value={form.currency}
									onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
								>
									<SelectTrigger className="mt-1.5">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="KGS">KGS (сом)</SelectItem>
										<SelectItem value="USD">USD (доллар)</SelectItem>
										<SelectItem value="EUR">EUR (евро)</SelectItem>
										<SelectItem value="RUB">RUB (рубль)</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						{form.type === "bank" && (
							<>
								<div>
									<Label className="text-sm font-medium">Банк</Label>
									<Input
										className="mt-1.5"
										placeholder="Мбанк, KICB, ОАО Банк..."
										value={form.bank}
										onChange={(e) =>
											setForm((f) => ({ ...f, bank: e.target.value }))
										}
									/>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<Label className="text-sm font-medium">БИК</Label>
										<Input
											className="mt-1.5"
											placeholder="109001"
											value={form.bik}
											onChange={(e) =>
												setForm((f) => ({ ...f, bik: e.target.value }))
											}
										/>
									</div>
									<div>
										<Label className="text-sm font-medium">Номер счёта</Label>
										<Input
											className="mt-1.5"
											placeholder="1020000012345678"
											value={form.accountNumber}
											onChange={(e) =>
												setForm((f) => ({
													...f,
													accountNumber: e.target.value,
												}))
											}
										/>
									</div>
								</div>
							</>
						)}
						<div>
							<Label className="text-sm font-medium">
								{editing ? "Начальный баланс" : "Начальный остаток"}
							</Label>
							<Input
								className="mt-1.5"
								type="number"
								placeholder="0"
								value={form.openingBalance}
								onChange={(e) =>
									setForm((f) => ({ ...f, openingBalance: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label className="text-sm font-medium">Примечание</Label>
							<Input
								className="mt-1.5"
								placeholder="Необязательно"
								value={form.notes}
								onChange={(e) =>
									setForm((f) => ({ ...f, notes: e.target.value }))
								}
							/>
						</div>
						<div className="flex gap-2 pt-2">
							<Button
								onClick={handleSave}
								disabled={loading}
								className="flex-1"
							>
								{loading ? "Сохранение..." : editing ? "Сохранить" : "Добавить"}
							</Button>
							<Button variant="outline" onClick={() => setOpen(false)}>
								Отмена
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Transfer dialog */}
			<Dialog open={transferOpen} onOpenChange={setTransferOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<ArrowRightLeft className="w-4 h-4 text-blue-600" /> Перевод между
							счетами
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label className="text-sm font-medium">Со счёта *</Label>
								<Select
									value={transfer.fromAccountId}
									onValueChange={(v) =>
										setTransfer((t) => ({ ...t, fromAccountId: v }))
									}
								>
									<SelectTrigger className="mt-1.5">
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
								{fromAcc && (
									<p className="text-xs text-gray-400 mt-1">
										Баланс: {fmt(fromAcc.currentBalance, fromAcc.currency)}
									</p>
								)}
							</div>
							<div>
								<Label className="text-sm font-medium">На счёт *</Label>
								<Select
									value={transfer.toAccountId}
									onValueChange={(v) =>
										setTransfer((t) => ({ ...t, toAccountId: v }))
									}
								>
									<SelectTrigger className="mt-1.5">
										<SelectValue placeholder="Выберите счёт" />
									</SelectTrigger>
									<SelectContent>
										{accounts
											.filter((a) => String(a.id) !== transfer.fromAccountId)
											.map((a) => (
												<SelectItem key={a.id} value={String(a.id)}>
													{a.name} ({a.currency})
												</SelectItem>
											))}
									</SelectContent>
								</Select>
								{toAcc && (
									<p className="text-xs text-gray-400 mt-1">
										Баланс: {fmt(toAcc.currentBalance, toAcc.currency)}
									</p>
								)}
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label className="text-sm font-medium">
									Сумма * {fromAcc && `(${fromAcc.currency})`}
								</Label>
								<Input
									className="mt-1.5"
									type="number"
									step="0.01"
									placeholder="0"
									value={transfer.amount}
									onChange={(e) =>
										setTransfer((t) => ({ ...t, amount: e.target.value }))
									}
								/>
							</div>
							<div>
								<Label className="text-sm font-medium">Дата перевода</Label>
								<Input
									className="mt-1.5"
									type="date"
									value={transfer.date}
									onChange={(e) =>
										setTransfer((t) => ({ ...t, date: e.target.value }))
									}
								/>
							</div>
						</div>

						{/* NBKR rate display */}
						{diffCurrency && (
							<div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
								{loadingRates ? (
									<div className="flex items-center gap-2 text-xs text-blue-600">
										<RefreshCw className="w-3.5 h-3.5 animate-spin" /> Загрузка
										курса НБКР...
									</div>
								) : rate ? (
									<>
										<p className="text-xs font-semibold text-blue-700 mb-1">
											Курс НБКР на сегодня:
										</p>
										<div className="flex items-center justify-between text-sm">
											<span className="text-blue-600">
												1 {fromAcc?.currency} = {rate.toFixed(4)}{" "}
												{toAcc?.currency}
											</span>
											{transfer.amount && (
												<span className="font-bold text-blue-800">
													{fmt(transfer.amount, fromAcc?.currency)} ={" "}
													{fmt(creditAmount, toAcc?.currency)}
												</span>
											)}
										</div>
									</>
								) : (
									<div className="flex items-center gap-2 text-xs text-amber-600">
										<AlertCircle className="w-3.5 h-3.5" /> Курс НБКР недоступен
										— используется курс 1:1
									</div>
								)}
							</div>
						)}

						<div>
							<Label className="text-sm font-medium">Примечание</Label>
							<Input
								className="mt-1.5"
								placeholder="Перевод в кассу"
								value={transfer.note}
								onChange={(e) =>
									setTransfer((t) => ({ ...t, note: e.target.value }))
								}
							/>
						</div>

						<div className="flex gap-2 pt-2">
							<Button
								onClick={handleTransfer}
								disabled={loading}
								className="flex-1 gap-2"
							>
								<ArrowRightLeft className="w-4 h-4" />
								{loading ? "Выполнение..." : "Перевести"}
							</Button>
							<Button variant="outline" onClick={() => setTransferOpen(false)}>
								Отмена
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
