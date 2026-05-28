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
			<div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
				<button
					type="button"
					onClick={() => onChange("KGS")}
					className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
						value === "KGS"
							? "bg-white text-gray-900 shadow-sm"
							: "text-gray-500 hover:text-gray-700"
					}`}
				>
					Сом
				</button>
				<button
					type="button"
					onClick={() => onChange("USD")}
					className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
						value === "USD"
							? "bg-white text-gray-900 shadow-sm"
							: "text-gray-500 hover:text-gray-700"
					}`}
				>
					USD
				</button>
			</div>
			{(rateLabel || nbkrDate) && (
				<p className="text-[10px] text-gray-400 text-right leading-tight">
					{rateLabel}
					{rateLabel && nbkrDate ? " · " : ""}
					{nbkrDate ? `НБКР ${nbkrDate}` : ""}
				</p>
			)}
		</div>
	);
}
