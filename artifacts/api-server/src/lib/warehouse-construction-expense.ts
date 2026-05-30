import { constructionExpensesTable } from "./db/schema";

export type WarehouseExpenseInput = {
  companyId: number;
  projectId: number;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency: string;
  issuedDate: string;
  outgoingId: number;
  purpose?: string | null;
};

/** Создаёт расход стройки при списании материала со склада на объект. */
export async function createConstructionExpenseFromOutgoing(
  txOrDb: any,
  input: WarehouseExpenseInput,
): Promise<number> {
  const amount = Math.round(input.quantity * input.unitPrice * 100) / 100;
  const [expense] = await txOrDb
    .insert(constructionExpensesTable)
    .values({
      companyId: input.companyId,
      projectId: input.projectId,
      category: "Материалы",
      description: `${input.itemName} — ${input.quantity} ${input.unit} (склад #${input.outgoingId})`,
      amount: String(amount),
      currency: input.currency || "KGS",
      exchangeRateSource: "nbkr",
      exchangeRate: "1",
      amountKgs: String(amount),
      date: input.issuedDate,
      paymentMethod: "transfer",
      status: "approved",
      notes: input.purpose
        ? `Авто: списание со склада · ${input.purpose}`
        : "Авто: списание со склада",
    })
    .returning({ id: constructionExpensesTable.id });

  if (!expense?.id) {
    throw new Error("Не удалось создать расход стройки");
  }
  return expense.id;
}
