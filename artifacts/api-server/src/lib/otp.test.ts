import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "./otp";

describe("normalizePhone", () => {
  it("всегда возвращает с + впереди (E.164)", () => {
    assert.equal(normalizePhone("+996 (700) 123-456"), "+996700123456");
  });
  it("добавляет + даже если входной номер без него", () => {
    assert.equal(normalizePhone("996 700 123 456"), "+996700123456");
  });
  it("обрабатывает пустую строку", () => {
    assert.equal(normalizePhone(""), "");
  });
  it("обрабатывает только пробелы", () => {
    assert.equal(normalizePhone("   "), "");
  });
  it("один и тот же номер с + и без — даёт один результат", () => {
    assert.equal(normalizePhone("+996700123456"), normalizePhone("996700123456"));
  });
});
