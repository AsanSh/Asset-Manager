import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
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

interface IncomingOperation {
	id: number;
	date: string;
	itemId: number;
	itemName: string;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
	currency: string;
	supplierId?: number;
	supplierName?: string;
	documentNumber?: string;
	note?: string;
}

interface WarehouseItem {
	id: number;
	name: string;
	category: string;
	unit: string;
	currentStock: number;
	unitPrice: number;
	currency: string;
}

interface Supplier {
	id: number;
	name: string;
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

function formatDate(date: string) {
	return new Date(date).toLocaleDateString("ru-KG", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

interface IncomingDialogProps {
	open: boolean;
	onClose: () => void;
}

function IncomingDialog({ open, onClose }: IncomingDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);

	const { data: items } = useQuery<WarehouseItem[]>({
		queryKey: ["warehouse-items"],
		queryFn: () => api.get("/warehouse/items").then((r) => r.data),
	});

	const { data: suppliers } = useQuery<Supplier[]>({
		queryKey: ["warehouse-suppliers"],
		queryFn: () => api.get("/warehouse/suppliers").then((r) => r.data),
	});

	const itemsArray = Array.isArray(items) ? items : [];
	const suppliersArray = Array.isArray(suppliers) ? suppliers : [];

	const [formData, setFormData] = useState({
		date: new Date().toISOString().split("T")[0],
		itemId: "",
		quantity: "",
		unitPrice: "",
		supplierId: "",
		documentNumber: "",
		note: "",
	});

	const selectedItem = itemsArray.find(
		(item) => item.id === parseInt(formData.itemId, 10),
	);

	const totalPrice = selectedItem
		? parseFloat(formData.quantity || "0") *
			parseFloat(formData.unitPrice || "0")
		: 0;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			await api.post("/warehouse/incoming", {
				date: formData.date,
				itemId: parseInt(formData.itemId, 10),
				quantity: parseFloat(formData.quantity),
				unitPrice: parseFloat(formData.unitPrice),
				supplierId: formData.supplierId ? parseInt(formData.supplierId, 10) : null,
				documentNumber: formData.documentNumber || null,
				note: formData.note || null,
			});
			toast({
				title: "Приход товара оформлен",
				description: "Остатки обновлены",
			});
			queryClient.invalidateQueries({ queryKey: ["warehouse-incoming"] });
			queryClient.invalidateQueries({ queryKey: ["warehouse-items"] });
			queryClient.invalidateQueries({ queryKey: ["warehouse-dashboard"] });
			onClose();
			setFormData({
				date: new Date().toISOString().split("T")[0],
				itemId: "",
				quantity: "",
				unitPrice: "",
				supplierId: "",
				documentNumber: "",
				note: "",
			});
		} catch (error: any) {
			toast({
				title: "Ошибка",
				description: error.message || "Не удалось оформить приход",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Оформить приход товара</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label>Дата *</Label>
						<Input
							type="date"
							value={formData.date}
							onChange={(e) =>
								setFormData({ ...formData, date: e.target.value })
							}
							required
						/>
					</div>

					<div>
						<Label>Товар *</Label>
						<Select
							value={formData.itemId}
							onValueChange={(v) => {
								const item = itemsArray.find((i) => i.id === parseInt(v, 10));
								setFormData({
									...formData,
									itemId: v,
									unitPrice: item?.unitPrice.toString() || "",
								});
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Выберите товар" />
							</SelectTrigger>
							<SelectContent>
								{itemsArray.map((item) => (
									<SelectItem key={item.id} value={String(item.id)}>
										{item.name} ({item.unit})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{selectedItem && (
						<div className="p-3 bg-muted rounded-lg text-sm space-y-1">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Текущий остаток:</span>
								<span className="font-medium">
									{formatNumber(selectedItem.currentStock)} {selectedItem.unit}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Текущая цена:</span>
								<span className="font-medium">
									{formatCurrency(
										selectedItem.unitPrice,
										selectedItem.currency,
									)}
								</span>
							</div>
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Количество *</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.quantity}
								onChange={(e) =>
									setFormData({ ...formData, quantity: e.target.value })
								}
								placeholder="100"
								required
							/>
						</div>
						<div>
							<Label>Цена за единицу *</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.unitPrice}
								onChange={(e) =>
									setFormData({ ...formData, unitPrice: e.target.value })
								}
								placeholder="250.00"
								required
							/>
						</div>
					</div>

					{totalPrice > 0 && selectedItem && (
						<div className="p-3 bg-primary/10 rounded-lg">
							<div className="flex justify-between items-center">
								<span className="font-medium">Общая стоимость:</span>
								<span className="text-lg font-bold">
									{formatCurrency(totalPrice, selectedItem.currency)}
								</span>
							</div>
						</div>
					)}

					<div>
						<Label>Поставщик</Label>
						<Select
							value={formData.supplierId}
							onValueChange={(v) => setFormData({ ...formData, supplierId: v })}
						>
							<SelectTrigger>
								<SelectValue placeholder="Выберите поставщика (необязательно)" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">— Не указан —</SelectItem>
								{suppliersArray.map((supplier) => (
									<SelectItem key={supplier.id} value={String(supplier.id)}>
										{supplier.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label>Номер документа</Label>
						<Input
							value={formData.documentNumber}
							onChange={(e) =>
								setFormData({ ...formData, documentNumber: e.target.value })
							}
							placeholder="ПР-00123"
						/>
					</div>

					<div>
						<Label>Примечание</Label>
						<Input
							value={formData.note}
							onChange={(e) =>
								setFormData({ ...formData, note: e.target.value })
							}
							placeholder="Дополнительная информация"
						/>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Сохранение..." : "Оформить приход"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function IncomingOperations() {
	const { data: operations, isLoading } = useQuery<IncomingOperation[]>({
		queryKey: ["warehouse-incoming"],
		queryFn: () => api.get("/warehouse/incoming").then((r) => r.data),
	});

	const operationsArray = Array.isArray(operations) ? operations : [];
	const [dialogOpen, setDialogOpen] = useState(false);

	const [search, setSearch] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");

	const filteredOperations = operationsArray.filter((op) => {
		const matchesSearch =
			search === "" ||
			op.itemName.toLowerCase().includes(search.toLowerCase()) ||
			op.documentNumber?.toLowerCase().includes(search.toLowerCase()) ||
			op.supplierName?.toLowerCase().includes(search.toLowerCase());

		const matchesDateFrom =
			!dateFrom || new Date(op.date) >= new Date(dateFrom);
		const matchesDateTo = !dateTo || new Date(op.date) <= new Date(dateTo);

		return matchesSearch && matchesDateFrom && matchesDateTo;
	});

	const totalAmount = filteredOperations.reduce(
		(sum, op) => sum + op.totalPrice,
		0,
	);

	return (
		<div className="p-6 space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Приход товаров</h1>
					<p className="text-muted-foreground text-sm">
						История поступлений на склад
					</p>
				</div>
				<Button onClick={() => setDialogOpen(true)}>
					<Plus className="w-4 h-4 mr-2" />
					Оформить приход
				</Button>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-3">
				<div className="flex-1 min-w-[200px] max-w-sm">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Поиск по товару, документу, поставщику..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
				</div>
				<div className="flex gap-2">
					<Input
						type="date"
						placeholder="С"
						value={dateFrom}
						onChange={(e) => setDateFrom(e.target.value)}
						className="w-[150px]"
					/>
					<Input
						type="date"
						placeholder="По"
						value={dateTo}
						onChange={(e) => setDateTo(e.target.value)}
						className="w-[150px]"
					/>
				</div>
			</div>

			{/* Summary */}
			{filteredOperations.length > 0 && (
				<div className="flex gap-4">
					<Badge variant="secondary" className="px-4 py-2">
						Операций: {filteredOperations.length}
					</Badge>
					<Badge variant="secondary" className="px-4 py-2">
						Общая сумма: {formatCurrency(totalAmount)}
					</Badge>
				</div>
			)}

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Дата</TableHead>
							<TableHead>Товар</TableHead>
							<TableHead className="text-right">Количество</TableHead>
							<TableHead className="text-right">Цена</TableHead>
							<TableHead className="text-right">Сумма</TableHead>
							<TableHead>Поставщик</TableHead>
							<TableHead>Документ</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 7 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : !filteredOperations.length ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="text-center text-muted-foreground py-8"
								>
									{search || dateFrom || dateTo
										? "Ничего не найдено"
										: "Нет операций прихода"}
								</TableCell>
							</TableRow>
						) : (
							filteredOperations.map((op) => (
								<TableRow key={op.id}>
									<TableCell>{formatDate(op.date)}</TableCell>
									<TableCell className="font-medium">{op.itemName}</TableCell>
									<TableCell className="text-right">
										{formatNumber(op.quantity)}
									</TableCell>
									<TableCell className="text-right">
										{formatCurrency(op.unitPrice, op.currency)}
									</TableCell>
									<TableCell className="text-right font-semibold">
										{formatCurrency(op.totalPrice, op.currency)}
									</TableCell>
									<TableCell>{op.supplierName || "—"}</TableCell>
									<TableCell>
										{op.documentNumber ? (
											<Badge variant="outline">{op.documentNumber}</Badge>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<IncomingDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
		</div>
	);
}
