import {
	ArrowRight,
	Building2,
	CircleHelp,
	FileText,
	Grid3X3,
	Home,
	MessageCircle,
	Package,
	ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";

type HelpModule = "construction" | "crm" | "rental" | "warehouse";

const HELP: Record<
	HelpModule,
	{
		title: string;
		subtitle: string;
		startHref: string;
		steps: Array<{ title: string; text: string; href: string }>;
		rules: string[];
		icon: typeof Building2;
	}
> = {
	construction: {
		title: "Помощь · Строительство",
		subtitle: "Как запустить учет объекта, шахматку, договоры и финансовый контроль.",
		startHref: "/construction/projects?create=1",
		icon: Building2,
		steps: [
			{ title: "Создайте проект / ЖК", text: "Укажите адрес, этажность, количество юнитов, сроки и плановую себестоимость.", href: "/construction/projects?create=1" },
			{ title: "Соберите шахматку", text: "Сгенерируйте квартиры или импортируйте Excel. Проверьте площадь, секцию, статус.", href: "/construction/chess" },
			{ title: "Утвердите цены", text: "Коммерческий директор задает базовую цену и коэффициент. Без этого юнит не активен для продаж.", href: "/construction/chess" },
			{ title: "Создайте договор", text: "Продажник выбирает только открытый к продаже юнит, покупателя и условия оплаты.", href: "/construction/contracts-sales" },
			{ title: "Сформируйте начисления", text: "На основе договора создается график платежей, затем касса закрывает оплатами остаток.", href: "/construction/accruals" },
		],
		rules: [
			"Клиентский сервис и объявления клиентам находятся в CRM, не в производстве.",
			"Зарплатная ведомость находится в финансовом блоке строительства.",
			"Если модуль строительства подключен один, остальные бизнес-модули не должны мешать работе.",
		],
	},
	crm: {
		title: "Помощь · CRM и клиентский сервис",
		subtitle: "Как вести лиды, клиентов, обращения, объявления и портал покупателей.",
		startHref: "/crm/leads",
		icon: MessageCircle,
		steps: [
			{ title: "Соберите лиды", text: "Ведите входящие обращения, источник, ответственного и этап квалификации.", href: "/crm/leads" },
			{ title: "Ведите клиентов", text: "Храните карточку клиента, контакты, историю сделок и обращений.", href: "/crm/clients" },
			{ title: "Публикуйте объявления", text: "Раздел клиентского сервиса управляет новостями, акциями и сообщениями для портала.", href: "/crm/client-relations" },
			{ title: "Откройте портал", text: "Покупатель видит договор, платежи, документы, новости и может оставить обращение.", href: "/crm/client-relations" },
		],
		rules: [
			"CRM отдельно не заменяет строительство: шахматка и договоры по юнитам живут в строительном модуле.",
			"CRM нужен для коммуникаций, клиентского портала, лидов и сервиса.",
			"При включенных модулях CRM + строительство появляется связка юнит → договор → клиент → портал.",
		],
	},
	rental: {
		title: "Помощь · Аренда",
		subtitle: "Как вести объекты аренды, договоры, платежи и отчеты владельцев.",
		startHref: "/rental/properties",
		icon: Home,
		steps: [
			{ title: "Добавьте объект", text: "Создайте объект аренды, владельца, параметры и расчетные условия.", href: "/rental/properties" },
			{ title: "Создайте арендатора", text: "Заполните карточку арендатора и контактные данные.", href: "/rental/tenants" },
			{ title: "Оформите договор", text: "Укажите срок, ставку, депозит и график начислений.", href: "/rental/contracts" },
			{ title: "Принимайте платежи", text: "Платежи закрывают начисления и формируют задолженность или переплату.", href: "/rental/payments" },
		],
		rules: [
			"Если компания подключила только аренду, пользователь должен видеть только арендный контур.",
			"Склад и строительство не обязательны для аренды.",
			"Отчеты владельцев строятся на договорах, начислениях и оплатах.",
		],
	},
	warehouse: {
		title: "Помощь · Закуп и снабжение",
		subtitle: "Как вести заявки, поставщиков, заказы, склад и списания.",
		startHref: "/warehouse/requests",
		icon: Package,
		steps: [
			{ title: "Создайте заявку", text: "Прораб или менеджер указывает материал, количество, срок и проект при необходимости.", href: "/warehouse/requests" },
			{ title: "Согласуйте закуп", text: "Ответственный проверяет заявку, бюджет и поставщика.", href: "/warehouse/approvals" },
			{ title: "Оформите заказ", text: "На основании заявки создается заказ поставщику.", href: "/warehouse/orders" },
			{ title: "Проведите склад", text: "Поступление увеличивает остаток, списание уменьшает его и может быть связано с проектом.", href: "/warehouse/inventory" },
		],
		rules: [
			"Закуп может работать отдельно от строительства как независимый складской контур.",
			"Если включить строительство + закуп, заявки можно связывать с проектами и задачами.",
			"Маркетплейс поставщиков является отдельным сценарием внутри снабжения.",
		],
	},
};

function detectHelpModule(): HelpModule {
	const path = window.location.pathname;
	if (path.startsWith("/crm")) return "crm";
	if (path.startsWith("/rental")) return "rental";
	if (path.startsWith("/warehouse")) return "warehouse";
	return "construction";
}

export default function ModuleHelp() {
	const module = HELP[detectHelpModule()];
	const Icon = module.icon;

	return (
		<div className="space-y-6">
			<section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/82 p-6 shadow-2xl shadow-slate-950/8 backdrop-blur-xl">
				<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-300 to-lime-300" />
				<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex items-start gap-4">
						<div className="grid h-14 w-14 place-items-center rounded-[24px] bg-slate-950 text-cyan-300 shadow-xl shadow-slate-950/20">
							<Icon className="h-6 w-6" />
						</div>
						<div>
							<p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
								<CircleHelp className="h-3.5 w-3.5" />
								Справка по модулю
							</p>
							<h1 className="mt-2 text-3xl font-semibold text-slate-950">
								{module.title}
							</h1>
							<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
								{module.subtitle}
							</p>
						</div>
					</div>
					<Link
						href={module.startHref}
						className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-950/16 transition hover:-translate-y-0.5 hover:shadow-2xl"
					>
						Начать работу
						<ArrowRight className="h-4 w-4" />
					</Link>
				</div>
			</section>

			<section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
				<div className="rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-xl shadow-slate-950/6">
					<div className="mb-4 flex items-center gap-2">
						<Grid3X3 className="h-5 w-5 text-cyan-700" />
						<h2 className="text-lg font-semibold text-slate-950">
							Порядок работы
						</h2>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						{module.steps.map((step, index) => (
							<Link
								key={step.title}
								href={step.href}
								className="group rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white hover:shadow-lg hover:shadow-cyan-950/8"
							>
								<div className="flex items-start justify-between gap-3">
									<span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-400 shadow-sm">
										{String(index + 1).padStart(2, "0")}
									</span>
									<ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-cyan-700" />
								</div>
								<h3 className="mt-4 text-base font-semibold text-slate-950">
									{step.title}
								</h3>
								<p className="mt-2 text-sm leading-6 text-slate-600">
									{step.text}
								</p>
							</Link>
						))}
					</div>
				</div>

				<div className="rounded-[28px] border border-slate-900 bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/18">
					<div className="mb-4 flex items-center gap-2">
						<ShieldCheck className="h-5 w-5 text-lime-300" />
						<h2 className="text-lg font-semibold">Правила модуля</h2>
					</div>
					<div className="space-y-3">
						{module.rules.map((rule) => (
							<div
								key={rule}
								className="rounded-[22px] border border-white/10 bg-white/6 p-4 text-sm leading-6 text-white/76"
							>
								{rule}
							</div>
						))}
					</div>
					<div className="mt-5 rounded-[22px] border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
						<FileText className="mb-2 h-5 w-5 text-cyan-200" />
						Этот раздел можно расширять: добавить видео, чек-листы, примеры
						Excel-импорта и права доступа по ролям.
					</div>
				</div>
			</section>
		</div>
	);
}
