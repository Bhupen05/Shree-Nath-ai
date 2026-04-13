import { Router } from "express";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "SIBMS API",
    version: "v1",
    status: "ready-for-module-wiring"
  });
});
