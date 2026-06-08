import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
	Eye,
	EyeOff,
	HardHat,
	Pencil,
	Plus,
	Shield,
	UserCircle,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
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

const EMPTY_FORM = {
	firstName: "",
	lastName: "",
	email: "",
	password: "",
	role: "staff",
};

export default function ConstructionEmployees() {
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

	const active = users.filter((u) => u.isActive !== false);

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
			const err = e as { response?: { data?: { error?: string } } };
			setError(getApiErrorMessage(err, "Ошибка сохранения"));
		} finally {
			setSaving(false);
		}
	}

	const columns = useMemo<ColumnDef<Employee, unknown>[]>(
		() => [
			{
				id: "name",
				header: "ФИО",
				meta: { exportLabel: "ФИО" },
				cell: ({ row }) => (
					<div className="font-medium text-gray-900">
						{row.original.firstName} {row.original.lastName}
					</div>
				),
			},
			{
				id: "email",
				accessorKey: "email",
				header: "Email",
				meta: { exportLabel: "Email" },
				cell: ({ getValue }) => (
					<span className="text-sm text-gray-600">{getValue() as string}</span>
				),
			},
			{
				id: "role",
				accessorKey: "role",
				header: "Роль",
				meta: { exportLabel: "Роль" },
				cell: ({ getValue }) => (
					<Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
						{resolveRoleLabel(getValue() as string, customRoles)}
					</Badge>
				),
			},
			{
				id: "isActive",
				accessorKey: "isActive",
				header: "Статус",
				meta: { exportLabel: "Статус" },
				cell: ({ getValue }) =>
					getValue() !== false ? (
						<Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
							Активен
						</Badge>
					) : (
						<Badge className="bg-rose-100 text-rose-700 border-rose-200">
							Неактивен
						</Badge>
					),
			},
			{
				id: "__actions",
				header: "",
				enableSorting: false,
				cell: ({ row }) => (
					<div
						className="flex justify-end"
						onClick={(e) => e.stopPropagation()}
					>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={() => openEdit(row.original)}
							title="Редактировать"
						>
							<Pencil className="w-4 h-4" />
						</Button>
					</div>
				),
			},
		],
		[customRoles],
	);

	return (
		<div className="p-6 space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<HardHat className="w-6 h-6 text-orange-600" />
						Сотрудники строительства
					</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Пользователи системы с доступом к модулю строительства
					</p>
				</div>
				<Button
					size="sm"
					onClick={openCreate}
					className="h-8 gap-1.5 bg-orange-600 hover:bg-orange-700"
				>
					<Plus className="w-4 h-4" /> Добавить сотрудника
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<div className="bg-white border rounded-lg p-4">
					<p className="text-sm text-gray-500">Всего</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-sm text-gray-500">Активных</p>
					<p className="text-2xl font-bold text-emerald-600 mt-1">{active.length}</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-sm text-gray-500">С кастомными ролями</p>
					<p className="text-2xl font-bold text-orange-600 mt-1">
						{users.filter((u) => u.role.startsWith("custom_")).length}
					</p>
				</div>
			</div>

			<DataTable
				tableId="construction-employees"
				columns={columns}
				data={users}
				isLoading={isLoading}
				onRowClick={(u) => openEdit(u)}
				enableSearch
				searchPlaceholder="Поиск по имени, email…"
				initialSorting={[{ id: "name", desc: false }]}
				emptyState={
					<div className="text-center py-8 text-gray-600">
						<UserCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
						<p className="text-sm mb-3">Нет сотрудников</p>
						<Button size="sm" variant="outline" onClick={openCreate} className="gap-1">
							<Plus className="w-3.5 h-3.5" /> Добавить первого
						</Button>
					</div>
				}
			/>

			{modalOpen && (
				<div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl w-full max-w-md">
						<div className="flex items-center justify-between px-5 py-4 border-b">
							<div className="flex items-center gap-2">
								<Shield className="w-4 h-4 text-orange-600" />
								<h2 className="font-semibold text-gray-900">
									{editingId ? "Редактировать сотрудника" : "Новый сотрудник"}
								</h2>
							</div>
							<button
								type="button"
								onClick={closeModal}
								className="p-1.5 hover:bg-gray-100 rounded-lg"
							>
								<X className="w-4 h-4 text-gray-500" />
							</button>
						</div>

						<div className="p-5 space-y-4">
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="flex flex-col">
									<Label className="text-xs font-medium text-gray-600 leading-tight mb-1.5">
										Имя *
									</Label>
									<Input
										className="mt-auto h-9"
										value={form.firstName}
										onChange={(e) =>
											setForm((f) => ({ ...f, firstName: e.target.value }))
										}
									/>
								</div>
								<div className="flex flex-col">
									<Label className="text-xs font-medium text-gray-600 leading-tight mb-1.5">
										Фамилия *
									</Label>
									<Input
										className="mt-auto h-9"
										value={form.lastName}
										onChange={(e) =>
											setForm((f) => ({ ...f, lastName: e.target.value }))
										}
									/>
								</div>
							</div>

							<div>
								<Label className="text-xs font-medium text-gray-600">Email *</Label>
								<Input
									className="mt-1 h-9"
									type="email"
									value={form.email}
									onChange={(e) =>
										setForm((f) => ({ ...f, email: e.target.value }))
									}
									disabled={!!editingId}
								/>
							</div>

							<div>
								<Label className="text-xs font-medium text-gray-600">
									{editingId ? "Новый пароль" : "Пароль *"}
								</Label>
								<div className="relative mt-1">
									<Input
										className="h-9 pr-10"
										type={showPassword ? "text" : "password"}
										value={form.password}
										onChange={(e) =>
											setForm((f) => ({ ...f, password: e.target.value }))
										}
									/>
									<button
										type="button"
										onClick={() => setShowPassword((v) => !v)}
										className="absolute right-2.5 top-2 text-gray-600 hover:text-gray-600"
									>
										{showPassword ? (
											<EyeOff className="w-4 h-4" />
										) : (
											<Eye className="w-4 h-4" />
										)}
									</button>
								</div>
							</div>

							<div>
								<Label className="text-xs font-medium text-gray-600">Роль *</Label>
								<RoleSelect
									value={form.role}
									onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
									className="mt-1 h-9"
								/>
							</div>

							{error && (
								<p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
									{error}
								</p>
							)}
						</div>

						<div className="flex justify-end gap-2 px-5 py-4 border-t">
							<Button variant="outline" size="sm" onClick={closeModal} disabled={saving}>
								Отмена
							</Button>
							<Button
								size="sm"
								onClick={handleSave}
								disabled={saving}
								className="bg-orange-600 hover:bg-orange-700 min-w-[100px]"
							>
								{saving ? "Сохранение..." : editingId ? "Сохранить" : "Добавить"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
