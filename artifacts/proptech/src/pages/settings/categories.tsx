import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Building2,
	ChevronDown,
	ChevronRight,
	Globe,
	HardHat,
	Layers,
	LayoutGrid,
	Pencil,
	Plus,
	Trash2,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Category {
	id: number;
	companyId: number;
	name: string;
	type: string;
	parentId: number | null;
	module: string;
	color: string | null;
	sortOrder: number;
	isActive: boolean;
}

const MODULE_LABELS: Record<string, string> = {
	all: "Все модули",
	rental: "Аренда",
	construction: "Строительство",
	proptech: "ПропТех",
	warehouse: "Склад",
};
const MODULE_ICONS: Record<string, React.ReactNode> = {
	all: <Globe className="w-3.5 h-3.5" />,
	rental: <Building2 className="w-3.5 h-3.5" />,
	construction: <HardHat className="w-3.5 h-3.5" />,
	proptech: <LayoutGrid className="w-3.5 h-3.5" />,
	warehouse: <Layers className="w-3.5 h-3.5" />,
};

const COLORS = [
	"#4F46E5",
	"#0EA5E9",
	"#10B981",
	"#F59E0B",
	"#EF4444",
	"#8B5CF6",
	"#EC4899",
	"#14B8A6",
	"#F97316",
	"#6366F1",
	"#84CC16",
	"#06B6D4",
];

