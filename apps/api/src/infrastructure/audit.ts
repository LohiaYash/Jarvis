import { pool } from "./database.js";
import { id } from "./ids.js";
import type { ToolRisk } from "@jarvis/contracts";

export async function auditLog(input: {
  actor: string;
  action: string;
  risk: ToolRisk;
  approved: boolean;
  details?: Record<string, unknown>;
}): Promise<void> {
  await pool.query(
    "insert into audit_logs (id, actor, action, risk, approved, details) values ($1, $2, $3, $4, $5, $6)",
    [id("audit"), input.actor, input.action, input.risk, input.approved, input.details ?? {}]
  );
}
