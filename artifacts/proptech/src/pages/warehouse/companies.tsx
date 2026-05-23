import { useQuery } from "@tanstack/react-query";
import {
	Building2,
	Mail,
	MapPin,
	Package,
	Phone,
	Plus,
	Search,
	Star,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

interface Supplier {
	id: number;
	name: string;
	contactPerson?: string;
	phone?: string;
	email?: string;
	inn?: string;
	address?: string;
	rating?: number;
	totalOrders?: number;
	totalAmount?: number;
	isActive: boolean;
}

export default function WarehouseCompanies() {
	const [search, setSearch] = useState("");

	const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
		queryKey: ["warehouse-suppliers"],
		queryFn: () => api.get("/warehouse/suppliers").then((r) => r.data),
	});

	const filteredSuppliers = suppliers.filter(
		(s) =>
			s.name.toLowerCase().includes(search.toLowerCase()) ||
			s.inn?.includes(search) ||
			s.phone?.includes(search),
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						Компании поставщиков
					</h1>
					<p className="text-gray-500 mt-1">
						Управление поставщиками и подрядчиками
					</p>
				</div>
				<Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white gap-2">
					<Plus className="w-4 h-4" />
					Добавить компанию
				</Button>
			</div>

			<div className="flex gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
					<Input
						placeholder="Поиск по названию, ИНН, телефону..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-10 h-12"
					/>
				</div>
			</div>

			{isLoading ? (
				<div className="text-center py-12 text-gray-500">Загрузка...</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredSuppliers.map((supplier) => (
						<Card
							key={supplier.id}
							className="p-6 hover:shadow-lg transition-shadow border-2 border-gray-100 hover:border-emerald-300"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">
										<Building2 className="w-6 h-6" />
									</div>
									<div>
										<h3 className="font-bold text-gray-900">{supplier.name}</h3>
										{supplier.inn && (
											<p className="text-xs text-gray-500">
												ИНН: {supplier.inn}
											</p>
										)}
									</div>
								</div>
								<Badge
									className={
										supplier.isActive
											? "bg-emerald-100 text-emerald-700"
											: "bg-gray-100 text-gray-700"
									}
								>
									{supplier.isActive ? "Активен" : "Неактивен"}
								</Badge>
							</div>

							{supplier.contactPerson && (
								<div className="text-sm text-gray-600 mb-2">
									<span className="font-medium">Контакт:</span>{" "}
									{supplier.contactPerson}
								</div>
							)}

							<div className="space-y-2 mb-4">
								{supplier.phone && (
									<div className="flex items-center gap-2 text-sm text-gray-600">
										<Phone className="w-4 h-4 text-gray-400" />
										{supplier.phone}
									</div>
								)}
								{supplier.email && (
									<div className="flex items-center gap-2 text-sm text-gray-600">
										<Mail className="w-4 h-4 text-gray-400" />
										{supplier.email}
									</div>
								)}
								{supplier.address && (
									<div className="flex items-center gap-2 text-sm text-gray-600">
										<MapPin className="w-4 h-4 text-gray-400" />
										<span className="line-clamp-1">{supplier.address}</span>
									</div>
								)}
							</div>

							<div className="grid grid-cols-2 gap-3 pt-3 border-t">
								<div className="text-center">
									<div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
										<Star className="w-4 h-4 fill-yellow-500" />
										<span className="text-sm font-semibold">
											{supplier.rating || 0}/5
										</span>
									</div>
									<div className="text-xs text-gray-500">Рейтинг</div>
								</div>
								<div className="text-center">
									<div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
										<Package className="w-4 h-4" />
										<span className="text-sm font-semibold">
											{supplier.totalOrders || 0}
										</span>
									</div>
									<div className="text-xs text-gray-500">Заказов</div>
								</div>
							</div>

							{supplier.totalAmount && supplier.totalAmount > 0 && (
								<div className="mt-3 pt-3 border-t flex items-center justify-between">
									<span className="text-xs text-gray-500">
										Всего закуплено:
									</span>
									<span className="text-sm font-bold text-emerald-600">
										{new Intl.NumberFormat("ru-RU", {
											notation: "compact",
										}).format(supplier.totalAmount)}{" "}
										с
									</span>
								</div>
							)}
						</Card>
					))}
				</div>
			)}

			{!isLoading && filteredSuppliers.length === 0 && (
				<div className="text-center py-12">
					<Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
					<p className="text-gray-500">Компании не найдены</p>
				</div>
			)}
		</div>
	);
}
