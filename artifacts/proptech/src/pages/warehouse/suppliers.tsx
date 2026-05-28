import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Star, Trash2, FileText, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
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
import { ContractFileUpload } from "@/components/contract-file-upload";
import {
	AdminReconciliationAct,
	reconciliationFmtMoney,
} from "@/components/admin-reconciliation-act";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";

interface Supplier {
	id: number;
	name: string;
	contactPerson?: string;
	phone?: string;
	email?: string;
	inn?: string;
	address?: string;
	contractNumber?: string;
	contractAmount?: string;
	paidAmount?: string;
	currency?: string;
	rating?: number;
	status: "active" | "inactive";
	note?: string;
	contractDocument?: { fileName: string; mimeType: string; uploadedAt: string } | null;
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
	const [portalForm, setPortalForm] = useState({
		email: supplier?.email || "",
		firstName: "",
		lastName: "",
		password: "",
	});
	const [portalLoading, setPortalLoading] = useState(false);

	const [formData, setFormData] = useState({
		name: supplier?.name || "",
		contactPerson: supplier?.contactPerson || "",
		phone: supplier?.phone || "",
		email: supplier?.email || "",
		inn: supplier?.inn || "",
		address: supplier?.address || "",
		contractNumber: supplier?.contractNumber || "",
		contractAmount: supplier?.contractAmount || "",
		paidAmount: supplier?.paidAmount || "0",
		currency: supplier?.currency || "KGS",
		rating: supplier?.rating?.toString() || "5",
		status: supplier?.status || "active",
		note: supplier?.note || "",
	});

	const contractAmount = parseFloat(formData.contractAmount || "0");
	const paidAmount = parseFloat(formData.paidAmount || "0");
	const outstanding = contractAmount - paidAmount;

	const { data: reconciliationData } = useQuery({
		queryKey: ["supplier-reconciliation", supplier?.id],
		queryFn: () =>
			api
				.get(`/warehouse/suppliers/${supplier!.id}/reconciliation`)
				.then((r) => r.data),
		enabled: !!supplier?.id && open,
	});

	useEffect(() => {
		if (!open) return;
		setFormData({
			name: supplier?.name || "",
			contactPerson: supplier?.contactPerson || "",
			phone: supplier?.phone || "",
			email: supplier?.email || "",
			inn: supplier?.inn || "",
			address: supplier?.address || "",
			contractNumber: supplier?.contractNumber || "",
			contractAmount: supplier?.contractAmount || "",
			paidAmount: supplier?.paidAmount || "0",
			currency: supplier?.currency || "KGS",
			rating: supplier?.rating?.toString() || "5",
			status: supplier?.status || "active",
			note: supplier?.note || "",
		});
		const parts = (supplier?.name || "").trim().split(/\s+/);
		setPortalForm({
			email: supplier?.email || "",
			firstName: parts[0] || "",
			lastName: parts.slice(1).join(" ") || "",
			password: "",
		});
	}, [open, supplier]);

	const reconciliation = reconciliationData?.reconciliation;

