export type PaymentPeriod =
	| "weekly"
	| "monthly"
	| "quarterly"
	| "yearly"
	| "down_payment"
	| "unknown";

export const PERIOD_LABELS: Record<PaymentPeriod, string> = {
	weekly: "Еженедельные",
	monthly: "Ежемесячные",
	quarterly: "Ежеквартальные",
	yearly: "Ежегодные",
	down_payment: "Первоначальный взнос",
	unknown: "Прочие",
};

type AccrualLike = { contractId: number; dueDate: string; installmentNumber: number };

/** Определяет периодичность графика по интервалам между платежами договора */
export function detectContractPaymentPeriod(
	accruals: AccrualLike[],
): PaymentPeriod {
	const sorted = accruals
		.filter((a) => a.installmentNumber > 0)
		.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

	if (sorted.length === 0) {
		const hasDown = accruals.some((a) => a.installmentNumber === 0);
		return hasDown ? "down_payment" : "monthly";
	}
	if (sorted.length === 1) return "monthly";

	const gaps: number[] = [];
	for (let i = 1; i < sorted.length; i++) {
		const d1 = new Date(sorted[i - 1].dueDate);
		const d2 = new Date(sorted[i].dueDate);
		if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) continue;
		gaps.push(Math.round((d2.getTime() - d1.getTime()) / 86400000));
	}
	if (gaps.length === 0) return "monthly";

	gaps.sort((a, b) => a - b);
	const median = gaps[Math.floor(gaps.length / 2)];

	if (median <= 12) return "weekly";
	if (median <= 50) return "monthly";
	if (median <= 120) return "quarterly";
	return "yearly";
}

export function buildContractPeriodMap(
	accruals: AccrualLike[],
): Map<number, PaymentPeriod> {
	const byContract = new Map<number, AccrualLike[]>();
	for (const a of accruals) {
		const list = byContract.get(a.contractId) || [];
		list.push(a);
		byContract.set(a.contractId, list);
	}
	const result = new Map<number, PaymentPeriod>();
	for (const [contractId, list] of byContract) {
		result.set(contractId, detectContractPaymentPeriod(list));
	}
	return result;
}

export function accrualPaymentPeriod(
	accrual: AccrualLike,
	contractPeriod: PaymentPeriod,
): PaymentPeriod {
	if (accrual.installmentNumber === 0) return "down_payment";
	return contractPeriod;
}
