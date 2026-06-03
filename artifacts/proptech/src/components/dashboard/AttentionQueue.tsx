import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useControlCenter } from "@/hooks/use-control-center";

const SEV_STYLES = {
	critical: "border-rose-200 bg-rose-50/80",
	warning: "border-amber-200 bg-amber-50/80",
	info: "border-blue-200 bg-blue-50/80",
};

const SEV_DOT = {
	critical: "bg-rose-500",
	warning: "bg-amber-500",
	info: "bg-blue-500",
};

export function AttentionQueue() {
	const { data, isLoading } = useControlCenter();
	const items = data?.attentionItems ?? [];

	return (
		<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
			<div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<AlertCircle className="w-4 h-4 text-amber-600" />
					<span className="text-sm font-semibold text-gray-900">
						Требует внимания
					</span>
					{items.length > 0 && (
						<span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
							{items.length}
						</span>
					)}
				</div>
				<Link
					href="/construction/tasks"
					className="text-xs text-amber-600 hover:underline inline-flex items-center gap-0.5"
				>
					Все задачи <ArrowRight className="w-3 h-3" />
				</Link>
			</div>

			{isLoading ? (
				<div className="p-4 space-y-2">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			) : items.length === 0 ? (
				<div className="px-4 py-8 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
					<CheckCircle2 className="w-8 h-8 text-emerald-500" />
					<span>Критичных пунктов нет — всё под контролем</span>
				</div>
			) : (
				<ul className="divide-y divide-gray-50">
					{items.map((item) => (
						<li key={item.id}>
							<Link href={item.href}>
								<div
									className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors cursor-pointer border-l-4 ${SEV_STYLES[item.severity]}`}
								>
									<span
										className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEV_DOT[item.severity]}`}
									/>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-900 truncate">
											{item.title}
										</p>
										{item.subtitle && (
											<p className="text-xs text-gray-500 mt-0.5 font-mono">
												{item.subtitle}
											</p>
										)}
									</div>
									<ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
