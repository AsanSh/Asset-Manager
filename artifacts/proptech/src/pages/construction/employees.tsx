import {
	Briefcase,
	HardHat,
	Mail,
	Phone,
	Plus,
	Search,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ConstructionEmployees() {
	const [search, setSearch] = useState("");

	// Mock data
	const employees = [
		{
			id: 1,
			firstName: "Дмитрий",
			lastName: "Соколов",
			position: "Главный инженер",
			phone: "+996 555 111 222",
			email: "sokolov@company.kg",
			status: "active",
			projects: ["ЖК Алатоо", "ТЦ Азия Молл"],
		},
		{
			id: 2,
			firstName: "Анна",
			lastName: "Павлова",
			position: "Прораб",
			phone: "+996 555 222 333",
			email: "pavlova@company.kg",
			status: "active",
			projects: ["ЖК Алатоо"],
		},
		{
			id: 3,
			firstName: "Сергей",
			lastName: "Иванов",
			position: "Архитектор",
			phone: "+996 555 333 444",
			email: "ivanov@company.kg",
			status: "active",
			projects: ["ТЦ Азия Молл", "Бизнес-центр Манас"],
		},
	];

	const filtered = employees.filter((e) =>
		search
			? `${e.firstName} ${e.lastName} ${e.position}`
					.toLowerCase()
					.includes(search.toLowerCase())
			: true,
	);

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						Сотрудники строительства
					</h1>
					<p className="text-gray-500 mt-1">Инженеры, прорабы и специалисты</p>
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
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{filtered.map((emp) => (
					<Card key={emp.id} className="hover:shadow-lg transition-shadow">
						<CardContent className="pt-6">
							<div className="flex items-start gap-4">
								<div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
									<HardHat className="w-6 h-6 text-white" />
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
								<Badge variant="default">Активен</Badge>
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
									Активные проекты ({emp.projects.length})
								</div>
								<div className="flex flex-wrap gap-1">
									{emp.projects.map((project, idx) => (
										<Badge key={idx} variant="outline" className="text-xs">
											{project}
										</Badge>
									))}
								</div>
							</div>

							<div className="mt-4 flex gap-2">
								<Button variant="outline" size="sm" className="flex-1">
									Профиль
								</Button>
								<Button variant="outline" size="sm" className="flex-1">
									Проекты
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
