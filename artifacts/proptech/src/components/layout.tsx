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
	CircleHelp,
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
	Pin,
	PinOff,
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
import { getModuleDefinition } from "@/lib/module-registry";
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

const moduleMeta = (id: ModuleId) => getModuleDefinition(id)!;

const MODULES: Module[] = [
	{
		id: "construction",
		label: moduleMeta("construction").label,
		shortLabel: moduleMeta("construction").shortLabel,
		icon: Grid3X3,
		color: "#0ea5e9",
		urlPrefix: moduleMeta("construction").routePrefixes,
		sections: [
			{
				title: "Главный поток",
				items: [
					{
						href: "/dashboard?tab=construction",
						label: "Обзор",
						icon: LayoutDashboard,
					},
					{
						href: "/construction/projects",
						label: "Проект / ЖК",
						icon: Building2,
					},
					{ href: "/construction/chess", label: "Шахматка", icon: Grid3X3 },
					{
						href: "/construction/contracts-sales",
						label: "Договоры продаж",
						icon: FileText,
					},
					{
						href: "/construction/accruals",
						label: "Начисления",
						icon: ListOrdered,
					},
					{
						href: "/construction/cashier",
						label: "Приём платежей",
						icon: DollarSign,
					},
					{
						href: "/construction/reconciliation",
						label: "Акт сверки",
						icon: Scale,
					},
				],
			},
			{
				title: "Себестоимость",
				items: [
					{ href: "/construction/budget", label: "Бюджет и план/факт", icon: Wallet },
					{ href: "/construction/stages", label: "Этапы WBS", icon: Flag },
					{ href: "/construction/tasks", label: "Задачи", icon: ClipboardList },
					{
						href: "/construction/operations",
						label: "Операции",
						icon: ArrowRightLeft,
					},
					{
						href: "/construction/materials",
						label: "Материалы",
						icon: Package,
					},
					{
						href: "/construction/contractors",
						label: "Подрядчики",
						icon: Briefcase,
					},
				],
			},
			{
				title: "Производство",
				items: [
					{ href: "/construction/workers", label: "Бригады", icon: Hammer },
					{
						href: "/construction/planning/broadcast",
						label: "Рассылка",
						icon: Send,
					},
				],
			},
			{
				title: "AI и документы",
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
				title: "Настройки",
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
					{
						href: "/construction/help",
						label: "Помощь",
						icon: CircleHelp,
					},
				],
			},
		],
	},
	{
		id: "finance",
		label: moduleMeta("finance").label,
		shortLabel: moduleMeta("finance").shortLabel,
		icon: Wallet,
		color: "#0891b2",
		urlPrefix: moduleMeta("finance").routePrefixes,
		sections: [
			{
				title: "Обзор и операции",
				items: [
					{ href: "/dashboard?tab=finance", label: "Обзор", icon: LayoutDashboard },
					{ href: "/construction/accounts", label: "Счета", icon: Landmark },
					{
						href: "/construction/operations",
						label: "Операции",
						icon: ArrowRightLeft,
					},
					{ href: "/construction/budget", label: "Бюджет и план/факт", icon: Wallet },
					{
						href: "/construction/payroll",
						label: "Зарплатная ведомость",
						icon: Banknote,
					},
				],
			},
			{
				title: "Договоры и платежи",
				items: [
					{
						href: "/construction/accruals",
						label: "Начисления",
						icon: ListOrdered,
					},
					{
						href: "/construction/cashier",
						label: "Приём платежей",
						icon: DollarSign,
					},
					{
						href: "/construction/reconciliation",
						label: "Акт сверки",
						icon: Scale,
					},
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
				],
			},
			{
				title: "Финансовая аналитика",
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
					{
						href: "/reports/cashflow",
						label: "Сводный ДДС",
						icon: BarChart3,
					},
					{
						href: "/reports/payments",
						label: "История платежей",
						icon: Activity,
					},
				],
			},
		],
	},
	{
		id: "rental",
		label: moduleMeta("rental").label,
		shortLabel: moduleMeta("rental").shortLabel,
		icon: Home,
		color: "#14b8a6",
		urlPrefix: moduleMeta("rental").routePrefixes,
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
					{ href: "/rental/help", label: "Помощь", icon: CircleHelp },
				],
			},
		],
	},
	{
		id: "proptech",
		label: moduleMeta("proptech").label,
		shortLabel: moduleMeta("proptech").shortLabel,
		icon: Target,
		color: "#2563eb",
		urlPrefix: moduleMeta("proptech").routePrefixes,
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
					{
						href: "/crm/client-relations",
						label: "Клиентский сервис",
						icon: MessageCircle,
					},
					{
						href: "/crm/help",
						label: "Помощь",
						icon: CircleHelp,
					},
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
		label: moduleMeta("warehouse").label,
		shortLabel: moduleMeta("warehouse").shortLabel,
		icon: ShoppingBag,
		color: "#0f766e",
		urlPrefix: moduleMeta("warehouse").routePrefixes,
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
					{ href: "/warehouse/help", label: "Помощь", icon: CircleHelp },
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
		label: moduleMeta("consolidated").label,
		shortLabel: moduleMeta("consolidated").shortLabel,
		icon: Globe,
		color: "#6b7280",
		urlPrefix: moduleMeta("consolidated").routePrefixes,
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
	return mod.sections[0]?.items[0]?.href || "/dashboard";
}

