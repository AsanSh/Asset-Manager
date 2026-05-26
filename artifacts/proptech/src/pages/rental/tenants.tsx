import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ChevronsUpDown, Edit2, ExternalLink, Plus, Trash2, UserCheck, Users, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useColResize } from "@/lib/use-col-resize";
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
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { useToast } from "@/hooks/use-toast";
import { useSortable } from "@/lib/use-sortable";
import { getApiErrorMessage } from "@/lib/api-error";
import { RentalQueryState } from "@/components/rental/rental-query-state";
import { api } from "@/lib/api";

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

const TH = "relative border border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap bg-gray-100 sticky top-0 z-20 select-none shadow-[0_1px_0_0_#e5e7eb]";
const TD = "border border-gray-200 px-2 py-1 text-gray-700";

function SortTh({
	label, col, sortKey, sortDir, onToggle, widths, startResize,
}: {
	label: string; col: string; sortKey: string; sortDir: "asc" | "desc";
	onToggle: (k: string) => void; widths: Record<string, number>;
	startResize: (k: string) => (e: React.MouseEvent) => void;
}) {
	const active = sortKey === col;
	return (
		<th
			className={TH + " cursor-pointer hover:bg-gray-200"}
			style={{ width: widths[col], minWidth: widths[col] }}
			onClick={() => onToggle(col)}
		>
			<span className="inline-flex items-center gap-1">
				{label}
				{active ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
			</span>
			<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 z-20" onMouseDown={startResize(col)} onClick={(e) => e.stopPropagation()} />
		</th>
	);
}

export default function RentalTenants() {
	const { data: tenants, isLoading, isError, error, refetch } = useListTenants();
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const tenantsArray = Array.isArray(tenants) ? tenants : [];
	const { sorted, sortKey, sortDir, toggle } = useSortable(tenantsArray, "fullName");
	const [, navigate] = useLocation();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>();
	const { widths, startResize } = useColResize({ fullName: 220, iin: 130, phone: 140, email: 180, status: 110, actions: 120 });

	const activeCount = tenantsArray.filter((t) => t.status === "active").length;
	const inactiveCount = tenantsArray.length - activeCount;
	const companyCount = tenantsArray.filter((t) => t.type === "company").length;
	const individualCount = tenantsArray.length - companyCount;

	const handleAdd = () => { setSelectedTenant(undefined); setDialogOpen(true); };
	const handleEdit = (tenant: Tenant) => { setSelectedTenant(tenant); setDialogOpen(true); };

	const handleDelete = async (tenant: Tenant) => {
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
	};

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
			<div className="overflow-auto border border-gray-200 rounded-lg" style={{ maxHeight: "calc(100vh - 300px)" }}>
				<table className="w-full text-xs border-separate border-spacing-0">
					<thead>
						<tr>
							<SortTh label="ФИО" col="fullName" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
							<SortTh label="ИИН" col="iin" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
							<SortTh label="Телефон" col="phone" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
							<SortTh label="Email" col="email" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
							<SortTh label="Статус" col="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
							<th className={TH} style={{ width: widths.actions }}>Действия</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							Array.from({ length: 4 }).map((_, i) => (
								<tr key={i}>
									{Array.from({ length: 6 }).map((_, j) => (
										<td key={j} className={TD}><Skeleton className="h-3 w-full" /></td>
									))}
								</tr>
							))
						) : !tenantsArray.length ? (
							<tr>
								<td colSpan={6} className="text-center text-gray-400 py-8 text-sm">Арендаторы не найдены</td>
							</tr>
						) : (
							sorted.map((tenant, idx) => (
								<tr key={tenant.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
									<td className={TD + " font-medium text-gray-900"}>{tenant.fullName}</td>
									<td className={TD}>{tenant.iin || "—"}</td>
									<td className={TD}>{tenant.phone || "—"}</td>
									<td className={TD}>{tenant.email || "—"}</td>
									<td className={TD}>
										<span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[tenant.status] || "bg-gray-100 text-gray-600"}`}>
											{statusLabels[tenant.status] || tenant.status}
										</span>
									</td>
									<td className={TD}>
										<div className="flex items-center gap-1">
											<button className="text-blue-600 hover:underline flex items-center gap-0.5" onClick={() => navigate(`/rental/tenants/${tenant.id}`)}>
												<ExternalLink className="w-3 h-3" /> Портал
											</button>
											<button type="button" title="Редактировать" className="ml-1 text-gray-500 hover:text-gray-800" onClick={() => handleEdit(tenant)}>
												<Edit2 className="w-3.5 h-3.5" />
											</button>
											<button type="button" title="Удалить" className="text-gray-400 hover:text-rose-600" onClick={() => handleDelete(tenant)}>
												<Trash2 className="w-3.5 h-3.5" />
											</button>
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
					{!isLoading && tenantsArray.length > 0 && (
						<tfoot>
							<tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
								<td className={TD + " text-gray-700"} colSpan={4}>Итого: {tenantsArray.length} арендаторов</td>
								<td className={TD + " text-gray-700"}>{activeCount} активных</td>
								<td className={TD} />
							</tr>
						</tfoot>
					)}
				</table>
			</div>
			</RentalQueryState>

			<TenantDialog open={dialogOpen} onClose={() => setDialogOpen(false)} tenant={selectedTenant} />
		</div>
	);
}
