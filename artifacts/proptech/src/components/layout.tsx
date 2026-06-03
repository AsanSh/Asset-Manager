import {
	Activity,
	AlertTriangle,
	ArrowRightLeft,
	BarChart,
	BarChart2,
	BarChart3,
	Banknote,
	Briefcase,
	Building,
	Building2,
	Calendar,
	CheckSquare,
	ChevronDown,
	ChevronRight,
	ClipboardList,
	Coins,
	CreditCard,
	DollarSign,
	Factory,
	FileText,
	Flag,
	Globe,
	Grid3X3,
	Hammer,
	HardHat,
	Home,
	Landmark,
	Layers,
	LayoutDashboard,
	LineChart,
	ListOrdered,
	LogOut,
	Map,
	Menu,
	MessageCircle,
	Package,
	PieChart,
	PiggyBank,
	Plus,
	Receipt,
	Rss,
	Scale,
	ScrollText,
	Search,
	Send,
	Settings,
	ShieldCheck,
	ShoppingBag,
	Target,
	TrendingUp,
	Truck,
	UserCircle,
	Users,
	Wallet,
	Zap,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useFinanceHotkeys } from "@/hooks/use-finance-hotkeys";
import ChatPanel from "@/components/chat-panel";
import {
	CommandPalette,
	useCommandPalette,
	type CommandPaletteItem,
} from "@/components/command-palette";
import { PlanalitycLogo } from "@/components/brand/PlanalitycLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import UserProfileDropdown from "@/components/user-profile-dropdown";
import { useModuleAccess } from "@/hooks/use-module-access";
import { useAuth } from "@/lib/auth";
import { detectModuleFromPath, type ModuleId } from "@/lib/module-access";
import { resolveQuickActions } from "@/lib/quick-create-access";
import { resolveNavItemHref } from "@/lib/nav-hrefs";
import { cn } from "@/lib/utils";

interface NavItem {
	href: string;
	label: string;
	icon: React.ElementType;
}
interface NavSection {
	title: string;
	items: NavItem[];
}
interface Module {
	id: ModuleId;
	label: string;
	shortLabel: string;
	icon: React.ElementType;
	color: string;
	urlPrefix: string[];
	sections: NavSection[];
}

