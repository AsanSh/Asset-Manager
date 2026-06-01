import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus } from "lucide-react";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface OutgoingOperation {
	id: number;
	date: string;
	itemId: number;
	itemName: string;
	quantity: number;
	recipientType: "construction_project" | "department" | "other";
	recipientName: string;
	purpose?: string;
	issuedBy?: string;
	documentNumber?: string;
	note?: string;
}

interface WarehouseItem {
	id: number;
	name: string;
	category: string;
	unit: string;
	currentStock: number;
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

const recipientTypeLabels: Record<string, string> = {
	construction_project: "Стройка",
	department: "Отдел",
	other: "Другое",
};

const recipientTypeColors: Record<string, string> = {
	construction_project: "bg-blue-100 text-blue-800",
	department: "bg-emerald-100 text-emerald-800",
	other: "bg-gray-100 text-gray-800",
};

interface OutgoingDialogProps {
	open: boolean;
	onClose: () => void;
}

function OutgoingDialog({ open, onClose }: OutgoingDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);

	const { data: items } = useQuery<WarehouseItem[]>({
		queryKey: ["warehouse-items"],
		queryFn: () => api.get("/warehouse/items").then((r) => r.data),
	});

	const itemsArray = Array.isArray(items) ? items : [];

	const [formData, setFormData] = useState({
		date: new Date().toISOString().split("T")[0],
		itemId: "",
		quantity: "",
		recipientType: "construction_project" as
			| "construction_project"
			| "department"
			| "other",
		recipientName: "",
		purpose: "",
		issuedBy: "",
		documentNumber: "",
		note: "",
	});

	const selectedItem = itemsArray.find(
		(item) => item.id === parseInt(formData.itemId, 10),
	);
	const requestedQuantity = parseFloat(formData.quantity || "0");
	const hasInsufficientStock =
		selectedItem && requestedQuantity > selectedItem.currentStock;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (hasInsufficientStock) {
			toast({
				title: "Недостаточно товара",
				description: "Запрашиваемое количество превышает доступный остаток",
				variant: "destructive",
			});
			return;
		}

