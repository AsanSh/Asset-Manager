import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  absReconciliationAmount,
  buildReconciliationPairKey,
  normalizeReconciliationDate,
} from "./finance-reconciliation-utils";

describe("finance-reconciliation utils", () => {
  it("normalizeReconciliationDate — ISO и dd.mm.yyyy", () => {
    assert.equal(normalizeReconciliationDate("2026-06-11"), "2026-06-11");
    assert.equal(normalizeReconciliationDate("11.06.2026"), "2026-06-11");
    assert.equal(normalizeReconciliationDate("5/3/2026"), "2026-03-05");
  });

  it("absReconciliationAmount — модуль и нечисловые значения", () => {
    assert.equal(absReconciliationAmount("-1500.50"), "1500.5");
    assert.equal(absReconciliationAmount("abc"), "0");
  });

  it("buildReconciliationPairKey — дата|сумма для матчинга", () => {
    assert.equal(
      buildReconciliationPairKey("2026-06-11", "-100"),
      "2026-06-11|100",
    );
    assert.equal(
      buildReconciliationPairKey("2026-01-01", "500.00"),
      "2026-01-01|500",
    );
  });
});
