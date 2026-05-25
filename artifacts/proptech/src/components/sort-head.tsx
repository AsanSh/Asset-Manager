import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortHeadProps {
	label: string;
	sortKey: string;
	currentKey: string;
	dir: "asc" | "desc";
	onToggle: (key: string) => void;
	className?: string;
}

export function SortHead({ label, sortKey, currentKey, dir, onToggle, className }: SortHeadProps) {
	const active = currentKey === sortKey;
	return (
		<TableHead
			className={cn("cursor-pointer select-none hover:bg-gray-50 transition-colors", className)}
			onClick={() => onToggle(sortKey)}
		>
			<span className="inline-flex items-center gap-1">
				{label}
				{active
					? dir === "asc"
						? <ChevronUp className="w-3 h-3 text-blue-600" />
						: <ChevronDown className="w-3 h-3 text-blue-600" />
					: <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
			</span>
		</TableHead>
	);
}
