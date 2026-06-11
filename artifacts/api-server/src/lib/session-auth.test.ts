import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashSessionToken } from "./session-auth";

describe("session-auth", () => {
  it("hashSessionToken — детерминированный SHA-256 hex (64 символа)", () => {
    const plain = "a".repeat(64);
    const h1 = hashSessionToken(plain);
    const h2 = hashSessionToken(plain);
    assert.equal(h1, h2);
    assert.match(h1, /^[a-f0-9]{64}$/);
    assert.notEqual(h1, plain);
  });

  it("разные plain-токены дают разные хеши", () => {
    assert.notEqual(
      hashSessionToken("token-one"),
      hashSessionToken("token-two"),
    );
  });
});
