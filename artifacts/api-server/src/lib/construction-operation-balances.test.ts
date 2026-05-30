import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyOpBalances, reverseOpBalances } from "./construction-operation-balances";

/**
 * Мок-executor вместо реальной БД: перехватывает .update().set().where().
 * Позволяет проверить транзакционную обвязку (txOrDb) и направление движений
 * без подключения к Postgres.
 */
function makeMockExec() {
  const updates: Array<{ set: any }> = [];
  const exec = {
    update() {
      const call: { set: any } = { set: null };
      updates.push(call);
      return {
        set(vals: any) {
          call.set = vals;
          return {
            where() {
              return Promise.resolve();
            },
          };
        },
      };
    },
  };
  return { exec, updates };
}

const income = (toAccountId: number, amountKgs: string) => ({
  type: "income",
  status: "approved",
  fromAccountId: null,
  toAccountId,
  amountKgs,
});

const transfer = (from: number, to: number, amountKgs: string) => ({
  type: "transfer",
  status: "approved",
  fromAccountId: from,
  toAccountId: to,
  amountKgs,
});

describe("balance helpers — транзакционная обвязка (txOrDb)", () => {
  it("applyOpBalances пишет ТОЛЬКО через переданный executor (income → 1 update)", async () => {
    const { exec, updates } = makeMockExec();
    await applyOpBalances(1, income(5, "1000"), exec);
    assert.equal(updates.length, 1, "income должен сделать ровно одно изменение баланса");
    assert.ok(updates[0].set?.currentBalance, "должен меняться currentBalance");
  });

  it("reverseOpBalances пишет через переданный executor (income → 1 update)", async () => {
    const { exec, updates } = makeMockExec();
    await reverseOpBalances(1, income(5, "1000"), exec);
    assert.equal(updates.length, 1, "откат income должен сделать ровно одно изменение");
  });

  it("transfer трогает оба счёта (2 update) и при apply, и при reverse", async () => {
    const a = makeMockExec();
    await applyOpBalances(1, transfer(1, 2, "500"), a.exec);
    assert.equal(a.updates.length, 2, "перевод меняет баланс двух счетов");

    const b = makeMockExec();
    await reverseOpBalances(1, transfer(1, 2, "500"), b.exec);
    assert.equal(b.updates.length, 2, "откат перевода тоже меняет два счёта");
  });

  it("apply не трогает баланс для неподтверждённых операций", async () => {
    const { exec, updates } = makeMockExec();
    await applyOpBalances(1, { ...income(5, "1000"), status: "cancelled" }, exec);
    assert.equal(updates.length, 0, "cancelled-операция не должна менять баланс");
  });

  it("нулевая/отрицательная сумма не порождает изменений", async () => {
    const a = makeMockExec();
    await applyOpBalances(1, income(5, "0"), a.exec);
    assert.equal(a.updates.length, 0);

    const b = makeMockExec();
    await reverseOpBalances(1, income(5, "-10"), b.exec);
    assert.equal(b.updates.length, 0);
  });
});
