import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, ShoppingCart } from "lucide-react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/unwrap-list";

type MarketplaceProduct = {
	id: number;
	name: string;
	category: string;
	unit: string;
	unitPrice: string;
	currency: string;
	description?: string | null;
	minOrderQty?: string | null;
	stockAvailable?: string | null;
};

type MarketplaceOrder = {
	id: number;
	productName?: string | null;
	productUnit?: string | null;
	quantity: string;
	totalAmount: string;
	currency: string;
	status: string;
	createdAt: string;
};

type Project = { id: number; name: string };

const statusLabel: Record<string, string> = {
	pending: "Ожидает",
	confirmed: "Подтверждена",
	shipped: "Отгружается",
	fulfilled: "Выполнена",
	cancelled: "Отменена",
};

function formatMoney(amount: string | number, currency = "KGS") {
	const n = typeof amount === "string" ? parseFloat(amount) : amount;
	return `${new Intl.NumberFormat("ru-KG").format(n)} ${currency === "KGS" ? "сом" : currency}`;
}

export default function WarehouseMarketplace() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [orderProduct, setOrderProduct] = useState<MarketplaceProduct | null>(null);
	const [qty, setQty] = useState("");
	const [projectId, setProjectId] = useState("");
	const [notes, setNotes] = useState("");

	const { data: products, isLoading: loadingProducts } = useQuery({
		queryKey: ["marketplace-products"],
		queryFn: () =>
			api.get<MarketplaceProduct[]>("/marketplace/products").then((r) => r.data),
	});

	const { data: orders, isLoading: loadingOrders } = useQuery({
		queryKey: ["marketplace-orders"],
		queryFn: () =>
			api.get<MarketplaceOrder[]>("/marketplace/orders").then((r) => r.data),
	});

	const { data: projects } = useQuery({
		queryKey: ["construction-projects-marketplace"],
		queryFn: () =>
			api
				.get<Project[] | { items?: Project[] }>("/construction/projects")
				.then((r) => unwrapList(r.data)),
	});

	const orderMut = useMutation({
		mutationFn: () =>
			api.post("/marketplace/orders", {
				productId: orderProduct!.id,
				quantity: parseFloat(qty),
				projectId: projectId ? parseInt(projectId, 10) : undefined,
				notes: notes || undefined,
			}),
		onSuccess: () => {
			toast({ title: "Заявка отправлена" });
			setOrderProduct(null);
			setQty("");
			setProjectId("");
			setNotes("");
			qc.invalidateQueries({ queryKey: ["marketplace-orders"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Маркетплейс материалов</h1>
				<p className="text-gray-500 mt-1">
					Каталог платформы — заявки на покупку для вашей компании
				</p>
			</div>

			<section>
				<h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
					<Package className="w-5 h-5" />
					Каталог
				</h2>
				{loadingProducts ? (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-40 rounded-xl" />
						))}
					</div>
				) : !products?.length ? (
					<Card className="p-8 text-center text-gray-500">
						Каталог пока пуст. Администратор платформы добавит материалы.
					</Card>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{products.map((p) => (
							<Card key={p.id} className="p-4 flex flex-col gap-3">
								<div>
									<Badge variant="secondary" className="mb-2">
										{p.category}
									</Badge>
									<h3 className="font-semibold text-gray-900">{p.name}</h3>
									{p.description && (
										<p className="text-sm text-gray-500 mt-1 line-clamp-2">
											{p.description}
										</p>
									)}
								</div>
								<div className="mt-auto flex items-end justify-between gap-2">
									<div>
										<p className="text-lg font-bold">
											{formatMoney(p.unitPrice, p.currency)}
										</p>
										<p className="text-xs text-gray-500">за {p.unit}</p>
									</div>
									<Button size="sm" onClick={() => setOrderProduct(p)}>
										<ShoppingCart className="w-4 h-4 mr-1" />
										Заявка
									</Button>
								</div>
							</Card>
						))}
					</div>
				)}
			</section>

			<section>
				<h2 className="text-lg font-semibold mb-4">Мои заявки</h2>
				{loadingOrders ? (
					<Skeleton className="h-32 rounded-xl" />
				) : !orders?.length ? (
					<p className="text-gray-500 text-sm">Заявок пока нет</p>
				) : (
					<div className="space-y-2">
						{orders.map((o) => (
							<Card key={o.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
								<div>
									<p className="font-medium">
										{o.productName} — {o.quantity} {o.productUnit}
									</p>
									<p className="text-sm text-gray-500">
										{formatMoney(o.totalAmount, o.currency)} ·{" "}
										{new Date(o.createdAt).toLocaleDateString("ru-KG")}
									</p>
								</div>
								<Badge>{statusLabel[o.status] || o.status}</Badge>
							</Card>
						))}
					</div>
				)}
			</section>

			<Dialog open={!!orderProduct} onOpenChange={(v) => !v && setOrderProduct(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Заявка: {orderProduct?.name}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Количество ({orderProduct?.unit})</Label>
							<Input
								type="number"
								min={orderProduct?.minOrderQty || "1"}
								value={qty}
								onChange={(e) => setQty(e.target.value)}
								placeholder={orderProduct?.minOrderQty || "1"}
							/>
						</div>
						<div>
							<Label>Проект (куда пойдут материалы)</Label>
							<Select value={projectId} onValueChange={setProjectId}>
								<SelectTrigger>
									<SelectValue placeholder="Не указан" />
								</SelectTrigger>
								<SelectContent>
									{(projects || []).map((pr) => (
										<SelectItem key={pr.id} value={String(pr.id)}>
											{pr.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Комментарий</Label>
							<Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
						</div>
						<Button
							className="w-full"
							disabled={orderMut.isPending || !qty}
							onClick={() => orderMut.mutate()}
						>
							Отправить заявку
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
