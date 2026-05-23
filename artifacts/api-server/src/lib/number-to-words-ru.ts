const ones = [
  "",
  "один",
  "два",
  "три",
  "четыре",
  "пять",
  "шесть",
  "семь",
  "восемь",
  "девять",
];
const onesF = [
  "",
  "одна",
  "две",
  "три",
  "четыре",
  "пять",
  "шесть",
  "семь",
  "восемь",
  "девять",
];
const teens = [
  "десять",
  "одиннадцать",
  "двенадцать",
  "тринадцать",
  "четырнадцать",
  "пятнадцать",
  "шестнадцать",
  "семнадцать",
  "восемнадцать",
  "девятнадцать",
];
const tens = [
  "",
  "",
  "двадцать",
  "тридцать",
  "сорок",
  "пятьдесят",
  "шестьдесят",
  "семьдесят",
  "восемьдесят",
  "девяносто",
];
const hundreds = [
  "",
  "сто",
  "двести",
  "триста",
  "четыреста",
  "пятьсот",
  "шестьсот",
  "семьсот",
  "восемьсот",
  "девятьсот",
];

function triadToWords(n: number, feminine = false): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const parts: string[] = [];
  if (h) parts.push(hundreds[h]);
  if (t === 1) {
    parts.push(teens[o]);
  } else {
    if (t) parts.push(tens[t]);
    if (o) parts.push((feminine ? onesF : ones)[o]);
  }
  return parts.join(" ");
}

/** Сумма прописью (упрощённо, до миллионов) */
export function numberToWordsRu(n: number): string {
  const num = Math.round(Math.abs(n));
  if (num === 0) return "Ноль";

  const millions = Math.floor(num / 1_000_000);
  const thousands = Math.floor((num % 1_000_000) / 1000);
  const rest = num % 1000;

  const parts: string[] = [];
  if (millions) {
    parts.push(triadToWords(millions));
    parts.push("миллион");
  }
  if (thousands) {
    parts.push(triadToWords(thousands, true));
    parts.push("тысяч");
  }
  if (rest) {
    parts.push(triadToWords(rest));
  }

  const result = parts.join(" ").replace(/\s+/g, " ").trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
}
