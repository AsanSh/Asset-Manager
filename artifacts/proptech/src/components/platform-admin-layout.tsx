import { Building, Building2, LayoutDashboard, LogOut, Package } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
	{ href: "/platform-admin", label: "Обзор", icon: LayoutDashboard },
	{ href: "/platform-admin/companies", label: "Компании", icon: Building },
	{ href: "/platform-admin/marketplace", label: "Маркетплейс", icon: Package },
];

export function PlatformAdminLayout({ children }: { children: ReactNode }) {
	const [location, setLocation] = useLocation();
	const { user, logout } = useAuth();

	return (
		<div className="min-h-screen flex bg-slate-950 text-slate-100">
			<aside className="w-60 flex-shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col">
				<div className="p-4 border-b border-slate-800">
					<div className="flex items-center gap-2">
						<div className="h-9 w-9 rounded-lg bg-violet-600 flex items-center justify-center">
							<Building2 className="h-5 w-5 text-white" />
						</div>
						<div>
							<p className="font-semibold text-sm leading-tight">BuildFlow</p>
							<p className="text-[10px] text-violet-300 uppercase tracking-wide">
								Админ платформы
							</p>
						</div>
					</div>
				</div>
				<nav className="flex-1 p-3 space-y-1">
					{NAV.map((item) => {
						const active =
							location === item.href ||
							(item.href !== "/platform-admin" &&
								location.startsWith(item.href));
						const Icon = item.icon;
						return (
							<Link key={item.href} href={item.href}>
								<div
									className={cn(
										"flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors",
										active
											? "bg-violet-600 text-white"
											: "text-slate-400 hover:text-white hover:bg-slate-800",
									)}
								>
									<Icon className="w-4 h-4" />
									{item.label}
								</div>
							</Link>
						);
					})}
				</nav>
				<div className="p-3 border-t border-slate-800 text-xs text-slate-500">
					<p className="truncate text-slate-300">
						{user?.firstName} {user?.lastName}
					</p>
					<p className="truncate">{user?.email}</p>
					<button
						type="button"
						onClick={() => {
							logout();
							setLocation("/login");
						}}
						className="mt-3 flex items-center gap-2 text-slate-400 hover:text-white text-sm"
					>
						<LogOut className="w-3.5 h-3.5" />
						Выйти
					</button>
				</div>
			</aside>
			<main className="flex-1 overflow-auto bg-slate-50 text-slate-900">
				<div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
			</main>
		</div>
	);
}
