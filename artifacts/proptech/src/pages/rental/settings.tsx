import {
	Bell,
	ChevronRight,
	ClipboardCheck,
	CreditCard,
	Download,
	FileBarChart,
	FilePlus2,
	FileSignature,
	FileText,
	Info,
	Mail,
	MessageCircle,
	Phone,
	Plus,
	Receipt,
	Save,
	Settings,
	XCircle,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const tabs = [
	{ id: "general", label: "Общие", icon: Settings },
	{ id: "billing", label: "Начисления", icon: CreditCard },
	{ id: "notifications", label: "Уведомления", icon: Bell },
	{ id: "documents", label: "Документы", icon: FileText },
];

const TAX_REGIMES = [
	{
		id: "general",
		label: "Общий налоговый режим",
		description: "НДС + НсП",
		taxes: [
			{ name: "НДС (налог на добавленную стоимость)", rate: "12%" },
			{ name: "НсП (налог с продаж)", rate: "2%" },
		],
	},
	{
		id: "single_cash",
		label: "Единый налог — Наличные",
		description: "Оплата наличными",
		taxes: [{ name: "Единый налог (наличные расчёты)", rate: "6%" }],
	},
	{
		id: "single_bank",
		label: "Единый налог — Безналичные",
		description: "Оплата через банк",
		taxes: [{ name: "Единый налог (безналичные расчёты)", rate: "4%" }],
	},
];

const DOC_TEMPLATES: {
	id: string;
	Icon: React.ElementType;
	color: string;
	label: string;
	desc: string;
}[] = [
	{
		id: "lease",
		Icon: FileSignature,
		color: "text-blue-600 bg-blue-50",
		label: "Договор аренды",
		desc: "Стандартный договор аренды помещения",
	},
	{
		id: "act_handover",
		Icon: ClipboardCheck,
		color: "text-emerald-600 bg-emerald-50",
		label: "Акт приёма-передачи",
		desc: "Приём-передача объекта арендатору",
	},
	{
		id: "invoice",
		Icon: Receipt,
		color: "text-amber-600 bg-amber-50",
		label: "Счёт на оплату",
		desc: "Счёт за аренду с реквизитами",
	},
	{
		id: "reconciliation",
		Icon: FileBarChart,
		color: "text-blue-600 bg-blue-50",
		label: "Акт сверки расчётов",
		desc: "Сводный акт по начислениям и платежам",
	},
	{
		id: "termination",
		Icon: XCircle,
		color: "text-rose-600 bg-rose-50",
		label: "Соглашение о расторжении",
		desc: "Досрочное расторжение договора аренды",
	},
	{
		id: "addendum",
		Icon: FilePlus2,
		color: "text-indigo-600 bg-indigo-50",
		label: "Доп. соглашение",
		desc: "Изменение условий действующего договора",
	},
];

const CHANNEL_INFO: Record<
	string,
	{
		icon: React.ElementType;
		color: string;
		requirements: string[];
		note: string;
	}
> = {
	sms: {
		icon: Phone,
		color: "text-emerald-600",
		requirements: [
			"API-ключ SMS-провайдера (МегаКом, О!, Beeline KG)",
			"Зарегистрированное имя отправителя (Sender ID)",
			"Номер телефона арендатора в формате +996...",
		],
		note: "Рекомендуем SMSC.kg или InfoSMS для Кыргызстана.",
	},
	whatsapp: {
		icon: MessageCircle,
		color: "text-emerald-600",
		requirements: [
			"WhatsApp Business API аккаунт",
			"Зарегистрированный номер телефона бизнеса",
			"Шаблоны сообщений одобренные Meta",
		],
		note: "Доступно через официальных партнёров Meta в KG.",
	},
	email: {
		icon: Mail,
		color: "text-blue-600",
		requirements: [
			"SMTP-сервер или Email API (SendGrid, Mailgun)",
			"Email отправителя в домене .kg (например info@vashcompany.kg)",
			"Верифицированный домен для повышения доставляемости",
		],
		note: "Рекомендуем домен @kg.com или .kg для Кыргызстана.",
	},
	all: {
		icon: Bell,
		color: "text-blue-600",
		requirements: ["Настройки для всех трёх каналов: SMS, WhatsApp, Email"],
		note: "Уведомление отправляется по всем доступным каналам.",
	},
};

function DocsTab() {
	const { toast } = useToast();
	const [addOpen, setAddOpen] = useState(false);
	const [customTemplates, setCustomTemplates] = useState<
		{
			id: string;
			Icon: React.ElementType;
			color: string;
			label: string;
			desc: string;
		}[]
	>([]);
	const [newDoc, setNewDoc] = useState({ label: "", desc: "" });

	function addTemplate() {
		if (!newDoc.label.trim()) {
			toast({ title: "Введите название шаблона", variant: "destructive" });
			return;
		}
		setCustomTemplates((prev) => [
			...prev,
			{
				id: `custom_${Date.now()}`,
				Icon: FileText,
				color: "text-gray-600 bg-gray-50",
				label: newDoc.label,
				desc: newDoc.desc,
			},
		]);
		setNewDoc({ label: "", desc: "" });
		setAddOpen(false);
		toast({ title: "Шаблон добавлен", description: newDoc.label });
	}

	const allDocs = [...DOC_TEMPLATES, ...customTemplates];

	return (
		<>
			<div className="flex items-center justify-between mb-1">
				<div>
					<p className="text-sm font-semibold text-gray-800">
						Шаблоны документов
					</p>
					<p className="text-xs text-gray-400">
						Стандартные документы для Кыргызской Республики
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setAddOpen(true)}
					className="gap-1.5 text-xs"
				>
					<Plus className="w-3.5 h-3.5" /> Добавить шаблон
				</Button>
			</div>
			<div className="space-y-2">
				{allDocs.map((doc) => {
					const Icon = doc.Icon;
					return (
						<div
							key={doc.id}
							className="flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors group cursor-pointer"
						>
							<div
								className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.color}`}
							>
								<Icon className="w-4.5 h-4.5" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-gray-900">{doc.label}</p>
								<p className="text-xs text-gray-400">{doc.desc}</p>
							</div>
							<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
									<Download className="w-3 h-3" /> Скачать
								</Button>
							</div>
						</div>
					);
				})}
			</div>
			<div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 p-3">
				<div className="flex items-start gap-2">
					<Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
					<p className="text-xs text-blue-700">
						Шаблоны соответствуют законодательству Кыргызской Республики. Для
						кастомизации шаблонов обратитесь к администратору.
					</p>
				</div>
			</div>

			<Dialog open={addOpen} onOpenChange={setAddOpen}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FilePlus2 className="w-4 h-4 text-blue-600" /> Добавить шаблон
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-3 py-1">
						<div>
							<Label className="text-sm font-medium">Название шаблона *</Label>
							<Input
								className="mt-1.5"
								placeholder="Акт возврата помещения"
								value={newDoc.label}
								onChange={(e) =>
									setNewDoc((d) => ({ ...d, label: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label className="text-sm font-medium">Описание</Label>
							<Input
								className="mt-1.5"
								placeholder="Краткое описание"
								value={newDoc.desc}
								onChange={(e) =>
									setNewDoc((d) => ({ ...d, desc: e.target.value }))
								}
							/>
						</div>
						<div className="flex gap-2 pt-1">
							<Button onClick={addTemplate} className="flex-1">
								Добавить
							</Button>
							<Button variant="outline" onClick={() => setAddOpen(false)}>
								Отмена
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

export default function RentalSettings() {
	const { user } = useAuth();
	const { toast } = useToast();
	const [tab, setTab] = useState("general");
	const [general, setGeneral] = useState({
		companyName: "",
		currency: "KGS",
		timezone: "Asia/Bishkek",
		lateFeePercent: "0.1",
		lateFeeGraceDays: "3",
		taxRegime: "general",
	});
	const [billing, setBilling] = useState({
		accrualDay: "1",
		dueDays: "5",
		autoAccrual: "true",
		roundUp: "true",
	});
	const [notif, setNotif] = useState({
		overdueReminder: "3",
		upcomingReminder: "5",
		channel: "email",
	});

	useEffect(() => {
		const companyName = (user as any)?.company?.name || "";
		if (companyName) {
			setGeneral((g) => ({ ...g, companyName }));
		}
	}, [user]);

	function save() {
		toast({
			title: "Настройки сохранены",
			description: "Изменения применены к модулю аренды",
		});
	}

	const selectedRegime = TAX_REGIMES.find((r) => r.id === general.taxRegime);
	const channelInfo = CHANNEL_INFO[notif.channel];
	const ChannelIcon = channelInfo?.icon;

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">
					Настройки модуля аренды
				</h1>
				<p className="text-gray-500 text-sm mt-0.5">
					Конфигурация правил и параметров
				</p>
			</div>

			<div className="flex gap-1 mb-6 border-b">
				{tabs.map((t) => {
					const Icon = t.icon;
					return (
						<button
							key={t.id}
							onClick={() => setTab(t.id)}
							className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
								tab === t.id
									? "border-blue-600 text-blue-700"
									: "border-transparent text-gray-500 hover:text-gray-700"
							}`}
						>
							<Icon className="w-4 h-4" /> {t.label}
						</button>
					);
				})}
			</div>

			<div className="bg-white border rounded-xl p-6 max-w-2xl space-y-5">
				{/* ── GENERAL ── */}
				{tab === "general" && (
					<>
						<div>
							<Label className="text-sm font-medium">Название компании</Label>
							<Input
								className="mt-1.5"
								value={general.companyName}
								onChange={(e) =>
									setGeneral((f) => ({ ...f, companyName: e.target.value }))
								}
								placeholder="ОсОО Ваша Компания"
							/>
							<p className="text-xs text-gray-400 mt-1">
								Отображается в документах и актах сверки
							</p>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label className="text-sm font-medium">Валюта</Label>
								<Select
									value={general.currency}
									onValueChange={(v) =>
										setGeneral((f) => ({ ...f, currency: v }))
									}
								>
									<SelectTrigger className="mt-1.5">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="KGS">KGS — Кыргызский сом</SelectItem>
										<SelectItem value="USD">USD — Доллар США</SelectItem>
										<SelectItem value="EUR">EUR — Евро</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label className="text-sm font-medium">Часовой пояс</Label>
								<Select
									value={general.timezone}
									onValueChange={(v) =>
										setGeneral((f) => ({ ...f, timezone: v }))
									}
								>
									<SelectTrigger className="mt-1.5">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Asia/Bishkek">Бишкек (UTC+6)</SelectItem>
										<SelectItem value="Asia/Almaty">Алматы (UTC+6)</SelectItem>
										<SelectItem value="Europe/Moscow">
											Москва (UTC+3)
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label className="text-sm font-medium">Пеня (% в день)</Label>
								<Input
									className="mt-1.5"
									type="number"
									step="0.01"
									value={general.lateFeePercent}
									onChange={(e) =>
										setGeneral((f) => ({
											...f,
											lateFeePercent: e.target.value,
										}))
									}
								/>
							</div>
							<div>
								<Label className="text-sm font-medium">
									Льготный период (дн.)
								</Label>
								<Input
									className="mt-1.5"
									type="number"
									value={general.lateFeeGraceDays}
									onChange={(e) =>
										setGeneral((f) => ({
											...f,
											lateFeeGraceDays: e.target.value,
										}))
									}
								/>
							</div>
						</div>

						{/* Tax Regime */}
						<div>
							<Label className="text-sm font-medium">
								Налоговый режим (KG)
							</Label>
							<Select
								value={general.taxRegime}
								onValueChange={(v) =>
									setGeneral((f) => ({ ...f, taxRegime: v }))
								}
							>
								<SelectTrigger className="mt-1.5">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TAX_REGIMES.map((r) => (
										<SelectItem key={r.id} value={r.id}>
											{r.label} — {r.description}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{selectedRegime && (
								<div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 p-3">
									<p className="text-xs font-semibold text-blue-800 mb-1.5">
										Применяемые налоги:
									</p>
									{selectedRegime.taxes.map((t) => (
										<div
											key={t.name}
											className="flex items-center justify-between text-xs text-blue-700"
										>
											<span>{t.name}</span>
											<span className="font-bold bg-blue-100 px-2 py-0.5 rounded-full">
												{t.rate}
											</span>
										</div>
									))}
								</div>
							)}
						</div>
					</>
				)}

				{/* ── BILLING ── */}
				{tab === "billing" && (
					<>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label className="text-sm font-medium">День начисления</Label>
								<Input
									className="mt-1.5"
									type="number"
									min="1"
									max="31"
									value={billing.accrualDay}
									onChange={(e) =>
										setBilling((f) => ({ ...f, accrualDay: e.target.value }))
									}
								/>
								<p className="text-xs text-gray-400 mt-1">
									День месяца для авто-начислений
								</p>
							</div>
							<div>
								<Label className="text-sm font-medium">
									Срок оплаты (дней)
								</Label>
								<Input
									className="mt-1.5"
									type="number"
									min="1"
									value={billing.dueDays}
									onChange={(e) =>
										setBilling((f) => ({ ...f, dueDays: e.target.value }))
									}
								/>
								<p className="text-xs text-gray-400 mt-1">
									После даты начисления
								</p>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label className="text-sm font-medium">Авто-начисление</Label>
								<Select
									value={billing.autoAccrual}
									onValueChange={(v) =>
										setBilling((f) => ({ ...f, autoAccrual: v }))
									}
								>
									<SelectTrigger className="mt-1.5">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="true">Включено</SelectItem>
										<SelectItem value="false">Выключено</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label className="text-sm font-medium">Округление суммы</Label>
								<Select
									value={billing.roundUp}
									onValueChange={(v) =>
										setBilling((f) => ({ ...f, roundUp: v }))
									}
								>
									<SelectTrigger className="mt-1.5">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="true">Вверх до целого</SelectItem>
										<SelectItem value="false">Без округления</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</>
				)}

				{/* ── NOTIFICATIONS ── */}
				{tab === "notifications" && (
					<>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label className="text-sm font-medium">
									Напомнить за (дней до срока)
								</Label>
								<Input
									className="mt-1.5"
									type="number"
									value={notif.upcomingReminder}
									onChange={(e) =>
										setNotif((f) => ({
											...f,
											upcomingReminder: e.target.value,
										}))
									}
								/>
							</div>
							<div>
								<Label className="text-sm font-medium">
									Уведомить о долге (дней после)
								</Label>
								<Input
									className="mt-1.5"
									type="number"
									value={notif.overdueReminder}
									onChange={(e) =>
										setNotif((f) => ({ ...f, overdueReminder: e.target.value }))
									}
								/>
							</div>
						</div>
						<div>
							<Label className="text-sm font-medium">Канал уведомлений</Label>
							<Select
								value={notif.channel}
								onValueChange={(v) => setNotif((f) => ({ ...f, channel: v }))}
							>
								<SelectTrigger className="mt-1.5">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="email">Email</SelectItem>
									<SelectItem value="sms">SMS</SelectItem>
									<SelectItem value="whatsapp">WhatsApp</SelectItem>
									<SelectItem value="all">Все каналы</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{channelInfo && (
							<div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
								<div className="flex items-center gap-2">
									<div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
										<ChannelIcon className={`w-4 h-4 ${channelInfo.color}`} />
									</div>
									<p className="text-sm font-semibold text-gray-800">
										Что нужно для работы:
									</p>
								</div>
								<ul className="space-y-1.5">
									{channelInfo.requirements.map((req, i) => (
										<li
											key={i}
											className="flex items-start gap-2 text-sm text-gray-600"
										>
											<ChevronRight className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
											{req}
										</li>
									))}
								</ul>
								<div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
									<Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
									<p className="text-xs text-amber-700">{channelInfo.note}</p>
								</div>
								<p className="text-xs text-gray-400">
									Обратитесь к администратору системы для подключения канала
									уведомлений.
								</p>
							</div>
						)}
					</>
				)}

				{/* ── DOCUMENTS ── */}
				{tab === "documents" && <DocsTab />}

				<div className="pt-2">
					<Button onClick={save} className="gap-2">
						<Save className="w-4 h-4" /> Сохранить настройки
					</Button>
				</div>
			</div>
		</div>
	);
}
