import { Building2, FileText, Mail, Phone, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ConstructionCounterparties() {
	const [search, setSearch] = useState("");

	// Mock data
	const counterparties = [
		{
			id: 1,
			name: "ОсОО ТехСтрой",
			type: "contractor",
			phone: "+996 555 123 456",
			email: "info@techstroy.kg",
			contractsCount: 8,
			totalAmount: 25000000,
			status: "active",
		},
		{
			id: 2,
			name: "ОсОО МонолитКапитал",
			type: "supplier",
			phone: "+996 555 234 567",
			email: "sales@monolit.kg",
			contractsCount: 12,
			totalAmount: 45000000,
			status: "active",
		},
		{
			id: 3,
			name: "ИП Кузнецов П.И.",
			type: "subcontractor",
			phone: "+996 555 345 678",
			email: "kuznetsov@mail.kg",
			contractsCount: 3,
			totalAmount: 5500000,
			status: "active",
		},
	];

	const filtered = counterparties.filter((c) =>
		search ? c.name.toLowerCase().includes(search.toLowerCase()) : true,
	);

	const typeLabels = {
		contractor: "Подрядчик",
		supplier: "Поставщик",
		subcontractor: "Субподрядчик",
		client: "Заказчик",
	};

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						Контрагенты строительства
					</h1>
					<p className="text-gray-500 mt-1">
						Подрядчики, поставщики и заказчики
					</p>
				</div>
				<Button className="gap-2">
					<Plus className="w-4 h-4" />
					Новый контрагент
				</Button>
			</div>

			{/* Search */}
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
								<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
									<Building2 className="w-6 h-6 text-white" />
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="font-semibold text-gray-900 truncate">
										{cp.name}
									</h3>
									<Badge variant="outline" className="mt-1">
										{typeLabels[cp.type as keyof typeof typeLabels]}
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
									<FileText className="w-4 h-4 flex-shrink-0" />
									<span>{cp.contractsCount} договоров</span>
								</div>
							</div>

							<div className="mt-4 pt-4 border-t border-gray-100">
								<div className="text-sm text-gray-600">
									Общая сумма контрактов
								</div>
								<div className="text-lg font-bold text-gray-900 mt-1">
									{(cp.totalAmount / 1000000).toFixed(1)} млн с
								</div>
							</div>

							<div className="mt-4 flex gap-2">
								<Button variant="outline" size="sm" className="flex-1">
									Подробнее
								</Button>
								<Button variant="outline" size="sm" className="flex-1">
									Договоры
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
