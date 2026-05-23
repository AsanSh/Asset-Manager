import { useQuery } from "@tanstack/react-query";
import {
	CheckCircle2,
	Mail,
	MessageCircle,
	Phone,
	Send,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const TEMPLATES = [
	{
		id: "reminder",
		label: "Напоминание о платеже",
		text: "Уважаемый {name}! Напоминаем, что {date} наступает срок платежа по договору {contract} на сумму {amount} KGS. Просим произвести оплату.",
	},
	{
		id: "overdue",
		label: "Уведомление о просрочке",
		text: "Уважаемый {name}! По договору {contract} образовалась задолженность {amount} KGS. Просим погасить задолженность в ближайшее время.",
	},
	{
		id: "birthday",
		label: "Поздравление с днём рождения",
		text: "Уважаемый {name}! Поздравляем с Днём рождения! Желаем здоровья и счастья!",
	},
	{ id: "custom", label: "Своё сообщение", text: "" },
];

export default function ConstructionBroadcast() {
	const [template, setTemplate] = useState("reminder");
	const [message, setMessage] = useState(TEMPLATES[0].text);
	const [channel, setChannel] = useState("whatsapp");

	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});

	const activeContracts = contracts.filter(
		(c: any) => c.status === "signed" || c.status === "review",
	);

	const CHANNELS = [
		{
			id: "whatsapp",
			label: "WhatsApp",
			icon: MessageCircle,
			color: "text-emerald-500",
		},
		{ id: "telegram", label: "Telegram", icon: Send, color: "text-blue-500" },
		{ id: "email", label: "Email", icon: Mail, color: "text-amber-600" },
		{ id: "sms", label: "SMS", icon: Phone, color: "text-blue-500" },
	];

	const LOG = [
		{
			id: 1,
			recipient: "Иванов А.И.",
			channel: "WhatsApp",
			template: "Напоминание",
			date: "24.04.2026 09:00",
			status: "delivered",
		},
		{
			id: 2,
			recipient: "Касымов Б.С.",
			channel: "Email",
			template: "Напоминание",
			date: "23.04.2026 09:00",
			status: "delivered",
		},
		{
			id: 3,
			recipient: "Нурова Г.А.",
			channel: "WhatsApp",
			template: "Просрочка",
			date: "22.04.2026 10:00",
			status: "read",
		},
	];

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">
					Рассылка уведомлений
				</h1>
				<p className="text-gray-500 text-sm mt-0.5">
					Напоминания о платежах, уведомления о просрочках, поздравления
				</p>
			</div>

			<div className="grid grid-cols-2 gap-6">
				{/* Compose */}
				<div className="space-y-4">
					<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
						<div className="text-sm font-semibold text-gray-700 mb-4">
							Создать рассылку
						</div>

						<div className="space-y-3">
							<div>
								<Label className="text-xs">Шаблон</Label>
								<Select
									value={template}
									onValueChange={(v) => {
										setTemplate(v);
										const t = TEMPLATES.find((t) => t.id === v);
										if (t) setMessage(t.text);
									}}
								>
									<SelectTrigger className="mt-1 h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TEMPLATES.map((t) => (
											<SelectItem key={t.id} value={t.id}>
												{t.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label className="text-xs">Канал отправки</Label>
								<div className="grid grid-cols-4 gap-2 mt-1">
									{CHANNELS.map((ch) => {
										const Icon = ch.icon;
										return (
											<button
												key={ch.id}
												onClick={() => setChannel(ch.id)}
												className={`flex flex-col items-center py-2 rounded-lg border text-xs transition-all ${channel === ch.id ? "border-orange-400 bg-amber-50" : "border-gray-200 hover:border-gray-300"}`}
											>
												<Icon
													className={`w-4 h-4 mb-0.5 ${channel === ch.id ? "text-amber-600" : ch.color}`}
												/>
												{ch.label}
											</button>
										);
									})}
								</div>
							</div>

							<div>
								<Label className="text-xs">Текст сообщения</Label>
								<Textarea
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									className="mt-1 text-sm resize-none"
									rows={5}
									placeholder="Введите текст..."
								/>
								<div className="text-xs text-gray-400 mt-1">
									Переменные: {"{name}"}, {"{contract}"}, {"{date}"},{" "}
									{"{amount}"}
								</div>
							</div>

							<div>
								<Label className="text-xs">Получатели</Label>
								<div className="mt-1 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
									{activeContracts.length > 0
										? `${activeContracts.length} активных договоров: ${activeContracts
												.slice(0, 3)
												.map((c: any) => c.buyerName)
												.join(
													", ",
												)}${activeContracts.length > 3 ? ` и ещё ${activeContracts.length - 3}` : ""}`
										: "Нет активных договоров"}
								</div>
							</div>

							<Button
								className="w-full bg-amber-500 hover:bg-orange-600"
								disabled={activeContracts.length === 0}
							>
								<Send className="w-4 h-4 mr-2" />
								Отправить{" "}
								{activeContracts.length > 0
									? `(${activeContracts.length} получателей)`
									: ""}
							</Button>
						</div>
					</div>
				</div>

				{/* Log */}
				<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
					<div className="text-sm font-semibold text-gray-700 mb-4">
						Лог отправок
					</div>
					<div className="space-y-2">
						{LOG.map((log) => (
							<div
								key={log.id}
								className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50"
							>
								<CheckCircle2
									className={`w-4 h-4 flex-shrink-0 ${log.status === "read" ? "text-blue-400" : "text-emerald-400"}`}
								/>
								<div className="flex-1 min-w-0">
									<div className="font-medium text-sm text-gray-900 truncate">
										{log.recipient}
									</div>
									<div className="text-xs text-gray-400">
										{log.template} · {log.channel} · {log.date}
									</div>
								</div>
								<Badge
									variant="outline"
									className={`text-xs ${log.status === "read" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}
								>
									{log.status === "read" ? "Прочитано" : "Доставлено"}
								</Badge>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
