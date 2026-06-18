import cron from "node-cron";
import { pool } from "../infrastructure/database.js";
import { id } from "../infrastructure/ids.js";
import type { Brain } from "../brain/brain.js";

export class Scheduler {
  private readonly running = new Map<string, cron.ScheduledTask>();

  constructor(private readonly brain: Brain) {}

  async createJob(input: { name: string; prompt: string; cron: string }): Promise<{ id: string }> {
    if (!cron.validate(input.cron)) throw new Error("Invalid cron expression.");
    const jobId = id("job");
    await pool.query("insert into scheduled_jobs (id, name, prompt, cron) values ($1, $2, $3, $4)", [
      jobId,
      input.name,
      input.prompt,
      input.cron
    ]);
    this.schedule(jobId, input.prompt, input.cron);
    return { id: jobId };
  }

  async load(): Promise<void> {
    const result = await pool.query("select * from scheduled_jobs where enabled = true");
    for (const row of result.rows) this.schedule(row.id, row.prompt, row.cron);
  }

  private schedule(jobId: string, prompt: string, expression: string): void {
    this.running.get(jobId)?.stop();
    const task = cron.schedule(expression, async () => {
      await this.brain.handle({ userId: "local-user", message: prompt, mode: "text" });
    });
    this.running.set(jobId, task);
  }
}
