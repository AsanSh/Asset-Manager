import * as XLSX from "xlsx";

/** Шаблон прайс-листа для импорта в platform-admin маркетплейс. */
export function downloadMarketplacePriceTemplate() {
	const rows = [
		["Наименование", "Цена", "Ед.", "Артикул", "Категория", "Описание"],
		["Цемент М500", 420, "меш", "CEM-500", "materials", ""],
		["Арматура 12мм", 95000, "т", "ARM-12", "materials", ""],
	];
	const ws = XLSX.utils.aoa_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "Прайс");
	XLSX.writeFile(wb, "шаблон_прайс_маркетплейс.xlsx");
}
