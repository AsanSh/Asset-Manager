/** Распределение суммы платежа по начислениям договора (по порядку сроков) */

export type AccrualForAllocation = {
	id: number;
	installmentNumber: number;
	dueDate: string;
	amount: string | number;
	paidAmount?: string | number;
	remainingAmount?: string | number;
};

export type AllocationLine = {
	accrualId: number;
	installmentNumber: number;
	dueDate: string;
	applied: number;
	remainingAfter: number;
	status: "paid" | "partial" | "pending";
};

export function accrualBalance(a: AccrualForAllocation): number {
	const rem = parseFloat(String(a.remainingAmount ?? "0"));
	if (rem > 0.01) return rem;
	const total = parseFloat(String(a.amount ?? "0"));
	const paid = parseFloat(String(a.paidAmount ?? "0"));
	return Math.max(0, total - paid);
}

export function computePaymentAllocation(
	accruals: AccrualForAllocation[],
	startAccrualId: number | null | undefined,
	paymentAmount: number,
): { lines: AllocationLine[]; unallocated: number } {
	if (!paymentAmount || paymentAmount <= 0) {
		return { lines: [], unallocated: 0 };
	}

	const sorted = [...accruals].sort(
		(a, b) =>
			a.dueDate.localeCompare(b.dueDate) ||
			a.installmentNumber - b.installmentNumber,
	);

	let startIdx = 0;
	if (startAccrualId != null) {
		const idx = sorted.findIndex((a) => a.id === startAccrualId);
		if (idx >= 0) startIdx = idx;
	} else {
		const firstOpen = sorted.findIndex((a) => accrualBalance(a) > 0.01);
		startIdx = firstOpen >= 0 ? firstOpen : 0;
	}

	let remaining = paymentAmount;
	const lines: AllocationLine[] = [];

	for (let i = startIdx; i < sorted.length && remaining > 0.01; i++) {
		const acc = sorted[i];
		const accRem = accrualBalance(acc);
		if (accRem <= 0.01) continue;

		const applied = Math.min(remaining, accRem);
		const total = parseFloat(String(acc.amount ?? "0"));
		const alreadyPaid = parseFloat(String(acc.paidAmount ?? "0"));
		const newPaid = alreadyPaid + applied;
		const remainingAfter = Math.max(0, total - newPaid);
		const status: AllocationLine["status"] =
			remainingAfter <= 0.01 ? "paid" : "partial";

		lines.push({
			accrualId: acc.id,
			installmentNumber: acc.installmentNumber,
			dueDate: acc.dueDate,
			applied,
			remainingAfter,
			status,
		});
		remaining -= applied;
	}

	return { lines, unallocated: Math.max(0, remaining) };
}
