import {
	ArrowRight,
	Award,
	Building2,
	CheckCircle,
	Clock,
	Home,
	Mail,
	MapPin,
	Phone,
	Shield,
	Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProjectLanding() {
	const [form, setForm] = useState({
		name: "",
		phone: "",
		email: "",
		message: "",
	});

	// Mock project data
	const project = {
		name: "ЖК Горизонт",
		tagline: "Современный комфорт в сердце города",
		address: "ул. Ибраимова, 42, Бишкек",
		developer: "PropTech Development",
		status: "В строительстве",
		completionDate: "Q4 2026",
		totalUnits: 120,
		soldUnits: 78,
		priceFrom: 45000,
		priceTo: 85000,
		heroImage:
			"https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600",
		features: [
			"Закрытая территория",
			"Подземный паркинг",
			"Детская площадка",
			"Фитнес-центр",
			"Консьерж 24/7",
			"Видеонаблюдение",
		],
		units: [
			{
				id: 1,
				rooms: 1,
				area: 45,
				price: 2700000,
				floor: "2-8",
				available: 12,
			},
			{
				id: 2,
				rooms: 2,
				area: 65,
				price: 4500000,
				floor: "2-8",
				available: 24,
			},
			{
				id: 3,
				rooms: 3,
				area: 85,
				price: 6200000,
				floor: "2-8",
				available: 18,
			},
		],
		gallery: [
			"https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400",
			"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400",
			"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400",
			"https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400",
		],
	};

	const salesProgress = (project.soldUnits / project.totalUnits) * 100;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		alert("Спасибо! Мы свяжемся с вами в ближайшее время.");
	};

	return (
		<div className="min-h-screen bg-white">
			{/* Hero Section */}
			<div
				className="relative h-[600px] bg-cover bg-center"
				style={{ backgroundImage: `url(${project.heroImage})` }}
			>
				<div className="absolute inset-0 bg-gradient-to-r from-purple-900/90 via-purple-900/70 to-transparent" />
				<div className="absolute inset-0 container mx-auto px-6 flex items-center">
					<div className="max-w-2xl text-white">
						<Badge className="mb-4 bg-teal-500 text-white border-0 text-sm px-4 py-2">
							{project.status}
						</Badge>
						<h1 className="text-6xl font-extrabold mb-4 leading-tight">
							{project.name}
						</h1>
						<p className="text-2xl text-purple-100 mb-8">{project.tagline}</p>
						<div className="flex items-center gap-3 text-lg mb-8">
							<MapPin className="w-6 h-6 text-teal-400" />
							<span>{project.address}</span>
						</div>
						<div className="flex gap-4">
							<Button
								size="lg"
								className="bg-teal-500 hover:bg-teal-600 text-white h-14 px-8 text-lg shadow-xl"
							>
								Оставить заявку
								<ArrowRight className="w-5 h-5 ml-2" />
							</Button>
							<Button
								size="lg"
								variant="outline"
								className="bg-white/10 backdrop-blur border-white text-white hover:bg-white/20 h-14 px-8 text-lg"
							>
								<Phone className="w-5 h-5 mr-2" />
								Позвонить
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Stats Bar */}
			<div className="bg-gradient-to-r from-purple-600 to-teal-600 text-white py-8 shadow-xl">
				<div className="container mx-auto px-6">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
						<div>
							<div className="text-4xl font-bold mb-2">
								{project.totalUnits}
							</div>
							<div className="text-purple-100">Квартир в проекте</div>
						</div>
						<div>
							<div className="text-4xl font-bold mb-2">
								{Math.round(salesProgress)}%
							</div>
							<div className="text-purple-100">Уже продано</div>
						</div>
						<div>
							<div className="text-4xl font-bold mb-2">
								{project.priceFrom / 1000}k
							</div>
							<div className="text-purple-100">₸/м² от</div>
						</div>
						<div>
							<div className="text-4xl font-bold mb-2">
								{project.completionDate}
							</div>
							<div className="text-purple-100">Сдача</div>
						</div>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-6 py-16">
				{/* About Section */}
				<div className="mb-20">
					<h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">
						О проекте
					</h2>
					<div className="grid md:grid-cols-2 gap-12 items-center">
						<div className="space-y-6">
							<p className="text-lg text-gray-700 leading-relaxed">
								{project.name} — это современный жилой комплекс премиум-класса,
								который сочетает в себе комфорт, безопасность и инновационные
								решения.
							</p>
							<p className="text-lg text-gray-700 leading-relaxed">
								Мы создаем не просто дома, а комфортную среду для жизни, где
								каждая деталь продумана до мелочей.
							</p>
							<div className="grid grid-cols-2 gap-4 pt-4">
								{[
									{ icon: Shield, label: "Надежный застройщик" },
									{ icon: Award, label: "Премиум качество" },
									{ icon: Users, label: "Дружное комьюнити" },
									{ icon: Clock, label: "Сдача в срок" },
								].map((item, idx) => (
									<div key={idx} className="flex items-center gap-3">
										<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white shadow-md">
											<item.icon className="w-6 h-6" />
										</div>
										<span className="text-sm font-semibold text-gray-700">
											{item.label}
										</span>
									</div>
								))}
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							{project.gallery.map((img, idx) => (
								<div
									key={idx}
									className="aspect-square rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300"
								>
									<img
										src={img}
										alt=""
										className="w-full h-full object-cover"
									/>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Features */}
				<div className="mb-20">
					<h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
						Преимущества
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-6">
						{project.features.map((feature, idx) => (
							<Card
								key={idx}
								className="p-6 text-center hover:shadow-xl transition-shadow border-2 border-gray-100 hover:border-blue-300"
							>
								<CheckCircle className="w-12 h-12 mx-auto mb-4 text-teal-500" />
								<p className="font-semibold text-gray-900">{feature}</p>
							</Card>
						))}
					</div>
				</div>

				{/* Floor Plans */}
				<div className="mb-20">
					<h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
						Планировки и цены
					</h2>
					<div className="grid md:grid-cols-3 gap-8">
						{project.units.map((unit) => (
							<Card
								key={unit.id}
								className="overflow-hidden shadow-lg border-0 hover:shadow-2xl transition-all hover:scale-[1.02]"
							>
								<div className="h-3 bg-gradient-to-r from-blue-500 to-teal-500" />
								<div className="p-6">
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-2xl font-bold text-gray-900">
											{unit.rooms}-комнатная
										</h3>
										<Badge className="bg-teal-100 text-teal-700">
											{unit.available} доступно
										</Badge>
									</div>
									<div className="space-y-3 mb-6">
										<div className="flex items-center justify-between text-gray-600">
											<span className="flex items-center gap-2">
												<Home className="w-4 h-4" />
												Площадь
											</span>
											<span className="font-semibold">{unit.area} м²</span>
										</div>
										<div className="flex items-center justify-between text-gray-600">
											<span className="flex items-center gap-2">
												<Building2 className="w-4 h-4" />
												Этажи
											</span>
											<span className="font-semibold">{unit.floor}</span>
										</div>
										<div className="pt-3 border-t">
											<div className="text-3xl font-bold text-blue-600 mb-1">
												{new Intl.NumberFormat("ru-RU", {
													notation: "compact",
												}).format(unit.price)}{" "}
												₸
											</div>
											<div className="text-sm text-gray-500">
												{Math.round(unit.price / unit.area).toLocaleString(
													"ru-RU",
												)}{" "}
												₸/м²
											</div>
										</div>
									</div>
									<Button className="w-full bg-gradient-to-r from-purple-600 to-teal-600 text-white">
										Узнать подробнее
									</Button>
								</div>
							</Card>
						))}
					</div>
				</div>

				{/* Location */}
				<div className="mb-20">
					<h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
						Расположение
					</h2>
					<Card className="overflow-hidden shadow-xl border-0">
						<div className="h-96 bg-gray-200 flex items-center justify-center">
							<div className="text-center text-gray-500">
								<MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
								<p>Интеграция с картой (2GIS/Google Maps)</p>
								<p className="text-sm mt-2">{project.address}</p>
							</div>
						</div>
					</Card>
				</div>

				{/* Contact Form */}
				<div className="mb-20">
					<div className="bg-gradient-to-br from-purple-600 to-teal-600 rounded-3xl shadow-2xl overflow-hidden">
						<div className="grid md:grid-cols-2 gap-0">
							<div className="p-12 text-white">
								<h2 className="text-4xl font-bold mb-6">Оставьте заявку</h2>
								<p className="text-xl text-purple-100 mb-8">
									Наши специалисты свяжутся с вами и ответят на все вопросы
								</p>
								<div className="space-y-6">
									<div className="flex items-center gap-4">
										<div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
											<Phone className="w-7 h-7" />
										</div>
										<div>
											<div className="text-sm text-purple-100">Телефон</div>
											<div className="text-lg font-semibold">
												+996 555 123 456
											</div>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
											<Mail className="w-7 h-7" />
										</div>
										<div>
											<div className="text-sm text-purple-100">Email</div>
											<div className="text-lg font-semibold">
												info@proptech.kg
											</div>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
											<Clock className="w-7 h-7" />
										</div>
										<div>
											<div className="text-sm text-purple-100">Работаем</div>
											<div className="text-lg font-semibold">
												Пн-Сб 9:00-19:00
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="bg-white p-12">
								<form onSubmit={handleSubmit} className="space-y-4">
									<div>
										<Label htmlFor="name">Ваше имя *</Label>
										<Input
											id="name"
											value={form.name}
											onChange={(e) =>
												setForm({ ...form, name: e.target.value })
											}
											className="mt-1 h-12"
											required
										/>
									</div>
									<div>
										<Label htmlFor="phone">Телефон *</Label>
										<Input
											id="phone"
											type="tel"
											value={form.phone}
											onChange={(e) =>
												setForm({ ...form, phone: e.target.value })
											}
											className="mt-1 h-12"
											required
										/>
									</div>
									<div>
										<Label htmlFor="email">Email</Label>
										<Input
											id="email"
											type="email"
											value={form.email}
											onChange={(e) =>
												setForm({ ...form, email: e.target.value })
											}
											className="mt-1 h-12"
										/>
									</div>
									<div>
										<Label htmlFor="message">Сообщение</Label>
										<textarea
											id="message"
											value={form.message}
											onChange={(e) =>
												setForm({ ...form, message: e.target.value })
											}
											className="mt-1 w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
										/>
									</div>
									<Button
										type="submit"
										className="w-full h-12 bg-gradient-to-r from-purple-600 to-teal-600 text-white text-lg font-semibold"
									>
										Отправить заявку
									</Button>
									<p className="text-xs text-gray-500 text-center">
										Нажимая кнопку, вы соглашаетесь с политикой
										конфиденциальности
									</p>
								</form>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="bg-gray-900 text-white py-12">
				<div className="container mx-auto px-6 text-center">
					<div className="flex items-center justify-center gap-3 mb-4">
						<Building2 className="w-8 h-8" />
						<span className="text-2xl font-bold">PropTech Platform</span>
					</div>
					<p className="text-gray-400 mb-6">{project.developer}</p>
					<p className="text-sm text-gray-500">© 2026 Все права защищены</p>
				</div>
			</div>
		</div>
	);
}