const MODULES: Module[] = [
	{
		id: "construction",
		label: "Контроль строительства",
		shortLabel: "Строительство",
		icon: HardHat,
		color: "#f97316",
		urlPrefix: ["/construction"],
		sections: [
			{
				title: "Управление",
				items: [
					{
						href: "/dashboard?tab=construction",
						label: "Обзор",
						icon: LayoutDashboard,
					},
					{
						href: "/construction/operations",
						label: "Операции",
						icon: ArrowRightLeft,
					},
					{ href: "/construction/projects", label: "Проекты", icon: Map },
					{ href: "/construction/stages", label: "План проекта (WBS)", icon: Flag },
					{ href: "/construction/tasks", label: "Задачи", icon: ClipboardList },
				],
			},
			{
				title: "Ресурсы",
				items: [
					{ href: "/construction/workers", label: "Бригады", icon: Hammer },
					{
						href: "/construction/contractors",
						label: "Подрядчики",
						icon: Briefcase,
					},
					{
						href: "/construction/materials",
						label: "Материалы",
						icon: Package,
					},
				],
			},
			{
				title: "Финансы",
				items: [
					{ href: "/construction/chess", label: "Шахматка", icon: Grid3X3 },
					{
						href: "/construction/contracts-sales",
						label: "Договоры",
						icon: FileText,
					},
					{
						href: "/construction/accruals",
						label: "Начисление",
						icon: ListOrdered,
					},
					{
						href: "/construction/cashier",
						label: "Приём платежей",
						icon: DollarSign,
					},
					{ href: "/construction/accounts", label: "Счета", icon: Landmark },
					{
						href: "/construction/reconciliation",
						label: "Сверка 1С",
						icon: Scale,
					},
					{
						href: "/construction/payroll",
						label: "Зарплатная ведомость",
						icon: Banknote,
					},
				],
			},
			{
				title: "Планалитика",
				items: [
					{
						href: "/construction/analytics/cashflow",
						label: "ОДДС",
						icon: BarChart3,
					},
					{
						href: "/construction/analytics/pnl",
						label: "ОПУ",
						icon: LineChart,
					},
					{
						href: "/construction/analytics/expenses",
						label: "Анализ расходов",
						icon: PieChart,
					},
					{
						href: "/construction/analytics/debt",
						label: "Задолженности",
						icon: AlertTriangle,
					},
					{ href: "/construction/budget", label: "Бюджет", icon: Wallet },
					{
						href: "/construction/planning/forecast",
						label: "Будущие поступления",
						icon: Calendar,
					},
					{
						href: "/construction/planning/overdue",
						label: "Просрочки",
						icon: AlertTriangle,
					},
					{
						href: "/construction/planning/approvals",
						label: "Согласование",
						icon: CheckSquare,
					},
					{
						href: "/construction/planning/broadcast",
						label: "Рассылка",
						icon: Send,
					},
				],
			},
			{
				title: "AI-Инструменты",
				items: [
					{
						href: "/construction/ai/chat",
						label: "Чат по ТЗ",
						icon: MessageCircle,
					},
					{
						href: "/construction/ai/snip-check",
						label: "Проверка СНиП",
						icon: ShieldCheck,
					},
					{
						href: "/construction/ai/tools",
						label: "Генерация документов",
						icon: Zap,
					},
					{
						href: "/construction/ai/photo-report",
						label: "Анализ фото",
						icon: Search,
					},
					{
						href: "/construction/ai/contractor-analytics",
						label: "Анализ подрядчиков",
						icon: BarChart3,
					},
					{ href: "/construction/ai/telegram", label: "Telegram", icon: Send },
					{
						href: "/construction/ai/estimates",
						label: "AI Смета",
						icon: BarChart3,
					},
				],
			},
			{
				title: "Справочники",
				items: [
					{
						href: "/construction/counterparties",
						label: "Контрагенты",
						icon: Users,
					},
					{
						href: "/construction/employees",
						label: "Сотрудники",
						icon: UserCircle,
					},
					{
						href: "/construction/settings",
						label: "Настройки",
						icon: Settings,
					},
				],
			},
		],
	},
	{
		id: "rental",
		label: "Аренда",
		shortLabel: "Аренда",
		icon: Home,
		color: "#3b82f6",
		urlPrefix: ["/rental"],
		sections: [
			{
				title: "Управление",
				items: [
					{ href: "/dashboard?tab=rental", label: "Обзор", icon: BarChart3 },
					{ href: "/rental/properties", label: "Объекты", icon: Building2 },
					{ href: "/rental/tenants", label: "Арендаторы", icon: UserCircle },
					{ href: "/rental/counterparties", label: "Контрагенты", icon: Users },
					{ href: "/rental/contracts", label: "Договоры", icon: FileText },
				],
			},
			{
				title: "Финансы",
				items: [
					{ href: "/rental/accruals", label: "Начисление", icon: ListOrdered },
					{ href: "/rental/payments", label: "Платежи", icon: CreditCard },
					{ href: "/rental/deposits", label: "Депозиты", icon: PiggyBank },
					{ href: "/rental/expenses", label: "Расходы", icon: Receipt },
					{
						href: "/rental/statements",
						label: "Акты собственников",
						icon: ScrollText,
					},
					{
						href: "/rental/accounts",
						label: "Расчётные счета",
						icon: Landmark,
					},
				],
			},
			{
				title: "Аналитика",
				items: [
					{ href: "/rental/analytics/odds", label: "ОДДС", icon: BarChart3 },
					{ href: "/rental/analytics/plan-fact", label: "План-факт", icon: TrendingUp },
					{ href: "/rental/analytics/opu", label: "ОПУ", icon: LineChart },
					{
						href: "/rental/analytics/debt",
						label: "Задолженность",
						icon: AlertTriangle,
					},
					{
						href: "/rental/analytics/history",
						label: "История платежей",
						icon: Activity,
					},
					{
						href: "/rental/analytics/owners",
						label: "Отчёты владельцев",
						icon: ScrollText,
					},
					{
						href: "/rental/analytics/summary",
						label: "Сводный отчёт",
						icon: PieChart,
					},
				],
			},
			{
				title: "Владельцы",
				items: [
					{ href: "/rental/investors", label: "Владельцы", icon: Users },
					{
						href: "/rental/distributions",
						label: "Распределение",
						icon: Coins,
					},
				],
			},
			{
				title: "Планирование",
				items: [
					{
						href: "/rental/planning/forecast",
						label: "Будущие поступления",
						icon: Calendar,
					},
					{
						href: "/rental/planning/overdue",
						label: "Просрочки",
						icon: AlertTriangle,
					},
					{ href: "/rental/planning/broadcast", label: "Рассылка", icon: Send },
				],
			},
			{
				title: "Администратор",
				items: [
					{ href: "/rental/employees", label: "Сотрудники", icon: UserCircle },
					{ href: "/rental/admin/log", label: "Лог операций", icon: Activity },
					{ href: "/rental/settings", label: "Настройки", icon: Settings },
				],
			},
		],
	},
	{
		id: "proptech",
		label: "CRM / Продажи",
		shortLabel: "CRM",
		icon: Target,
		color: "#8b5cf6",
		urlPrefix: ["/proptech", "/sales", "/crm"],
		sections: [
			{
				title: "CRM",
				items: [
					{
						href: "/dashboard?tab=sales",
						label: "Обзор",
						icon: LayoutDashboard,
					},
					{ href: "/crm/leads", label: "Лиды", icon: Target },
					{ href: "/crm/leads/intake", label: "Приём лидов", icon: Rss },
					{ href: "/crm/clients", label: "Клиенты", icon: Users },
					{ href: "/crm/employees", label: "Сотрудники", icon: Users },
					{ href: "/crm/counterparties", label: "Контрагенты", icon: Briefcase },
					{ href: "/crm/deals", label: "Сделки", icon: TrendingUp },
					{ href: "/crm/contracts-sales", label: "Договоры", icon: FileText },
					{
						href: "/crm/chess",
						label: "Шахматка",
						icon: Grid3X3,
					},
				],
			},
		],
	},
	{
		id: "warehouse",
		label: "Закуп / Снабжение",
		shortLabel: "Закуп",
		icon: ShoppingBag,
		color: "#10b981",
		urlPrefix: ["/warehouse"],
		sections: [
			{
				title: "Управление",
				items: [
					{
						href: "/dashboard?tab=supply",
						label: "Обзор",
						icon: LayoutDashboard,
					},
					{ href: "/warehouse/suppliers", label: "Поставщики", icon: Factory },
					{ href: "/warehouse/items", label: "Товары", icon: ShoppingBag },
					{
						href: "/warehouse/marketplace",
						label: "Маркетплейс",
						icon: Package,
					},
					{ href: "/warehouse/orders", label: "Заказы", icon: ClipboardList },
					{ href: "/warehouse/companies", label: "Компании", icon: Building },
					{
						href: "/warehouse/requests",
						label: "Заявки прорабов",
						icon: Target,
					},
					{
						href: "/warehouse/approvals",
						label: "Согласования",
						icon: ShieldCheck,
					},
				],
			},
			{
				title: "Склад",
				items: [
					{ href: "/warehouse/incoming", label: "Поступления", icon: Truck },
					{
						href: "/warehouse/outgoing",
						label: "Списания / выдача",
						icon: Layers,
					},
					{
						href: "/warehouse/inventory",
						label: "Инвентаризация",
						icon: Scale,
					},
				],
			},
			{
				title: "Финансы и отчёты",
				items: [
					{
						href: "/warehouse/costs",
						label: "Стоимость запасов",
						icon: Wallet,
					},
					{ href: "/warehouse/reports", label: "Отчёты", icon: BarChart },
				],
			},
			{
				title: "Справочники",
				items: [
					{
						href: "/warehouse/counterparties",
						label: "Контрагенты",
						icon: Users,
					},
					{ href: "/warehouse/settings", label: "Настройки", icon: Settings },
				],
			},
		],
	},
	{
		id: "consolidated",
		label: "Сводное",
		shortLabel: "Сводное",
		icon: Globe,
		color: "#6b7280",
		urlPrefix: [
			"/dashboard",
			"/counterparties",
			"/properties",
			"/users",
			"/settings",
			"/design-system",
			"/import",
			"/activity",
			"/companies",
			"/reports",
		],
		sections: [
			{
				title: "Главная",
				items: [
					{ href: "/dashboard?tab=control", label: "Обзор", icon: LayoutDashboard },
					{ href: "/properties", label: "Объекты", icon: Building2 },
					{
						href: "/properties/chess",
						label: "Шахматка объектов",
						icon: Grid3X3,
					},
					{ href: "/counterparties", label: "Все контрагенты", icon: Users },
					{ href: "/companies", label: "Компании", icon: Building },
					{ href: "/users", label: "Пользователи", icon: UserCircle },
					{
						href: "/design-system",
						label: "Дизайн-система",
						icon: Layers,
					},
				],
			},
			{
				title: "Отчёты",
				items: [
					{
						href: "/reports/directions",
						label: "Расчёты с контрагентами",
						icon: BarChart3,
					},
					{
						href: "/reports/debt",
						label: "Задолженность",
						icon: AlertTriangle,
					},
					{
						href: "/reports/cashflow",
						label: "Денежный поток",
						icon: BarChart3,
					},
					{ href: "/reports/rental", label: "Сводка аренды", icon: BarChart2 },
					{
						href: "/reports/payments",
						label: "История платежей",
						icon: Activity,
					},
				],
			},
		],
	},
];

