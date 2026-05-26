import { Response, NextFunction } from "express";
import { AuthenticatedRequest, isSuperAdmin } from "./auth";

/** Resolve tenant company id (super_admin may pass ?companyId= or X-Company-Id). */
export function getScopedCompanyId(req: AuthenticatedRequest): number | undefined {
  if (isSuperAdmin(req.userRole)) {
    const raw = req.query?.companyId ?? req.headers?.["x-company-id"];
    if (raw != null && raw !== "") {
      const n = parseInt(String(raw), 10);
      if (Number.isFinite(n)) return n;
    }
    return req.companyId ?? undefined;
  }
  return req.companyId ?? undefined;
}

/** Middleware: reject requests without a resolved tenant company id. */
export function requireTenantCompany(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const cid = getScopedCompanyId(req);
  if (cid == null) {
    res.status(isSuperAdmin(req.userRole) ? 400 : 403).json({
      error: isSuperAdmin(req.userRole)
        ? "Укажите companyId (query или заголовок X-Company-Id)"
        : "Компания не привязана к аккаунту",
    });
    return;
  }
  req.scopedCompanyId = cid;
  next();
}

/** Inline helper when middleware is not on the router stack. */
export function requireScopedCompany(
  req: AuthenticatedRequest,
  res: Response,
): number | null {
  if (req.scopedCompanyId != null) return req.scopedCompanyId;
  const cid = getScopedCompanyId(req);
  if (cid == null) {
    res.status(isSuperAdmin(req.userRole) ? 400 : 403).json({
      error: isSuperAdmin(req.userRole)
        ? "Укажите companyId (query или заголовок X-Company-Id)"
        : "Компания не привязана к аккаунту",
    });
    return null;
  }
  req.scopedCompanyId = cid;
  return cid;
}
