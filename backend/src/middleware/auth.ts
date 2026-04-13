import type { NextFunction, Request, Response, RequestHandler } from "express";
import { ApiError } from "../lib/http.js";
import { verifyAccessToken } from "../lib/tokens.js";

export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    next(new ApiError(401, "Authentication required"));
    return;
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.id,
      empCode: payload.empCode,
      fullName: payload.fullName,
      roles: payload.roles
    };
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
};

export function requireRoles(...roles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(401, "Authentication required"));
      return;
    }

    const allowed = req.user.roles.some((role) => roles.includes(role));

    if (!allowed) {
      next(new ApiError(403, "You do not have permission to perform this action"));
      return;
    }

    next();
  };
}
