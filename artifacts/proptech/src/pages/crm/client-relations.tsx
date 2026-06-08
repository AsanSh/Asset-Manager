import {
	ArrowRight,
	Bell,
	Building2,
	CheckCircle2,
	CreditCard,
	FileText,
	LineChart,
	Megaphone,
	MessageSquare,
	Send,
	Users,
	Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

const SEGMENTS = [
	{ label: "Клиенты ЖК", value: "по проектам", icon: Building2 },
	{ label: "Есть просрочка", value: "платёжный фокус", icon: CreditCard },
	{ label: "Полностью оплатили", value: "повторные продажи", icon: CheckCircle2 },
	{ label: "Инвесторы", value: "аренда / перепродажа", icon: LineChart },
];

const PORTAL_BLOCKS = [
	{
		title: "Финансы клиента",
		text: "Объект, договор, график платежей, оплачено, осталось, просрочено.",
		href: "/construction/contracts-sales",
		icon: CreditCard,
	},
	{
		title: "Документы и сверка",
		text: "Договоры, приложения, акты сверки и история документов.",
		href: "/construction/reconciliation",
		icon: FileText,
	},
	{
		title: "Новости и акции",
		text: "Публикации в портал, акции по ЖК, сервисные предложения.",
		href: "/construction/planning/broadcast",
		icon: Megaphone,
	},
	{
		title: "Обращения",
		text: "Заявки клиентов, история контактов и ответственный менеджер.",
		href: "/crm/clients",
		icon: MessageSquare,
	},
];

const CAMPAIGNS = [
	"Клиентам с просрочкой: мягкое напоминание и график погашения",
	"Полностью оплатившим: предложение аренды / перепродажи",
	"Покупателям коммерции: сервисы ремонта, мебели и кондиционеров",
	"Инвесторам: аналитика роста стоимости и рыночная цена за м²",
];

type Announcement = {
	id: string;
	title: string;
	segment: string;
	channel: string;
	status: "Черновик" | "Опубликовано";
};

const ANNOUNCEMENTS_KEY = "planalityc-client-announcements";

export default function ClientRelations() {
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [title, setTitle] = useState("");
	const [segment, setSegment] = useState(SEGMENTS[0]?.label ?? "Клиенты ЖК");
	const [channel, setChannel] = useState("Портал");

	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(ANNOUNCEMENTS_KEY);
			if (raw) setAnnouncements(JSON.parse(raw) as Announcement[]);
		} catch {
			setAnnouncements([]);
		}
	}, []);

	useEffect(() => {
		window.localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
	}, [announcements]);

	const publishedCount = useMemo(
		() => announcements.filter((item) => item.status === "Опубликовано").length,
		[announcements],
	);

	const createAnnouncement = (status: Announcement["status"]) => {
		const normalizedTitle = title.trim();
		if (!normalizedTitle) return;
		setAnnouncements((items) => [
			{
				id: crypto.randomUUID(),
				title: normalizedTitle,
				segment,
				channel,
				status,
			},
			...items,
		]);
		setTitle("");
	};

	return (
		<div className="max-w-7xl space-y-6">
			<section className="rounded-xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-3xl">
						<p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
							Client Relations
						</p>
						<h1 className="mt-2 text-2xl font-bold tracking-tight">
							Клиентский сервис и управление порталом покупателей
						</h1>
						<p className="mt-2 text-sm leading-6 text-slate-300">
							Отдельное рабочее место для отдела связей с клиентами: сегменты,
							объявления, акции, обращения, документы и повторные продажи
							через клиентский портал.
						</p>
					</div>
					<Link href="/crm/clients">
						<div className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
							Перейти к клиентам
							<ArrowRight className="h-4 w-4" />
						</div>
					</Link>
					<Link href="/portal-login">
						<div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15">
							Открыть портал
							<ArrowRight className="h-4 w-4" />
						</div>
					</Link>
				</div>
			</section>

			<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				{SEGMENTS.map((segment) => {
					const Icon = segment.icon;
					return (
						<div key={segment.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
							<div className="flex items-start justify-between">
								<div>
									<p className="text-sm font-semibold text-slate-950">
										{segment.label}
									</p>
									<p className="mt-1 text-xs text-slate-500">{segment.value}</p>
								</div>
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
									<Icon className="h-4 w-4" />
								</div>
							</div>
						</div>
					);
				})}
			</section>

			<section className="grid gap-6 xl:grid-cols-[1fr_340px]">
				<div className="rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-100 px-5 py-4">
						<h2 className="text-base font-semibold text-slate-950">
							Что должен видеть клиент в портале
						</h2>
						<p className="mt-1 text-sm text-slate-500">
							Портал становится каналом прозрачности, поддержки и повторных
							продаж, а не просто страницей входа.
						</p>
					</div>
					<div className="grid md:grid-cols-2">
						{PORTAL_BLOCKS.map((block) => {
							const Icon = block.icon;
							return (
								<Link key={block.title} href={block.href}>
									<div className="min-h-[150px] cursor-pointer border-b border-r border-slate-100 p-5 hover:bg-cyan-50/40">
										<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
											<Icon className="h-4 w-4" />
										</div>
										<h3 className="mt-3 text-sm font-semibold text-slate-950">
											{block.title}
										</h3>
										<p className="mt-1.5 text-xs leading-5 text-slate-500">
											{block.text}
										</p>
									</div>
								</Link>
							);
						})}
					</div>
				</div>

				<div className="space-y-4">
					<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<Megaphone className="h-4 w-4 text-cyan-700" />
								<h2 className="text-sm font-semibold text-slate-950">
									Объявления для клиентов
								</h2>
							</div>
							<span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">
								{publishedCount} опубликовано
							</span>
						</div>
						<div className="mt-3 space-y-3">
							<input
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder="Например: акция на ремонт для ЖК"
								className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
							/>
							<div className="grid gap-2 sm:grid-cols-2">
								<select
									value={segment}
									onChange={(event) => setSegment(event.target.value)}
									className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
								>
									{SEGMENTS.map((item) => (
										<option key={item.label} value={item.label}>
											{item.label}
										</option>
									))}
								</select>
								<select
									value={channel}
									onChange={(event) => setChannel(event.target.value)}
									className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
								>
									<option>Портал</option>
									<option>Email</option>
									<option>WhatsApp</option>
									<option>Портал + Email</option>
								</select>
							</div>
							<div className="grid gap-2 sm:grid-cols-2">
								<button
									type="button"
									onClick={() => createAnnouncement("Черновик")}
									className="h-10 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
								>
									Сохранить черновик
								</button>
								<button
									type="button"
									onClick={() => createAnnouncement("Опубликовано")}
									className="h-10 rounded-lg bg-cyan-600 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
									disabled={!title.trim()}
								>
									Опубликовать
								</button>
							</div>
						</div>
						<div className="mt-4 space-y-2">
							{announcements.length === 0 ? (
								<div className="rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-500">
									Пока нет публикаций. Создайте первое объявление для портала или рассылки.
								</div>
							) : (
								announcements.map((item) => (
									<div key={item.id} className="rounded-lg border border-slate-200 p-3">
										<div className="flex items-start justify-between gap-3">
											<p className="text-sm font-semibold text-slate-950">{item.title}</p>
											<span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
												{item.status}
											</span>
										</div>
										<p className="mt-1 text-xs text-slate-500">
											{item.segment} · {item.channel}
										</p>
									</div>
								))
							)}
						</div>
					</div>

					<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
						<div className="flex items-center gap-2">
							<Send className="h-4 w-4 text-cyan-700" />
							<h2 className="text-sm font-semibold text-slate-950">
								Сценарии рассылок
							</h2>
						</div>
						<div className="mt-3 space-y-2">
							{CAMPAIGNS.map((campaign) => (
								<div key={campaign} className="rounded-lg border border-slate-200 p-3 text-xs leading-5 text-slate-600">
									{campaign}
								</div>
							))}
						</div>
					</div>

					<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
						<div className="flex items-center gap-2">
							<Wrench className="h-4 w-4 text-slate-600" />
							<h2 className="text-sm font-semibold text-slate-950">
								Сервисные предложения
							</h2>
						</div>
						<p className="mt-2 text-xs leading-5 text-slate-500">
							Кнопки “Хочу продать”, “Хочу сдать в аренду”, “Заказать ремонт”,
							“Связаться с менеджером” должны идти из портала в CRM-задачи.
						</p>
					</div>
					<Link href="/construction/contracts-sales">
						<div className="cursor-pointer rounded-xl border border-cyan-200 bg-cyan-50 p-4 hover:bg-cyan-100/70">
							<div className="flex items-center gap-2">
								<Bell className="h-4 w-4 text-cyan-700" />
								<p className="text-sm font-semibold text-cyan-950">
									Порталы контрагентов
								</p>
							</div>
							<p className="mt-2 text-xs leading-5 text-cyan-900/80">
								Открываются из договоров: клиент видит объект, платежи, документы,
								акт сверки и обращения.
							</p>
						</div>
					</Link>
				</div>
			</section>
		</div>
	);
}
