import { and, eq, ilike } from "drizzle-orm";
import { db, counterpartiesTable } from "./db";
import { suggestGenitiveName, type ContractBuyerData } from "./contract-docx";

export type BuyerExtraMeta = {
  gender?: "м" | "ж";
  dateOfBirth?: string;
  fullNameGenitive?: string;
  passportSeries?: string;
  passportIssuedBy?: string;
  passportDate?: string;
  address?: string;
  phone?: string;
  innPin?: string;
};

export function parseBuyerMeta(raw: string | null | undefined): BuyerExtraMeta {
  if (!raw?.trim()) return {};
  const t = raw.trim();

  if (t.startsWith("{")) {
    try {
      const parsed = JSON.parse(t) as Record<string, unknown>;
      const gender =
        parsed.gender === "ж" || parsed.gender === "м"
          ? parsed.gender
          : undefined;
      const passportData = str(parsed.passportData);
      return {
        gender,
        dateOfBirth: str(parsed.dateOfBirth),
        fullNameGenitive: str(parsed.fullNameGenitive),
        passportSeries:
          str(parsed.passportSeries) ||
          str(parsed.passport) ||
          passportData,
        passportIssuedBy: str(parsed.passportIssuedBy),
        passportDate: str(parsed.passportDate),
        address: str(parsed.address),
        phone: str(parsed.phone),
        innPin: str(parsed.innPin || parsed.iin),
      };
    } catch {
      return {};
    }
  }

  const meta: BuyerExtraMeta = {};
  for (const line of t.split(/\n/)) {
    const m = line.match(
      /^(паспорт|passport|серия|адрес|address|тел|телефон|phone|инн|iin|пин|pin)\s*[:：]\s*(.+)$/i,
    );
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (/паспорт|passport|серия/.test(key)) meta.passportSeries = val;
    else if (/адрес|address/.test(key)) meta.address = val;
    else if (/тел|phone/.test(key)) meta.phone = val;
    else if (/инн|iin|пин|pin/.test(key)) meta.innPin = val;
  }
  if (Object.keys(meta).length > 0) return meta;

  return { passportSeries: t };
}

export function stringifyBuyerMeta(meta: BuyerExtraMeta): string {
  return JSON.stringify(meta);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function pick(...vals: (string | undefined | null)[]): string {
  for (const v of vals) {
    if (v?.trim()) return v.trim();
  }
  return "";
}

type CounterpartyLike = {
  id?: number;
  fullName?: string | null;
  iin?: string | null;
  phone?: string | null;
  address?: string | null;
  additionalContact?: string | null;
  comment?: string | null;
} | null;

type ContractLike = {
  buyerName?: string | null;
  buyerPhone?: string | null;
  buyerMeta?: string | null;
};

/** Найти карточку покупателя по buyerId или ФИО на договоре */
export async function findCounterpartyForContract(
  companyId: number,
  buyerId: number | null | undefined,
  buyerName: string | null | undefined,
): Promise<typeof counterpartiesTable.$inferSelect | null> {
  if (buyerId) {
    const [cp] = await db
      .select()
      .from(counterpartiesTable)
      .where(
        and(
          eq(counterpartiesTable.id, buyerId),
          eq(counterpartiesTable.companyId, companyId),
        ),
      );
    if (cp) return cp;
  }

  const name = buyerName?.trim();
  if (!name) return null;

  const [exact] = await db
    .select()
    .from(counterpartiesTable)
    .where(
      and(
        eq(counterpartiesTable.companyId, companyId),
        ilike(counterpartiesTable.fullName, name),
      ),
    )
    .limit(1);
  if (exact) return exact;

  const [fuzzy] = await db
    .select()
    .from(counterpartiesTable)
    .where(
      and(
        eq(counterpartiesTable.companyId, companyId),
        ilike(counterpartiesTable.fullName, `%${name}%`),
      ),
    )
    .limit(1);
  return fuzzy || null;
}

/** Данные покупателя: карточка контрагента + поля договора + buyer_meta */
export function mergeContractBuyer(
  counterparty: CounterpartyLike,
  contract: ContractLike,
): ContractBuyerData {
  const cpMeta = parseBuyerMeta(counterparty?.comment);
  const contractMeta = parseBuyerMeta(contract.buyerMeta);

  const fullName = pick(contract.buyerName, counterparty?.fullName);
  const gender: "м" | "ж" =
    contractMeta.gender || cpMeta.gender || "м";
  const dateOfBirth = pick(contractMeta.dateOfBirth, cpMeta.dateOfBirth);
  const innPin = pick(
    contractMeta.innPin,
    counterparty?.iin,
    cpMeta.innPin,
  );
  const passportSeries = pick(
    contractMeta.passportSeries,
    cpMeta.passportSeries,
  );
  const passportIssuedBy = pick(
    contractMeta.passportIssuedBy,
    cpMeta.passportIssuedBy,
  );
  const passportDate = pick(contractMeta.passportDate, cpMeta.passportDate);
  const address = pick(
    contractMeta.address,
    counterparty?.address,
    cpMeta.address,
  );
  const phone = pick(
    contract.buyerPhone,
    contractMeta.phone,
    counterparty?.phone,
    counterparty?.additionalContact,
    cpMeta.phone,
  );
  const fullNameGenitive = pick(
    contractMeta.fullNameGenitive,
    cpMeta.fullNameGenitive,
    suggestGenitiveName(fullName, gender),
  );

  return {
    fullName,
    fullNameGenitive,
    gender,
    dateOfBirth,
    innPin,
    passportSeries,
    passportIssuedBy,
    passportDate,
    address,
    phone,
  };
}

export function buyerToExtraMeta(buyer: ContractBuyerData): BuyerExtraMeta {
  return {
    gender: buyer.gender,
    dateOfBirth: buyer.dateOfBirth || undefined,
    fullNameGenitive: buyer.fullNameGenitive || undefined,
    passportSeries: buyer.passportSeries || undefined,
    passportIssuedBy: buyer.passportIssuedBy || undefined,
    passportDate: buyer.passportDate || undefined,
    address: buyer.address || undefined,
    phone: buyer.phone || undefined,
    innPin: buyer.innPin || undefined,
  };
}
