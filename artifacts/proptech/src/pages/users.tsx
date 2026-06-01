import { useQueryClient } from "@tanstack/react-query";
import { Edit2, Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import {
	type CreateUserBodyRole,
	type UpdateUserBodyRole,
	getListUsersQueryKey,
	type User,
	useCreateUser,
	useDeleteUser,
	useListUsers,
	useUpdateUser,
} from "@/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
	RoleSelect,
	resolveRoleLabel,
	useCompanyRoles,
} from "@/lib/user-roles";
import { api } from "@/lib/api";

export default function Users() {
	const { data: users, isLoading } = useListUsers();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const deleteMutation = useDeleteUser();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const handleOpenCreate = () => {
		setEditingUser(null);
		setIsDialogOpen(true);
	};

	const handleOpenEdit = (user: User) => {
		setEditingUser(user);
		setIsDialogOpen(true);
	};

	const { data: customRoles = [] } = useCompanyRoles();

	const roleLabels: Record<string, string> = {
		admin: "Администратор",
		super_admin: "Супер-Админ",
		rental_manager: "Менеджер аренды",
		finance: "Финансы",
		staff: "Сотрудник",
		company_admin: "Администратор компании",
		sales_manager: "Менеджер продаж",
		pto: "ПТО (площади)",
		engineer: "Инженер ПТО",
	};

	const displayRole = (role: string) =>
		resolveRoleLabel(role, customRoles) || roleLabels[role] || role;

	const handlePasswordReset = async (user: User) => {
		if (
			!confirm(
				`Отправить ${user.email} ссылку для сброса пароля? Старая ссылка перестанет действовать.`,
			)
		) {
			return;
		}
		try {
			const { data } = await api.post<{
				message: string;
				emailSent: boolean;
				resetLink: string;
			}>(`/users/${user.id}/send-password-reset`);
			if (data.resetLink) {
				await navigator.clipboard.writeText(data.resetLink).catch(() => {});
			}
			toast({
				title: data.emailSent ? "Письмо отправлено" : "Ссылка создана",
				description:
					data.message +
					(data.resetLink ? " Ссылка скопирована в буфер обмена." : ""),
			});
		} catch (e: unknown) {
			toast({
				title: "Ошибка",
				description: e instanceof Error ? e.message : "Не удалось отправить",
				variant: "destructive",
			});
		}
	};

	const handleDelete = (id: number) => {
		if (confirm("Удалить этого сотрудника?")) {
			deleteMutation.mutate(
				{ id },
				{
					onSuccess: () => {
						queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
						toast({ title: "Сотрудник удалён" });
					},
					onError: (error: any) => {
						toast({
							title: "Ошибка",
							description: error.message,
							variant: "destructive",
						});
					},
				},
			);
		}
	};

	const rows = Array.isArray(users) ? users : [];

	const columns = useMemo<ColumnDef<User, unknown>[]>(
		() => [
			{
				id: "name",
				header: "ФИО",
				size: 180,
				minSize: 120,
				maxSize: 280,
				accessorFn: (row) => `${row.firstName || ""} ${row.lastName || ""}`.trim(),
				meta: { exportLabel: "ФИО", grow: true },
				cell: ({ row }) => (
					<span className="font-medium">
						{row.original.firstName} {row.original.lastName}
					</span>
				),
			},
			{
				id: "email",
				header: "Почта",
				size: 200,
				minSize: 140,
				maxSize: 320,
				accessorKey: "email",
				meta: { exportLabel: "Почта", grow: true },
				cell: ({ row }) => (
					<span className="text-muted-foreground truncate block" title={row.original.email}>
						{row.original.email}
					</span>
				),
			},
			{
				id: "role",
				header: "Роль",
				size: 140,
				accessorKey: "role",
				meta: { exportLabel: "Роль" },
				cell: ({ row }) => (
					<Badge variant="outline">{displayRole(row.original.role)}</Badge>
				),
			},
			{
				id: "status",
				header: "Статус",
				size: 110,
				accessorFn: (row) => (row.isActive ? "active" : "blocked"),
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge variant={row.original.isActive ? "default" : "secondary"}>
						{row.original.isActive ? "Активен" : "Заблокирован"}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "",
				size: 120,
				enableSorting: false,
				enableResizing: false,
				meta: { align: "right" },
				cell: ({ row }) => (
					<div className="flex justify-end gap-0.5">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handlePasswordReset(row.original)}
							title="Сбросить пароль"
						>
							<KeyRound className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleOpenEdit(row.original)}
							title="Редактировать"
						>
							<Edit2 className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleDelete(row.original.id)}
							className="text-destructive"
							title="Удалить"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				),
			},
		],
		[customRoles],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Сотрудники</h2>
					<p className="text-muted-foreground text-sm mt-1">
						Управление пользователями и правами доступа
					</p>
				</div>
				<Button onClick={handleOpenCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Добавить сотрудника
				</Button>
			</div>

			<DataTable
				tableId="directory-users"
				columns={columns}
				data={rows}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по ФИО или почте…"
				initialSorting={[{ id: "name", desc: false }]}
				emptyState={
					<p className="py-8 text-center text-muted-foreground">Сотрудники не найдены</p>
				}
			/>

			<UserDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				user={editingUser}
			/>
		</div>
	);
}

