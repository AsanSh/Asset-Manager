import type { CSSProperties } from "react";
import type { AnnexScheduleRow, ContractBuyer } from "./contract-tab";

type ContractDate = { day: string; month: string; year: string };

const MONTHS_GENITIVE = [
	"января",
	"февраля",
	"марта",
	"апреля",
	"мая",
	"июня",
	"июля",
	"августа",
	"сентября",
	"октября",
	"ноября",
	"декабря",
];

function fmtMoney(n: number) {
	return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

function fmtDateLong(iso: string) {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()} г.`;
}

function passportLine(buyer: ContractBuyer) {
	const parts: string[] = [];
	if (buyer.innPin) parts.push(`ИНН/ПИН: ${buyer.innPin}`);
	if (buyer.passportSeries) {
		let p = `${buyer.passportSeries}`;
		if (buyer.passportIssuedBy) p += `, выдан ${buyer.passportIssuedBy}`;
		if (buyer.passportDate) p += ` от ${buyer.passportDate}`;
		parts.push(p);
	}
	return parts.length ? parts.join(", ") : "________________";
}

const cell: CSSProperties = {
	border: "1px solid #000",
	padding: "6px 8px",
	verticalAlign: "middle",
};

type Props = {
	buyer: ContractBuyer;
	contractDate: ContractDate;
	schedule: AnnexScheduleRow[];
};

/** Визуальный предпросмотр Приложения №1 (как в шаблоне Word) */
export function ContractAnnex1Preview({
	buyer,
	contractDate,
	schedule,
}: Props) {
	const total = schedule.reduce((s, r) => s + r.amount, 0);

	return (
		<div>
			<p style={{ textAlign: "right", marginBottom: "1.5rem", fontSize: "14px" }}>
				Приложение №1 к ПРЕДВАРИТЕЛЬНОМУ ДОГОВОРУ купли-продажи нежилого
				помещения от «{contractDate.day}» {contractDate.month}{" "}
				{contractDate.year} года
			</p>

			<h2
				style={{
					textAlign: "center",
					fontWeight: "bold",
					fontSize: "15px",
					marginBottom: "1.25rem",
				}}
			>
				ГРАФИК ВЫПЛАТЫ
			</h2>

			{schedule.length === 0 ? (
				<p
					style={{
						textAlign: "center",
						color: "#666",
						padding: "2rem",
						border: "1px dashed #ccc",
					}}
				>
					График пуст. Укажите рассрочку в договоре или сформируйте начисления
					во вкладке «Сводка».
				</p>
			) : (
				<table
					style={{
						width: "100%",
						borderCollapse: "collapse",
						fontSize: "14px",
						marginBottom: "2rem",
					}}
				>
					<thead>
						<tr>
							<th style={{ ...cell, width: "48px", fontWeight: "bold" }}>№</th>
							<th style={{ ...cell, fontWeight: "bold" }}>ДАТА ВЫПЛАТЫ</th>
							<th style={{ ...cell, fontWeight: "bold", textAlign: "right" }}>
								СУММА
							</th>
						</tr>
					</thead>
					<tbody>
						{schedule.map((row, idx) => (
							<tr key={`${row.installmentNumber}-${row.dueDate}-${idx}`}>
								<td style={{ ...cell, textAlign: "center" }}>
									{row.installmentNumber}
								</td>
								<td style={cell}>{fmtDateLong(row.dueDate)}</td>
								<td style={{ ...cell, textAlign: "right", fontFamily: "monospace" }}>
									{fmtMoney(row.amount)}
								</td>
							</tr>
						))}
						<tr>
							<td style={cell} />
							<td style={{ ...cell, fontWeight: "bold" }}>Итого сумма выплат</td>
							<td
								style={{
									...cell,
									fontWeight: "bold",
									textAlign: "right",
									fontFamily: "monospace",
								}}
							>
								{fmtMoney(total)}
							</td>
						</tr>
					</tbody>
				</table>
			)}

			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "2rem" }}>
				<div style={{ fontSize: "13px", lineHeight: 1.5 }}>
					<p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>«Продавец»</p>
					<p>ОсоО «БИШКЕК ПРОПЕРТИС»</p>
					<p>ИНН: 02111202210457</p>
					<p>Код ОКПО: 3168957</p>
					<p>Юридический адрес: г. Бишкек, ул. Раззакова, 32, офис 901</p>
					<p>Факт. адрес: г. Бишкек, ул. Панфилова, 38</p>
					<p>Банк: ОАО «БАКАЙ БАНК»</p>
					<p>р/с: 1240020001169359</p>
					<p>БИК: 124030</p>
					<p style={{ marginTop: "1.5rem" }}>________________ / Чаргынов З.К.</p>
				</div>
				<div style={{ fontSize: "13px", lineHeight: 1.5 }}>
					<p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>«Покупатель»</p>
					{buyer.fullName ? <p>{buyer.fullName}</p> : null}
					<p>Паспортные данные: {passportLine(buyer)}</p>
					<p style={{ marginTop: "0.75rem" }}>
						Адрес: {buyer.address || "________________"}
					</p>
					<p>Конт.тел: {buyer.phone || "________________"}</p>
					<p style={{ marginTop: "1.5rem" }}>
						________________ / {buyer.fullName || "________________"}
					</p>
				</div>
			</div>
		</div>
	);
}
