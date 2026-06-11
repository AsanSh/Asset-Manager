import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allocatePaymentAcrossAccruals } from "./payment-allocation";

type MockAccrual = {
  id: number;
  installmentNumber: number;
  dueDate: string;
  amount: string;
  paidAmount: string;
  remainingAmount: string;
  paidAt: string | null;
};

function makeAllocationMock(initial: MockAccrual[]) {
  const accruals = initial.map((a) => ({ ...a }));
  const updates: Array<{ id: number; set: Record<string, unknown> }> = [];

  function openBalance(acc: MockAccrual): number {
    const rem = parseFloat(acc.remainingAmount || "0");
    if (rem > 0.01) return rem;
    const total = parseFloat(acc.amount || "0");
    const paid = parseFloat(acc.paidAmount || "0");
    return Math.max(0, total - paid);
  }

  const exec = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                orderBy() {
                  return Promise.resolve(accruals);
                },
              };
            },
          };
        },
      };
    },
    update() {
      return {
        set(vals: Record<string, unknown>) {
          const acc = accruals.find((a) => openBalance(a) > 0.01);
          if (acc) {
            if (vals.paidAmount != null) acc.paidAmount = String(vals.paidAmount);
            if (vals.remainingAmount != null)
              acc.remainingAmount = String(vals.remainingAmount);
            if (vals.status != null) acc.status = String(vals.status);
            if (vals.paidAt !== undefined) acc.paidAt = vals.paidAt as string | null;
            updates.push({ id: acc.id, set: vals });
          }
          return {
            where() {
              return Promise.resolve();
            },
          };
        },
      };
    },
  };

  return { exec, accruals, updates };
}

const baseAccruals = (): MockAccrual[] => [
  {
    id: 1,
    installmentNumber: 1,
    dueDate: "2026-01-01",
    amount: "1000",
    paidAmount: "0",
    remainingAmount: "1000",
    paidAt: null,
  },
  {
    id: 2,
    installmentNumber: 2,
    dueDate: "2026-02-01",
    amount: "1000",
    paidAmount: "0",
    remainingAmount: "1000",
    paidAt: null,
  },
];

describe("allocatePaymentAcrossAccruals", () => {
  it("частично закрывает первое начисление", async () => {
    const { exec, updates } = makeAllocationMock(baseAccruals());
    const result = await allocatePaymentAcrossAccruals(
      {
        companyId: 1,
        contractId: 100,
        amount: 400,
        payDate: "2026-01-15",
      },
      exec,
    );

    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].applied, 400);
    assert.equal(result.allocations[0].status, "partial");
    assert.equal(result.unallocated, 0);
    assert.equal(updates.length, 1);
  });

  it("переливает остаток на следующие начисления", async () => {
    const { exec, updates } = makeAllocationMock(baseAccruals());
    const result = await allocatePaymentAcrossAccruals(
      {
        companyId: 1,
        contractId: 100,
        amount: 1500,
        payDate: "2026-01-20",
      },
      exec,
    );

    assert.equal(result.allocations.length, 2);
    assert.equal(result.allocations[0].applied, 1000);
    assert.equal(result.allocations[0].status, "paid");
    assert.equal(result.allocations[1].applied, 500);
    assert.equal(result.allocations[1].status, "partial");
    assert.equal(result.unallocated, 0);
    assert.equal(updates.length, 2);
  });

  it("startAccrualId — начинает с указанного начисления", async () => {
    const { exec } = makeAllocationMock(baseAccruals());
    const result = await allocatePaymentAcrossAccruals(
      {
        companyId: 1,
        contractId: 100,
        startAccrualId: 2,
        amount: 1000,
        payDate: "2026-02-01",
      },
      exec,
    );

    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].accrualId, 2);
    assert.equal(result.allocations[0].applied, 1000);
  });

  it("возвращает unallocated если сумма больше всех начислений", async () => {
    const { exec } = makeAllocationMock(baseAccruals());
    const result = await allocatePaymentAcrossAccruals(
      {
        companyId: 1,
        contractId: 100,
        amount: 2500,
        payDate: "2026-03-01",
      },
      exec,
    );

    assert.equal(result.allocations.length, 2);
    assert.equal(result.unallocated, 500);
  });

  it("баланс из amount−paid если remainingAmount нулевой", async () => {
    const { exec } = makeAllocationMock([
      {
        id: 1,
        installmentNumber: 1,
        dueDate: "2026-01-01",
        amount: "800",
        paidAmount: "300",
        remainingAmount: "0",
        paidAt: null,
      },
    ]);
    const result = await allocatePaymentAcrossAccruals(
      {
        companyId: 1,
        contractId: 100,
        amount: 200,
        payDate: "2026-01-10",
      },
      exec,
    );

    assert.equal(result.allocations[0].applied, 200);
    assert.equal(result.allocations[0].remainingAmount, 300);
  });
});
