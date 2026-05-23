import {
	CheckCircle2,
	Edit2,
	Plus,
	Search,
	Trash2,
	UserPlus,
} from "lucide-react";
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

interface Lead {
	id: number;
	fullName: string;
	phone: string;
	email?: string;
	source: string;
	status: string;
	propertyType?: string;
	budget?: number;
	notes?: string;
	assignedUserId?: number;
	assignedUserName?: string;
	leadDate: string;
	lastContactDate?: string;
	createdAt: string;
	updatedAt: string;
}

const STATUS_OPTIONS = [
	{ value: "new", label: "Новый", color: "bg-blue-100 text-blue-800" },
	{
		value: "contacted",
		label: "Связались",
		color: "bg-amber-100 text-amber-800",
	},
	{
		value: "qualified",
		label: "Квалифицирован",
		color: "bg-emerald-100 text-emerald-800",
	},
	{
		value: "converted",
		label: "Конвертирован",
		color: "bg-blue-100 text-indigo-800",
	},
	{ value: "lost", label: "Потерян", color: "bg-rose-100 text-rose-800" },
];

const SOURCE_OPTIONS = [
	{ value: "website", label: "Сайт" },
	{ value: "phone", label: "Телефон" },
	{ value: "email", label: "Email" },
	{ value: "social", label: "Соц. сети" },
	{ value: "referral", label: "Рекомендация" },
	{ value: "advertising", label: "Реклама" },
	{ value: "other", label: "Другое" },
];

const PROPERTY_TYPES = [
	{ value: "apartment", label: "Квартира" },
	{ value: "house", label: "Дом" },
	{ value: "commercial", label: "Коммерческая" },
	{ value: "land", label: "Земля" },
];

interface LeadDialogProps {
	open: boolean;
	onClose: () => void;
	lead?: Lead;
	onSuccess: () => void;
}

