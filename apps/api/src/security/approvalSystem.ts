import type { ApprovalRecord, ApprovalStatus, ToolCall } from "@jarvis/contracts";
import { ToolCallSchema } from "@jarvis/contracts";
import { auditLog } from "../infrastructure/audit.js";
import { pool } from "../infrastructure/database.js";
import { id } from "../infrastructure/ids.js";
import type { ToolRegistry } from "../tools/index.js";

function rowToApproval(row: Record<string, unknown>): ApprovalRecord {
  const toolCall = ToolCallSchema.parse(row.tool_call);
  return {
    id: String(row.id),
    userId: String(row.user_id),
    conversationId: String(row.conversation_id),
    taskId: String(row.task_id),
    toolCall,
    status: row.status as ApprovalStatus,
    result: row.result ?? undefined,
    error: typeof row.error === "string" ? row.error : undefined,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString()
  };
}

export class ApprovalSystem {
  constructor(private readonly tools: ToolRegistry) {}

  async createPending(input: {
    userId: string;
    conversationId: string;
    taskId: string;
    toolCalls: ToolCall[];
  }): Promise<ApprovalRecord[]> {
    const records: ApprovalRecord[] = [];
    for (const toolCall of input.toolCalls) {
      const approvalId = id("approval");
      const result = await pool.query(
        `insert into tool_approvals (id, user_id, conversation_id, task_id, tool_call)
         values ($1, $2, $3, $4, $5)
         returning *`,
        [approvalId, input.userId, input.conversationId, input.taskId, toolCall]
      );
      records.push(rowToApproval(result.rows[0]));
      await auditLog({
        actor: input.userId,
        action: `approval.requested:${toolCall.name}`,
        risk: toolCall.risk,
        approved: false,
        details: { approvalId, input: toolCall.input }
      });
    }
    return records;
  }

  async list(userId: string): Promise<ApprovalRecord[]> {
    const result = await pool.query(
      "select * from tool_approvals where user_id = $1 order by created_at desc limit 50",
      [userId]
    );
    return result.rows.map(rowToApproval);
  }

  async decide(input: { approvalId: string; userId: string; approved: boolean }): Promise<ApprovalRecord> {
    const current = await pool.query("select * from tool_approvals where id = $1 and user_id = $2", [
      input.approvalId,
      input.userId
    ]);
    if (current.rowCount === 0) throw new Error("Approval request not found.");
    const record = rowToApproval(current.rows[0]);
    if (record.status !== "pending") throw new Error(`Approval is already ${record.status}.`);

    if (!input.approved) {
      const rejected = await pool.query(
        `update tool_approvals
         set status = 'rejected', updated_at = now()
         where id = $1
         returning *`,
        [input.approvalId]
      );
      await auditLog({
        actor: input.userId,
        action: `approval.rejected:${record.toolCall.name}`,
        risk: record.toolCall.risk,
        approved: false,
        details: { approvalId: input.approvalId }
      });
      return rowToApproval(rejected.rows[0]);
    }

    await pool.query("update tool_approvals set status = 'approved', updated_at = now() where id = $1", [
      input.approvalId
    ]);
    try {
      const result = await this.tools.get(record.toolCall.name).execute(record.toolCall.input, {
        userId: input.userId,
        approved: true
      });
      const executed = await pool.query(
        `update tool_approvals
         set status = 'executed', result = $2, updated_at = now()
         where id = $1
         returning *`,
        [input.approvalId, result ?? null]
      );
      await auditLog({
        actor: input.userId,
        action: record.toolCall.name,
        risk: record.toolCall.risk,
        approved: true,
        details: { approvalId: input.approvalId, input: record.toolCall.input }
      });
      return rowToApproval(executed.rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool execution failed.";
      const failed = await pool.query(
        `update tool_approvals
         set status = 'failed', error = $2, updated_at = now()
         where id = $1
         returning *`,
        [input.approvalId, message]
      );
      await auditLog({
        actor: input.userId,
        action: `approval.failed:${record.toolCall.name}`,
        risk: record.toolCall.risk,
        approved: true,
        details: { approvalId: input.approvalId, error: message }
      });
      return rowToApproval(failed.rows[0]);
    }
  }
}
