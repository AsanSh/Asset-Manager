import { LayoutList, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RentalViewMode } from "@/hooks/use-rental-view-mode";

export function RentalViewModeToggle({
	mode,
	onChange,
}: {
	mode: RentalViewMode;
	onChange: (mode: RentalViewMode) => void;
}) {
	return (
		<div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
			<button
				type="button"
				onClick={() => onChange("report")}
				className={cn(
					"inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors",
					mode === "report"
						? "bg-white text-blue-700 shadow-sm border border-gray-200"
						: "text-gray-600 hover:text-gray-900",
				)}
			>
				<Table2 className="w-3.5 h-3.5" />
				Сводная таблица
			</button>
			<button
				type="button"
				onClick={() => onChange("classic")}
				className={cn(
					"inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors",
					mode === "classic"
						? "bg-white text-blue-700 shadow-sm border border-gray-200"
						: "text-gray-600 hover:text-gray-900",
				)}
			>
				<LayoutList className="w-3.5 h-3.5" />
				Стандартная
			</button>
		</div>
	);
}
