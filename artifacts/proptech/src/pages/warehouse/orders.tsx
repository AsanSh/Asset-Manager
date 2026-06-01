import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Package, Plus, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";

type SupplyOrder = {
	id: number;
	supplierId: number;
	requestId?: number | null;
	status: string;
	paymentType: string;
	totalAmount: string;
	currency: string;
	createdAt: string;
};
type Supplier = { id: number; name: string };
type SupplyRequest = { id: number; status: string };

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
	draft: { label: "Черновик", color: "bg-gray-100 text-gray-700", icon: Package },
	placed: { label: "Размещен", color: "bg-blue-100 text-blue-700", icon: Package },
	processing: { label: "В работе", color: "bg-amber-100 text-amber-700", icon: Truck },
	delivered: { label: "Доставлен", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
	closed: { label: "Закрыт", color: "bg-violet-100 text-violet-700", icon: CheckCircle },
};

const ORDER_STATUSES = ["draft", "placed", "processing", "delivered", "closed"] as const;

export default function WarehouseOrders() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [statusFilter, setStatusFilter] = useState("all");
	const [open, setOpen] = useState(false);
	const [supplierId, setSupplierId] = useState("");
	const [requestId, setRequestId] = useState("");
	const [paymentType, setPaymentType] = useState("prepaid");
	const [totalAmount, setTotalAmount] = useState("");

	const { data: orders = [] } = useQuery<SupplyOrder[]>({
		queryKey: ["supply-orders"],
		queryFn: () => api.get("/supply/orders").then((r) => r.data),
	});
	const { data: suppliers = [] } = useQuery<Supplier[]>({
		queryKey: ["warehouse-suppliers-light"],
		queryFn: () =>
			api.get<any[]>("/warehouse/suppliers").then((r) =>
				(Array.isArray(r.data) ? r.data : []).map((s) => ({ id: Number(s.id), name: String(s.name) })),
			),
	});
	const { data: approvedRequests = [] } = useQuery<SupplyRequest[]>({
		queryKey: ["supply-requests-approved-for-orders"],
		queryFn: () =>
			api
				.get<SupplyRequest[]>("/supply/requests")
				.then((r) => r.data.filter((x) => x.status === "approved" || x.status === "ordered")),
	});

	const createMut = useMutation({
		mutationFn: () =>
			api.post("/supply/orders", {
				supplierId: Number(supplierId),
				requestId: requestId ? Number(requestId) : undefined,
				paymentType,
				totalAmount: totalAmount || "0",
				status: "draft",
			}),
		onSuccess: () => {
			toast({ title: "Заказ создан" });
			setOpen(false);
			setSupplierId("");
			setRequestId("");
			setPaymentType("prepaid");
			setTotalAmount("");
			qc.invalidateQueries({ queryKey: ["supply-orders"] });
			qc.invalidateQueries({ queryKey: ["supply-requests"] });
		},
		onError: (e) =>
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" }),
	});

	const statusMut = useMutation({
		mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/supply/orders/${id}`, { status }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["supply-orders"] });
		},
		onError: (e) =>
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" }),
	});

	const filteredOrders = useMemo(
		() => (statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter)),
		[orders, statusFilter],
	);

	const supplierMap = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s.name])), [suppliers]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Заказы поставщикам</h1>
					<p className="text-gray-500 mt-1">Формируются из одобренных заявок снабжения</p>
				</div>
				<Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white gap-2" onClick={() => setOpen(true)}>
					<Plus className="w-4 h-4" />
					Новый заказ
				</Button>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				{ORDER_STATUSES.map((s) => (
					<Card key={s} className="p-4">
						<p className="text-xs text-gray-500">{statusConfig[s].label}</p>
						<p className="text-2xl font-bold mt-1">{orders.filter((o) => o.status === s).length}</p>
					</Card>
				))}
			</div>

			<div className="flex gap-3">
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-56">
						<SelectValue placeholder="Статус" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все статусы</SelectItem>
						{Object.entries(statusConfig).map(([key, config]) => (
							<SelectItem key={key} value={key}>{config.label}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-4">
				{filteredOrders.map((order) => {
					const status = statusConfig[order.status] ?? statusConfig.draft;
					const StatusIcon = status.icon;
					return (
						<Card key={order.id} className="p-6">
							<div className="flex items-start justify-between mb-3">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
										<Package className="w-6 h-6" />
									</div>
									<div>
										<h3 className="font-bold text-lg text-gray-900">Заказ #{order.id}</h3>
										<p className="text-sm text-gray-600">{supplierMap[order.supplierId] || `Поставщик #${order.supplierId}`}</p>
									</div>
								</div>
								<Badge className={status.color}>
									<StatusIcon className="w-3 h-3 mr-1" />
									{status.label}
								</Badge>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
								<div>
									<p className="text-xs text-gray-500">Дата</p>
									<p className="text-sm font-medium">{new Date(order.createdAt).toLocaleString("ru-KG")}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500">Заявка</p>
									<p className="text-sm font-medium">{order.requestId ? `#${order.requestId}` : "—"}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500">Оплата</p>
									<p className="text-sm font-medium">{order.paymentType}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500">Сумма</p>
									<p className="text-lg font-bold text-emerald-700">
										{new Intl.NumberFormat("ru-KG").format(Number(order.totalAmount || 0))} {order.currency === "KGS" ? "сом" : order.currency}
									</p>
								</div>
							</div>

							<div className="flex gap-2">
								{ORDER_STATUSES.map((next) => (
									<Button
										key={next}
										size="sm"
										variant={next === order.status ? "default" : "outline"}
										disabled={next === order.status || statusMut.isPending}
										onClick={() => statusMut.mutate({ id: order.id, status: next })}
									>
										{statusConfig[next].label}
									</Button>
								))}
							</div>
						</Card>
					);
				})}
				{filteredOrders.length === 0 && (
					<p className="text-sm text-gray-500 text-center py-10">Нет заказов</p>
				)}
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Новый заказ поставщику</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Поставщик</Label>
							<Select value={supplierId || "none"} onValueChange={(v) => setSupplierId(v === "none" ? "" : v)}>
								<SelectTrigger><SelectValue placeholder="Выберите поставщика" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Не выбрано</SelectItem>
									{suppliers.map((s) => (
										<SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Основание: заявка</Label>
							<Select value={requestId || "none"} onValueChange={(v) => setRequestId(v === "none" ? "" : v)}>
								<SelectTrigger><SelectValue placeholder="Выберите заявку" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Без заявки</SelectItem>
									{approvedRequests.map((r) => (
										<SelectItem key={r.id} value={String(r.id)}>
											Заявка #{r.id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<Label>Тип оплаты</Label>
								<Select value={paymentType} onValueChange={setPaymentType}>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										<SelectItem value="prepaid">Предоплата</SelectItem>
										<SelectItem value="postpaid">Постоплата</SelectItem>
										<SelectItem value="installment">Рассрочка</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Сумма</Label>
								<Input value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0" />
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
							<Button
								onClick={() => createMut.mutate()}
								disabled={!supplierId || createMut.isPending}
							>
								Создать заказ
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
