import { Router } from "express";
import { aiRouter } from "../modules/ai/ai.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { billingRouter } from "../modules/billing/billing.routes.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes.js";
import { employeesRouter } from "../modules/employees/employees.routes.js";
import { inventoryRouter } from "../modules/inventory/inventory.routes.js";
import { reportsRouter } from "../modules/reports/reports.routes.js";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "SIBMS API",
    version: "v1",
    status: "modules-wired"
  });
});

apiRouter.use(authRouter);
apiRouter.use(inventoryRouter);
apiRouter.use(billingRouter);
apiRouter.use(employeesRouter);
apiRouter.use(dashboardRouter);
apiRouter.use(aiRouter);
apiRouter.use(reportsRouter);
