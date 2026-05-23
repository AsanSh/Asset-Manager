import {
	ArrowRight,
	CheckCircle2,
	CheckSquare,
	Clock,
	User,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MOCK_APPROVALS = [
	{
		id: 1,
		title: "Оплата подрядчику ООО «СтройПроф»",
		amount: 850000,
		currency: "KGS",
		initiator: "Марат А.",
		status: "pending",
		step: 1,
		steps: ["Прораб", "Финансовый директор", "Бухгалтер"],
		date: "2026-04-24",
	},
	{
		id: 2,
		title: "Закупка арматуры 32мм — 12 тонн",
		amount: 420000,
		currency: "KGS",
		initiator: "Нурлан К.",
		status: "approved",
		step: 2,
		steps: ["Прораб", "Финансовый директор", "Бухгалтер"],
		date: "2026-04-23",
	},
	{
		id: 3,
		title: "Аванс рабочим бригады №3",
		amount: 180000,
		currency: "KGS",
		initiator: "Аиша М.",
		status: "rejected",
		step: 0,
		steps: ["Прораб", "Финансовый директор", "Бухгалтер"],
		date: "2026-04-22",
	},
];

function fmtFull(n: any) {
	const v = parseFloat(n || "0");
	return new Intl.NumberFormat("ru-RU").format(v);
}

export default function ConstructionApprovals() {
	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Согласование платежей
					</h1>
					<p className="text-gray-500 text-sm mt-0.5">
						Маршруты согласования и статусы заявок
					</p>
				</div>
				<Button className="bg-amber-500 hover:bg-orange-600">
					<CheckSquare className="w-4 h-4 mr-2" /> Новая заявка
				</Button>
			</div>

			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">На согласовании</div>
					<div className="text-2xl font-bold text-amber-600">1</div>
				</div>
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">Согласовано</div>
					<div className="text-2xl font-bold text-emerald-500">1</div>
				</div>
				<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
					<div className="text-xs text-gray-500 mb-1">Отклонено</div>
					<div className="text-2xl font-bold text-rose-600">1</div>
				</div>
			</div>

			<div className="space-y-3">
				{MOCK_APPROVALS.map((ap) => (
					<div
						key={ap.id}
						className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
					>
						<div className="flex items-start justify-between mb-3">
							<div>
								<div className="font-medium text-gray-900">{ap.title}</div>
								<div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
									<User className="w-3 h-3" /> {ap.initiator} · {ap.date}
								</div>
							</div>
							<div className="text-right">
								<div className="font-mono font-bold text-lg">
									{fmtFull(ap.amount)}
								</div>
								<div className="text-xs text-gray-400">{ap.currency}</div>
							</div>
						</div>

						{/* Steps */}
						<div className="flex items-center gap-2 mb-3">
							{ap.steps.map((step, i) => {
								const isDone = i < ap.step;
								const isCurrent = i === ap.step && ap.status === "pending";
								const isRejected = ap.status === "rejected" && i === ap.step;
								return (
									<div key={step} className="flex items-center gap-2 flex-1">
										<div
											className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium border ${
												isRejected
													? "bg-rose-50 border-rose-200 text-rose-600"
													: isDone
														? "bg-emerald-50 border-emerald-200 text-emerald-700"
														: isCurrent
															? "bg-amber-50 border-amber-200 text-amber-700"
															: "bg-gray-50 border-gray-200 text-gray-400"
											}`}
										>
											{isDone ? (
												<CheckCircle2 className="w-3 h-3" />
											) : isRejected ? (
												<XCircle className="w-3 h-3" />
											) : (
												<Clock className="w-3 h-3" />
											)}
											{step}
										</div>
										{i < ap.steps.length - 1 && (
											<ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
										)}
									</div>
								);
							})}
						</div>

						<div className="flex items-center gap-2">
							<Badge
								variant="outline"
								className={
									ap.status === "approved"
										? "bg-emerald-100 text-emerald-700 border-emerald-200"
										: ap.status === "rejected"
											? "bg-rose-100 text-rose-700 border-rose-200"
											: "bg-amber-100 text-amber-700 border-amber-200"
								}
							>
								{ap.status === "approved"
									? "Согласовано"
									: ap.status === "rejected"
										? "Отклонено"
										: "На согласовании"}
							</Badge>
							{ap.status === "pending" && (
								<div className="flex gap-2 ml-auto">
									<Button
										size="sm"
										variant="outline"
										className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
									>
										Отклонить
									</Button>
									<Button
										size="sm"
										className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
									>
										Согласовать
									</Button>
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
