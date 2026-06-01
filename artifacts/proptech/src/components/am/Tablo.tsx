/**
 * AM Tablo — корпоративная обёртка над DataTable.
 * Единый header + toolbar + zebra/hover через DataTable + опциональный footer.
 */
import type { ReactNode } from "react";
import { DataTable, type DataTableProps } from "@/components/data-table";

export interface TabloProps<T> extends DataTableProps<T> {
	title?: string;
	subtitle?: string;
	/** Текст под заголовком, напр. «142 записи · обновлено 2 мин назад» */
	meta?: ReactNode;
}

export function Tablo<T>({
	title,
	subtitle,
	meta,
	toolbar,
	footer,
	...tableProps
}: TabloProps<T>) {
	return (
		<div className="bg-am-bg border border-am-border rounded-lg shadow-sm overflow-hidden">
			{(title || subtitle || meta) && (
				<div className="px-4 py-3 border-b border-am-border bg-am-surface flex items-start justify-between gap-3 flex-wrap">
					<div>
						{title && (
							<h2 className="text-sm font-semibold text-am-text-strong">{title}</h2>
						)}
						{subtitle && (
							<p className="text-xs text-am-text-muted mt-0.5">{subtitle}</p>
						)}
					</div>
					{meta && (
						<p className="text-xs text-am-text-muted">{meta}</p>
					)}
				</div>
			)}
			<div className="[&_.rounded-md]:rounded-none [&_.border]:border-0">
				<DataTable {...tableProps} toolbar={toolbar} footer={footer} />
			</div>
		</div>
	);
}
