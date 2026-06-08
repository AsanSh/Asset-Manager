import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Package, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
import { getApiBase } from "@/lib/api-base";

const BASE = getApiBase();
const ah = () => {
	const t = localStorage.getItem("auth_token");
	return {
		"Content-Type": "application/json",
		...(t ? { Authorization: `Bearer ${t}` } : {}),
	};
};

function fmtNum(v: string | number) {
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(
		parseFloat(String(v)) || 0,
	);
}

const CATS = [
	"Бетон",
	"Арматура",
	"Кирпич",
	"Блоки",
	"Дерево",
	"Металл",
	"Утеплитель",
	"Кровля",
	"Окна / двери",
	"Сантехника",
	"Электрика",
	"Отделочные",
	"Плитка",
	"Краска",
	"Прочее",
];
const UNITS = ["м³", "м²", "м.п.", "кг", "т", "шт", "л", "упак", "комп"];
const STATUS_CFG: Record<string, { label: string; color: string }> = {
	planned: { label: "Запланировано", color: "bg-gray-100 text-gray-700" },
	ordered: { label: "Заказано", color: "bg-blue-100 text-blue-700" },
	delivered: { label: "Доставлено", color: "bg-emerald-100 text-emerald-700" },
	used: { label: "Использовано", color: "bg-blue-100 text-blue-700" },
};

interface Material {
	id: number;
	projectId?: number;
	name: string;
	category?: string;
	unit: string;
	quantity: string;
	unitPrice: string;
	totalPrice: string;
	currency: string;
	status: string;
	deliveredAt?: string;
	notes?: string;
	createdAt: string;
}
interface Project {
	id: number;
	name: string;
}

