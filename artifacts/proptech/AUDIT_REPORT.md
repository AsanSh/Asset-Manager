# PropTech Asset Manager - Comprehensive Audit Report
**Date:** May 5, 2026  
**Status:** Critical Issues Found

---

## Executive Summary

The PropTech Asset Manager application has **significant API endpoint gaps** between frontend expectations and backend implementations. The main issue is that **many pages use the `@workspace/api-client-react` hooks** (e.g., `useListAccruals`, `useListExpenses`, `useListDeposits`) but **these hooks don't exist** in the generated API client.

**Root Cause:** The API client generation is incomplete or missing for many rental module endpoints.

**Impact:** All pages except dashboard show errors because they're trying to import non-existent hooks.

---

## Critical Findings

### 1. Missing API Client Hooks (HIGH PRIORITY)

Frontend pages are importing hooks that **DO NOT EXIST** in `/lib/api-client-react/src/generated/api.ts`:

#### Rental Module - Missing Hooks:
- ❌ `useListAccruals` - Used by: `/rental/accruals.tsx`, `/rental/rental-dashboard.tsx`
- ❌ `useListPayments` - Used by: `/rental/payments.tsx`, `/rental/rental-dashboard.tsx`
- ❌ `useListDeposits` - Used by: `/rental/deposits.tsx`
- ❌ `useListExpenses` - Used by: `/rental/expenses.tsx`
- ❌ `useListRentalProperties` - Used by: `/rental/rental-properties.tsx`
- ❌ `getListAccrualsQueryKey` - Used by: `/rental/accruals.tsx`
- ❌ `getListDepositsQueryKey` - Used by: `/rental/deposits.tsx`
- ❌ `getListExpensesQueryKey` - Used by: `/rental/expenses.tsx`

#### What Actually Exists (CONFIRMED):
- ✅ `useListCompanies`
- ✅ `useListUsers`
- ✅ `useListProperties`
- ✅ `useCreateCompany`, `useUpdateCompany`
- ✅ `useCreateUser`, `useUpdateUser`
- ✅ `useCreateProperty`, `useUpdateProperty`
- ✅ `useLogin`, `useLogout`

### 2. Backend Endpoints That Exist But No Frontend Hooks

Backend file `/api-server/src/routes/rental.ts` has **31 endpoints** including:

**Accruals:**
- GET `/api/rental/accruals` ✅ (implemented)
- PATCH `/api/rental/accruals/:id` ✅
- POST `/api/rental/accruals/recalculate` ✅
- POST `/api/rental/accruals/:id/discount` ✅

**Payments:**
- GET `/api/rental/payments` ✅
- POST `/api/rental/payments` ✅
- DELETE `/api/rental/payments/:id` ✅

**Deposits:**
- GET `/api/rental/deposits` ✅
- POST `/api/rental/deposits` ✅
- PATCH `/api/rental/deposits/:id` ✅

**Expenses:**
- GET `/api/rental/expenses` ✅
- POST `/api/rental/expenses` ✅

**Tenants:** (has hooks ✅)
- GET `/api/rental/tenants` ✅
- POST `/api/rental/tenants` ✅
- PATCH `/api/rental/tenants/:id` ✅
- DELETE `/api/rental/tenants/:id` ✅

**Lease Contracts:** (has hooks ✅)
- GET `/api/rental/contracts` ✅
- POST `/api/rental/contracts` ✅
- PATCH `/api/rental/contracts/:id` ✅

**Bank Accounts:**
- GET `/api/rental/accounts` ✅
- POST `/api/rental/accounts` ✅
- PATCH `/api/rental/accounts/:id` ✅
- DELETE `/api/rental/accounts/:id` ✅
- POST `/api/rental/accounts/transfer` ✅

**Rental Properties:**
- GET `/api/rental/properties` ✅
- POST `/api/rental/properties/:id/activate` ✅
- GET `/api/rental/properties/:id/performance` ✅

