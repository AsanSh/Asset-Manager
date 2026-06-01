import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CheckCircle,
	Clock,
	ExternalLink,
	FileText,
	Package,
	ShieldCheck,
	XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";

type SupplyRequestRow = {
	id: number;
	projectId?: number | null;
	status: string;
	priority: string;
	neededByDate?: string | null;
	notes?: string | null;
	createdAt: string;
};

type SupplyRequestDetail = SupplyRequestRow & {
	requestedByName?: string;
	items: Array<{
		id: number;
		customName?: string | null;
		productName?: string | null;
		quantity: string;
		unit: string;
		notes?: string | null;
	}>;
	approvals: Array<{
		id: number;
		status: string;
		comment?: string | null;
		approverName?: string;
		approvedAt?: string | null;
		createdAt: string;
	}>;
};

type Project = { id: number; name: string };
type Supplier = { id: number; name: string };

const STATUS_FILTERS = [
	{ value: "pending", label: "На согласовании" },
	{ value: "approved", label: "Одобрено" },
	{ value: "rejected", label: "Отклонено" },
	{ value: "ordered", label: "В заказе" },
	{ value: "all", label: "Все" },
] as const;

const statusBadge: Record<string, string> = {
	pending: "bg-amber-100 text-amber-700 border-amber-200",
	approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
	rejected: "bg-rose-100 text-rose-700 border-rose-200",
	ordered: "bg-blue-100 text-blue-700 border-blue-200",
	cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const statusLabel: Record<string, string> = {
	pending: "На согласовании",
	approved: "Одобрена",
	rejected: "Отклонена",
	ordered: "В заказе",
	cancelled: "Отменена",
};

const approvalStatusLabel: Record<string, string> = {
	pending: "Ожидает",
	approved: "Одобрено",
	rejected: "Отклонено",
};

export default function WarehouseSupplyApprovals() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [statusFilter, setStatusFilter] = useState<string>("pending");
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [comment, setComment] = useState("");
	const [orderOpen, setOrderOpen] = useState(false);
	const [orderSupplierId, setOrderSupplierId] = useState("");
	const [orderTotalAmount, setOrderTotalAmount] = useState("");

	const listQueryKey = ["supply-requests-approvals", statusFilter];
	const { data: requests = [], isLoading: listLoading } = useQuery<SupplyRequestRow[]>({
		queryKey: listQueryKey,
		queryFn: () => {
			const params = statusFilter === "all" ? "" : `?status=${statusFilter}`;
			return api.get(`/supply/requests${params}`).then((r) => r.data);
		},
	});

	const { data: detail, isLoading: detailLoading } = useQuery<SupplyRequestDetail>({
		queryKey: ["supply-request-detail", selectedId],
		queryFn: () => api.get(`/supply/requests/${selectedId}`).then((r) => r.data),
		enabled: selectedId != null,
	});

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects-for-approvals"],
		queryFn: async () => {
			const { data } = await api.get<any>("/construction/projects");
			return Array.isArray(data) ? data : data?.items ?? [];
		},
	});

	const { data: suppliers = [] } = useQuery<Supplier[]>({
		queryKey: ["warehouse-suppliers-for-approvals"],
		queryFn: () =>
			api.get<any[]>("/warehouse/suppliers").then((r) =>
				(Array.isArray(r.data) ? r.data : []).map((s) => ({
					id: Number(s.id),
					name: String(s.name),
				})),
			),
	});

	const projectMap = useMemo(
		() => Object.fromEntries(projects.map((p) => [Number(p.id), p.name])),
		[projects],
	);

	useEffect(() => {
		if (requests.length === 0) {
			setSelectedId(null);
			return;
		}
		if (selectedId == null || !requests.some((r) => r.id === selectedId)) {
			setSelectedId(requests[0].id);
		}
	}, [requests, selectedId]);

	const approvalMut = useMutation({
		mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
			api.post(`/supply/requests/${id}/approvals`, {
				status,
				comment: comment.trim() || undefined,
			}),
		onSuccess: () => {
			toast({ title: "Решение сохранено" });
			setComment("");
			qc.invalidateQueries({ queryKey: listQueryKey });
			qc.invalidateQueries({ queryKey: ["supply-request-detail", selectedId] });
			qc.invalidateQueries({ queryKey: ["supply-requests"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const orderMut = useMutation({
		mutationFn: () =>
			api.post("/supply/orders", {
				requestId: selectedId!,
				supplierId: Number(orderSupplierId),
				totalAmount: orderTotalAmount || "0",
				paymentType: "prepaid",
				status: "draft",
			}),
		onSuccess: () => {
			toast({ title: "Заказ создан" });
			setOrderOpen(false);
			setOrderSupplierId("");
			setOrderTotalAmount("");
			qc.invalidateQueries({ queryKey: listQueryKey });
			qc.invalidateQueries({ queryKey: ["supply-request-detail", selectedId] });
			qc.invalidateQueries({ queryKey: ["supply-orders"] });
		},
		onError: (e) =>
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
	});

	const pendingCount = useMemo(
		() => (statusFilter === "pending" ? requests.length : undefined),
		[statusFilter, requests.length],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
						<ShieldCheck className="w-8 h-8 text-emerald-600" />
						Согласования снабжения
					</h1>
					<p className="text-gray-500 mt-1">
						Финансы и снабжение: решение по заявкам, журнал комментариев, переход к заказу
					</p>
				</div>
				<Link href="/warehouse/orders">
					<Button variant="outline" className="gap-2">
						<Package className="w-4 h-4" />
						Все заказы
						<ExternalLink className="w-3 h-3 opacity-60" />
					</Button>
				</Link>
			</div>

			<div className="flex flex-wrap gap-2">
				{STATUS_FILTERS.map((f) => (
					<Button
						key={f.value}
						size="sm"
						variant={statusFilter === f.value ? "default" : "outline"}
						onClick={() => setStatusFilter(f.value)}
					>
						{f.label}
						{f.value === "pending" && pendingCount != null && pendingCount > 0 && (
							<Badge className="ml-2 bg-amber-500 text-white">{pendingCount}</Badge>
						)}
					</Button>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[520px]">
				<Card className="lg:col-span-2 p-3 flex flex-col">
					<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2">
						Заявки
					</p>
					<div className="flex-1 overflow-y-auto space-y-2 pr-1">
						{listLoading && (
							<p className="text-sm text-gray-500 p-4 text-center">Загрузка...</p>
						)}
						{!listLoading && requests.length === 0 && (
							<p className="text-sm text-gray-500 p-4 text-center">Нет заявок в этом статусе</p>
						)}
						{requests.map((req) => (
							<button
								key={req.id}
								type="button"
								onClick={() => setSelectedId(req.id)}
								className={`w-full text-left rounded-lg border p-3 transition-colors ${
									selectedId === req.id
										? "border-emerald-400 bg-emerald-50"
										: "border-gray-100 hover:border-emerald-200 hover:bg-gray-50"
								}`}
							>
								<div className="flex items-start justify-between gap-2">
									<div>
										<p className="font-semibold text-gray-900">#{req.id}</p>
										<p className="text-xs text-gray-500 mt-0.5">
											{new Date(req.createdAt).toLocaleString("ru-KG")}
										</p>
										{req.projectId && (
											<p className="text-xs text-gray-600 mt-1">
												{projectMap[Number(req.projectId)] || `Проект #${req.projectId}`}
											</p>
										)}
									</div>
									<Badge className={statusBadge[req.status] ?? statusBadge.pending}>
										{statusLabel[req.status] ?? req.status}
									</Badge>
								</div>
								{req.neededByDate && (
									<p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
										<Clock className="w-3 h-3" />
										Нужно к: {req.neededByDate}
									</p>
								)}
							</button>
						))}
					</div>
				</Card>

				<Card className="lg:col-span-3 p-5 flex flex-col">
					{selectedId == null && (
						<div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
							Выберите заявку слева
						</div>
					)}
					{selectedId != null && detailLoading && (
						<p className="text-sm text-gray-500">Загрузка карточки...</p>
					)}
					{selectedId != null && detail && !detailLoading && (
						<>
							<div className="flex items-start justify-between gap-3 mb-4">
								<div>
									<h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
										<FileText className="w-5 h-5 text-emerald-600" />
										Заявка #{detail.id}
									</h2>
									<p className="text-sm text-gray-500 mt-1">
										Инициатор: {detail.requestedByName ?? "—"}
										{detail.projectId != null && (
											<>
												{" · "}
												{projectMap[Number(detail.projectId)] || `Проект #${detail.projectId}`}
											</>
										)}
									</p>
								</div>
								<Badge className={statusBadge[detail.status] ?? statusBadge.pending}>
									{statusLabel[detail.status] ?? detail.status}
								</Badge>
							</div>

							{detail.notes && (
								<p className="text-sm text-gray-700 bg-gray-50 rounded-md p-3 mb-4">{detail.notes}</p>
							)}

							<div className="mb-4">
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
									Позиции ({detail.items.length})
								</p>
								<div className="border rounded-md divide-y max-h-40 overflow-y-auto">
									{detail.items.map((item) => (
										<div key={item.id} className="px-3 py-2 text-sm flex justify-between gap-2">
											<span>
												{item.productName || item.customName || "—"}
											</span>
											<span className="text-gray-600 whitespace-nowrap">
												{Number(item.quantity).toLocaleString("ru-KG")} {item.unit}
											</span>
										</div>
									))}
								</div>
							</div>

							<div className="mb-4 flex-1 min-h-0">
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
									Журнал согласований
								</p>
								{detail.approvals.length === 0 ? (
									<p className="text-sm text-gray-500">Решений пока нет</p>
								) : (
									<ul className="space-y-2 max-h-36 overflow-y-auto">
										{detail.approvals.map((a) => (
											<li
												key={a.id}
												className="rounded-md border border-gray-100 px-3 py-2 text-sm"
											>
												<div className="flex items-center justify-between gap-2">
													<span className="font-medium">{a.approverName ?? "—"}</span>
													<Badge
														variant="outline"
														className={
															a.status === "approved"
																? "border-emerald-200 text-emerald-700"
																: a.status === "rejected"
																	? "border-rose-200 text-rose-700"
																	: "border-amber-200 text-amber-700"
														}
													>
														{approvalStatusLabel[a.status] ?? a.status}
													</Badge>
												</div>
												<p className="text-xs text-gray-500 mt-0.5">
													{new Date(a.createdAt).toLocaleString("ru-KG")}
												</p>
												{a.comment && (
													<p className="text-gray-700 mt-1">{a.comment}</p>
												)}
											</li>
										))}
									</ul>
								)}
							</div>

							{detail.status === "pending" && (
								<div className="border-t pt-4 space-y-3">
									<div>
										<Label>Комментарий к решению</Label>
										<Textarea
											value={comment}
											onChange={(e) => setComment(e.target.value)}
											placeholder="Необязательно: причина отклонения или условия..."
											rows={2}
										/>
									</div>
									<div className="flex flex-wrap gap-2">
										<Button
											className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
											disabled={approvalMut.isPending}
											onClick={() =>
												approvalMut.mutate({ id: detail.id, status: "approved" })
											}
										>
											<CheckCircle className="w-4 h-4" />
											Одобрить
										</Button>
										<Button
											variant="destructive"
											disabled={approvalMut.isPending}
											onClick={() =>
												approvalMut.mutate({ id: detail.id, status: "rejected" })
											}
										>
											<XCircle className="w-4 h-4 mr-1" />
											Отклонить
										</Button>
									</div>
								</div>
							)}

							{detail.status === "approved" && (
								<div className="border-t pt-4 flex flex-wrap gap-2">
									<Button
										className="bg-emerald-600 text-white gap-1"
										onClick={() => setOrderOpen(true)}
									>
										<Package className="w-4 h-4" />
										Создать заказ
									</Button>
									<Link href="/warehouse/orders">
										<Button variant="outline">Перейти к заказам</Button>
									</Link>
								</div>
							)}

							{detail.status === "ordered" && (
								<div className="border-t pt-4">
									<Link href="/warehouse/orders">
										<Button variant="outline" className="gap-2">
											<Package className="w-4 h-4" />
											Открыть заказы по заявке
										</Button>
									</Link>
								</div>
							)}
						</>
					)}
				</Card>
			</div>

			<Dialog open={orderOpen} onOpenChange={setOrderOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Заказ по заявке #{selectedId}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Поставщик</Label>
							<Select
								value={orderSupplierId || "none"}
								onValueChange={(v) => setOrderSupplierId(v === "none" ? "" : v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Выберите поставщика" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Не выбрано</SelectItem>
									{suppliers.map((s) => (
										<SelectItem key={s.id} value={String(s.id)}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Сумма, сом</Label>
							<Input
								type="number"
								value={orderTotalAmount}
								onChange={(e) => setOrderTotalAmount(e.target.value)}
								placeholder="0"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setOrderOpen(false)}>
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
