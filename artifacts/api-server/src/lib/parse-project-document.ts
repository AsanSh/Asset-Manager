import Anthropic from "@anthropic-ai/sdk";
import { chat } from "./ai";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

export type ParsedProjectDocument = {
  name?: string;
  address?: string;
  region?: string;
  totalFloors?: number | null;
  totalUnits?: number | null;
  totalArea?: number | null;
  buildingType?: string;
  constructionType?: string;
  currency?: string;
  costPerSqm?: number | null;
  startDate?: string | null;
  plannedEndDate?: string | null;
  description?: string;
  documentMeta?: {
    stage?: string;
    sections?: string;
    client?: string;
    director?: string;
    chiefArchitect?: string;
    contractorCompany?: string;
    license?: string;
    documentYear?: number | null;
    city?: string;
    projectTitle?: string;
  };
  confidence?: "high" | "medium" | "low";
};

const PARSE_SYSTEM = `Ты извлекаешь данные из титульного листа / паспорта строительного проекта (РФ/КР/СНГ).
Верни ТОЛЬКО валидный JSON без markdown:
{
  "name": "краткое название проекта для системы",
  "address": "адрес объекта",
  "region": "город или регион",
  "totalFloors": число этажей или null,
  "totalUnits": число квартир/юнитов или null,
  "totalArea": общая площадь м² или null,
  "buildingType": "apartment|commercial|office|warehouse|mixed|cottage",
  "constructionType": "monolith|brick|panel|frame|wood",
  "currency": "KGS|USD|EUR",
  "costPerSqm": null,
  "startDate": "YYYY-MM-DD или null",
  "plannedEndDate": "YYYY-MM-DD или null",
  "description": "краткое описание 1-2 предложения",
  "documentMeta": {
    "stage": "стадия РП/П/Р",
    "sections": "разделы ГП, АР и т.д.",
    "client": "заказчик",
    "director": "директор",
    "chiefArchitect": "ГАП",
    "contractorCompany": "проектная организация",
    "license": "лицензия",
    "documentYear": год число или null,
    "city": "город",
    "projectTitle": "полное название с титула"
  },
  "confidence": "high|medium|low"
}
Если поле не найдено — null или пропусти. Не выдумывай цифры.`;

function stripJson(text: string): string {
  const t = text.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

export function normalizeParsed(raw: ParsedProjectDocument): ParsedProjectDocument {
  const bt = raw.buildingType?.toLowerCase();
  const allowedBt = new Set([
    "apartment", "commercial", "office", "warehouse", "mixed", "cottage",
  ]);
  const ct = raw.constructionType?.toLowerCase();
  const allowedCt = new Set(["monolith", "brick", "panel", "frame", "wood"]);

  return {
    ...raw,
    buildingType: bt && allowedBt.has(bt) ? bt : raw.buildingType || "commercial",
    constructionType: ct && allowedCt.has(ct) ? ct : raw.constructionType || "monolith",
    currency: raw.currency === "USD" || raw.currency === "EUR" ? raw.currency : "KGS",
    totalFloors: raw.totalFloors != null ? Number(raw.totalFloors) : null,
    totalUnits: raw.totalUnits != null ? Number(raw.totalUnits) : null,
    totalArea: raw.totalArea != null ? Number(raw.totalArea) : null,
  };
}

async function parseFromText(documentText: string): Promise<ParsedProjectDocument> {
  const text = await chat(
    [{ role: "user", content: `Извлеки данные проекта из документа:\n\n${documentText.slice(0, 60000)}` }],
    PARSE_SYSTEM,
    4096,
  );
  return normalizeParsed(JSON.parse(stripJson(text)) as ParsedProjectDocument);
}

/** PDF напрямую в Claude (сканы, титульные листы с картинками) */
export async function parseProjectDocumentFromPdf(
  base64: string,
  fileName?: string,
): Promise<ParsedProjectDocument> {
  const content: Anthropic.MessageParam["content"] = [
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64,
      },
    },
    {
      type: "text",
      text: `Файл: ${fileName || "project.pdf"}\nИзвлеки все данные строительного проекта с титульного листа. Ответ — только JSON по схеме из системного промпта.`,
    },
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: PARSE_SYSTEM,
    messages: [{ role: "user", content }],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected AI response");
  return normalizeParsed(JSON.parse(stripJson(block.text)) as ParsedProjectDocument);
}

export async function parseProjectDocumentFromImage(
  base64: string,
  mediaType: string,
  fileName?: string,
): Promise<ParsedProjectDocument> {
  const content: Anthropic.MessageParam["content"] = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
        data: base64,
      },
    },
    {
      type: "text",
      text: `Файл: ${fileName || "document"}\nИзвлеки все данные строительного проекта с титульного листа. Ответ — только JSON по схеме из системного промпта.`,
    },
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: PARSE_SYSTEM,
    messages: [{ role: "user", content }],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected AI response");
  return normalizeParsed(JSON.parse(stripJson(block.text)) as ParsedProjectDocument);
}

export async function parseProjectDocument(input: {
  base64: string;
  mimeType: string;
  fileName?: string;
}): Promise<ParsedProjectDocument> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY не настроен на сервере");
  }

  const buf = Buffer.from(input.base64, "base64");
  const mime = input.mimeType.toLowerCase();

  if (mime.startsWith("image/")) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const mt = allowed.includes(mime) ? mime : "image/jpeg";
    return parseProjectDocumentFromImage(input.base64, mt, input.fileName);
  }

  if (mime === "application/pdf" || input.fileName?.toLowerCase().endsWith(".pdf")) {
    // Сначала Claude читает PDF целиком (в т.ч. сканы)
    try {
      return await parseProjectDocumentFromPdf(input.base64, input.fileName);
    } catch (pdfErr) {
      // Запасной путь: текстовый слой PDF
      try {
        const { default: pdfParse } = await import("pdf-parse");
        const pdf = await pdfParse(buf);
        const text = pdf.text?.trim();
        if (text && text.length >= 20) {
          return parseFromText(text);
        }
      } catch {
        /* ignore */
      }
      const msg =
        pdfErr instanceof Error ? pdfErr.message : "Ошибка чтения PDF";
      throw new Error(
        `${msg}. Попробуйте загрузить фото титульного листа (PNG/JPG) — так надёжнее.`,
      );
    }
  }

  throw new Error("Поддерживаются PDF, PNG, JPG, WEBP");
}
