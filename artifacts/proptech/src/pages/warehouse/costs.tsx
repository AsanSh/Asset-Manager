import { AlertCircle, Package, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WarehouseCosts() {
	// Mock data
	const totalValue = 12450000;
	const categories = [
		{ name: "Цемент", value: 3200000, percent: 25.7 },
		{ name: "Арматура", value: 2800000, percent: 22.5 },
		{ name: "Кирпич", value: 2100000, percent: 16.9 },
		{ name: "Песок", value: 1800000, percent: 14.5 },
		{ name: "Щебень", value: 1500000, percent: 12.0 },
		{ name: "Прочее", value: 1050000, percent: 8.4 },
	];

	const lowStock = [
		{ name: "Цемент М500", quantity: 45, unit: "т", minStock: 100 },
		{ name: "Арматура 12мм", quantity: 180, unit: "м", minStock: 500 },
		{ name: "Кирпич красный", quantity: 3500, unit: "шт", minStock: 5000 },
	];

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Стоимость запасов</h1>
				<p className="text-gray-500 mt-1">
					Анализ стоимости и оборачиваемости складских запасов
				</p>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">
							Общая стоимость
						</CardTitle>
						<Wallet className="w-4 h-4 text-emerald-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-900">
							{(totalValue / 1000000).toFixed(1)} млн с
						</div>
						<p className="text-xs text-gray-500 mt-1">По закупочным ценам</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">
							Оборачиваемость
						</CardTitle>
						<TrendingUp className="w-4 h-4 text-blue-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-900">2.8</div>
						<p className="text-xs text-gray-500 mt-1">Оборота в месяц</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">
							Позиций на складе
						</CardTitle>
						<Package className="w-4 h-4 text-blue-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-900">147</div>
						<p className="text-xs text-gray-500 mt-1">Уникальных номенклатур</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">
							Низкий остаток
						</CardTitle>
						<AlertCircle className="w-4 h-4 text-amber-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-900">
							{lowStock.length}
						</div>
						<p className="text-xs text-gray-500 mt-1">Требуется закупка</p>
					</CardContent>
				</Card>
			</div>

			{/* Category Distribution */}
			<Card>
				<CardHeader>
					<CardTitle>Распределение по категориям</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{categories.map((cat) => (
							<div key={cat.name}>
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium text-gray-700">
										{cat.name}
									</span>
									<span className="text-sm text-gray-600">
										{(cat.value / 1000).toFixed(0)} тыс с ({cat.percent}%)
									</span>
								</div>
								<div className="w-full bg-gray-200 rounded-full h-2">
									<div
										className="bg-emerald-600 h-2 rounded-full transition-all"
										style={{ width: `${cat.percent}%` }}
									/>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Low Stock Alert */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<AlertCircle className="w-5 h-5 text-amber-600" />
						Товары с низким остатком
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{lowStock.map((item) => (
							<div
								key={item.name}
								className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
							>
								<div>
									<div className="font-medium text-gray-900">{item.name}</div>
									<div className="text-sm text-gray-600">
										Остаток: {item.quantity} {item.unit} / Минимум:{" "}
										{item.minStock} {item.unit}
									</div>
								</div>
								<div className="text-sm font-medium text-amber-600">
									{Math.round((item.quantity / item.minStock) * 100)}%
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
