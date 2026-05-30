/**
 * File storage обёртка.
 *
 * Стратегия: использовать Vercel Blob если BLOB_READ_WRITE_TOKEN задан,
 * иначе fallback на base64-в-БД (backward compatibility).
 *
 * После добавления `pnpm add @vercel/blob` в api-server и установки
 * BLOB_READ_WRITE_TOKEN в Vercel env — все новые загрузки пойдут в Blob.
 * Старые base64-записи продолжают работать (см. summarizeContractDocument).
 */

import { logger } from "./logger";

export interface UploadedFile {
  url: string;        // публичный URL (Blob) или "base64:meta-id"
  fileName: string;
  mimeType: string;
  size: number;
  storage: "blob" | "base64-inline";
}

export interface UploadInput {
  fileName: string;
  mimeType: string;
  base64: string;     // raw base64 строка (без data:image/png;base64, префикса)
  /** Опциональный путь / namespace (например, "contracts/2026/05") */
  pathname?: string;
}

const BLOB_ENABLED = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function uploadFile(input: UploadInput): Promise<UploadedFile> {
  const { fileName, mimeType, base64, pathname } = input;
  const buffer = Buffer.from(base64, "base64");
  const size = buffer.length;

  if (BLOB_ENABLED) {
    try {
      // @ts-ignore — пакет может быть не установлен
      const { put } = await import("@vercel/blob");
      const key = pathname
        ? `${pathname}/${Date.now()}-${fileName}`
        : `documents/${Date.now()}-${fileName}`;
      const result = await put(key, buffer, {
        access: "public",
        contentType: mimeType,
      });
      return {
        url: result.url,
        fileName,
        mimeType,
        size,
        storage: "blob",
      };
    } catch (e) {
      logger.error({ err: (e as Error).message }, "Vercel Blob upload failed, fallback to base64");
      // Fallback ниже
    }
  }

  // Fallback: возвращаем структуру для записи в text-колонку.
  // Caller сам решает что делать (записать в БД или отказать).
  return {
    url: `inline:${fileName}`,
    fileName,
    mimeType,
    size,
    storage: "base64-inline",
  };
}

/**
 * Прочитать base64-документ из meta-строки (старый формат).
 * Используется для backward compatibility со старыми contract_document_meta.
 */
export function parseLegacyDocumentMeta(metaJson: string | null | undefined): UploadedFile | null {
  if (!metaJson) return null;
  try {
    const parsed = JSON.parse(metaJson);
    return {
      url: parsed.url || `inline:${parsed.fileName}`,
      fileName: parsed.fileName,
      mimeType: parsed.mimeType,
      size: parsed.size || 0,
      storage: parsed.url ? "blob" : "base64-inline",
    };
  } catch {
    return null;
  }
}

export function isBlobEnabled(): boolean {
  return BLOB_ENABLED;
}