function detectModule(path: string): ModuleId {
	return detectModuleFromPath(path);
}

function getDashboardTabLabel(path: string): string | null {
	if (!path.startsWith("/dashboard")) return null;
	const queryIndex = path.indexOf("?");
	if (queryIndex === -1) return "Сводное";
	const tab = new URLSearchParams(path.slice(queryIndex + 1)).get("tab");
	const labels: Record<string, string> = {
		control: "Сводное",
		construction: "Стройка",
		finance: "Финансы",
		supply: "Закуп",
		sales: "Продажи",
		rental: "Аренда",
		investors: "Инвесторы",
		analytics: "Аналитика",
	};
	return tab ? labels[tab] || null : "Сводное";
}

interface SectionGroupProps {
	section: NavSection;
	location: string;
	moduleId: ModuleId;
	role: string;
	permissions: string[];
	allowedModules: ModuleId[];
	open: boolean;
	collapsed?: boolean;
	onToggle: () => void;
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
	open,
	collapsed = false,
	onToggle,
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
	const isActiveSection = !!bestMatch;

	return (
		<div
			title={collapsed ? section.title : undefined}
			className={cn(
				"rounded-2xl border transition-all duration-200",
				collapsed && "border-transparent",
				open
					? "border-cyan-400/18 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
					: "border-transparent",
			)}
		>
			<button
				onClick={onToggle}
				className={cn(
					"w-full flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
					collapsed && "justify-center px-2",
					open || isActiveSection
						? "text-cyan-100"
						: "text-white/35 hover:text-white/65",
				)}
			>
				{collapsed ? (
					<span className="h-1.5 w-1.5 rounded-full bg-current" />
				) : (
					<span className="truncate">{section.title}</span>
				)}
				{!collapsed && (open ? (
					<ChevronDown className="w-3.5 h-3.5 text-cyan-300" />
				) : (
					<ChevronRight className="w-3.5 h-3.5 text-white/30" />
				))}
			</button>
			{open && (
				<div className={cn("space-y-1 px-2 pb-2", collapsed && "px-0")}>
					{items.map((item) => {
						// Only mark as active if this is the most specific match
						const active = bestMatch?.href === item.href;
						const Icon = item.icon;
						return (
							<Link key={item.href} href={item.href}>
								<div
									className={cn(
										"flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] cursor-pointer transition-all duration-150 group",
										collapsed && "justify-center px-2",
										active
											? "bg-cyan-500 text-white shadow-lg shadow-cyan-950/20"
											: "text-white/58 hover:text-white hover:bg-white/[0.075]",
									)}
									title={collapsed ? item.label : undefined}
								>
									<Icon
										className={cn(
											"w-3.5 h-3.5 flex-shrink-0",
											active
												? "text-white"
												: "text-white/35 group-hover:text-cyan-200",
										)}
									/>
									{!collapsed && <span className="truncate">{item.label}</span>}
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
	const [createOpen, setCreateOpen] = useState(false);
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const [sidebarPinned, setSidebarPinned] = useState(
		() => localStorage.getItem("planalityc_sidebar_pinned") === "1",
	);
	const [sidebarHovered, setSidebarHovered] = useState(false);
	const [openSectionTitle, setOpenSectionTitle] = useState<string | null>(null);
	const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
	useFinanceHotkeys(!!user);
	const createRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		localStorage.setItem("planalityc_sidebar_pinned", sidebarPinned ? "1" : "0");
	}, [sidebarPinned]);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (createRef.current && !createRef.current.contains(e.target as Node)) {
				setCreateOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const allowedVisibleModules = MODULES.filter((m) =>
		allowedModules.includes(m.id),
	);
	const businessModules = allowedVisibleModules.filter((m) => m.id !== "consolidated");
	const activeModuleId = detectModule(pathWithSearch);
	const visibleModules =
		businessModules.length <= 1 && activeModuleId !== "consolidated"
			? businessModules
			: allowedVisibleModules;

	useEffect(() => {
		if (accessLoading || !user) return;
		if (!canAccess(pathWithSearch)) {
			setLocation(homePath);
		}
	}, [accessLoading, user, pathWithSearch, canAccess, homePath, setLocation]);

	const activeModule =
		allowedVisibleModules.find((m) => m.id === activeModuleId) ||
		allowedVisibleModules[0] ||
		MODULES.find((m) => m.id === activeModuleId) ||
		MODULES[MODULES.length - 1];
	const ModuleIcon = activeModule.icon;
	const activeModuleShortLabel =
		getDashboardTabLabel(pathWithSearch) || activeModule.shortLabel;
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
	const sidebarCollapsed = !sidebarPinned && !sidebarHovered;
	const showModuleSwitcher = visibleModules.length > 1;
	const adminRoles = new Set(["company_admin", "admin", "super_admin"]);
	const isAdminUser = adminRoles.has(String((user as { role?: string })?.role ?? role));

	const navSections = useMemo(() => {
		const userRole = (user as { role?: string })?.role;
		const isPtoRole = userRole === "pto" || userRole === "engineer";
		let sections = activeModule.sections;
		if (isPtoRole && activeModule.id === "construction") {
			sections = sections.filter((s) =>
				["Главный поток", "Себестоимость"].includes(s.title),
			);
		}
		if (!isAdminUser) {
			sections = sections.filter(
				(s) => !["AI-Инструменты", "AI и документы"].includes(s.title),
			);
		}
		return sections;
	}, [activeModule, user, isAdminUser]);

	useEffect(() => {
		const activeSection = navSections.find((section) =>
			section.items.some((item) => {
				const href = resolveNavItemHref(
					item,
					activeModule.id,
					role,
					permissions,
					allowedModules,
				);
				return navItemMatches(pathWithSearch, href);
			}),
		);
		setOpenSectionTitle(activeSection?.title ?? navSections[0]?.title ?? null);
		// Sync the sidebar only when navigation context changes. Manual section
		// toggles should not be immediately overwritten by array identity changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeModule.id, pathWithSearch]);

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

	return (
		<div
			className="flex h-screen overflow-hidden"
			style={{ background: "#F5F8FA" }}
		>
			{/* Skip link для accessibility */}
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-cyan-700 focus:text-white focus:rounded-lg focus:shadow-lg"
			>
				Перейти к основному содержанию
			</a>

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
				onMouseEnter={() => setSidebarHovered(true)}
				onMouseLeave={() => setSidebarHovered(false)}
				className={cn(
					"flex-shrink-0 flex flex-col overflow-hidden z-50",
					"fixed md:relative inset-y-0 left-0 transition-transform duration-200",
					sidebarCollapsed ? "md:w-[72px]" : "md:w-[244px]",
					"w-[244px]",
					mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
				)}
				style={{
					background:
						"radial-gradient(circle at 20% 0%, rgba(34,211,238,0.28), transparent 28%), radial-gradient(circle at 105% 18%, rgba(16,185,129,0.18), transparent 30%), linear-gradient(145deg, #020617 0%, #062032 46%, #07111f 100%)",
				}}
			>
				{/* Logo */}
				<div
					className={cn(
						"border-b border-white/8",
						sidebarCollapsed ? "px-3 py-4" : "px-4 py-4",
					)}
				>
					<div className={cn("flex items-center", sidebarCollapsed ? "flex-col justify-center gap-2" : "justify-between gap-2")}>
						<PlanalitycLogo
							variant={sidebarCollapsed ? "mark" : "sidebar"}
							className={sidebarCollapsed ? "h-9 w-9" : undefined}
						/>
						<button
							type="button"
							onClick={() => setSidebarPinned((p) => !p)}
							title={sidebarPinned ? "Свернуть меню" : "Закрепить меню"}
							className={cn(
								"hidden h-8 w-8 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/10 hover:text-white md:flex",
								sidebarCollapsed && "h-7 w-7 bg-white/5",
							)}
						>
							{sidebarPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
						</button>
					</div>
				</div>

				{/* Nav */}
				<nav
					className="flex-1 overflow-y-auto py-3 px-3 space-y-2.5 scrollbar-thin"
					style={{ scrollbarColor: "#ffffff12 transparent" }}
				>
					{navSections.map((section) => (
						<SectionGroup
							key={section.title}
							section={section}
							location={pathWithSearch}
							moduleId={activeModule.id}
							role={role}
							permissions={permissions}
							allowedModules={allowedModules}
							open={openSectionTitle === section.title}
							collapsed={sidebarCollapsed}
							onToggle={() =>
								setOpenSectionTitle((current) =>
									current === section.title ? null : section.title,
								)
							}
						/>
					))}
				</nav>

				{/* Quick create — отдельная панель, чтобы не путать с разделами меню */}
				{showQuickCreate && (
					<div className="px-3 pb-3 pt-2 border-t border-white/8">
						{sidebarCollapsed ? (
							<div className="flex flex-col items-center gap-1">
								{quickActions.slice(0, 4).map((qa) => (
									<Link key={qa.href} href={qa.href}>
										<div
											title={qa.label}
											className="flex h-10 w-10 items-center justify-center rounded-2xl text-cyan-300 hover:bg-cyan-500/14 hover:text-white"
										>
											<Plus className="h-4 w-4" />
										</div>
									</Link>
								))}
							</div>
						) : (
						<div
							className="rounded-lg px-2.5 py-3 border border-cyan-400/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
							style={{
								background:
									"linear-gradient(165deg, rgba(8, 47, 73, 0.78) 0%, rgba(12, 28, 42, 0.94) 100%)",
							}}
						>
							<div className="flex items-center gap-1.5 px-1 mb-1.5">
								<Zap className="w-3 h-3 text-cyan-300/90" />
								<span className="text-[10px] font-semibold text-cyan-100/70 uppercase tracking-wider">
									Быстрое создание
								</span>
							</div>
							{quickActions.map((qa) => (
								<Link key={qa.href} href={qa.href}>
									<div className="flex items-center gap-2 px-2 py-2 rounded-xl text-white/58 hover:text-white hover:bg-cyan-500/14 text-[12px] cursor-pointer transition-all">
										<Plus className="w-3 h-3 text-cyan-300 flex-shrink-0" />
										{qa.label}
									</div>
								</Link>
							))}
						</div>
						)}
					</div>
				)}

				{/* User */}
				<div className="px-3 py-3 border-t border-white/8">
					<div className="flex items-center gap-2.5 px-2 py-2 rounded-2xl hover:bg-white/8 transition-all cursor-pointer group">
						<div
							className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
							style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)" }}
						>
							{initials}
						</div>
						<div className={cn("flex-1 min-w-0", sidebarCollapsed && "hidden")}>
							<div className="text-white text-[12px] font-medium truncate leading-none">
								{displayName}
							</div>
							<div className="text-white/40 text-[10px] truncate mt-0.5">
								{displayEmail}
							</div>
						</div>
						<button
							onClick={logout}
							className={cn("opacity-0 group-hover:opacity-100 transition-opacity", sidebarCollapsed && "hidden")}
						>
							<LogOut className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
						</button>
					</div>
				</div>
			</aside>

			{/* ───── MAIN AREA ───── */}
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				{/* ── TOP HEADER ── */}
				<header className="min-h-16 border-b border-white/70 bg-white/62 backdrop-blur-2xl flex items-center px-3 md:px-5 gap-2 md:gap-3 flex-shrink-0 relative z-50 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
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
						<div
							className="relative flex-shrink-0"
						>
							<button
								type="button"
								className="flex lg:hidden items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 bg-white transition-all whitespace-nowrap"
								title={activeModule.label}
							>
								<ModuleIcon
									className="w-4 h-4 flex-shrink-0"
									style={{ color: activeModule.color }}
								/>
								<span>{activeModuleShortLabel}</span>
								<ChevronDown className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
							</button>
							<div className="relative hidden lg:flex items-center gap-1 rounded-[26px] border border-white/80 bg-white/76 p-1.5 shadow-[0_22px_60px_-34px_rgba(8,47,73,0.65)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-x-5 before:-top-px before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-300/80 before:to-transparent">
								{visibleModules.map((m) => {
									const Icon = m.icon;
									const active = m.id === activeModule.id;
									return (
										<Link key={m.id} href={getModuleEntryHref(m)}>
											<div
												className={cn(
													"group relative flex h-11 items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-200",
														active
															? "min-w-[142px] gap-2 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.24),transparent_34%),linear-gradient(135deg,#020617_0%,#082f49_58%,#0f766e_100%)] px-4 text-white shadow-[0_18px_34px_-22px_rgba(8,145,178,0.95)] ring-1 ring-cyan-200/20"
															: "w-11 text-slate-500 hover:-translate-y-0.5 hover:bg-white/90 hover:text-slate-950 hover:shadow-sm",
												)}
												title={m.label}
											>
												{active && (
													<span className="pointer-events-none absolute inset-x-4 -bottom-1 h-1 rounded-full bg-cyan-300/80 blur-[1px]" />
												)}
												<Icon
													className={cn("h-[18px] w-[18px] flex-shrink-0", active && "drop-shadow-[0_0_10px_rgba(103,232,249,0.65)]")}
													style={{ color: active ? "#67e8f9" : m.color }}
												/>
												{active && (
													<span className="truncate">
														{m.id === activeModule.id
															? activeModuleShortLabel
															: m.shortLabel}
													</span>
												)}
												{!active && (
													<span className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-200/80 bg-white/96 px-2.5 py-1.5 text-xs font-semibold text-slate-700 opacity-0 shadow-xl shadow-slate-950/12 backdrop-blur transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
														{m.shortLabel}
													</span>
												)}
											</div>
										</Link>
									);
								})}
							</div>
						</div>
					) : (
						<div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 whitespace-nowrap">
							<ModuleIcon
								className="w-4 h-4 flex-shrink-0"
								style={{ color: activeModule.color }}
							/>
							<span>{activeModuleShortLabel}</span>
						</div>
					)}

					{/* Search / command palette */}
					<button
						type="button"
						onClick={() => setCommandOpen(true)}
							className="relative hidden min-w-0 max-w-[820px] flex-1 items-center rounded-[22px] border border-white/80 bg-white/66 py-3 pl-11 pr-16 text-left text-sm text-slate-500 shadow-xl shadow-slate-950/6 backdrop-blur-xl transition-all hover:border-cyan-200 hover:bg-white/86 sm:flex"
						>
							<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-700/70 pointer-events-none" />
							<span>Поиск по проектам, контрагентам, договорам…</span>
							<span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100/90 px-1.5 py-0.5 rounded-lg font-mono">
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

					<div className="hidden" />

					{/* Create button */}
					{showQuickCreate && (
						<div className="relative" ref={createRef}>
							<button
								onClick={() => setCreateOpen((o) => !o)}
									className="flex h-11 items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-700 to-teal-600 px-3 text-sm font-bold text-white shadow-xl shadow-cyan-950/18 transition-all hover:-translate-y-0.5 hover:shadow-cyan-950/25 md:px-5 whitespace-nowrap"
							>
								<Plus className="w-4 h-4" />
								Создать
								<ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
							</button>
							{createOpen && (
								<div
										className="absolute top-full right-0 mt-2 w-56 overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-1.5 shadow-2xl shadow-slate-950/16 backdrop-blur-xl"
									style={{ zIndex: 9999 }}
								>
									{quickActions.map((qa) => (
										<Link key={qa.href} href={qa.href}>
											<div
													className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-cyan-50 cursor-pointer transition-colors"
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
				<main id="main-content" className="flex-1 overflow-y-auto">
					<div className="p-3 sm:p-4 xl:p-6">{children}</div>
				</main>
			</div>
		</div>
	);
}
