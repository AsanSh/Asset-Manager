import { useQuery } from "@tanstack/react-query";
import {
	ArrowRight,
	Banknote,
	BarChart3,
	Building2,
	CalendarDays,
	CheckCircle2,
	CircleDollarSign,
	CreditCard,
	FileText,
	Grid3X3,
	LockKeyhole,
	Plus,
	ReceiptText,
	Scale,
	ShieldCheck,
	Sparkles,
	TrendingUp,
	WalletCards,
} from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

type ProjectSummary = {
	id: number;
	name: string;
	address?: string;
	status?: string;
	totalUnits?: number;
	totalFloors?: number;
	createdAt?: string;
};

type UnitsOverview = {
	total?: number;
	available?: number;
	sold?: number;
	reserved?: number;
};

type AccrualSummary = {
	status?: string;
	dueDate?: string;
	amount?: string;
};

const emptyUnitsOverview: UnitsOverview = {
	total: 0,
	available: 0,
	sold: 0,
	reserved: 0,
};

const LAUNCH_STEPS = [
	{
		title: "Проект / ЖК",
		description: "Создать объект учета: адрес, этажность, юниты, сроки и бюджет.",
		href: "/construction/projects?create=1",
		icon: Building2,
		action: "Создать проект",
		tone: "emerald",
	},
	{
		title: "Шахматка",
		description: "Сгенерировать или импортировать квартиры, площади и статусы.",
		href: "/construction/chess",
		icon: Grid3X3,
		action: "Собрать шахматку",
		tone: "cyan",
	},
	{
		title: "Цена и коэффициент",
		description: "Коммерческий директор открывает к продаже только утвержденные юниты.",
		href: "/construction/chess",
		icon: LockKeyhole,
		action: "Утвердить цены",
		tone: "blue",
	},
	{
		title: "Бронь и договор",
		description: "Продажник видит только доступные объекты и создает договор.",
		href: "/construction/contracts-sales",
		icon: FileText,
		action: "Оформить договор",
		tone: "violet",
	},
	{
		title: "Начисления",
		description: "График платежей автоматически строится на основе договора.",
		href: "/construction/accruals",
		icon: ReceiptText,
		action: "Проверить график",
		tone: "amber",
	},
	{
		title: "Оплаты",
		description: "Поступления закрывают начисления и показывают остаток долга.",
		href: "/construction/cashier",
		icon: CreditCard,
		action: "Принять оплату",
		tone: "teal",
	},
	{
		title: "Акт сверки",
		description: "Финансист видит долг, просрочку и сверку по клиенту.",
		href: "/construction/reconciliation",
		icon: Scale,
		action: "Сверить клиента",
		tone: "rose",
	},
];

const ROLE_LANES = [
	{
		title: "Коммерческий директор",
		value: "Цена",
		description: "база, коэффициенты, доступность, скидки",
		progress: 72,
	},
	{
		title: "Продажи",
		value: "Сделка",
		description: "бронь, клиент, договор, статусы",
		progress: 58,
	},
	{
		title: "Финансы",
		value: "Деньги",
		description: "начисления, оплаты, просрочки, сверка",
		progress: 64,
	},
	{
		title: "Руководитель проекта",
		value: "Контроль",
		description: "сроки, задачи, WBS, просрочки",
		progress: 62,
	},
];

const SECONDARY_AREAS = [
	{
		title: "Себестоимость",
		description: "WBS, материалы, подрядчики, бюджет и план/факт.",
		href: "/construction/budget",
		icon: BarChart3,
	},
	{
		title: "Производство",
		description: "Бригады, задачи, зарплатная ведомость и стройконтроль.",
		href: "/construction/workers",
		icon: CheckCircle2,
	},
	{
		title: "Планалитика",
		description: "ОДДС, ОПУ, задолженности и будущие поступления.",
		href: "/construction/analytics/cashflow",
		icon: TrendingUp,
	},
];

const CHESS_QUICK_ACTIONS = [
	{
		title: "Проект",
		description: "создать объект",
		href: "/construction/projects?create=1",
		icon: Building2,
		tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
	},
	{
		title: "Шахматка",
		description: "юниты и статусы",
		href: "/construction/chess",
		icon: Grid3X3,
		tone: "bg-cyan-50 text-cyan-700 ring-cyan-100",
	},
	{
		title: "Цены",
		description: "коэффициенты",
		href: "/construction/chess",
		icon: LockKeyhole,
		tone: "bg-blue-50 text-blue-700 ring-blue-100",
	},
	{
		title: "Договор",
		description: "бронь клиента",
		href: "/construction/contracts-sales",
		icon: FileText,
		tone: "bg-violet-50 text-violet-700 ring-violet-100",
	},
];