function getModuleEntryHref(mod: Module): string {
	if (mod.id === "consolidated") {
		return "/dashboard?tab=control";
	}
	for (const section of mod.sections) {
		for (const item of section.items) {
			if (!item.href.startsWith("/dashboard")) {
				return item.href;
			}
		}
	}
	return mod.sections[0]?.items[0]?.href || "/dashboard";
}

function detectModule(path: string): ModuleId {
	return detectModuleFromPath(path);
}

interface SectionGroupProps {
	section: NavSection;
	location: string;
	moduleId: ModuleId;
	role: string;
	permissions: string[];
	allowedModules: ModuleId[];
	defaultOpen?: boolean;
}

function navItemMatches(location: string, href: string): boolean {
	if (location === href) return true;
	if (href.includes("?")) {
		const q = href.indexOf("?");
		const hrefPath = href.slice(0, q);
		const locQ = location.indexOf("?");
		const locPath = locQ === -1 ? location : location.slice(0, locQ);
		if (hrefPath !== locPath) return false;
		const hrefParams = new URLSearchParams(href.slice(q + 1));
		const locParams = new URLSearchParams(locQ === -1 ? "" : location.slice(locQ + 1));
		for (const [key, value] of hrefParams) {
			if (locParams.get(key) !== value) return false;
		}
		return true;
	}
	return location.startsWith(`${href}/`);
}

