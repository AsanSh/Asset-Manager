import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sendServerError } from "./http-errors";

describe("sendServerError", () => {
  it("returns generic message without leaking Error.message", () => {
    let status = 0;
    let body: { error?: string } = {};
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(payload: { error?: string }) {
        body = payload;
      },
    };
    sendServerError(res as never, new Error("secret db connection failed"), "Внутренняя ошибка");
    assert.equal(status, 500);
    assert.equal(body.error, "Внутренняя ошибка");
    assert.notEqual(body.error, "secret db connection failed");
  });
});
