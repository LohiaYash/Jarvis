import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

function signState(payload: string): string {
  return createHmac("sha256", env.JWT_SECRET).update(payload).digest("base64url");
}

export function encodeOAuthState(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId })).toString("base64url");
  return `${payload}.${signState(payload)}`;
}

export function decodeOAuthState(state: string): { userId: string } {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("Invalid OAuth state.");
  const expected = signState(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  const valid = signatureBuffer.length === expectedBuffer.length && timingSafeEqual(signatureBuffer, expectedBuffer);
  if (!valid) throw new Error("Invalid OAuth state signature.");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId: string };
}
