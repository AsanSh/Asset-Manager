import { Link } from "wouter";
import type { ElementType, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const COLORS: Record<string, { bg: string; icon: string }> = {
	blue: { bg: "bg-am-brand-surface", icon: "text-am-brand" },
	green: { bg: "bg-emerald-50", icon: "text-emerald-700" },
	yellow: { bg: "bg-amber-50", icon: "text-amber-700" },
	red: { bg: "bg-rose-50", icon: "text-rose-700" },
	purple: { bg: "bg-violet-50", icon: "text-violet-700" },
};

export function KpiRow({
	children,
	cols = 4,
	className,
}: {
	children: ReactNode;
	cols?: 2 | 3 | 4 | 6;
	className?: string;
}) {
	const grid =
		cols === 6
			? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
			: cols === 3
				? "grid-cols-2 md:grid-cols-3"
				: cols === 2
					? "grid-cols-2"
					: "grid-cols-2 md:grid-cols-4";
	return (
		<div className={cn("grid gap-3 w-full", grid, className)}>{children}</div>
	);
}

export function KpiCard({
	label,
	value,
	sub,
	icon: Icon,
	color = "blue",
	loading = false,
	href,
	variant = "card",
}: {
	label: string;
	value: string | number;
	sub?: string;
	icon: ElementType;
	color?: keyof typeof COLORS | string;
	loading?: boolean;
	href?: string;
	variant?: "card" | "strip";
}) {
	const c = COLORS[color] || COLORS.blue;

	const strip = (
		<div
			className={cn(
				"flex items-center gap-2.5 rounded-lg border border-am-border bg-am-bg px-3 py-2 min-w-0 min-h-[44px] shadow-sm",
				href && "hover:shadow-md hover:border-am-border-strong hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer group",
			)}
		>
			{loading ? (
				<div className="w-8 h-8 shrink-0 bg-gray-100 rounded-md flex items-center justify-center animate-pulse">
					<div className="w-4 h-4 bg-gray-200 rounded" />
				</div>
			) : (
				<div
					className={`w-8 h-8 shrink-0 ${c.bg} rounded-md flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}
				>
					<Icon className={`w-4 h-4 ${c.icon}`} />
				</div>
			)}
			<div className="min-w-0 flex-1 leading-tight">
				{loading ? (
					<Skeleton className="h-4 w-16 animate-pulse" />
				) : (
					<>
						<p className="text-xs sm:text-[11px] font-medium text-am-text-muted leading-snug">{label}</p>
						<p className="text-base font-bold text-am-text-strong tabular-nums">{value}</p>
					</>
				)}
			</div>
			{sub && !loading && (
				<span className="text-xs sm:text-[10px] text-am-text-subtle shrink-0 text-right leading-snug max-w-[40%] hidden min-[420px]:block">
					{sub}
				</span>
			)}
		</div>
	);

	const card = (
		<div
			className={cn(
				"bg-am-bg rounded-xl border border-am-border shadow-sm px-3 py-2.5 min-h-[88px] group",
				href && "hover:shadow-md hover:border-am-border-strong hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer"
			)}
		>
			<div className="flex items-center justify-between gap-2 mb-1">
				<p className="text-xs sm:text-[11px] font-medium text-am-text-muted leading-tight">{label}</p>
				{loading ? (
					<div className="w-6 h-6 shrink-0 bg-gray-100 rounded-md flex items-center justify-center animate-pulse">
						<div className="w-3.5 h-3.5 bg-gray-200 rounded" />
					</div>
				) : (
					<div
						className={`w-6 h-6 shrink-0 ${c.bg} rounded-md flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}
					>
						<Icon className={`w-3.5 h-3.5 ${c.icon}`} />
					</div>
				)}
			</div>
			{loading ? (
				<Skeleton className="h-5 w-20 animate-pulse" />
			) : (
				<>
					<p className="text-lg font-bold text-am-text-strong leading-tight truncate">{value}</p>
					{sub && <p className="text-xs sm:text-[10px] text-am-text-subtle mt-0.5 leading-tight">{sub}</p>}
				</>
			)}
		</div>
	);

	const content = variant === "strip" ? strip : card;

	if (href) {
		return (
			<Link href={href} className="block no-underline" aria-label={`${label}: ${value}`}>
				{content}
			</Link>
		);
	}
	return content;
}
