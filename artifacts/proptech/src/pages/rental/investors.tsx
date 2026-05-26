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
import { useState } from "react";
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
						<div className="col-span-2">
							<Label>ФИО / Название компании *</Label>
							<Input
								className="mt-1"
								value={form.fullName}
								onChange={(e) => set("fullName", e.target.value)}
								required
							/>
						</div>
						<div>
							<Label>Тип</Label>
							<Select value={form.type} onValueChange={(v) => set("type", v)}>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="individual">Физ. лицо</SelectItem>
									<SelectItem value="company">Юр. лицо</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Статус</Label>
							<Select
								value={form.status}
								onValueChange={(v) => set("status", v)}
							>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="active">Активен</SelectItem>
									<SelectItem value="inactive">Неактивен</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Телефон</Label>
							<Input
								className="mt-1"
								value={form.phone}
								onChange={(e) => set("phone", e.target.value)}
								placeholder="+996 700 000 000"
							/>
						</div>
						<div>
							<Label>Email</Label>
							<Input
								className="mt-1"
								value={form.email}
								onChange={(e) => set("email", e.target.value)}
								type="email"
							/>
						</div>
						<div>
							<Label>ИНН</Label>
							<Input
								className="mt-1"
								value={form.iin}
								onChange={(e) => set("iin", e.target.value)}
							/>
						</div>
						<div>
							<Label>Telegram</Label>
							<Input
								className="mt-1"
								value={form.telegramId}
								onChange={(e) => set("telegramId", e.target.value)}
								placeholder="@username или ID"
							/>
						</div>
						<div className="col-span-2">
							<Label>Заметки</Label>
							<Input
								className="mt-1"
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
	const [search, setSearch] = useState("");

	const { data: investors = [], isLoading } = useQuery<Investor[]>({
		queryKey: ["investors"],
		queryFn: () => api.get("/rental/investors").then((r) => r.data),
	});

	const investorsArray = Array.isArray(investors) ? investors : [];

	const filtered = investorsArray.filter(
		(i) =>
			!search ||
			i.fullName.toLowerCase().includes(search.toLowerCase()) ||
			i.phone?.includes(search) ||
			i.email?.toLowerCase().includes(search.toLowerCase()),
	);

	const handleDelete = async (id: number, name: string) => {
		if (!confirm(`Удалить владельца "${name}"?`)) return;
		try {
			await authFetch(`/rental/investors/${id}`, { method: "DELETE" });
			toast({ title: "Владелец удалён" });
			queryClient.invalidateQueries({ queryKey: ["investors"] });
		} catch (e: unknown) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" });
		}
	};

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

			{/* Search */}
			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div className="p-4 border-b border-gray-100">
					<Input
						placeholder="Поиск по имени, телефону, email..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="max-w-sm"
					/>
				</div>

				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Владелец</TableHead>
							<TableHead>Тип</TableHead>
							<TableHead>Контакты</TableHead>
							<TableHead>ИНН</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead>Добавлен</TableHead>
							<TableHead className="text-center">Действия</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 4 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 7 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : filtered.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="text-center py-12 text-gray-400"
								>
									<Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
									<p>
										{search ? "Владельцы не найдены" : "Владельцев пока нет"}
									</p>
								</TableCell>
							</TableRow>
						) : (
							filtered.map((inv) => (
								<TableRow key={inv.id} className="hover:bg-gray-50">
									<TableCell>
										<div className="flex items-center gap-2.5">
											<div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold flex-shrink-0">
												{inv.fullName.charAt(0).toUpperCase()}
											</div>
											<div>
												<p className="font-medium text-gray-900 text-sm">
													{inv.fullName}
												</p>
												{inv.telegramId && (
													<p className="text-xs text-gray-400">
														TG: {inv.telegramId}
													</p>
												)}
											</div>
										</div>
									</TableCell>
									<TableCell>
										<span className="text-xs text-gray-600">
											{typeLabels[inv.type] || inv.type}
										</span>
									</TableCell>
									<TableCell>
										<div className="space-y-0.5">
											{inv.phone && (
												<div className="flex items-center gap-1 text-xs text-gray-600">
													<Phone className="w-3 h-3" /> {inv.phone}
												</div>
											)}
											{inv.email && (
												<div className="flex items-center gap-1 text-xs text-gray-500">
													<Mail className="w-3 h-3" /> {inv.email}
												</div>
											)}
										</div>
									</TableCell>
									<TableCell className="text-sm text-gray-500">
										{inv.iin || "—"}
									</TableCell>
									<TableCell>
										<Badge
											className={statusColors[inv.status] || ""}
											variant="secondary"
										>
											{inv.status === "active" ? "Активен" : "Неактивен"}
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-gray-500">
										{fmtDate(inv.createdAt)}
									</TableCell>
									<TableCell>
										<div className="flex gap-1 justify-center">
											<Button
												size="sm"
												variant="ghost"
												className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 gap-1"
												onClick={() => navigate(`/rental/investors/${inv.id}`)}
											>
												<ExternalLink className="w-3 h-3" /> Портал
											</Button>
											<Button
												size="sm"
												variant="ghost"
												className="h-7 w-7 p-0"
												onClick={() => setDialog(inv)}
											>
												<Eye className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500" />
											</Button>
											<Button
												size="sm"
												variant="ghost"
												className="h-7 w-7 p-0"
												onClick={() => handleDelete(inv.id, inv.fullName)}
											>
												<Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

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