		setLoading(true);
		try {
			await api.post("/warehouse/outgoing", {
				date: formData.date,
				itemId: parseInt(formData.itemId, 10),
				quantity: parseFloat(formData.quantity),
				recipientType: formData.recipientType,
				recipientName: formData.recipientName,
				purpose: formData.purpose || null,
				issuedBy: formData.issuedBy || null,
				documentNumber: formData.documentNumber || null,
				note: formData.note || null,
			});
			toast({
				title: "Расход товара оформлен",
				description: "Остатки обновлены",
			});
			queryClient.invalidateQueries({ queryKey: ["warehouse-outgoing"] });
			queryClient.invalidateQueries({ queryKey: ["warehouse-items"] });
			queryClient.invalidateQueries({ queryKey: ["warehouse-dashboard"] });
			onClose();
			setFormData({
				date: new Date().toISOString().split("T")[0],
				itemId: "",
				quantity: "",
				recipientType: "construction_project",
				recipientName: "",
				purpose: "",
				issuedBy: "",
				documentNumber: "",
				note: "",
			});
		} catch (error: any) {
			toast({
				title: "Ошибка",
				description: error.message || "Не удалось оформить расход",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Оформить расход товара</DialogTitle>
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
							onValueChange={(v) => setFormData({ ...formData, itemId: v })}
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
								<span className="text-muted-foreground">
									Доступный остаток:
								</span>
								<span className="font-medium">
									{formatNumber(selectedItem.currentStock)} {selectedItem.unit}
								</span>
							</div>
						</div>
					)}

					<div>
						<Label>Количество *</Label>
						<Input
							type="number"
							step="0.01"
							value={formData.quantity}
							onChange={(e) =>
								setFormData({ ...formData, quantity: e.target.value })
							}
							placeholder="50"
							required
						/>
						{hasInsufficientStock && (
							<Alert variant="destructive" className="mt-2">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									Недостаточно товара на складе. Доступно:{" "}
									{formatNumber(selectedItem.currentStock)} {selectedItem.unit}
								</AlertDescription>
							</Alert>
						)}
					</div>

					<div>
						<Label>Тип получателя *</Label>
						<Select
							value={formData.recipientType}
							onValueChange={(v: any) =>
								setFormData({ ...formData, recipientType: v })
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="construction_project">
									Строительный проект
								</SelectItem>
								<SelectItem value="department">Отдел</SelectItem>
								<SelectItem value="other">Другое</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label>Получатель *</Label>
						<Input
							value={formData.recipientName}
							onChange={(e) =>
								setFormData({ ...formData, recipientName: e.target.value })
							}
							placeholder={
								formData.recipientType === "construction_project"
									? "ЖК 'Ала-Арча'"
									: formData.recipientType === "department"
										? "Строительный отдел"
										: "Укажите получателя"
							}
							required
						/>
					</div>

					<div>
						<Label>Назначение</Label>
						<Input
							value={formData.purpose}
							onChange={(e) =>
								setFormData({ ...formData, purpose: e.target.value })
							}
							placeholder="Для строительства 2-го этажа"
						/>
					</div>

					<div>
						<Label>Выдал</Label>
						<Input
							value={formData.issuedBy}
							onChange={(e) =>
								setFormData({ ...formData, issuedBy: e.target.value })
							}
							placeholder="ФИО кладовщика"
						/>
					</div>

					<div>
						<Label>Номер документа</Label>
						<Input
							value={formData.documentNumber}
							onChange={(e) =>
								setFormData({ ...formData, documentNumber: e.target.value })
							}
							placeholder="РС-00456"
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
						<Button type="submit" disabled={loading || hasInsufficientStock}>
							{loading ? "Сохранение..." : "Оформить расход"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function OutgoingOperations() {
	const { data: operations, isLoading } = useQuery<OutgoingOperation[]>({
		queryKey: ["warehouse-outgoing"],
		queryFn: () => api.get("/warehouse/outgoing").then((r) => r.data),
	});

	const operationsArray = Array.isArray(operations) ? operations : [];
	const [dialogOpen, setDialogOpen] = useState(false);
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const [recipientTypeFilter, setRecipientTypeFilter] = useState("all");

	const filteredOperations = useMemo(
		() =>
			operationsArray.filter((op) => {
				if (!inPeriod(op.date, period)) return false;
				if (recipientTypeFilter !== "all" && op.recipientType !== recipientTypeFilter)
					return false;
				return true;
			}),
		[operationsArray, period, recipientTypeFilter],
	);

	const totalQuantity = filteredOperations.reduce(
		(sum, op) => sum + op.quantity,
		0,
	);

	const columns = useMemo<ColumnDef<OutgoingOperation, unknown>[]>(
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
					<span className="font-mono">{formatNumber(row.original.quantity)}</span>
				),
			},
			{
				id: "recipient",
				header: "Получатель",
				size: 180,
				accessorFn: (row) => row.recipientName,
				meta: { exportLabel: "Получатель" },
				cell: ({ row }) => (
					<div className="space-y-1">
						<div className="font-medium">{row.original.recipientName}</div>
						<Badge
							className={recipientTypeColors[row.original.recipientType]}
							variant="secondary"
						>
							{recipientTypeLabels[row.original.recipientType]}
						</Badge>
					</div>
				),
			},
			{
				accessorKey: "purpose",
				header: "Назначение",
				size: 160,
				meta: { exportLabel: "Назначение" },
				cell: ({ row }) => (
					<span className="text-sm">{row.original.purpose || "—"}</span>
				),
			},
			{
				accessorKey: "issuedBy",
				header: "Выдал",
				size: 120,
				meta: { exportLabel: "Выдал" },
				cell: ({ row }) => (
					<span className="text-sm">{row.original.issuedBy || "—"}</span>
				),
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
					<h1 className="text-2xl font-bold">Расход товаров</h1>
					<p className="text-muted-foreground text-sm">
						История отпуска товаров со склада
					</p>
				</div>
				<Button onClick={() => setDialogOpen(true)}>
					<Plus className="w-4 h-4 mr-2" />
					Оформить расход
				</Button>
			</div>

			<PeriodPicker value={period} onChange={setPeriod} />

			{filteredOperations.length > 0 && (
				<div className="flex gap-4">
					<Badge variant="secondary" className="px-4 py-2">
						Операций: {filteredOperations.length}
					</Badge>
					<Badge variant="secondary" className="px-4 py-2">
						Всего единиц: {formatNumber(totalQuantity)}
					</Badge>
				</div>
			)}

			<DataTable
				tableId="warehouse-outgoing"
				columns={columns}
				data={filteredOperations}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по товару, получателю, документу…"
				initialSorting={[{ id: "date", desc: true }]}
				toolbar={
					<Select value={recipientTypeFilter} onValueChange={setRecipientTypeFilter}>
						<SelectTrigger className="w-[200px] h-8">
							<SelectValue placeholder="Тип получателя" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все типы</SelectItem>
							<SelectItem value="construction_project">Строительные проекты</SelectItem>
							<SelectItem value="department">Отделы</SelectItem>
							<SelectItem value="other">Другое</SelectItem>
						</SelectContent>
					</Select>
				}
				emptyState={
					recipientTypeFilter !== "all"
						? "Ничего не найдено"
						: "Нет операций расхода"
				}
			/>

			<OutgoingDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
		</div>
	);
}
