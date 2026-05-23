import { Briefcase, Mail, Phone, Plus, Search, UserCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function WarehouseEmployees() {
	const [search, setSearch] = useState("");

	// Mock data
	const employees = [
		{
			id: 1,
			firstName: "Алексей",
			lastName: "Петров",
			position: "Заведующий складом",
			phone: "+996 555 111 222",
			email: "petrov@company.kg",
			status: "active",
			accessLevel: "full",
		},
		{
			id: 2,
			firstName: "Мария",
			lastName: "Сидорова",
			position: "Кладовщик",
			phone: "+996 555 222 333",
			email: "sidorova@company.kg",
			status: "active",
			accessLevel: "limited",
		},
		{
			id: 3,
			firstName: "Игорь",
			lastName: "Смирнов",
			position: "Грузчик",
			phone: "+996 555 333 444",
			email: "smirnov@company.kg",
			status: "active",
			accessLevel: "view_only",
		},
		{
			id: 4,
			firstName: "Елена",
			lastName: "Кузнецова",
			position: "Кладовщик",
			phone: "+996 555 444 555",
			email: "kuznetsova@company.kg",
			status: "inactive",
			accessLevel: "limited",
		},
	];

	const filtered = employees.filter((e) =>
		search
			? `${e.firstName} ${e.lastName} ${e.position}`
					.toLowerCase()
					.includes(search.toLowerCase())
			: true,
	);

	const accessLevelLabels = {
		full: "Полный доступ",
		limited: "Ограниченный",
		view_only: "Только просмотр",
	};

	const accessLevelColors = {
		full: "bg-emerald-100 text-emerald-700",
		limited: "bg-blue-100 text-blue-700",
		view_only: "bg-gray-100 text-gray-700",
	};

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						Сотрудники склада
					</h1>
					<p className="text-gray-500 mt-1">Управление персоналом и доступом</p>
				</div>
				<Button className="gap-2">
					<Plus className="w-4 h-4" />
					Новый сотрудник
				</Button>
			</div>

			{/* Search */}
			<Card>
				<CardContent className="pt-6">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<Input
							placeholder="Поиск по имени, должности..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-10"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Employees List */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{filtered.map((emp) => (
					<Card key={emp.id} className="hover:shadow-lg transition-shadow">
						<CardContent className="pt-6">
							<div className="flex items-start gap-4">
								<div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
									<UserCircle className="w-7 h-7 text-white" />
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="font-semibold text-gray-900">
										{emp.firstName} {emp.lastName}
									</h3>
									<div className="flex items-center gap-2 mt-1">
										<Briefcase className="w-3.5 h-3.5 text-gray-400" />
										<span className="text-sm text-gray-600">
											{emp.position}
										</span>
									</div>
								</div>
								<Badge
									variant={emp.status === "active" ? "default" : "secondary"}
								>
									{emp.status === "active" ? "Активен" : "Неактивен"}
								</Badge>
							</div>

							<div className="mt-4 space-y-2">
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<Phone className="w-4 h-4 flex-shrink-0" />
									<span>{emp.phone}</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<Mail className="w-4 h-4 flex-shrink-0" />
									<span className="truncate">{emp.email}</span>
								</div>
							</div>

							<div className="mt-4 pt-4 border-t border-gray-100">
								<div className="text-xs text-gray-500 mb-2">
									Уровень доступа
								</div>
								<Badge
									className={
										accessLevelColors[
											emp.accessLevel as keyof typeof accessLevelColors
										]
									}
								>
									{
										accessLevelLabels[
											emp.accessLevel as keyof typeof accessLevelLabels
										]
									}
								</Badge>
							</div>

							<div className="mt-4 flex gap-2">
								<Button variant="outline" size="sm" className="flex-1">
									Редактировать
								</Button>
								<Button variant="outline" size="sm" className="flex-1">
									Права доступа
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
						<UserCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							Сотрудники не найдены
						</h3>
						<p className="text-gray-500">
							Попробуйте изменить параметры поиска
						</p>
					</CardContent>
				</Card>
			)}

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card>
					<CardContent className="pt-6">
						<div className="text-sm text-gray-600">Всего сотрудников</div>
						<div className="text-3xl font-bold text-gray-900 mt-2">
							{employees.length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="text-sm text-gray-600">Активных</div>
						<div className="text-3xl font-bold text-emerald-600 mt-2">
							{employees.filter((e) => e.status === "active").length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="text-sm text-gray-600">С полным доступом</div>
						<div className="text-3xl font-bold text-blue-600 mt-2">
							{employees.filter((e) => e.accessLevel === "full").length}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
