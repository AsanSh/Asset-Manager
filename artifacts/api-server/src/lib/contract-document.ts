const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];

export type ContractDocumentMeta = {
  fileName: string;
  mimeType: string;
  dataBase64: string;
  uploadedAt: string;
};

export type ContractDocumentSummary = {
  fileName: string;
  mimeType: string;
  uploadedAt: string;
};

export function buildContractDocumentMeta(body: {
  fileName?: unknown;
  dataBase64?: unknown;
  mimeType?: unknown;
}): { meta?: string; error?: string; summary?: ContractDocumentSummary } {
  const fileName = String(body.fileName ?? "").trim();
  const dataBase64 = String(body.dataBase64 ?? "").trim();
  const mimeType = String(body.mimeType ?? "application/octet-stream").trim();

  if (!fileName || !dataBase64) {
    return { error: "Укажите fileName и dataBase64" };
  }

  const lower = fileName.toLowerCase();
  if (!ALLOWED_EXT.some((ext) => lower.endsWith(ext))) {
    return { error: "Допустимы PDF, DOC, DOCX, JPG, PNG" };
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(dataBase64, "base64");
  } catch {
    return { error: "Некорректный формат файла" };
  }

  if (buf.length === 0) {
    return { error: "Файл пустой" };
  }
  if (buf.length > MAX_BYTES) {
    return { error: "Файл не должен превышать 5 МБ" };
  }

  const uploadedAt = new Date().toISOString();
  const meta = JSON.stringify({ fileName, mimeType, dataBase64, uploadedAt });
  return {
    meta,
    summary: { fileName, mimeType, uploadedAt },
  };
}

export function parseContractDocumentMeta(raw: string | null | undefined): ContractDocumentMeta | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ContractDocumentMeta>;
    if (!parsed.fileName || !parsed.dataBase64) return null;
    return {
      fileName: String(parsed.fileName),
      mimeType: String(parsed.mimeType ?? "application/octet-stream"),
      dataBase64: String(parsed.dataBase64),
      uploadedAt: String(parsed.uploadedAt ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function summarizeContractDocument(raw: string | null | undefined): ContractDocumentSummary | null {
  const doc = parseContractDocumentMeta(raw);
  if (!doc) return null;
  return {
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    uploadedAt: doc.uploadedAt,
  };
}
