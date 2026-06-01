import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ExternalLink,
	Eye,
	Mail,
	Phone,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { useLocation } from "wouter";
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
import { authFetch } from "@/lib/auth-fetch";
import { getApiErrorMessage } from "@/lib/api-error";

function fmtDate(d: string) {
	return new Date(d).toLocaleDateString("ru-KG");
}

const typeLabels: Record<string, string> = {
	individual: "Физ. лицо",
	company: "Юр. лицо",
};
const statusColors: Record<string, string> = {
	active: "bg-emerald-100 text-emerald-800",
	inactive: "bg-gray-100 text-gray-600",
};

interface Investor {
	id: number;
	fullName: string;
	type: string;
	phone?: string;
	email?: string;
	iin?: string;
	telegramId?: string;
	status: string;
	notes?: string;
	createdAt: string;
}

function InvestorDialog({
	investor,
	onClose,
	onSaved,
}: {
	investor: Investor | null | "new";
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const isEdit = investor && investor !== "new";
	const init = isEdit ? (investor as Investor) : null;
	const [form, setForm] = useState({
		fullName: init?.fullName ?? "",
		type: init?.type ?? "individual",
		phone: init?.phone ?? "",
		email: init?.email ?? "",
		iin: init?.iin ?? "",
		telegramId: init?.telegramId ?? "",
		status: init?.status ?? "active",
		notes: init?.notes ?? "",
	});
	const [loading, setLoading] = useState(false);

	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.fullName.trim()) {
			toast({ title: "Введите имя", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const path = isEdit
				? `/rental/investors/${(init as Investor).id}`
				: "/rental/investors";
			await authFetch(path, {
				method: isEdit ? "PATCH" : "POST",
				body: JSON.stringify(form),
			});
			toast({ title: isEdit ? "Владелец обновлён" : "Владелец добавлен" });
			onSaved();
			onClose();
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!investor} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Редактировать владельца" : "Добавить владельца"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div className="col-span-2 flex flex-col">
							<Label className="leading-tight mb-1.5">ФИО / Название компании *</Label>
							<Input
								className="mt-auto"
								value={form.fullName}
								onChange={(e) => set("fullName", e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Тип</Label>
							<Select value={form.type} onValueChange={(v) => set("type", v)}>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="individual">Физ. лицо</SelectItem>
									<SelectItem value="company">Юр. лицо</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Статус</Label>
							<Select
								value={form.status}
								onValueChange={(v) => set("status", v)}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="active">Активен</SelectItem>
									<SelectItem value="inactive">Неактивен</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Телефон</Label>
							<Input
								className="mt-auto"
								value={form.phone}
								onChange={(e) => set("phone", e.target.value)}
								placeholder="+996 700 000 000"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Email</Label>
							<Input
								className="mt-auto"
								value={form.email}
								onChange={(e) => set("email", e.target.value)}
								type="email"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">ИНН</Label>
							<Input
								className="mt-auto"
								value={form.iin}
								onChange={(e) => set("iin", e.target.value)}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Telegram</Label>
							<Input
								className="mt-auto"
								value={form.telegramId}
								onChange={(e) => set("telegramId", e.target.value)}
								placeholder="@username или ID"
							/>
						</div>
						<div className="col-span-2 flex flex-col">
							<Label className="leading-tight mb-1.5">Заметки</Label>
							<Input
								className="mt-auto"
								value={form.notes}
								onChange={(e) => set("notes", e.target.value)}
							/>
						</div>
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
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

export default function Investors() {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [, navigate] = useLocation();
	const [dialog, setDialog] = useState<Investor | null | "new">(null);

	const { data: investors = [], isLoading } = useQuery<Investor[]>({
		queryKey: ["investors"],
		queryFn: () => api.get("/rental/investors").then((r) => r.data),
	});

	const investorsArray = Array.isArray(investors) ? investors : [];

	const handleDelete = useCallback(async (id: number, name: string) => {
		if (!confirm(`Удалить владельца "${name}"?`)) return;
		try {
			await authFetch(`/rental/investors/${id}`, { method: "DELETE" });
			toast({ title: "Владелец удалён" });
			queryClient.invalidateQueries({ queryKey: ["investors"] });
		} catch (e: unknown) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" });
		}
	}, [queryClient, toast]);

	const columns = useMemo<ColumnDef<Investor, unknown>[]>(
		() => [
			{
				id: "fullName",
				header: "Владелец",
				size: 200,
				accessorFn: (row) => row.fullName,
				meta: { exportLabel: "Владелец", pinned: "left" },
				cell: ({ row }) => (
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold shrink-0">
							{row.original.fullName.charAt(0).toUpperCase()}
						</div>
						<div>
							<p className="font-medium text-sm">{row.original.fullName}</p>
							{row.original.telegramId && (
								<p className="text-xs text-muted-foreground">
									TG: {row.original.telegramId}
								</p>
							)}
						</div>
					</div>
				),
			},
			{
				id: "type",
				header: "Тип",
				size: 100,
				accessorKey: "type",
				meta: { exportLabel: "Тип" },
				cell: ({ row }) => typeLabels[row.original.type] || row.original.type,
			},
			{
				id: "contacts",
				header: "Контакты",
				size: 180,
				accessorFn: (row) => `${row.phone || ""} ${row.email || ""}`.trim(),
				meta: { exportLabel: "Контакты" },
				cell: ({ row }) => (
					<div className="space-y-0.5">
						{row.original.phone && (
							<div className="flex items-center gap-1 text-xs">
								<Phone className="w-3 h-3" /> {row.original.phone}
							</div>
						)}
						{row.original.email && (
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<Mail className="w-3 h-3" /> {row.original.email}
							</div>
						)}
						{!row.original.phone && !row.original.email && "—"}
					</div>
				),
			},
			{
				accessorKey: "iin",
				header: "ИНН",
				size: 120,
				meta: { exportLabel: "ИНН" },
				cell: ({ row }) => row.original.iin || "—",
			},
			{
				id: "status",
				header: "Статус",
				size: 110,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge className={statusColors[row.original.status] || ""} variant="secondary">
						{row.original.status === "active" ? "Активен" : "Неактивен"}
					</Badge>
				),
			},
			{
				id: "createdAt",
				header: "Добавлен",
				size: 110,
				accessorFn: (row) => row.createdAt,
				meta: { exportLabel: "Добавлен" },
				cell: ({ row }) => fmtDate(row.original.createdAt),
			},
			{
				id: "actions",
				header: "",
				size: 120,
				enableSorting: false,
				meta: { align: "center" },
				cell: ({ row }) => (
					<div className="flex gap-1 justify-center">
						<Button
							size="sm"
							variant="ghost"
							className="h-7 px-2 text-xs text-blue-600 gap-1"
							onClick={() => navigate(`/rental/investors/${row.original.id}`)}
						>
							<ExternalLink className="w-3 h-3" /> Портал
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 w-7 p-0"
							onClick={() => setDialog(row.original)}
						>
							<Eye className="w-3.5 h-3.5" />
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 w-7 p-0"
							onClick={() => handleDelete(row.original.id, row.original.fullName)}
						>
							<Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-rose-600" />
						</Button>
					</div>
				),
			},
		],
		[handleDelete, navigate],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Владельцы</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Участники, владеющие долями в объектах
					</p>
				</div>
				<Button onClick={() => setDialog("new")} className="gap-2">
					<Plus className="w-4 h-4" /> Добавить владельца
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-4">
				{[
					{
						label: "Всего владельцев",
						value: investorsArray.length,
						icon: Users,
						color: "text-blue-600",
					},
					{
						label: "Активных",
						value: investorsArray.filter((i) => i.status === "active").length,
						icon: Users,
						color: "text-emerald-600",
					},
					{
						label: "Физ. лиц",
						value: investorsArray.filter((i) => i.type === "individual").length,
						icon: Users,
						color: "text-indigo-600",
					},
				].map((s) => (
					<div
						key={s.label}
						className="bg-white rounded-xl border border-gray-200 p-4"
					>
						<p className="text-xs text-gray-500 mb-1">{s.label}</p>
						<p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
					</div>
				))}
			</div>

			<DataTable
				tableId="rental-investors"
				columns={columns}
				data={investorsArray}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по имени, телефону, email…"
				initialSorting={[{ id: "fullName", desc: false }]}
				emptyState={
					<div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
						<Users className="w-10 h-10 opacity-30" />
						<span>Владельцев пока нет</span>
					</div>
				}
			/>

			<InvestorDialog
				investor={dialog}
				onClose={() => setDialog(null)}
				onSaved={() =>
					queryClient.invalidateQueries({ queryKey: ["investors"] })
				}
			/>
		</div>
	);
}
