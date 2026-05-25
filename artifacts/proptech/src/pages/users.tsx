import { useQueryClient } from "@tanstack/react-query";
import { Edit2, Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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

			<div className="border rounded-md bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>ФИО</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Роль</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead className="text-right">Действия</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell>
										<Skeleton className="h-5 w-32" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-40" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-24" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-20" />
									</TableCell>
									<TableCell className="text-right">
										<Skeleton className="h-8 w-8 inline-block" />
									</TableCell>
								</TableRow>
							))
						) : !users || users.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center py-8 text-muted-foreground"
								>
									Сотрудники не найдены
								</TableCell>
							</TableRow>
						) : (
							(Array.isArray(users) ? users : []).map((user) => (
								<TableRow key={user.id}>
									<TableCell className="font-medium">
										{user.firstName} {user.lastName}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{user.email}
									</TableCell>
									<TableCell>
										<Badge variant="outline">
											{displayRole(user.role)}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge variant={user.isActive ? "default" : "secondary"}>
											{user.isActive ? "Активен" : "Заблокирован"}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handlePasswordReset(user)}
											title="Сбросить пароль"
										>
											<KeyRound className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleOpenEdit(user)}
											title="Редактировать"
										>
											<Edit2 className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDelete(user.id)}
											className="text-destructive"
											title="Удалить"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

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
						<div className="space-y-1.5">
							<Label>Имя *</Label>
							<Input
								required
								value={formData.firstName}
								onChange={(e) =>
									setFormData({ ...formData, firstName: e.target.value })
								}
								placeholder="Айбек"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Фамилия *</Label>
							<Input
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
