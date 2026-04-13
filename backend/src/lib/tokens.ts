import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/auth.js";

type TokenPayload = AuthUser & {
  tokenType: "access" | "refresh";
};

export function signAccessToken(user: AuthUser) {
  return jwt.sign({ ...user, tokenType: "access" } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: "15m"
  });
}

export function signRefreshToken(user: AuthUser) {
  return jwt.sign(
    { ...user, tokenType: "refresh" } satisfies TokenPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}
