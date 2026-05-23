import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
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

interface Supplier {
	id: number;
	name: string;
	contactPerson?: string;
	phone?: string;
	email?: string;
	inn?: string;
	address?: string;
	rating?: number;
	status: "active" | "inactive";
	note?: string;
}

const statusLabels: Record<string, string> = {
	active: "Активен",
	inactive: "Неактивен",
};

const statusColors: Record<string, string> = {
	active: "bg-emerald-100 text-emerald-800",
	inactive: "bg-gray-100 text-gray-800",
};

interface SupplierDialogProps {
	open: boolean;
	onClose: () => void;
	supplier?: Supplier | null;
}

function SupplierDialog({ open, onClose, supplier }: SupplierDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);

	const [formData, setFormData] = useState({
		name: supplier?.name || "",
		contactPerson: supplier?.contactPerson || "",
		phone: supplier?.phone || "",
		email: supplier?.email || "",
		inn: supplier?.inn || "",
		address: supplier?.address || "",
		rating: supplier?.rating?.toString() || "5",
		status: supplier?.status || "active",
		note: supplier?.note || "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const payload = {
				name: formData.name,
				contactPerson: formData.contactPerson || null,
				phone: formData.phone || null,
				email: formData.email || null,
				inn: formData.inn || null,
				address: formData.address || null,
				rating: parseInt(formData.rating, 10),
				status: formData.status,
				note: formData.note || null,
			};

			if (supplier) {
				await api.patch(`/warehouse/suppliers/${supplier.id}`, payload);
				toast({ title: "Поставщик обновлён" });
			} else {
				await api.post("/warehouse/suppliers", payload);
				toast({ title: "Поставщик добавлен" });
			}
			queryClient.invalidateQueries({ queryKey: ["warehouse-suppliers"] });
			onClose();
		} catch (error: any) {
			toast({
				title: "Ошибка",
				description: error.message || "Не удалось сохранить поставщика",
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
						{supplier ? "Редактировать поставщика" : "Новый поставщик"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label>Название компании *</Label>
						<Input
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							placeholder="ООО 'СтройТорг'"
							required
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Контактное лицо</Label>
							<Input
								value={formData.contactPerson}
								onChange={(e) =>
									setFormData({ ...formData, contactPerson: e.target.value })
								}
								placeholder="Иванов Иван Иванович"
							/>
						</div>
						<div>
							<Label>Телефон</Label>
							<Input
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								placeholder="+996 555 123456"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Email</Label>
							<Input
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								placeholder="info@stroytorg.kg"
							/>
						</div>
						<div>
							<Label>ИНН</Label>
							<Input
								value={formData.inn}
								onChange={(e) =>
									setFormData({ ...formData, inn: e.target.value })
								}
								placeholder="01234567890123"
							/>
						</div>
					</div>

					<div>
						<Label>Адрес</Label>
						<Input
							value={formData.address}
							onChange={(e) =>
								setFormData({ ...formData, address: e.target.value })
							}
							placeholder="г. Бишкек, ул. Примерная 123"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Рейтинг (1-5 звёзд)</Label>
							<Select
								value={formData.rating}
								onValueChange={(v) => setFormData({ ...formData, rating: v })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[1, 2, 3, 4, 5].map((r) => (
										<SelectItem key={r} value={String(r)}>
											{"⭐".repeat(r)} ({r})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Статус</Label>
							<Select
								value={formData.status}
								onValueChange={(v) =>
									setFormData({ ...formData, status: v as "active" | "inactive" })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="active">Активен</SelectItem>
									<SelectItem value="inactive">Неактивен</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div>
						<Label>Примечание</Label>
						<Textarea
							value={formData.note}
							onChange={(e) =>
								setFormData({ ...formData, note: e.target.value })
							}
							placeholder="Дополнительная информация о поставщике"
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

function RatingStars({ rating }: { rating: number }) {
	return (
		<div className="flex items-center gap-1">
			{[1, 2, 3, 4, 5].map((star) => (
				<Star
					key={star}
					className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
				/>
			))}
		</div>
	);
}

export default function Suppliers() {
	const { data: suppliers, isLoading } = useQuery<Supplier[]>({
		queryKey: ["warehouse-suppliers"],
		queryFn: () => api.get("/warehouse/suppliers").then((r) => r.data),
	});

	const suppliersArray = Array.isArray(suppliers) ? suppliers : [];
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean;
		supplier: Supplier | null;
	}>({
		open: false,
		supplier: null,
	});

	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/warehouse/suppliers/${id}`),
		onSuccess: () => {
			toast({ title: "Поставщик удалён" });
			queryClient.invalidateQueries({ queryKey: ["warehouse-suppliers"] });
			setDeleteDialog({ open: false, supplier: null });
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message || "Не удалось удалить поставщика",
				variant: "destructive",
			});
		},
	});

	const filteredSuppliers = suppliersArray.filter((supplier) => {
		const matchesSearch =
			search === "" ||
			supplier.name.toLowerCase().includes(search.toLowerCase()) ||
			supplier.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
			supplier.phone?.toLowerCase().includes(search.toLowerCase()) ||
			supplier.inn?.toLowerCase().includes(search.toLowerCase());

		const matchesStatus =
			statusFilter === "all" || supplier.status === statusFilter;

		return matchesSearch && matchesStatus;
	});

	return (
		<div className="p-6 space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Поставщики</h1>
					<p className="text-muted-foreground text-sm">
						Управление базой поставщиков
					</p>
				</div>
				<Button
					onClick={() => {
						setEditSupplier(null);
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
							placeholder="Поиск по названию, контактам, ИНН..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
				</div>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Статус" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все статусы</SelectItem>
						<SelectItem value="active">Активные</SelectItem>
						<SelectItem value="inactive">Неактивные</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Stats */}
			{suppliersArray.length > 0 && (
				<div className="flex gap-4">
					<Badge variant="secondary" className="px-4 py-2">
						Всего: {suppliersArray.length}
					</Badge>
					<Badge variant="secondary" className="px-4 py-2">
						Активных:{" "}
						{suppliersArray.filter((s) => s.status === "active").length}
					</Badge>
				</div>
			)}

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Название</TableHead>
							<TableHead>Контактное лицо</TableHead>
							<TableHead>Телефон</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>ИНН</TableHead>
							<TableHead>Рейтинг</TableHead>
							<TableHead>Статус</TableHead>
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
						) : !filteredSuppliers.length ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="text-center text-muted-foreground py-8"
								>
									{search || statusFilter !== "all"
										? "Ничего не найдено"
										: "Нет поставщиков"}
								</TableCell>
							</TableRow>
						) : (
							filteredSuppliers.map((supplier) => (
								<TableRow key={supplier.id}>
									<TableCell className="font-medium">{supplier.name}</TableCell>
									<TableCell>{supplier.contactPerson || "—"}</TableCell>
									<TableCell>{supplier.phone || "—"}</TableCell>
									<TableCell className="text-sm">
										{supplier.email || "—"}
									</TableCell>
									<TableCell className="text-sm">
										{supplier.inn || "—"}
									</TableCell>
									<TableCell>
										<RatingStars rating={supplier.rating || 0} />
									</TableCell>
									<TableCell>
										<Badge
											className={statusColors[supplier.status]}
											variant="secondary"
										>
											{statusLabels[supplier.status]}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													setEditSupplier(supplier);
													setDialogOpen(true);
												}}
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													setDeleteDialog({ open: true, supplier })
												}
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

			<SupplierDialog
				open={dialogOpen}
				onClose={() => {
					setDialogOpen(false);
					setEditSupplier(null);
				}}
				supplier={editSupplier}
			/>

			<AlertDialog
				open={deleteDialog.open}
				onOpenChange={(v) =>
					!v && setDeleteDialog({ open: false, supplier: null })
				}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить поставщика?</AlertDialogTitle>
						<AlertDialogDescription>
							Вы уверены, что хотите удалить "{deleteDialog.supplier?.name}"?
							Это действие нельзя отменить.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								deleteDialog.supplier &&
								deleteMutation.mutate(deleteDialog.supplier.id)
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
