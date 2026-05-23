import {
	Building2,
	Calculator,
	Calendar,
	CreditCard,
	DollarSign,
	Info,
	Percent,
	PieChart,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AreaChart } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface MortgageResult {
	monthlyPayment: number;
	totalAmount: number;
	totalInterest: number;
	overpayment: number;
}

export default function MortgageCalculator() {
	const [propertyPrice, setPropertyPrice] = useState(5000000);
	const [downPayment, setDownPayment] = useState(1000000);
	const [loanTerm, setLoanTerm] = useState(15);
	const [interestRate, setInterestRate] = useState(12);
	const [result, setResult] = useState<MortgageResult | null>(null);
	const [selectedBank, setSelectedBank] = useState("custom");

	// Банки и их программы
	const banks = [
		{ id: "optima", name: "Optima Bank", rate: 11.5, minDown: 20 },
		{ id: "rsb", name: "RSB Bank", rate: 12.0, minDown: 15 },
		{ id: "bakai", name: "Bakai Bank", rate: 13.5, minDown: 10 },
		{ id: "dos", name: "Dos-Credit Bank", rate: 14.0, minDown: 10 },
		{ id: "custom", name: "Свои параметры", rate: 12, minDown: 0 },
	];

	const loanAmount = propertyPrice - downPayment;
	const downPaymentPercent = (downPayment / propertyPrice) * 100;

	useEffect(() => {
		const bank = banks.find((b) => b.id === selectedBank);
		if (bank && selectedBank !== "custom") {
			setInterestRate(bank.rate);
		}
	}, [selectedBank, banks]);

	const calculateMortgage = () => {
		const P = loanAmount;
		const r = interestRate / 100 / 12; // месячная ставка
		const n = loanTerm * 12; // количество месяцев

		if (P <= 0 || n <= 0 || r < 0) {
			setResult(null);
			return;
		}

		// Аннуитетный платеж
		const monthlyPayment =
			r > 0 ? (P * (r * (1 + r) ** n)) / ((1 + r) ** n - 1) : P / n;

		const totalAmount = monthlyPayment * n;
		const totalInterest = totalAmount - P;
		const overpayment = (totalInterest / P) * 100;

		setResult({
			monthlyPayment,
			totalAmount,
			totalInterest,
			overpayment,
		});
	};

	useEffect(() => {
		calculateMortgage();
	}, [loanAmount, interestRate, loanTerm]);

	// График платежей для первого года
	const paymentSchedule = [];
	if (result) {
		let remainingDebt = loanAmount;
		const r = interestRate / 100 / 12;

		for (let month = 1; month <= Math.min(12, loanTerm * 12); month++) {
			const interestPayment = remainingDebt * r;
			const principalPayment = result.monthlyPayment - interestPayment;
			remainingDebt -= principalPayment;

			paymentSchedule.push({
				name: `Мес ${month}`,
				value: principalPayment,
			});
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-teal-50/20 p-6">
			<div className="container mx-auto max-w-7xl space-y-6">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-4xl font-extrabold text-gray-900 mb-3">
						Калькулятор ипотеки
					</h1>
					<p className="text-gray-600 text-lg">
						Рассчитайте ежемесячный платеж и переплату по кредиту
					</p>
				</div>

				<div className="grid lg:grid-cols-5 gap-6">
					{/* Left Panel - Input */}
					<div className="lg:col-span-2 space-y-6">
						<Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur">
							<h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
								<Calculator className="w-5 h-5 text-blue-600" />
								Параметры кредита
							</h3>

							<div className="space-y-6">
								{/* Bank Selection */}
								<div>
									<Label className="text-gray-700 font-semibold mb-2 flex items-center gap-2">
										<Building2 className="w-4 h-4" />
										Банк
									</Label>
									<Select value={selectedBank} onValueChange={setSelectedBank}>
										<SelectTrigger className="mt-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{banks.map((bank) => (
												<SelectItem key={bank.id} value={bank.id}>
													{bank.name}{" "}
													{bank.id !== "custom" && `(${bank.rate}%)`}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Property Price */}
								<div>
									<Label className="text-gray-700 font-semibold mb-2 flex items-center gap-2">
										<DollarSign className="w-4 h-4" />
										Стоимость недвижимости
									</Label>
									<Input
										type="number"
										value={propertyPrice}
										onChange={(e) => setPropertyPrice(Number(e.target.value))}
										className="mt-1 h-12 text-lg"
									/>
									<Slider
										value={[propertyPrice]}
										onValueChange={([val]) => setPropertyPrice(val)}
										min={1000000}
										max={20000000}
										step={100000}
										className="mt-3"
									/>
								</div>

								{/* Down Payment */}
								<div>
									<Label className="text-gray-700 font-semibold mb-2 flex items-center justify-between">
										<span className="flex items-center gap-2">
											<CreditCard className="w-4 h-4" />
											Первоначальный взнос
										</span>
										<Badge variant="secondary">
											{downPaymentPercent.toFixed(0)}%
										</Badge>
									</Label>
									<Input
										type="number"
										value={downPayment}
										onChange={(e) => setDownPayment(Number(e.target.value))}
										className="mt-1 h-12 text-lg"
									/>
									<Slider
										value={[downPayment]}
										onValueChange={([val]) => setDownPayment(val)}
										min={0}
										max={propertyPrice}
										step={50000}
										className="mt-3"
									/>
								</div>

								{/* Loan Term */}
								<div>
									<Label className="text-gray-700 font-semibold mb-2 flex items-center gap-2">
										<Calendar className="w-4 h-4" />
										Срок кредита (лет)
									</Label>
									<Input
										type="number"
										value={loanTerm}
										onChange={(e) => setLoanTerm(Number(e.target.value))}
										className="mt-1 h-12 text-lg"
									/>
									<Slider
										value={[loanTerm]}
										onValueChange={([val]) => setLoanTerm(val)}
										min={1}
										max={30}
										step={1}
										className="mt-3"
									/>
								</div>

								{/* Interest Rate */}
								<div>
									<Label className="text-gray-700 font-semibold mb-2 flex items-center gap-2">
										<Percent className="w-4 h-4" />
										Процентная ставка (% годовых)
									</Label>
									<Input
										type="number"
										value={interestRate}
										onChange={(e) => setInterestRate(Number(e.target.value))}
										className="mt-1 h-12 text-lg"
										disabled={selectedBank !== "custom"}
										step="0.1"
									/>
									<Slider
										value={[interestRate]}
										onValueChange={([val]) => setInterestRate(val)}
										min={5}
										max={25}
										step={0.1}
										className="mt-3"
										disabled={selectedBank !== "custom"}
									/>
								</div>
							</div>
						</Card>

						{/* Info Card */}
						<Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
							<div className="flex gap-3">
								<Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
								<div className="text-sm text-blue-900">
									<p className="font-semibold mb-1">Важно знать:</p>
									<ul className="space-y-1 text-blue-800">
										<li>• Минимальный первоначальный взнос — от 10%</li>
										<li>
											• Ставки актуальны на{" "}
											{new Date().toLocaleDateString("ru-RU")}
										</li>
										<li>• Расчет носит информационный характер</li>
									</ul>
								</div>
							</div>
						</Card>
					</div>

					{/* Right Panel - Results */}
					<div className="lg:col-span-3 space-y-6">
						{/* Key Metrics */}
						<div className="grid md:grid-cols-2 gap-6">
							<Card className="p-6 bg-gradient-to-br from-blue-500 to-purple-700 text-white shadow-xl">
								<div className="flex items-center justify-between mb-4">
									<CreditCard className="w-10 h-10 opacity-80" />
									<Badge className="bg-white/20 text-white border-0">
										Ежемесячно
									</Badge>
								</div>
								<div className="text-5xl font-bold mb-2">
									{result
										? new Intl.NumberFormat("ru-RU", {
												notation: "compact",
											}).format(result.monthlyPayment)
										: "0"}{" "}
									₸
								</div>
								<div className="text-purple-100 text-sm">Платеж в месяц</div>
							</Card>

							<Card className="p-6 bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-xl">
								<div className="flex items-center justify-between mb-4">
									<DollarSign className="w-10 h-10 opacity-80" />
									<Badge className="bg-white/20 text-white border-0">
										Сумма кредита
									</Badge>
								</div>
								<div className="text-4xl font-bold mb-2">
									{new Intl.NumberFormat("ru-RU", {
										notation: "compact",
									}).format(loanAmount)}{" "}
									₸
								</div>
								<div className="text-teal-100 text-sm">К выдаче</div>
							</Card>
						</div>

						{/* Detailed Results */}
						<Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur">
							<h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
								<PieChart className="w-5 h-5 text-blue-600" />
								Детали расчета
							</h3>

							<div className="grid md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
										<div className="text-sm text-gray-600 mb-1">
											Общая сумма выплат
										</div>
										<div className="text-2xl font-bold text-gray-900">
											{result
												? new Intl.NumberFormat("ru-RU").format(
														result.totalAmount,
													)
												: "0"}{" "}
											₸
										</div>
									</div>

									<div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
										<div className="text-sm text-gray-600 mb-1">
											Переплата по кредиту
										</div>
										<div className="text-2xl font-bold text-amber-600">
											{result
												? new Intl.NumberFormat("ru-RU").format(
														result.totalInterest,
													)
												: "0"}{" "}
											₸
										</div>
										<div className="text-xs text-gray-500 mt-1">
											{result
												? `${result.overpayment.toFixed(1)}% от суммы кредита`
												: "-"}
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
										<div className="text-sm text-gray-600 mb-1">
											Срок кредита
										</div>
										<div className="text-2xl font-bold text-blue-600">
											{loanTerm}{" "}
											{loanTerm === 1 ? "год" : loanTerm < 5 ? "года" : "лет"}
										</div>
										<div className="text-xs text-gray-500 mt-1">
											{loanTerm * 12} месяцев
										</div>
									</div>

									<div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
										<div className="text-sm text-gray-600 mb-1">
											Процентная ставка
										</div>
										<div className="text-2xl font-bold text-teal-600">
											{interestRate}% годовых
										</div>
										<div className="text-xs text-gray-500 mt-1">
											{(interestRate / 12).toFixed(2)}% в месяц
										</div>
									</div>
								</div>
							</div>
						</Card>

						{/* Payment Schedule Chart */}
						<Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur">
							<h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
								<TrendingUp className="w-5 h-5 text-blue-600" />
								График платежей (первый год)
							</h3>
							{paymentSchedule.length > 0 ? (
								<AreaChart
									data={paymentSchedule}
									color="#8b5cf6"
									height={280}
								/>
							) : (
								<div className="h-64 flex items-center justify-center text-gray-400">
									Введите параметры для расчета
								</div>
							)}
						</Card>

						{/* Additional Info */}
						<Card className="p-6 shadow-xl border-0 bg-gradient-to-r from-purple-600 to-teal-600 text-white">
							<h3 className="text-xl font-bold mb-4">
								Готовы оформить ипотеку?
							</h3>
							<p className="text-purple-100 mb-6">
								Наши специалисты помогут подобрать оптимальную программу и
								оформить кредит
							</p>
							<div className="flex gap-3">
								<button className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
									Оставить заявку
								</button>
								<button className="px-6 py-3 bg-white/20 backdrop-blur text-white rounded-lg font-semibold hover:bg-white/30 transition-colors">
									Связаться с банком
								</button>
							</div>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
