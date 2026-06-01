import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { db, crmLeadsTable } from "./db";
import { decryptSecret, encryptSecret } from "./secret-crypto";

export type IntakeLeadPayload = {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  channel?: string | null;
  projectId?: number | null;
  externalId?: string | null;
  propertyType?: string | null;
  budget?: string | null;
  notes?: string | null;
};

export type CrmInstagramSettings = {
  webhookKey?: string;
  verifyToken?: string;
  pageId?: string;
  instagramAccountId?: string;
  /** Page access token — пользователь добавит позже */
  accessToken?: string;
  appSecret?: string;
  defaultProjectId?: number | null;
};

export function parseInstagramSettings(raw: string | null | undefined): CrmInstagramSettings {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as CrmInstagramSettings;
    return {
      ...parsed,
      accessToken: parsed.accessToken ? decryptSecret(parsed.accessToken) : undefined,
      appSecret: parsed.appSecret ? decryptSecret(parsed.appSecret) : undefined,
    };
  } catch {
    return {};
  }
}

/** Сериализация для БД — секреты шифруются. */
export function serializeInstagramSettings(settings: CrmInstagramSettings): string {
  return JSON.stringify({
    ...settings,
    accessToken: settings.accessToken ? encryptSecret(settings.accessToken) : "",
    appSecret: settings.appSecret ? encryptSecret(settings.appSecret) : "",
  });
}

export function generateWebhookKey(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function generateVerifyToken(): string {
  return crypto.randomBytes(12).toString("hex");
}

/** Извлекает телефон из текста сообщения (KG форматы). */
export function extractPhoneFromText(text: string): string | null {
  const m = text.match(/(?:\+996|996|0)\s?[\d\s\-()]{8,14}/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("996")) return `+${digits}`;
  if (digits.startsWith("0")) return `+996${digits.slice(1)}`;
  return `+${digits}`;
}

export async function upsertLeadFromIntake(
  companyId: number,
  payload: IntakeLeadPayload,
): Promise<{ lead: typeof crmLeadsTable.$inferSelect; deduplicated: boolean }> {
  const normalizedChannel = payload.channel ? String(payload.channel).trim() : null;
  const normalizedExternalId = payload.externalId ? String(payload.externalId).trim() : null;

  if (normalizedExternalId && normalizedChannel) {
    const [existing] = await db
      .select()
      .from(crmLeadsTable)
      .where(
        and(
          eq(crmLeadsTable.companyId, companyId),
          eq(crmLeadsTable.channel, normalizedChannel),
          eq(crmLeadsTable.externalId, normalizedExternalId),
        ),
      );
    if (existing) {
      return { lead: existing, deduplicated: true };
    }
  }

  const [lead] = await db
    .insert(crmLeadsTable)
    .values({
      companyId,
      fullName: payload.fullName.trim(),
      phone: payload.phone ? String(payload.phone) : null,
      email: payload.email ? String(payload.email) : null,
      source: payload.source ? String(payload.source) : "social",
      status: "new",
      channel: normalizedChannel,
      projectId: payload.projectId ?? null,
      externalId: normalizedExternalId,
      propertyType: payload.propertyType ? String(payload.propertyType) : null,
      budget: payload.budget != null ? String(payload.budget) : null,
      notes: payload.notes ? String(payload.notes) : null,
    })
    .returning();

  return { lead, deduplicated: false };
}

export function verifyMetaHub(query: Record<string, unknown>, verifyToken: string): string | null {
  const mode = String(query["hub.mode"] ?? "");
  const token = String(query["hub.verify_token"] ?? "");
  const challenge = String(query["hub.challenge"] ?? "");
  if (mode === "subscribe" && token === verifyToken && challenge) {
    return challenge;
  }
  return null;
}

export function verifyMetaSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice(7);
  const hmac = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

type LeadgenField = { name: string; values: string[] };

export async function fetchLeadgenFromGraph(
  leadgenId: string,
  accessToken: string,
): Promise<{ fullName?: string; phone?: string; email?: string; notes?: string } | null> {
  try {
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(leadgenId)}?fields=field_data,created_time&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { field_data?: LeadgenField[]; created_time?: string };
    const fields = data.field_data ?? [];
    const byName = (names: string[]) => {
      for (const n of names) {
        const f = fields.find((x) => x.name.toLowerCase() === n.toLowerCase());
        if (f?.values?.[0]) return f.values[0];
      }
      return undefined;
    };
    const joinedName = [byName(["first_name", "first name"]), byName(["last_name", "last name"])]
      .filter(Boolean)
      .join(" ")
      .trim();
    const fullName =
      byName(["full_name", "full name", "name", "имя", "fio"]) ??
      (joinedName || undefined);
    const phone = byName(["phone_number", "phone", "telephone", "телефон", "mobile"]);
    const email = byName(["email", "e-mail", "почта"]);
    const notesParts = fields
      .filter((f) => !["full_name", "first_name", "last_name", "phone_number", "email"].includes(f.name))
      .map((f) => `${f.name}: ${f.values.join(", ")}`);
    return {
      fullName,
      phone,
      email,
      notes: notesParts.length ? notesParts.join("\n") : undefined,
    };
  } catch {
    return null;
  }
}

