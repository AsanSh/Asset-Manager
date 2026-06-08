import { useQueryClient } from "@tanstack/react-query";
import { Edit2, ExternalLink, Plus, Trash2, UserCheck, Users, UserX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import {
	type CreateTenantBodyStatus,
	getListTenantsQueryKey,
	type Tenant,
	useCreateTenant,
	useListTenants,
	useUpdateTenant,
} from "@/api-client";
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
import { Badge } from "@/components/ui/badge";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { RentalQueryState } from "@/components/rental/rental-query-state";
import { api } from "@/lib/api";
import { useLocation } from "wouter";

const statusColors: Record<string, string> = {
	active: "bg-emerald-100 text-emerald-800",
	inactive: "bg-gray-100 text-gray-800",
	blacklisted: "bg-rose-100 text-rose-800",
};

const statusLabels: Record<string, string> = {
	active: "Активный",
	inactive: "Неактивный",
	blacklisted: "Черный список",
};

interface TenantDialogProps {
	open: boolean;
	onClose: () => void;
	tenant?: Tenant;
}

function TenantDialog({ open, onClose, tenant }: TenantDialogProps) {
	const createMutation = useCreateTenant();
	const updateMutation = useUpdateTenant();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		fullName: "",
		phone: "",
		email: "",
		iin: "",
		status: "active" as CreateTenantBodyStatus,
		comment: "",
	});

	useEffect(() => {
		if (tenant && open) {
			setFormData({
				fullName: tenant.fullName,
				phone: tenant.phone || "",
				email: tenant.email || "",
				iin: tenant.iin || "",
				status: tenant.status as CreateTenantBodyStatus,
				comment: tenant.comment || "",
			});
		} else if (!tenant && open) {
			setFormData({
				fullName: "",
				phone: "",
				email: "",
				iin: "",
				status: "active",
				comment: "",
			});
		}
	}, [tenant, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const payload = {
				fullName: formData.fullName,
				phone: formData.phone || null,
				email: formData.email || null,
				iin: formData.iin || null,
				status: formData.status,
				comment: formData.comment || null,
			};

			if (tenant) {
				await updateMutation.mutateAsync({ id: tenant.id, data: payload });
				toast({ title: "Арендатор обновлён" });
			} else {
				await createMutation.mutateAsync({ data: payload });
				toast({ title: "Арендатор добавлен" });
			}

			queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
			onClose();
		} catch {
			toast({
				title: "Ошибка",
				description: "Не удалось сохранить арендатора",
				variant: "destructive",
			});
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{tenant ? "Редактировать арендатора" : "Добавить арендатора"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="fullName">ФИО *</Label>
						<Input
							id="fullName"
							value={formData.fullName}
							onChange={(e) =>
								setFormData({ ...formData, fullName: e.target.value })
							}
							required
						/>
					</div>
					<div>
						<Label htmlFor="iin">ИИН</Label>
						<Input
							id="iin"
							value={formData.iin}
							onChange={(e) =>
								setFormData({ ...formData, iin: e.target.value })
							}
							placeholder="880101300122"
						/>
					</div>
					<div>
						<Label htmlFor="phone">Телефон</Label>
						<Input
							id="phone"
							value={formData.phone}
							onChange={(e) =>
								setFormData({ ...formData, phone: e.target.value })
							}
							placeholder="+7 700 000 0000"
						/>
					</div>
					<div>
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
						/>
					</div>
					<div>
						<Label htmlFor="status">Статус</Label>
						<Select
							value={formData.status}
							onValueChange={(v) =>
								setFormData({
									...formData,
									status: v as CreateTenantBodyStatus,
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="active">Активный</SelectItem>
								<SelectItem value="inactive">Неактивный</SelectItem>
								<SelectItem value="blacklisted">Черный список</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label htmlFor="comment">Комментарий</Label>
						<Input
							id="comment"
							value={formData.comment}
							onChange={(e) =>
								setFormData({ ...formData, comment: e.target.value })
							}
						/>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						{tenant && (
							<Button
								type="button"
								variant="outline"
								className="mr-auto text-rose-600 border-rose-200 hover:bg-rose-50"
								disabled={isPending}
								onClick={async () => {
									if (
										!confirm(
											`Удалить арендатора «${tenant.fullName}»?\n\nДействие необратимо.`,
										)
									) {
										return;
									}
									try {
										await api.delete(`/rental/tenants/${tenant.id}`);
										toast({ title: "Арендатор удалён" });
										queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
										onClose();
									} catch (e: unknown) {
										const msg =
											e && typeof e === "object" && "response" in e
												? getApiErrorMessage(e)
												: null;
										toast({
											title: "Не удалось удалить",
											description: msg || undefined,
											variant: "destructive",
										});
									}
								}}
							>
								<Trash2 className="w-4 h-4 mr-1" />
								Удалить
							</Button>
						)}
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

export default function RentalTenants() {
	const { data: tenants, isLoading, isError, error, refetch } = useListTenants();
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const tenantsArray = Array.isArray(tenants) ? tenants : [];
	const [, navigate] = useLocation();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>();

	const activeCount = tenantsArray.filter((t) => t.status === "active").length;
	const inactiveCount = tenantsArray.length - activeCount;
	const companyCount = tenantsArray.filter((t) => (t as Tenant & { type?: string }).type === "company").length;
	const individualCount = tenantsArray.length - companyCount;

	const handleAdd = () => { setSelectedTenant(undefined); setDialogOpen(true); };
	const handleEdit = useCallback((tenant: Tenant) => {
		setSelectedTenant(tenant);
		setDialogOpen(true);
	}, []);

	const handleDelete = useCallback(async (tenant: Tenant) => {
		if (
			!confirm(
				`Удалить арендатора «${tenant.fullName}»?\n\nДействие необратимо. Удаление возможно только без активных договоров и задолженности.`,
			)
		) {
			return;
		}
		try {
			await api.delete(`/rental/tenants/${tenant.id}`);
			toast({ title: "Арендатор удалён" });
			queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
		} catch (e: unknown) {
			const msg =
				e && typeof e === "object" && "response" in e
					? getApiErrorMessage(e)
					: null;
			toast({
				title: "Не удалось удалить",
				description: msg || "Сначала расторгните или удалите связанные договоры",
				variant: "destructive",
			});
		}
	}, [queryClient, toast]);

	const columns = useMemo<ColumnDef<Tenant, unknown>[]>(
		() => [
			{
				accessorKey: "fullName",
				header: "ФИО",
				size: 220,
				meta: { exportLabel: "ФИО", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium">{row.original.fullName}</span>
				),
			},
			{
				accessorKey: "iin",
				header: "ИИН",
				size: 130,
				meta: { exportLabel: "ИИН" },
				cell: ({ row }) => row.original.iin || "—",
			},
			{
				accessorKey: "phone",
				header: "Телефон",
				size: 140,
				meta: { exportLabel: "Телефон" },
				cell: ({ row }) => row.original.phone || "—",
			},
			{
				accessorKey: "email",
				header: "Почта",
				size: 180,
				meta: { exportLabel: "Email" },
				cell: ({ row }) => row.original.email || "—",
			},
			{
				id: "status",
				header: "Статус",
				size: 130,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge
						className={statusColors[row.original.status]}
						variant="secondary"
					>
						{statusLabels[row.original.status] || row.original.status}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "",
				size: 140,
				enableSorting: false,
				meta: { align: "center" },
				cell: ({ row }) => (
					<div className="flex items-center justify-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							className="h-7 px-2 text-xs text-blue-600"
							onClick={() => navigate(`/rental/tenants/${row.original.id}`)}
						>
							<ExternalLink className="w-3 h-3 mr-1" /> Портал
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={() => handleEdit(row.original)}
						>
							<Edit2 className="w-3.5 h-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-muted-foreground hover:text-rose-600"
							onClick={() => handleDelete(row.original)}
						>
							<Trash2 className="w-3.5 h-3.5" />
						</Button>
					</div>
				),
			},
		],
		[handleDelete, handleEdit, navigate],
	);

	return (
		<div className="p-6 space-y-3">
			<KpiRow>
				<KpiCard variant="strip" label="Всего арендаторов" value={tenantsArray.length} sub="в базе" icon={Users} color="blue" loading={isLoading} />
				<KpiCard variant="strip" label="Активных" value={activeCount} sub={inactiveCount > 0 ? `${inactiveCount} неактивных` : "все активны"} icon={UserCheck} color="green" loading={isLoading} />
				<KpiCard variant="strip" label="Физлица" value={individualCount} sub={`${companyCount} юрлиц`} icon={Users} color="purple" loading={isLoading} />
				<KpiCard variant="strip" label="Неактивных" value={inactiveCount} sub={inactiveCount > 0 ? "требуют проверки" : "нет"} icon={UserX} color={inactiveCount > 0 ? "yellow" : "green"} loading={isLoading} />
			</KpiRow>

			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Арендаторы</h1>
					<p className="text-muted-foreground text-sm">Управление базой арендаторов</p>
				</div>
				<Button onClick={handleAdd}>
					<Plus className="w-4 h-4 mr-2" />Добавить
				</Button>
			</div>

			<RentalQueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
				<DataTable
					tableId="rental-tenants"
					columns={columns}
					data={tenantsArray}
					isLoading={isLoading}
					enableSearch
					searchPlaceholder="Поиск по ФИО, телефону, email, ИИН…"
					initialSorting={[{ id: "fullName", desc: false }]}
					emptyState="Арендаторы не найдены"
					footer={
						!isLoading && tenantsArray.length > 0 ? (
							<tr className="bg-gray-50 font-semibold border-t-2">
								<td colSpan={4} className="px-3 py-2 text-sm text-gray-600">
									Итого: {tenantsArray.length} арендаторов
								</td>
								<td className="px-3 py-2 text-sm text-gray-600">
									{activeCount} активных
								</td>
								<td />
							</tr>
						) : undefined
					}
				/>
			</RentalQueryState>

			<TenantDialog open={dialogOpen} onClose={() => setDialogOpen(false)} tenant={selectedTenant} />
		</div>
	);
}
