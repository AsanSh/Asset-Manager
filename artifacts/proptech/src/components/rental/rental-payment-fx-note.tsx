import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
	convertViaKgs,
	fmtCurrencyAmount,
	nbkrUsdRateLabel,
	type NbkrResponse,
} from "@/lib/nbkr-currency";

type Props = {
	paymentAmount: number;
	paymentCurrency: string;
	accountCurrency: string;
	paymentDate: string;
};

export function RentalPaymentFxNote({
	paymentAmount,
	paymentCurrency,
	accountCurrency,
	paymentDate,
}: Props) {
	const { data: nbkr } = useQuery<NbkrResponse>({
		queryKey: ["nbkr-rates", paymentDate],
		queryFn: () =>
			api
				.get("/nbkr/rates", { params: { date: paymentDate } })
				.then((r) => r.data),
		staleTime: 60 * 60 * 1000,
		enabled: paymentAmount > 0 && !!paymentDate,
	});

	if (paymentAmount <= 0) return null;

	const payCur = paymentCurrency || "KGS";
	const accCur = accountCurrency || "KGS";

	if (payCur === accCur) {
		return (
			<p className="text-xs text-gray-500 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
				Валюта платежа и счёта совпадают ({payCur}). На счёт зачислится{" "}
				<strong>
					{fmtCurrencyAmount(paymentAmount, payCur === "USD" ? "USD" : "KGS")}
				</strong>
				.
			</p>
		);
	}

	const rates = nbkr?.rates ?? {};
	let accountCredit: number | null = null;
	try {
		accountCredit = convertViaKgs(paymentAmount, payCur, accCur, rates);
	} catch {
		accountCredit = null;
	}

	const usdLabel = nbkrUsdRateLabel(rates);

	return (
		<div className="text-xs rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 space-y-1">
			<p className="text-blue-900">
				<span className="text-blue-700">Платёж:</span>{" "}
				<strong>
					{fmtCurrencyAmount(
						paymentAmount,
						payCur === "USD" ? "USD" : "KGS",
					)}
				</strong>
				{" · "}
				<span className="text-blue-700">Счёт:</span>{" "}
				<strong>{accCur}</strong>
			</p>
			{accountCredit != null ? (
				<p className="text-blue-800">
					На счёт зачислится{" "}
					<strong>
						{fmtCurrencyAmount(
							accountCredit,
							accCur === "USD" ? "USD" : "KGS",
						)}
					</strong>
					{nbkr?.date ? (
						<span className="text-blue-600">
							{" "}
							(курс НБКР на {nbkr.date}
							{usdLabel && payCur !== accCur ? `, ${usdLabel}` : ""})
						</span>
					) : null}
				</p>
			) : (
				<p className="text-amber-700">Не удалось рассчитать курс НБКР</p>
			)}
			{nbkr?.warning ? (
				<p className="text-amber-700">{nbkr.warning}</p>
			) : null}
		</div>
	);
}
