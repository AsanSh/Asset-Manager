import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";
import { numberToWordsRu } from "./number-to-words-ru";

export type ContractDateParts = {
  day: string;
  month: string;
  year: string;
};

export type ContractBuyerData = {
  fullName: string;
  fullNameGenitive: string;
  gender: "м" | "ж";
  dateOfBirth: string;
  innPin: string;
  passportSeries: string;
  passportIssuedBy: string;
  passportDate: string;
  address: string;
  phone: string;
};

export type ContractOfficeData = {
  address: string;
  cadastralCode: string;
  area: string;
  floor: string;
  block: string;
  number: string;
  priceUsd: string;
  priceUsdWords: string;
  initialPayment: string;
  initialPaymentWords: string;
};

export type ContractGeneratePayload = {
  buyer: ContractBuyerData;
  office: ContractOfficeData;
  contractDate: ContractDateParts;
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

/** Word разбивает текст на несколько &lt;w:t&gt; — ищем фразу «сквозь» разметку */
function replaceAcrossWordRuns(xml: string, search: string, replace: string): string {
  if (!search) return xml;
  const pattern = search
    .split("")
    .map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("(?:<[^>]+>)*");
  return xml.replace(new RegExp(pattern, "g"), replace);
}

/** Образцовые фразы из шаблона → подстановка при генерации */
function buildReplacementMap(payload: ContractGeneratePayload): Array<[string, string]> {
  const { buyer, office, contractDate } = payload;
  const citizenship = buyer.gender === "м" ? "гражданин" : "гражданка";
  const pronoun = buyer.gender === "м" ? "именуемый" : "именуемая";

  return [
    ["«00»", `«${contractDate.day}»`],
    ["января 2000", `${contractDate.month} ${contractDate.year}`],
    ["Асанова Асана Асановича", buyer.fullNameGenitive],
    ["гражданин(ка)", citizenship],
    ["21.03.1988", buyer.dateOfBirth],
    [
      "года рождения, паспорт",
      buyer.innPin
        ? `года рождения, ИНН/ПИН: ${buyer.innPin}, паспорт`
        : "года рождения, паспорт",
    ],
    [
      "Паспортные данные: ID 456383, выдан МКК 786548 от 19.09.2019",
      buyer.innPin
        ? `ИНН/ПИН: ${buyer.innPin}, паспортные данные: ${buyer.passportSeries || "—"}, выдан ${buyer.passportIssuedBy || "—"} от ${buyer.passportDate || "—"}`
        : `Паспортные данные: ${buyer.passportSeries || "—"}, выдан ${buyer.passportIssuedBy || "—"} от ${buyer.passportDate || "—"}`,
    ],
    ["ID 456383", buyer.passportSeries],
    ["МКК 786548", buyer.passportIssuedBy],
    ["19.09.2019", buyer.passportDate],
    ["именуемый(ая)", pronoun],
    ["г. Бишкек, ул. Байтик Баатыра, д.25", office.address],
    ["1-04-01-0009-0406", office.cadastralCode],
    ["67,08", office.area],
    ["7-м", `${office.floor}-м`],
    ["Блок А", office.block ? `Блок ${office.block}` : "Блок"],
    ["кабинет № 45", `кабинет № ${office.number}`],
    ["76 000", office.priceUsd],
    ["Семьдесят шесть тысяч", office.priceUsdWords],
    ["6 000", office.initialPayment],
    ["6000", office.initialPayment.replace(/\s/g, "")],
    ["Шесть тысяч", office.initialPaymentWords],
    ["Асанов Асан Асанович", buyer.fullName],
    ["________________________________", buyer.address || ""],
  ];
}

export function parseContractDate(isoDate: string): ContractDateParts {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return {
      day: String(now.getDate()).padStart(2, "0"),
      month: MONTHS_GENITIVE[now.getMonth()],
      year: String(now.getFullYear()),
    };
  }
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: MONTHS_GENITIVE[d.getMonth()],
    year: String(d.getFullYear()),
  };
}

function templatePath(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(dir, "../templates/contract_template.docx"),
    path.join(dir, "../../templates/contract_template.docx"),
    path.join(process.cwd(), "templates/contract_template.docx"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Шаблон contract_template.docx не найден");
}

export function generateContractDocx(
  payload: ContractGeneratePayload,
  templateBuffer?: Buffer,
): Buffer {
  const content = templateBuffer
    ? templateBuffer.toString("binary")
    : fs.readFileSync(templatePath(), "binary");
  const zip = new PizZip(content);
  const replacements = buildReplacementMap(payload);

  for (const fileName of Object.keys(zip.files)) {
    if (!fileName.endsWith(".xml")) continue;
    let xml = zip.files[fileName].asText();
    for (const [from, to] of replacements) {
      if (!from || to === undefined) continue;
      xml = replaceAcrossWordRuns(xml, from, to);
    }
    zip.file(fileName, xml);
  }

  return zip.generate({ type: "nodebuffer" }) as Buffer;
}

export function formatMoneyWords(amount: string | number): string {
  const n = Math.round(
    parseFloat(String(amount).replace(/\s/g, "").replace(",", ".")) || 0,
  );
  return numberToWordsRu(n);
}

export function formatMoneyDisplay(amount: string | number): string {
  const n = Math.round(
    parseFloat(String(amount).replace(/\s/g, "").replace(",", ".")) || 0,
  );
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function suggestGenitiveName(fullName: string, gender: "м" | "ж"): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 3) return fullName;
  const [last, first, middle] = parts;
  if (gender === "м") {
    let ln = last;
    if (ln.endsWith("ов")) ln = `${ln.slice(0, -2)}ова`;
    else if (ln.endsWith("ев")) ln = `${ln.slice(0, -2)}ева`;
    else if (ln.endsWith("ин")) ln = `${ln}а`;
    else ln = `${ln}а`;
    let fn = first;
    if (fn.endsWith("н")) fn = `${fn}а`;
    let mn = middle;
    if (mn.endsWith("ич")) mn = `${mn.slice(0, -2)}ича`;
    return `${ln} ${fn} ${mn}`;
  }
  return fullName;
}
