import {
	AlertCircle,
	CheckCircle,
	Clock,
	Package,
	Plus,
	Truck,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// Mock data - в реальном приложении из API
const mockOrders = [
	{
		id: 1,
		orderNumber: "ЗАК-2026-001",
		supplier: "ООО СтройМатериалы",
		date: "2026-05-01",
		expectedDate: "2026-05-10",
		total: 450000,
		status: "new",
		items: 5,
	},
	{
		id: 2,
		orderNumber: "ЗАК-2026-002",
		supplier: "Баткен Снаб",
		date: "2026-05-02",
		expectedDate: "2026-05-08",
		total: 230000,
		status: "sent",
		items: 3,
	},
	{
		id: 3,
		orderNumber: "ЗАК-2026-003",
		supplier: "Кыргыз Цемент",
		date: "2026-05-03",
		expectedDate: "2026-05-07",
		total: 680000,
		status: "in_transit",
		items: 2,
	},
	{
		id: 4,
		orderNumber: "ЗАК-2026-004",
		supplier: "ООО СтройМатериалы",
		date: "2026-04-28",
		expectedDate: "2026-05-05",
		total: 320000,
		status: "received",
		items: 4,
	},
];

const statusConfig = {
	new: {
		label: "Новый",
		color: "bg-blue-100 text-blue-700",
		icon: AlertCircle,
	},
	sent: {
		label: "Отправлен",
		color: "bg-blue-100 text-blue-700",
		icon: Package,
	},
	in_transit: {
		label: "В пути",
		color: "bg-amber-100 text-amber-700",
		icon: Truck,
	},
	received: {
		label: "Получен",
		color: "bg-emerald-100 text-emerald-700",
		icon: CheckCircle,
	},
	cancelled: {
		label: "Отменён",
		color: "bg-rose-100 text-rose-700",
		icon: XCircle,
	},
};

export default function WarehouseOrders() {
	const [statusFilter, setStatusFilter] = useState("all");

	const filteredOrders =
		statusFilter === "all"
			? mockOrders
			: mockOrders.filter((o) => o.status === statusFilter);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						Заказы поставщикам
					</h1>
					<p className="text-gray-500 mt-1">Управление закупками и заказами</p>
				</div>
				<Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white gap-2">
					<Plus className="w-4 h-4" />
					Новый заказ
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				{[
					{
						label: "Новые",
						count: mockOrders.filter((o) => o.status === "new").length,
						color: "from-blue-500 to-blue-600",
					},
					{
						label: "Отправлено",
						count: mockOrders.filter((o) => o.status === "sent").length,
						color: "from-blue-500 to-blue-600",
					},
					{
						label: "В пути",
						count: mockOrders.filter((o) => o.status === "in_transit").length,
						color: "from-yellow-500 to-yellow-600",
					},
					{
						label: "Получено",
						count: mockOrders.filter((o) => o.status === "received").length,
						color: "from-green-500 to-green-600",
					},
				].map((stat, idx) => (
					<Card
						key={idx}
						className={`p-5 bg-gradient-to-br ${stat.color} text-white shadow-lg`}
					>
						<div className="text-4xl font-bold mb-1">{stat.count}</div>
						<div className="text-sm opacity-90">{stat.label}</div>
					</Card>
				))}
			</div>

			{/* Filters */}
			<div className="flex gap-3">
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-56">
						<SelectValue placeholder="Статус" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все статусы</SelectItem>
						{Object.entries(statusConfig).map(([key, config]) => (
							<SelectItem key={key} value={key}>
								{config.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Orders List */}
			<div className="space-y-4">
				{filteredOrders.map((order) => {
					const status =
						statusConfig[order.status as keyof typeof statusConfig];
					const StatusIcon = status.icon;

					return (
						<Card
							key={order.id}
							className="p-6 hover:shadow-lg transition-all border-2 border-gray-100 hover:border-emerald-300"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex items-center gap-4">
									<div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">
										<Package className="w-7 h-7" />
									</div>
									<div>
										<h3 className="font-bold text-lg text-gray-900">
											{order.orderNumber}
										</h3>
										<p className="text-sm text-gray-600">{order.supplier}</p>
									</div>
								</div>
								<Badge className={status.color}>
									<StatusIcon className="w-3 h-3 mr-1" />
									{status.label}
								</Badge>
							</div>

							<div className="grid grid-cols-4 gap-4 mb-4">
								<div>
									<div className="text-xs text-gray-500 mb-1">Дата заказа</div>
									<div className="text-sm font-medium text-gray-900">
										{new Date(order.date).toLocaleDateString("ru-RU")}
									</div>
								</div>
								<div>
									<div className="text-xs text-gray-500 mb-1">Ожидается</div>
									<div className="text-sm font-medium text-gray-900 flex items-center gap-1">
										<Clock className="w-3 h-3 text-gray-400" />
										{new Date(order.expectedDate).toLocaleDateString("ru-RU")}
									</div>
								</div>
								<div>
									<div className="text-xs text-gray-500 mb-1">Позиций</div>
									<div className="text-sm font-medium text-gray-900">
										{order.items} шт
									</div>
								</div>
								<div>
									<div className="text-xs text-gray-500 mb-1">Сумма заказа</div>
									<div className="text-lg font-bold text-emerald-600">
										{new Intl.NumberFormat("ru-RU", {
											notation: "compact",
										}).format(order.total)}{" "}
										с
									</div>
								</div>
							</div>

							<div className="flex gap-2">
								<Button size="sm" variant="outline">
									Просмотр
								</Button>
								<Button size="sm" variant="outline">
									Печать
								</Button>
								{order.status === "in_transit" && (
									<Button
										size="sm"
										className="bg-emerald-600 text-white ml-auto"
									>
										Подтвердить получение
									</Button>
								)}
							</div>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
