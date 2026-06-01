import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Единый стиль шапки (как DataTable). */
export const MATRIX_TH =
	"px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-am-text-muted whitespace-nowrap bg-gray-50/80 border-b border-am-border";

export const MATRIX_TH_STICKY_LEFT = cn(
	MATRIX_TH,
	"sticky left-0 z-30 bg-gray-50/95 backdrop-blur-sm",
);

export const MATRIX_TH_RIGHT = cn(MATRIX_TH, "text-right");

export const MATRIX_TH_CENTER = cn(MATRIX_TH, "text-center");

type MatrixTableFrameProps = {
	title?: string;
	toolbar?: ReactNode;
	onExportCsv?: () => void;
	maxHeight?: string;
	children: ReactNode;
	className?: string;
};

/** Оболочка для широких матриц (план-факт, прогноз, шахматка-сетка) — тулбар + скролл. */
export function MatrixTableFrame({
	title,
	toolbar,
	onExportCsv,
	maxHeight,
	children,
	className,
}: MatrixTableFrameProps) {
	return (
		<div className="bg-am-bg border border-am-border rounded-lg shadow-sm overflow-hidden">
			{(title || toolbar || onExportCsv) && (
				<div className="px-4 py-2 border-b border-am-border flex items-center justify-between gap-2 flex-wrap bg-am-surface">
					{title ? (
						<h3 className="text-sm font-semibold text-am-text-strong">{title}</h3>
					) : (
						<span />
					)}
					<div className="flex items-center gap-2 flex-wrap ml-auto">
						{toolbar}
						{onExportCsv && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 text-xs gap-1.5"
								onClick={onExportCsv}
							>
								<Download className="w-3.5 h-3.5" />
								CSV
							</Button>
						)}
					</div>
				</div>
			)}
			<div
				className={cn("overflow-auto", className)}
				style={maxHeight ? { maxHeight } : undefined}
			>
				{children}
			</div>
		</div>
	);
}
