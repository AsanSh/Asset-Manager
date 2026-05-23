import { Building2, Mail, Phone, Plus, Search, Star } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function WarehouseCounterparties() {
	const [search, setSearch] = useState("");

	// Mock data
	const counterparties = [
		{
			id: 1,
			name: "ОсОО СтройМаркет",
			type: "supplier",
			phone: "+996 555 123 456",
			email: "info@stroymarket.kg",
			rating: 4.8,
			ordersCount: 45,
			totalAmount: 12500000,
		},
		{
			id: 2,
			name: "ОсОО БишкекСтрой",
			type: "supplier",
			phone: "+996 555 234 567",
			email: "sales@bishkekstroy.kg",
			rating: 4.5,
			ordersCount: 32,
			totalAmount: 8900000,
		},
		{
			id: 3,
			name: "ИП Иванов С.П.",
			type: "supplier",
			phone: "+996 555 345 678",
			email: "ivanov@mail.kg",
			rating: 4.2,
			ordersCount: 18,
			totalAmount: 3200000,
		},
	];

	const filtered = counterparties.filter((c) =>
		search ? c.name.toLowerCase().includes(search.toLowerCase()) : true,
	);

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						Контрагенты склада
					</h1>
					<p className="text-gray-500 mt-1">Поставщики и партнёры</p>
				</div>
				<Button className="gap-2">
					<Plus className="w-4 h-4" />
					Новый контрагент
				</Button>
			</div>

			{/* Search & Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<Input
							placeholder="Поиск по названию, телефону, email..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-10"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Counterparties List */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{filtered.map((cp) => (
					<Card key={cp.id} className="hover:shadow-lg transition-shadow">
						<CardContent className="pt-6">
							<div className="flex items-start gap-4">
								<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
									<Building2 className="w-6 h-6 text-white" />
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="font-semibold text-gray-900 truncate">
										{cp.name}
									</h3>
									<Badge variant="outline" className="mt-1">
										Поставщик
									</Badge>
								</div>
							</div>

							<div className="mt-4 space-y-2">
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<Phone className="w-4 h-4 flex-shrink-0" />
									<span className="truncate">{cp.phone}</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<Mail className="w-4 h-4 flex-shrink-0" />
									<span className="truncate">{cp.email}</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<Star className="w-4 h-4 text-amber-600 fill-yellow-500 flex-shrink-0" />
									<span>
										{cp.rating}/5 ({cp.ordersCount} заказов)
									</span>
								</div>
							</div>

							<div className="mt-4 pt-4 border-t border-gray-100">
								<div className="text-sm text-gray-600">Общая сумма закупок</div>
								<div className="text-lg font-bold text-gray-900 mt-1">
									{(cp.totalAmount / 1000000).toFixed(1)} млн с
								</div>
							</div>

							<div className="mt-4 flex gap-2">
								<Button variant="outline" size="sm" className="flex-1">
									Подробнее
								</Button>
								<Button variant="outline" size="sm" className="flex-1">
									История
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Empty State */}
			{filtered.length === 0 && (
				<Card>
					<CardContent className="py-12 text-center">
						<Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							Контрагенты не найдены
						</h3>
						<p className="text-gray-500">
							Попробуйте изменить параметры поиска
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
