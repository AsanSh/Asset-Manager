import {
	CheckCircle2,
	Edit2,
	Plus,
	Rss,
	Trash2,
	UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "wouter";
import { DataTable } from "@/components/data-table";
import { defaultPeriod, inPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
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
	channel?: string | null;
	projectId?: number | null;
	externalId?: string | null;
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

const CHANNEL_OPTIONS = [
	{ value: "instagram", label: "Instagram" },
	{ value: "facebook", label: "Facebook" },
	{ value: "telegram", label: "Telegram" },
	{ value: "whatsapp", label: "WhatsApp" },
	{ value: "tiktok", label: "TikTok" },
	{ value: "other", label: "Другое" },
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
	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
		enabled: open,
	});
	const [formData, setFormData] = useState({
		fullName: "",
		phone: "",
		email: "",
		source: "website",
		status: "new",
		propertyType: "",
		budget: "",
		notes: "",
		channel: "",
		projectId: "",
		externalId: "",
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
				channel: lead.channel || "",
				projectId: lead.projectId ? String(lead.projectId) : "",
				externalId: lead.externalId || "",
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
				channel: "",
				projectId: "",
				externalId: "",
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
				channel: formData.channel || null,
				projectId: formData.projectId ? Number(formData.projectId) : null,
				externalId: formData.externalId || null,
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

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Источник *</Label>
							<Select
								value={formData.source}
								onValueChange={(v) => setFormData({ ...formData, source: v })}
							>
								<SelectTrigger className="mt-auto">
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

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Тип недвижимости</Label>
							<Select
								value={formData.propertyType}
								onValueChange={(v) =>
									setFormData({ ...formData, propertyType: v })
								}
							>
								<SelectTrigger className="mt-auto">
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
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Бюджет (сом)</Label>
							<Input
								type="number"
								value={formData.budget}
								onChange={(e) =>
									setFormData({ ...formData, budget: e.target.value })
								}
								placeholder="5000000"
								className="mt-auto"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Канал (соцсети)</Label>
							<Select
								value={formData.channel || "none"}
								onValueChange={(v) =>
									setFormData({ ...formData, channel: v === "none" ? "" : v })
								}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue placeholder="—" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">—</SelectItem>
									{CHANNEL_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Проект</Label>
							<Select
								value={formData.projectId || "none"}
								onValueChange={(v) =>
									setFormData({ ...formData, projectId: v === "none" ? "" : v })
								}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue placeholder="—" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">—</SelectItem>
									{projects.map((p: { id: number; name: string }) => (
										<SelectItem key={p.id} value={String(p.id)}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col col-span-2">
							<Label className="leading-tight mb-1.5">External ID</Label>
							<Input
								className="mt-auto font-mono text-xs"
								value={formData.externalId}
								onChange={(e) =>
									setFormData({ ...formData, externalId: e.target.value })
								}
								placeholder="ID сообщения во внешней системе"
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
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [sourceFilter, setSourceFilter] = useState<string>("all");
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const filteredLeads = useMemo(
		() => leads.filter((l) => inPeriod(l.leadDate, period)),
		[leads, period],
	);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedLead, setSelectedLead] = useState<Lead | undefined>();
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [convertId, setConvertId] = useState<number | null>(null);
	const { toast } = useToast();

	const loadLeads = async () => {
		try {
			setIsLoading(true);
			const params: Record<string, string | undefined> = {
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
	}, [statusFilter, sourceFilter]);

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

	const columns = useMemo<ColumnDef<Lead, unknown>[]>(
		() => [
			{
				accessorKey: "fullName",
				header: "ФИО",
				size: 180,
				meta: { exportLabel: "ФИО", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium text-gray-900">{row.original.fullName}</span>
				),
			},
			{
				accessorKey: "phone",
				header: "Телефон",
				size: 130,
				meta: { exportLabel: "Телефон" },
			},
			{
				accessorKey: "email",
				header: "Почта",
				size: 160,
				meta: { exportLabel: "Email" },
				cell: ({ row }) => (
					<span className="text-gray-500 text-sm">{row.original.email || "—"}</span>
				),
			},
			{
				id: "channel",
				header: "Канал",
				size: 110,
				accessorFn: (row) => row.channel || "",
				meta: { exportLabel: "Канал" },
				cell: ({ row }) => {
					const ch = row.original.channel;
					if (!ch) return "—";
					return CHANNEL_OPTIONS.find((c) => c.value === ch)?.label ?? ch;
				},
			},
			{
				id: "source",
				header: "Источник",
				size: 110,
				accessorKey: "source",
				meta: { exportLabel: "Источник" },
				cell: ({ row }) =>
					SOURCE_OPTIONS.find((s) => s.value === row.original.source)?.label ||
					row.original.source,
			},
			{
				id: "status",
				header: "Статус",
				size: 130,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => getStatusBadge(row.original.status),
			},
			{
				id: "propertyType",
				header: "Тип недвиж.",
				size: 120,
				accessorKey: "propertyType",
				meta: { exportLabel: "Тип недвиж." },
				cell: ({ row }) =>
					PROPERTY_TYPES.find((p) => p.value === row.original.propertyType)?.label ||
					row.original.propertyType ||
					"—",
			},
			{
				id: "budget",
				header: "Бюджет",
				size: 120,
				accessorFn: (row) => parseFloat(String(row.budget ?? "0")),
				meta: { exportLabel: "Бюджет (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-sm">
						{row.original.budget
							? `${Number(row.original.budget).toLocaleString("ru-KG")} сом`
							: "—"}
					</span>
				),
			},
			{
				id: "leadDate",
				header: "Дата лида",
				size: 110,
				accessorFn: (row) => new Date(row.leadDate).getTime(),
				meta: { exportLabel: "Дата лида" },
				cell: ({ row }) => (
					<span className="text-sm text-gray-500">
						{new Date(row.original.leadDate).toLocaleDateString("ru-RU")}
					</span>
				),
			},
			{
				id: "__actions",
				header: "",
				size: 100,
				enableSorting: false,
				cell: ({ row }) => {
					const lead = row.original;
					return (
						<div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
						<UserPlus className="w-6 h-6 text-blue-600" /> Лиды
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Управление потенциальными клиентами
					</p>
				</div>
				<div className="flex gap-2">
					<Link href="/crm/leads/intake">
						<Button variant="outline" className="gap-2">
							<Rss className="w-4 h-4" /> Приём лидов
						</Button>
					</Link>
					<Button
						onClick={() => {
							setSelectedLead(undefined);
							setDialogOpen(true);
						}}
					>
						<Plus className="w-4 h-4 mr-2" /> Добавить лид
					</Button>
				</div>
			</div>

			<PeriodPicker value={period} onChange={setPeriod} />

			<DataTable
				tableId="crm-leads"
				columns={columns}
				data={filteredLeads}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по имени, телефону, email…"
				initialSorting={[{ id: "leadDate", desc: true }]}
				toolbar={
					<div className="flex gap-2 flex-wrap">
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-44 h-8">
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
							<SelectTrigger className="w-44 h-8">
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
				}
				onRowClick={(lead) => {
					setSelectedLead(lead);
					setDialogOpen(true);
				}}
				rowClassName={() => "cursor-pointer hover:bg-gray-50"}
				emptyState={
					<div className="flex flex-col items-center gap-2">
						<UserPlus className="w-8 h-8 text-gray-200" />
						<span className="text-gray-400">Лиды не найдены</span>
					</div>
				}
			/>

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
