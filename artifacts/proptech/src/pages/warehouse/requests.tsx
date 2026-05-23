import {
	Building2,
	CheckCircle,
	Clock,
	FileText,
	Plus,
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

// Mock data
const mockRequests = [
	{
		id: 1,
		requestNumber: "ЗАЯ-2026-001",
		project: "ЖК Горизонт",
		requestedBy: "Иванов А.И.",
		date: "2026-05-04",
		neededDate: "2026-05-06",
		status: "pending",
		priority: "urgent",
		items: 8,
	},
	{
		id: 2,
		requestNumber: "ЗАЯ-2026-002",
		project: "ЖК Восток",
		requestedBy: "Петров С.Д.",
		date: "2026-05-03",
		neededDate: "2026-05-10",
		status: "approved",
		priority: "normal",
		items: 5,
	},
	{
		id: 3,
		requestNumber: "ЗАЯ-2026-003",
		project: "ЖК Горизонт",
		requestedBy: "Иванов А.И.",
		date: "2026-05-02",
		neededDate: "2026-05-08",
		status: "fulfilled",
		priority: "normal",
		items: 3,
	},
	{
		id: 4,
		requestNumber: "ЗАЯ-2026-004",
		project: "Офисный центр А",
		requestedBy: "Сидоров К.М.",
		date: "2026-05-01",
		neededDate: "2026-05-05",
		status: "rejected",
		priority: "low",
		items: 2,
	},
];

const statusConfig = {
	pending: {
		label: "Ожидает",
		color: "bg-amber-100 text-amber-700",
		icon: Clock,
	},
	approved: {
		label: "Одобрена",
		color: "bg-blue-100 text-blue-700",
		icon: CheckCircle,
	},
	rejected: {
		label: "Отклонена",
		color: "bg-rose-100 text-rose-700",
		icon: XCircle,
	},
	fulfilled: {
		label: "Выполнена",
		color: "bg-emerald-100 text-emerald-700",
		icon: CheckCircle,
	},
	cancelled: {
		label: "Отменена",
		color: "bg-gray-100 text-gray-700",
		icon: XCircle,
	},
};

const priorityConfig = {
	low: { label: "Низкий", color: "bg-gray-100 text-gray-700" },
	normal: { label: "Обычный", color: "bg-blue-100 text-blue-700" },
	high: { label: "Высокий", color: "bg-amber-100 text-amber-700" },
	urgent: { label: "Срочно", color: "bg-rose-100 text-rose-700" },
};

export default function WarehouseRequests() {
	const [statusFilter, setStatusFilter] = useState("all");

	const filteredRequests =
		statusFilter === "all"
			? mockRequests
			: mockRequests.filter((r) => r.status === statusFilter);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						Заявки от прорабов
					</h1>
					<p className="text-gray-500 mt-1">
						Заявки на материалы от строительных объектов
					</p>
				</div>
				<Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white gap-2">
					<Plus className="w-4 h-4" />
					Новая заявка
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				{[
					{
						label: "Ожидают",
						count: mockRequests.filter((r) => r.status === "pending").length,
						color: "from-yellow-500 to-yellow-600",
					},
					{
						label: "Одобрено",
						count: mockRequests.filter((r) => r.status === "approved").length,
						color: "from-blue-500 to-blue-600",
					},
					{
						label: "Выполнено",
						count: mockRequests.filter((r) => r.status === "fulfilled").length,
						color: "from-green-500 to-green-600",
					},
					{
						label: "Отклонено",
						count: mockRequests.filter((r) => r.status === "rejected").length,
						color: "from-red-500 to-red-600",
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

			{/* Requests List */}
			<div className="space-y-4">
				{filteredRequests.map((request) => {
					const status =
						statusConfig[request.status as keyof typeof statusConfig];
					const priority =
						priorityConfig[request.priority as keyof typeof priorityConfig];
					const StatusIcon = status.icon;

					return (
						<Card
							key={request.id}
							className="p-6 hover:shadow-lg transition-all border-2 border-gray-100 hover:border-emerald-300"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex items-center gap-4">
									<div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">
										<FileText className="w-7 h-7" />
									</div>
									<div>
										<h3 className="font-bold text-lg text-gray-900">
											{request.requestNumber}
										</h3>
										<div className="flex items-center gap-2 text-sm text-gray-600">
											<Building2 className="w-4 h-4" />
											{request.project}
										</div>
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

							<div className="grid grid-cols-4 gap-4 mb-4">
								<div>
									<div className="text-xs text-gray-500 mb-1">Прораб</div>
									<div className="text-sm font-medium text-gray-900">
										{request.requestedBy}
									</div>
								</div>
								<div>
									<div className="text-xs text-gray-500 mb-1">Дата заявки</div>
									<div className="text-sm font-medium text-gray-900">
										{new Date(request.date).toLocaleDateString("ru-RU")}
									</div>
								</div>
								<div>
									<div className="text-xs text-gray-500 mb-1">Нужно к</div>
									<div className="text-sm font-medium text-gray-900 flex items-center gap-1">
										<Clock className="w-3 h-3 text-gray-400" />
										{new Date(request.neededDate).toLocaleDateString("ru-RU")}
									</div>
								</div>
								<div>
									<div className="text-xs text-gray-500 mb-1">Позиций</div>
									<div className="text-sm font-medium text-gray-900">
										{request.items} шт
									</div>
								</div>
							</div>

							<div className="flex gap-2">
								<Button size="sm" variant="outline">
									Просмотр
								</Button>
								{request.status === "pending" && (
									<>
										<Button size="sm" className="bg-emerald-600 text-white">
											Одобрить
										</Button>
										<Button size="sm" variant="destructive">
											Отклонить
										</Button>
									</>
								)}
								{request.status === "approved" && (
									<Button size="sm" className="bg-blue-600 text-white ml-auto">
										Выдать материалы
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