	const createPortalAccount = async () => {
		if (!supplier?.id) return;
		if (!portalForm.email || !portalForm.firstName || !portalForm.lastName || !portalForm.password) {
			toast({ title: "Заполните все поля портала", variant: "destructive" });
			return;
		}
		setPortalLoading(true);
		try {
			await api.post("/portal/create-supplier-account", {
				supplierId: supplier.id,
				...portalForm,
			});
			toast({ title: "Доступ в портал создан" });
			setPortalForm({ email: "", firstName: "", lastName: "", password: "" });
		} catch (e: unknown) {
			toast({
				title: getApiErrorMessage(e, "Ошибка создания аккаунта"),
				variant: "destructive",
			});
		} finally {
			setPortalLoading(false);
		}
	};

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
				contractNumber: formData.contractNumber || null,
				contractAmount: formData.contractAmount || null,
				paidAmount: formData.paidAmount || "0",
				currency: formData.currency || "KGS",
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
			if (supplier?.id) {
				queryClient.invalidateQueries({
					queryKey: ["supplier-reconciliation", supplier.id],
				});
			}
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
						<Label>№ договора</Label>
						<Input
							value={formData.contractNumber}
							onChange={(e) =>
								setFormData({ ...formData, contractNumber: e.target.value })
							}
							placeholder="Д-2026/01"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Сумма договора</Label>
							<Input
								type="number"
								value={formData.contractAmount}
								onChange={(e) =>
									setFormData({ ...formData, contractAmount: e.target.value })
								}
							/>
						</div>
						<div>
							<Label>Оплачено</Label>
							<Input
								type="number"
								value={formData.paidAmount}
								onChange={(e) =>
									setFormData({ ...formData, paidAmount: e.target.value })
								}
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
									<SelectItem value="KGS">KGS</SelectItem>
									<SelectItem value="USD">USD</SelectItem>
									<SelectItem value="EUR">EUR</SelectItem>
									<SelectItem value="RUB">RUB</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Остаток к оплате</Label>
							<div
								className={`h-10 px-3 flex items-center rounded-md border text-sm font-medium ${
									outstanding < 0
										? "text-rose-700 bg-rose-50 border-rose-200"
										: outstanding === 0
											? "text-emerald-700 bg-emerald-50 border-emerald-200"
											: "text-amber-700 bg-amber-50 border-amber-200"
								}`}
							>
								{outstanding.toLocaleString("ru-KG")} {formData.currency}
							</div>
						</div>
					</div>

					{supplier?.id && (
						<ContractFileUpload
							entityType="supplier"
							entityId={supplier.id}
							contractDocument={supplier.contractDocument}
							onUploaded={() => {
								queryClient.invalidateQueries({ queryKey: ["warehouse-suppliers"] });
								queryClient.invalidateQueries({
									queryKey: ["supplier-reconciliation", supplier.id],
								});
							}}
							portalPrompt={{
								entityType: "supplier",
								entityId: supplier.id,
								entityName: supplier.name,
								defaultEmail: supplier.email,
							}}
						/>
					)}

					{supplier?.id && reconciliation && (
						<AdminReconciliationAct
							mode="supplier"
							subjectLabel="Поставщик"
							subjectName={supplier.name}
							contractLabel={`Договор №${formData.contractNumber || "—"}`}
							currency={reconciliation.currency ?? formData.currency}
							summary={[
								{
									label: "Договор",
									value: reconciliationFmtMoney(
										reconciliation.contractAmount,
										reconciliation.currency,
									),
								},
								{
									label: "Оплачено",
									value: reconciliationFmtMoney(
										reconciliation.paidAmount,
										reconciliation.currency,
									),
									tone: "emerald",
								},
								{
									label: "Остаток",
									value: reconciliationFmtMoney(
										reconciliation.outstanding,
										reconciliation.currency,
									),
									tone: "amber",
								},
								{
									label: "Поставлено",
									value: reconciliationFmtMoney(
										reconciliation.totalSupplied,
										reconciliation.currency,
									),
									tone: "violet",
								},
							]}
							lines={reconciliation.lines ?? []}
						/>
					)}

					{supplier?.id && (
						<div className="border-t pt-4 space-y-3">
							<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Доступ в портал поставщика
							</p>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label>Email</Label>
									<Input
										type="email"
										value={portalForm.email}
										onChange={(e) =>
											setPortalForm((p) => ({ ...p, email: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label>Пароль</Label>
									<Input
										type="password"
										value={portalForm.password}
										onChange={(e) =>
											setPortalForm((p) => ({ ...p, password: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label>Имя</Label>
									<Input
										value={portalForm.firstName}
										onChange={(e) =>
											setPortalForm((p) => ({ ...p, firstName: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label>Фамилия</Label>
									<Input
										value={portalForm.lastName}
										onChange={(e) =>
											setPortalForm((p) => ({ ...p, lastName: e.target.value }))
										}
									/>
								</div>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() => void createPortalAccount()}
								disabled={portalLoading}
							>
								<UserPlus className="w-4 h-4" />
								{portalLoading ? "..." : "Создать доступ в портал"}
							</Button>
						</div>
					)}

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
		queryFn: () =>
			api.get("/warehouse/suppliers").then((r) => {
				const list = Array.isArray(r.data) ? r.data : [];
				return list.map((s: Record<string, unknown>) => ({
					...s,
					status: s.isActive === false ? "inactive" : "active",
					note: s.notes,
				})) as Supplier[];
			}),
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
