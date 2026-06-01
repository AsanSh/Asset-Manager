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
import { Building2, Pencil, Plus, Receipt, Tag, Trash2, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import {
	getListExpensesQueryKey,
	useListExpenses,
	useListProperties,
} from "@/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { RentalQueryState } from "@/components/rental/rental-query-state";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const categoryLabels: Record<string, string> = {
	maintenance: "Обслуживание",
	utilities: "Коммунальные услуги",
	management_fee: "Управляющая компания",
	cleaning: "Уборка",
	repair: "Ремонт",
	other: "Прочее",
};

function formatCurrency(amount: number | string, currency: string) {
	const num = typeof amount === "string" ? parseFloat(amount) : amount;
	const cur = currency === "KGS" ? "KGS" : currency === "USD" ? "USD" : "KGS";
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: cur,
	}).format(num);
}

function formatDate(date: string) {
	return new Date(date).toLocaleDateString("ru-KG");
}

interface ExpenseDialogProps {
	open: boolean;
	expense?: any | null;
	onClose: () => void;
}

const emptyForm = {
	propertyId: "",
	category: "maintenance",
	amount: "",
	currency: "KGS",
	expenseDate: new Date().toISOString().split("T")[0],
	accountId: "",
	description: "",
};

function ExpenseDialog({ open, expense, onClose }: ExpenseDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const { data: properties } = useListProperties();
	const propertiesArray = Array.isArray(properties) ? properties : [];
	const [loading, setLoading] = useState(false);
	const isEdit = !!expense;

	const { data: accounts = [] } = useQuery<any[]>({
		queryKey: getRentalAccountsQueryKey(),
		queryFn: () => api.get("/rental/accounts").then((r) => r.data),
	});

	const accountsArray = Array.isArray(accounts) ? accounts : [];

	const [formData, setFormData] = useState(emptyForm);

	useEffect(() => {
		if (!open) return;
		if (expense) {
			setFormData({
				propertyId: String(expense.propertyId),
				category: expense.category || "maintenance",
				amount: String(expense.amount ?? ""),
				currency: expense.currency || "KGS",
				expenseDate: expense.expenseDate?.slice(0, 10) || new Date().toISOString().split("T")[0],
				accountId: expense.accountId ? String(expense.accountId) : "",
				description: expense.description || "",
			});
		} else {
			setFormData({
				...emptyForm,
				expenseDate: new Date().toISOString().split("T")[0],
				accountId: accountsArray[0] ? String(accountsArray[0].id) : "",
			});
		}
	}, [open, expense, accountsArray]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.accountId) {
			toast({
				title: "Выберите расчётный счёт",
				description: "Операция должна быть привязана к счёту",
				variant: "destructive",
			});
			return;
		}
		setLoading(true);
		try {
			const payload = {
				propertyId: parseInt(formData.propertyId, 10),
				category: formData.category,
				amount: parseFloat(formData.amount),
				currency: formData.currency,
				expenseDate: formData.expenseDate,
				accountId: parseInt(formData.accountId, 10),
				description: formData.description || null,
			};
			if (isEdit) {
				await api.patch(`/rental/expenses/${expense.id}`, payload);
				toast({ title: "Расход обновлён" });
			} else {
				await api.post("/rental/expenses", payload);
				toast({ title: "Расход зарегистрирован" });
			}
			queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
			queryClient.invalidateQueries({ queryKey: getRentalAccountsQueryKey() });
			onClose();
		} catch {
			toast({
				title: "Ошибка",
				description: isEdit ? "Не удалось обновить расход" : "Не удалось сохранить расход",
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
					<DialogTitle>{isEdit ? "Редактировать расход" : "Добавить расход"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label>Объект *</Label>
						<Select
							value={formData.propertyId}
							onValueChange={(v) => setFormData({ ...formData, propertyId: v })}
						>
							<SelectTrigger>
								<SelectValue placeholder="Выберите объект" />
							</SelectTrigger>
							<SelectContent>
								{propertiesArray.map((p) => (
									<SelectItem key={p.id} value={String(p.id)}>
										{p.projectName} — {p.unitNumber}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Категория *</Label>
						<Select
							value={formData.category}
							onValueChange={(v) => setFormData({ ...formData, category: v })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(categoryLabels).map(([k, v]) => (
									<SelectItem key={k} value={k}>
										{v}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid grid-cols-3 gap-3">
						<div className="col-span-2 flex flex-col">
							<Label className="leading-tight mb-1.5">Сумма *</Label>
							<Input
								className="mt-auto"
								type="number"
								value={formData.amount}
								onChange={(e) =>
									setFormData({ ...formData, amount: e.target.value })
								}
								placeholder="50000"
								required
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Валюта</Label>
							<Select
								value={formData.currency}
								onValueChange={(v) => setFormData({ ...formData, currency: v })}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="KGS">Сом (KGS)</SelectItem>
									<SelectItem value="USD">Доллар (USD)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div>
						<Label>Дата *</Label>
						<Input
							type="date"
							value={formData.expenseDate}
							onChange={(e) =>
								setFormData({ ...formData, expenseDate: e.target.value })
							}
							required
						/>
					</div>
					<div>
						<Label>Расчётный счёт *</Label>
						<Select
							value={formData.accountId}
							onValueChange={(v) =>
								setFormData({ ...formData, accountId: v })
							}
							required
						>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите счёт" />
							</SelectTrigger>
							<SelectContent>
								{accountsArray.length === 0 ? (
									<SelectItem value="_empty" disabled>
										Сначала создайте счёт в разделе «Расчётные счета»
									</SelectItem>
								) : (
									accountsArray.map((a: any) => (
										<SelectItem key={a.id} value={String(a.id)}>
											{a.name}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Описание</Label>
						<Input
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							placeholder="Замена батарей, плановое ТО"
						/>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={loading || !formData.accountId}>
							{loading ? "Сохранение..." : isEdit ? "Сохранить" : "Добавить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function Expenses() {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const { data: expenses, isLoading, isError, error, refetch } = useListExpenses();
	const { data: properties } = useListProperties();
	const propertiesArray = Array.isArray(properties) ? properties : [];
	const expensesArray = Array.isArray(expenses) ? expenses : [];
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingExpense, setEditingExpense] = useState<any | null>(null);
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());

	const openCreate = () => {
		setEditingExpense(null);
		setDialogOpen(true);
	};

	const openEdit = (expense: any) => {
		setEditingExpense(expense);
		setDialogOpen(true);
	};

	const closeDialog = () => {
		setDialogOpen(false);
		setEditingExpense(null);
	};

	const handleDelete = useCallback(async (expense: any) => {
		if (!confirm(`Удалить расход ${formatCurrency(expense.amount, expense.currency)} от ${formatDate(expense.expenseDate)}?`)) return;
		try {
			await api.delete(`/rental/expenses/${expense.id}`);
			toast({ title: "Расход удалён" });
			queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
			queryClient.invalidateQueries({ queryKey: getRentalAccountsQueryKey() });
		} catch {
			toast({ title: "Ошибка", description: "Не удалось удалить расход", variant: "destructive" });
		}
	}, [queryClient, toast]);

	const ExpenseActions = ({ expense }: { expense: any }) => (
		<div className="flex items-center justify-center gap-0.5">
			<button
				type="button"
				title="Редактировать"
				onClick={() => openEdit(expense)}
				className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
			>
				<Pencil className="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				title="Удалить"
				onClick={() => handleDelete(expense)}
				className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
			>
				<Trash2 className="w-3.5 h-3.5" />
			</button>
		</div>
	);

	const propertyLabel = useMemo(() => {
		const map: Record<number, string> = {};
		for (const p of propertiesArray) {
			map[p.id] = `${p.projectName || ""} ${p.unitNumber || ""}`.trim() || `Объект #${p.id}`;
		}
		return map;
	}, [propertiesArray]);

	const filteredExpenses = expensesArray.filter((e) => inPeriod(e.expenseDate, period));
	const enriched = useMemo(
		() =>
			filteredExpenses.map((e) => ({
				...e,
				propertyLabel: propertyLabel[e.propertyId] || `Объект #${e.propertyId}`,
				categoryLabel: categoryLabels[e.category] || e.category,
			})),
		[filteredExpenses, propertyLabel],
	);
	const totalAmount = filteredExpenses.reduce((s, e) => s + parseFloat(String(e.amount || "0")), 0);
	const categoriesCount = new Set(filteredExpenses.map((e) => e.category)).size;

	type EnrichedExpense = (typeof enriched)[number];

	const tableColumns = useMemo<ColumnDef<EnrichedExpense, unknown>[]>(
		() => [
			{
				id: "propertyLabel",
				header: "Объект",
				size: 180,
				accessorFn: (row) => row.propertyLabel,
				meta: { exportLabel: "Объект", pinned: "left" },
				cell: ({ row }) => row.original.propertyLabel,
			},
			{
				id: "categoryLabel",
				header: "Категория",
				size: 140,
				accessorFn: (row) => row.categoryLabel,
				meta: { exportLabel: "Категория" },
				cell: ({ row }) => row.original.categoryLabel,
			},
			{
				id: "expenseDate",
				header: "Дата",
				size: 110,
				accessorFn: (row) => row.expenseDate,
				meta: { exportLabel: "Дата", pinned: "left" },
				cell: ({ row }) => formatDate(row.original.expenseDate),
			},
			{
				id: "amount",
				header: "Сумма",
				size: 130,
				accessorFn: (row) => parseFloat(String(row.amount || "0")),
				meta: { exportLabel: "Сумма", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-medium text-rose-700">
						{formatCurrency(row.original.amount, row.original.currency)}
					</span>
				),
			},
			{
				id: "description",
				header: "Описание",
				size: 180,
				accessorFn: (row) => row.description || "",
				meta: { exportLabel: "Описание" },
				cell: ({ row }) => row.original.description || "—",
			},
			{
				id: "actions",
				header: "",
				size: 80,
				enableSorting: false,
				meta: { align: "center" },
				cell: ({ row }) => <ExpenseActions expense={row.original} />,
			},
		],
		[],
	);

	return (
		<div className="p-6 space-y-3">
			<KpiRow>
				<KpiCard variant="strip" label="Расходов" value={filteredExpenses.length} sub="за период" icon={Receipt} color="blue" loading={isLoading} />
				<KpiCard variant="strip" label="Сумма" value={new Intl.NumberFormat("ru-RU").format(totalAmount)} sub="KGS экв." icon={Wallet} color="red" loading={isLoading} />
				<KpiCard variant="strip" label="Категорий" value={categoriesCount} sub="уникальных" icon={Tag} color="purple" loading={isLoading} />
				<KpiCard variant="strip" label="Объектов" value={new Set(filteredExpenses.map((e) => e.propertyId)).size} sub="с расходами" icon={Building2} color="green" loading={isLoading} />
			</KpiRow>

			<div className="flex justify-between items-center flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold">Расходы</h1>
					<p className="text-muted-foreground text-sm">
						Учёт расходов по объектам
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={openCreate}>
						<Plus className="w-4 h-4 mr-2" />
						Добавить
					</Button>
				</div>
			</div>

			<div className="flex items-center justify-between flex-wrap gap-2">
				<PeriodPicker value={period} onChange={setPeriod} />
				<p className="text-xs text-gray-500">{enriched.length} записей</p>
			</div>

			<RentalQueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
			<DataTable
					tableId="rental-expenses"
					columns={tableColumns}
					data={enriched}
					isLoading={isLoading}
					enableSearch
					searchPlaceholder="Поиск по объекту, категории, описанию…"
					initialSorting={[{ id: "expenseDate", desc: true }]}
					emptyState="Расходы не найдены"
					footer={
						!isLoading && filteredExpenses.length > 0 ? (
							<tr className="bg-gray-50 font-semibold border-t-2">
								<td colSpan={3} className="px-3 py-2 text-sm text-gray-600">
									Итого: {filteredExpenses.length} расходов
								</td>
								<td className="px-3 py-2 text-sm font-mono text-right tabular-nums text-rose-700">
									{new Intl.NumberFormat("ru-KG").format(totalAmount)}
								</td>
								<td colSpan={2} />
							</tr>
						) : undefined
					}
				/>
			</RentalQueryState>

			<ExpenseDialog open={dialogOpen} expense={editingExpense} onClose={closeDialog} />
		</div>
	);
}
