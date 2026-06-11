import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computePayrollSalaryDelta,
  normalizePayrollDate,
  toPayrollAmount,
} from "./payroll-utils";

describe("payroll utils", () => {
  it("toPayrollAmount — число в строку, мусор → 0", () => {
    assert.equal(toPayrollAmount(45000), "45000");
    assert.equal(toPayrollAmount("52000.5"), "52000.5");
    assert.equal(toPayrollAmount(undefined), "0");
    assert.equal(toPayrollAmount("не число"), "0");
  });

  it("normalizePayrollDate — ISO, dmy, пусто", () => {
    assert.equal(normalizePayrollDate("2026-03-15"), "2026-03-15");
    assert.equal(normalizePayrollDate("15.03.2026"), "2026-03-15");
    assert.equal(normalizePayrollDate(""), null);
    assert.equal(normalizePayrollDate(null), null);
  });

  it("computePayrollSalaryDelta — дельта при одобрении заявки", () => {
    assert.equal(computePayrollSalaryDelta("40000", "55000"), "15000");
    assert.equal(computePayrollSalaryDelta("60000", "50000"), "-10000");
    assert.equal(computePayrollSalaryDelta(null, "30000"), "30000");
  });
});
