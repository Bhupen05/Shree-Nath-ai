import type { NextFunction, Request, Response } from "express";
import { toErrorPayload } from "../lib/http.js";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const payload = toErrorPayload(error);
  res.status(payload.statusCode).json(payload.body);
}
