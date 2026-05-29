import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Воспроизводим логику из routes/counterparties.ts чтобы протестировать
// нормализацию ролей и проверку допустимости без поднятия HTTP-сервера.

const VALID_ROLES = [
  "tenant", "landlord",
  "buyer", "seller", "lead",
  "material_supplier",
  "service_provider", "subcontractor",
  "other",
];

function normalizeCategories(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter((c) => typeof c === "string");
  if (typeof input === "string") return [input];
  return [];
}

function pickInvalid(cats: string[]): string[] {
  return cats.filter((c) => !VALID_ROLES.includes(c));
}

describe("counterparty roles", () => {
  it("принимает массив строк", () => {
    assert.deepEqual(normalizeCategories(["tenant", "buyer"]), ["tenant", "buyer"]);
  });

  it("принимает одну строку и оборачивает в массив", () => {
    assert.deepEqual(normalizeCategories("material_supplier"), ["material_supplier"]);
  });

  it("возвращает пустой массив для null/undefined", () => {
    assert.deepEqual(normalizeCategories(null), []);
    assert.deepEqual(normalizeCategories(undefined), []);
    assert.deepEqual(normalizeCategories(""), []);
  });

  it("отбрасывает не-строки внутри массива", () => {
    const result = normalizeCategories(["tenant", 42, null, "buyer"] as any);
    assert.deepEqual(result, ["tenant", "buyer"]);
  });

  it("валидирует — пропускает корректные роли", () => {
    assert.deepEqual(pickInvalid(["tenant", "buyer", "service_provider"]), []);
  });

  it("валидирует — отлавливает недопустимые роли", () => {
    assert.deepEqual(pickInvalid(["tenant", "hacker", "buyer"]), ["hacker"]);
  });

  it("одного контрагента можно отметить несколькими ролями", () => {
    const result = normalizeCategories(["material_supplier", "buyer"]);
    assert.equal(result.length, 2);
    assert.deepEqual(pickInvalid(result), []);
  });
});
