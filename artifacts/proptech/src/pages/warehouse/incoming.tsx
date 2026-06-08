import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
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

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Количество *</Label>
							<Input
								className="mt-auto"
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
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Цена за единицу *</Label>
							<Input
								className="mt-auto"
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
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());

	const filteredOperations = operationsArray.filter((op) =>
		inPeriod(op.date, period),
	);

	const totalAmount = filteredOperations.reduce(
		(sum, op) => sum + op.totalPrice,
		0,
	);

	const columns = useMemo<ColumnDef<IncomingOperation, unknown>[]>(
		() => [
			{
				id: "date",
				header: "Дата",
				size: 110,
				accessorFn: (row) => row.date,
				meta: { exportLabel: "Дата", pinned: "left" },
				cell: ({ row }) => formatDate(row.original.date),
			},
			{
				accessorKey: "itemName",
				header: "Товар",
				size: 180,
				meta: { exportLabel: "Товар" },
				cell: ({ row }) => (
					<span className="font-medium">{row.original.itemName}</span>
				),
			},
			{
				id: "quantity",
				header: "Количество",
				size: 110,
				accessorFn: (row) => row.quantity,
				meta: { exportLabel: "Количество", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono">
						{formatNumber(row.original.quantity)}
					</span>
				),
			},
			{
				id: "unitPrice",
				header: "Цена",
				size: 120,
				accessorFn: (row) => row.unitPrice,
				meta: { exportLabel: "Цена", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-gray-700">
						{formatCurrency(row.original.unitPrice, row.original.currency)}
					</span>
				),
			},
			{
				id: "totalPrice",
				header: "Сумма",
				size: 130,
				accessorFn: (row) => row.totalPrice,
				meta: { exportLabel: "Сумма (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-semibold text-emerald-700">
						{formatCurrency(row.original.totalPrice, row.original.currency)}
					</span>
				),
			},
			{
				id: "supplierName",
				header: "Поставщик",
				size: 150,
				accessorFn: (row) => row.supplierName || "—",
				meta: { exportLabel: "Поставщик" },
				cell: ({ row }) => row.original.supplierName || "—",
			},
			{
				id: "documentNumber",
				header: "Документ",
				size: 120,
				accessorFn: (row) => row.documentNumber || "",
				meta: { exportLabel: "Документ" },
				cell: ({ row }) =>
					row.original.documentNumber ? (
						<Badge variant="outline">{row.original.documentNumber}</Badge>
					) : (
						<span className="text-muted-foreground">—</span>
					),
			},
		],
		[],
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

			<PeriodPicker value={period} onChange={setPeriod} />

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

			<DataTable
				tableId="warehouse-incoming"
				columns={columns}
				data={filteredOperations}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по товару, документу, поставщику..."
				initialSorting={[{ id: "date", desc: true }]}
				emptyState={
					<div className="flex flex-col items-center gap-2 text-muted-foreground">
						<ArrowDownCircle className="h-8 w-8 opacity-30" />
						<span>Нет операций прихода</span>
					</div>
				}
				footer={
					filteredOperations.length > 0 ? (
						<div className="flex justify-end gap-8 px-4 py-2 text-sm font-semibold border-t bg-gray-50">
							<span className="text-gray-600">
								Итого ({filteredOperations.length}):
							</span>
							<span className="font-mono text-emerald-700">
								{formatCurrency(totalAmount)}
							</span>
						</div>
					) : undefined
				}
			/>

			<IncomingDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
		</div>
	);
}
