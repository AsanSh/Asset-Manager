import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, userTableViewsTable } from "../lib/db";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth);

type TableLayout = {
	visibility?: Record<string, boolean>;
	order?: string[];
	sizing?: Record<string, number>;
	density?: string;
	sorting?: { id: string; desc: boolean }[];
};

function sanitizeLayout(raw: unknown): TableLayout {
	if (!raw || typeof raw !== "object") return {};
	const o = raw as Record<string, unknown>;
	const layout: TableLayout = {};
	if (o.visibility && typeof o.visibility === "object") {
		layout.visibility = o.visibility as Record<string, boolean>;
	}
	if (Array.isArray(o.order)) {
		layout.order = o.order.filter((x) => typeof x === "string") as string[];
	}
	if (o.sizing && typeof o.sizing === "object") {
		layout.sizing = o.sizing as Record<string, number>;
	}
	if (o.density === "compact" || o.density === "normal" || o.density === "comfortable") {
		layout.density = o.density;
	}
	if (Array.isArray(o.sorting)) {
		layout.sorting = o.sorting
			.filter(
				(s) =>
					s &&
					typeof s === "object" &&
					typeof (s as { id?: unknown }).id === "string" &&
					typeof (s as { desc?: unknown }).desc === "boolean",
			)
			.map((s) => ({
				id: String((s as { id: string }).id),
				desc: Boolean((s as { desc: boolean }).desc),
			}));
	}
	return layout;
}

router.get("/table-views/:tableId", async (req: AuthenticatedRequest, res): Promise<void> => {
	try {
		const userId = req.user!.id;
		const tableId = String(
			Array.isArray(req.params.tableId) ? req.params.tableId[0] : req.params.tableId,
		);
		if (!tableId || tableId.length > 128) {
			res.status(400).json({ error: "Invalid tableId" });
			return;
		}

		const [row] = await db
			.select()
			.from(userTableViewsTable)
			.where(
				and(
					eq(userTableViewsTable.userId, userId),
					eq(userTableViewsTable.tableId, tableId),
				),
			)
			.limit(1);

		res.json({ layout: (row?.layout as TableLayout) ?? {} });
	} catch (error) {
		console.error("Get table view error:", error);
		res.status(500).json({ error: "Failed to fetch table view" });
	}
});

router.put("/table-views/:tableId", async (req: AuthenticatedRequest, res): Promise<void> => {
	try {
		const userId = req.user!.id;
		const tableId = String(
			Array.isArray(req.params.tableId) ? req.params.tableId[0] : req.params.tableId,
		);
		if (!tableId || tableId.length > 128) {
			res.status(400).json({ error: "Invalid tableId" });
			return;
		}

		const layout = sanitizeLayout(req.body?.layout ?? req.body);

		const [existing] = await db
			.select({ id: userTableViewsTable.id })
			.from(userTableViewsTable)
			.where(
				and(
					eq(userTableViewsTable.userId, userId),
					eq(userTableViewsTable.tableId, tableId),
				),
			)
			.limit(1);

		if (existing) {
			await db
				.update(userTableViewsTable)
				.set({ layout, updatedAt: new Date() })
				.where(eq(userTableViewsTable.id, existing.id));
		} else {
			await db.insert(userTableViewsTable).values({
				userId,
				tableId,
				layout,
			});
		}

		res.json({ ok: true, layout });
	} catch (error) {
		console.error("Save table view error:", error);
		res.status(500).json({ error: "Failed to save table view" });
	}
});

export default router;
