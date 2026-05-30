import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";

type Product = {
	id: number;
	name: string;
	category: string;
	unit: string;
	unitPrice: string;
	currency: string;
	description?: string | null;
	isActive: boolean;
	sortOrder?: number | null;
};

type Order = {
	id: number;
	companyName?: string | null;
	productName?: string | null;
	quantity: string;
	totalAmount: string;
	currency: string;
	status: string;
	createdAt: string;
};

const emptyForm = {
	name: "",
	category: "materials",
	unit: "шт",
	unitPrice: "",
	description: "",
	isActive: true,
};

export default function PlatformAdminMarketplace() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [form, setForm] = useState(emptyForm);

	const { data: products, isLoading } = useQuery({
		queryKey: ["platform-marketplace-products"],
		queryFn: () =>
			api.get<Product[]>("/platform-admin/marketplace/products").then((r) => r.data),
	});

	const { data: orders } = useQuery({
		queryKey: ["platform-marketplace-orders"],
		queryFn: () =>
			api.get<Order[]>("/platform-admin/marketplace/orders").then((r) => r.data),
	});

	const createMut = useMutation({
		mutationFn: () =>
			api.post("/platform-admin/marketplace/products", {
				...form,
				unitPrice: parseFloat(form.unitPrice || "0"),
			}),
		onSuccess: () => {
			toast({ title: "Товар добавлен" });
			setDialogOpen(false);
			setForm(emptyForm);
			qc.invalidateQueries({ queryKey: ["platform-marketplace-products"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const statusMut = useMutation({
		mutationFn: ({ id, status }: { id: number; status: string }) =>
			api.patch(`/platform-admin/marketplace/orders/${id}`, { status }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["platform-marketplace-orders"] });
			toast({ title: "Статус обновлён" });
		},
	});

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<Package className="w-7 h-7 text-violet-600" />
						Маркетплейс материалов
					</h1>
					<p className="text-gray-500 mt-1">
						Каталог для всех компаний на платформе
					</p>
				</div>
				<Button onClick={() => setDialogOpen(true)}>
					<Plus className="w-4 h-4 mr-2" />
					Добавить материал
				</Button>
			</div>

			<Card className="overflow-hidden">
				{isLoading ? (
					<Skeleton className="h-48 m-4" />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Название</TableHead>
								<TableHead>Категория</TableHead>
								<TableHead>Цена</TableHead>
								<TableHead>Ед.</TableHead>
								<TableHead>Статус</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(products || []).map((p) => (
								<TableRow key={p.id}>
									<TableCell className="font-medium">{p.name}</TableCell>
									<TableCell>{p.category}</TableCell>
									<TableCell>
										{parseFloat(p.unitPrice).toLocaleString("ru-KG")} сом
									</TableCell>
									<TableCell>{p.unit}</TableCell>
									<TableCell>
										<Badge variant={p.isActive ? "default" : "secondary"}>
											{p.isActive ? "В продаже" : "Скрыт"}
										</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</Card>

			<section>
				<h2 className="text-lg font-semibold mb-3">Заявки компаний</h2>
				<Card className="overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Компания</TableHead>
								<TableHead>Товар</TableHead>
								<TableHead>Сумма</TableHead>
								<TableHead>Статус</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{(orders || []).map((o) => (
								<TableRow key={o.id}>
									<TableCell>{o.companyName || "—"}</TableCell>
									<TableCell>
										{o.productName} × {o.quantity}
									</TableCell>
									<TableCell>
										{parseFloat(o.totalAmount).toLocaleString("ru-KG")} сом
									</TableCell>
									<TableCell>{o.status}</TableCell>
									<TableCell>
										{o.status === "pending" && (
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													statusMut.mutate({ id: o.id, status: "confirmed" })
												}
											>
												Подтвердить
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			</section>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Новый материал</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Название</Label>
							<Input
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Цена (сом)</Label>
								<Input
									type="number"
									value={form.unitPrice}
									onChange={(e) =>
										setForm({ ...form, unitPrice: e.target.value })
									}
								/>
							</div>
							<div>
								<Label>Единица</Label>
								<Input
									value={form.unit}
									onChange={(e) => setForm({ ...form, unit: e.target.value })}
								/>
							</div>
						</div>
						<div>
							<Label>Описание</Label>
							<Textarea
								value={form.description}
								onChange={(e) =>
									setForm({ ...form, description: e.target.value })
								}
							/>
						</div>
						<div className="flex items-center gap-2">
							<Switch
								checked={form.isActive}
								onCheckedChange={(v) => setForm({ ...form, isActive: v })}
							/>
							<Label>Активен в каталоге</Label>
						</div>
						<Button
							className="w-full"
							disabled={createMut.isPending || !form.name.trim()}
							onClick={() => createMut.mutate()}
						>
							Сохранить
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
