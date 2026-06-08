import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, FileText, Plus, ShieldCheck, Tags, XCircle } from "lucide-react";
import { Link } from "wouter";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";

type SupplyRequest = {
	id: number;
	projectId?: number | null;
	status: string;
	priority: string;
	neededByDate?: string | null;
	notes?: string | null;
	createdAt: string;
};

type SupplyItem = {
	id: string;
	globalProductId?: number;
	customName: string;
	quantity: string;
	unit: string;
	notes: string;
};

type CatalogProduct = {
	id: number;
	canonicalName: string;
	unitDefault: string;
};

type Project = { id: number; name: string };
type Supplier = { id: number; name: string };

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
	pending: { label: "Ожидает", color: "bg-amber-100 text-amber-700", icon: Clock },
	approved: { label: "Одобрена", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
	rejected: { label: "Отклонена", color: "bg-rose-100 text-rose-700", icon: XCircle },
	ordered: { label: "В заказе", color: "bg-indigo-100 text-indigo-700", icon: Tags },
	cancelled: { label: "Отменена", color: "bg-gray-100 text-gray-700", icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
	low: { label: "Низкий", color: "bg-gray-100 text-gray-700" },
	normal: { label: "Обычный", color: "bg-blue-100 text-blue-700" },
	high: { label: "Высокий", color: "bg-amber-100 text-amber-700" },
	urgent: { label: "Срочно", color: "bg-rose-100 text-rose-700" },
};

export default function WarehouseRequests() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [statusFilter, setStatusFilter] = useState("all");
	const [open, setOpen] = useState(false);
	const [projectId, setProjectId] = useState("");
	const [priority, setPriority] = useState("normal");
	const [neededByDate, setNeededByDate] = useState("");
	const [notes, setNotes] = useState("");
	const [items, setItems] = useState<SupplyItem[]>([
		{ id: "1", customName: "", quantity: "1", unit: "шт", notes: "" },
	]);

	const { data: requests = [] } = useQuery<SupplyRequest[]>({
		queryKey: ["supply-requests"],
		queryFn: () => api.get("/supply/requests").then((r) => r.data),
	});
	const { data: products = [] } = useQuery<CatalogProduct[]>({
		queryKey: ["global-products-for-supply"],
		queryFn: () => api.get("/catalog/products").then((r) => r.data),
	});
	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects-for-supply"],
		queryFn: async () => {
			const { data } = await api.get<any>("/construction/projects");
			return Array.isArray(data) ? data : data?.items ?? [];
		},
	});
	const { data: suppliers = [] } = useQuery<Supplier[]>({
		queryKey: ["warehouse-suppliers-for-requests"],
		queryFn: () =>
			api.get<any[]>("/warehouse/suppliers").then((r) =>
				(Array.isArray(r.data) ? r.data : []).map((s) => ({ id: Number(s.id), name: String(s.name) })),
			),
	});

	const filtered = useMemo(
		() => (statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter)),
		[requests, statusFilter],
	);

	const createMut = useMutation({
		mutationFn: async () => {
			return api.post("/supply/requests", {
				projectId: projectId ? Number(projectId) : undefined,
				priority,
				neededByDate: neededByDate || undefined,
				notes: notes || undefined,
				items: items.map((item) => ({
					globalProductId: item.globalProductId || undefined,
					customName: item.customName || undefined,
					quantity: item.quantity,
					unit: item.unit,
					notes: item.notes || undefined,
				})),
			});
		},
		onSuccess: () => {
			toast({ title: "Заявка создана" });
			setOpen(false);
			setProjectId("");
			setPriority("normal");
			setNeededByDate("");
			setNotes("");
			setItems([{ id: `${Date.now()}`, customName: "", quantity: "1", unit: "шт", notes: "" }]);
			qc.invalidateQueries({ queryKey: ["supply-requests"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e, "Не удалось создать заявку"),
				variant: "destructive",
			}),
	});

	const seedMut = useMutation({
		mutationFn: () => api.post("/catalog/categories/seed-defaults"),
		onSuccess: (r) => {
			toast({ title: "Каталог инициализирован", description: `Добавлено: ${r.data.inserted}` });
		},
		onError: (e) =>
			toast({
				title: "Ошибка инициализации",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});
	const approvalMut = useMutation({
		mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
			api.post(`/supply/requests/${id}/approvals`, { status }),
		onSuccess: () => {
			toast({ title: "Решение по заявке сохранено" });
			qc.invalidateQueries({ queryKey: ["supply-requests"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e, "Не удалось обновить статус заявки"),
				variant: "destructive",
			}),
	});
	const [orderFromRequestId, setOrderFromRequestId] = useState<number | null>(null);
	const [orderSupplierId, setOrderSupplierId] = useState("");
	const [orderTotalAmount, setOrderTotalAmount] = useState("");
	const orderMut = useMutation({
		mutationFn: () =>
			api.post("/supply/orders", {
				requestId: Number(orderFromRequestId),
				supplierId: Number(orderSupplierId),
				totalAmount: orderTotalAmount || "0",
				paymentType: "prepaid",
				status: "draft",
			}),
		onSuccess: () => {
			toast({ title: "Заказ создан" });
			setOrderFromRequestId(null);
			setOrderSupplierId("");
			setOrderTotalAmount("");
			qc.invalidateQueries({ queryKey: ["supply-requests"] });
			qc.invalidateQueries({ queryKey: ["supply-orders"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка создания заказа",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Заявки снабжения</h1>
					<p className="text-gray-500 mt-1">Прораб → снабженец → финансы</p>
				</div>
				<div className="flex gap-2">
					<Link href="/warehouse/approvals">
						<Button variant="outline" className="gap-2">
							<ShieldCheck className="w-4 h-4" />
							Согласования
						</Button>
					</Link>
					<Button variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
						Инициализировать каталог
					</Button>
					<Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white gap-2" onClick={() => setOpen(true)}>
						<Plus className="w-4 h-4" />
						Новая заявка
					</Button>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 gap-4">
				{Object.entries(statusConfig).map(([key, s]) => (
					<Card key={key} className="p-4">
						<p className="text-sm text-gray-500">{s.label}</p>
						<p className="text-2xl font-bold text-gray-900 mt-1">
							{requests.filter((r) => r.status === key).length}
						</p>
					</Card>
				))}
			</div>

			<div className="flex gap-3">
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-full sm:w-56">
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

			<div className="space-y-3">
				{filtered.map((request) => {
					const status = statusConfig[request.status] ?? statusConfig.pending;
					const priority = priorityConfig[request.priority] ?? priorityConfig.normal;
					const StatusIcon = status.icon;
					return (
						<Card key={request.id} className="p-5">
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-start gap-3">
									<div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
										<FileText className="w-5 h-5" />
									</div>
									<div>
										<p className="font-semibold text-gray-900">Заявка #{request.id}</p>
										<p className="text-xs text-gray-500 mt-0.5">
											Создана: {new Date(request.createdAt).toLocaleString("ru-KG")}
										</p>
										{request.neededByDate && (
											<p className="text-xs text-gray-500">Нужно к: {request.neededByDate}</p>
										)}
										{request.notes && (
											<p className="text-sm text-gray-600 mt-1 line-clamp-2">{request.notes}</p>
										)}
									</div>
								</div>
								<div className="flex gap-2">
									<Badge className={priority.color}>{priority.label}</Badge>
									<Badge className={status.color}>
										<StatusIcon className="w-3 h-3 mr-1" />
										{status.label}
									</Badge>
								</div>
							</div>
							<div className="mt-3 flex gap-2">
								{request.status === "pending" && (
									<>
										<Button
											size="sm"
											className="bg-emerald-600 text-white"
											onClick={() => approvalMut.mutate({ id: request.id, status: "approved" })}
											disabled={approvalMut.isPending}
										>
											Одобрить
										</Button>
										<Button
											size="sm"
											variant="destructive"
											onClick={() => approvalMut.mutate({ id: request.id, status: "rejected" })}
											disabled={approvalMut.isPending}
										>
											Отклонить
										</Button>
									</>
								)}
								{request.status === "approved" && (
									<Button size="sm" variant="outline" onClick={() => setOrderFromRequestId(request.id)}>
										Создать заказ
									</Button>
								)}
							</div>
						</Card>
					);
				})}
				{filtered.length === 0 && (
					<div className="text-sm text-gray-500 py-10 text-center">Нет заявок</div>
				)}
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Новая заявка снабжения</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div>
								<Label>Проект</Label>
								<Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
									<SelectTrigger><SelectValue placeholder="Выберите проект" /></SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Без проекта</SelectItem>
										{projects.map((p) => (
											<SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Приоритет</Label>
								<Select value={priority} onValueChange={setPriority}>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										{Object.entries(priorityConfig).map(([k, p]) => (
											<SelectItem key={k} value={k}>{p.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Нужно к</Label>
								<Input type="date" value={neededByDate} onChange={(e) => setNeededByDate(e.target.value)} />
							</div>
						</div>

						<div className="space-y-2">
							<Label>Позиции заявки</Label>
							{items.map((item, idx) => (
								<div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-2">
									<Select
										value={item.globalProductId ? String(item.globalProductId) : "none"}
										onValueChange={(v) =>
											setItems((prev) =>
												prev.map((it) =>
													it.id === item.id ? { ...it, globalProductId: v === "none" ? undefined : Number(v) } : it,
												),
											)
										}
									>
										<SelectTrigger className="md:col-span-2">
											<SelectValue placeholder="Товар из каталога" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Не выбрано</SelectItem>
											{products.map((p) => (
												<SelectItem key={p.id} value={String(p.id)}>
													{p.canonicalName}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Input
										className="md:col-span-2"
										placeholder="Или свое название"
										value={item.customName}
										onChange={(e) =>
											setItems((prev) =>
												prev.map((it) => (it.id === item.id ? { ...it, customName: e.target.value } : it)),
											)
										}
									/>
									<Input
										placeholder="Кол-во"
										value={item.quantity}
										onChange={(e) =>
											setItems((prev) =>
												prev.map((it) => (it.id === item.id ? { ...it, quantity: e.target.value } : it)),
											)
										}
									/>
									<Input
										placeholder="Ед."
										value={item.unit}
										onChange={(e) =>
											setItems((prev) =>
												prev.map((it) => (it.id === item.id ? { ...it, unit: e.target.value } : it)),
											)
										}
									/>
									{idx > 0 && (
										<Button
											variant="outline"
											onClick={() => setItems((prev) => prev.filter((it) => it.id !== item.id))}
										>
											Удалить
										</Button>
									)}
								</div>
							))}
							<Button
								variant="outline"
								onClick={() =>
									setItems((prev) => [
										...prev,
										{ id: `${Date.now()}-${prev.length}`, customName: "", quantity: "1", unit: "шт", notes: "" },
									])
								}
							>
								<Plus className="w-4 h-4 mr-1" /> Добавить позицию
							</Button>
						</div>

						<div>
							<Label>Комментарий</Label>
							<Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Дополнительно..." />
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
							<Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
								Создать заявку
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={!!orderFromRequestId} onOpenChange={(v) => !v && setOrderFromRequestId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Заказ из заявки #{orderFromRequestId}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Поставщик</Label>
							<Select value={orderSupplierId || "none"} onValueChange={(v) => setOrderSupplierId(v === "none" ? "" : v)}>
								<SelectTrigger><SelectValue placeholder="Выберите поставщика" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Не выбрано</SelectItem>
									{suppliers.map((supplier) => (
										<SelectItem key={supplier.id} value={String(supplier.id)}>
											{supplier.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Сумма заказа</Label>
							<Input
								value={orderTotalAmount}
								onChange={(e) => setOrderTotalAmount(e.target.value)}
								placeholder="0"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setOrderFromRequestId(null)}>
								Отмена
							</Button>
							<Button
								onClick={() => orderMut.mutate()}
								disabled={!orderSupplierId || orderMut.isPending}
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