**Owner Statements:**
- GET `/api/rental/statements` ✅
- POST `/api/rental/statements/generate` ✅

### 3. Construction Module Issues

Backend file `/api-server/src/routes/construction.ts` has comprehensive endpoints but frontend pages use **direct API calls** (`api.get`, `api.post`) instead of hooks:

**Construction Endpoints (Backend exists, no hooks):**
- GET `/api/construction/projects` ✅
- POST `/api/construction/projects` ✅
- PATCH `/api/construction/projects/:id` ✅
- DELETE `/api/construction/projects/:id` ✅
- GET `/api/construction/stages` ✅
- POST `/api/construction/stages` ✅
- GET `/api/construction/tasks` ✅
- POST `/api/construction/tasks` ✅
- GET `/api/construction/workers` ✅
- POST `/api/construction/workers` ✅
- GET `/api/construction/contractors` ✅
- POST `/api/construction/contractors` ✅
- GET `/api/construction/materials` ✅
- POST `/api/construction/materials` ✅
- GET `/api/construction/budget` ✅
- POST `/api/construction/budget` ✅
- GET `/api/construction/expenses` ✅
- POST `/api/construction/expenses` ✅
- GET `/api/construction/units` ✅
- POST `/api/construction/units` ✅
- POST `/api/construction/units/bulk` ✅
- GET `/api/construction/dashboard` ✅

### 4. Investors Module Issues

Backend `/api-server/src/routes/investors.ts` exists with:
- GET `/api/rental/investors` ✅
- POST `/api/rental/investors` ✅
- PATCH `/api/rental/investors/:id` ✅
- DELETE `/api/rental/investors/:id` ✅
- GET `/api/rental/investments` ✅
- POST `/api/rental/investments` ✅
- DELETE `/api/rental/investments/:id` ✅
- GET `/api/rental/distributions` ✅
- POST `/api/rental/distributions` ✅
- PATCH `/api/rental/distributions/:id/status` ✅
- DELETE `/api/rental/distributions/:id` ✅
- GET `/api/rental/portfolio-overview` ✅

Frontend `/pages/rental/investors.tsx` uses **direct API calls** instead of hooks.

---

## Pages Analysis

### Working Pages (use existing hooks or direct API):
1. ✅ `/pages/dashboard.tsx` - No API dependencies
2. ✅ `/pages/login.tsx` - Uses `useLogin` (exists)
3. ✅ `/pages/companies.tsx` - Uses `useListCompanies` (exists)
4. ✅ `/pages/users.tsx` - Uses `useListUsers` (exists)
5. ✅ `/pages/properties.tsx` - Uses `useListProperties` (exists)
6. ✅ `/pages/rental/tenants.tsx` - Uses `useListTenants` (exists)
7. ✅ `/pages/rental/leases.tsx` - Uses `useListLeaseContracts` (exists)

### Broken Pages (missing hooks):
1. ❌ `/pages/rental/accruals.tsx` - Imports `useListAccruals` (MISSING)
2. ❌ `/pages/rental/payments.tsx` - Imports `useListPayments` (MISSING)
3. ❌ `/pages/rental/deposits.tsx` - Imports `useListDeposits` (MISSING)
4. ❌ `/pages/rental/expenses.tsx` - Imports `useListExpenses` (MISSING)
5. ❌ `/pages/rental/rental-properties.tsx` - Imports `useListRentalProperties` (MISSING)
6. ❌ `/pages/rental/rental-dashboard.tsx` - Imports multiple missing hooks

### Workaround Pages (use direct API, inconsistent pattern):
1. ⚠️ `/pages/rental/investors.tsx` - Uses `api.get/post/delete` directly
2. ⚠️ `/pages/rental/investments.tsx` - Uses direct API
3. ⚠️ `/pages/rental/distributions.tsx` - Uses direct API
4. ⚠️ `/pages/construction/projects.tsx` - Uses direct API
5. ⚠️ All construction module pages (58 pages) - Use direct API calls

