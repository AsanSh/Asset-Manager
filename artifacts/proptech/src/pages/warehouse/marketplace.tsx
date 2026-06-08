import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Package, Plus, Search, ShoppingCart } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";
import { unwrapList } from "@/lib/unwrap-list";

type MarketplaceSupplier = { id: number; name: string; code?: string | null };

type MarketplaceProduct = {
	id: number;
	supplierId?: number | null;
	supplierName?: string | null;
	sku?: string | null;
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
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n)} ${currency === "KGS" ? "сом" : currency}`;
}

function defaultQty(p: MarketplaceProduct) {
	const min = parseFloat(p.minOrderQty || "1");
	return Number.isFinite(min) && min > 0 ? String(min) : "1";
}

export default function WarehouseMarketplace() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [supplierFilter, setSupplierFilter] = useState<string>("all");
	const [projectId, setProjectId] = useState("none");
	const [rowQty, setRowQty] = useState<Record<number, string>>({});
	const [addingId, setAddingId] = useState<number | null>(null);

	useEffect(() => {
		const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 280);
		return () => window.clearTimeout(t);
	}, [searchInput]);

	useEffect(() => {
		setRowQty({});
	}, [supplierFilter, debouncedSearch]);

	const { data: suppliers = [] } = useQuery({
		queryKey: ["marketplace-suppliers"],
		queryFn: () =>
			api.get<MarketplaceSupplier[]>("/marketplace/suppliers").then((r) => r.data),
	});

	const { data: products = [], isLoading: loadingProducts, isFetching } = useQuery({
		queryKey: ["marketplace-products", supplierFilter, debouncedSearch],
		queryFn: () => {
			const params: Record<string, string> = { limit: "150" };
			if (supplierFilter !== "all") params.supplierId = supplierFilter;
			if (debouncedSearch) params.q = debouncedSearch;
			return api
				.get<MarketplaceProduct[]>("/marketplace/products", { params })
				.then((r) => r.data);
		},
	});

	const { data: orders, isLoading: loadingOrders } = useQuery({
		queryKey: ["marketplace-orders"],
		queryFn: () =>
			api.get<MarketplaceOrder[]>("/marketplace/orders").then((r) => r.data),
	});

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects-marketplace"],
		queryFn: () =>
			api
				.get<Project[] | { items?: Project[] }>("/construction/projects")
				.then((r) => unwrapList(r.data)),
	});

	const addOrderMut = useMutation({
		mutationFn: (payload: { productId: number; quantity: number }) =>
			api.post("/marketplace/orders", {
				productId: payload.productId,
				quantity: payload.quantity,
				projectId: projectId && projectId !== "none" ? parseInt(projectId, 10) : undefined,
			}),
		onSuccess: () => {
			toast({ title: "Добавлено в заявки" });
			qc.invalidateQueries({ queryKey: ["marketplace-orders"] });
		},
		onError: (e) =>
			toast({
				title: "Не удалось добавить",
				description: getApiErrorMessage(e),
				variant: "destructive",
			}),
		onSettled: () => setAddingId(null),
	});

	const handleAdd = useCallback(
		(product: MarketplaceProduct) => {
			const raw = rowQty[product.id] ?? defaultQty(product);
			const quantity = parseFloat(raw);
			if (!Number.isFinite(quantity) || quantity <= 0) {
				toast({
					title: "Введите количество больше нуля",
					variant: "destructive",
				});
				return;
			}
			setAddingId(product.id);
			addOrderMut.mutate({ productId: product.id, quantity });
		},
		[rowQty, addOrderMut, toast],
	);

	const columns = useMemo<ColumnDef<MarketplaceProduct>[]>(
		() => [
			{
				accessorKey: "name",
				header: "Наименование",
				meta: { pinned: "left", grow: true },
				cell: ({ row }) => (
					<div className="min-w-[180px]">
						<p className="font-medium text-gray-900">{row.original.name}</p>
						{row.original.description && (
							<p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
								{row.original.description}
							</p>
						)}
					</div>
				),
			},
			{
				accessorKey: "supplierName",
				header: "Поставщик",
				cell: ({ row }) => row.original.supplierName || "—",
			},
			{
				accessorKey: "sku",
				header: "Артикул",
				cell: ({ row }) => row.original.sku || "—",
			},
			{
				accessorKey: "category",
				header: "Категория",
				cell: ({ row }) => (
					<Badge variant="secondary" className="font-normal">
						{row.original.category || "—"}
					</Badge>
				),
			},
			{
				accessorKey: "unitPrice",
				header: "Цена",
				meta: { align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span className="font-mono tabular-nums text-emerald-700">
						{formatMoney(row.original.unitPrice, row.original.currency)}
					</span>
				),
			},
			{
				accessorKey: "unit",
				header: "Ед.",
				cell: ({ row }) => row.original.unit,
			},
			{
				id: "qty",
				header: "Кол-во",
				meta: { align: "right" },
				cell: ({ row }) => {
					const p = row.original;
					return (
						<Input
							type="number"
							min={defaultQty(p)}
							className="h-8 w-24 ml-auto font-mono tabular-nums"
							value={rowQty[p.id] ?? defaultQty(p)}
							onClick={(e) => e.stopPropagation()}
							onChange={(e) =>
								setRowQty((prev) => ({ ...prev, [p.id]: e.target.value }))
							}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleAdd(p);
								}
							}}
						/>
					);
				},
			},
			{
				id: "add",
				header: "",
				meta: { pinned: "right" },
				cell: ({ row }) => {
					const p = row.original;
					const busy = addingId === p.id && addOrderMut.isPending;
					return (
						<Button
							size="icon"
							className="h-8 w-8 shrink-0"
							disabled={busy}
							onClick={(e) => {
								e.stopPropagation();
								handleAdd(p);
							}}
							title="Добавить в заявку"
						>
							{busy ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Plus className="w-4 h-4" />
							)}
						</Button>
					);
				},
			},
		],
		[rowQty, addingId, addOrderMut.isPending, handleAdd],
	);

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Маркетплейс материалов</h1>
				<p className="text-gray-500 mt-1">
					Умный поиск по каталогу — укажите количество и добавьте в заявку одной кнопкой
				</p>
			</div>

			<section className="space-y-4">
				<div className="flex flex-wrap items-end gap-3">
					<div className="flex-1 min-w-[240px] max-w-xl relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<Input
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							placeholder="Поиск: название, артикул, категория, поставщик…"
							className="pl-9 h-11 text-base"
							autoComplete="off"
						/>
					</div>
					{suppliers.length > 0 && (
						<Select value={supplierFilter} onValueChange={setSupplierFilter}>
							<SelectTrigger className="w-52 h-11">
								<SelectValue placeholder="Все поставщики" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Все поставщики</SelectItem>
								{suppliers.map((s) => (
									<SelectItem key={s.id} value={String(s.id)}>
										{s.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
					<Select value={projectId} onValueChange={setProjectId}>
						<SelectTrigger className="w-52 h-11">
							<SelectValue placeholder="Проект (опц.)" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">Без проекта</SelectItem>
							{(projects || []).map((pr) => (
								<SelectItem key={pr.id} value={String(pr.id)}>
									{pr.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
					<Package className="w-4 h-4" />
					{isFetching && !loadingProducts ? (
						<span className="flex items-center gap-1.5">
							<Loader2 className="w-3.5 h-3.5 animate-spin" /> Поиск…
						</span>
					) : (
						<span>
							Найдено: <strong className="text-foreground">{products.length}</strong>
							{debouncedSearch ? ` по «${debouncedSearch}»` : ""}
						</span>
					)}
				</div>

				<DataTable
					tableId="warehouse-marketplace-catalog"
					columns={columns}
					data={products}
					isLoading={loadingProducts}
					hideToolbar
					getRowId={(row) => String(row.id)}
					emptyState={
						<div className="py-10 text-center text-muted-foreground">
							{debouncedSearch
								? "Ничего не найдено — измените запрос или фильтр поставщика"
								: "Каталог пока пуст. Администратор платформы добавит материалы."}
						</div>
					}
				/>
			</section>

			<section>
				<h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
					<ShoppingCart className="w-5 h-5" />
					Мои заявки
				</h2>
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
		</div>
	);
}
