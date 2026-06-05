import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/am/PageShell";
import { SettingsBreadcrumb } from "@/lib/settings-breadcrumbs";
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { SystemSettingsBar } from "@/components/system-settings-nav";
import { api } from "@/lib/api";

interface LegalEntity {
	id: number;
	name: string;
	fullLegalName?: string;
	inn?: string;
	address?: string;
	phone?: string;
	email?: string;
	directorName?: string;
	accountant?: string;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

interface LegalEntityDialogProps {
	open: boolean;
	onClose: () => void;
	entity?: LegalEntity;
}

function LegalEntityDialog({ open, onClose, entity }: LegalEntityDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		name: "",
		fullLegalName: "",
		inn: "",
		address: "",
		phone: "",
		email: "",
		directorName: "",
		accountant: "",
		isActive: true,
	});

	useEffect(() => {
		if (entity && open) {
			setFormData({
				name: entity.name,
				fullLegalName: entity.fullLegalName || "",
				inn: entity.inn || "",
				address: entity.address || "",
				phone: entity.phone || "",
				email: entity.email || "",
				directorName: entity.directorName || "",
				accountant: entity.accountant || "",
				isActive: entity.isActive,
			});
		} else if (!entity && open) {
			setFormData({
				name: "",
				fullLegalName: "",
				inn: "",
				address: "",
				phone: "",
				email: "",
				directorName: "",
				accountant: "",
				isActive: true,
			});
		}
	}, [entity, open]);

	const createMutation = useMutation({
		mutationFn: (data: any) => api.post("/legal-entities", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["legal-entities"] });
			toast({ title: "Юридическое лицо создано" });
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
		mutationFn: (data: any) => api.patch(`/legal-entities/${entity?.id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["legal-entities"] });
			toast({ title: "Юридическое лицо обновлено" });
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
			...formData,
			fullLegalName: formData.fullLegalName || null,
			inn: formData.inn || null,
			address: formData.address || null,
			phone: formData.phone || null,
			email: formData.email || null,
			directorName: formData.directorName || null,
			accountant: formData.accountant || null,
		};

		if (entity) {
			updateMutation.mutate(payload);
		} else {
			createMutation.mutate(payload);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{entity
							? "Редактировать юридическое лицо"
							: "Добавить юридическое лицо"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Название *</Label>
							<Input
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="ОсОО Компания"
								required
								className="mt-auto"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Полное наименование</Label>
							<Input
								value={formData.fullLegalName}
								onChange={(e) =>
									setFormData({ ...formData, fullLegalName: e.target.value })
								}
								placeholder="Общество с ограниченной ответственностью..."
								className="mt-auto"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">ИНН/ИНО</Label>
							<Input
								value={formData.inn}
								onChange={(e) =>
									setFormData({ ...formData, inn: e.target.value })
								}
								placeholder="12345678901234"
								className="mt-auto"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Телефон</Label>
							<Input
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								placeholder="+996 700 000 000"
								className="mt-auto"
							/>
						</div>
					</div>

					<div>
						<Label>Email</Label>
						<Input
							type="email"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
							placeholder="info@company.kg"
							className="mt-1"
						/>
					</div>

					<div>
						<Label>Адрес</Label>
						<Input
							value={formData.address}
							onChange={(e) =>
								setFormData({ ...formData, address: e.target.value })
							}
							placeholder="г. Бишкек, ул. Советская 1"
							className="mt-1"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Директор</Label>
							<Input
								value={formData.directorName}
								onChange={(e) =>
									setFormData({ ...formData, directorName: e.target.value })
								}
								placeholder="Иванов И.И."
								className="mt-auto"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Главный бухгалтер</Label>
							<Input
								value={formData.accountant}
								onChange={(e) =>
									setFormData({ ...formData, accountant: e.target.value })
								}
								placeholder="Петрова П.П."
								className="mt-auto"
							/>
						</div>
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
							Активен
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

export default function LegalEntities() {
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const { data: entities, isLoading } = useQuery({
		queryKey: ["legal-entities"],
		queryFn: () => api.get("/legal-entities").then((r) => r.data),
	});

	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedEntity, setSelectedEntity] = useState<
		LegalEntity | undefined
	>();
	const [deleteId, setDeleteId] = useState<number | null>(null);

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/legal-entities/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["legal-entities"] });
			toast({ title: "Юридическое лицо удалено" });
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

	const entitiesArray = Array.isArray(entities) ? entities : [];

	const columns = useMemo<ColumnDef<LegalEntity, unknown>[]>(
		() => [
			{
				id: "name",
				header: "Название",
				accessorKey: "name",
				meta: { exportLabel: "Название", grow: true },
				cell: ({ row }) => (
					<span className="font-medium text-gray-900">{row.original.name}</span>
				),
			},
			{
				id: "fullLegalName",
				header: "Полное наименование",
				accessorKey: "fullLegalName",
				meta: { exportLabel: "Полное наименование" },
				cell: ({ row }) => (
					<span className="text-gray-600 text-sm">{row.original.fullLegalName || "—"}</span>
				),
			},
			{
				id: "inn",
				header: "ИНН",
				accessorKey: "inn",
				meta: { exportLabel: "ИНН" },
				cell: ({ row }) => row.original.inn || "—",
			},
			{
				id: "phone",
				header: "Телефон",
				accessorKey: "phone",
				meta: { exportLabel: "Телефон" },
			},
			{
				id: "email",
				header: "Email",
				accessorKey: "email",
				meta: { exportLabel: "Email" },
				cell: ({ row }) => (
					<span className="text-gray-500 text-sm">{row.original.email || "—"}</span>
				),
			},
			{
				id: "isActive",
				header: "Статус",
				accessorKey: "isActive",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge variant={row.original.isActive ? "default" : "secondary"}>
						{row.original.isActive ? "Активен" : "Неактивен"}
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
								setSelectedEntity(row.original);
								setDialogOpen(true);
							}}
						>
							<Edit2 className="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="text-rose-600 hover:text-rose-700"
							onClick={() => setDeleteId(row.original.id)}
						>
							<Trash2 className="w-4 h-4" />
						</Button>
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
				title="Юридические лица"
				subtitle="Управление юридическими лицами организации"
				breadcrumb={<SettingsBreadcrumb label="Юридические лица" />}
				primaryAction={
					<Button
						onClick={() => {
							setSelectedEntity(undefined);
							setDialogOpen(true);
						}}
						className="bg-amber-500 hover:bg-amber-600"
					>
						<Plus className="w-4 h-4 mr-2" /> Добавить
					</Button>
				}
			>
				<DataTable
					tableId="settings-legal-entities"
					columns={columns}
					data={entitiesArray}
					isLoading={isLoading}
					enableSearch
					searchPlaceholder="Поиск по названию, ИНН, телефону, email…"
					initialSorting={[{ id: "name", desc: false }]}
					emptyState={
						<div className="flex flex-col items-center gap-2 py-8">
							<Building2 className="w-8 h-8 text-gray-200" />
							<p className="text-gray-400">Юридические лица не найдены</p>
						</div>
					}
				/>
			</PageShell.List>

			<LegalEntityDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				entity={selectedEntity}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить юридическое лицо?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Юридическое лицо будет удалено из
							системы.
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
