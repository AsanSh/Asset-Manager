import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ChevronsUpDown, Edit2, ExternalLink, Plus } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useSortable } from "@/lib/use-sortable";

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

const TH = "relative border border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap bg-gray-100 sticky top-0 z-10 select-none";
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
	const { data: tenants, isLoading } = useListTenants();
	const tenantsArray = Array.isArray(tenants) ? tenants : [];
	const { sorted, sortKey, sortDir, toggle } = useSortable(tenantsArray, "fullName");
	const [, navigate] = useLocation();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>();
	const { widths, startResize } = useColResize({ fullName: 220, iin: 130, phone: 140, email: 180, status: 110, actions: 100 });

	const activeCount = tenantsArray.filter((t) => t.status === "active").length;

	const handleAdd = () => { setSelectedTenant(undefined); setDialogOpen(true); };
	const handleEdit = (tenant: Tenant) => { setSelectedTenant(tenant); setDialogOpen(true); };

	return (
		<div className="p-6 space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Арендаторы</h1>
					<p className="text-muted-foreground text-sm">Управление базой арендаторов</p>
				</div>
				<Button onClick={handleAdd}>
					<Plus className="w-4 h-4 mr-2" />Добавить
				</Button>
			</div>

			<div className="overflow-auto border border-gray-200 rounded-lg">
				<table className="w-full text-xs border-collapse">
					<thead>
						<tr>
							<SortTh label="ФИО" col="fullName" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
							<SortTh label="ИИН" col="iin" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} widths={widths} startResize={startResize} />
							<th className={TH} style={{ width: widths.phone, minWidth: widths.phone }}>
								Телефон
								<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 z-20" onMouseDown={startResize("phone")} />
							</th>
							<th className={TH} style={{ width: widths.email, minWidth: widths.email }}>
								Email
								<div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 z-20" onMouseDown={startResize("email")} />
							</th>
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
											<button className="ml-1 text-gray-500 hover:text-gray-800" onClick={() => handleEdit(tenant)}>
												<Edit2 className="w-3.5 h-3.5" />
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

			<TenantDialog open={dialogOpen} onClose={() => setDialogOpen(false)} tenant={selectedTenant} />
		</div>
	);
}
