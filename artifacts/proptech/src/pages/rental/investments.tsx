import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PieChart, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
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

function fmtCurrency(v: number | string) {
	const n = typeof v === "string" ? parseFloat(v) : v;
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(n || 0);
}

interface Investment {
	id: number;
	propertyId: number;
	investorId: number;
	sharePercent: string;
	capitalInvested: string;
	currency: string;
	investedAt?: string;
	notes?: string;
	createdAt: string;
	propertyName?: string;
	propertyUnit?: string;
	investorName?: string;
	investorPhone?: string;
}
interface Investor {
	id: number;
	fullName: string;
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
		investorId: "",
		sharePercent: "",
		capitalInvested: "",
		investedAt: "",
		notes: "",
	});
	const [loading, setLoading] = useState(false);

	const { data: investors = [] } = useQuery<Investor[]>({
		queryKey: ["investors"],
		queryFn: () => api.get("/rental/investors").then((r) => r.data),
	});
	const { data: properties = [] } = useQuery<Property[]>({
		queryKey: ["properties"],
		queryFn: () => api.get("/properties").then((r) => r.data),
	});

	const investorsArray = Array.isArray(investors) ? investors : [];
	const propertiesArray = Array.isArray(properties) ? properties : [];

	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.propertyId || !form.investorId || !form.sharePercent) {
			toast({ title: "Заполните обязательные поля", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			await authFetch("/rental/investments", {
				method: "POST",
				body: JSON.stringify({
					...form,
					propertyId: parseInt(form.propertyId, 10),
					investorId: parseInt(form.investorId, 10),
				}),
			});
			toast({ title: "Доля добавлена" });
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
					<DialogTitle>Добавить долю</DialogTitle>
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
								{propertiesArray.map((p) => (
									<SelectItem key={p.id} value={String(p.id)}>
										{p.projectName} — {p.unitNumber}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Владелец *</Label>
						<Select
							value={form.investorId}
							onValueChange={(v) => set("investorId", v)}
						>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Выберите владельца" />
							</SelectTrigger>
							<SelectContent>
								{investorsArray.map((i) => (
									<SelectItem key={i.id} value={String(i.id)}>
										{i.fullName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Доля (%) *</Label>
							<Input
								className="mt-auto"
								type="number"
								min="0.01"
								max="100"
								step="0.01"
								value={form.sharePercent}
								onChange={(e) => set("sharePercent", e.target.value)}
								placeholder="25.00"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Вложено (KGS)</Label>
							<Input
								className="mt-auto"
								type="number"
								min="0"
								value={form.capitalInvested}
								onChange={(e) => set("capitalInvested", e.target.value)}
								placeholder="5 000 000"
							/>
						</div>
					</div>
					<div>
						<Label>Дата инвестиции</Label>
						<Input
							className="mt-1"
							type="date"
							value={form.investedAt}
							onChange={(e) => set("investedAt", e.target.value)}
						/>
					</div>
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

export default function Investments() {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [showAdd, setShowAdd] = useState(false);

	const { data: investments = [], isLoading } = useQuery<Investment[]>({
		queryKey: ["investments"],
		queryFn: () => api.get("/rental/investments").then((r) => r.data),
	});

	const investmentsArray = Array.isArray(investments) ? investments : [];
	const totalCapital = investmentsArray.reduce(
		(s, i) => s + (parseFloat(i.capitalInvested || "0") || 0),
		0,
	);

	const handleDelete = useCallback(async (id: number) => {
		if (!confirm("Удалить инвестицию?")) return;
		try {
			await authFetch(`/rental/investments/${id}`, { method: "DELETE" });
			toast({ title: "Запись удалена" });
			queryClient.invalidateQueries({ queryKey: ["investments"] });
		} catch (e: unknown) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" });
		}
	}, [queryClient, toast]);

	const columns = useMemo<ColumnDef<Investment, unknown>[]>(
		() => [
			{
				id: "property",
				header: "Объект",
				size: 180,
				accessorFn: (row) =>
					`${row.propertyName || ""} ${row.propertyUnit || ""}`.trim(),
				meta: { exportLabel: "Объект", pinned: "left" },
				cell: ({ row }) => (
					<div>
						<p className="font-medium text-sm">
							{row.original.propertyName || "—"}
						</p>
						{row.original.propertyUnit && (
							<p className="text-xs text-muted-foreground">
								ед. {row.original.propertyUnit}
							</p>
						)}
					</div>
				),
			},
			{
				id: "investor",
				header: "Владелец",
				size: 160,
				accessorFn: (row) => row.investorName || `#${row.investorId}`,
				meta: { exportLabel: "Владелец" },
				cell: ({ row }) => (
					<div>
						<p className="font-medium text-sm">
							{row.original.investorName || `#${row.original.investorId}`}
						</p>
						{row.original.investorPhone && (
							<p className="text-xs text-muted-foreground">
								{row.original.investorPhone}
							</p>
						)}
					</div>
				),
			},
			{
				id: "sharePercent",
				header: "Доля",
				size: 140,
				accessorFn: (row) => parseFloat(row.sharePercent || "0"),
				meta: { exportLabel: "Доля (%)", align: "right" },
				cell: ({ row }) => {
					const pct = parseFloat(row.original.sharePercent);
					return (
						<div className="flex items-center justify-end gap-1.5">
							<div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
								<div
									className="h-full bg-blue-600 rounded-full"
									style={{ width: `${Math.min(100, pct)}%` }}
								/>
							</div>
							<span className="font-semibold text-blue-600 text-sm font-mono">
								{pct}%
							</span>
						</div>
					);
				},
			},
			{
				id: "capitalInvested",
				header: "Вложено",
				size: 130,
				accessorFn: (row) => parseFloat(row.capitalInvested || "0"),
				meta: { exportLabel: "Вложено", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-medium text-emerald-600">
						{fmtCurrency(row.original.capitalInvested)}
					</span>
				),
			},
			{
				id: "investedAt",
				header: "Дата",
				size: 110,
				accessorFn: (row) => row.investedAt || "",
				meta: { exportLabel: "Дата" },
				cell: ({ row }) =>
					row.original.investedAt
						? new Date(row.original.investedAt).toLocaleDateString("ru-KG")
						: "—",
			},
			{
				id: "actions",
				header: "",
				size: 60,
				enableSorting: false,
				meta: { exportLabel: "Удалить", align: "center" },
				cell: ({ row }) => (
					<Button
						size="sm"
						variant="ghost"
						className="h-7 w-7 p-0"
						onClick={() => handleDelete(row.original.id)}
					>
						<Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-rose-600" />
					</Button>
				),
			},
		],
		[handleDelete],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Доли владения</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Доли владельцев в объектах недвижимости
					</p>
				</div>
				<Button onClick={() => setShowAdd(true)} className="gap-2">
					<Plus className="w-4 h-4" /> Добавить долю
				</Button>
			</div>

			{/* Stats */}
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Всего инвестиций</p>
					<p className="text-2xl font-bold text-blue-600">
						{investmentsArray.length}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Уникальных объектов</p>
					<p className="text-2xl font-bold text-indigo-600">
						{new Set(investmentsArray.map((i) => i.propertyId)).size}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Общий капитал</p>
					<p className="text-xl font-bold text-emerald-600">
						{fmtCurrency(totalCapital)}
					</p>
				</div>
			</div>

			<DataTable
				tableId="rental-investments"
				columns={columns}
				data={investmentsArray}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по объекту, владельцу…"
				initialSorting={[{ id: "investedAt", desc: true }]}
				emptyState={
					<div className="flex flex-col items-center gap-2 text-muted-foreground">
						<PieChart className="w-10 h-10 opacity-30" />
						<span>Инвестиций пока нет</span>
					</div>
				}
			/>

			{showAdd && (
				<AddDialog
					onClose={() => setShowAdd(false)}
					onSaved={() =>
						queryClient.invalidateQueries({ queryKey: ["investments"] })
					}
				/>
			)}
		</div>
	);
}
