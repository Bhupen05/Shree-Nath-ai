import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function toErrorPayload(error: unknown) {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      body: {
        success: false,
        message: error.message,
        details: error.details ?? null
      }
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        success: false,
        message: "Validation failed",
        details: error.flatten()
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      success: false,
      message: "Internal server error"
    }
  };
}
