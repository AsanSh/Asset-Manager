import * as XLSX from "xlsx";

export const UNIT_TEMPLATE_HEADERS = [
	"Номер",
	"Этаж",
	"Секция",
	"Тип",
	"Комнат",
	"Площадь м²",
	"Цена за м²",
	"Валюта",
	"Статус",
	"Заметки",
] as const;

const STATUS_RU: Record<string, string> = {
	available: "Свободна",
	reserved: "Забронирована",
	sold: "Продана",
	occupied: "Заселена",
	construction: "Строится",
};

const TYPE_RU: Record<string, string> = {
	apartment: "Квартира",
	studio: "Студия",
	office: "Офис",
	commercial: "Коммерческое",
	parking: "Паркинг",
	storage: "Кладовая",
};

export type UnitImportRow = Record<string, unknown>;

export function downloadUnitsTemplate(projectName?: string) {
	const example = [
		{
			Номер: "101",
			Этаж: 1,
			Секция: "А",
			Тип: "Квартира",
			Комнат: 2,
			"Площадь м²": 65.5,
			"Цена за м²": 120000,
			Валюта: "KGS",
			Статус: "Свободна",
			Заметки: "",
		},
		{
			Номер: "102",
			Этаж: 1,
			Секция: "А",
			Тип: "Квартира",
			Комнат: 3,
			"Площадь м²": 78,
			"Цена за м²": 120000,
			Валюта: "KGS",
			Статус: "Свободна",
			Заметки: "",
		},
	];
	const ws = XLSX.utils.json_to_sheet(example, { header: [...UNIT_TEMPLATE_HEADERS] });
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "Квартиры");
	const name = projectName
		? `шаблон_квартир_${projectName.replace(/\s+/g, "_")}.xlsx`
		: "шаблон_квартир_шахматка.xlsx";
	XLSX.writeFile(wb, name);
}

export function parseUnitsFile(file: File): Promise<UnitImportRow[]> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = new Uint8Array(e.target?.result as ArrayBuffer);
				const wb = XLSX.read(data, { type: "array" });
				const sheet = wb.Sheets[wb.SheetNames[0]];
				const rows = XLSX.utils.sheet_to_json<UnitImportRow>(sheet, {
					defval: "",
				});
				resolve(rows.filter((r) => String(r["Номер"] ?? r.unitNumber ?? "").trim()));
			} catch (err) {
				reject(err);
			}
		};
		reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
		reader.readAsArrayBuffer(file);
	});
}

export type UnitExportRow = {
	unitNumber: string;
	floor?: number | null;
	block?: string | null;
	unitType: string;
	roomCount?: number | null;
	area?: string | null;
	pricePerSqm?: string | null;
	totalPrice?: string | null;
	currency: string;
	status: string;
	notes?: string | null;
	buyerName?: string | null;
	contractTotal?: string | null;
	paidAmount?: string | null;
	remainingAmount?: string | null;
};

export function exportUnitsToExcel(
	units: UnitExportRow[],
	projectName: string,
) {
	const rows = units.map((u) => ({
		Номер: u.unitNumber,
		Этаж: u.floor ?? "",
		Секция: u.block ?? "",
		Тип: TYPE_RU[u.unitType] || u.unitType,
		Комнат: u.roomCount ?? "",
		"Площадь м²": u.area ?? "",
		"Цена за м²": u.pricePerSqm ?? "",
		"Стоимость": u.totalPrice ?? "",
		Валюта: u.currency,
		Статус: STATUS_RU[u.status] || u.status,
		Покупатель: u.buyerName ?? "",
		"Сумма договора": u.contractTotal ?? "",
		Оплачено: u.paidAmount ?? "",
		Остаток: u.remainingAmount ?? "",
		Заметки: u.notes ?? "",
	}));
	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "Квартиры");
	const fname = `квартиры_${projectName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
	XLSX.writeFile(wb, fname);
}
