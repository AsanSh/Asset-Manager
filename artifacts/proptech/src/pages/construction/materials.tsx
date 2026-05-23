import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
					<div className="grid grid-cols-2 gap-3">
						<div className="col-span-2">
							<Label>Название *</Label>
							<Input
								className="mt-1"
								value={form.name}
								onChange={(e) => set("name", e.target.value)}
								required
							/>
						</div>
						<div>
							<Label>Категория</Label>
							<Select
								value={form.category}
								onValueChange={(v) => set("category", v)}
							>
								<SelectTrigger className="mt-1">
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
						<div>
							<Label>Проект</Label>
							<Select
								value={form.projectId}
								onValueChange={(v) => set("projectId", v)}
							>
								<SelectTrigger className="mt-1">
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
						<div>
							<Label>Ед. измерения</Label>
							<Select value={form.unit} onValueChange={(v) => set("unit", v)}>
								<SelectTrigger className="mt-1">
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
						<div>
							<Label>Количество</Label>
							<Input
								className="mt-1"
								type="number"
								min="0"
								step="0.001"
								value={form.quantity}
								onChange={(e) => set("quantity", e.target.value)}
							/>
						</div>
						<div>
							<Label>Цена за ед.</Label>
							<Input
								className="mt-1"
								type="number"
								min="0"
								value={form.unitPrice}
								onChange={(e) => set("unitPrice", e.target.value)}
							/>
						</div>
						<div>
							<Label>Статус</Label>
							<Select
								value={form.status}
								onValueChange={(v) => set("status", v)}
							>
								<SelectTrigger className="mt-1">
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
	const [search, setSearch] = useState("");

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

	const filtered = materials.filter(
		(m) =>
			!search ||
			m.name.toLowerCase().includes(search.toLowerCase()) ||
			m.category?.toLowerCase().includes(search.toLowerCase()),
	);
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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Материалы</h1>
					<p className="text-sm text-gray-500 mt-0.5">
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

			<div className="grid grid-cols-3 gap-4">
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Позиций</p>
					<p className="text-2xl font-bold text-amber-600">
						{materials.length}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Доставлено</p>
					<p className="text-2xl font-bold text-emerald-600">
						{materials.filter((m) => m.status === "delivered").length}
					</p>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<p className="text-xs text-gray-500 mb-1">Общая сумма</p>
					<p className="text-xl font-bold text-blue-600">
						{fmtNum(totalCost)} ₸
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

			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div className="p-4 border-b border-gray-100">
					<Input
						placeholder="Поиск по названию или категории..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="max-w-sm"
					/>
				</div>
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Материал</TableHead>
							<TableHead>Категория</TableHead>
							<TableHead className="text-right">Кол-во</TableHead>
							<TableHead className="text-right">Цена за ед.</TableHead>
							<TableHead className="text-right">Итого</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead className="text-center">Действия</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 4 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 7 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : filtered.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="text-center py-12 text-gray-400"
								>
									<Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
									<p>Материалов нет</p>
								</TableCell>
							</TableRow>
						) : (
							filtered.map((m) => (
								<TableRow key={m.id} className="hover:bg-gray-50">
									<TableCell className="font-medium text-sm text-gray-900">
										{m.name}
									</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className="text-[10px] bg-amber-50 text-amber-700"
										>
											{m.category || "—"}
										</Badge>
									</TableCell>
									<TableCell className="text-right text-sm text-gray-600">
										{fmtNum(m.quantity)} {m.unit}
									</TableCell>
									<TableCell className="text-right text-sm text-gray-600">
										{fmtNum(m.unitPrice)} ₸
									</TableCell>
									<TableCell className="text-right text-sm font-semibold text-gray-800">
										{fmtNum(m.totalPrice)} ₸
									</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className={STATUS_CFG[m.status]?.color || ""}
										>
											{STATUS_CFG[m.status]?.label || m.status}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex gap-1 justify-center">
											<Button
												size="sm"
												variant="ghost"
												className="h-7 w-7 p-0"
												onClick={() => setDialog(m)}
											>
												<Edit2 className="w-3.5 h-3.5 text-gray-400" />
											</Button>
											<Button
												size="sm"
												variant="ghost"
												className="h-7 w-7 p-0"
												onClick={() => handleDelete(m.id)}
											>
												<Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

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
