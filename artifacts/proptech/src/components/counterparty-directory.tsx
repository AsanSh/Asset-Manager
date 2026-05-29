import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Edit2, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";

export const ROLE_LABELS: Record<string, string> = {
	tenant: "Арендатор",
	landlord: "Собственник",
	buyer: "Покупатель",
	seller: "Продавец",
	lead: "Лид",
	material_supplier: "Поставщик материалов",
	service_provider: "Поставщик услуг",
	subcontractor: "Подрядчик",
	other: "Прочее",
};

export const ROLE_COLORS: Record<string, string> = {
	tenant: "bg-blue-100 text-blue-800",
	landlord: "bg-violet-100 text-violet-800",
	buyer: "bg-emerald-100 text-emerald-800",
	seller: "bg-teal-100 text-teal-800",
	lead: "bg-amber-100 text-amber-800",
	material_supplier: "bg-purple-100 text-purple-800",
	service_provider: "bg-orange-100 text-orange-800",
	subcontractor: "bg-rose-100 text-rose-800",
	other: "bg-gray-100 text-gray-700",
};

export interface CounterpartyRow {
	id: number;
	type: string;
	category: string;
	categories?: string[] | null;
	fullName: string;
	iin?: string | null;
	phone?: string | null;
	email?: string | null;
	address?: string | null;
	comment?: string | null;
}

interface Props {
	title: string;
	subtitle?: string;
	/** Какие роли показывать на этой странице. Если массив — фильтр по любой из них. */
	allowedRoles: string[];
	/** Какая роль ставится по умолчанию при создании. */
	defaultRole: string;
	/** Разрешено ли создавать/редактировать/удалять. */
	canEdit?: boolean;
	/** Показывать ли селектор ролей в шапке (несколько вкладок). */
	showRoleTabs?: boolean;
}