function LeadDialog({ open, onClose, lead, onSuccess }: LeadDialogProps) {
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		fullName: "",
		phone: "",
		email: "",
		source: "website",
		status: "new",
		propertyType: "",
		budget: "",
		notes: "",
		leadDate: new Date().toISOString().split("T")[0],
	});

	useEffect(() => {
		if (lead && open) {
			setFormData({
				fullName: lead.fullName || "",
				phone: lead.phone || "",
				email: lead.email || "",
				source: lead.source || "website",
				status: lead.status || "new",
				propertyType: lead.propertyType || "",
				budget: lead.budget ? String(lead.budget) : "",
				notes: lead.notes || "",
				leadDate: lead.leadDate
					? lead.leadDate.split("T")[0]
					: new Date().toISOString().split("T")[0],
			});
		} else if (!lead && open) {
			setFormData({
				fullName: "",
				phone: "",
				email: "",
				source: "website",
				status: "new",
				propertyType: "",
				budget: "",
				notes: "",
				leadDate: new Date().toISOString().split("T")[0],
			});
		}
	}, [lead, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			const payload = {
				fullName: formData.fullName,
				phone: formData.phone,
				email: formData.email || null,
				source: formData.source,
				status: formData.status,
				propertyType: formData.propertyType || null,
				budget: formData.budget ? parseFloat(formData.budget) : null,
				notes: formData.notes || null,
				leadDate: formData.leadDate,
			};

			if (lead) {
				await api.patch(`/crm/leads/${lead.id}`, payload);
				toast({ title: "Лид обновлён" });
			} else {
				await api.post("/crm/leads", payload);
				toast({ title: "Лид создан" });
			}
			onSuccess();
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось сохранить лид",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{lead ? "Редактировать лид" : "Создать лид"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label>ФИО *</Label>
						<Input
							value={formData.fullName}
							onChange={(e) =>
								setFormData({ ...formData, fullName: e.target.value })
							}
							placeholder="Иванов Иван Иванович"
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

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Источник *</Label>
							<Select
								value={formData.source}
								onValueChange={(v) => setFormData({ ...formData, source: v })}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SOURCE_OPTIONS.map((opt) => (
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

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>Тип недвижимости</Label>
							<Select
								value={formData.propertyType}
								onValueChange={(v) =>
									setFormData({ ...formData, propertyType: v })
								}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Выберите" />
								</SelectTrigger>
								<SelectContent>
									{PROPERTY_TYPES.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Бюджет (KGS)</Label>
							<Input
								type="number"
								value={formData.budget}
								onChange={(e) =>
									setFormData({ ...formData, budget: e.target.value })
								}
								placeholder="5000000"
								className="mt-1"
							/>
						</div>
					</div>

					<div>
						<Label>Дата лида *</Label>
						<Input
							type="date"
							value={formData.leadDate}
							onChange={(e) =>
								setFormData({ ...formData, leadDate: e.target.value })
							}
							required
							className="mt-1"
						/>
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

export default function Leads() {
	const [leads, setLeads] = useState<Lead[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [sourceFilter, setSourceFilter] = useState<string>("all");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedLead, setSelectedLead] = useState<Lead | undefined>();
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [convertId, setConvertId] = useState<number | null>(null);
	const { toast } = useToast();

	const loadLeads = async () => {
		try {
			setIsLoading(true);
			const params: Record<string, string | undefined> = {
				search: search || undefined,
				status: statusFilter !== "all" ? statusFilter : undefined,
				source: sourceFilter !== "all" ? sourceFilter : undefined,
			};
			const response = await api.get<Lead[]>("/crm/leads", { params });
			setLeads(Array.isArray(response.data) ? response.data : []);
		} catch (err: any) {
			toast({
				title: "Ошибка загрузки",
				description: err.message || "Не удалось загрузить лиды",
				variant: "destructive",
			});
			setLeads([]);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadLeads();
	}, [search, statusFilter, sourceFilter]);

	const handleDelete = async () => {
		if (!deleteId) return;
		try {
			await api.delete(`/crm/leads/${deleteId}`);
			toast({ title: "Лид удалён" });
			loadLeads();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось удалить лид",
				variant: "destructive",
			});
		}
		setDeleteId(null);
	};

	const handleConvert = async () => {
		if (!convertId) return;
		try {
			await api.post(`/crm/leads/${convertId}/convert`);
			toast({ title: "Лид конвертирован в клиента" });
			loadLeads();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось конвертировать лид",
				variant: "destructive",
			});
		}
		setConvertId(null);
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

	return (
		<div className="space-y-5">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<UserPlus className="w-6 h-6 text-blue-600" /> Лиды
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Управление потенциальными клиентами
					</p>
				</div>
				<Button
					onClick={() => {
						setSelectedLead(undefined);
						setDialogOpen(true);
					}}
				>
					<Plus className="w-4 h-4 mr-2" /> Добавить лид
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
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Все статусы" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все статусы</SelectItem>
						{STATUS_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={sourceFilter} onValueChange={setSourceFilter}>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Все источники" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все источники</SelectItem>
						{SOURCE_OPTIONS.map((opt) => (
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
							<TableHead>ФИО</TableHead>
							<TableHead>Телефон</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Источник</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead>Тип недвиж.</TableHead>
							<TableHead>Бюджет</TableHead>
							<TableHead>Дата лида</TableHead>
							<TableHead className="w-32"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 9 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : !leads.length ? (
							<TableRow>
								<TableCell colSpan={9} className="text-center py-12">
									<UserPlus className="w-8 h-8 text-gray-200 mx-auto mb-2" />
									<p className="text-gray-400">Лиды не найдены</p>
								</TableCell>
							</TableRow>
						) : (
							leads.map((lead) => (
								<TableRow key={lead.id} className="hover:bg-gray-50">
									<TableCell className="font-medium text-gray-900">
										{lead.fullName}
									</TableCell>
									<TableCell className="text-gray-600">{lead.phone}</TableCell>
									<TableCell className="text-gray-500 text-sm">
										{lead.email || "—"}
									</TableCell>
									<TableCell className="text-sm">
										{SOURCE_OPTIONS.find((s) => s.value === lead.source)
											?.label || lead.source}
									</TableCell>
									<TableCell>{getStatusBadge(lead.status)}</TableCell>
									<TableCell className="text-sm">
										{PROPERTY_TYPES.find((p) => p.value === lead.propertyType)
											?.label ||
											lead.propertyType ||
											"—"}
									</TableCell>
									<TableCell className="text-sm">
										{lead.budget ? `${lead.budget.toLocaleString()} с` : "—"}
									</TableCell>
									<TableCell className="text-sm text-gray-500">
										{new Date(lead.leadDate).toLocaleDateString("ru-RU")}
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													setSelectedLead(lead);
													setDialogOpen(true);
												}}
												title="Редактировать"
											>
												<Edit2 className="w-4 h-4" />
											</Button>
											{lead.status === "qualified" && (
												<Button
													variant="ghost"
													size="icon"
													className="text-emerald-600 hover:text-emerald-700"
													onClick={() => setConvertId(lead.id)}
													title="Конвертировать в клиента"
												>
													<CheckCircle2 className="w-4 h-4" />
												</Button>
											)}
											<Button
												variant="ghost"
												size="icon"
												className="text-rose-600 hover:text-rose-700"
												onClick={() => setDeleteId(lead.id)}
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

			<LeadDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				lead={selectedLead}
				onSuccess={loadLeads}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить лид?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Лид будет удалён из системы.
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

			<AlertDialog
				open={convertId !== null}
				onOpenChange={(v) => !v && setConvertId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Конвертировать лид в клиента?</AlertDialogTitle>
						<AlertDialogDescription>
							Будет создан новый клиент и сделка на основе данных лида. Лид
							будет помечен как конвертирован.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction onClick={handleConvert}>
							Конвертировать
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