function SectionGroup({
	section,
	location,
	moduleId,
	role,
	permissions,
	allowedModules,
	defaultOpen,
}: SectionGroupProps) {
	const items = section.items.map((item) => ({
		...item,
		href: resolveNavItemHref(item, moduleId, role, permissions, allowedModules),
	}));
	const matchingItems = items.filter((i) =>
		navItemMatches(location, i.href),
	);
	const bestMatch = matchingItems.sort(
		(a, b) => b.href.length - a.href.length,
	)[0];
	const isActive = !!bestMatch;
	const [open, setOpen] = useState(isActive || !!defaultOpen);

	return (
		<div className="mb-1">
			<button
				onClick={() => setOpen((o) => !o)}
				className="w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-semibold text-white/30 hover:text-white/50 uppercase tracking-wider transition-colors"
			>
				{section.title}
				{open ? (
					<ChevronDown className="w-3 h-3" />
				) : (
					<ChevronRight className="w-3 h-3" />
				)}
			</button>
			{open && (
				<div className="ml-1 space-y-0.5">
					{items.map((item) => {
						// Only mark as active if this is the most specific match
						const active = bestMatch?.href === item.href;
						const Icon = item.icon;
						return (
							<Link key={item.href} href={item.href}>
								<div
									className={cn(
										"flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer transition-all duration-150 group",
										active
											? "bg-indigo-600 text-white shadow-sm"
											: "text-white/60 hover:text-white hover:bg-white/8",
									)}
								>
									<Icon
										className={cn(
											"w-3.5 h-3.5 flex-shrink-0",
											active
												? "text-white"
												: "text-white/40 group-hover:text-white/70",
										)}
									/>
									<span className="truncate">{item.label}</span>
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}

export function Layout({ children }: { children: ReactNode }) {
	const { user, logout } = useAuth();
	const [location, setLocation] = useLocation();
	const search = useSearch();
	const pathWithSearch = search
		? `${location}${search.startsWith("?") ? search : `?${search}`}`
		: location;
	const { allowedModules, homePath, canAccess, isLoading: accessLoading, role, permissions } =
		useModuleAccess();
	const [modulePickerOpen, setModulePickerOpen] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
	useFinanceHotkeys(!!user);
	const modulePickerRef = useRef<HTMLDivElement>(null);
	const createRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				modulePickerRef.current &&
				!modulePickerRef.current.contains(e.target as Node)
			) {
				setModulePickerOpen(false);
			}
			if (createRef.current && !createRef.current.contains(e.target as Node)) {
				setCreateOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const visibleModules = MODULES.filter((m) =>
		allowedModules.includes(m.id),
	);

	useEffect(() => {
		if (accessLoading || !user) return;
		if (!canAccess(pathWithSearch)) {
			setLocation(homePath);
		}
	}, [accessLoading, user, pathWithSearch, canAccess, homePath, setLocation]);

	const activeModuleId = detectModule(pathWithSearch);
	const activeModule =
		visibleModules.find((m) => m.id === activeModuleId) ||
		visibleModules[0] ||
		MODULES.find((m) => m.id === activeModuleId) ||
		MODULES[MODULES.length - 1];
	const ModuleIcon = activeModule.icon;
	const quickActions = useMemo(
		() =>
			resolveQuickActions(
				activeModule.id,
				role,
				permissions,
				allowedModules,
			),
		[activeModule.id, role, permissions, allowedModules],
	);
	const showQuickCreate = quickActions.length > 0;
	const showModuleSwitcher = visibleModules.length > 1;

	const initials =
		user?.firstName && user?.lastName
			? (user.firstName[0] + user.lastName[0]).toUpperCase()
			: user?.firstName
				? user.firstName.slice(0, 2).toUpperCase()
				: user?.email?.slice(0, 2).toUpperCase() || "??";

	const displayName =
		user?.firstName && user?.lastName
			? `${user.firstName} ${user.lastName}`
			: user?.firstName || "Загрузка...";

	const displayEmail = user?.email || "...";

	const commandItems = useMemo((): CommandPaletteItem[] => {
		const items: CommandPaletteItem[] = [];
		for (const mod of visibleModules) {
			for (const section of mod.sections) {
				for (const item of section.items) {
					const href = resolveNavItemHref(
						item,
						mod.id,
						role,
						permissions,
						allowedModules,
					);
					items.push({
						id: `${mod.id}-${section.title}-${item.href}`,
						label: item.label,
						href,
						group: `${mod.shortLabel} · ${section.title}`,
						keywords: section.title,
					});
				}
			}
		}
		return items;
	}, [visibleModules, role, permissions, allowedModules]);

	useEffect(() => {
		setMobileNavOpen(false);
	}, [pathWithSearch]);

	const adminRoles = new Set(["company_admin", "admin", "super_admin"]);
	const isAdminUser = adminRoles.has(String((user as { role?: string })?.role ?? role));

	return (
		<div
			className="flex h-screen overflow-hidden"
			style={{ background: "#F7F8FC" }}
		>
			{mobileNavOpen && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-black/40 md:hidden"
					aria-label="Закрыть меню"
					onClick={() => setMobileNavOpen(false)}
				/>
			)}

			<CommandPalette
				open={commandOpen}
				onOpenChange={setCommandOpen}
				items={commandItems}
			/>

			{/* ───── SIDEBAR ───── */}
			<aside
				className={cn(
					"w-[220px] flex-shrink-0 flex flex-col overflow-hidden z-50",
					"fixed md:relative inset-y-0 left-0 transition-transform duration-200",
					mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
				)}
				style={{
					background: "linear-gradient(180deg, #0B1020 0%, #121A33 100%)",
				}}
			>
				{/* Logo */}
				<div className="px-4 py-4 border-b border-white/10">
					<PlanalitycLogo variant="sidebar" />
				</div>

				{/* Nav */}
				<nav
					className="flex-1 overflow-y-auto py-3 px-3 space-y-2 scrollbar-thin"
					style={{ scrollbarColor: "#ffffff12 transparent" }}
				>
					{(() => {
						const userRole = (user as { role?: string })?.role;
						const isPtoRole = userRole === "pto" || userRole === "engineer";
						let sections = activeModule.sections;
						if (isPtoRole && activeModule.id === "construction") {
							sections = sections.filter((s) =>
								["Управление", "Ресурсы"].includes(s.title),
							);
						}
						if (!isAdminUser) {
							sections = sections.filter((s) => s.title !== "AI-Инструменты");
						}
						return sections.map((section, i) => (
							<SectionGroup
								key={section.title}
								section={section}
								location={pathWithSearch}
								moduleId={activeModule.id}
								role={role}
								permissions={permissions}
								allowedModules={allowedModules}
								defaultOpen={
									section.title === "AI-Инструменты" ? false : i === 0
								}
							/>
						));
					})()}
				</nav>

				{/* Quick create — отдельная панель, чтобы не путать с разделами меню */}
				{showQuickCreate && (
					<div className="px-3 pb-3 pt-2 border-t border-white/10">
						<div
							className="rounded-xl px-2 py-2.5 border border-indigo-400/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
							style={{
								background:
									"linear-gradient(165deg, rgba(30, 41, 89, 0.92) 0%, rgba(20, 28, 58, 0.95) 100%)",
							}}
						>
							<div className="flex items-center gap-1.5 px-1 mb-1.5">
								<Zap className="w-3 h-3 text-indigo-400/90" />
								<span className="text-[10px] font-semibold text-indigo-200/70 uppercase tracking-wider">
									Быстрое создание
								</span>
							</div>
							{quickActions.map((qa) => (
								<Link key={qa.href} href={qa.href}>
									<div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-white/55 hover:text-white hover:bg-indigo-500/20 text-[12px] cursor-pointer transition-all">
										<Plus className="w-3 h-3 text-indigo-400 flex-shrink-0" />
										{qa.label}
									</div>
								</Link>
							))}
						</div>
					</div>
				)}

				{/* User */}
				<div className="px-3 py-3 border-t border-white/10">
					<div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/8 transition-all cursor-pointer group">
						<div
							className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
							style={{ background: "#4F46E5" }}
						>
							{initials}
						</div>
						<div className="flex-1 min-w-0">
							<div className="text-white text-[12px] font-medium truncate leading-none">
								{displayName}
							</div>
							<div className="text-white/40 text-[10px] truncate mt-0.5">
								{displayEmail}
							</div>
						</div>
						<button
							onClick={logout}
							className="opacity-0 group-hover:opacity-100 transition-opacity"
						>
							<LogOut className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
						</button>
					</div>
				</div>
			</aside>

			{/* ───── MAIN AREA ───── */}
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				{/* ── TOP HEADER ── */}
				<header className="h-14 bg-white border-b border-gray-100 flex items-center px-3 md:px-5 gap-2 md:gap-3 flex-shrink-0 relative z-50 shadow-sm">
					<button
						type="button"
						className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
						aria-label="Открыть меню"
						onClick={() => setMobileNavOpen(true)}
					>
						<Menu className="w-5 h-5" />
					</button>

					{/* Module switcher */}
					{showModuleSwitcher ? (
						<div className="relative" ref={modulePickerRef}>
							<button
								onClick={() => setModulePickerOpen((o) => !o)}
								className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 bg-white transition-all whitespace-nowrap"
							>
								<ModuleIcon
									className="w-4 h-4 flex-shrink-0"
									style={{ color: activeModule.color }}
								/>
								<span>{activeModule.shortLabel}</span>
								<ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
							</button>
							{modulePickerOpen && (
								<div
									className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-xl py-1 overflow-hidden"
									style={{ zIndex: 9999, minWidth: "210px" }}
								>
									{visibleModules.map((m) => {
										const Icon = m.icon;
										const moduleHref = getModuleEntryHref(m);
										return (
											<Link key={m.id} href={moduleHref}>
												<div
													className={cn(
														"flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors whitespace-nowrap",
														m.id === activeModule.id
															? "bg-indigo-50 text-indigo-900"
															: "hover:bg-gray-50 text-gray-900",
													)}
													onClick={() => setModulePickerOpen(false)}
												>
													<Icon
														className="w-4 h-4 flex-shrink-0"
														style={{ color: m.color }}
													/>
													{m.label}
												</div>
											</Link>
										);
									})}
								</div>
							)}
						</div>
					) : (
						<div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 whitespace-nowrap">
							<ModuleIcon
								className="w-4 h-4 flex-shrink-0"
								style={{ color: activeModule.color }}
							/>
							<span>{activeModule.shortLabel}</span>
						</div>
					)}

					{/* Search / command palette */}
					<button
						type="button"
						onClick={() => setCommandOpen(true)}
						className="flex-1 max-w-lg relative hidden sm:flex items-center w-full pl-9 pr-14 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 text-left text-gray-500 transition-all"
					>
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
						<span>Поиск по проектам, контрагентам, договорам…</span>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
							⌘W
						</span>
					</button>
					<button
						type="button"
						className="sm:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
						aria-label="Поиск"
						onClick={() => setCommandOpen(true)}
					>
						<Search className="w-5 h-5" />
					</button>

					<div className="flex-1" />

					{/* Create button */}
					{showQuickCreate && (
						<div className="relative" ref={createRef}>
							<button
								onClick={() => setCreateOpen((o) => !o)}
								className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md whitespace-nowrap bg-amber-500 hover:bg-amber-600"
							>
								<Plus className="w-4 h-4" />
								Создать
								<ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
							</button>
							{createOpen && (
								<div
									className="absolute top-full right-0 mt-1 w-52 bg-white rounded-xl border border-gray-100 shadow-xl py-1"
									style={{ zIndex: 9999 }}
								>
									{quickActions.map((qa) => (
										<Link key={qa.href} href={qa.href}>
											<div
												className="px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
												onClick={() => setCreateOpen(false)}
											>
												{qa.label}
											</div>
										</Link>
									))}
								</div>
							)}
						</div>
					)}

					{/* Notifications */}
					<NotificationBell />
					{/* <NotificationsPanel /> */}

					{/* Messages */}
					<ChatPanel />

					{/* Divider */}
					<div className="w-px h-6 bg-gray-100" />

					{/* User profile */}
					<UserProfileDropdown />
				</header>

				{/* ── CONTENT ── */}
				<main className="flex-1 overflow-y-auto">
					<div className="p-6">{children}</div>
				</main>
			</div>
		</div>
	);
}