const toneClass: Record<string, string> = {
	emerald: "from-emerald-500 to-teal-500 text-emerald-700 bg-emerald-50 ring-emerald-100",
	cyan: "from-cyan-500 to-sky-500 text-cyan-700 bg-cyan-50 ring-cyan-100",
	blue: "from-blue-500 to-indigo-500 text-blue-700 bg-blue-50 ring-blue-100",
	violet: "from-violet-500 to-fuchsia-500 text-violet-700 bg-violet-50 ring-violet-100",
	amber: "from-amber-400 to-orange-500 text-amber-700 bg-amber-50 ring-amber-100",
	teal: "from-teal-500 to-emerald-500 text-teal-700 bg-teal-50 ring-teal-100",
	rose: "from-rose-500 to-red-500 text-rose-700 bg-rose-50 ring-rose-100",
};

function formatMoney(value: number) {
	return new Intl.NumberFormat("ru-RU", {
		maximumFractionDigits: 0,
	}).format(value);
}

function percent(part = 0, total = 0) {
	if (!total) return 0;
	return Math.min(100, Math.round((part / total) * 100));
}

export default function ConstructionOpsDashboardTab() {
	const { data: projects = [], isLoading: loadingProjects } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () =>
			api.get("/construction/projects/all").then((r) => r.data).catch(() => []),
	});
	const { data: unitsOverview, isLoading: loadingUnits } = useQuery({
		queryKey: ["construction-units-overview", "all"],
		queryFn: () =>
			api
				.get("/construction/units/overview")
				.then((r) => r.data)
				.catch(() => emptyUnitsOverview),
	});
	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () =>
			api.get("/construction/contracts-sales").then((r) => r.data).catch(() => []),
	});
	const { data: accruals = [] } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () =>
			api.get("/construction/accruals").then((r) => r.data).catch(() => []),
	});

	const projectsArray = Array.isArray(projects) ? (projects as ProjectSummary[]) : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];
	const accrualsArray = Array.isArray(accruals) ? (accruals as AccrualSummary[]) : [];
	const overview =
		unitsOverview && typeof unitsOverview === "object"
			? (unitsOverview as UnitsOverview)
			: emptyUnitsOverview;
	const today = new Date().toISOString().slice(0, 10);
	const overdueAccruals = accrualsArray.filter((a) => {
		const due = a.dueDate ? String(a.dueDate).slice(0, 10) : "";
		return due && due < today && a.status !== "paid";
	});
	const overdueAmount = overdueAccruals.reduce(
		(sum, a) => sum + Number.parseFloat(String(a.amount || "0")),
		0,
	);
	const launched = [
		projectsArray.length > 0,
		(overview.total ?? 0) > 0,
		(overview.available ?? 0) > 0,
		contractsArray.length > 0,
		accrualsArray.length > 0,
	].filter(Boolean).length;
	const launchProgress = Math.round((launched / 5) * 100);
	const soldShare = percent(overview.sold, overview.total);
	const availableShare = percent(overview.available, overview.total);
	const reservedShare = percent(overview.reserved, overview.total);

	const kpis = [
		{
			label: "Проектов",
			value: projectsArray.length,
			sub: projectsArray.length ? "фундамент учета создан" : "начните с проекта",
			href: "/construction/projects?create=1",
			icon: Building2,
			trend: "+ start",
		},
		{
			label: "Юнитов",
			value: overview.total ?? 0,
			sub: `${availableShare}% открыто к продаже`,
			href: "/construction/chess",
			icon: Grid3X3,
			trend: `${overview.available ?? 0} доступно`,
		},
		{
			label: "Договоров",
			value: contractsArray.length,
			sub: "продажи по объектам",
			href: "/construction/contracts-sales",
			icon: FileText,
			trend: "pipeline",
		},
		{
			label: "Просрочки",
			value: overdueAccruals.length,
			sub: overdueAmount ? `${formatMoney(overdueAmount)} в долге` : "нет суммы долга",
			href: "/construction/accruals",
			icon: Banknote,
			trend: overdueAccruals.length ? "risk" : "clean",
		},
	];

	return (
		<div className="construction-command-center -m-4 min-h-[calc(100vh-7rem)] p-4 md:-m-6 md:p-6">
			<section className="construction-hero relative overflow-hidden rounded-[28px] border border-white/50 bg-[#eaf5f2] p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)] md:p-7">
				<div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_22%_12%,rgba(20,184,166,0.28),transparent_30%),radial-gradient(circle_at_72%_0%,rgba(14,165,233,0.28),transparent_32%)]" />
				<div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
					<div className="max-w-3xl">
						<div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
							<Sparkles className="h-3.5 w-3.5 text-cyan-600" />
							PropTech sales operating system
						</div>
						<h1 className="mt-5 max-w-3xl text-3xl font-semibold text-slate-950 md:text-5xl">
							Строительство и продажи недвижимости, собранные по порядку
						</h1>
						<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
							Сначала создается проект, затем шахматка, цены, договор,
							начисления, оплата, сверка и клиентский портал. Не все разделы
							сразу, а один понятный путь для команды. Клиентский сервис вынесен
							в CRM, чтобы не смешивать производство и работу с покупателями.
						</p>
					</div>

					<div className="grid min-w-[280px] gap-3 sm:grid-cols-2 xl:w-[420px]">
						<Link
							href="/construction/projects?create=1"
							className="construction-press group rounded-3xl bg-slate-950 p-4 text-white shadow-xl shadow-slate-900/15"
						>
							<div className="flex items-center justify-between">
								<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12">
									<Plus className="h-5 w-5" />
								</div>
								<ArrowRight className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-1" />
							</div>
							<p className="mt-5 text-sm text-white/60">Первое действие</p>
							<p className="text-lg font-semibold">Создать проект</p>
						</Link>

						<Link
							href="/construction/chess"
							className="construction-press group rounded-3xl border border-white/70 bg-white/80 p-4 text-slate-950 shadow-lg shadow-slate-900/5 backdrop-blur"
						>
							<div className="flex items-center justify-between">
								<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
									<Grid3X3 className="h-5 w-5" />
								</div>
								<ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
							</div>
							<p className="mt-5 text-sm text-slate-500">После проекта</p>
							<p className="text-lg font-semibold">Открыть шахматку</p>
						</Link>
					</div>
				</div>

				<div className="relative z-10 mt-7 grid gap-3 md:grid-cols-4">
					{kpis.map((kpi, index) => {
						const Icon = kpi.icon;
						const isLoading = loadingProjects && kpi.label === "Проектов" || loadingUnits && kpi.label === "Юнитов";
						return (
							<Link
								key={kpi.label}
								href={kpi.href}
								className="construction-card-in group rounded-3xl border border-white/70 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
								style={{ animationDelay: `${index * 70}ms` }}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
										<Icon className="h-4 w-4" />
									</div>
									<span className="rounded-full bg-lime-100 px-2 py-1 text-[11px] font-semibold text-lime-700">
										{kpi.trend}
									</span>
								</div>
								{isLoading ? (
									<Skeleton className="mt-7 h-9 w-24 rounded-lg" />
								) : (
									<p className="mt-7 text-4xl font-semibold text-slate-950">
										{kpi.value}
									</p>
								)}
								<div className="mt-1 flex items-center justify-between gap-2">
									<div>
										<p className="text-sm font-medium text-slate-800">{kpi.label}</p>
										<p className="text-xs text-slate-500">{kpi.sub}</p>
									</div>
									<ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-cyan-600" />
								</div>
							</Link>
						);
					})}
				</div>
			</section>

			<section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
				<div className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-sm">
					<div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
						<div>
							<p className="text-sm font-semibold text-slate-950">Запуск продукта</p>
							<p className="text-sm text-slate-500">
								Кликабельная цепочка от проекта до клиентского портала.
							</p>
						</div>
						<div className="min-w-[220px] rounded-full bg-slate-100 p-1">
							<div
								className="rounded-full bg-slate-950 px-3 py-1.5 text-center text-xs font-semibold text-white transition-all duration-700"
								style={{ width: `${Math.max(18, launchProgress)}%` }}
							>
								{launchProgress}%
							</div>
						</div>
					</div>

					<div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
						{LAUNCH_STEPS.map((step, index) => {
							const Icon = step.icon;
							const tone = toneClass[step.tone] ?? toneClass.cyan;
							return (
								<Link
									key={step.title}
									href={step.href}
									className="construction-card-in construction-press group relative min-h-[178px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-950/10"
									style={{ animationDelay: `${120 + index * 55}ms` }}
								>
									<div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.split(" ").slice(0, 2).join(" ")}`} />
									<div className="flex items-start justify-between gap-2">
										<div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.split(" ").slice(2).join(" ")}`}>
											<Icon className="h-5 w-5" />
										</div>
										<span className="text-xs font-semibold text-slate-300">
											{String(index + 1).padStart(2, "0")}
										</span>
									</div>
									<h3 className="mt-4 text-base font-semibold text-slate-950">
										{step.title}
									</h3>
									<p className="mt-2 text-sm leading-5 text-slate-500">
										{step.description}
									</p>
									<p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700">
										{step.action}
										<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
									</p>
								</Link>
							);
						})}
					</div>
				</div>

				<div className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-semibold text-slate-950">Шахматка</p>
							<p className="text-sm text-slate-500">доступность и статусы юнитов</p>
						</div>
						<Link
							href="/construction/chess"
							className="construction-press rounded-full bg-slate-950 p-2 text-white"
						>
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>

					<div className="mt-6 grid grid-cols-[150px_1fr] gap-5 max-sm:grid-cols-1">
						<div className="relative mx-auto flex h-[150px] w-[150px] items-center justify-center rounded-full bg-[conic-gradient(#0891b2_var(--sold),#22c55e_0_var(--available),#f59e0b_0_var(--reserved),#e2e8f0_0)] p-4"
							style={{
								"--sold": `${soldShare}%`,
								"--available": `${Math.min(100, soldShare + availableShare)}%`,
								"--reserved": `${Math.min(100, soldShare + availableShare + reservedShare)}%`,
							} as CSSProperties}
						>
							<div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
								<p className="text-3xl font-semibold text-slate-950">
									{overview.total ?? 0}
								</p>
								<p className="text-xs text-slate-500">юнитов</p>
							</div>
						</div>

						<div className="space-y-3">
							{[
								{ label: "Открыто к продаже", value: overview.available ?? 0, color: "bg-emerald-600" },
								{ label: "Продано", value: overview.sold ?? 0, color: "bg-cyan-700" },
								{ label: "Бронь", value: overview.reserved ?? 0, color: "bg-amber-500" },
							].map((row) => (
								<Link
									key={row.label}
									href="/construction/chess"
									className="construction-press block rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-white hover:shadow-sm"
								>
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-2">
											<span className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
											<span className="text-sm text-slate-600">{row.label}</span>
										</div>
										<span className="text-sm font-semibold text-slate-950">{row.value}</span>
									</div>
								</Link>
							))}
						</div>
					</div>

					<div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-4">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-sm font-semibold text-slate-950">
									Готовность запуска
								</p>
								<p className="text-xs text-slate-500">
									что нужно закрыть до активных продаж
								</p>
							</div>
							<span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
								{launchProgress}%
							</span>
						</div>
						<div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
							<div
								className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-lime-300 transition-all duration-700"
								style={{ width: `${Math.max(8, launchProgress)}%` }}
							/>
						</div>
					</div>

					<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
						{CHESS_QUICK_ACTIONS.map((action) => {
							const Icon = action.icon;
							return (
								<Link
									key={action.title}
									href={action.href}
									className="construction-press group rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-950/10"
								>
									<div className="flex items-start justify-between gap-3">
										<div
											className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${action.tone}`}
										>
											<Icon className="h-4 w-4" />
										</div>
										<ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-cyan-600" />
									</div>
									<p className="mt-4 text-sm font-semibold text-slate-950">
										{action.title}
									</p>
									<p className="mt-1 text-xs text-slate-500">
										{action.description}
									</p>
								</Link>
							);
						})}
					</div>
				</div>
			</section>

			<section className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
				<div className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-sm">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-sm font-semibold text-slate-950">Работа по ролям</p>
							<p className="text-sm text-slate-500">
								Каждый отдел видит свою часть процесса.
							</p>
						</div>
						<ShieldCheck className="h-5 w-5 text-emerald-600" />
					</div>
					<div className="mt-4 grid gap-3 md:grid-cols-2">
						{ROLE_LANES.map((lane, index) => (
							<div
								key={lane.title}
								className="construction-card-in rounded-3xl border border-slate-200 bg-slate-50 p-4"
								style={{ animationDelay: `${220 + index * 70}ms` }}
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-slate-950">{lane.title}</p>
										<p className="mt-1 text-xs leading-5 text-slate-500">{lane.description}</p>
									</div>
									<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
										{lane.value}
									</span>
								</div>
								<div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
									<div
										className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-700"
										style={{ width: `${lane.progress}%` }}
									/>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-sm">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-sm font-semibold text-slate-950">Второй слой</p>
							<p className="text-sm text-slate-500">подключать после MVP-продаж</p>
						</div>
						<WalletCards className="h-5 w-5 text-slate-500" />
					</div>
					<div className="mt-4 space-y-3">
						{SECONDARY_AREAS.map((area) => {
							const Icon = area.icon;
							return (
								<Link
									key={area.title}
									href={area.href}
									className="construction-press group flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 hover:bg-white hover:shadow-sm"
								>
									<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm">
										<Icon className="h-4 w-4" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-semibold text-slate-950">{area.title}</p>
										<p className="truncate text-xs text-slate-500">{area.description}</p>
									</div>
									<ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-cyan-600" />
								</Link>
							);
						})}
					</div>
				</div>
			</section>

			<section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
				<div className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-semibold text-slate-950">Проекты</p>
							<p className="text-sm text-slate-500">то, с чего начинается учет</p>
						</div>
						<Link
							href="/construction/projects?create=1"
							className="construction-press inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20"
						>
							<Plus className="h-4 w-4" />
							Создать
						</Link>
					</div>

					<div className="mt-4">
						{loadingProjects ? (
							<Skeleton className="h-24 rounded-3xl" />
						) : projectsArray.length === 0 ? (
							<Link
								href="/construction/projects?create=1"
								className="construction-press flex min-h-[132px] items-center justify-between gap-4 rounded-3xl border border-dashed border-cyan-200 bg-cyan-50/60 p-5 hover:bg-cyan-50"
							>
								<div>
									<p className="text-base font-semibold text-slate-950">
										Проектов пока нет
									</p>
									<p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">
										Создайте ЖК или объект строительства. После этого можно
										сгенерировать шахматку и открыть юниты к продаже.
									</p>
								</div>
								<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white">
									<Plus className="h-5 w-5" />
								</div>
							</Link>
						) : (
							<div className="space-y-3">
								{projectsArray.slice(0, 3).map((project) => (
									<Link
										key={project.id}
										href="/construction/projects"
										className="construction-press group flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 hover:bg-white hover:shadow-sm"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-semibold text-slate-950">
												{project.name}
											</p>
											<p className="truncate text-xs text-slate-500">
												{project.address || "адрес не указан"} · {project.totalUnits || 0} юнитов
											</p>
										</div>
										<ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-cyan-600" />
									</Link>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="rounded-[26px] border border-slate-200/70 bg-slate-950 p-5 text-white shadow-sm">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-sm font-semibold">Финансовый контроль</p>
							<p className="text-sm text-white/55">
								начисления, оплаты, просрочки и сверка
							</p>
						</div>
						<CircleDollarSign className="h-5 w-5 text-lime-300" />
					</div>
					<div className="mt-5 grid gap-3 sm:grid-cols-3">
						<Link href="/construction/accruals" className="construction-press rounded-3xl bg-white/8 p-4 hover:bg-white/12">
							<ReceiptText className="h-4 w-4 text-lime-300" />
							<p className="mt-4 text-2xl font-semibold">{accrualsArray.length}</p>
							<p className="text-xs text-white/50">начислений</p>
						</Link>
						<Link href="/construction/cashier" className="construction-press rounded-3xl bg-white/8 p-4 hover:bg-white/12">
							<CreditCard className="h-4 w-4 text-cyan-300" />
							<p className="mt-4 text-2xl font-semibold">{contractsArray.length}</p>
							<p className="text-xs text-white/50">договоров</p>
						</Link>
						<Link href="/construction/reconciliation" className="construction-press rounded-3xl bg-white/8 p-4 hover:bg-white/12">
							<CalendarDays className="h-4 w-4 text-rose-300" />
							<p className="mt-4 text-2xl font-semibold">{overdueAccruals.length}</p>
							<p className="text-xs text-white/50">просрочек</p>
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
