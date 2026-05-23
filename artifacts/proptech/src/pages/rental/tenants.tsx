import { useQueryClient } from "@tanstack/react-query";
import { Edit2, ExternalLink, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
	type CreateTenantBodyStatus,
	getListTenantsQueryKey,
	type Tenant,
	useCreateTenant,
	useListTenants,
	useUpdateTenant,
} from "@/api-client";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

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

export default function RentalTenants() {
	const { data: tenants, isLoading } = useListTenants();
	const tenantsArray = Array.isArray(tenants) ? tenants : [];
	const [, navigate] = useLocation();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>();

	const handleAdd = () => {
		setSelectedTenant(undefined);
		setDialogOpen(true);
	};

	const handleEdit = (tenant: Tenant) => {
		setSelectedTenant(tenant);
		setDialogOpen(true);
	};

	return (
		<div className="p-6 space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Арендаторы</h1>
					<p className="text-muted-foreground text-sm">
						Управление базой арендаторов
					</p>
				</div>
				<Button onClick={handleAdd}>
					<Plus className="w-4 h-4 mr-2" />
					Добавить
				</Button>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>ФИО</TableHead>
							<TableHead>ИИН</TableHead>
							<TableHead>Телефон</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead className="w-16"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 4 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 6 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : !tenantsArray.length ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center text-muted-foreground py-8"
								>
									Арендаторы не найдены
								</TableCell>
							</TableRow>
						) : (
							tenantsArray.map((tenant) => (
								<TableRow key={tenant.id}>
									<TableCell className="font-medium">
										{tenant.fullName}
									</TableCell>
									<TableCell>{tenant.iin || "—"}</TableCell>
									<TableCell>{tenant.phone || "—"}</TableCell>
									<TableCell>{tenant.email || "—"}</TableCell>
									<TableCell>
										<Badge
											className={statusColors[tenant.status] || ""}
											variant="secondary"
										>
											{statusLabels[tenant.status] || tenant.status}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<Button
												variant="ghost"
												size="sm"
												className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 gap-1"
												onClick={() => navigate(`/rental/tenants/${tenant.id}`)}
											>
												<ExternalLink className="w-3 h-3" /> Портал
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7"
												onClick={() => handleEdit(tenant)}
											>
												<Edit2 className="w-4 h-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<TenantDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				tenant={selectedTenant}
			/>
		</div>
	);
}
