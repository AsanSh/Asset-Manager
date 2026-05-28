import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import {
	convertViaKgs,
	type NbkrResponse,
} from "@/lib/nbkr-currency";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export interface CashAccount {
	id: number | string;
	name: string;
	currentBalance: string | number;
	currency: string;
}

function fmtMoney(n: number, currency: string): string {
	const formatted = new Intl.NumberFormat("ru-RU", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(n);
	return `${formatted} ${currency}`;
}

/**
 * Сводный виджет касс: показывает один итог во валюте по умолчанию,
 * по клику на стрелку раскрывает список всех касс с остатками.
 * Курсы валют подтягиваются с НБКР (эндпоинт /nbkr/rates).
 */
export function CashSummary({ accounts }: { accounts: CashAccount[] }) {
	const { data: company } = useQuery({
		queryKey: ["company-my"],
		queryFn: () => api.get("/companies/my").then((r) => r.data),
		staleTime: 5 * 60 * 1000,
	});
	const { data: nbkr } = useQuery<NbkrResponse>({
		queryKey: ["nbkr-rates"],
		queryFn: () => api.get("/nbkr/rates").then((r) => r.data),
		staleTime: 60 * 60 * 1000,
	});

	const defaultCurrency: string = company?.defaultCurrency || "KGS";
	const rates = nbkr?.rates || {};

	const list = Array.isArray(accounts) ? accounts : [];
	const total = list.reduce(
		(sum, a) =>
			sum +
			convertViaKgs(
				parseFloat(String(a.currentBalance || "0")) || 0,
				a.currency || "KGS",
				defaultCurrency,
				rates,
			),
		0,
	);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-mono hover:bg-gray-700 transition-colors"
				>
					<Wallet className="w-3.5 h-3.5 opacity-70" />
					<span>Итого в кассе: {fmtMoney(total, defaultCurrency)}</span>
					<ChevronDown className="w-3.5 h-3.5 opacity-70" />
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="px-4 py-2.5 border-b">
					<div className="text-xs text-gray-500">Все кассы</div>
					<div className="text-sm font-semibold text-gray-900">
						{fmtMoney(total, defaultCurrency)}
					</div>
				</div>
				<div className="max-h-72 overflow-y-auto py-1">
					{list.length === 0 ? (
						<div className="px-4 py-3 text-sm text-gray-400">Касс нет</div>
					) : (
						list.map((a) => {
							const bal = parseFloat(String(a.currentBalance || "0")) || 0;
							const inDefault = convertViaKgs(
								bal,
								a.currency || "KGS",
								defaultCurrency,
								rates,
							);
							const showConverted = (a.currency || "KGS") !== defaultCurrency;
							return (
								<div
									key={a.id}
									className="flex items-center justify-between px-4 py-2 hover:bg-gray-50"
								>
									<span className="text-sm text-gray-700 truncate mr-2">
										{a.name}
									</span>
									<span className="text-sm font-mono text-gray-900 whitespace-nowrap text-right">
										{fmtMoney(bal, a.currency || "KGS")}
										{showConverted && (
											<span className="block text-[11px] text-gray-400">
												≈ {fmtMoney(inDefault, defaultCurrency)}
											</span>
										)}
									</span>
								</div>
							);
						})
					)}
				</div>
				{nbkr?.date && (
					<div className="px-4 py-2 border-t text-[11px] text-gray-400">
						Курс НБКР на {nbkr.date}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
