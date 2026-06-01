import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Eye,
	EyeOff,
	Mail,
	Plus,
	Shield,
	UserCircle,
	Users,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import {
	RoleSelect,
	resolveRoleLabel,
	useCompanyRoles,
} from "@/lib/user-roles";

interface Employee {
	id: number;
	firstName: string;
	lastName: string;
	email: string;
	role: string;
	isActive: boolean;
}

const CRM_ROLES = new Set([
	"sales_manager",
	"company_admin",
	"admin",
	"owner",
	"manager",
]);

const EMPTY_FORM = {
	firstName: "",
	lastName: "",
	email: "",
	password: "",
	role: "sales_manager",
};

export default function CrmEmployees() {
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const qc = useQueryClient();
	const { data: customRoles = [] } = useCompanyRoles();

	const { data: users = [], isLoading } = useQuery<Employee[]>({
		queryKey: ["company-users"],
		queryFn: () => api.get("/users").then((r) => r.data),
	});

	const crmUsers = useMemo(
		() =>
			users.filter(
				(u) => CRM_ROLES.has(u.role) || u.role.startsWith("custom_"),
			),
		[users],
	);

	const columns = useMemo<ColumnDef<Employee, unknown>[]>(
		() => [
			{
				id: "name",
				header: "Сотрудник",
				size: 200,
				accessorFn: (row) => `${row.firstName} ${row.lastName}`.trim(),
				meta: { exportLabel: "Сотрудник", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium">
						{row.original.firstName} {row.original.lastName}
					</span>
				),
			},
			{
				accessorKey: "email",
				header: "Почта",
				size: 220,
				meta: { exportLabel: "Email" },
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground">{row.original.email}</span>
				),
			},
			{
				id: "role",
				header: "Роль",
				size: 160,
				accessorKey: "role",
				meta: { exportLabel: "Роль" },
				cell: ({ row }) => (
					<Badge variant="secondary" className="bg-blue-100 text-blue-800">
						{resolveRoleLabel(row.original.role, customRoles)}
					</Badge>
				),
			},
			{
				id: "status",
				header: "Статус",
				size: 110,
				accessorFn: (row) => (row.isActive !== false ? "active" : "inactive"),
				meta: { exportLabel: "Статус" },
				cell: ({ row }) =>
					row.original.isActive !== false ? (
						<Badge className="bg-emerald-100 text-emerald-800">Активен</Badge>
					) : (
						<Badge className="bg-rose-100 text-rose-700">Неактивен</Badge>
					),
			},
		],
		[customRoles],
	);

	function openCreate() {
		setForm(EMPTY_FORM);
		setEditingId(null);
		setError("");
		setModalOpen(true);
	}

	function openEdit(u: Employee) {
		setForm({
			firstName: u.firstName,
			lastName: u.lastName,
			email: u.email,
			password: "",
			role: u.role,
		});
		setEditingId(u.id);
		setError("");
		setModalOpen(true);
	}

	function closeModal() {
		setModalOpen(false);
		setError("");
	}

	async function handleSave() {
		if (!form.firstName.trim() || !form.lastName.trim()) {
			setError("Заполните имя и фамилию");
			return;
		}
		if (!form.email.trim()) {
			setError("Укажите email");
			return;
		}
		if (!editingId && (!form.password || form.password.length < 6)) {
			setError("Пароль — минимум 6 символов");
			return;
		}
		setSaving(true);
		setError("");
		try {
			if (editingId) {
				const body: Record<string, string> = {
					firstName: form.firstName,
					lastName: form.lastName,
					role: form.role,
				};
				if (form.password.trim()) body.password = form.password;
				await api.patch(`/users/${editingId}`, body);
			} else {
				await api.post("/users", form);
			}
			qc.invalidateQueries({ queryKey: ["company-users"] });
			closeModal();
		} catch (e: unknown) {
			setError(getApiErrorMessage(e, "Ошибка сохранения"));
		} finally {
			setSaving(false);
		}
	}

	const activeCount = crmUsers.filter((u) => u.isActive !== false).length;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Users className="w-6 h-6 text-blue-600" />
						Сотрудники CRM
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Менеджеры по продажам и ответственные за лиды и сделки
					</p>
				</div>
				<Button size="sm" onClick={openCreate} className="gap-1.5">
					<Plus className="w-4 h-4" /> Добавить
				</Button>
			</div>

			<div className="grid grid-cols-2 gap-4 max-w-md">
				<div className="bg-white border rounded-lg p-4">
					<p className="text-sm text-gray-500">В CRM-команде</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">{crmUsers.length}</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-sm text-gray-500">Активных</p>
					<p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
				</div>
			</div>

			<DataTable
				tableId="crm-employees"
				columns={columns}
				data={crmUsers}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по имени или email…"
				initialSorting={[{ id: "name", desc: false }]}
				onRowClick={openEdit}
				rowClassName={() => "cursor-pointer"}
				emptyState={
					<div className="flex flex-col items-center gap-2">
						<UserCircle className="w-10 h-10 opacity-30" />
						<span>Нет сотрудников CRM</span>
					</div>
				}
			/>

			{modalOpen && (
				<div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl w-full max-w-md">
						<div className="flex items-center justify-between px-5 py-4 border-b">
							<div className="flex items-center gap-2">
								<Shield className="w-4 h-4 text-blue-600" />
								<h2 className="font-semibold text-gray-900">
									{editingId ? "Редактировать" : "Новый менеджер"}
								</h2>
							</div>
							<button type="button" onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg">
								<X className="w-4 h-4 text-gray-500" />
							</button>
						</div>
						<div className="p-5 space-y-4">
							<div className="grid grid-cols-2 gap-3">
								<div className="flex flex-col">
									<Label className="leading-tight mb-1.5">Имя *</Label>
									<Input className="mt-auto h-9" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
								</div>
								<div className="flex flex-col">
									<Label className="leading-tight mb-1.5">Фамилия *</Label>
									<Input className="mt-auto h-9" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
								</div>
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Email *</Label>
								<Input className="mt-auto h-9" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} disabled={!!editingId} />
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">{editingId ? "Новый пароль" : "Пароль *"}</Label>
								<div className="relative mt-auto">
									<Input className="h-9 pr-10" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
									<button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-2 text-gray-400">
										{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									</button>
								</div>
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5">Роль *</Label>
								<RoleSelect value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))} className="mt-auto h-9" />
							</div>
							{error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
						</div>
						<div className="flex justify-end gap-2 px-5 py-4 border-t">
							<Button variant="outline" size="sm" onClick={closeModal} disabled={saving}>Отмена</Button>
							<Button size="sm" onClick={handleSave} disabled={saving} className="min-w-[100px]">
								{saving ? "Сохранение..." : editingId ? "Сохранить" : "Добавить"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
