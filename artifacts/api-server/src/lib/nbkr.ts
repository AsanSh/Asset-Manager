/** Курсы НБКР (www.nbkr.kg) и конвертация через KGS. */

export type NbkrRate = { name: string; rate: string; scale: string };

export type NbkrRatesPayload = {
  date: string;
  rates: Record<string, NbkrRate>;
  requestedDate?: string;
  warning?: string;
};

const FALLBACK_RATES: Record<string, NbkrRate> = {
  USD: { name: "Доллар США", scale: "1", rate: "87.50" },
  EUR: { name: "Евро", scale: "1", rate: "95.20" },
  RUB: { name: "Российский рубль", scale: "100", rate: "95.40" },
};

function parseNbkrXml(xml: string): { date: string; rates: Record<string, NbkrRate> } {
  const rates: Record<string, NbkrRate> = {};
  const regex =
    /<Currency ISOCode="([^"]+)"[^>]*>[\s\S]*?<Nominal>(\d+)<\/Nominal>[\s\S]*?<Value>([\d.,]+)<\/Value>[\s\S]*?<\/Currency>/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const [, iso, nominal, value] = m;
    rates[iso] = { name: iso, scale: nominal, rate: value.replace(",", ".") };
  }
  const dateMatch = xml.match(/Date="(\d{2})\.(\d{2})\.(\d{4})"/);
  const date = dateMatch
    ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
    : new Date().toISOString().slice(0, 10);
  return { date, rates };
}

export async function fetchNbkrRates(): Promise<NbkrRatesPayload> {
  try {
    const r = await fetch("https://www.nbkr.kg/XML/daily.xml", {
      signal: AbortSignal.timeout(5000),
    });
    const xml = await r.text();
    const { date, rates } = parseNbkrXml(xml);
    return { date, rates };
  } catch {
    const date = new Date().toISOString().slice(0, 10);
    return {
      date,
      rates: FALLBACK_RATES,
      warning: "Не удалось загрузить курс НБКР, использованы резервные значения",
    };
  }
}

export async function fetchNbkrRatesForDate(
  requestedDate?: string,
): Promise<NbkrRatesPayload> {
  const payload = await fetchNbkrRates();
  if (!requestedDate || requestedDate === payload.date) {
    return { ...payload, requestedDate: requestedDate || payload.date };
  }
  return {
    ...payload,
    requestedDate,
    warning:
      `Курс НБКР на ${requestedDate} в XML недоступен; использован курс на ${payload.date}`,
  };
}

/** Сколько KGS за 1 единицу валюты. */
export function unitInKgs(currency: string, rates: Record<string, NbkrRate>): number {
  if (currency === "KGS") return 1;
  const r = rates[currency];
  if (!r) {
    throw new Error(`Нет официального курса НБКР для ${currency}`);
  }
  const rate = parseFloat(r.rate);
  const scale = parseFloat(r.scale || "1") || 1;
  if (!rate) {
    throw new Error(`Нет официального курса НБКР для ${currency}`);
  }
  return rate / scale;
}

/** Конвертация from → to через сом. */
export function convertViaKgs(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, NbkrRate>,
): number {
  if (from === to) return amount;
  const kgs = amount * unitInKgs(from, rates);
  return kgs / unitInKgs(to, rates);
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
