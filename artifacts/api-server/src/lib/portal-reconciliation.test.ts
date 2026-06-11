import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildBuyerReconciliation,
  buildSupplierReconciliation,
} from "./portal-reconciliation";

describe("buildSupplierReconciliation", () => {
  it("считает outstanding и cumulative paid по платежам", () => {
    const result = buildSupplierReconciliation({
      contractAmount: 100_000,
      paidAmount: 30_000,
      currency: "KGS",
      deliveries: [
        {
          documentDate: "2026-01-15",
          itemName: "Бетон",
          documentNumber: "1",
          totalAmount: "40000",
        },
      ],
      payments: [
        { date: "2026-02-01", amount: "20000", description: "Аванс" },
        { date: "2026-02-15", amount: "10000" },
      ],
    });

    assert.equal(result.outstanding, 70_000);
    assert.equal(result.totalSupplied, 40_000);
    assert.equal(result.currency, "KGS");

    const payLines = result.lines.filter((l) => l.type === "payment");
    assert.equal(payLines.length, 2);
    const maxPaidTotal = Math.max(...payLines.map((l) => l.paidTotal ?? 0));
    assert.equal(maxPaidTotal, 30_000);
    const withBalance = payLines.find((l) => l.balanceAfter != null);
    assert.equal(withBalance?.balanceAfter, 70_000);
  });

  it("сортирует строки по дате (поставки + оплаты)", () => {
    const result = buildSupplierReconciliation({
      contractAmount: 50_000,
      paidAmount: 0,
      currency: "KGS",
      deliveries: [{ documentDate: "2026-03-01", totalAmount: "10000" }],
      payments: [{ date: "2026-01-01", amount: "5000" }],
    });
    const dates = result.lines.map((l) => l.date);
    assert.deepEqual(dates, ["2026-01-01", "2026-03-01"]);
  });
});

describe("buildBuyerReconciliation", () => {
  it("накапливает balanceAfter: начисления +, оплаты −", () => {
    const result = buildBuyerReconciliation({
      contractAmount: 200_000,
      totalCharged: 60_000,
      totalPaid: 25_000,
      currency: "KGS",
      accruals: [
        { dueDate: "2026-01-10", amount: "30000", installmentNumber: 1 },
        { dueDate: "2026-02-10", amount: "30000", installmentNumber: 2 },
      ],
      payments: [{ date: "2026-01-20", amount: "25000", description: "Оплата" }],
    });

    assert.equal(result.outstanding, 35_000);
    assert.equal(result.lines.length, 3);
    assert.equal(result.lines[0].balanceAfter, 30_000);
    assert.equal(result.lines[1].balanceAfter, 5000);
    assert.equal(result.lines[2].balanceAfter, 35_000);
  });

  it("использует notes или номер платежа в описании начисления", () => {
    const result = buildBuyerReconciliation({
      contractAmount: 100_000,
      totalCharged: 10_000,
      totalPaid: 0,
      currency: "KGS",
      accruals: [
        { dueDate: "2026-04-01", amount: "10000", installmentNumber: 3, notes: "Этап 2" },
      ],
      payments: [],
    });
    assert.equal(result.lines[0].description, "Этап 2");
  });
});