function MaterialDialog({
	material,
	projects,
	onClose,
	onSaved,
}: {
	material: Material | null | "new";
	projects: Project[];
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = material && material !== "new";
	const init = isEdit ? (material as Material) : null;
	const [form, setForm] = useState({
		projectId: String(init?.projectId || projects[0]?.id || "none"),
		name: init?.name || "",
		category: init?.category || CATS[0],
		unit: init?.unit || "шт",
		quantity: init?.quantity || "",
		unitPrice: init?.unitPrice || "",
		currency: init?.currency || "KGS",
		status: init?.status || "planned",
		deliveredAt: init?.deliveredAt || "",
		notes: init?.notes || "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const total =
		parseFloat(form.quantity || "0") * parseFloat(form.unitPrice || "0");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name) {
			toast({ title: "Укажите название", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const url = isEdit
				? `${BASE}/construction/materials/${init?.id}`
				: `${BASE}/construction/materials`;
			await fetch(url, {
				method: isEdit ? "PATCH" : "POST",
				headers: ah(),
				body: JSON.stringify({
					...form,
					projectId: form.projectId && form.projectId !== "none" ? parseInt(form.projectId, 10) : null,
				}),
			});
			toast({ title: isEdit ? "Обновлено" : "Материал добавлен" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!material} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Редактировать материал" : "Добавить материал"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="sm:col-span-2 flex flex-col">
							<Label className="leading-tight mb-1.5">Название *</Label>
							<Input
								className="mt-auto"
								value={form.name}
								onChange={(e) => set("name", e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Категория</Label>
							<Select
								value={form.category}
								onValueChange={(v) => set("category", v)}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CATS.map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Проект</Label>
							<Select
								value={form.projectId}
								onValueChange={(v) => set("projectId", v)}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue placeholder="Не указан" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Без проекта</SelectItem>
									{projects.map((p) => (
										<SelectItem key={p.id} value={String(p.id)}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Ед. измерения</Label>
							<Select value={form.unit} onValueChange={(v) => set("unit", v)}>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{UNITS.map((u) => (
										<SelectItem key={u} value={u}>
											{u}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Количество</Label>
							<Input
								className="mt-auto"
								type="number"
								min="0"
								step="0.001"
								value={form.quantity}
								onChange={(e) => set("quantity", e.target.value)}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Цена за ед.</Label>
							<Input
								className="mt-auto"
								type="number"
								min="0"
								value={form.unitPrice}
								onChange={(e) => set("unitPrice", e.target.value)}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Статус</Label>
							<Select
								value={form.status}
								onValueChange={(v) => set("status", v)}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(STATUS_CFG).map(([k, v]) => (
										<SelectItem key={k} value={k}>
											{v.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					{total > 0 && (
						<div className="bg-amber-50 p-2.5 rounded-lg text-sm text-amber-700 font-medium">
							Итого: {fmtNum(total)} {form.currency}
						</div>
					)}
					{form.status === "delivered" && (
						<div>
							<Label>Дата поставки</Label>
							<Input
								className="mt-1"
								type="date"
								value={form.deliveredAt}
								onChange={(e) => set("deliveredAt", e.target.value)}
							/>
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
						<Button
							type="submit"
							className="bg-amber-500 hover:bg-orange-600"
							disabled={loading}
						>
							{loading ? "..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function ConstructionMaterials() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<Material | null | "new">(null);
	const [projectFilter, setProjectFilter] = useState("all");
	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: materials = [], isLoading } = useQuery<Material[]>({
		queryKey: ["construction-materials", projectFilter],
		queryFn: () =>
			api
				.get("/construction/materials", {
					params:
						projectFilter !== "all" ? { projectId: projectFilter } : undefined,
				})
				.then((r) => r.data),
	});

	const totalCost = materials.reduce(
		(s, m) => s + parseFloat(m.totalPrice || "0"),
		0,
	);

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить материал?")) return;
		await fetch(`${BASE}/construction/materials/${id}`, {
			method: "DELETE",
			headers: ah(),
		});
		toast({ title: "Удалено" });
		qc.invalidateQueries({ queryKey: ["construction-materials"] });
	};

	const columns = useMemo<ColumnDef<Material, unknown>[]>(
		() => [
			{
				id: "name",
				header: "Материал",
				size: 200,
				minSize: 140,
				maxSize: 400,
				accessorKey: "name",
				meta: { exportLabel: "Материал", grow: true },
				cell: ({ row }) => (
					<span className="font-medium truncate block" title={row.original.name}>
						{row.original.name}
					</span>
				),
			},
			{
				id: "category",
				header: "Категория",
				size: 130,
				accessorFn: (row) => row.category || "",
				meta: { exportLabel: "Категория" },
				cell: ({ row }) => (
					<Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700">
						{row.original.category || "—"}
					</Badge>
				),
			},
			{
				id: "quantity",
				header: "Кол-во",
				size: 100,
				accessorFn: (row) => parseFloat(row.quantity || "0"),
				meta: { exportLabel: "Кол-во", align: "right" },
				cell: ({ row }) => (
					<span className="tabular-nums">
						{fmtNum(row.original.quantity)} {row.original.unit}
					</span>
				),
			},
			{
				id: "unitPrice",
				header: "Цена за ед.",
				size: 110,
				accessorFn: (row) => parseFloat(row.unitPrice || "0"),
				meta: { exportLabel: "Цена за ед.", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span className="tabular-nums">{fmtNum(row.original.unitPrice)} сом</span>
				),
			},
			{
				id: "totalPrice",
				header: "Итого",
				size: 110,
				accessorFn: (row) => parseFloat(row.totalPrice || "0"),
				meta: { exportLabel: "Итого", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span className="tabular-nums font-semibold">
						{fmtNum(row.original.totalPrice)} сом
					</span>
				),
			},
			{
				id: "status",
				header: "Статус",
				size: 120,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge
						variant="secondary"
						className={STATUS_CFG[row.original.status]?.color || ""}
					>
						{STATUS_CFG[row.original.status]?.label || row.original.status}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "",
				size: 80,
				enableSorting: false,
				enableResizing: false,
				meta: { align: "center" },
				cell: ({ row }) => (
					<div className="flex gap-1 justify-center">
						<button
							type="button"
							onClick={() => setDialog(row.original)}
							className="text-am-text-subtle hover:text-am-text-strong p-1"
							title="Редактировать"
						>
							<Edit2 className="w-3.5 h-3.5" />
						</button>
						<button
							type="button"
							onClick={() => handleDelete(row.original.id)}
							className="text-am-text-subtle hover:text-rose-600 p-1"
							title="Удалить"
						>
							<Trash2 className="w-3.5 h-3.5" />
						</button>
					</div>
				),
			},
		],
		[],
	);

	return (
		<div className="am-page space-y-5">
			<div className="am-page-header">
				<div>
					<h1 className="am-page-title text-2xl">Материалы</h1>
					<p className="am-page-subtitle text-sm">
						Стройматериалы и поставки
					</p>
				</div>
				<Button
					onClick={() => setDialog("new")}
					className="bg-amber-500 hover:bg-orange-600 gap-2"
				>
					<Plus className="w-4 h-4" /> Добавить материал
				</Button>
			</div>

			<div className="am-kpi-grid">
				<div className="am-kpi-card">
					<p className="text-xs text-gray-500 mb-1">Позиций</p>
					<p className="text-2xl font-bold text-amber-600">
						{materials.length}
					</p>
				</div>
				<div className="am-kpi-card">
					<p className="text-xs text-gray-500 mb-1">Доставлено</p>
					<p className="text-2xl font-bold text-emerald-600">
						{materials.filter((m) => m.status === "delivered").length}
					</p>
				</div>
				<div className="am-kpi-card">
					<p className="text-xs text-gray-500 mb-1">Общая сумма</p>
					<p className="text-xl font-bold text-blue-600">
						{fmtNum(totalCost)} сом
					</p>
				</div>
			</div>

			<div className="flex gap-2 flex-wrap">
				<button
					onClick={() => setProjectFilter("all")}
					className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${projectFilter === "all" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
				>
					Все
				</button>
				{projects.map((p) => (
					<button
						key={p.id}
						onClick={() => setProjectFilter(String(p.id))}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${projectFilter === String(p.id) ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
					>
						{p.name}
					</button>
				))}
			</div>

			<DataTable
				tableId="construction-materials"
				columns={columns}
				data={materials}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по названию или категории…"
				initialSorting={[{ id: "name", desc: false }]}
				emptyState={
					<div className="flex flex-col items-center gap-2 py-8 text-am-text-muted">
						<Package className="w-10 h-10 opacity-30" />
						<p>Материалов нет</p>
					</div>
				}
			/>

			<MaterialDialog
				material={dialog}
				projects={projects}
				onClose={() => setDialog(null)}
				onSaved={() =>
					qc.invalidateQueries({ queryKey: ["construction-materials"] })
				}
			/>
		</div>
	);
}
