
import {
	Building2,
	Calendar,
	CheckCircle,
	Clock,
	CreditCard,
	Download,
	FileText,
	Home,
	LogOut,
	Mail,
	Phone,
} from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientDashboard() {
	const [, setLocation] = useLocation();

	const handleLogout = () => {
		localStorage.removeItem("client_token");
		localStorage.removeItem("client_id");
		setLocation("/portal/client/login");
	};

	// Mock data (в реальном приложении из API)
	const clientData = {
		name: "Иван Петров",
		phone: "+996 555 123 456",
		email: "ivan@example.com",
		units: [
			{
				id: 1,
				project: "ЖК Горизонт",
				unitNumber: "A-205",
				floor: 2,
				area: 65.5,
				rooms: 2,
				totalPrice: 4500000,
				paidAmount: 2700000,
				status: "reserved",
				paymentSchedule: [
					{ date: "2026-01-15", amount: 900000, paid: true },
					{ date: "2026-02-15", amount: 900000, paid: true },
					{ date: "2026-03-15", amount: 900000, paid: true },
					{ date: "2026-04-15", amount: 900000, paid: false },
					{ date: "2026-05-15", amount: 900000, paid: false },
				],
			},
		],
		documents: [
			{
				id: 1,
				name: "Договор купли-продажи",
				date: "2026-01-10",
				size: "2.4 MB",
				type: "pdf",
			},
			{
				id: 2,
				name: "График платежей",
				date: "2026-01-10",
				size: "145 KB",
				type: "xlsx",
			},
			{
				id: 3,
				name: "План квартиры",
				date: "2026-01-05",
				size: "890 KB",
				type: "pdf",
			},
		],
	};

	const unit = clientData.units[0];
	const paymentProgress = (unit.paidAmount / unit.totalPrice) * 100;
	const nextPayment = unit.paymentSchedule.find((p) => !p.paid);

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-teal-50/20">
			{/* Header */}
			<div className="bg-gradient-to-r from-purple-600 to-teal-600 text-white shadow-xl">
				<div className="container mx-auto px-6 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center shadow-lg">
								<Building2 className="w-8 h-8" />
							</div>
							<div>
								<h1 className="text-3xl font-bold">Личный кабинет</h1>
								<p className="text-purple-100 mt-1">{clientData.name}</p>
							</div>
						</div>
						<Button
							variant="ghost"
							onClick={handleLogout}
							className="text-white hover:bg-white/10 gap-2"
						>
							<LogOut className="w-4 h-4" />
							Выход
						</Button>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-6 py-8 space-y-6">
				{/* Quick Info Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<Card className="p-6 bg-gradient-to-br from-blue-500 to-purple-700 text-white shadow-lg">
						<div className="flex items-center justify-between mb-4">
							<Home className="w-10 h-10 opacity-80" />
							<Badge className="bg-white/20 text-white border-0">
								Забронирован
							</Badge>
						</div>
						<div className="text-4xl font-bold mb-2">{unit.unitNumber}</div>
						<div className="text-purple-100 text-sm">{unit.project}</div>
						<div className="mt-3 text-sm opacity-90">
							{unit.rooms}-комнатная • {unit.area} м² • {unit.floor} этаж
						</div>
					</Card>

					<Card className="p-6 bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg">
						<div className="flex items-center justify-between mb-4">
							<CreditCard className="w-10 h-10 opacity-80" />
							<Badge className="bg-white/20 text-white border-0">
								{Math.round(paymentProgress)}%
							</Badge>
						</div>
						<div className="text-3xl font-bold mb-2">
							{new Intl.NumberFormat("ru-RU", { notation: "compact" }).format(
								unit.paidAmount,
							)}{" "}
							₸
						</div>
						<div className="text-teal-100 text-sm mb-3">
							Оплачено из{" "}
							{new Intl.NumberFormat("ru-RU", { notation: "compact" }).format(
								unit.totalPrice,
							)}{" "}
							₸
						</div>
						<div className="w-full bg-white/20 rounded-full h-2">
							<div
								className="bg-white h-full rounded-full transition-all"
								style={{ width: `${paymentProgress}%` }}
							/>
						</div>
					</Card>

					<Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-lg">
						<div className="flex items-center justify-between mb-4">
							<Calendar className="w-10 h-10 opacity-80" />
							<Badge className="bg-white/20 text-white border-0">
								Следующий
							</Badge>
						</div>
						<div className="text-3xl font-bold mb-2">
							{nextPayment
								? new Intl.NumberFormat("ru-RU", {
										notation: "compact",
									}).format(nextPayment.amount)
								: "0"}{" "}
							₸
						</div>
						<div className="text-orange-100 text-sm mb-1">Платеж до</div>
						<div className="text-xl font-semibold">
							{nextPayment
								? new Date(nextPayment.date).toLocaleDateString("ru-RU", {
										day: "numeric",
										month: "long",
									})
								: "-"}
						</div>
					</Card>
				</div>

				{/* Tabs */}
				<Tabs defaultValue="payments" className="space-y-6">
					<TabsList className="grid w-full grid-cols-3 h-14">
						<TabsTrigger value="payments" className="text-base">
							<CreditCard className="w-4 h-4 mr-2" />
							Платежи
						</TabsTrigger>
						<TabsTrigger value="unit" className="text-base">
							<Home className="w-4 h-4 mr-2" />
							Квартира
						</TabsTrigger>
						<TabsTrigger value="documents" className="text-base">
							<FileText className="w-4 h-4 mr-2" />
							Документы
						</TabsTrigger>
					</TabsList>

					{/* Payments Tab */}
					<TabsContent value="payments">
						<Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur">
							<h3 className="text-xl font-bold text-gray-900 mb-6">
								График платежей
							</h3>
							<div className="space-y-3">
								{unit.paymentSchedule.map((payment, index) => (
									<div
										key={index}
										className={`p-5 rounded-xl border-2 transition-all ${
											payment.paid
												? "border-emerald-200 bg-emerald-50/50"
												: "border-gray-200 bg-white hover:border-blue-300"
										}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-4">
												<div
													className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
														payment.paid
															? "bg-gradient-to-br from-green-500 to-green-600 text-white"
															: "bg-gradient-to-br from-gray-400 to-gray-500 text-white"
													}`}
												>
													{payment.paid ? (
														<CheckCircle className="w-6 h-6" />
													) : (
														<Clock className="w-6 h-6" />
													)}
												</div>
												<div>
													<div className="font-semibold text-gray-900">
														Платеж #{index + 1}
													</div>
													<div className="text-sm text-gray-500">
														{new Date(payment.date).toLocaleDateString(
															"ru-RU",
															{
																day: "numeric",
																month: "long",
																year: "numeric",
															},
														)}
													</div>
												</div>
											</div>
											<div className="text-right">
												<div className="text-2xl font-bold text-gray-900">
													{new Intl.NumberFormat("ru-RU").format(
														payment.amount,
													)}{" "}
													₸
												</div>
												{payment.paid ? (
													<Badge className="mt-1 bg-emerald-100 text-emerald-700">
														Оплачено
													</Badge>
												) : (
													<Badge className="mt-1 bg-gray-100 text-gray-700">
														Ожидается
													</Badge>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						</Card>
					</TabsContent>

					{/* Unit Tab */}
					<TabsContent value="unit">
						<Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur">
							<h3 className="text-xl font-bold text-gray-900 mb-6">
								Информация о квартире
							</h3>
							<div className="grid grid-cols-2 gap-6">
								<div>
									<div className="space-y-4">
										<div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
											<div className="text-sm text-gray-600 mb-1">Проект</div>
											<div className="text-lg font-semibold text-gray-900">
												{unit.project}
											</div>
										</div>
										<div className="p-4 rounded-lg bg-teal-50 border border-teal-200">
											<div className="text-sm text-gray-600 mb-1">
												Номер квартиры
											</div>
											<div className="text-lg font-semibold text-gray-900">
												{unit.unitNumber}
											</div>
										</div>
										<div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
											<div className="text-sm text-gray-600 mb-1">Площадь</div>
											<div className="text-lg font-semibold text-gray-900">
												{unit.area} м²
											</div>
										</div>
									</div>
								</div>
								<div>
									<div className="space-y-4">
										<div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
											<div className="text-sm text-gray-600 mb-1">Этаж</div>
											<div className="text-lg font-semibold text-gray-900">
												{unit.floor}
											</div>
										</div>
										<div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
											<div className="text-sm text-gray-600 mb-1">Комнат</div>
											<div className="text-lg font-semibold text-gray-900">
												{unit.rooms}
											</div>
										</div>
										<div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
											<div className="text-sm text-gray-600 mb-1">Статус</div>
											<Badge className="bg-blue-600 text-white">
												Забронирован
											</Badge>
										</div>
									</div>
								</div>
							</div>
						</Card>
					</TabsContent>

					{/* Documents Tab */}
					<TabsContent value="documents">
						<Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur">
							<h3 className="text-xl font-bold text-gray-900 mb-6">
								Документы
							</h3>
							<div className="space-y-3">
								{clientData.documents.map((doc) => (
									<div
										key={doc.id}
										className="p-5 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all bg-white hover:shadow-md"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-4">
												<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white shadow-md">
													<FileText className="w-6 h-6" />
												</div>
												<div>
													<div className="font-semibold text-gray-900">
														{doc.name}
													</div>
													<div className="text-sm text-gray-500">
														{new Date(doc.date).toLocaleDateString("ru-RU")} •{" "}
														{doc.size}
													</div>
												</div>
											</div>
											<Button className="bg-gradient-to-r from-purple-600 to-teal-600 text-white gap-2">
												<Download className="w-4 h-4" />
												Скачать
											</Button>
										</div>
									</div>
								))}
							</div>
						</Card>
					</TabsContent>
				</Tabs>

				{/* Contact Card */}
				<Card className="p-6 shadow-lg border-0 bg-gradient-to-r from-purple-600 to-teal-600 text-white">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-xl font-bold mb-2">Нужна помощь?</h3>
							<p className="text-purple-100 mb-4">
								Свяжитесь с нашим отделом поддержки
							</p>
							<div className="flex gap-4">
								<Button variant="secondary" className="gap-2">
									<Phone className="w-4 h-4" />
									+996 555 123 456
								</Button>
								<Button variant="secondary" className="gap-2">
									<Mail className="w-4 h-4" />
									support@proptech.kg
								</Button>
							</div>
						</div>
					</div>
				</Card>
			</div>
		</div>
	);
}
