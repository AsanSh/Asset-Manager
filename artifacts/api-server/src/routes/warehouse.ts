import { Router } from "express";
import { eq, and, SQL, sql, desc, like, or } from "drizzle-orm";
import {
  db,
  warehouseItemsTable,
  warehouseSuppliersTable,
  warehouseIncomingTable,
  warehouseOutgoingTable,
  warehouseInventoryTable,
  activityLogTable,
} from "../lib/db";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// Helper function for activity logging
async function logWarehouseActivity(
  companyId: number,
  userId: number | undefined,
  entityType: string,
  entityId: number | null,
  actionType: "create" | "update" | "delete",
  description: string,
  snapshot?: object,
) {
  await db.insert(activityLogTable).values({
    companyId,
    userId: userId ?? null,
    type: entityType,
    description,
    entityType,
    entityId,
    module: "warehouse",
    actionType,
    snapshot: snapshot ? JSON.stringify(snapshot) : null,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// ITEMS (Товары/Материалы)
// ──────────────────────────────────────────────────────────────────────────────

router.get("/warehouse/items", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { search, category, inStock } = req.query as Record<string, string | undefined>;

    const conditions: SQL[] = [eq(warehouseItemsTable.companyId, req.scopedCompanyId!)];

    if (category) {
      conditions.push(eq(warehouseItemsTable.category, category));
    }

    if (inStock === "true") {
      conditions.push(sql`${warehouseItemsTable.currentStock} > 0`);
    } else if (inStock === "false") {
      conditions.push(sql`${warehouseItemsTable.currentStock} <= 0`);
    }

    let items = await db.select().from(warehouseItemsTable)
      .where(and(...conditions))
      .orderBy(warehouseItemsTable.name);

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.sku?.toLowerCase().includes(searchLower) ||
        item.barcode?.toLowerCase().includes(searchLower)
      );
    }

    res.json(items);
  } catch (error) {
    console.error("Error fetching warehouse items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/warehouse/items", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const {
      name, category, unit, currentStock, minStock, maxStock,
      unitPrice, currency, supplier, sku, barcode, location, description
    } = req.body;

    if (!name || !unit) {
      res.status(400).json({ error: "name and unit are required" });
      return;
    }

    const [item] = await db.insert(warehouseItemsTable).values({
      companyId: req.scopedCompanyId!,
      name,
      category: category || "materials",
      unit: unit || "шт",
      currentStock: currentStock ? String(currentStock) : "0",
      minStock: minStock ? String(minStock) : "0",
      maxStock: maxStock ? String(maxStock) : null,
      unitPrice: unitPrice ? String(unitPrice) : "0",
      currency: currency || "KGS",
      supplier,
      sku,
      barcode,
      location,
      description,
      isActive: true,
    }).returning();

    await logWarehouseActivity(
      req.scopedCompanyId!,
      req.userId,
      "warehouse_item",
      item.id,
      "create",
      `Создан товар: ${item.name}`,
      item
    );

    res.status(201).json(item);
  } catch (error) {
    console.error("Error creating warehouse item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/warehouse/items/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updates = req.body;

    // Don't allow direct stock updates via PATCH
    delete updates.currentStock;

    const [item] = await db.update(warehouseItemsTable)
      .set({
        ...updates,
        unitPrice: updates.unitPrice ? String(updates.unitPrice) : undefined,
        minStock: updates.minStock ? String(updates.minStock) : undefined,
        maxStock: updates.maxStock ? String(updates.maxStock) : undefined,
      })
      .where(and(
        eq(warehouseItemsTable.id, id),
        eq(warehouseItemsTable.companyId, req.scopedCompanyId!)
      ))
      .returning();

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    await logWarehouseActivity(
      req.scopedCompanyId!,
      req.userId,
      "warehouse_item",
      item.id,
      "update",
      `Обновлён товар: ${item.name}`,
      item
    );

    res.json(item);
  } catch (error) {
    console.error("Error updating warehouse item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete(
  "/warehouse/items/:id",
  requireAuth,
  requireRole("admin", "company_admin"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string, 10);

      const [item] = await db.select().from(warehouseItemsTable)
        .where(and(
          eq(warehouseItemsTable.id, id),
          eq(warehouseItemsTable.companyId, req.scopedCompanyId!)
        ));

      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }

      await db.delete(warehouseItemsTable)
        .where(and(
          eq(warehouseItemsTable.id, id),
          eq(warehouseItemsTable.companyId, req.scopedCompanyId!)
        ));

      await logWarehouseActivity(
        req.scopedCompanyId!,
        req.userId,
        "warehouse_item",
        id,
        "delete",
        `Удалён товар: ${item.name}`,
        item
      );

      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting warehouse item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// INCOMING (Поступления)
// ──────────────────────────────────────────────────────────────────────────────

router.get("/warehouse/incoming", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { itemId, supplierId, startDate, endDate } = req.query as Record<string, string | undefined>;

    const conditions: SQL[] = [eq(warehouseIncomingTable.companyId, req.scopedCompanyId!)];

    if (itemId) {
      conditions.push(eq(warehouseIncomingTable.itemId, parseInt(itemId, 10)));
    }

    if (supplierId) {
      conditions.push(eq(warehouseIncomingTable.supplierId, parseInt(supplierId, 10)));
    }

    let operations = await db.select({
      id: warehouseIncomingTable.id,
      companyId: warehouseIncomingTable.companyId,
      itemId: warehouseIncomingTable.itemId,
      itemName: warehouseItemsTable.name,
      quantity: warehouseIncomingTable.quantity,
      unitPrice: warehouseIncomingTable.unitPrice,
      totalAmount: warehouseIncomingTable.totalAmount,
      currency: warehouseIncomingTable.currency,
      supplierId: warehouseIncomingTable.supplierId,
      supplierName: warehouseSuppliersTable.name,
      documentNumber: warehouseIncomingTable.documentNumber,
      documentDate: warehouseIncomingTable.documentDate,
      warehouseLocation: warehouseIncomingTable.warehouseLocation,
      notes: warehouseIncomingTable.notes,
      createdAt: warehouseIncomingTable.createdAt,
    })
      .from(warehouseIncomingTable)
      .leftJoin(warehouseItemsTable, eq(warehouseIncomingTable.itemId, warehouseItemsTable.id))
      .leftJoin(warehouseSuppliersTable, eq(warehouseIncomingTable.supplierId, warehouseSuppliersTable.id))
      .where(and(...conditions))
      .orderBy(desc(warehouseIncomingTable.createdAt));

    if (startDate) {
      operations = operations.filter(op => op.documentDate && op.documentDate >= startDate);
    }

    if (endDate) {
      operations = operations.filter(op => op.documentDate && op.documentDate <= endDate);
    }

    res.json(operations);
  } catch (error) {
    console.error("Error fetching incoming operations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/warehouse/incoming", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const {
      itemId,
      quantity,
      unitPrice,
      currency,
      supplierId,
      documentNumber,
      documentDate,
      warehouseLocation,
      notes,
    } = req.body;

    if (!itemId || !quantity || !unitPrice) {
      res.status(400).json({ error: "itemId, quantity, and unitPrice are required" });
      return;
    }

    const qty = parseFloat(String(quantity));
    const price = parseFloat(String(unitPrice));
    const total = qty * price;

    // Start transaction
    const [operation] = await db.insert(warehouseIncomingTable).values({
      companyId: req.scopedCompanyId!,
      itemId: parseInt(String(itemId), 10),
      quantity: String(qty),
      unitPrice: String(price),
      totalAmount: String(total),
      currency: currency || "KGS",
      supplierId: supplierId ? parseInt(String(supplierId), 10) : null,
      documentNumber,
      documentDate: documentDate || new Date().toISOString().split("T")[0],
      warehouseLocation,
      notes,
    }).returning();

    // Update item stock
    const [item] = await db.select().from(warehouseItemsTable)
      .where(eq(warehouseItemsTable.id, parseInt(String(itemId), 10)));

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const newStock = parseFloat(item.currentStock) + qty;

    await db.update(warehouseItemsTable)
      .set({ currentStock: String(newStock) })
      .where(eq(warehouseItemsTable.id, parseInt(String(itemId), 10)));

    await logWarehouseActivity(
      req.scopedCompanyId!,
      req.userId,
      "warehouse_incoming",
      operation.id,
      "create",
      `Поступление: ${item.name}, количество: ${qty} ${item.unit}`,
      operation
    );

    res.status(201).json(operation);
  } catch (error) {
    console.error("Error creating incoming operation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/warehouse/incoming/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [operation] = await db.select({
      id: warehouseIncomingTable.id,
      companyId: warehouseIncomingTable.companyId,
      itemId: warehouseIncomingTable.itemId,
      itemName: warehouseItemsTable.name,
      itemUnit: warehouseItemsTable.unit,
      quantity: warehouseIncomingTable.quantity,
      unitPrice: warehouseIncomingTable.unitPrice,
      totalAmount: warehouseIncomingTable.totalAmount,
      currency: warehouseIncomingTable.currency,
      supplierId: warehouseIncomingTable.supplierId,
      supplierName: warehouseSuppliersTable.name,
      documentNumber: warehouseIncomingTable.documentNumber,
      documentDate: warehouseIncomingTable.documentDate,
      warehouseLocation: warehouseIncomingTable.warehouseLocation,
      notes: warehouseIncomingTable.notes,
      createdAt: warehouseIncomingTable.createdAt,
      updatedAt: warehouseIncomingTable.updatedAt,
    })
      .from(warehouseIncomingTable)
      .leftJoin(warehouseItemsTable, eq(warehouseIncomingTable.itemId, warehouseItemsTable.id))
      .leftJoin(warehouseSuppliersTable, eq(warehouseIncomingTable.supplierId, warehouseSuppliersTable.id))
      .where(and(
        eq(warehouseIncomingTable.id, id),
        eq(warehouseIncomingTable.companyId, req.scopedCompanyId!)
      ));

    if (!operation) {
      res.status(404).json({ error: "Operation not found" });
      return;
    }

    res.json(operation);
  } catch (error) {
    console.error("Error fetching incoming operation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/warehouse/incoming/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { quantity, unitPrice, notes } = req.body;

    // Get current operation
    const [currentOp] = await db.select().from(warehouseIncomingTable)
      .where(and(
        eq(warehouseIncomingTable.id, id),
        eq(warehouseIncomingTable.companyId, req.scopedCompanyId!)
      ));

    if (!currentOp) {
      res.status(404).json({ error: "Operation not found" });
      return;
    }

    const oldQty = parseFloat(currentOp.quantity);
    const newQty = quantity ? parseFloat(String(quantity)) : oldQty;
    const newPrice = unitPrice ? parseFloat(String(unitPrice)) : parseFloat(currentOp.unitPrice);
    const newTotal = newQty * newPrice;

    // Update operation
    const [operation] = await db.update(warehouseIncomingTable)
      .set({
        quantity: String(newQty),
        unitPrice: String(newPrice),
        totalAmount: String(newTotal),
        notes: notes !== undefined ? notes : currentOp.notes,
      })
      .where(and(
        eq(warehouseIncomingTable.id, id),
        eq(warehouseIncomingTable.companyId, req.scopedCompanyId!)
      ))
      .returning();

    // Recalculate stock if quantity changed
    if (quantity && oldQty !== newQty) {
      const [item] = await db.select().from(warehouseItemsTable)
        .where(eq(warehouseItemsTable.id, currentOp.itemId));

      if (item) {
        const currentStock = parseFloat(item.currentStock);
        const adjustedStock = currentStock - oldQty + newQty;

        await db.update(warehouseItemsTable)
          .set({ currentStock: String(adjustedStock) })
          .where(eq(warehouseItemsTable.id, currentOp.itemId));
      }
    }

    await logWarehouseActivity(
      req.scopedCompanyId!,
      req.userId,
      "warehouse_incoming",
      operation.id,
      "update",
      `Обновлено поступление #${operation.id}`,
      operation
    );

    res.json(operation);
  } catch (error) {
    console.error("Error updating incoming operation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// OUTGOING (Списания/Выдача)
// ──────────────────────────────────────────────────────────────────────────────

router.get("/warehouse/outgoing", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { itemId, recipientType, recipientId, startDate, endDate } = req.query as Record<string, string | undefined>;

    const conditions: SQL[] = [eq(warehouseOutgoingTable.companyId, req.scopedCompanyId!)];

    if (itemId) {
      conditions.push(eq(warehouseOutgoingTable.itemId, parseInt(itemId, 10)));
    }

    if (recipientType) {
      conditions.push(eq(warehouseOutgoingTable.recipientType, recipientType));
    }

    if (recipientId) {
      conditions.push(eq(warehouseOutgoingTable.recipientId, parseInt(recipientId, 10)));
    }

    let operations = await db.select({
      id: warehouseOutgoingTable.id,
      companyId: warehouseOutgoingTable.companyId,
      itemId: warehouseOutgoingTable.itemId,
      itemName: warehouseItemsTable.name,
      quantity: warehouseOutgoingTable.quantity,
      recipientType: warehouseOutgoingTable.recipientType,
      recipientId: warehouseOutgoingTable.recipientId,
      purpose: warehouseOutgoingTable.purpose,
      documentNumber: warehouseOutgoingTable.documentNumber,
      issuedBy: warehouseOutgoingTable.issuedBy,
      issuedDate: warehouseOutgoingTable.issuedDate,
      notes: warehouseOutgoingTable.notes,
      createdAt: warehouseOutgoingTable.createdAt,
    })
      .from(warehouseOutgoingTable)
      .leftJoin(warehouseItemsTable, eq(warehouseOutgoingTable.itemId, warehouseItemsTable.id))
      .where(and(...conditions))
      .orderBy(desc(warehouseOutgoingTable.createdAt));

    if (startDate) {
      operations = operations.filter(op => op.issuedDate && op.issuedDate >= startDate);
    }

    if (endDate) {
      operations = operations.filter(op => op.issuedDate && op.issuedDate <= endDate);
    }

    res.json(operations);
  } catch (error) {
    console.error("Error fetching outgoing operations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/warehouse/outgoing", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const {
      itemId,
      quantity,
      recipientType,
      recipientId,
      purpose,
      documentNumber,
      issuedBy,
      issuedDate,
      notes,
    } = req.body;

    if (!itemId || !quantity) {
      res.status(400).json({ error: "itemId and quantity are required" });
      return;
    }

    const qty = parseFloat(String(quantity));

    // Check stock availability
    const [item] = await db.select().from(warehouseItemsTable)
      .where(and(
        eq(warehouseItemsTable.id, parseInt(String(itemId), 10)),
        eq(warehouseItemsTable.companyId, req.scopedCompanyId!)
      ));

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const currentStock = parseFloat(item.currentStock);

    if (currentStock < qty) {
      res.status(400).json({
        error: "Insufficient stock",
        available: currentStock,
        requested: qty
      });
      return;
    }

    // Create outgoing operation
    const [operation] = await db.insert(warehouseOutgoingTable).values({
      companyId: req.scopedCompanyId!,
      itemId: parseInt(String(itemId), 10),
      quantity: String(qty),
      recipientType: recipientType || "construction_project",
      recipientId: recipientId ? parseInt(String(recipientId), 10) : null,
      purpose,
      documentNumber,
      issuedBy,
      issuedDate: issuedDate || new Date().toISOString().split("T")[0],
      notes,
    }).returning();

    // Update item stock
    const newStock = currentStock - qty;

    await db.update(warehouseItemsTable)
      .set({ currentStock: String(newStock) })
      .where(eq(warehouseItemsTable.id, parseInt(String(itemId), 10)));

    await logWarehouseActivity(
      req.scopedCompanyId!,
      req.userId,
      "warehouse_outgoing",
      operation.id,
      "create",
      `Списание: ${item.name}, количество: ${qty} ${item.unit}`,
      operation
    );

    res.status(201).json(operation);
  } catch (error) {
    console.error("Error creating outgoing operation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/warehouse/outgoing/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [operation] = await db.select({
      id: warehouseOutgoingTable.id,
      companyId: warehouseOutgoingTable.companyId,
      itemId: warehouseOutgoingTable.itemId,
      itemName: warehouseItemsTable.name,
      itemUnit: warehouseItemsTable.unit,
      quantity: warehouseOutgoingTable.quantity,
      recipientType: warehouseOutgoingTable.recipientType,
      recipientId: warehouseOutgoingTable.recipientId,
      purpose: warehouseOutgoingTable.purpose,
      documentNumber: warehouseOutgoingTable.documentNumber,
      issuedBy: warehouseOutgoingTable.issuedBy,
      issuedDate: warehouseOutgoingTable.issuedDate,
      notes: warehouseOutgoingTable.notes,
      createdAt: warehouseOutgoingTable.createdAt,
      updatedAt: warehouseOutgoingTable.updatedAt,
    })
      .from(warehouseOutgoingTable)
      .leftJoin(warehouseItemsTable, eq(warehouseOutgoingTable.itemId, warehouseItemsTable.id))
      .where(and(
        eq(warehouseOutgoingTable.id, id),
        eq(warehouseOutgoingTable.companyId, req.scopedCompanyId!)
      ));

    if (!operation) {
      res.status(404).json({ error: "Operation not found" });
      return;
    }

    res.json(operation);
  } catch (error) {
    console.error("Error fetching outgoing operation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// INVENTORY (Инвентаризация)
// ──────────────────────────────────────────────────────────────────────────────

router.get("/warehouse/inventory", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { status } = req.query as Record<string, string | undefined>;

    const conditions: SQL[] = [eq(warehouseInventoryTable.companyId, req.scopedCompanyId!)];

    if (status) {
      conditions.push(eq(warehouseInventoryTable.status, status));
    }

    const inventories = await db.select().from(warehouseInventoryTable)
      .where(and(...conditions))
      .orderBy(desc(warehouseInventoryTable.createdAt));

    res.json(inventories);
  } catch (error) {
    console.error("Error fetching inventories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/warehouse/inventory", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { inventoryDate, items, conductedBy, notes } = req.body;

    if (!inventoryDate || !items || !Array.isArray(items)) {
      res.status(400).json({ error: "inventoryDate and items array are required" });
      return;
    }

    const [inventory] = await db.insert(warehouseInventoryTable).values({
      companyId: req.scopedCompanyId!,
      inventoryDate,
      status: "in_progress",
      items: items as any,
      conductedBy,
      notes,
    }).returning();

    await logWarehouseActivity(
      req.scopedCompanyId!,
      req.userId,
      "warehouse_inventory",
      inventory.id,
      "create",
      `Создана инвентаризация от ${inventoryDate}`,
      inventory
    );

    res.status(201).json(inventory);
  } catch (error) {
    console.error("Error creating inventory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/warehouse/inventory/:id/complete", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [inventory] = await db.select().from(warehouseInventoryTable)
      .where(and(
        eq(warehouseInventoryTable.id, id),
        eq(warehouseInventoryTable.companyId, req.scopedCompanyId!)
      ));

    if (!inventory) {
      res.status(404).json({ error: "Inventory not found" });
      return;
    }

    if (inventory.status === "completed") {
      res.status(400).json({ error: "Inventory already completed" });
      return;
    }

    // Process inventory items and adjust stock
    const items = inventory.items as any[];
    const adjustments: any[] = [];

    for (const item of items) {
      const { itemId, expectedQty, actualQty } = item;
      const difference = parseFloat(String(actualQty)) - parseFloat(String(expectedQty));

      if (difference !== 0) {
        const [warehouseItem] = await db.select().from(warehouseItemsTable)
          .where(eq(warehouseItemsTable.id, itemId));

        if (warehouseItem) {
          const newStock = parseFloat(String(actualQty));

          await db.update(warehouseItemsTable)
            .set({ currentStock: String(newStock) })
            .where(eq(warehouseItemsTable.id, itemId));

          adjustments.push({
            itemId,
            itemName: warehouseItem.name,
            difference,
            newStock,
          });
        }
      }
    }

    // Mark inventory as completed
    const [updatedInventory] = await db.update(warehouseInventoryTable)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(and(
        eq(warehouseInventoryTable.id, id),
        eq(warehouseInventoryTable.companyId, req.scopedCompanyId!)
      ))
      .returning();

    await logWarehouseActivity(
      req.scopedCompanyId!,
      req.userId,
      "warehouse_inventory",
      updatedInventory.id,
      "update",
      `Инвентаризация завершена, корректировок: ${adjustments.length}`,
      { inventory: updatedInventory, adjustments }
    );

    res.json({ inventory: updatedInventory, adjustments });
  } catch (error) {
    console.error("Error completing inventory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// SUPPLIERS (Поставщики)
// ──────────────────────────────────────────────────────────────────────────────

router.get("/warehouse/suppliers", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { isActive } = req.query as Record<string, string | undefined>;

    const conditions: SQL[] = [eq(warehouseSuppliersTable.companyId, req.scopedCompanyId!)];

    if (isActive === "true") {
      conditions.push(eq(warehouseSuppliersTable.isActive, true));
    } else if (isActive === "false") {
      conditions.push(eq(warehouseSuppliersTable.isActive, false));
    }

    const suppliers = await db.select().from(warehouseSuppliersTable)
      .where(and(...conditions))
      .orderBy(warehouseSuppliersTable.name);

    res.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/warehouse/suppliers", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      inn,
      paymentTerms,
      rating,
      notes,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const [supplier] = await db.insert(warehouseSuppliersTable).values({
      companyId: req.scopedCompanyId!,
      name,
      contactPerson,
      phone,
      email,
      address,
      inn,
      paymentTerms,
      rating: rating ? parseInt(String(rating), 10) : null,
      isActive: true,
      notes,
    }).returning();

    await logWarehouseActivity(
      req.scopedCompanyId!,
      req.userId,
      "warehouse_supplier",
      supplier.id,
      "create",
      `Создан поставщик: ${supplier.name}`,
      supplier
    );

    res.status(201).json(supplier);
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/warehouse/suppliers/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updates = req.body;

    if (updates.rating) {
      updates.rating = parseInt(String(updates.rating), 10);
    }

    const [supplier] = await db.update(warehouseSuppliersTable)
      .set(updates)
      .where(and(
        eq(warehouseSuppliersTable.id, id),
        eq(warehouseSuppliersTable.companyId, req.scopedCompanyId!)
      ))
      .returning();

    if (!supplier) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    await logWarehouseActivity(
      req.scopedCompanyId!,
      req.userId,
      "warehouse_supplier",
      supplier.id,
      "update",
      `Обновлён поставщик: ${supplier.name}`,
      supplier
    );

    res.json(supplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete(
  "/warehouse/suppliers/:id",
  requireAuth,
  requireRole("admin", "company_admin"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string, 10);

      const [supplier] = await db.select().from(warehouseSuppliersTable)
        .where(and(
          eq(warehouseSuppliersTable.id, id),
          eq(warehouseSuppliersTable.companyId, req.scopedCompanyId!)
        ));

      if (!supplier) {
        res.status(404).json({ error: "Supplier not found" });
        return;
      }

      await db.delete(warehouseSuppliersTable)
        .where(and(
          eq(warehouseSuppliersTable.id, id),
          eq(warehouseSuppliersTable.companyId, req.scopedCompanyId!)
        ));

      await logWarehouseActivity(
        req.scopedCompanyId!,
        req.userId,
        "warehouse_supplier",
        id,
        "delete",
        `Удалён поставщик: ${supplier.name}`,
        supplier
      );

      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// DASHBOARD/STATS
// ──────────────────────────────────────────────────────────────────────────────

router.get("/warehouse/dashboard", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const [items, incomingOps, outgoingOps] = await Promise.all([
      db.select().from(warehouseItemsTable)
        .where(eq(warehouseItemsTable.companyId, req.scopedCompanyId!)),
      db.select().from(warehouseIncomingTable)
        .where(eq(warehouseIncomingTable.companyId, req.scopedCompanyId!))
        .orderBy(desc(warehouseIncomingTable.createdAt))
        .limit(10),
      db.select().from(warehouseOutgoingTable)
        .where(eq(warehouseOutgoingTable.companyId, req.scopedCompanyId!))
        .orderBy(desc(warehouseOutgoingTable.createdAt))
        .limit(10),
    ]);

    // Calculate low stock alerts
    const lowStockItems = items.filter(item => {
      const currentStock = parseFloat(item.currentStock);
      const minStock = parseFloat(item.minStock || "0");
      return currentStock <= minStock && minStock > 0;
    });

    // Calculate total value
    const totalValue = items.reduce((sum, item) => {
      const stock = parseFloat(item.currentStock);
      const price = parseFloat(item.unitPrice || "0");
      return sum + (stock * price);
    }, 0);

    // Top items by stock value
    const topItems = items
      .map(item => ({
        id: item.id,
        name: item.name,
        currentStock: item.currentStock,
        unit: item.unit,
        unitPrice: item.unitPrice,
        value: parseFloat(item.currentStock) * parseFloat(item.unitPrice || "0"),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Enrich recent operations with item names
    const enrichedIncoming = await Promise.all(
      incomingOps.map(async op => {
        const [item] = await db.select().from(warehouseItemsTable)
          .where(eq(warehouseItemsTable.id, op.itemId));
        return { ...op, itemName: item?.name || "Unknown" };
      })
    );

    const enrichedOutgoing = await Promise.all(
      outgoingOps.map(async op => {
        const [item] = await db.select().from(warehouseItemsTable)
          .where(eq(warehouseItemsTable.id, op.itemId));
        return { ...op, itemName: item?.name || "Unknown" };
      })
    );

    res.json({
      totalItems: items.length,
      activeItems: items.filter(i => i.isActive).length,
      lowStockAlerts: lowStockItems.length,
      lowStockItems: lowStockItems.slice(0, 10),
      totalValue: totalValue.toFixed(2),
      topItems,
      recentIncoming: enrichedIncoming,
      recentOutgoing: enrichedOutgoing,
    });
  } catch (error) {
    console.error("Error fetching warehouse dashboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
