import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getListAccrualsQueryKey,
  getListPaymentsQueryKey,
  getRentalAccountsQueryKey,
} from "./rental-query-keys.ts";

describe("rental-query-keys", () => {
  it("uses stable api-client paths", () => {
    assert.deepEqual(getListPaymentsQueryKey(), ["/rental/payments"]);
    assert.deepEqual(getListAccrualsQueryKey(), ["/rental/accruals"]);
  });

  it("rental accounts key is namespaced", () => {
    assert.deepEqual(getRentalAccountsQueryKey(), ["/rental/accounts"]);
  });
});
