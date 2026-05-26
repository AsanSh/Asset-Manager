import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getScopedCompanyId } from "./tenant";
import type { AuthenticatedRequest } from "./auth";

function mockReq(partial: Partial<AuthenticatedRequest> & { query?: Record<string, string> }): AuthenticatedRequest {
  return partial as AuthenticatedRequest;
}

describe("getScopedCompanyId", () => {
  it("returns companyId for regular user", () => {
    const cid = getScopedCompanyId(mockReq({ companyId: 42, userRole: "admin" }));
    assert.equal(cid, 42);
  });

  it("returns undefined when tenant user has no company", () => {
    const cid = getScopedCompanyId(mockReq({ userRole: "admin" }));
    assert.equal(cid, undefined);
  });

  it("super_admin can pass companyId via query", () => {
    const cid = getScopedCompanyId(
      mockReq({ userRole: "super_admin", query: { companyId: "7" } }),
    );
    assert.equal(cid, 7);
  });

  it("super_admin falls back to user companyId", () => {
    const cid = getScopedCompanyId(
      mockReq({ userRole: "super_admin", companyId: 3 }),
    );
    assert.equal(cid, 3);
  });
});
