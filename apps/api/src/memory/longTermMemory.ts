import type { MemoryRecord } from "@jarvis/contracts";
import { pool } from "../infrastructure/database.js";
import { id, nowIso } from "../infrastructure/ids.js";
import { decryptText, encryptText } from "../security/encryption.js";

export class LongTermMemory {
  async remember(input: {
    userId: string;
    scope: "long_term" | "semantic";
    content: string;
    tags?: string[];
    importance?: number;
  }): Promise<MemoryRecord> {
    const record: MemoryRecord = {
      id: id("mem"),
      userId: input.userId,
      scope: input.scope,
      content: input.content,
      tags: input.tags ?? [],
      importance: input.importance ?? 0.5,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    await pool.query(
      "insert into memories (id, user_id, scope, content, tags, importance) values ($1, $2, $3, $4, $5, $6)",
      [record.id, record.userId, record.scope, encryptText(record.content), record.tags, record.importance]
    );
    return record;
  }

  async recent(userId: string, limit = 10): Promise<MemoryRecord[]> {
    const result = await pool.query(
      "select * from memories where user_id = $1 order by updated_at desc limit $2",
      [userId, limit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      scope: row.scope,
      content: decryptText(row.content),
      tags: row.tags,
      importance: Number(row.importance),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    }));
  }
}
