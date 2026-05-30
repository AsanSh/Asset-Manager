import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROUTES_DIR = join(__dirname, "..", "routes");

/**
 * Сканер роутов: ищет файлы где используется companyId / scopedCompanyId,
 * проверяет что все они проходят через requireTenantCompany middleware
 * или подключены через router.use(requireAuth, requireTenantCompany).
 *
 * Это не идеальная защита, но ловит грубые ошибки (новый файл без middleware).
 */

// Файлы которые легитимно НЕ используют requireTenantCompany:
// - auth — до логина (нет companyId ещё)
// - admin / platform-admin — для super_admin, работают через явный companyId в URL
// - companies — создание новой компании
// - notifications — может использоваться портальными пользователями (TODO: проверить)
// - categories — справочник может быть глобальным
//
// Если в этот список попадает новый файл — проверь что в нём действительно
// нет cross-tenant leak (или используется requireRole("super_admin")).
const SYSTEM_ROUTES_ALLOWLIST = new Set([
  "auth.ts",
  "admin.ts",
  "platform-admin.ts",
  "companies.ts",
  "notifications.ts",
  "categories.ts",
]);

function listRouteFiles(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .filter((f) => !SYSTEM_ROUTES_ALLOWLIST.has(f))
    .map((f) => join(ROUTES_DIR, f));
}

describe("Tenant isolation: все route-файлы используют requireTenantCompany", () => {
  const files = listRouteFiles();

  for (const file of files) {
    it(`${file.split("/").pop()} имеет requireTenantCompany`, () => {
      const content = readFileSync(file, "utf-8");

      // Файлы без companyId / scopedCompanyId — пропускаем (например, health, public).
      const hasCompanyAccess =
        /scopedCompanyId|companyId/.test(content) ||
        /\.companyId\b/.test(content);
      if (!hasCompanyAccess) {
        return; // route без tenant-scoped данных
      }

      // Должен быть импорт и использование requireTenantCompany ИЛИ router.use с ним.
      const hasMiddleware = /requireTenantCompany/.test(content);
      assert.ok(
        hasMiddleware,
        `Файл ${file.split("/").pop()} обращается к companyId, но не подключает requireTenantCompany middleware. Это потенциальный cross-tenant leak.`,
      );
    });
  }
});

describe("Tenant isolation: scope-helper экспортируется", () => {
  it("scoped() и scopedCompanyId() доступны для импорта", async () => {
    const mod = await import("./scope");
    assert.equal(typeof mod.scoped, "function");
    assert.equal(typeof mod.scopedCompanyId, "function");
  });
});
