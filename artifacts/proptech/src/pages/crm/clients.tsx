import { Edit2, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Client {
	id: number;
	fullName: string;
	type: "individual" | "company";
	phone: string;
	email?: string;
	address?: string;
	inn?: string;
	passportData?: string;
	birthDate?: string;
	budget?: number;
	creditApproved: boolean;
	notes?: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

const TYPE_OPTIONS = [
	{ value: "individual", label: "Физическое лицо" },
	{ value: "company", label: "Юридическое лицо" },
];

const STATUS_OPTIONS = [
	{
		value: "active",
		label: "Активный",
		color: "bg-emerald-100 text-emerald-800",
	},
	{
		value: "inactive",
		label: "Неактивный",
		color: "bg-gray-100 text-gray-800",
	},
];

interface ClientDialogProps {
	open: boolean;
	onClose: () => void;
	client?: Client;
	onSuccess: () => void;
}

function ClientDialog({ open, onClose, client, onSuccess }: ClientDialogProps) {
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		fullName: "",
		type: "individual" as "individual" | "company",
		phone: "",
		email: "",
		address: "",
		inn: "",
		passportData: "",
		birthDate: "",
		budget: "",
		creditApproved: false,
		notes: "",
		status: "active",
	});

	useEffect(() => {
		if (client && open) {
			setFormData({
				fullName: client.fullName || "",
				type: client.type || "individual",
				phone: client.phone || "",
				email: client.email || "",
				address: client.address || "",
				inn: client.inn || "",
				passportData: client.passportData || "",
				birthDate: client.birthDate ? client.birthDate.split("T")[0] : "",
				budget: client.budget ? String(client.budget) : "",
				creditApproved: client.creditApproved || false,
				notes: client.notes || "",
				status: client.status || "active",
			});
		} else if (!client && open) {
			setFormData({
				fullName: "",
				type: "individual",
				phone: "",
				email: "",
				address: "",
				inn: "",
				passportData: "",
				birthDate: "",
				budget: "",
				creditApproved: false,
				notes: "",
				status: "active",
			});
		}
	}, [client, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			const payload = {
				fullName: formData.fullName,
				type: formData.type,
				phone: formData.phone,
				email: formData.email || null,
				address: formData.address || null,
				inn: formData.inn || null,
				passportData: formData.passportData || null,
				birthDate: formData.birthDate || null,
				budget: formData.budget ? parseFloat(formData.budget) : null,
				creditApproved: formData.creditApproved,
				notes: formData.notes || null,
				status: formData.status,
			};

			if (client) {
				await api.patch(`/crm/clients/${client.id}`, payload);
				toast({ title: "Клиент обновлён" });
			} else {
				await api.post("/crm/clients", payload);
				toast({ title: "Клиент создан" });
			}
			onSuccess();
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось сохранить клиента",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{client ? "Редактировать клиента" : "Создать клиента"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Тип *</Label>
							<Select
								value={formData.type}
								onValueChange={(v: "individual" | "company") =>
									setFormData({ ...formData, type: v })
								}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TYPE_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Статус *</Label>
							<Select
								value={formData.status}
								onValueChange={(v) => setFormData({ ...formData, status: v })}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STATUS_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div>
						<Label>
							{formData.type === "company"
								? "Наименование организации *"
								: "ФИО *"}
						</Label>
						<Input
							value={formData.fullName}
							onChange={(e) =>
								setFormData({ ...formData, fullName: e.target.value })
							}
							placeholder={
								formData.type === "company"
									? 'ОсОО "Компания"'
									: "Иванов Иван Иванович"
							}
							required
							className="mt-1"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Телефон *</Label>
							<Input
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								placeholder="+996 700 000 000"
								required
								className="mt-auto"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Email</Label>
							<Input
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								placeholder="example@mail.kg"
								className="mt-auto"
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
							placeholder="г. Бишкек, ул..."
							className="mt-1"
						/>
					</div>

					{formData.type === "individual" ? (
						<div className="grid grid-cols-2 gap-3">
								<div className="flex flex-col">
									<Label className="leading-tight mb-1.5">Паспортные данные</Label>
									<Input
										value={formData.passportData}
										onChange={(e) =>
											setFormData({ ...formData, passportData: e.target.value })
										}
										placeholder="ID 1234567"
										className="mt-auto"
									/>
								</div>
								<div className="flex flex-col">
									<Label className="leading-tight mb-1.5">Дата рождения</Label>
									<Input
										type="date"
										value={formData.birthDate}
										onChange={(e) =>
											setFormData({ ...formData, birthDate: e.target.value })
										}
										className="mt-auto"
									/>
								</div>
							</div>
					) : (
						<div>
							<Label>ИНН</Label>
							<Input
								value={formData.inn}
								onChange={(e) =>
									setFormData({ ...formData, inn: e.target.value })
								}
								placeholder="01234567890123"
								className="mt-1"
							/>
						</div>
					)}

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Бюджет (KGS)</Label>
							<Input
								type="number"
								value={formData.budget}
								onChange={(e) =>
									setFormData({ ...formData, budget: e.target.value })
								}
								placeholder="10000000"
								className="mt-auto"
							/>
						</div>
						<div className="flex items-center gap-2 pt-6">
							<input
								type="checkbox"
								id="creditApproved"
								checked={formData.creditApproved}
								onChange={(e) =>
									setFormData({ ...formData, creditApproved: e.target.checked })
								}
								className="w-4 h-4"
							/>
							<Label htmlFor="creditApproved" className="cursor-pointer">
								Кредит одобрен
							</Label>
						</div>
					</div>

					<div>
						<Label>Заметки</Label>
						<Textarea
							value={formData.notes}
							onChange={(e) =>
								setFormData({ ...formData, notes: e.target.value })
							}
							placeholder="Дополнительная информация"
							rows={3}
							className="mt-1"
						/>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Сохранение..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function Clients() {
	const [clients, setClients] = useState<Client[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedClient, setSelectedClient] = useState<Client | undefined>();
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const { toast } = useToast();

	const loadClients = async () => {
		try {
			setIsLoading(true);
			const params: Record<string, string | undefined> = {
				type: typeFilter !== "all" ? typeFilter : undefined,
			};
			const response = await api.get<Client[]>("/crm/clients", { params });
			setClients(Array.isArray(response.data) ? response.data : []);
		} catch (err: any) {
			toast({
				title: "Ошибка загрузки",
				description: err.message || "Не удалось загрузить клиентов",
				variant: "destructive",
			});
			setClients([]);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadClients();
	}, [typeFilter]);

	const handleDelete = async () => {
		if (!deleteId) return;
		try {
			await api.delete(`/crm/clients/${deleteId}`);
			toast({ title: "Клиент удалён" });
			loadClients();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось удалить клиента",
				variant: "destructive",
			});
		}
		setDeleteId(null);
	};

	const getStatusBadge = (status: string) => {
		const opt = STATUS_OPTIONS.find((s) => s.value === status);
		return (
			<Badge
				className={cn("text-xs", opt?.color || "bg-gray-100 text-gray-800")}
				variant="secondary"
			>
				{opt?.label || status}
			</Badge>
		);
	};

	const getTypeBadge = (type: string) => {
		const opt = TYPE_OPTIONS.find((t) => t.value === type);
		return (
			<Badge className="text-xs bg-blue-100 text-blue-800" variant="secondary">
				{opt?.label || type}
			</Badge>
		);
	};

	const columns = useMemo<ColumnDef<Client, unknown>[]>(
		() => [
			{
				accessorKey: "fullName",
				header: "Имя / Название",
				size: 200,
				meta: { exportLabel: "Имя / Название" },
				cell: ({ row }) => (
					<span className="font-medium text-gray-900">
						{row.original.fullName}
					</span>
				),
			},
			{
				accessorKey: "type",
				header: "Тип",
				size: 140,
				meta: { exportLabel: "Тип" },
				cell: ({ row }) => getTypeBadge(row.original.type),
			},
			{
				accessorKey: "phone",
				header: "Телефон",
				size: 130,
				meta: { exportLabel: "Телефон" },
				cell: ({ row }) => (
					<span className="text-gray-600">{row.original.phone}</span>
				),
			},
			{
				accessorKey: "email",
				header: "Почта",
				size: 160,
				meta: { exportLabel: "Email" },
				cell: ({ row }) => (
					<span className="text-gray-500 text-sm">
						{row.original.email || "—"}
					</span>
				),
			},
			{
				id: "budget",
				header: "Бюджет",
				size: 120,
				accessorFn: (row) => row.budget ?? 0,
				meta: { exportLabel: "Бюджет (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-sm">
						{row.original.budget
							? `${row.original.budget.toLocaleString("ru-KG")} сом`
							: "—"}
					</span>
				),
			},
			{
				id: "creditApproved",
				header: "Кредит",
				size: 90,
				accessorFn: (row) => (row.creditApproved ? 1 : 0),
				meta: { exportLabel: "Кредит одобрен" },
				cell: ({ row }) =>
					row.original.creditApproved ? (
						<Badge
							className="text-xs bg-emerald-100 text-emerald-800"
							variant="secondary"
						>
							Да
						</Badge>
					) : (
						<span className="text-xs text-gray-400">—</span>
					),
			},
			{
				accessorKey: "status",
				header: "Статус",
				size: 110,
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => getStatusBadge(row.original.status),
			},
			{
				id: "__actions",
				header: "",
				size: 90,
				enableSorting: false,
				cell: ({ row }) => {
					const client = row.original;
					return (
						<div
							className="flex gap-1"
							onClick={(e) => e.stopPropagation()}
						>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => {
									setSelectedClient(client);
									setDialogOpen(true);
								}}
								title="Редактировать"
							>
								<Edit2 className="w-4 h-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="text-rose-600 hover:text-rose-700"
								onClick={() => setDeleteId(client.id)}
								title="Удалить"
							>
								<Trash2 className="w-4 h-4" />
							</Button>
						</div>
					);
				},
			},
		],
		[],
	);

	return (
		<div className="space-y-5">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Users className="w-6 h-6 text-blue-600" /> Клиенты
					</h1>
					<p className="text-sm text-gray-500 mt-1">База клиентов компании</p>
				</div>
				<Button
					onClick={() => {
						setSelectedClient(undefined);
						setDialogOpen(true);
					}}
				>
					<Plus className="w-4 h-4 mr-2" /> Добавить клиента
				</Button>
			</div>

			<DataTable
				tableId="crm-clients"
				columns={columns}
				data={clients}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по имени, телефону, email..."
				toolbar={
					<Select value={typeFilter} onValueChange={setTypeFilter}>
						<SelectTrigger className="w-44">
							<SelectValue placeholder="Все типы" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все типы</SelectItem>
							{TYPE_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
				emptyState={
					<div className="flex flex-col items-center gap-2">
						<Users className="w-8 h-8 text-gray-200" />
						<p className="text-gray-400">Клиенты не найдены</p>
					</div>
				}
			/>

			<ClientDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				client={selectedClient}
				onSuccess={loadClients}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить клиента?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Клиент и все связанные данные будут
							удалены из системы.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
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
