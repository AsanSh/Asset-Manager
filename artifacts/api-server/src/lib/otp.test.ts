import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "./otp";

describe("normalizePhone", () => {
  it("сохраняет + в начале и убирает остальные нецифровые символы", () => {
    assert.equal(normalizePhone("+996 (700) 123-456"), "+996700123456");
  });
  it("без + возвращает только цифры", () => {
    assert.equal(normalizePhone("8 (700) 123 456"), "8700123456");
  });
  it("обрабатывает пустую строку", () => {
    assert.equal(normalizePhone(""), "");
  });
  it("обрабатывает только пробелы", () => {
    assert.equal(normalizePhone("   "), "");
  });
  it("сохраняет + даже если за ним сразу скобки", () => {
    assert.equal(normalizePhone("+(996)700-123-456"), "+996700123456");
  });
});
