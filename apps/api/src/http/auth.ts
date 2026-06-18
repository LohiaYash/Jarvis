import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function issueDevToken(): string {
  return jwt.sign({ sub: "local-user", role: "owner" }, env.JWT_SECRET, { expiresIn: "7d" });
}

export function auth(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV === "development" && !req.headers.authorization) {
    req.userId = "local-user";
    next();
    return;
  }
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
