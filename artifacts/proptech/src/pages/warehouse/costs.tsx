import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Boxes, Package, TrendingUp, Wallet } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

type WarehouseItem = {
	id: number;
	name: string;
	category?: string | null;
	unit?: string | null;
	currentStock?: number | string | null;
	minStock?: number | string | null;
	maxStock?: number | string | null;
	unitPrice?: number | string | null;
	currency?: string | null;
};

function num(value: unknown) {
	const n = Number(value ?? 0);
	return Number.isFinite(n) ? n : 0;
}

function money(amount: number, currency = "KGS") {
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(amount);
}

function compact(amount: number) {
	return new Intl.NumberFormat("ru-KG", {
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(amount);
}

export default function WarehouseCosts() {
	const { data: rawItems = [], isLoading } = useQuery<WarehouseItem[]>({
		queryKey: ["warehouse-items"],
		queryFn: () => api.get("/warehouse/items").then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	const items = rawItems.map((item) => ({
		...item,
		currentStockNum: num(item.currentStock),
		minStockNum: num(item.minStock),
		unitPriceNum: num(item.unitPrice),
		currency: item.currency || "KGS",
		category: item.category?.trim() || "Без категории",
		unit: item.unit || "ед.",
	}));

	const totalValue = items.reduce(
		(sum, item) => sum + item.currentStockNum * item.unitPriceNum,
		0,
	);
	const lowStock = items.filter(
		(item) => item.minStockNum > 0 && item.currentStockNum <= item.minStockNum,
	);
	const pricedItems = items.filter((item) => item.unitPriceNum > 0).length;

	const categories = Object.values(
		items.reduce<Record<string, { name: string; value: number; count: number }>>(
			(acc, item) => {
				const key = item.category;
				acc[key] ??= { name: key, value: 0, count: 0 };
				acc[key].value += item.currentStockNum * item.unitPriceNum;
				acc[key].count += 1;
				return acc;
			},
			{},
		),
	).sort((a, b) => b.value - a.value);

	const maxCategory = Math.max(...categories.map((cat) => cat.value), 1);

	return (
		<div className="space-y-6">
			<section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
							Складской капитал
						</div>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
							Стоимость запасов
						</h1>
						<p className="mt-1 max-w-2xl text-sm text-slate-500">
							Расчет строится по фактическим карточкам склада: остаток, минимальный
							порог и закупочная цена.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Link href="/warehouse/items">
							<Button variant="outline" className="gap-2">
								<Package className="h-4 w-4" />
								Номенклатура
							</Button>
						</Link>
						<Link href="/warehouse/requests">
							<Button className="gap-2 bg-slate-950 hover:bg-slate-800">
								<AlertCircle className="h-4 w-4" />
								Создать заявку
							</Button>
						</Link>
					</div>
				</div>
			</section>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{[
					{ label: "Стоимость", value: money(totalValue), icon: Wallet, tone: "text-cyan-700 bg-cyan-50" },
					{ label: "Позиций", value: String(items.length), icon: Boxes, tone: "text-blue-700 bg-blue-50" },
					{ label: "С ценой", value: String(pricedItems), icon: TrendingUp, tone: "text-emerald-700 bg-emerald-50" },
					{ label: "Низкий остаток", value: String(lowStock.length), icon: AlertCircle, tone: "text-amber-700 bg-amber-50" },
				].map((metric) => (
					<Card key={metric.label} className="rounded-3xl border-slate-200 shadow-sm">
						<CardContent className="p-5">
							<div className="flex items-start justify-between">
								<div>
									<p className="text-sm text-slate-500">{metric.label}</p>
									{isLoading ? (
										<Skeleton className="mt-3 h-8 w-28" />
									) : (
										<div className="mt-2 text-2xl font-black text-slate-950">
											{metric.value}
										</div>
									)}
								</div>
								<div className={`rounded-2xl p-3 ${metric.tone}`}>
									<metric.icon className="h-5 w-5" />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
				<Card className="rounded-3xl border-slate-200 shadow-sm">
					<CardContent className="p-6">
						<div className="mb-5 flex items-center justify-between">
							<div>
								<h2 className="text-lg font-bold text-slate-950">Категории</h2>
								<p className="text-sm text-slate-500">Доля стоимости по группам склада</p>
							</div>
							<Badge variant="outline">{categories.length} групп</Badge>
						</div>
						<div className="space-y-4">
							{isLoading && <Skeleton className="h-32 w-full rounded-2xl" />}
							{!isLoading && categories.length === 0 && (
								<div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
									Создайте товары и укажите закупочные цены, чтобы увидеть стоимость запасов.
								</div>
							)}
							{categories.map((cat) => {
								const percent = totalValue > 0 ? (cat.value / totalValue) * 100 : 0;
								return (
									<div key={cat.name} className="rounded-2xl bg-slate-50 p-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<div className="font-semibold text-slate-900">{cat.name}</div>
												<div className="text-xs text-slate-500">{cat.count} позиций</div>
											</div>
											<div className="text-right font-mono font-bold text-slate-950">
												{compact(cat.value)} сом
											</div>
										</div>
										<div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
											<div
												className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
												style={{ width: `${Math.max(4, (cat.value / maxCategory) * 100)}%` }}
											/>
										</div>
										<div className="mt-1 text-right text-xs text-slate-500">
											{percent.toFixed(1)}%
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-3xl border-slate-200 shadow-sm">
					<CardContent className="p-6">
						<div className="mb-5 flex items-center justify-between">
							<div>
								<h2 className="text-lg font-bold text-slate-950">Контроль остатков</h2>
								<p className="text-sm text-slate-500">Позиции ниже минимального порога</p>
							</div>
							<Badge className="bg-amber-100 text-amber-700">{lowStock.length}</Badge>
						</div>
						<div className="space-y-3">
							{isLoading && <Skeleton className="h-28 w-full rounded-2xl" />}
							{!isLoading && lowStock.length === 0 && (
								<div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-sm text-emerald-800">
									Все складские позиции выше минимального порога.
								</div>
							)}
							{lowStock.slice(0, 8).map((item) => {
								const ratio = item.minStockNum > 0 ? item.currentStockNum / item.minStockNum : 0;
								return (
									<Link key={item.id} href="/warehouse/items">
										<div className="cursor-pointer rounded-2xl border border-amber-100 bg-amber-50/70 p-4 transition hover:border-amber-300">
											<div className="flex items-start justify-between gap-3">
												<div>
													<div className="font-semibold text-slate-950">{item.name}</div>
													<div className="text-xs text-slate-500">
														{item.category} · минимум {item.minStockNum} {item.unit}
													</div>
												</div>
												<div className="font-mono text-sm font-bold text-amber-700">
													{item.currentStockNum} {item.unit}
												</div>
											</div>
											<div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
												<div
													className="h-full rounded-full bg-amber-500"
													style={{ width: `${Math.max(3, Math.min(100, ratio * 100))}%` }}
												/>
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
