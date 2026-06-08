import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type Variant = "mark" | "full" | "sidebar" | "auth";

type Props = {
	variant?: Variant;
	className?: string;
	/** Светлый текст на тёмном фоне */
	inverse?: boolean;
};

const MARK_ID = "planalityc-mark";

function LogoMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 32 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden
		>
			<defs>
				<linearGradient id={`${MARK_ID}-bg`} x1="4" y1="4" x2="28" y2="28">
					<stop stopColor="#0EA5E9" />
					<stop offset="1" stopColor="#14B8A6" />
				</linearGradient>
			</defs>
			<rect width="32" height="32" rx="8" fill={`url(#${MARK_ID}-bg)`} />
			{/* P + ascending bars (plan / analytics) */}
			<path
				d="M10 9h6.2c3.1 0 5 1.7 5 4.4 0 2.4-1.5 4-4.1 4H13.2V23H10V9z"
				fill="white"
				fillOpacity="0.95"
			/>
			<rect x="19" y="18" width="3" height="5" rx="1" fill="white" fillOpacity="0.85" />
			<rect x="23.5" y="15" width="3" height="8" rx="1" fill="white" />
			<circle cx="24" cy="11" r="1.2" fill="white" fillOpacity="0.7" />
		</svg>
	);
}

export function PlanalitycLogo({
	variant = "full",
	className,
	inverse = false,
}: Props) {
	const titleClass = inverse
		? "text-white"
		: "text-gray-900";
	const subClass = inverse ? "text-cyan-200/80" : "text-gray-500";
	const aiClass = inverse ? "text-cyan-300" : "text-cyan-600";

	if (variant === "mark") {
		return (
			<LogoMark className={cn("h-8 w-8 flex-shrink-0", className)} />
		);
	}

	if (variant === "sidebar") {
		return (
			<div className={cn("flex items-center gap-3 min-w-0", className)}>
				<LogoMark className="h-8 w-8 flex-shrink-0" />
				<div className="min-w-0">
					<div className="text-white font-bold text-sm leading-none truncate">
						{BRAND.shortName}
						<span className="text-cyan-400/90 font-semibold">.ai</span>
					</div>
					<div className="text-white/40 text-[10px] mt-0.5 truncate">
						{BRAND.taglineShort}
					</div>
				</div>
			</div>
		);
	}

	if (variant === "auth") {
		return (
			<div className={cn("flex items-center gap-3", className)}>
				<LogoMark className="h-10 w-10 flex-shrink-0" />
				<div>
					<p
						className={cn(
							"text-xl font-bold leading-tight",
							inverse ? "text-white" : titleClass,
						)}
					>
						{BRAND.shortName}
						<span className={cn("font-semibold", aiClass)}>.ai</span>
					</p>
					<p className={cn("text-xs", inverse ? "text-cyan-100/75" : subClass)}>
						{BRAND.taglineShort}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex items-center gap-2.5", className)}>
			<LogoMark className="h-9 w-9 flex-shrink-0" />
			<span className={cn("text-xl font-bold tracking-tight", titleClass)}>
				{BRAND.shortName}
				<span className={cn("font-semibold", aiClass)}>.ai</span>
			</span>
		</div>
	);
}
