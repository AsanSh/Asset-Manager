import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function SalesProperties() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedProperty, setSelectedProperty] = useState<any>(null);

	const { data: salesProperties, isLoading } = useQuery({
		queryKey: ["crm-sales-properties"],
		queryFn: () => api.get("/crm/sales-properties").then((r) => r.data),
	});

	const { data: properties } = useQuery({
		queryKey: ["properties"],
		queryFn: () => api.get("/properties").then((r) => r.data),
	});

	const propertiesArray = Array.isArray(properties) ? properties : [];
	const salesPropertiesArray = Array.isArray(salesProperties)
		? salesProperties
		: [];

	const createMutation = useMutation({
		mutationFn: (data: any) => api.post("/crm/sales-properties", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["crm-sales-properties"] });
			toast({ title: "Объект добавлен на продажу" });
			setDialogOpen(false);
		},
		onError: () => toast({ title: "Ошибка", variant: "destructive" }),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: number; data: any }) =>
			api.patch(`/crm/sales-properties/${id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["crm-sales-properties"] });
			toast({ title: "Объект обновлён" });
			setDialogOpen(false);
		},
		onError: () => toast({ title: "Ошибка", variant: "destructive" }),
	});

	const formatCurrency = (amount: string, currency: string) => {
		const num = parseFloat(amount || "0");
		const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
		return `${symbol}${num.toLocaleString("ru-KG")} ${currency === "KGS" ? "сом" : ""}`.trim();
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const data = {
			propertyId: formData.get("propertyId")
				? Number(formData.get("propertyId"))
				: undefined,
			salePrice: formData.get("salePrice"),
			currency: formData.get("currency") || "KGS",
			status: formData.get("status") || "available",
			marketingDescription: formData.get("marketingDescription") || undefined,
			availableFrom: formData.get("availableFrom") || undefined,
		};

		if (selectedProperty) {
			updateMutation.mutate({ id: selectedProperty.id, data });
		} else {
			createMutation.mutate(data);
		}
	};

	const statusColors: Record<string, string> = {
		available: "bg-emerald-100 text-emerald-800",
		reserved: "bg-amber-100 text-amber-800",
		sold: "bg-gray-100 text-gray-800",
	};

	const statusLabels: Record<string, string> = {
		available: "Доступен",
		reserved: "Зарезервирован",
		sold: "Продан",
	};

	const columns = useMemo<ColumnDef<any, unknown>[]>(
		() => [
			{
				accessorKey: "projectName",
				header: "Проект",
				size: 160,
				meta: { exportLabel: "Проект", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium">{row.original.projectName || "—"}</span>
				),
			},
			{
				accessorKey: "unitNumber",
				header: "№ объекта",
				size: 110,
				meta: { exportLabel: "№ объекта" },
				cell: ({ row }) => row.original.unitNumber || "—",
			},
			{
				id: "salePrice",
				header: "Цена продажи",
				size: 140,
				accessorFn: (row) => parseFloat(row.salePrice || "0"),
				meta: { exportLabel: "Цена продажи", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-medium">
						{formatCurrency(row.original.salePrice, row.original.currency)}
					</span>
				),
			},
			{
				id: "status",
				header: "Статус",
				size: 130,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge
						className={statusColors[row.original.status] || "bg-gray-100"}
					>
						{statusLabels[row.original.status] || row.original.status}
					</Badge>
				),
			},
			{
				id: "availableFrom",
				header: "Доступен с",
				size: 110,
				accessorFn: (row) => row.availableFrom || "",
				meta: { exportLabel: "Доступен с" },
				cell: ({ row }) =>
					row.original.availableFrom
						? new Date(row.original.availableFrom).toLocaleDateString("ru-KG")
						: "—",
			},
			{
				id: "actions",
				header: "",
				size: 60,
				enableSorting: false,
				meta: { align: "right" },
				cell: ({ row }) => (
					<Button
						variant="ghost"
						size="icon"
						onClick={() => {
							setSelectedProperty(row.original);
							setDialogOpen(true);
						}}
					>
						<Edit2 className="h-4 w-4" />
					</Button>
				),
			},
		],
		[],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Объекты на продажу
					</h2>
					<p className="text-muted-foreground mt-2">
						Управление объектами для продажи
					</p>
				</div>
				<Button
					onClick={() => {
						setSelectedProperty(null);
						setDialogOpen(true);
					}}
				>
					<Plus className="h-4 w-4 mr-2" />
					Добавить объект
				</Button>
			</div>

			<DataTable
				tableId="crm-sales-properties"
				columns={columns}
				data={salesPropertiesArray}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по проекту, номеру…"
				emptyState={
					<div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
						<Building2 className="h-12 w-12 opacity-50" />
						<span>Нет объектов на продажу</span>
					</div>
				}
			/>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>
							{selectedProperty
								? "Редактировать объект"
								: "Добавить объект на продажу"}
						</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmit} className="space-y-4">
						{!selectedProperty && (
							<div>
								<Label htmlFor="propertyId">Объект *</Label>
								<Select name="propertyId" required>
									<SelectTrigger>
										<SelectValue placeholder="Выберите объект" />
									</SelectTrigger>
									<SelectContent>
										{propertiesArray.map((p: any) => (
											<SelectItem key={p.id} value={String(p.id)}>
												{p.projectName} - {p.unitNumber}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="salePrice">Цена продажи *</Label>
								<Input
									className="mt-auto"
									id="salePrice"
									name="salePrice"
									type="number"
									step="0.01"
									required
									defaultValue={selectedProperty?.salePrice}
								/>
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="currency">Валюта *</Label>
								<Select
									name="currency"
									defaultValue={selectedProperty?.currency || "KGS"}
								>
									<SelectTrigger className="mt-auto">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="KGS">KGS сом</SelectItem>
										<SelectItem value="USD">USD $</SelectItem>
										<SelectItem value="EUR">EUR €</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="status">Статус *</Label>
								<Select
									name="status"
									defaultValue={selectedProperty?.status || "available"}
								>
									<SelectTrigger className="mt-auto">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="available">Доступен</SelectItem>
										<SelectItem value="reserved">Зарезервирован</SelectItem>
										<SelectItem value="sold">Продан</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col">
								<Label className="leading-tight mb-1.5" htmlFor="availableFrom">Доступен с</Label>
								<Input
									className="mt-auto"
									id="availableFrom"
									name="availableFrom"
									type="date"
									defaultValue={selectedProperty?.availableFrom?.split("T")[0]}
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="marketingDescription">
								Маркетинговое описание
							</Label>
							<Textarea
								id="marketingDescription"
								name="marketingDescription"
								rows={4}
								defaultValue={selectedProperty?.marketingDescription}
								placeholder="Привлекательное описание для потенциальных покупателей..."
							/>
						</div>
						<div className="flex justify-end gap-2 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setDialogOpen(false)}
							>
								Отмена
							</Button>
							<Button
								type="submit"
								disabled={createMutation.isPending || updateMutation.isPending}
							>
								{createMutation.isPending || updateMutation.isPending
									? "Сохранение..."
									: "Сохранить"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
