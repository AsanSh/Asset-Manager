import { Bell, Bot, CheckCircle2, Info, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const NOTIFICATION_TYPES = [
	{
		id: "task_overdue",
		label: "Задача просрочена",
		description: "Когда срок выполнения задачи вышел",
		icon: "⚠️",
	},
	{
		id: "budget_exceeded",
		label: "Превышение бюджета",
		description: "Расходы по этапу превышают план на 10%+",
		icon: "💸",
	},
	{
		id: "stage_completed",
		label: "Этап завершён",
		description: "Когда подрядчик отмечает этап выполненным",
		icon: "✅",
	},
	{
		id: "payment_due",
		label: "Платёж по графику",
		description: "Напоминание о запланированном платеже",
		icon: "🗓️",
	},
	{
		id: "material_low",
		label: "Нехватка материалов",
		description: "Остаток материала ниже минимального уровня",
		icon: "📦",
	},
];

export default function TelegramSettings() {
	const [chatId, setChatId] = useState(
		localStorage.getItem("tg_chat_id") ?? "",
	);
	const [testMessage, setTestMessage] = useState(
		"✅ Тест уведомлений Asset Manager работает корректно!",
	);
	const [sending, setSending] = useState(false);
	const [tested, setTested] = useState(false);
	const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
		try {
			return JSON.parse(localStorage.getItem("tg_notifications") ?? "{}");
		} catch {
			return {};
		}
	});

	const saveChatId = () => {
		localStorage.setItem("tg_chat_id", chatId);
		toast.success("Chat ID сохранён");
	};

	const sendTest = async () => {
		if (!chatId.trim()) {
			toast.error("Введите Telegram Chat ID");
			return;
		}
		setSending(true);
		try {
			await api.post("/ai/telegram/send", { chatId, message: testMessage });
			setTested(true);
			toast.success("Сообщение отправлено! Проверьте Telegram.");
		} catch {
			toast.error("Ошибка отправки. Проверьте Chat ID и токен бота.");
		} finally {
			setSending(false);
		}
	};

	const toggleNotification = (id: string, val: boolean) => {
		const next = { ...enabled, [id]: val };
		setEnabled(next);
		localStorage.setItem("tg_notifications", JSON.stringify(next));
	};

	const sendManual = async (type: string) => {
		if (!chatId) {
			toast.error("Сначала настройте Chat ID");
			return;
		}
		const n = NOTIFICATION_TYPES.find((t) => t.id === type);
		if (!n) return;
		await api.post("/ai/telegram/send", {
			chatId,
			message: `${n.icon} <b>Тест: ${n.label}</b>\n${n.description}`,
		});
		toast.success("Тестовое уведомление отправлено");
	};

	return (
		<div className="p-6 max-w-3xl mx-auto space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Telegram уведомления</h1>
				<p className="text-muted-foreground text-sm mt-1">
					Получайте уведомления о событиях на стройке прямо в Telegram
				</p>
			</div>

			{/* Шаг 1 — Настройка */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
							1
						</span>
						Подключение бота
					</CardTitle>
					<CardDescription>Добавьте бота и получите Chat ID</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
						<div className="flex items-start gap-2">
							<Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
								<p>
									<strong>Как получить Chat ID:</strong>
								</p>
								<ol className="list-decimal list-inside space-y-1 ml-2">
									<li>
										Напишите боту{" "}
										<code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
											@userinfobot
										</code>{" "}
										в Telegram
									</li>
									<li>Он ответит вашим Chat ID (число)</li>
									<li>Для группы — добавьте бота в группу и напишите там</li>
								</ol>
								<p className="mt-2">
									<strong>Токен бота</strong> задаётся через переменную
									окружения{" "}
									<code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
										TELEGRAM_BOT_TOKEN
									</code>{" "}
									на сервере.
								</p>
							</div>
						</div>
					</div>

					<div className="flex gap-2">
						<div className="flex-1 space-y-1">
							<Label>Telegram Chat ID</Label>
							<Input
								value={chatId}
								onChange={(e) => setChatId(e.target.value)}
								placeholder="-1001234567890 или 123456789"
							/>
						</div>
						<Button className="mt-6" variant="outline" onClick={saveChatId}>
							Сохранить
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Шаг 2 — Тест */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
							2
						</span>
						Тестовое сообщение
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Textarea
						value={testMessage}
						onChange={(e) => setTestMessage(e.target.value)}
						rows={2}
					/>
					<Button onClick={sendTest} disabled={sending}>
						{sending ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Отправляю...
							</>
						) : (
							<>
								<Send className="w-4 h-4 mr-2" />
								Отправить тест
							</>
						)}
					</Button>
					{tested && (
						<div className="flex items-center gap-2 text-green-600 text-sm">
							<CheckCircle2 className="w-4 h-4" />
							Сообщение отправлено успешно
						</div>
					)}
				</CardContent>
			</Card>

			{/* Шаг 3 — Типы уведомлений */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
							3
						</span>
						Типы уведомлений
					</CardTitle>
					<CardDescription>
						Выберите какие события присылать в Telegram
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-1">
					{NOTIFICATION_TYPES.map((type, i) => (
						<div key={type.id}>
							<div className="flex items-center justify-between py-3">
								<div className="flex items-start gap-3">
									<span className="text-xl">{type.icon}</span>
									<div>
										<p className="text-sm font-medium">{type.label}</p>
										<p className="text-xs text-muted-foreground">
											{type.description}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									{enabled[type.id] && (
										<Button
											size="sm"
											variant="ghost"
											className="h-7 text-xs"
											onClick={() => sendManual(type.id)}
										>
											<Bell className="w-3 h-3 mr-1" />
											Тест
										</Button>
									)}
									<Switch
										checked={enabled[type.id] ?? false}
										onCheckedChange={(v) => toggleNotification(type.id, v)}
									/>
								</div>
							</div>
							{i < NOTIFICATION_TYPES.length - 1 && <Separator />}
						</div>
					))}
				</CardContent>
			</Card>

			{/* Статус */}
			<Card className="border-dashed">
				<CardContent className="pt-4 flex items-center gap-3">
					<Bot className="w-8 h-8 text-muted-foreground" />
					<div>
						<p className="text-sm font-medium">Статус интеграции</p>
						<div className="flex items-center gap-2 mt-1">
							{chatId ? (
								<Badge className="bg-green-100 text-green-700">
									Chat ID настроен
								</Badge>
							) : (
								<Badge variant="secondary">Chat ID не задан</Badge>
							)}
							<Badge variant="outline">
								{Object.values(enabled).filter(Boolean).length} уведомлений
								активно
							</Badge>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
