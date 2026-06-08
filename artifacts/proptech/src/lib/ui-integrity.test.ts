import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "..");
const appSource = readFileSync(join(srcRoot, "App.tsx"), "utf8");
const layoutSource = readFileSync(join(srcRoot, "components/layout.tsx"), "utf8");

function walk(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) {
			if (["node_modules", "dist"].includes(entry)) continue;
			out.push(...walk(full));
		} else if ([".ts", ".tsx"].includes(extname(entry))) {
			out.push(full);
		}
	}
	return out;
}

function routePathToRegex(path: string) {
	const escaped = path
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		.replace(/\\:([^/]+)/g, "[^/]+")
		.replace(/\\\*|\\:rest\\\*/g, ".*");
	return new RegExp(`^${escaped}$`);
}

function getDeclaredRoutes() {
	const routes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
	return routes.map(routePathToRegex);
}

function getLayoutHrefs() {
	return [...layoutSource.matchAll(/href:\s*"([^"]+)"/g)]
		.map((m) => m[1].split("?")[0])
		.filter((href) => href.startsWith("/"))
		.filter((href) => !href.includes(":"))
		.filter((href, idx, arr) => arr.indexOf(href) === idx);
}

describe("UI integrity", () => {
	it("all sidebar/header module hrefs are backed by App routes", () => {
		const routeRegexes = getDeclaredRoutes();
		const missing = getLayoutHrefs().filter(
			(href) => !routeRegexes.some((route) => route.test(href)),
		);
		assert.deepEqual(missing, []);
	});

	it("source pages do not ship visible under-construction placeholders", () => {
		const forbidden = ["в", "разработке"].join(" ");
		const offenders = walk(srcRoot)
			.filter((file) => !file.endsWith(".test.ts"))
			.filter((file) => readFileSync(file, "utf8").toLowerCase().includes(forbidden))
			.map((file) => relative(srcRoot, file));
		assert.deepEqual(offenders, []);
	});

	it("product source does not ship mock/demo branches or alert-only actions", () => {
		const scannedRoots = ["pages", "components", "features"].map((dir) => join(srcRoot, dir));
		const forbidden = /\bmock\b|\bdemo\b|alert\s*\(|coming soon|not implemented|не реализ|заглуш/i;
		const offenders = scannedRoots
			.flatMap(walk)
			.filter((file) => !file.endsWith(".test.ts"))
			.filter((file) => forbidden.test(readFileSync(file, "utf8")))
			.map((file) => relative(srcRoot, file));
		assert.deepEqual(offenders, []);
	});

	it("notification and chat entry points are available in the shared layout", () => {
		assert.match(layoutSource, /<NotificationBell\s*\/>/);
		assert.match(layoutSource, /<ChatPanel\s*\/>/);
	});
});
