import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface WarehouseItem {
	id: number;
	name: string;
	category: string;
	unit: string;
	currentStock: number;
	minStock: number;
	maxStock: number;
	unitPrice: number;
	currency: string;
	supplier: string;
	sku?: string;
	barcode?: string;
	location?: string;
	description?: string;
}

function formatCurrency(amount: number, currency: string = "KGS") {
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(amount);
}

function formatNumber(num: number) {
	return new Intl.NumberFormat("ru-KG").format(num);
}

interface ItemDialogProps {
	open: boolean;
	onClose: () => void;
	item?: WarehouseItem | null;
}

function ItemDialog({ open, onClose, item }: ItemDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);

	const [formData, setFormData] = useState({
		name: item?.name || "",
		category: item?.category || "",
		unit: item?.unit || "шт",
		currentStock: item?.currentStock?.toString() || "0",
		minStock: item?.minStock?.toString() || "0",
		maxStock: item?.maxStock?.toString() || "0",
		unitPrice: item?.unitPrice?.toString() || "0",
		currency: item?.currency || "KGS",
		supplier: item?.supplier || "",
		sku: item?.sku || "",
		barcode: item?.barcode || "",
		location: item?.location || "",
		description: item?.description || "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const payload = {
				name: formData.name,
				category: formData.category,
				unit: formData.unit,
				currentStock: parseFloat(formData.currentStock),
				minStock: parseFloat(formData.minStock),
				maxStock: parseFloat(formData.maxStock),
				unitPrice: parseFloat(formData.unitPrice),
				currency: formData.currency,
				supplier: formData.supplier,
				sku: formData.sku || null,
				barcode: formData.barcode || null,
				location: formData.location || null,
				description: formData.description || null,
			};

			if (item) {
				await api.patch(`/warehouse/items/${item.id}`, payload);
				toast({ title: "Позиция обновлена" });
			} else {
				await api.post("/warehouse/items", payload);
				toast({ title: "Позиция создана" });
			}
			queryClient.invalidateQueries({ queryKey: ["warehouse-items"] });
			onClose();
		} catch (error: any) {
			toast({
				title: "Ошибка",
				description: error.message || "Не удалось сохранить позицию",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{item ? "Редактировать позицию" : "Новая позиция"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="col-span-2">
							<Label>Наименование *</Label>
							<Input
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="Цемент М500"
								required
							/>
						</div>
						<div>
							<Label>Категория *</Label>
							<Input
								value={formData.category}
								onChange={(e) =>
									setFormData({ ...formData, category: e.target.value })
								}
								placeholder="Стройматериалы"
								required
							/>
						</div>
						<div>
							<Label>Единица измерения *</Label>
							<Select
								value={formData.unit}
								onValueChange={(v) => setFormData({ ...formData, unit: v })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="шт">Штуки (шт)</SelectItem>
									<SelectItem value="кг">Килограммы (кг)</SelectItem>
									<SelectItem value="м">Метры (м)</SelectItem>
									<SelectItem value="м²">Квадратные метры (м²)</SelectItem>
									<SelectItem value="м³">Кубические метры (м³)</SelectItem>
									<SelectItem value="л">Литры (л)</SelectItem>
									<SelectItem value="упак">Упаковка (упак)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div>
							<Label>Текущий остаток *</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.currentStock}
								onChange={(e) =>
									setFormData({ ...formData, currentStock: e.target.value })
								}
								required
							/>
						</div>
						<div>
							<Label>Минимум</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.minStock}
								onChange={(e) =>
									setFormData({ ...formData, minStock: e.target.value })
								}
							/>
						</div>
						<div>
							<Label>Максимум</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.maxStock}
								onChange={(e) =>
									setFormData({ ...formData, maxStock: e.target.value })
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="col-span-2">
							<Label>Цена за единицу *</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.unitPrice}
								onChange={(e) =>
									setFormData({ ...formData, unitPrice: e.target.value })
								}
								required
							/>
						</div>
						<div>
							<Label>Валюта</Label>
							<Select
								value={formData.currency}
								onValueChange={(v) => setFormData({ ...formData, currency: v })}
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

					<div>
						<Label>Поставщик *</Label>
						<Input
							value={formData.supplier}
							onChange={(e) =>
								setFormData({ ...formData, supplier: e.target.value })
							}
							placeholder="ООО 'СтройТорг'"
							required
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Артикул (SKU)</Label>
							<Input
								value={formData.sku}
								onChange={(e) =>
									setFormData({ ...formData, sku: e.target.value })
								}
								placeholder="SKU-12345"
							/>
						</div>
						<div>
							<Label>Штрихкод</Label>
							<Input
								value={formData.barcode}
								onChange={(e) =>
									setFormData({ ...formData, barcode: e.target.value })
								}
								placeholder="1234567890123"
							/>
						</div>
					</div>

					<div>
						<Label>Место хранения</Label>
						<Input
							value={formData.location}
							onChange={(e) =>
								setFormData({ ...formData, location: e.target.value })
							}
							placeholder="Склад А, стеллаж 3, полка 2"
						/>
					</div>

					<div>
						<Label>Описание</Label>
						<Textarea
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							placeholder="Дополнительная информация о товаре"
							rows={3}
						/>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Сохранение..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function WarehouseItems() {
	const { data: items, isLoading } = useQuery<WarehouseItem[]>({
		queryKey: ["warehouse-items"],
		queryFn: () => api.get("/warehouse/items").then((r) => r.data),
	});

	const itemsArray = Array.isArray(items) ? items : [];
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editItem, setEditItem] = useState<WarehouseItem | null>(null);
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean;
		item: WarehouseItem | null;
	}>({
		open: false,
		item: null,
	});

	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [stockFilter, setStockFilter] = useState("all");

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/warehouse/items/${id}`),
		onSuccess: () => {
			toast({ title: "Позиция удалена" });
			queryClient.invalidateQueries({ queryKey: ["warehouse-items"] });
			setDeleteDialog({ open: false, item: null });
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message || "Не удалось удалить позицию",
				variant: "destructive",
			});
		},
	});

	const categories = Array.from(
		new Set(itemsArray.map((item) => item.category)),
	).sort();

	const filteredItems = itemsArray.filter((item) => {
		const matchesSearch =
			search === "" ||
			item.name.toLowerCase().includes(search.toLowerCase()) ||
			item.sku?.toLowerCase().includes(search.toLowerCase()) ||
			item.barcode?.toLowerCase().includes(search.toLowerCase());

		const matchesCategory =
			categoryFilter === "all" || item.category === categoryFilter;

		const matchesStock =
			stockFilter === "all" ||
			(stockFilter === "low" && item.currentStock < item.minStock) ||
			(stockFilter === "in_stock" && item.currentStock >= item.minStock);

		return matchesSearch && matchesCategory && matchesStock;
	});

	return (
		<div className="p-6 space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Товары на складе</h1>
					<p className="text-muted-foreground text-sm">
						Управление складскими позициями
					</p>
				</div>
				<Button
					onClick={() => {
						setEditItem(null);
						setDialogOpen(true);
					}}
				>
					<Plus className="w-4 h-4 mr-2" />
					Добавить
				</Button>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-3">
				<div className="flex-1 min-w-[200px] max-w-sm">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Поиск по названию, SKU, штрихкоду..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
				</div>
				<Select value={categoryFilter} onValueChange={setCategoryFilter}>
					<SelectTrigger className="w-[200px]">
						<SelectValue placeholder="Категория" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все категории</SelectItem>
						{categories.map((cat) => (
							<SelectItem key={cat} value={cat}>
								{cat}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={stockFilter} onValueChange={setStockFilter}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Остаток" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все</SelectItem>
						<SelectItem value="in_stock">В наличии</SelectItem>
						<SelectItem value="low">Низкий остаток</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Наименование</TableHead>
							<TableHead>Категория</TableHead>
							<TableHead className="text-right">Остаток</TableHead>
							<TableHead className="text-right">Мин/Макс</TableHead>
							<TableHead className="text-right">Цена</TableHead>
							<TableHead>Поставщик</TableHead>
							<TableHead>Место</TableHead>
							<TableHead className="text-right">Действия</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 8 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : !filteredItems.length ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="text-center text-muted-foreground py-8"
								>
									{search || categoryFilter !== "all" || stockFilter !== "all"
										? "Ничего не найдено"
										: "Нет товаров на складе"}
								</TableCell>
							</TableRow>
						) : (
							filteredItems.map((item) => (
								<TableRow key={item.id}>
									<TableCell>
										<div className="flex items-center gap-2">
											<span className="font-medium">{item.name}</span>
											{item.currentStock < item.minStock && (
												<Badge variant="destructive" className="gap-1">
													<AlertTriangle className="h-3 w-3" />
													Низкий
												</Badge>
											)}
										</div>
										{item.sku && (
											<div className="text-xs text-muted-foreground">
												SKU: {item.sku}
											</div>
										)}
									</TableCell>
									<TableCell>
										<Badge variant="outline">{item.category}</Badge>
									</TableCell>
									<TableCell className="text-right">
										<span
											className={
												item.currentStock < item.minStock
													? "text-rose-600 font-semibold"
													: ""
											}
										>
											{formatNumber(item.currentStock)} {item.unit}
										</span>
									</TableCell>
									<TableCell className="text-right text-sm text-muted-foreground">
										{formatNumber(item.minStock)} /{" "}
										{formatNumber(item.maxStock)}
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatCurrency(item.unitPrice, item.currency)}
									</TableCell>
									<TableCell className="text-sm">{item.supplier}</TableCell>
									<TableCell className="text-sm">
										{item.location || "—"}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													setEditItem(item);
													setDialogOpen(true);
												}}
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setDeleteDialog({ open: true, item })}
											>
												<Trash2 className="h-4 w-4 text-rose-600" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<ItemDialog
				open={dialogOpen}
				onClose={() => {
					setDialogOpen(false);
					setEditItem(null);
				}}
				item={editItem}
			/>

			<AlertDialog
				open={deleteDialog.open}
				onOpenChange={(v) => !v && setDeleteDialog({ open: false, item: null })}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить позицию?</AlertDialogTitle>
						<AlertDialogDescription>
							Вы уверены, что хотите удалить "{deleteDialog.item?.name}"? Это
							действие нельзя отменить.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								deleteDialog.item && deleteMutation.mutate(deleteDialog.item.id)
							}
							className="bg-rose-600 hover:bg-rose-700"
						>
							Удалить
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
