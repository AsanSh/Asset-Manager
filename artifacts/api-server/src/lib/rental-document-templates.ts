import { eq, and } from "drizzle-orm";
import { db, moduleSettingsTable } from "./db";
import {
  buildContractDocumentMeta,
  type ContractDocumentSummary,
} from "./contract-document";

export const RENTAL_DOC_TEMPLATES_MODULE = "rental_document_templates";

export const BUILTIN_TEMPLATE_IDS = [
  "lease",
  "act_handover",
  "invoice",
  "reconciliation",
  "termination",
  "addendum",
] as const;

export type CustomTemplateDef = {
  id: string;
  label: string;
  desc: string;
};

type StoredFile = ContractDocumentSummary & { dataBase64: string };

type RentalDocTemplatesStore = {
  files: Record<string, StoredFile>;
  custom: CustomTemplateDef[];
};

function emptyStore(): RentalDocTemplatesStore {
  return { files: {}, custom: [] };
}

function parseStore(raw: string | null | undefined): RentalDocTemplatesStore {
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as Partial<RentalDocTemplatesStore>;
    const files: Record<string, StoredFile> = {};
    if (parsed.files && typeof parsed.files === "object") {
      for (const [key, value] of Object.entries(parsed.files)) {
        if (!value?.fileName || !value?.dataBase64) continue;
        files[key] = {
          fileName: String(value.fileName),
          mimeType: String(value.mimeType ?? "application/octet-stream"),
          dataBase64: String(value.dataBase64),
          uploadedAt: String(value.uploadedAt ?? new Date().toISOString()),
        };
      }
    }
    const custom = Array.isArray(parsed.custom)
      ? parsed.custom
          .filter((c) => c?.id && c?.label)
          .map((c) => ({
            id: String(c.id),
            label: String(c.label),
            desc: String(c.desc ?? ""),
          }))
      : [];
    return { files, custom };
  } catch {
    return emptyStore();
  }
}

async function loadStore(companyId: number): Promise<RentalDocTemplatesStore> {
  const [row] = await db
    .select()
    .from(moduleSettingsTable)
    .where(
      and(
        eq(moduleSettingsTable.companyId, companyId),
        eq(moduleSettingsTable.moduleKey, RENTAL_DOC_TEMPLATES_MODULE),
      ),
    );
  return parseStore(row?.settings);
}

async function saveStore(companyId: number, store: RentalDocTemplatesStore): Promise<void> {
  const payload = JSON.stringify(store);
  const [existing] = await db
    .select()
    .from(moduleSettingsTable)
    .where(
      and(
        eq(moduleSettingsTable.companyId, companyId),
        eq(moduleSettingsTable.moduleKey, RENTAL_DOC_TEMPLATES_MODULE),
      ),
    );

  if (existing) {
    await db
      .update(moduleSettingsTable)
      .set({ settings: payload, isEnabled: true })
      .where(eq(moduleSettingsTable.id, existing.id));
    return;
  }

  await db.insert(moduleSettingsTable).values({
    companyId,
    moduleKey: RENTAL_DOC_TEMPLATES_MODULE,
    isEnabled: true,
    settings: payload,
  });
}

export function isValidTemplateId(id: string): boolean {
  return /^[a-z][a-z0-9_]{0,63}$/.test(id);
}

export function isKnownTemplateId(store: RentalDocTemplatesStore, templateId: string): boolean {
  if ((BUILTIN_TEMPLATE_IDS as readonly string[]).includes(templateId)) return true;
  return store.custom.some((c) => c.id === templateId);
}

export async function getRentalDocumentTemplatesList(companyId: number) {
  const store = await loadStore(companyId);
  const templateIds = [
    ...BUILTIN_TEMPLATE_IDS,
    ...store.custom.map((c) => c.id),
  ];
  const uploads: Record<string, ContractDocumentSummary | null> = {};
  for (const id of templateIds) {
    const file = store.files[id];
    uploads[id] = file
      ? {
          fileName: file.fileName,
          mimeType: file.mimeType,
          uploadedAt: file.uploadedAt,
        }
      : null;
  }
  return { custom: store.custom, uploads };
}

export async function getRentalDocumentTemplateFile(companyId: number, templateId: string) {
  const store = await loadStore(companyId);
  if (!isKnownTemplateId(store, templateId)) return null;
  return store.files[templateId] ?? null;
}

export async function uploadRentalDocumentTemplate(
  companyId: number,
  templateId: string,
  body: { fileName?: unknown; dataBase64?: unknown; mimeType?: unknown },
): Promise<{ error?: string; summary?: ContractDocumentSummary }> {
  if (!isValidTemplateId(templateId)) {
    return { error: "Некорректный идентификатор шаблона" };
  }

  const store = await loadStore(companyId);
  if (!isKnownTemplateId(store, templateId)) {
    return { error: "Шаблон не найден" };
  }

  const built = buildContractDocumentMeta(body);
  if (built.error || !built.meta || !built.summary) {
    return { error: built.error ?? "Не удалось загрузить файл" };
  }

  const parsed = JSON.parse(built.meta) as StoredFile;
  store.files[templateId] = parsed;
  await saveStore(companyId, store);
  return { summary: built.summary };
}

export async function deleteRentalDocumentTemplateFile(companyId: number, templateId: string) {
  const store = await loadStore(companyId);
  if (!isKnownTemplateId(store, templateId)) return false;
  if (!store.files[templateId]) return false;
  delete store.files[templateId];
  await saveStore(companyId, store);
  return true;
}

export async function addRentalCustomTemplate(
  companyId: number,
  label: string,
  desc: string,
): Promise<CustomTemplateDef> {
  const store = await loadStore(companyId);
  const id = `custom_${Date.now()}`;
  const item = { id, label, desc };
  store.custom.push(item);
  await saveStore(companyId, store);
  return item;
}

export async function deleteRentalCustomTemplate(companyId: number, templateId: string) {
  const store = await loadStore(companyId);
  const idx = store.custom.findIndex((c) => c.id === templateId);
  if (idx < 0) return false;
  store.custom.splice(idx, 1);
  delete store.files[templateId];
  await saveStore(companyId, store);
  return true;
}
