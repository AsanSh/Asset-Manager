import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LoadingState({
	type = "spinner",
	rows = 3,
	className,
	size = "default",
}: {
	type?: "spinner" | "skeleton" | "pulse";
	rows?: number;
	className?: string;
	size?: "sm" | "default" | "lg";
}) {
	const spinnerSizes = {
		sm: "w-4 h-4",
		default: "w-8 h-8",
		lg: "w-12 h-12",
	};

	const skeletonHeights = {
		sm: "h-8",
		default: "h-12",
		lg: "h-16",
	};

	if (type === "skeleton") {
		return (
			<div className={cn("space-y-3", className)}>
				{Array.from({ length: rows }).map((_, i) => (
					<Skeleton
						key={i}
						className={cn(skeletonHeights[size], "w-full animate-pulse")}
					/>
				))}
			</div>
		);
	}

	if (type === "pulse") {
		return (
			<div className={cn("flex items-center justify-center py-12", className)}>
				<div
					className={cn(
						spinnerSizes[size],
						"rounded-full bg-cyan-500/20 animate-pulse",
					)}
				/>
			</div>
		);
	}

	return (
		<div className={cn("flex items-center justify-center py-12", className)}>
			<Loader2
				className={cn(spinnerSizes[size], "text-cyan-600 animate-spin")}
			/>
		</div>
	);
}

// KPI Card Skeleton
export function KpiCardSkeleton() {
	return (
		<div className="am-card rounded-[24px] p-6 space-y-3">
			<div className="flex items-center gap-2">
				<Skeleton className="h-9 w-9 rounded-xl" />
				<Skeleton className="h-3 w-20" />
			</div>
			<Skeleton className="h-8 w-32" />
			<div className="flex items-center justify-between">
				<Skeleton className="h-3 w-12" />
				<Skeleton className="h-4 w-16" />
			</div>
		</div>
	);
}

// Table Skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="space-y-3">
			{/* Header */}
			<div className="flex gap-4 pb-2 border-b">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-4 w-32" />
			</div>
			{/* Rows */}
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className="flex gap-4 py-3">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-32" />
				</div>
			))}
		</div>
	);
}

// Dashboard Skeleton
export function DashboardSkeleton() {
	return (
		<div className="space-y-6">
			{/* KPI Cards Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<KpiCardSkeleton />
				<KpiCardSkeleton />
				<KpiCardSkeleton />
				<KpiCardSkeleton />
			</div>

			{/* Charts Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="am-card rounded-[24px] p-6">
					<Skeleton className="h-6 w-40 mb-4" />
					<Skeleton className="h-[300px] w-full" />
				</div>
				<div className="am-card rounded-[24px] p-6">
					<Skeleton className="h-6 w-40 mb-4" />
					<Skeleton className="h-[300px] w-full" />
				</div>
			</div>

			{/* Table */}
			<div className="am-card rounded-[24px] p-6">
				<Skeleton className="h-6 w-48 mb-4" />
				<TableSkeleton rows={8} />
			</div>
		</div>
	);
}
