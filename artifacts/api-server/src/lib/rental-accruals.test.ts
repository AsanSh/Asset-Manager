import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRentalAccrualRows, daysInMonth } from "./rental-accruals";

describe("rental accruals", () => {
  it("daysInMonth — февраль високосный и обычный", () => {
    assert.equal(daysInMonth(2026, 1), 28);
    assert.equal(daysInMonth(2024, 1), 29);
    assert.equal(daysInMonth(2026, 0), 31);
  });

  it("полный месяц с 1-го — полная ставка аренды", () => {
    const rows = buildRentalAccrualRows({
      companyId: 1,
      leaseContractId: 10,
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 0, 31),
      rentAmount: 30_000,
      currency: "KGS",
      accrualDay: 5,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].amount, "30000");
    assert.equal(rows[0].dueDate, "2026-01-05");
    assert.equal(rows[0].period, "2026-01");
  });

  it("первый месяц с середины — пропорция по дням", () => {
    const rows = buildRentalAccrualRows({
      companyId: 1,
      leaseContractId: 10,
      startDate: new Date(2026, 0, 16),
      endDate: new Date(2026, 2, 31),
      rentAmount: 31_000,
      currency: "KGS",
      accrualDay: 1,
    });
    assert.equal(rows[0].period, "2026-01");
    // 16–31 января = 16 дней из 31 → 31000/31*16 ≈ 16000
    assert.equal(parseFloat(rows[0].amount), 16000);
    assert.equal(rows[1].amount, "31000");
  });

  it("договор в одном месяце — пропорция start..end", () => {
    const rows = buildRentalAccrualRows({
      companyId: 1,
      leaseContractId: 10,
      startDate: new Date(2026, 5, 10),
      endDate: new Date(2026, 5, 20),
      rentAmount: 30_000,
      currency: "KGS",
      accrualDay: 15,
    });
    assert.equal(rows.length, 1);
    // 10–20 июня = 11 дней из 30
    const expected = Math.round((30_000 / 30) * 11 * 100) / 100;
    assert.equal(parseFloat(rows[0].amount), expected);
  });
});
