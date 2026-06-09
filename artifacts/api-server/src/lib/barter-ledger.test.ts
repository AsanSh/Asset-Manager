import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeAssetRemainder,
  deriveAssetStatus,
  parseAmount,
} from "./barter-ledger";

describe("barter-ledger helpers", () => {
  it("parseAmount rejects zero and negative", () => {
    assert.throws(() => parseAmount(0), /больше нуля/);
    assert.throws(() => parseAmount(-5), /больше нуля/);
    assert.equal(parseAmount("150000"), 150000);
  });

  it("computeAssetRemainder = accepted - disposed", () => {
    assert.equal(computeAssetRemainder("500000", "200000"), 300000);
    assert.equal(computeAssetRemainder("100", "150"), 0);
  });

  it("deriveAssetStatus reflects stock lifecycle", () => {
    assert.equal(deriveAssetStatus(500000, 0, "in_stock"), "in_stock");
    assert.equal(deriveAssetStatus(500000, 200000, "in_stock"), "partial");
    assert.equal(deriveAssetStatus(500000, 500000, "partial"), "disposed");
    assert.equal(deriveAssetStatus(0, 0, "cancelled"), "cancelled");
  });
});
