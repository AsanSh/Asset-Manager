import { convertViaKgs, fetchNbkrRatesForDate, roundMoney } from "./nbkr";

export type RentalPaymentFxResult = {
  accountAmount: number;
  exchangeRate: number;
  exchangeRateDate: string;
  rateWarning?: string;
};

/** Сумма зачисления на счёт в валюте счёта по курсу НБКР. */
export async function resolveRentalPaymentAccountCredit(params: {
  paymentAmount: number;
  paymentCurrency: string;
  accountCurrency: string;
  paymentDate: string;
}): Promise<RentalPaymentFxResult> {
  const { paymentAmount, paymentCurrency, accountCurrency, paymentDate } = params;
  const nbkr = await fetchNbkrRatesForDate(paymentDate);
  const accountAmount = roundMoney(
    convertViaKgs(paymentAmount, paymentCurrency, accountCurrency, nbkr.rates),
  );
  const exchangeRate =
    paymentAmount > 0 ? roundMoney(accountAmount / paymentAmount) : 1;

  return {
    accountAmount,
    exchangeRate,
    exchangeRateDate: nbkr.date,
    rateWarning: nbkr.warning,
  };
}
