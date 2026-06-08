import { cn } from "@/lib/utils";

export function TaskProgressBar({
	percent,
	className,
}: {
	percent: number;
	className?: string;
}) {
	const p = Math.min(100, Math.max(0, percent));
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
				<div
					className={cn(
						"h-full rounded-full transition-all",
						p >= 100 ? "bg-emerald-600" : p >= 50 ? "bg-amber-500" : "bg-blue-500",
					)}
					style={{ width: `${p}%` }}
				/>
			</div>
			<span className="text-xs font-medium text-gray-600 tabular-nums w-10 text-right">
				{p}%
			</span>
		</div>
	);
}