function CategoryForm({
	cat,
	parentId,
	onClose,
	onSaved,
}: {
	cat?: Category | null;
	parentId?: number | null;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const [form, setForm] = useState({
		name: cat?.name ?? "",
		type: cat?.type ?? "expense",
		parentId: cat?.parentId ?? parentId ?? null,
		module: cat?.module ?? "all",
		color: cat?.color ?? COLORS[0],
		sortOrder: cat?.sortOrder ?? 0,
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name.trim()) {
			toast({ title: "Введите название", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			if (cat) {
				await api.patch(`/categories/${cat.id}`, form);
				toast({ title: "Статья обновлена" });
			} else {
				await api.post("/categories", form);
				toast({ title: "Статья добавлена" });
			}
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка сохранения", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSave} className="space-y-4 pt-2">
			<div>
				<Label className="text-xs text-gray-600 mb-1.5 block">
					Название статьи *
				</Label>
				<Input
					value={form.name}
					onChange={(e) => set("name", e.target.value)}
					placeholder="Например: Аренда жилых помещений"
					className="h-9"
				/>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<Label className="text-xs text-gray-600 mb-1.5 block">Тип</Label>
					<Select value={form.type} onValueChange={(v) => set("type", v)}>
						<SelectTrigger className="h-9">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="income">Доход</SelectItem>
							<SelectItem value="expense">Расход</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div>
					<Label className="text-xs text-gray-600 mb-1.5 block">Модуль</Label>
					<Select value={form.module} onValueChange={(v) => set("module", v)}>
						<SelectTrigger className="h-9">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(MODULE_LABELS).map(([k, v]) => (
								<SelectItem key={k} value={k}>
									{v}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<div>
				<Label className="text-xs text-gray-600 mb-1.5 block">
					Порядок сортировки
				</Label>
				<Input
					type="number"
					value={form.sortOrder}
					onChange={(e) => set("sortOrder", parseInt(e.target.value, 10) || 0)}
					className="h-9 w-32"
				/>
			</div>
			<div>
				<Label className="text-xs text-gray-600 mb-1.5 block">Цвет</Label>
				<div className="flex gap-2 flex-wrap">
					{COLORS.map((c) => (
						<button
							key={c}
							type="button"
							onClick={() => set("color", c)}
							className={`w-7 h-7 rounded-lg transition-transform ${form.color === c ? "ring-2 ring-offset-1 ring-blue-500 scale-110" : "hover:scale-105"}`}
							style={{ background: c }}
						/>
					))}
				</div>
			</div>
			<div className="flex justify-end gap-2 pt-2 border-t">
				<Button type="button" variant="outline" size="sm" onClick={onClose}>
					Отмена
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={loading}
					className="bg-blue-600 hover:bg-blue-700"
				>
					{loading ? "Сохранение..." : cat ? "Обновить" : "Добавить"}
				</Button>
			</div>
		</form>
	);
}

function CategoryRow({
	cat,
	children,
	onEdit,
	onDelete,
	onAddChild,
	level = 0,
}: {
	cat: Category;
	children?: Category[];
	onEdit: (c: Category) => void;
	onDelete: (c: Category) => void;
	onAddChild: (parentId: number, type: string) => void;
	level?: number;
}) {
	const [expanded, setExpanded] = useState(true);
	const hasChildren = children && children.length > 0;
	return (
		<div>
			<div
				className={`flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-gray-50 group transition-colors ${level === 0 ? "bg-gray-50/50 border border-gray-100 mb-1" : ""}`}
				style={{ paddingLeft: `${12 + level * 20}px` }}
			>
				<button
					className="w-5 h-5 flex items-center justify-center flex-shrink-0"
					onClick={() => setExpanded((v) => !v)}
				>
					{hasChildren ? (
						expanded ? (
							<ChevronDown className="w-3.5 h-3.5 text-gray-400" />
						) : (
							<ChevronRight className="w-3.5 h-3.5 text-gray-400" />
						)
					) : (
						<div className="w-3.5 h-3.5" />
					)}
				</button>
				<div
					className="w-2.5 h-2.5 rounded-full flex-shrink-0"
					style={{ background: cat.color || "#94a3b8" }}
				/>
				<span
					className={`flex-1 text-sm ${level === 0 ? "font-semibold text-gray-800" : "text-gray-700"}`}
				>
					{cat.name}
				</span>
				<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded flex items-center gap-1">
						{MODULE_ICONS[cat.module]} {MODULE_LABELS[cat.module]}
					</span>
					<button
						onClick={() => onAddChild(cat.id, cat.type)}
						className="p-1 hover:bg-blue-100 text-blue-600 rounded-md"
						title="Добавить подстатью"
					>
						<Plus className="w-3.5 h-3.5" />
					</button>
					<button
						onClick={() => onEdit(cat)}
						className="p-1 hover:bg-gray-200 rounded-md"
					>
						<Pencil className="w-3.5 h-3.5 text-gray-500" />
					</button>
					<button
						onClick={() => onDelete(cat)}
						className="p-1 hover:bg-rose-100 rounded-md"
					>
						<Trash2 className="w-3.5 h-3.5 text-rose-600" />
					</button>
				</div>
				<Badge
					variant="outline"
					className={`text-[10px] flex-shrink-0 ${cat.type === "income" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200"}`}
				>
					{cat.type === "income" ? "Доход" : "Расход"}
				</Badge>
			</div>
			{hasChildren && expanded && (
				<div className="ml-2">
					{children?.map((child) => (
						<CategoryRow
							key={child.id}
							cat={child}
							onEdit={onEdit}
							onDelete={onDelete}
							onAddChild={onAddChild}
							level={level + 1}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export default function SettingsCategories() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<Category | null | undefined>(
		undefined,
	);
	const [newParentId, setNewParentId] = useState<number | null>(null);
	const [_newType, setNewType] = useState<string>("expense");
	const [filterType, setFilterType] = useState<string>("all");
	const [filterModule, setFilterModule] = useState<string>("all");

	const { data: categories = [], isLoading } = useQuery<Category[]>({
		queryKey: ["financial-categories"],
		queryFn: () => api.get("/categories").then((r) => r.data),
	});

	function openNew(type: string, parentId?: number | null) {
		setEditing(null);
		setNewParentId(parentId ?? null);
		setNewType(type);
		setDialogOpen(true);
	}

	function openEdit(cat: Category) {
		setEditing(cat);
		setDialogOpen(true);
	}

	async function handleDelete(cat: Category) {
		if (!confirm(`Удалить статью "${cat.name}"?`)) return;
		try {
			await api.delete(`/categories/${cat.id}`);
			toast({ title: "Статья удалена" });
			qc.invalidateQueries({ queryKey: ["financial-categories"] });
		} catch {
			toast({ title: "Ошибка удаления", variant: "destructive" });
		}
	}

	const filtered = categories.filter((c) => {
		if (filterType !== "all" && c.type !== filterType) return false;
		if (
			filterModule !== "all" &&
			c.module !== filterModule &&
			c.module !== "all"
		)
			return false;
		return true;
	});

	// Build tree
	const roots = filtered.filter((c) => !c.parentId);
	const childrenOf = (parentId: number) =>
		filtered.filter((c) => c.parentId === parentId);

	const incomeRoots = roots.filter((c) => c.type === "income");
	const expenseRoots = roots.filter((c) => c.type === "expense");

	return (
		<div className="p-6 max-w-5xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-xl font-bold text-gray-900">
						Статьи доходов и расходов
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Категории используются в ОПУ и ОДДС для группировки операций
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						onClick={() => openNew("income")}
						size="sm"
						variant="outline"
						className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5"
					>
						<TrendingUp className="w-4 h-4" /> Добавить доход
					</Button>
					<Button
						onClick={() => openNew("expense")}
						size="sm"
						className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
					>
						<TrendingDown className="w-4 h-4" /> Добавить расход
					</Button>
				</div>
			</div>

			{/* Filters */}
			<div className="flex gap-3 mb-5">
				<div className="flex bg-gray-100 rounded-lg p-1 gap-1">
					{[
						["all", "Все"],
						["income", "Доходы"],
						["expense", "Расходы"],
					].map(([v, l]) => (
						<button
							key={v}
							onClick={() => setFilterType(v)}
							className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterType === v ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
						>
							{l}
						</button>
					))}
				</div>
				<div className="flex bg-gray-100 rounded-lg p-1 gap-1">
					{Object.entries(MODULE_LABELS).map(([v, l]) => (
						<button
							key={v}
							onClick={() => setFilterModule(v)}
							className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${filterModule === v ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
						>
							{MODULE_ICONS[v]} {l}
						</button>
					))}
				</div>
			</div>

			{isLoading ? (
				<div className="text-center py-16 text-gray-400 text-sm">
					Загрузка...
				</div>
			) : (
				<div className="space-y-6">
					{/* Income section */}
					{(filterType === "all" || filterType === "income") && (
						<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
							<div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-100">
								<div className="flex items-center gap-2">
									<TrendingUp className="w-4 h-4 text-emerald-600" />
									<span className="text-sm font-semibold text-emerald-800">
										Статьи доходов
									</span>
									<span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
										{incomeRoots.length}
									</span>
								</div>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => openNew("income")}
									className="text-emerald-700 hover:bg-emerald-100 h-7 text-xs gap-1"
								>
									<Plus className="w-3.5 h-3.5" /> Добавить
								</Button>
							</div>
							<div className="p-3 space-y-1">
								{incomeRoots.length === 0 ? (
									<div className="text-center py-6 text-gray-400 text-sm">
										Нет статей доходов.{" "}
										<button
											onClick={() => openNew("income")}
											className="text-blue-600 hover:underline"
										>
											Добавить первую
										</button>
									</div>
								) : (
									incomeRoots.map((cat) => (
										<CategoryRow
											key={cat.id}
											cat={cat}
											children={childrenOf(cat.id)}
											onEdit={openEdit}
											onDelete={handleDelete}
											onAddChild={(pid, type) => openNew(type, pid)}
										/>
									))
								)}
							</div>
						</div>
					)}

					{/* Expense section */}
					{(filterType === "all" || filterType === "expense") && (
						<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
							<div className="flex items-center justify-between px-4 py-3 bg-rose-50 border-b border-rose-100">
								<div className="flex items-center gap-2">
									<TrendingDown className="w-4 h-4 text-rose-600" />
									<span className="text-sm font-semibold text-rose-800">
										Статьи расходов
									</span>
									<span className="text-xs bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">
										{expenseRoots.length}
									</span>
								</div>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => openNew("expense")}
									className="text-rose-600 hover:bg-rose-100 h-7 text-xs gap-1"
								>
									<Plus className="w-3.5 h-3.5" /> Добавить
								</Button>
							</div>
							<div className="p-3 space-y-1">
								{expenseRoots.length === 0 ? (
									<div className="text-center py-6 text-gray-400 text-sm">
										Нет статей расходов.{" "}
										<button
											onClick={() => openNew("expense")}
											className="text-blue-600 hover:underline"
										>
											Добавить первую
										</button>
									</div>
								) : (
									expenseRoots.map((cat) => (
										<CategoryRow
											key={cat.id}
											cat={cat}
											children={childrenOf(cat.id)}
											onEdit={openEdit}
											onDelete={handleDelete}
											onAddChild={(pid, type) => openNew(type, pid)}
										/>
									))
								)}
							</div>
						</div>
					)}
				</div>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editing ? "Редактировать статью" : "Новая статья"}
						</DialogTitle>
					</DialogHeader>
					<CategoryForm
						cat={editing}
						parentId={newParentId}
						onClose={() => setDialogOpen(false)}
						onSaved={() =>
							qc.invalidateQueries({ queryKey: ["financial-categories"] })
						}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}
