import {
	Activity,
	Building,
	Calculator,
	CalendarDays,
	CheckSquare,
	Coins,
	Landmark,
	Settings,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export const SYSTEM_SETTINGS_LINKS = [
	{ href: "/settings/legal", label: "Юр. лица", icon: Building },
	{ href: "/settings/accounts", label: "Счета", icon: Landmark },
	{ href: "/settings/roles", label: "Роли", icon: CheckSquare },
	{ href: "/settings/categories", label: "Статьи операций", icon: Coins },
	{ href: "/settings/periods", label: "Периоды учёта", icon: CalendarDays },
	{ href: "/import", label: "Импорт данных", icon: Calculator },
	{ href: "/activity", label: "Лог действий", icon: Activity },
] as const;

export function SystemSettingsBar() {
	const [location] = useLocation();

	return (
		<div className="space-y-3">
			<Link href="/settings">
				<span className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors cursor-pointer">
					<Settings className="w-3.5 h-3.5" />
					Настройки системы
				</span>
			</Link>
			<div className="flex flex-wrap gap-1.5">
				{SYSTEM_SETTINGS_LINKS.map((item) => {
					const active =
						location === item.href || location.startsWith(`${item.href}/`);
					return (
						<Link key={item.href} href={item.href}>
							<span
								className={cn(
									"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
									active
										? "bg-blue-600 text-white"
										: "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900",
								)}
							>
								<item.icon className="w-3.5 h-3.5" />
								{item.label}
							</span>
						</Link>
					);
				})}
			</div>
		</div>
	);
}

export function SystemSettingsHub() {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{SYSTEM_SETTINGS_LINKS.map((item) => (
				<Link key={item.href} href={item.href}>
					<div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 hover:bg-blue-50/30 transition-colors cursor-pointer group">
						<div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
							<item.icon className="w-5 h-5 text-blue-600" />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-semibold text-gray-900">{item.label}</p>
						</div>
					</div>
				</Link>
			))}
		</div>
	);
}