export function CounterpartyDirectory({
	title,
	subtitle,
	allowedRoles,
	defaultRole,
	canEdit = true,
	showRoleTabs = false,
}: Props) {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState<string>("all");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<CounterpartyRow | null>(null);

	const queryRoles = roleFilter === "all" ? allowedRoles : [roleFilter];

	const { data: rows = [], isLoading } = useQuery<CounterpartyRow[]>({
		queryKey: ["counterparties", queryRoles.sort().join(",")],
		queryFn: () =>
			api
				.get("/counterparties", { params: { roles: queryRoles.join(",") } })
				.then((r) => r.data),
	});

	const createMut = useMutation({
		mutationFn: (data: Partial<CounterpartyRow> & { categories: string[] }) =>
			api.post("/counterparties", data).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["counterparties"] });
			toast({ title: "Контрагент добавлен" });
			setDialogOpen(false);
			setEditing(null);
		},
		onError: (e) => toast({ title: getApiErrorMessage(e, "Ошибка создания"), variant: "destructive" }),
	});

	const updateMut = useMutation({
		mutationFn: ({ id, data }: { id: number; data: Partial<CounterpartyRow> & { categories?: string[] } }) =>
			api.patch(`/counterparties/${id}`, data).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["counterparties"] });
			toast({ title: "Контрагент обновлён" });
			setDialogOpen(false);
			setEditing(null);
		},
		onError: (e) => toast({ title: getApiErrorMessage(e, "Ошибка обновления"), variant: "destructive" }),
	});

	const deleteMut = useMutation({
		mutationFn: (id: number) => api.delete(`/counterparties/${id}`).then(() => null),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["counterparties"] });
			toast({ title: "Удалено" });
		},
		onError: (e) => toast({ title: getApiErrorMessage(e, "Ошибка удаления"), variant: "destructive" }),
	});

	const filtered = rows.filter((r) =>
		!search ||
		r.fullName.toLowerCase().includes(search.toLowerCase()) ||
		(r.iin || "").includes(search) ||
		(r.phone || "").includes(search),
	);

	const openCreate = () => {
		setEditing(null);
		setDialogOpen(true);
	};
	const openEdit = (row: CounterpartyRow) => {
		setEditing(row);
		setDialogOpen(true);
	};

	return (
		<div className="p-6 space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">{title}</h1>
					{subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
				</div>
				{canEdit && (
					<Button onClick={openCreate} className="bg-amber-500 hover:bg-orange-600 gap-2">
						<Plus className="w-4 h-4" /> Добавить
					</Button>
				)}
			</div>

			{showRoleTabs && allowedRoles.length > 1 && (
				<div className="flex gap-1.5 flex-wrap">
					<button
						onClick={() => setRoleFilter("all")}
						className={`px-3 py-1.5 rounded-full text-xs font-medium ${roleFilter === "all" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
					>
						Все ({rows.length})
					</button>
					{allowedRoles.map((role) => {
						const count = rows.filter((r) => (r.categories || []).includes(role)).length;
						return (
							<button
								key={role}
								onClick={() => setRoleFilter(role)}
								className={`px-3 py-1.5 rounded-full text-xs font-medium ${roleFilter === role ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
							>
								{ROLE_LABELS[role] || role} ({count})
							</button>
						);
					})}
				</div>
			)}

			<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="p-3 border-b border-gray-100 flex items-center gap-2">
					<Search className="w-4 h-4 text-gray-400" />
					<Input
						className="border-0 shadow-none h-8 text-sm flex-1"
						placeholder="Поиск по ФИО / ИИН / телефону..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				<div className="overflow-auto max-h-[calc(100vh-280px)]">
					<table className="w-full text-xs border-collapse">
						<thead className="sticky top-0 bg-gray-50 z-10">
							<tr className="border-b border-gray-100">
								<th className="text-left px-3 py-2.5 font-semibold text-gray-500">ФИО / Название</th>
								<th className="text-left px-3 py-2.5 font-semibold text-gray-500">Роли</th>
								<th className="text-left px-3 py-2.5 font-semibold text-gray-500">ИИН / ИНН</th>
								<th className="text-left px-3 py-2.5 font-semibold text-gray-500">Телефон</th>
								<th className="text-left px-3 py-2.5 font-semibold text-gray-500">Email</th>
								{canEdit && <th className="px-3 py-2.5"></th>}
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								Array.from({ length: 5 }).map((_, i) => (
									<tr key={i} className="border-b border-gray-50">
										{Array.from({ length: canEdit ? 6 : 5 }).map((_, j) => (
											<td key={j} className="px-3 py-2.5">
												<Skeleton className="h-3 w-full" />
											</td>
										))}
									</tr>
								))
							) : filtered.length === 0 ? (
								<tr>
									<td colSpan={canEdit ? 6 : 5} className="text-center py-12 text-gray-400">
										<Briefcase className="w-8 h-8 mx-auto mb-2 opacity-20" />
										<p>Контрагентов нет</p>
									</td>
								</tr>
							) : (
								filtered.map((row, idx) => (
									<tr key={row.id} className={`border-b border-gray-50 ${idx % 2 ? "bg-gray-50/40" : ""} hover:bg-amber-50/30`}>
										<td className="px-3 py-2 font-medium text-gray-900">
											{row.fullName}
											<div className="text-[10px] text-gray-400">{row.type === "company" ? "Юр. лицо" : "Физ. лицо"}</div>
										</td>
										<td className="px-3 py-2">
											<div className="flex gap-1 flex-wrap">
												{(row.categories || []).map((cat) => (
													<Badge key={cat} className={`text-[10px] ${ROLE_COLORS[cat] || "bg-gray-100"}`} variant="secondary">
														{ROLE_LABELS[cat] || cat}
													</Badge>
												))}
											</div>
										</td>
										<td className="px-3 py-2 text-gray-600">{row.iin || "—"}</td>
										<td className="px-3 py-2 text-gray-600">{row.phone || "—"}</td>
										<td className="px-3 py-2 text-gray-600">{row.email || "—"}</td>
										{canEdit && (
											<td className="px-3 py-2">
												<div className="flex gap-1 justify-end">
													<button
														onClick={() => openEdit(row)}
														className="text-gray-400 hover:text-gray-700"
														title="Редактировать"
													>
														<Edit2 className="w-3.5 h-3.5" />
													</button>
													<button
														onClick={() => {
															if (confirm(`Удалить «${row.fullName}»?`)) deleteMut.mutate(row.id);
														}}
														className="text-gray-400 hover:text-rose-600"
														title="Удалить"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												</div>
											</td>
										)}
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				<div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-400">
					Показано: {filtered.length} из {rows.length}
				</div>
			</div>

			{dialogOpen && (
				<CounterpartyDialog
					open={dialogOpen}
					editing={editing}
					allowedRoles={allowedRoles}
					defaultRole={defaultRole}
					onClose={() => {
						setDialogOpen(false);
						setEditing(null);
					}}
					onSave={(data) => {
						if (editing) updateMut.mutate({ id: editing.id, data });
						else createMut.mutate(data as any);
					}}
					saving={createMut.isPending || updateMut.isPending}
				/>
			)}
		</div>
	);
}

function CounterpartyDialog({
	open,
	editing,
	allowedRoles,
	defaultRole,
	onClose,
	onSave,
	saving,
}: {
	open: boolean;
	editing: CounterpartyRow | null;
	allowedRoles: string[];
	defaultRole: string;
	onClose: () => void;
	onSave: (data: Partial<CounterpartyRow> & { categories: string[] }) => void;
	saving: boolean;
}) {
	const [form, setForm] = useState({
		type: editing?.type || "company",
		fullName: editing?.fullName || "",
		iin: editing?.iin || "",
		phone: editing?.phone || "",
		email: editing?.email || "",
		address: editing?.address || "",
		comment: editing?.comment || "",
		categories: editing?.categories?.length ? editing.categories : [defaultRole],
	});

	const toggleRole = (role: string) => {
		setForm((f) => {
			const has = f.categories.includes(role);
			const next = has ? f.categories.filter((c) => c !== role) : [...f.categories, role];
			return { ...f, categories: next.length ? next : [defaultRole] };
		});
	};

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.fullName.trim()) return;
		onSave({
			type: form.type,
			fullName: form.fullName.trim(),
			iin: form.iin.trim() || null,
			phone: form.phone.trim() || null,
			email: form.email.trim() || null,
			address: form.address.trim() || null,
			comment: form.comment.trim() || null,
			categories: form.categories,
		});
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{editing ? "Редактировать контрагента" : "Новый контрагент"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-3">
					<div>
						<Label className="text-sm">Тип</Label>
						<Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
							<SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="company">Юридическое лицо</SelectItem>
								<SelectItem value="individual">Физическое лицо</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label className="text-sm">ФИО / Название *</Label>
						<Input
							className="mt-1"
							value={form.fullName}
							onChange={(e) => setForm({ ...form, fullName: e.target.value })}
							required
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label className="text-sm">ИИН / ИНН</Label>
							<Input className="mt-1" value={form.iin} onChange={(e) => setForm({ ...form, iin: e.target.value })} />
						</div>
						<div>
							<Label className="text-sm">Телефон</Label>
							<Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
						</div>
					</div>

					<div>
						<Label className="text-sm">Email</Label>
						<Input className="mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
					</div>

					<div>
						<Label className="text-sm">Адрес</Label>
						<Input className="mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
					</div>

					<div>
						<Label className="text-sm">Роли *</Label>
						<div className="mt-1.5 flex gap-1.5 flex-wrap">
							{allowedRoles.map((role) => {
								const checked = form.categories.includes(role);
								return (
									<button
										key={role}
										type="button"
										onClick={() => toggleRole(role)}
										className={`px-3 py-1 rounded-full text-xs font-medium border ${checked ? `${ROLE_COLORS[role]} border-transparent` : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}
									>
										{checked && "✓ "}
										{ROLE_LABELS[role] || role}
									</button>
								);
							})}
						</div>
						<p className="text-[10px] text-gray-400 mt-1">
							Можно выбрать несколько ролей — например, поставщик может быть и покупателем
						</p>
					</div>

					<div>
						<Label className="text-sm">Комментарий</Label>
						<Input className="mt-1" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose} disabled={saving}>
							Отмена
						</Button>
						<Button type="submit" className="bg-amber-500 hover:bg-orange-600" disabled={saving || !form.fullName.trim()}>
							{saving ? "Сохранение..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
