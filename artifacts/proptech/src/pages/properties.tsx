import { useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import {
	getListPropertiesQueryKey,
	type Property,
	type PropertyStatus,
	type PropertyType,
	useCreateProperty,
	useDeleteProperty,
	useListProperties,
	useUpdateProperty,
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
import { useToast } from "@/hooks/use-toast";

const TYPE_LABELS: Record<string, string> = {
	apartment: "Квартира",
	office: "Офис",
	commercial: "Коммерция",
	parking: "Парковка",
	storage: "Кладовая",
	house: "Дом",
};

const STATUS_LABELS: Record<string, string> = {
	available: "Свободен",
	sold: "Продан",
	reserved: "Бронь",
	rented: "Сдан",
	on_lease: "В аренде",
	archived: "Архив",
};

export default function Properties() {
	const { data: properties, isLoading } = useListProperties({});
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingProperty, setEditingProperty] = useState<Property | null>(null);
	const deleteMutation = useDeleteProperty();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	// Безопасное преобразование в массив
	const propertiesArray = Array.isArray(properties) ? properties : [];

	const handleOpenCreate = () => {
		setEditingProperty(null);
		setIsDialogOpen(true);
	};

	const handleOpenEdit = (property: Property) => {
		setEditingProperty(property);
		setIsDialogOpen(true);
	};

	const handleDelete = (id: number) => {
		if (confirm("Удалить этот объект?")) {
			deleteMutation.mutate(
				{ id },
				{
					onSuccess: () => {
						queryClient.invalidateQueries({
							queryKey: getListPropertiesQueryKey(),
						});
						toast({ title: "Объект удалён" });
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

	const columns = useMemo<ColumnDef<Property, unknown>[]>(
		() => [
			{
				id: "projectName",
				header: "Проект",
				size: 160,
				minSize: 120,
				maxSize: 280,
				accessorKey: "projectName",
				meta: { exportLabel: "Проект", grow: true, pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium truncate block" title={row.original.projectName}>
						{row.original.projectName}
					</span>
				),
			},
			{
				id: "unitNumber",
				header: "№ помещения",
				size: 110,
				accessorKey: "unitNumber",
				meta: { exportLabel: "№ помещения" },
			},
			{
				id: "type",
				header: "Тип",
				size: 110,
				accessorKey: "type",
				meta: { exportLabel: "Тип" },
				cell: ({ row }) =>
					TYPE_LABELS[row.original.type] || row.original.type,
			},
			{
				id: "status",
				header: "Статус",
				size: 110,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge variant="outline">
						{STATUS_LABELS[row.original.status] || row.original.status}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "",
				size: 88,
				enableSorting: false,
				enableResizing: false,
				meta: { align: "right" },
				cell: ({ row }) => (
					<div className="flex justify-end gap-0.5">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleOpenEdit(row.original)}
						>
							<Edit2 className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleDelete(row.original.id)}
							className="text-destructive"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				),
			},
		],
		[],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Объекты</h2>
					<p className="text-muted-foreground text-sm mt-1">
						Реестр объектов недвижимости
					</p>
				</div>
				<Button onClick={handleOpenCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Добавить объект
				</Button>
			</div>

			<DataTable
				tableId="directory-properties"
				columns={columns}
				data={propertiesArray}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по проекту или номеру…"
				initialSorting={[{ id: "projectName", desc: false }]}
				emptyState={
					<p className="py-8 text-center text-muted-foreground">Объектов пока нет</p>
				}
			/>

			<PropertyDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				property={editingProperty}
			/>
		</div>
	);
}

function PropertyDialog({
	open,
	onOpenChange,
	property,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	property: Property | null;
}) {
	const isEditing = !!property;
	const createMutation = useCreateProperty();
	const updateMutation = useUpdateProperty();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		projectName: "",
		unitNumber: "",
		type: "apartment" as PropertyType,
		status: "available" as PropertyStatus,
		block: "",
		floor: "",
		area: "",
		comment: "",
	});

	useEffect(() => {
		if (property && open) {
			setFormData({
				projectName: property.projectName,
				unitNumber: property.unitNumber,
				type: property.type as PropertyType,
				status: property.status as PropertyStatus,
				block: property.block || "",
				floor: property.floor?.toString() || "",
				area: property.area?.toString() || "",
				comment: property.comment || "",
			});
		} else if (!property && open) {
			setFormData({
				projectName: "",
				unitNumber: "",
				type: "apartment" as PropertyType,
				status: "available" as PropertyStatus,
				block: "",
				floor: "",
				area: "",
				comment: "",
			});
		}
	}, [property, open]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const payload = {
			...formData,
			floor: formData.floor ? parseInt(formData.floor, 10) : undefined,
			area: formData.area ? parseFloat(formData.area) : undefined,
		};

		if (isEditing && property) {
			updateMutation.mutate(
				{ id: property.id, data: payload },
				{
					onSuccess: () => {
						queryClient.invalidateQueries({
							queryKey: getListPropertiesQueryKey(),
						});
						toast({ title: "Объект обновлён" });
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
				{ data: payload },
				{
					onSuccess: () => {
						queryClient.invalidateQueries({
							queryKey: getListPropertiesQueryKey(),
						});
						toast({ title: "Объект создан" });
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Редактировать объект" : "Добавить объект"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-4">
					<div className="grid gap-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2 flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="projectName">Проект *</Label>
								<Input
									className="mt-auto"
									id="projectName"
									required
									value={formData.projectName}
									onChange={(e) =>
										setFormData({ ...formData, projectName: e.target.value })
									}
								/>
							</div>
							<div className="space-y-2 flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="unitNumber">№ помещения *</Label>
								<Input
									className="mt-auto"
									id="unitNumber"
									required
									value={formData.unitNumber}
									onChange={(e) =>
										setFormData({ ...formData, unitNumber: e.target.value })
									}
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2 flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="type">Тип *</Label>
								<Select
									value={formData.type}
									onValueChange={(val: any) =>
										setFormData({ ...formData, type: val })
									}
								>
									<SelectTrigger className="mt-auto">
										<SelectValue placeholder="Выберите тип" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="apartment">Квартира</SelectItem>
										<SelectItem value="office">Офис</SelectItem>
										<SelectItem value="commercial">Коммерция</SelectItem>
										<SelectItem value="parking">Парковка</SelectItem>
										<SelectItem value="storage">Кладовая</SelectItem>
										<SelectItem value="house">Дом</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2 flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="status">Статус *</Label>
								<Select
									value={formData.status}
									onValueChange={(val: any) =>
										setFormData({ ...formData, status: val })
									}
								>
									<SelectTrigger className="mt-auto">
										<SelectValue placeholder="Выберите статус" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="available">Свободен</SelectItem>
										<SelectItem value="sold">Продан</SelectItem>
										<SelectItem value="reserved">Бронь</SelectItem>
										<SelectItem value="rented">Сдан</SelectItem>
										<SelectItem value="on_lease">В аренде</SelectItem>
										<SelectItem value="archived">Архив</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2 flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="block">Секция</Label>
								<Input
									className="mt-auto"
									id="block"
									value={formData.block}
									onChange={(e) =>
										setFormData({ ...formData, block: e.target.value })
									}
								/>
							</div>
							<div className="space-y-2 flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="floor">Этаж</Label>
								<Input
									className="mt-auto"
									id="floor"
									type="number"
									value={formData.floor}
									onChange={(e) =>
										setFormData({ ...formData, floor: e.target.value })
									}
								/>
							</div>
							<div className="space-y-2 flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="area">Площадь (м²)</Label>
								<Input
									className="mt-auto"
									id="area"
									type="number"
									step="0.01"
									value={formData.area}
									onChange={(e) =>
										setFormData({ ...formData, area: e.target.value })
									}
								/>
							</div>
						</div>
					</div>
					<div className="flex justify-end pt-4">
						<Button
							type="button"
							variant="outline"
							className="mr-2"
							onClick={() => onOpenChange(false)}
						>
							Отмена
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Сохранение…" : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
