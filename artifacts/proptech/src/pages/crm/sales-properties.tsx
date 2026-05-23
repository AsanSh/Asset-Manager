import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit2, Plus } from "lucide-react";
import { useState } from "react";
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

			<div className="border rounded-md bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Проект</TableHead>
							<TableHead>№ Объекта</TableHead>
							<TableHead>Цена продажи</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead>Доступен с</TableHead>
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
										<Skeleton className="h-5 w-24" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-24" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-24" />
									</TableCell>
									<TableCell className="text-right">
										<Skeleton className="h-8 w-16 inline-block" />
									</TableCell>
								</TableRow>
							))
						) : salesPropertiesArray.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center py-8 text-muted-foreground"
								>
									<Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
									<p>Нет объектов на продажу</p>
								</TableCell>
							</TableRow>
						) : (
							salesPropertiesArray.map((prop: any) => (
								<TableRow key={prop.id}>
									<TableCell className="font-medium">
										{prop.projectName || "—"}
									</TableCell>
									<TableCell>{prop.unitNumber || "—"}</TableCell>
									<TableCell>
										{formatCurrency(prop.salePrice, prop.currency)}
									</TableCell>
									<TableCell>
										<Badge
											className={statusColors[prop.status] || "bg-gray-100"}
										>
											{statusLabels[prop.status] || prop.status}
										</Badge>
									</TableCell>
									<TableCell>
										{prop.availableFrom
											? new Date(prop.availableFrom).toLocaleDateString("ru-RU")
											: "—"}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => {
												setSelectedProperty(prop);
												setDialogOpen(true);
											}}
										>
											<Edit2 className="h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

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
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="salePrice">Цена продажи *</Label>
								<Input
									id="salePrice"
									name="salePrice"
									type="number"
									step="0.01"
									required
									defaultValue={selectedProperty?.salePrice}
								/>
							</div>
							<div>
								<Label htmlFor="currency">Валюта *</Label>
								<Select
									name="currency"
									defaultValue={selectedProperty?.currency || "KGS"}
								>
									<SelectTrigger>
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
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="status">Статус *</Label>
								<Select
									name="status"
									defaultValue={selectedProperty?.status || "available"}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="available">Доступен</SelectItem>
										<SelectItem value="reserved">Зарезервирован</SelectItem>
										<SelectItem value="sold">Продан</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="availableFrom">Доступен с</Label>
								<Input
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
