import { buildPaymentSchedule } from "./payment-schedule";

export type AnnexScheduleRow = {
	installmentNumber: number;
	dueDate: string;
	amount: number;
};

function renumberRows(
	rows: { installmentNumber: number; dueDate: string; amount: number }[],
): AnnexScheduleRow[] {
	return rows
		.sort((a, b) => a.installmentNumber - b.installmentNumber)
		.map((r, idx) => ({
			installmentNumber: idx + 1,
			dueDate: r.dueDate,
			amount: r.amount,
		}));
}

/** График выплат: первоначальный взнос + рассрочка — для Приложения №1 */
export function buildAnnexScheduleFromContract(
	totalAmount: number,
	downPayment: number,
	installmentMonths: number,
	contractDate: string,
): AnnexScheduleRow[] {
	const months = Math.max(1, installmentMonths || 12);
	const full = buildPaymentSchedule(
		totalAmount,
		downPayment,
		months,
		contractDate,
	);
	return renumberRows(
		full.map((r) => ({
			installmentNumber: r.installmentNumber,
			dueDate: r.dueDate,
			amount: r.amount,
		})),
	);
}

/** Начисления из API → график с первым взносом при необходимости */
export function accrualsToAnnexSchedule(
	accruals: { installmentNumber: number; dueDate: string; amount: number | string }[],
	downPayment = 0,
	contractDate = "",
): AnnexScheduleRow[] {
	const sorted = [...accruals].sort(
		(a, b) => a.installmentNumber - b.installmentNumber,
	);
	let rows = sorted.map((a) => ({
		installmentNumber: a.installmentNumber,
		dueDate: a.dueDate,
		amount: Math.round(parseFloat(String(a.amount)) || 0),
	}));

	const down = Math.round(downPayment);
	if (down > 0 && !rows.some((r) => r.installmentNumber === 0)) {
		rows = [
			{
				installmentNumber: 0,
				dueDate:
					contractDate ||
					rows[0]?.dueDate ||
					new Date().toISOString().slice(0, 10),
				amount: down,
			},
			...rows,
		];
	}

	return renumberRows(rows);
}

/** График с API/начислений → всегда с первым взносом, если он задан в договоре */
export function resolveAnnexScheduleForDisplay(
	schedule: AnnexScheduleRow[],
	totalAmount: number,
	downPayment: number,
	installmentMonths: number,
	contractDate: string,
): AnnexScheduleRow[] {
	if (schedule.length === 0) {
		if (totalAmount <= 0 && downPayment <= 0) return [];
		return buildAnnexScheduleFromContract(
			totalAmount,
			downPayment,
			installmentMonths,
			contractDate,
		);
	}

	const down = Math.round(downPayment);
	if (down <= 0) return schedule;

	const sum = schedule.reduce((s, r) => s + r.amount, 0);
	const total = Math.round(totalAmount);
	// Уже полный график (взнос + рассрочка = сумма договора) и первая строка — взнос
	if (total > 0 && sum === total && schedule[0]?.amount === down) {
		return schedule;
	}

	// Только платежи по остатку — добавляем первоначальный взнос
	if (schedule[0]?.amount !== down) {
		return accrualsToAnnexSchedule(
			schedule.map((r, i) => ({
				installmentNumber: i + 1,
				dueDate: r.dueDate,
				amount: r.amount,
			})),
			down,
			contractDate,
		);
	}

	return schedule;
}
