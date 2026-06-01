/** CSV экспорт квартир шахматки (для режима «Сетка»). */
export function exportChessUnitsCsv(
	units: Array<{
		floor?: number | null;
		unitNumber: string;
		area?: string | null;
		status: string;
		contract?: { buyerName?: string | null; contractNumber?: string | null } | null;
	}>,
	statusLabel: (code: string) => string,
) {
	const esc = (v: string) => {
		if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
		return v;
	};
	const lines = [
		["Этаж", "Квартира", "Площадь м²", "Статус", "Контрагент", "№ договора"].join(";"),
		...units.map((u) =>
			[
				u.floor ? String(u.floor) : "",
				u.unitNumber,
				u.area ?? "",
				statusLabel(u.status),
				u.contract?.buyerName ?? "",
				u.contract?.contractNumber ?? "",
			]
				.map(esc)
				.join(";"),
		),
	];
	const blob = new Blob(["\uFEFF" + lines.join("\n")], {
		type: "text/csv;charset=utf-8",
	});
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = "shahmatka-kvartiry.csv";
	a.click();
	URL.revokeObjectURL(a.href);
}
