import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Eye, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Inventory {
	id: number;
	inventoryDate: string;
	status: "in_progress" | "completed";
	conductedBy: string;
	completedDate?: string;
	note?: string;
}

interface InventoryDetail {
	id: number;
	inventoryId: number;
	itemId: number;
	itemName: string;
	expectedQuantity: number;
	actualQuantity?: number;
	unit: string;
	difference?: number;
}

function formatDate(date: string) {
	return new Date(date).toLocaleDateString("ru-KG", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function formatNumber(num: number) {
	return new Intl.NumberFormat("ru-KG").format(num);
}

const statusLabels: Record<string, string> = {
	in_progress: "В процессе",
	completed: "Завершена",
};

const statusColors: Record<string, string> = {
	in_progress: "bg-amber-100 text-amber-800",
	completed: "bg-emerald-100 text-emerald-800",
};

interface CreateInventoryDialogProps {
	open: boolean;
	onClose: () => void;
}

function CreateInventoryDialog({ open, onClose }: CreateInventoryDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);

	const [formData, setFormData] = useState({
		inventoryDate: new Date().toISOString().split("T")[0],
		conductedBy: "",
		note: "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			await api.post("/warehouse/inventory", {
				inventoryDate: formData.inventoryDate,
				conductedBy: formData.conductedBy,
				note: formData.note || null,
			});
			toast({
				title: "Инвентаризация создана",
				description: "Можно приступать к подсчету",
			});
			queryClient.invalidateQueries({ queryKey: ["warehouse-inventory"] });
			onClose();
			setFormData({
				inventoryDate: new Date().toISOString().split("T")[0],
				conductedBy: "",
				note: "",
			});
		} catch (error: any) {
			toast({
				title: "Ошибка",
				description: error.message || "Не удалось создать инвентаризацию",
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
					<DialogTitle>Создать инвентаризацию</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label>Дата инвентаризации *</Label>
						<Input
							type="date"
							value={formData.inventoryDate}
							onChange={(e) =>
								setFormData({ ...formData, inventoryDate: e.target.value })
							}
							required
						/>
					</div>

					<div>
						<Label>Проводит *</Label>
						<Input
							value={formData.conductedBy}
							onChange={(e) =>
								setFormData({ ...formData, conductedBy: e.target.value })
							}
							placeholder="ФИО ответственного"
							required
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
							{loading ? "Создание..." : "Создать"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

interface ViewInventoryDialogProps {
	open: boolean;
	onClose: () => void;
	inventory: Inventory | null;
}

function ViewInventoryDialog({
	open,
	onClose,
	inventory,
}: ViewInventoryDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const { data: details } = useQuery<InventoryDetail[]>({
		queryKey: ["warehouse-inventory-details", inventory?.id],
		queryFn: () =>
			api
				.get(`/warehouse/inventory/${inventory?.id}/details`)
				.then((r) => r.data),
		enabled: !!inventory?.id && open,
	});

	const detailsArray = Array.isArray(details) ? details : [];

	const [quantities, setQuantities] = useState<Record<number, string>>({});

	const completeMutation = useMutation({
		mutationFn: () =>
			api.post(`/warehouse/inventory/${inventory?.id}/complete`, {
				details: detailsArray.map((d) => ({
					itemId: d.itemId,
					actualQuantity: parseFloat(quantities[d.itemId] || "0"),
				})),
			}),
		onSuccess: () => {
			toast({
				title: "Инвентаризация завершена",
				description: "Остатки обновлены",
			});
			queryClient.invalidateQueries({ queryKey: ["warehouse-inventory"] });
			queryClient.invalidateQueries({ queryKey: ["warehouse-items"] });
			queryClient.invalidateQueries({ queryKey: ["warehouse-dashboard"] });
			onClose();
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message || "Не удалось завершить инвентаризацию",
				variant: "destructive",
			});
		},
	});

	const handleComplete = () => {
		if (inventory?.status === "completed") {
			return;
		}

		const allFilled = detailsArray.every(
			(d) => quantities[d.itemId] !== undefined && quantities[d.itemId] !== "",
		);
		if (!allFilled) {
			toast({
				title: "Заполните все поля",
				description:
					"Необходимо указать фактическое количество для всех позиций",
				variant: "destructive",
			});
			return;
		}

		completeMutation.mutate();
	};

	if (!inventory) return null;

	const isCompleted = inventory.status === "completed";

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						Инвентаризация от {formatDate(inventory.inventoryDate)}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Информация</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Проводит:</span>
								<span className="font-medium">{inventory.conductedBy}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Статус:</span>
								<Badge
									className={statusColors[inventory.status]}
									variant="secondary"
								>
									{statusLabels[inventory.status]}
								</Badge>
							</div>
							{inventory.completedDate && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Завершена:</span>
									<span className="font-medium">
										{formatDate(inventory.completedDate)}
									</span>
								</div>
							)}
							{inventory.note && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Примечание:</span>
									<span className="font-medium">{inventory.note}</span>
								</div>
							)}
						</CardContent>
					</Card>

					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Товар</TableHead>
									<TableHead className="text-right">Ожидается</TableHead>
									<TableHead className="text-right">Фактически</TableHead>
									{isCompleted && (
										<TableHead className="text-right">Разница</TableHead>
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{!detailsArray.length ? (
									<TableRow>
										<TableCell
											colSpan={isCompleted ? 4 : 3}
											className="text-center text-muted-foreground py-8"
										>
											Нет позиций
										</TableCell>
									</TableRow>
								) : (
									detailsArray.map((detail) => {
										const diff = isCompleted
											? (detail.actualQuantity || 0) - detail.expectedQuantity
											: parseFloat(quantities[detail.itemId] || "0") -
												detail.expectedQuantity;

										return (
											<TableRow key={detail.id}>
												<TableCell className="font-medium">
													{detail.itemName}
													<span className="text-xs text-muted-foreground ml-2">
														({detail.unit})
													</span>
												</TableCell>
												<TableCell className="text-right">
													{formatNumber(detail.expectedQuantity)}
												</TableCell>
												<TableCell className="text-right">
													{isCompleted ? (
														formatNumber(detail.actualQuantity || 0)
													) : (
														<Input
															type="number"
															step="0.01"
															value={quantities[detail.itemId] || ""}
															onChange={(e) =>
																setQuantities({
																	...quantities,
																	[detail.itemId]: e.target.value,
																})
															}
															placeholder="0"
															className="w-32 ml-auto"
														/>
													)}
												</TableCell>
												{(isCompleted || quantities[detail.itemId]) && (
													<TableCell className="text-right">
														<span
															className={`font-medium ${
																diff > 0
																	? "text-emerald-600"
																	: diff < 0
																		? "text-rose-600"
																		: "text-gray-600"
															}`}
														>
															{diff > 0 && "+"}
															{formatNumber(diff)}
														</span>
													</TableCell>
												)}
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Закрыть
						</Button>
						{!isCompleted && (
							<Button
								onClick={handleComplete}
								disabled={completeMutation.isPending}
							>
								<CheckCircle2 className="w-4 h-4 mr-2" />
								{completeMutation.isPending
									? "Завершение..."
									: "Завершить инвентаризацию"}
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default function InventoryChecks() {
	const { data: inventories, isLoading } = useQuery<Inventory[]>({
		queryKey: ["warehouse-inventory"],
		queryFn: () => api.get("/warehouse/inventory").then((r) => r.data),
	});

	const inventoriesArray = Array.isArray(inventories) ? inventories : [];
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [viewDialog, setViewDialog] = useState<{
		open: boolean;
		inventory: Inventory | null;
	}>({
		open: false,
		inventory: null,
	});

	return (
		<div className="p-6 space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Инвентаризация</h1>
					<p className="text-muted-foreground text-sm">
						Учёт и сверка фактических остатков
					</p>
				</div>
				<Button onClick={() => setCreateDialogOpen(true)}>
					<Plus className="w-4 h-4 mr-2" />
					Создать инвентаризацию
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Всего проверок
						</CardTitle>
						<ClipboardList className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{inventoriesArray.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">В процессе</CardTitle>
						<ClipboardList className="h-4 w-4 text-amber-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{
								inventoriesArray.filter((i) => i.status === "in_progress")
									.length
							}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Завершено</CardTitle>
						<CheckCircle2 className="h-4 w-4 text-emerald-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{inventoriesArray.filter((i) => i.status === "completed").length}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Дата</TableHead>
							<TableHead>Проводит</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead>Завершена</TableHead>
							<TableHead>Примечание</TableHead>
							<TableHead className="text-right">Действия</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 6 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : !inventoriesArray.length ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center text-muted-foreground py-8"
								>
									Нет инвентаризаций
								</TableCell>
							</TableRow>
						) : (
							inventoriesArray.map((inventory) => (
								<TableRow key={inventory.id}>
									<TableCell>{formatDate(inventory.inventoryDate)}</TableCell>
									<TableCell className="font-medium">
										{inventory.conductedBy}
									</TableCell>
									<TableCell>
										<Badge
											className={statusColors[inventory.status]}
											variant="secondary"
										>
											{statusLabels[inventory.status]}
										</Badge>
									</TableCell>
									<TableCell>
										{inventory.completedDate
											? formatDate(inventory.completedDate)
											: "—"}
									</TableCell>
									<TableCell className="text-sm">
										{inventory.note || "—"}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setViewDialog({ open: true, inventory })}
										>
											<Eye className="h-4 w-4 mr-2" />
											{inventory.status === "in_progress"
												? "Провести"
												: "Просмотр"}
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<CreateInventoryDialog
				open={createDialogOpen}
				onClose={() => setCreateDialogOpen(false)}
			/>

			<ViewInventoryDialog
				open={viewDialog.open}
				onClose={() => setViewDialog({ open: false, inventory: null })}
				inventory={viewDialog.inventory}
			/>
		</div>
	);
}
