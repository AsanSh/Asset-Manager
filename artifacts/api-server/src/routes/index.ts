import { Router, type IRouter } from "express";
import aiRouter from "./ai";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import usersRouter from "./users";
import counterpartiesRouter from "./counterparties";
import propertiesRouter from "./properties";
import contractsRouter from "./contracts";
import documentsRouter from "./documents";
import importRouter from "./import";
import rentalRouter from "./rental";
import dashboardRouter from "./dashboard";
import activityRouter from "./activity";
import reportsRouter from "./reports";
import modulesRouter from "./modules";
import investorsRouter from "./investors";
import constructionRouter from "./construction";
import constructionFinanceRouter from "./construction-finance";
import constructionBudgetRouter from "./construction-budget";
import constructionReportsRouter from "./construction-reports";
import notificationsRouter from "./notifications";
import notificationsApiRouter from "./notifications-api";
import categoriesRouter from "./categories";
import portalRouter from "./portal";
import adminRouter from "./admin";
import legalEntitiesRouter from "./legal-entities";
import bankAccountsRouter from "./bank-accounts";
import rolesRouter from "./roles";
import warehouseRouter from "./warehouse";
import crmRouter from "./crm";
import platformAdminRouter from "./platform-admin";
import contractDocxRouter from "./contract-docx";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(companiesRouter);
router.use(usersRouter);
router.use(counterpartiesRouter);
router.use(propertiesRouter);
router.use(contractsRouter);
router.use(documentsRouter);
router.use(importRouter);
router.use(rentalRouter);
router.use(dashboardRouter);
router.use(activityRouter);
router.use(reportsRouter);
router.use(modulesRouter);
router.use("/rental", investorsRouter);
router.use("/construction", constructionRouter);
router.use("/construction", constructionFinanceRouter);
router.use(contractDocxRouter);
router.use("/construction", constructionBudgetRouter);
router.use("/construction", constructionReportsRouter);
router.use(notificationsRouter);
router.use(notificationsApiRouter);
router.use(categoriesRouter);
router.use(portalRouter);
router.use(adminRouter);
router.use(legalEntitiesRouter);
router.use(bankAccountsRouter);
router.use(rolesRouter);
router.use(warehouseRouter);
router.use(crmRouter);
router.use(platformAdminRouter);
router.use(aiRouter);

// NBKR exchange rates proxy
router.get("/nbkr/rates", async (_req, res): Promise<void> => {
  try {
    const r = await fetch("https://www.nbkr.kg/XML/daily.xml", { signal: AbortSignal.timeout(5000) });
    const xml = await r.text();
    // Формат НБКР: <Currency ISOCode="USD"><Nominal>1</Nominal><Value>87,4500</Value></Currency>
    // Десятичный разделитель — запятая, номинал в <Nominal>.
    const rates: Record<string, { name: string; rate: string; scale: string }> = {};
    const regex = /<Currency ISOCode="([^"]+)"[^>]*>[\s\S]*?<Nominal>(\d+)<\/Nominal>[\s\S]*?<Value>([\d.,]+)<\/Value>[\s\S]*?<\/Currency>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) {
      const [, iso, nominal, value] = m;
      rates[iso] = { name: iso, scale: nominal, rate: value.replace(",", ".") };
    }
    const dateMatch = xml.match(/Date="(\d{2})\.(\d{2})\.(\d{4})"/);
    const date = dateMatch
      ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      : new Date().toISOString().slice(0, 10);
    res.json({ date, rates });
  } catch {
    // Fallback rates if NBKR is unavailable
    res.json({ date: new Date().toISOString().slice(0, 10), rates: {
      USD: { name: "Доллар США", scale: "1", rate: "87.50" },
      EUR: { name: "Евро", scale: "1", rate: "95.20" },
      RUB: { name: "Российский рубль", scale: "100", rate: "95.40" },
    }});
  }
});

export default router;