function UserDialog({
	open,
	onOpenChange,
	user,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: User | null;
}) {
	const isEditing = !!user;
	const createMutation = useCreateUser();
	const updateMutation = useUpdateUser();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
		role: "staff" as CreateUserBodyRole,
	});

	useEffect(() => {
		if (user && open) {
			setFormData({
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				password: "", // Leave blank when editing
				role: user.role as CreateUserBodyRole,
			});
		} else if (!user && open) {
			setFormData({
				firstName: "",
				lastName: "",
				email: "",
				password: "",
				role: "staff" as CreateUserBodyRole,
			});
		}
	}, [user, open]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (isEditing && user) {
			updateMutation.mutate(
				{
					id: user.id,
					data: {
						firstName: formData.firstName,
						lastName: formData.lastName,
						role: formData.role as UpdateUserBodyRole,
					},
				},
				{
					onSuccess: () => {
						queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
						toast({ title: "Данные сотрудника обновлены" });
						onOpenChange(false);
					},
					onError: (error: any) => {
						toast({
							title: "Ошибка",
							description: error.message,
							variant: "destructive",
						});
					},
				},
			);
		} else {
			createMutation.mutate(
				{ data: formData },
				{
					onSuccess: () => {
						queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
						toast({
							title: "Сотрудник создан",
							description: "Передайте email и пароль сотруднику для входа.",
						});
						onOpenChange(false);
					},
					onError: (error: any) => {
						toast({
							title: "Ошибка",
							description: error.message,
							variant: "destructive",
						});
					},
				},
			);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;
	const [showPassword, setShowPassword] = useState(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[420px]">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Редактировать сотрудника" : "Добавить сотрудника"}
					</DialogTitle>
					{!isEditing && (
						<DialogDescription>
							Сотрудник сможет войти в систему с указанным email и паролем.
						</DialogDescription>
					)}
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5 flex flex-col">
							<Label className="leading-tight mb-1.5">Имя *</Label>
							<Input
								className="mt-auto"
								required
								value={formData.firstName}
								onChange={(e) =>
									setFormData({ ...formData, firstName: e.target.value })
								}
								placeholder="Айбек"
							/>
						</div>
						<div className="space-y-1.5 flex flex-col">
							<Label className="leading-tight mb-1.5">Фамилия *</Label>
							<Input
								className="mt-auto"
								required
								value={formData.lastName}
								onChange={(e) =>
									setFormData({ ...formData, lastName: e.target.value })
								}
								placeholder="Осмонов"
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label>Email *</Label>
						<Input
							type="email"
							required={!isEditing}
							disabled={isEditing}
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
							placeholder="aibek@company.kg"
						/>
					</div>

					{!isEditing && (
						<div className="space-y-1.5">
							<Label>
								Пароль *{" "}
								<span className="text-xs text-muted-foreground">
									(минимум 12 символов)
								</span>
							</Label>
							<div className="relative">
								<Input
									type={showPassword ? "text" : "password"}
									required
									minLength={12}
									value={formData.password}
									onChange={(e) =>
										setFormData({ ...formData, password: e.target.value })
									}
									placeholder="••••••••"
									className="pr-10"
								/>
								<button
									type="button"
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
							<p className="text-xs text-muted-foreground">
								Запишите или передайте пароль сотруднику после создания.
							</p>
						</div>
					)}

					<div className="space-y-1.5">
						<Label>Роль *</Label>
						<RoleSelect
							value={formData.role}
							onValueChange={(val) =>
								setFormData({ ...formData, role: val as CreateUserBodyRole })
							}
						/>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Отмена
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending
								? "Сохранение..."
								: isEditing
									? "Сохранить"
									: "Создать сотрудника"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
