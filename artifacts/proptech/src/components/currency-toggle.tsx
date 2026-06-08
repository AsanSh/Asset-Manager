import type { DisplayCurrency } from "@/lib/nbkr-currency";

export function CurrencyToggle({
	value,
	onChange,
	rateLabel,
	nbkrDate,
}: {
	value: DisplayCurrency;
	onChange: (v: DisplayCurrency) => void;
	rateLabel?: string | null;
	nbkrDate?: string;
}) {
	return (
		<div className="flex flex-col items-end gap-0.5">
			<div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shadow-inner">
				<button
					type="button"
					onClick={() => onChange("KGS")}
					className={`px-3 py-2 min-h-[44px] rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 ${
						value === "KGS"
							? "bg-white text-gray-900 shadow-sm"
							: "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
					}`}
					aria-label="Переключить на сомы"
					aria-pressed={value === "KGS"}
				>
					Сом
				</button>
				<button
					type="button"
					onClick={() => onChange("USD")}
					className={`px-3 py-2 min-h-[44px] rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 ${
						value === "USD"
							? "bg-white text-gray-900 shadow-sm"
							: "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
					}`}
					aria-label="Переключить на доллары"
					aria-pressed={value === "USD"}
				>
					USD
				</button>
			</div>
			{(rateLabel || nbkrDate) && (
				<p className="text-[10px] text-gray-600 text-right leading-tight">
					{rateLabel}
					{rateLabel && nbkrDate ? " · " : ""}
					{nbkrDate ? `НБКР ${nbkrDate}` : ""}
				</p>
			)}
		</div>
	);
}
