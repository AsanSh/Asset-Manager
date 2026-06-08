import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDistributionsQueryKey } from "@/lib/rental-query-keys";
import { BarChart2, CheckCircle2, Play, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { authFetch } from "@/lib/auth-fetch";
import { getApiErrorMessage } from "@/lib/api-error";
import { RentalQueryState } from "@/components/rental/rental-query-state";

function fmtCurrency(v: number | string) {
	const n = typeof v === "string" ? parseFloat(v) : v;
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(n || 0);
}

const statusColors: Record<string, string> = {
	pending: "bg-amber-100 text-amber-800",
	calculated: "bg-blue-100 text-blue-800",
	paid: "bg-emerald-100 text-emerald-800",
};
const statusLabels: Record<string, string> = {
	pending: "Ожидает",
	calculated: "Рассчитано",
	paid: "Выплачено",
};

interface Distribution {
	id: number;
	propertyId: number;
	period: string;
	grossIncome: string;
	expenses: string;
	netProfit: string;
	currency: string;
	status: string;
	notes?: string;
	createdAt: string;
	propertyName?: string;
	propertyUnit?: string;
}
interface Property {
	id: number;
	projectName: string;
	unitNumber: string;
}

function AddDialog({
	onClose,
	onSaved,
}: {
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const [form, setForm] = useState({
		propertyId: "",
		period: "",
		grossIncome: "",
		expenses: "",
		notes: "",
	});
	const [loading, setLoading] = useState(false);
	const { data: properties = [] } = useQuery<Property[]>({
		queryKey: ["properties"],
		queryFn: () => api.get("/properties").then((r) => r.data),
	});
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
	const gross = parseFloat(form.grossIncome || "0");
	const exp = parseFloat(form.expenses || "0");
	const net = gross - exp;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.propertyId || !form.period) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			await authFetch("/rental/distributions", {
				method: "POST",
				body: JSON.stringify({
					...form,
					propertyId: parseInt(form.propertyId, 10),
				}),
			});
			toast({ title: "Распределение добавлено" });
			onSaved();
			onClose();
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Добавить распределение прибыли</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div>
						<Label>Объект *</Label>
						<Select
							value={form.propertyId}
							onValueChange={(v) => set("propertyId", v)}
						>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите объект" />
							</SelectTrigger>
							<SelectContent>
								{properties.map((p) => (
									<SelectItem key={p.id} value={String(p.id)}>
										{p.projectName} — {p.unitNumber}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Период *</Label>
						<Input
							className="mt-1"
							value={form.period}
							onChange={(e) => set("period", e.target.value)}
							placeholder="2024 Q1 / Янв 2024–Мар 2024"
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Валовый доход (KGS)</Label>
							<Input
								className="mt-auto"
								type="number"
								min="0"
								value={form.grossIncome}
								onChange={(e) => set("grossIncome", e.target.value)}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Расходы (KGS)</Label>
							<Input
								className="mt-auto"
								type="number"
								min="0"
								value={form.expenses}
								onChange={(e) => set("expenses", e.target.value)}
							/>
						</div>
					</div>
					{(gross > 0 || exp > 0) && (
						<div
							className={`p-3 rounded-lg text-sm font-medium ${net >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
						>
							Чистая прибыль: {fmtCurrency(net)}
						</div>
					)}
					<div>
						<Label>Заметки</Label>
						<Input
							className="mt-1"
							value={form.notes}
							onChange={(e) => set("notes", e.target.value)}
						/>
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
							Отмена
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Сохранение..." : "Добавить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function Distributions() {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [showAdd, setShowAdd] = useState(false);

	const { data: distributions = [], isLoading, isError, error, refetch } = useQuery<Distribution[]>({
		queryKey: getDistributionsQueryKey(),
		queryFn: () => api.get("/rental/distributions").then((r) => r.data),
	});

	const totalNet = distributions.reduce(
		(s, d) => s + parseFloat(d.netProfit || "0"),
		0,
	);
	const pendingNet = distributions
		.filter((d) => d.status !== "paid")
		.reduce((s, d) => s + parseFloat(d.netProfit || "0"), 0);

	const updateStatus = useCallback(async (id: number, status: string) => {
		try {
			await authFetch(`/rental/distributions/${id}/status`, {
				method: "PATCH",
				body: JSON.stringify({ status }),
			});
			toast({
				title: status === "paid" ? "Отмечено как выплачено" : "Статус обновлён",
			});
			queryClient.invalidateQueries({ queryKey: getDistributionsQueryKey() });
		} catch (e: unknown) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" });
		}
	}, [queryClient, toast]);

	const handleDelete = useCallback(async (id: number) => {
		if (!confirm("Удалить запись?")) return;
		try {
			await authFetch(`/rental/distributions/${id}`, { method: "DELETE" });
			toast({ title: "Удалено" });
			queryClient.invalidateQueries({ queryKey: getDistributionsQueryKey() });
		} catch (e: unknown) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" });
		}
	}, [queryClient, toast]);

	const columns = useMemo<ColumnDef<Distribution, unknown>[]>(
		() => [
			{
				id: "property",
				header: "Объект",
				size: 180,
				accessorFn: (row) => row.propertyName || "",
				meta: { exportLabel: "Объект", pinned: "left" },
				cell: ({ row }) => (
					<div>
						<p className="font-medium text-sm">{row.original.propertyName || "—"}</p>
						{row.original.propertyUnit && (
							<p className="text-xs text-muted-foreground">
								ед. {row.original.propertyUnit}
							</p>
						)}
					</div>
				),
			},
			{
				accessorKey: "period",
				header: "Период",
				size: 110,
				meta: { exportLabel: "Период" },
				cell: ({ row }) => (
					<span className="font-medium">{row.original.period}</span>
				),
			},
			{
				id: "grossIncome",
				header: "Валовый доход",
				size: 130,
				accessorFn: (row) => parseFloat(row.grossIncome || "0"),
				meta: { exportLabel: "Валовый доход", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono">{fmtCurrency(row.original.grossIncome)}</span>
				),
			},
			{
				id: "expenses",
				header: "Расходы",
				size: 120,
				accessorFn: (row) => parseFloat(row.expenses || "0"),
				meta: { exportLabel: "Расходы", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-rose-600">
						{fmtCurrency(row.original.expenses)}
					</span>
				),
			},
			{
				id: "netProfit",
				header: "Чистая прибыль",
				size: 130,
				accessorFn: (row) => parseFloat(row.netProfit || "0"),
				meta: { exportLabel: "Чистая прибыль", align: "right" },
				cell: ({ row }) => {
					const net = parseFloat(row.original.netProfit);
					return (
						<span
							className={`font-mono font-semibold ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}
						>
							{fmtCurrency(net)}
						</span>
					);
				},
			},
			{
				id: "status",
				header: "Статус",
				size: 120,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge className={statusColors[row.original.status] || ""} variant="secondary">
						{statusLabels[row.original.status] || row.original.status}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "",
				size: 160,
				enableSorting: false,
				meta: { align: "center" },
				cell: ({ row }) => (
					<div className="flex gap-1 justify-center">
						{row.original.status === "pending" && (
							<Button
								size="sm"
								variant="outline"
								className="h-7 px-2 text-xs border-blue-300 text-blue-700"
								onClick={() => updateStatus(row.original.id, "calculated")}
							>
								<Play className="w-3 h-3 mr-1" /> Рассчитать
							</Button>
						)}
						{row.original.status === "calculated" && (
							<Button
								size="sm"
								variant="outline"
								className="h-7 px-2 text-xs border-green-300 text-emerald-700"
								onClick={() => updateStatus(row.original.id, "paid")}
							>
								<CheckCircle2 className="w-3 h-3 mr-1" /> Выплачено
							</Button>
						)}
						<Button
							size="sm"
							variant="ghost"
							className="h-7 w-7 p-0"
							onClick={() => handleDelete(row.original.id)}
						>
							<Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-rose-600" />
						</Button>
					</div>
				),
			},
		],
		[handleDelete, updateStatus],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Распределение прибыли
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Доходы, расходы и выплаты владельцам по объектам
					</p>
				</div>
				<Button onClick={() => setShowAdd(true)} className="gap-2">
					<Plus className="w-4 h-4" /> Объявить прибыль
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Всего периодов</p>
					<p className="text-2xl font-bold text-blue-600">
						{distributions.length}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Суммарная прибыль</p>
					<p className="text-lg font-bold text-emerald-600">
						{fmtCurrency(totalNet)}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Ожидает выплаты</p>
					<p className="text-lg font-bold text-amber-600">
						{fmtCurrency(pendingNet)}
					</p>
				</div>
			</div>

			<RentalQueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
				<DataTable
					tableId="rental-distributions"
					columns={columns}
					data={distributions}
					isLoading={isLoading}
					enableSearch
					searchPlaceholder="Поиск по объекту, периоду…"
					initialSorting={[{ id: "period", desc: true }]}
					emptyState={
						<div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
							<BarChart2 className="w-10 h-10 opacity-30" />
							<span>Записей о прибыли пока нет</span>
						</div>
					}
				/>
			</RentalQueryState>

			{showAdd && (
				<AddDialog
					onClose={() => setShowAdd(false)}
					onSaved={() =>
						queryClient.invalidateQueries({ queryKey: getDistributionsQueryKey() })
					}
				/>
			)}
		</div>
	);
}
