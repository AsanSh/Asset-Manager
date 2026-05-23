/**
 * Vercel entry for Express: all paths are rewritten here (see vercel.json).
 * Do not use api/[...slug].ts for Express — it does not act as a catch-all on Vercel for non-Next apps.
 */
export default async function handler(req: any, res: any) {
  // @ts-ignore — dist/index.mjs has no declaration file
  const { default: app } = await import("../dist/index.mjs");
  return app(req, res);
}
