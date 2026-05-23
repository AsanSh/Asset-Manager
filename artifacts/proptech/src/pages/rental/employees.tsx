import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Eye,
	EyeOff,
	Mail,
	Pencil,
	Phone,
	Plus,
	Shield,
	UserCircle,
	X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface Employee {
	id: number;
	firstName: string;
	lastName: string;
	email: string;
	role: string;
	isActive: boolean;
	phone?: string;
}

const roleLabels: Record<string, string> = {
	admin: "Администратор",
	manager: "Менеджер",
	owner: "Владелец",
	staff: "Сотрудник",
	accountant: "Бухгалтер",
};
const roleColors: Record<string, string> = {
	admin: "bg-rose-100 text-rose-800",
	manager: "bg-blue-100 text-blue-800",
	owner: "bg-blue-100 text-indigo-800",
	staff: "bg-gray-100 text-gray-700",
	accountant: "bg-emerald-100 text-emerald-800",
};

const AVATAR_COLORS = [
	"#4F46E5",
	"#0EA5E9",
	"#10B981",
	"#F59E0B",
	"#EF4444",
	"#8B5CF6",
];
function avatarColor(id: number) {
	return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const EMPTY_FORM = {
	firstName: "",
	lastName: "",
	email: "",
	password: "",
	role: "staff",
};

export default function RentalEmployees() {
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const qc = useQueryClient();

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
				const body: any = {
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
		} catch (e: any) {
			setError(e?.response?.data?.error || "Ошибка сохранения");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Сотрудники</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Пользователи системы в вашей компании
					</p>
				</div>
				<Button
					size="sm"
					onClick={openCreate}
					className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700"
				>
					<Plus className="w-4 h-4" /> Добавить сотрудника
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-white border rounded-lg p-4">
					<p className="text-sm text-gray-500">Всего сотрудников</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">
						{users.length}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-sm text-gray-500">Активных</p>
					<p className="text-2xl font-bold text-emerald-600 mt-1">
						{active.length}
					</p>
				</div>
				<div className="bg-white border rounded-lg p-4">
					<p className="text-sm text-gray-500">Администраторов</p>
					<p className="text-2xl font-bold text-rose-600 mt-1">
						{users.filter((u) => u.role === "admin").length}
					</p>
				</div>
			</div>

			{/* Cards */}
			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				{isLoading ? (
					Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="bg-white border rounded-lg p-4 animate-pulse"
						>
							<div className="w-12 h-12 rounded-full bg-gray-200 mb-3" />
							<div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
							<div className="h-3 bg-gray-100 rounded w-1/2" />
						</div>
					))
				) : users.length === 0 ? (
					<div className="col-span-3 p-12 text-center text-gray-400">
						<UserCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
						<p className="text-sm mb-3">Нет сотрудников</p>
						<Button
							size="sm"
							variant="outline"
							onClick={openCreate}
							className="gap-1"
						>
							<Plus className="w-3.5 h-3.5" /> Добавить первого
						</Button>
					</div>
				) : (
					users.map((u) => (
						<div
							key={u.id}
							className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow group relative"
						>
							<button
								onClick={() => openEdit(u)}
								className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded-lg"
							>
								<Pencil className="w-3.5 h-3.5 text-gray-400" />
							</button>
							<div className="flex items-start gap-3">
								<div
									className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
									style={{ background: avatarColor(u.id) }}
								>
									{(u.firstName || u.email || "?").charAt(0).toUpperCase()}
								</div>
								<div className="flex-1 min-w-0 pr-4">
									<p className="font-semibold text-gray-900 truncate">
										{u.firstName} {u.lastName}
									</p>
									<div className="mt-1">
										<Badge
											className={`text-[10px] px-1.5 py-0 ${roleColors[u.role] || roleColors.staff}`}
										>
											{roleLabels[u.role] || u.role || "Сотрудник"}
										</Badge>
									</div>
								</div>
							</div>
							<div className="mt-3 space-y-1">
								{u.email && (
									<div className="flex items-center gap-1.5 text-xs text-gray-500">
										<Mail className="w-3 h-3 flex-shrink-0" />
										<span className="truncate">{u.email}</span>
									</div>
								)}
								{u.phone && (
									<div className="flex items-center gap-1.5 text-xs text-gray-500">
										<Phone className="w-3 h-3 flex-shrink-0" />
										<span>{u.phone}</span>
									</div>
								)}
								{!u.isActive && (
									<div className="mt-2">
										<Badge className="bg-rose-100 text-rose-700 text-[10px]">
											Неактивный
										</Badge>
									</div>
								)}
							</div>
						</div>
					))
				)}
			</div>

			{/* Modal */}
			{modalOpen && (
				<div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl w-full max-w-md">
						<div className="flex items-center justify-between px-5 py-4 border-b">
							<div className="flex items-center gap-2">
								<Shield className="w-4 h-4 text-blue-600" />
								<h2 className="font-semibold text-gray-900">
									{editingId ? "Редактировать сотрудника" : "Новый сотрудник"}
								</h2>
							</div>
							<button
								onClick={closeModal}
								className="p-1.5 hover:bg-gray-100 rounded-lg"
							>
								<X className="w-4 h-4 text-gray-500" />
							</button>
						</div>

						<div className="p-5 space-y-4">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label className="text-xs font-medium text-gray-600">
										Имя *
									</Label>
									<Input
										className="mt-1 h-9"
										placeholder="Айбек"
										value={form.firstName}
										onChange={(e) =>
											setForm((f) => ({ ...f, firstName: e.target.value }))
										}
									/>
								</div>
								<div>
									<Label className="text-xs font-medium text-gray-600">
										Фамилия *
									</Label>
									<Input
										className="mt-1 h-9"
										placeholder="Асанов"
										value={form.lastName}
										onChange={(e) =>
											setForm((f) => ({ ...f, lastName: e.target.value }))
										}
									/>
								</div>
							</div>

							<div>
								<Label className="text-xs font-medium text-gray-600">
									Email *
								</Label>
								<Input
									className="mt-1 h-9"
									type="email"
									placeholder="user@company.kg"
									value={form.email}
									onChange={(e) =>
										setForm((f) => ({ ...f, email: e.target.value }))
									}
									disabled={!!editingId}
								/>
								{editingId && (
									<p className="text-[10px] text-gray-400 mt-1">
										Email нельзя изменить
									</p>
								)}
							</div>

							<div>
								<Label className="text-xs font-medium text-gray-600">
									{editingId
										? "Новый пароль (оставьте пустым чтобы не менять)"
										: "Пароль *"}
								</Label>
								<div className="relative mt-1">
									<Input
										className="h-9 pr-10"
										type={showPassword ? "text" : "password"}
										placeholder={
											editingId ? "Введите новый пароль" : "Минимум 6 символов"
										}
										value={form.password}
										onChange={(e) =>
											setForm((f) => ({ ...f, password: e.target.value }))
										}
									/>
									<button
										type="button"
										onClick={() => setShowPassword((v) => !v)}
										className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
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
								<Label className="text-xs font-medium text-gray-600">
									Роль *
								</Label>
								<Select
									value={form.role}
									onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
								>
									<SelectTrigger className="mt-1 h-9">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="admin">Администратор</SelectItem>
										<SelectItem value="manager">Менеджер</SelectItem>
										<SelectItem value="accountant">Бухгалтер</SelectItem>
										<SelectItem value="staff">Сотрудник</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{error && (
								<p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
									{error}
								</p>
							)}
						</div>

						<div className="flex justify-end gap-2 px-5 py-4 border-t">
							<Button
								variant="outline"
								size="sm"
								onClick={closeModal}
								disabled={saving}
							>
								Отмена
							</Button>
							<Button
								size="sm"
								onClick={handleSave}
								disabled={saving}
								className="bg-blue-600 hover:bg-blue-700 min-w-[100px]"
							>
								{saving
									? "Сохранение..."
									: editingId
										? "Сохранить"
										: "Добавить"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
