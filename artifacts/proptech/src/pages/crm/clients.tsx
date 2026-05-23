import { Edit2, Plus, Search, Trash2, Users } from "lucide-react";
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
						<div>
							<Label>Тип *</Label>
							<Select
								value={formData.type}
								onValueChange={(v: "individual" | "company") =>
									setFormData({ ...formData, type: v })
								}
							>
								<SelectTrigger className="mt-1">
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
						<div>
							<Label>Статус *</Label>
							<Select
								value={formData.status}
								onValueChange={(v) => setFormData({ ...formData, status: v })}
							>
								<SelectTrigger className="mt-1">
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
						<div>
							<Label>Телефон *</Label>
							<Input
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								placeholder="+996 700 000 000"
								required
								className="mt-1"
							/>
						</div>
						<div>
							<Label>Email</Label>
							<Input
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								placeholder="example@mail.kg"
								className="mt-1"
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
								<div>
									<Label>Паспортные данные</Label>
									<Input
										value={formData.passportData}
										onChange={(e) =>
											setFormData({ ...formData, passportData: e.target.value })
										}
										placeholder="ID 1234567"
										className="mt-1"
									/>
								</div>
								<div>
									<Label>Дата рождения</Label>
									<Input
										type="date"
										value={formData.birthDate}
										onChange={(e) =>
											setFormData({ ...formData, birthDate: e.target.value })
										}
										className="mt-1"
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
						<div>
							<Label>Бюджет (KGS)</Label>
							<Input
								type="number"
								value={formData.budget}
								onChange={(e) =>
									setFormData({ ...formData, budget: e.target.value })
								}
								placeholder="10000000"
								className="mt-1"
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
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedClient, setSelectedClient] = useState<Client | undefined>();
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const { toast } = useToast();

	const loadClients = async () => {
		try {
			setIsLoading(true);
			const params: Record<string, string | undefined> = {
				search: search || undefined,
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
	}, [search, typeFilter]);

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

			{/* Filters */}
			<div className="flex gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
					<Input
						placeholder="Поиск по имени, телефону, email..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
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
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Имя / Название</TableHead>
							<TableHead>Тип</TableHead>
							<TableHead>Телефон</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Бюджет</TableHead>
							<TableHead>Кредит</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead className="w-24"></TableHead>
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
						) : !clients.length ? (
							<TableRow>
								<TableCell colSpan={8} className="text-center py-12">
									<Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
									<p className="text-gray-400">Клиенты не найдены</p>
								</TableCell>
							</TableRow>
						) : (
							clients.map((client) => (
								<TableRow key={client.id} className="hover:bg-gray-50">
									<TableCell className="font-medium text-gray-900">
										{client.fullName}
									</TableCell>
									<TableCell>{getTypeBadge(client.type)}</TableCell>
									<TableCell className="text-gray-600">
										{client.phone}
									</TableCell>
									<TableCell className="text-gray-500 text-sm">
										{client.email || "—"}
									</TableCell>
									<TableCell className="text-sm">
										{client.budget
											? `${client.budget.toLocaleString()} с`
											: "—"}
									</TableCell>
									<TableCell>
										{client.creditApproved ? (
											<Badge
												className="text-xs bg-emerald-100 text-emerald-800"
												variant="secondary"
											>
												Да
											</Badge>
										) : (
											<span className="text-xs text-gray-400">—</span>
										)}
									</TableCell>
									<TableCell>{getStatusBadge(client.status)}</TableCell>
									<TableCell>
										<div className="flex gap-1">
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
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

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
