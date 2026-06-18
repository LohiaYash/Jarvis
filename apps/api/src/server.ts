import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { Brain } from "./brain/brain.js";
import { env } from "./config/env.js";
import { GoogleOAuth } from "./integrations/googleOAuth.js";
import { MicrosoftOAuth } from "./integrations/microsoftOAuth.js";
import { migrate } from "./infrastructure/database.js";
import { MemorySystem } from "./memory/memorySystem.js";
import { ModelManager } from "./models/modelManager.js";
import { Scheduler } from "./scheduler/scheduler.js";
import { ApprovalSystem } from "./security/approvalSystem.js";
import { createToolRegistry } from "./tools/index.js";
import { createRoutes } from "./http/routes.js";

async function main(): Promise<void> {
  await migrate();
  const memory = new MemorySystem();
  const models = new ModelManager();
  const google = new GoogleOAuth();
  const microsoft = new MicrosoftOAuth();
  const tools = createToolRegistry({ google, microsoft });
  const approvals = new ApprovalSystem(tools);
  const brain = new Brain(memory, models, tools, approvals);
  const scheduler = new Scheduler(brain);
  await scheduler.load();

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(morgan("dev"));
  app.use("/api", createRoutes({ brain, memory, scheduler, tools, approvals, google, microsoft }));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  });

  app.listen(env.API_PORT, () => {
    console.log(`JARVIS API listening on http://localhost:${env.API_PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