export type InstagramWebhookResult = {
  created: number;
  deduplicated: number;
  skipped: number;
};

/** Разбор Meta webhook (Instagram DM + Lead Ads). */
export async function processInstagramWebhook(
  body: unknown,
  settings: CrmInstagramSettings,
  companyId: number,
): Promise<InstagramWebhookResult> {
  const result: InstagramWebhookResult = { created: 0, deduplicated: 0, skipped: 0 };
  if (!body || typeof body !== "object") return result;

  const root = body as { object?: string; entry?: unknown[] };
  const entries = Array.isArray(root.entry) ? root.entry : [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;

    // Instagram / Messenger DM
    const messaging = Array.isArray(e.messaging) ? e.messaging : [];
    for (const ev of messaging) {
      if (!ev || typeof ev !== "object") continue;
      const msg = ev as {
        sender?: { id?: string };
        message?: { mid?: string; text?: string };
      };
      const text = msg.message?.text?.trim();
      const mid = msg.message?.mid;
      const senderId = msg.sender?.id;
      if (!text && !mid) {
        result.skipped += 1;
        continue;
      }
      const phone = text ? extractPhoneFromText(text) : null;
      const externalId = mid ? `ig_dm_${mid}` : senderId ? `ig_sender_${senderId}_${Date.now()}` : null;
      const { deduplicated } = await upsertLeadFromIntake(companyId, {
        fullName: `Instagram #${(senderId ?? "unknown").slice(-8)}`,
        phone,
        source: "social",
        channel: "instagram",
        projectId: settings.defaultProjectId ?? null,
        externalId,
        notes: text ? `Instagram DM:\n${text}` : "Instagram DM (без текста)",
      });
      if (deduplicated) result.deduplicated += 1;
      else result.created += 1;
    }

    // Lead Ads (leadgen)
    const changes = Array.isArray(e.changes) ? e.changes : [];
    for (const ch of changes) {
      if (!ch || typeof ch !== "object") continue;
      const change = ch as { field?: string; value?: Record<string, unknown> };
      if (change.field !== "leadgen") continue;
      const val = change.value ?? {};
      const leadgenId = val.leadgen_id ? String(val.leadgen_id) : null;
      if (!leadgenId) {
        result.skipped += 1;
        continue;
      }

      let fullName = "Instagram Lead";
      let phone: string | null = null;
      let email: string | null = null;
      let notes = `Lead Ads ID: ${leadgenId}`;

      if (settings.accessToken) {
        const details = await fetchLeadgenFromGraph(leadgenId, settings.accessToken);
        if (details) {
          fullName = details.fullName || fullName;
          phone = details.phone ?? null;
          email = details.email ?? null;
          if (details.notes) notes = details.notes;
        }
      } else {
        notes += "\n\nПодключите Page Access Token в настройках CRM → Приём лидов → Instagram, чтобы подтягивать поля формы.";
      }

      const { deduplicated } = await upsertLeadFromIntake(companyId, {
        fullName,
        phone,
        email,
        source: "advertising",
        channel: "instagram",
        projectId: settings.defaultProjectId ?? null,
        externalId: `ig_lead_${leadgenId}`,
        notes,
      });
      if (deduplicated) result.deduplicated += 1;
      else result.created += 1;
    }
  }

  return result;
}
