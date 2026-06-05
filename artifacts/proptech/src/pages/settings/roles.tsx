import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Lock, Plus, Shield, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/am/PageShell";
import { EmptyState } from "@/components/am/misc";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SystemSettingsBar } from "@/components/system-settings-nav";
import { api } from "@/lib/api";
import { SettingsBreadcrumb } from "@/lib/settings-breadcrumbs";
import { cn } from "@/lib/utils";

interface Role {
	id: number;
	name: string;
	description?: string;
	permissions: string[];
	isSystem: boolean;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

const PERMISSION_GROUPS = [
	{
		name: "Недвижимость",
		key: "properties",
		permissions: [
			{ key: "properties.read", label: "Просмотр объектов" },
			{ key: "properties.write", label: "Создание/изменение объектов" },
			{ key: "properties.delete", label: "Удаление объектов" },
		],
	},
	{
		name: "Пользователи",
		key: "users",
		permissions: [
			{ key: "users.read", label: "Просмотр пользователей" },
			{ key: "users.write", label: "Создание/изменение пользователей" },
			{ key: "users.delete", label: "Удаление пользователей" },
		],
	},
	{
		name: "Аренда",
		key: "rental",
		permissions: [
			{ key: "rental.read", label: "Просмотр договоров аренды" },
			{ key: "rental.write", label: "Создание/изменение договоров" },
			{ key: "rental.delete", label: "Удаление договоров" },
			{ key: "rental.payments", label: "Управление платежами" },
		],
	},
	{
		name: "Строительство",
		key: "construction",
		permissions: [
			{ key: "construction.read", label: "Просмотр проектов" },
			{ key: "construction.write", label: "Создание/изменение проектов" },
			{ key: "construction.delete", label: "Удаление проектов" },
			{ key: "construction.finance", label: "Финансы строительства" },
		],
	},
	{
		name: "Финансы",
		key: "finance",
		permissions: [
			{ key: "finance.read", label: "Просмотр финансов" },
			{ key: "finance.write", label: "Создание операций" },
			{ key: "finance.delete", label: "Удаление операций" },
			{ key: "finance.reports", label: "Финансовые отчеты" },
		],
	},
	{
		name: "Контрагенты",
		key: "counterparties",
		permissions: [
			{ key: "counterparties.read", label: "Просмотр контрагентов" },
			{ key: "counterparties.write", label: "Создание/изменение контрагентов" },
			{ key: "counterparties.delete", label: "Удаление контрагентов" },
		],
	},
	{
		name: "Настройки",
		key: "settings",
		permissions: [
			{ key: "settings.read", label: "Просмотр настроек" },
			{ key: "settings.write", label: "Изменение настроек" },
			{ key: "settings.roles", label: "Управление ролями" },
			{ key: "settings.legal_entities", label: "Управление юр. лицами" },
		],
	},
	{
		name: "Администрирование",
		key: "admin",
		permissions: [
			{ key: "admin.all", label: "Полный доступ администратора" },
			{ key: "admin.audit", label: "Просмотр логов" },
			{ key: "admin.backup", label: "Резервное копирование" },
		],
	},
];

interface RoleDialogProps {
	open: boolean;
	onClose: () => void;
	role?: Role;
}

function RoleDialog({ open, onClose, role }: RoleDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		name: "",
		description: "",
		permissions: [] as string[],
		isActive: true,
	});

	useEffect(() => {
		if (role && open) {
			setFormData({
				name: role.name,
				description: role.description || "",
				permissions: role.permissions || [],
				isActive: role.isActive,
			});
		} else if (!role && open) {
			setFormData({
				name: "",
				description: "",
				permissions: [],
				isActive: true,
			});
		}
	}, [role, open]);

	const createMutation = useMutation({
		mutationFn: (data: any) => api.post("/roles", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			toast({ title: "Роль создана" });
			onClose();
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: any) => api.patch(`/roles/${role?.id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			toast({ title: "Роль обновлена" });
			onClose();
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const payload = {
			name: formData.name,
			description: formData.description || null,
			permissions: formData.permissions,
			isActive: formData.isActive,
		};

		if (role) {
			updateMutation.mutate(payload);
		} else {
			createMutation.mutate(payload);
		}
	};

	const handlePermissionToggle = (permission: string) => {
		setFormData((prev) => ({
			...prev,
			permissions: prev.permissions.includes(permission)
				? prev.permissions.filter((p) => p !== permission)
				: [...prev.permissions, permission],
		}));
	};

	const handleGroupToggle = (groupKey: string) => {
		const group = PERMISSION_GROUPS.find((g) => g.key === groupKey);
		if (!group) return;

		const groupPermissions = group.permissions.map((p) => p.key);
		const allSelected = groupPermissions.every((p) =>
			formData.permissions.includes(p),
		);

		setFormData((prev) => ({
			...prev,
			permissions: allSelected
				? prev.permissions.filter((p) => !groupPermissions.includes(p))
				: [...new Set([...prev.permissions, ...groupPermissions])],
		}));
	};

	const isPending = createMutation.isPending || updateMutation.isPending;
	const isSystemRole = role?.isSystem;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{role ? "Редактировать роль" : "Добавить роль"}
					</DialogTitle>
					{isSystemRole && (
						<p className="text-sm text-amber-600 flex items-center gap-1">
							<Lock className="w-3 h-3" />
							Системная роль - изменение ограничено
						</p>
					)}
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label>Название роли *</Label>
						<Input
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							placeholder="Менеджер по аренде"
							required
							className="mt-1"
							disabled={isSystemRole}
						/>
					</div>

					<div>
						<Label>Описание</Label>
						<Textarea
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							placeholder="Краткое описание роли и её обязанностей"
							className="mt-1"
							rows={2}
						/>
					</div>

					<div>
						<Label className="text-base font-semibold">Права доступа</Label>
						<p className="text-sm text-gray-500 mb-3">
							Выберите разрешения для этой роли
						</p>

						<div className="space-y-4 border rounded-lg p-4 max-h-96 overflow-y-auto">
							{PERMISSION_GROUPS.map((group) => {
								const groupPermissions = group.permissions.map((p) => p.key);
								const selectedCount = groupPermissions.filter((p) =>
									formData.permissions.includes(p),
								).length;
								const allSelected = selectedCount === groupPermissions.length;
								const someSelected = selectedCount > 0 && !allSelected;

								return (
									<div key={group.key} className="space-y-2">
										<div className="flex items-center gap-2 font-medium text-sm">
											<Checkbox
												checked={allSelected}
												onCheckedChange={() => handleGroupToggle(group.key)}
												className={cn(
													someSelected && "data-[state=checked]:bg-gray-400",
												)}
											/>
											<span className="text-gray-900">{group.name}</span>
											{selectedCount > 0 && (
												<Badge variant="secondary" className="text-xs">
													{selectedCount}/{groupPermissions.length}
												</Badge>
											)}
										</div>
										<div className="ml-6 space-y-2">
											{group.permissions.map((permission) => (
												<div
													key={permission.key}
													className="flex items-center gap-2"
												>
													<Checkbox
														checked={formData.permissions.includes(
															permission.key,
														)}
														onCheckedChange={() =>
															handlePermissionToggle(permission.key)
														}
													/>
													<span className="text-sm text-gray-600">
														{permission.label}
													</span>
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>

						<p className="text-xs text-gray-500 mt-2">
							Выбрано разрешений: {formData.permissions.length}
						</p>
					</div>

					<div className="flex items-center space-x-2">
						<Switch
							id="isActive"
							checked={formData.isActive}
							onCheckedChange={(checked) =>
								setFormData({ ...formData, isActive: checked })
							}
						/>
						<Label htmlFor="isActive" className="cursor-pointer">
							Активна
						</Label>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Сохранение..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function Roles() {
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const { data: roles, isLoading } = useQuery({
		queryKey: ["roles"],
		queryFn: () => api.get("/roles").then((r) => r.data),
	});

	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedRole, setSelectedRole] = useState<Role | undefined>();
	const [deleteId, setDeleteId] = useState<number | null>(null);

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/roles/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			toast({ title: "Роль удалена" });
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleDelete = async () => {
		if (!deleteId) return;
		deleteMutation.mutate(deleteId);
		setDeleteId(null);
	};

	const rolesArray = Array.isArray(roles) ? roles : [];

	const columns = useMemo<ColumnDef<Role, unknown>[]>(
		() => [
			{
				id: "name",
				header: "Название роли",
				accessorKey: "name",
				meta: { exportLabel: "Название", grow: true },
				cell: ({ row }) => (
					<div className="flex items-center gap-2 font-medium text-gray-900">
						{row.original.isSystem && (
							<Lock className="w-3 h-3 text-amber-600 flex-shrink-0" />
						)}
						{row.original.name}
					</div>
				),
			},
			{
				id: "description",
				header: "Описание",
				accessorKey: "description",
				meta: { exportLabel: "Описание", grow: true },
				cell: ({ row }) => (
					<span className="text-gray-600 text-sm truncate block max-w-md">
						{row.original.description || "—"}
					</span>
				),
			},
			{
				id: "permissions",
				header: "Разрешений",
				cell: ({ row }) => (
					<Badge variant="outline">{row.original.permissions?.length || 0}</Badge>
				),
			},
			{
				id: "isSystem",
				header: "Тип",
				cell: ({ row }) =>
					row.original.isSystem ? (
						<Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
							Системная
						</Badge>
					) : (
						<Badge variant="secondary">Пользовательская</Badge>
					),
			},
			{
				id: "isActive",
				header: "Статус",
				cell: ({ row }) => (
					<Badge variant={row.original.isActive ? "default" : "secondary"}>
						{row.original.isActive ? "Активна" : "Неактивна"}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "",
				size: 80,
				enableSorting: false,
				cell: ({ row }) => (
					<div className="flex gap-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								setSelectedRole(row.original);
								setDialogOpen(true);
							}}
						>
							<Edit2 className="w-4 h-4" />
						</Button>
						{!row.original.isSystem && (
							<Button
								variant="ghost"
								size="icon"
								className="text-rose-600 hover:text-rose-700"
								onClick={() => setDeleteId(row.original.id)}
							>
								<Trash2 className="w-4 h-4" />
							</Button>
						)}
					</div>
				),
			},
		],
		[],
	);

	return (
		<div className="space-y-5">
			<SystemSettingsBar />
			<PageShell.List
				title="Роли и разрешения"
				subtitle="Управление ролями пользователей и правами доступа"
				breadcrumb={<SettingsBreadcrumb label="Роли" />}
				primaryAction={
					<Button
						onClick={() => {
							setSelectedRole(undefined);
							setDialogOpen(true);
						}}
						className="bg-amber-500 hover:bg-amber-600"
					>
						<Plus className="w-4 h-4 mr-2" /> Добавить
					</Button>
				}
			>
				<DataTable
					tableId="settings-roles"
					columns={columns}
					data={rolesArray}
					isLoading={isLoading}
					enableSearch
					searchPlaceholder="Поиск по названию или описанию…"
					initialSorting={[{ id: "name", desc: false }]}
					emptyState={
						<EmptyState
							icon={Shield}
							title="Роли не найдены"
							description="Создайте первую роль для настройки доступа"
							action={
								<Button
									onClick={() => {
										setSelectedRole(undefined);
										setDialogOpen(true);
									}}
									className="bg-amber-500 hover:bg-amber-600"
								>
									<Plus className="w-4 h-4 mr-2" /> Добавить роль
								</Button>
							}
						/>
					}
				/>
			</PageShell.List>

			<RoleDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				role={selectedRole}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить роль?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Роль будет удалена из системы.
							Убедитесь, что эта роль не назначена пользователям.
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
		</div>
	);
}