---

## Missing CRUD Operations

### Accruals:
- ✅ Backend GET (list)
- ✅ Backend PATCH (update)
- ❌ Frontend hooks (missing entirely)
- Missing: DELETE operation (both backend & frontend)

### Payments:
- ✅ Backend GET, POST, DELETE
- ❌ Frontend hooks (missing)
- Missing: PATCH/UPDATE operation

### Deposits:
- ✅ Backend GET, POST, PATCH
- ❌ Frontend hooks (missing)
- Missing: DELETE operation (backend has it, no hook)

### Expenses:
- ✅ Backend GET, POST
- ❌ Frontend hooks (missing)
- Missing: PATCH, DELETE operations

### Bank Accounts:
- ✅ Backend GET, POST, PATCH, DELETE
- ❌ Frontend hooks (missing entirely)

### Construction Module:
- ✅ Backend fully implemented (all CRUD)
- ❌ No hooks generated
- ⚠️ Frontend uses inconsistent direct API calls

### Investors & Investments:
- ✅ Backend fully implemented
- ❌ No hooks generated
- ⚠️ Frontend uses direct API calls

---

## Root Cause Analysis

### OpenAPI Schema Issue
The API client is generated from an OpenAPI schema, but the schema is **incomplete or not regenerated** after backend changes.

**Evidence:**
1. `/lib/api-client-react/src/generated/api.ts` has only **basic endpoints**
2. Rental module endpoints (accruals, payments, deposits, expenses) are **NOT in the generated client**
3. Construction module endpoints are **NOT in the generated client**
4. Investors module endpoints are **NOT in the generated client**

**Likely causes:**
- OpenAPI schema file is outdated
- Schema generation script not run after backend updates
- Backend routes not properly annotated with OpenAPI decorators
- API client generation command not executed

---

## Priority Order for Fixes

### CRITICAL (Fix Immediately - User-Facing Errors)

**Priority 1:** Regenerate API Client for Rental Module
- Add hooks: `useListAccruals`, `useListPayments`, `useListDeposits`, `useListExpenses`
- Add hooks: `useListRentalProperties`, `useCreatePayment`, `useDeletePayment`
- Files affected: 6 broken pages

**Priority 2:** Add Missing Backend DELETE Operations
- Add DELETE `/api/rental/accruals/:id`
- Add DELETE `/api/rental/expenses/:id`
- Add PATCH `/api/rental/payments/:id`
- Add DELETE `/api/rental/deposits/:id`

### HIGH (Inconsistency & Technical Debt)

**Priority 3:** Standardize Construction Module
- Generate hooks for all construction endpoints
- Replace direct API calls with hooks in 27+ pages
- Files: `/pages/construction/*.tsx`

**Priority 4:** Standardize Investors Module
- Generate hooks for investors, investments, distributions
- Replace direct API calls with hooks
- Files: `/pages/rental/investors.tsx`, `/pages/rental/investments.tsx`, `/pages/rental/distributions.tsx`

### MEDIUM (Nice to Have)

**Priority 5:** Bank Accounts Module
- Generate hooks for `/api/rental/accounts/*`
- Update pages to use hooks instead of direct API

**Priority 6:** Owner Statements
- Generate hooks for `/api/rental/statements/*`
- Update `/pages/rental/statements.tsx`

---

## Action Items

### 1. Update OpenAPI Schema (CRITICAL)
```bash
# Location: likely /api-server/openapi.yaml or similar
# Action: Add all rental module endpoints to OpenAPI schema
# Endpoints to add:
- GET /rental/accruals
- PATCH /rental/accruals/:id
- POST /rental/accruals/recalculate
- GET /rental/payments
- POST /rental/payments
- DELETE /rental/payments/:id
- GET /rental/deposits
- POST /rental/deposits
- PATCH /rental/deposits/:id
- GET /rental/expenses
- POST /rental/expenses
- GET /rental/properties
- GET /rental/accounts
- POST /rental/accounts
# ... etc
```

