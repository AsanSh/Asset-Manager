import { useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowDownCircle,
	ArrowUpCircle,
	DollarSign,
	Package,
	TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

interface DashboardData {
	totalItems: number;
	lowStockAlerts: number;
	totalInventoryValue: number;
	topItemsByValue: Array<{
		id: number;
		name: string;
		category: string;
		currentStock: number;
		unitPrice: number;
		totalValue: number;
		currency: string;
	}>;
	recentOperations: Array<{
		id: number;
		type: "incoming" | "outgoing";
		date: string;
		itemName: string;
		quantity: number;
		description: string;
	}>;
}

function formatCurrency(amount: number, currency: string = "KGS") {
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
}

function formatNumber(num: number) {
	return new Intl.NumberFormat("ru-KG").format(num);
}

function formatDate(date: string) {
	return new Date(date).toLocaleDateString("ru-KG", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function KPICard({
	title,
	value,
	icon: Icon,
	loading,
}: {
	title: string;
	value: string | number;
	icon: any;
	loading?: boolean;
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<Icon className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				{loading ? (
					<Skeleton className="h-8 w-24" />
				) : (
					<div className="text-2xl font-bold">{value}</div>
				)}
			</CardContent>
		</Card>
	);
}

export default function WarehouseDashboard() {
	const { data: dashboardData, isLoading } = useQuery<DashboardData>({
		queryKey: ["warehouse-dashboard"],
		queryFn: () => api.get("/warehouse/dashboard").then((r) => r.data),
	});

	const topItems = Array.isArray(dashboardData?.topItemsByValue)
		? dashboardData.topItemsByValue
		: [];
	const recentOps = Array.isArray(dashboardData?.recentOperations)
		? dashboardData.recentOperations
		: [];

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Склад - Панель управления</h1>
				<p className="text-muted-foreground text-sm">
					Обзор складских операций и остатков
				</p>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<KPICard
					title="Всего позиций"
					value={dashboardData?.totalItems ?? 0}
					icon={Package}
					loading={isLoading}
				/>
				<KPICard
					title="Низкий остаток"
					value={dashboardData?.lowStockAlerts ?? 0}
					icon={AlertTriangle}
					loading={isLoading}
				/>
				<KPICard
					title="Стоимость запасов"
					value={formatCurrency(dashboardData?.totalInventoryValue ?? 0)}
					icon={DollarSign}
					loading={isLoading}
				/>
				<KPICard
					title="Операций сегодня"
					value={
						recentOps.filter((op) => {
							const today = new Date().toDateString();
							return new Date(op.date).toDateString() === today;
						}).length
					}
					icon={TrendingUp}
					loading={isLoading}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Top Items by Value */}
				<Card>
					<CardHeader>
						<CardTitle>Топ позиций по стоимости</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Наименование</TableHead>
										<TableHead>Категория</TableHead>
										<TableHead className="text-right">Остаток</TableHead>
										<TableHead className="text-right">Стоимость</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{isLoading ? (
										Array.from({ length: 5 }).map((_, i) => (
											<TableRow key={i}>
												{Array.from({ length: 4 }).map((_, j) => (
													<TableCell key={j}>
														<Skeleton className="h-4 w-full" />
													</TableCell>
												))}
											</TableRow>
										))
									) : !topItems.length ? (
										<TableRow>
											<TableCell
												colSpan={4}
												className="text-center text-muted-foreground py-8"
											>
												Нет данных
											</TableCell>
										</TableRow>
									) : (
										topItems.map((item) => (
											<TableRow key={item.id}>
												<TableCell className="font-medium">
													{item.name}
												</TableCell>
												<TableCell>
													<Badge variant="outline">{item.category}</Badge>
												</TableCell>
												<TableCell className="text-right">
													{formatNumber(item.currentStock)}
												</TableCell>
												<TableCell className="text-right font-semibold">
													{formatCurrency(item.totalValue, item.currency)}
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				{/* Recent Operations */}
				<Card>
					<CardHeader>
						<CardTitle>Последние операции</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{isLoading ? (
								Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex items-center gap-3">
										<Skeleton className="h-10 w-10 rounded-full" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-4 w-3/4" />
											<Skeleton className="h-3 w-1/2" />
										</div>
									</div>
								))
							) : !recentOps.length ? (
								<div className="text-center text-muted-foreground py-8">
									Нет операций
								</div>
							) : (
								recentOps.map((op) => (
									<div
										key={op.id}
										className="flex items-center gap-3 p-3 rounded-lg border"
									>
										<div
											className={`p-2 rounded-full ${op.type === "incoming" ? "bg-emerald-100" : "bg-blue-100"}`}
										>
											{op.type === "incoming" ? (
												<ArrowDownCircle className="h-5 w-5 text-emerald-600" />
											) : (
												<ArrowUpCircle className="h-5 w-5 text-blue-600" />
											)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-medium truncate">
													{op.itemName}
												</span>
												<Badge
													variant={
														op.type === "incoming" ? "default" : "secondary"
													}
													className="shrink-0"
												>
													{op.type === "incoming" ? "Приход" : "Расход"}
												</Badge>
											</div>
											<div className="text-sm text-muted-foreground flex items-center gap-2">
												<span>{formatDate(op.date)}</span>
												<span>•</span>
												<span>Количество: {formatNumber(op.quantity)}</span>
											</div>
											{op.description && (
												<div className="text-xs text-muted-foreground mt-1 truncate">
													{op.description}
												</div>
											)}
										</div>
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
