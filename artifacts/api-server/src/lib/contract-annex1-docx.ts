import PizZip from "pizzip";
import {
  formatMoneyDisplay,
  parseContractDate,
  type ContractBuyerData,
  type ContractDateParts,
} from "./contract-docx";
import { buildPaymentSchedule, type ScheduleRow } from "./payment-schedule";

export type Annex1ScheduleRow = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
};

export type Annex1GeneratePayload = {
  contractDate: ContractDateParts;
  buyer: ContractBuyerData;
  schedule: Annex1ScheduleRow[];
};

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

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateRuLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()} г.`;
}

export function buyerPassportLine(buyer: ContractBuyerData): string {
  const parts: string[] = [];
  if (buyer.innPin) parts.push(`ИНН/ПИН: ${buyer.innPin}`);
  if (buyer.passportSeries) {
    let p = `паспорт ${buyer.passportSeries}`;
    if (buyer.passportIssuedBy) p += `, выдан ${buyer.passportIssuedBy}`;
    if (buyer.passportDate) p += ` от ${buyer.passportDate}`;
    parts.push(p);
  }
  if (buyer.dateOfBirth) parts.push(`дата рождения ${buyer.dateOfBirth}`);
  return parts.length ? parts.join(", ") : "—";
}

function renumberAnnexRows(
  rows: { installmentNumber: number; dueDate: string; amount: number }[],
): Annex1ScheduleRow[] {
  return rows
    .sort((a, b) => a.installmentNumber - b.installmentNumber)
    .map((r, idx) => ({
      installmentNumber: idx + 1,
      dueDate: r.dueDate,
      amount: r.amount,
    }));
}

/** Полный график: первоначальный взнос + рассрочка */
export function buildFullAnnexSchedule(
  totalAmount: number,
  downPayment: number,
  installmentMonths: number,
  contractDate: string,
): Annex1ScheduleRow[] {
  const full = buildPaymentSchedule(
    totalAmount,
    downPayment,
    installmentMonths,
    contractDate,
  );
  return renumberAnnexRows(
    full.map((r) => ({
      installmentNumber: r.installmentNumber,
      dueDate: r.dueDate,
      amount: r.amount,
    })),
  );
}

export function accrualsToAnnexSchedule(
  accruals: { installmentNumber: number; dueDate: string; amount: string | number }[],
  downPayment = 0,
  contractDate = "",
): Annex1ScheduleRow[] {
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
        dueDate: contractDate || rows[0]?.dueDate || new Date().toISOString().slice(0, 10),
        amount: down,
      },
      ...rows,
    ];
  }

  return renumberAnnexRows(rows);
}

export function resolveAnnexSchedule(
  accruals: { installmentNumber: number; dueDate: string; amount: string | number }[],
  totalAmount: number,
  downPayment: number,
  installmentMonths: number,
  contractDate: string,
): Annex1ScheduleRow[] {
  if (accruals.length > 0) {
    return accrualsToAnnexSchedule(accruals, downPayment, contractDate);
  }
  return buildFullAnnexSchedule(
    totalAmount,
    downPayment,
    installmentMonths || 1,
    contractDate,
  );
}

function wRun(text: string, bold = false): string {
  const b = bold ? "<w:b/>" : "";
  return `<w:r><w:rPr>${b}<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function wParagraph(text: string, opts?: { bold?: boolean; align?: "left" | "center" | "right" }): string {
  const align = opts?.align
    ? `<w:jc w:val="${opts.align === "center" ? "center" : opts.align === "right" ? "right" : "left"}"/>`
    : "";
  return `<w:p><w:pPr>${align}</w:pPr>${wRun(text, opts?.bold)}</w:p>`;
}

function wTableCell(text: string, opts?: { bold?: boolean; width?: number }): string {
  const width = opts?.width
    ? `<w:tcW w:w="${opts.width}" w:type="dxa"/>`
    : "";
  return `<w:tc><w:tcPr>${width}<w:vAlign w:val="center"/></w:tcPr>${wParagraph(text, { bold: opts?.bold })}</w:tc>`;
}

function wTableRow(cells: string[], header = false): string {
  const row = cells
    .map((c, i) =>
      wTableCell(c, {
        bold: header,
        width: i === 0 ? 800 : i === 1 ? 3600 : 2800,
      }),
    )
    .join("");
  return `<w:tr>${row}</w:tr>`;
}

function buildScheduleTable(rows: Annex1ScheduleRow[]): string {
  const header = wTableRow(["№", "ДАТА ВЫПЛАТЫ", "СУММА"], true);
  const body = rows
    .map((r) =>
      wTableRow([
        String(r.installmentNumber),
        formatDateRuLong(r.dueDate),
        formatMoneyDisplay(r.amount),
      ]),
    )
    .join("");
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const footer = wTableRow(["", "Итого сумма выплат", formatMoneyDisplay(total)], true);
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/>
        <w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/>
        <w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/>
      </w:tblBorders>
    </w:tblPr>
    ${header}${body}${footer}
  </w:tbl>`;
}

function buildDocumentXml(payload: Annex1GeneratePayload): string {
  const { contractDate, buyer, schedule } = payload;
  const dateLine = `Приложение №1 к ПРЕДВАРИТЕЛЬНОМУ ДОГОВОРУ купли-продажи нежилого помещения от «${contractDate.day}» ${contractDate.month} ${contractDate.year} года`;
  const passport = buyerPassportLine(buyer);

  const sellerLines = [
    "«Продавец»",
    "ОсоО «БИШКЕК ПРОПЕРТИС»",
    "ИНН: 02111202210457",
    "Код ОКПО: 3168957",
    "Юридический адрес: г. Бишкек, ул. Раззакова, 32, офис 901",
    "Факт. адрес: г. Бишкек, ул. Панфилова, 38",
    "Банк: ОАО «БАКАЙ БАНК»",
    "р/с: 1240020001169359",
    "БИК: 124030",
    "________________ / Чаргынов З.К.",
  ];

  const buyerLines = [
    "«Покупатель»",
    `Паспортные данные: ${passport}`,
    `Адрес: ${buyer.address || "—"}`,
    `Конт.тел: ${buyer.phone || "—"}`,
    `________________ / ${buyer.fullName || "—"}`,
  ];

  const blocks = [
    wParagraph(dateLine, { align: "right" }),
    wParagraph(""),
    wParagraph("ГРАФИК ВЫПЛАТЫ", { bold: true, align: "center" }),
    wParagraph(""),
    buildScheduleTable(schedule),
    wParagraph(""),
    wParagraph(""),
    ...sellerLines.map((line) => wParagraph(line)),
    wParagraph(""),
    ...buyerLines.map((line) => wParagraph(line)),
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${blocks.join("")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

export function generateAnnex1Docx(payload: Annex1GeneratePayload): Buffer {
  if (!payload.schedule.length) {
    throw new Error("График выплат пуст. Укажите рассрочку или начисления по договору.");
  }

  const zip = new PizZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file("word/_rels/document.xml.rels", DOC_RELS);
  zip.file("word/document.xml", buildDocumentXml(payload));
  return zip.generate({ type: "nodebuffer" }) as Buffer;
}