### 2. Regenerate API Client (CRITICAL)
```bash
# Command likely:
cd /lib/api-client-react
npm run generate
# or
pnpm generate:client
```

### 3. Add Missing Backend Endpoints (HIGH)
Add to `/api-server/src/routes/rental.ts`:
```typescript
// DELETE accrual
router.delete("/rental/accruals/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(accrualsTable).where(eq(accrualsTable.id, id));
  res.json({ ok: true });
});

// PATCH payment
router.patch("/rental/payments/:id", requireAuth, async (req, res) => {
  // implementation
});

// DELETE expense
router.delete("/rental/expenses/:id", requireAuth, async (req, res) => {
  // implementation
});
```

### 4. Update Broken Pages (CRITICAL)
After regenerating client, verify imports work in:
- `/pages/rental/accruals.tsx`
- `/pages/rental/payments.tsx`
- `/pages/rental/deposits.tsx`
- `/pages/rental/expenses.tsx`
- `/pages/rental/rental-dashboard.tsx`
- `/pages/rental/rental-properties.tsx`

### 5. Refactor Direct API Calls (MEDIUM)
Convert pages using `api.get/post/delete` to use generated hooks:
- All construction module pages (27 files)
- Investors module pages (3 files)
- Bank accounts pages

---

## Testing Checklist

After fixes:

### Smoke Tests:
- [ ] Login page works
- [ ] Dashboard loads
- [ ] Properties page loads
- [ ] Tenants page works (CRUD)
- [ ] Lease contracts page works (CRUD)

### Rental Module Tests:
- [ ] Accruals page loads without errors
- [ ] Can view accruals list
- [ ] Can apply discount to accrual
- [ ] Can accept payment on accrual
- [ ] Payments page loads
- [ ] Can register new payment
- [ ] Can view payment allocations
- [ ] Deposits page loads
- [ ] Can create/update deposit
- [ ] Expenses page loads
- [ ] Can create/delete expense

### Construction Module Tests:
- [ ] Projects page loads
- [ ] Can create/edit/delete project
- [ ] Stages page works
- [ ] Tasks page works
- [ ] Materials page works
- [ ] Budget page works
- [ ] Expenses page works

---

## Summary Statistics

- **Total Pages:** 77
- **Pages Using API Client Hooks:** 13
- **Pages Using Direct API:** 58
- **Broken Pages (missing hooks):** 6
- **Backend Endpoints:** 100+
- **Generated Hooks:** ~20
- **Missing Hooks:** 80+

**Completion Estimate:** 75% backend done, 20% frontend done

---

## Recommendations

1. **Immediate:** Fix OpenAPI schema and regenerate client (2-4 hours)
2. **Short-term:** Add missing backend DELETE/PATCH endpoints (4-6 hours)
3. **Medium-term:** Refactor all direct API calls to use hooks (2-3 days)
4. **Long-term:** Setup CI/CD to auto-regenerate client on API changes

---

## File Paths Reference

### Frontend:
- Pages: `/Users/asans/Desktop/4Project/Asset-Manager/artifacts/proptech/src/pages/`
- API Client: `/Users/asans/Desktop/4Project/Asset-Manager/lib/api-client-react/`
- Generated Hooks: `/lib/api-client-react/src/generated/api.ts`

### Backend:
- Routes: `/Users/asans/Desktop/4Project/Asset-Manager/artifacts/api-server/src/routes/`
- Rental Routes: `/api-server/src/routes/rental.ts` (31 endpoints)
- Construction Routes: `/api-server/src/routes/construction.ts` (25+ endpoints)
- Investors Routes: `/api-server/src/routes/investors.ts` (12 endpoints)

---

**End of Audit Report**
