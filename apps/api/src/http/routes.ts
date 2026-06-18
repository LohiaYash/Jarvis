import express from "express";
import { AssistantRequestSchema } from "@jarvis/contracts";
import type { Brain } from "../brain/brain.js";
import { buildMcpManifest } from "../mcp/manifest.js";
import type { MemorySystem } from "../memory/memorySystem.js";
import type { Scheduler } from "../scheduler/scheduler.js";
import type { ApprovalSystem } from "../security/approvalSystem.js";
import { auth, issueDevToken } from "./auth.js";
import type { ToolRegistry } from "../tools/index.js";
import type { GoogleOAuth } from "../integrations/googleOAuth.js";
import type { MicrosoftOAuth } from "../integrations/microsoftOAuth.js";

export function createRoutes(input: {
  brain: Brain;
  memory: MemorySystem;
  scheduler: Scheduler;
  tools: ToolRegistry;
  approvals: ApprovalSystem;
  google: GoogleOAuth;
  microsoft: MicrosoftOAuth;
}): express.Router {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, name: "JARVIS API", time: new Date().toISOString() });
  });

  router.get("/auth/dev-token", (_req, res) => {
    res.json({ token: issueDevToken() });
  });

  router.get("/integrations/google/callback", async (req, res, next) => {
    try {
      const code = String(req.query.code ?? "");
      const state = String(req.query.state ?? "");
      if (!code || !state) throw new Error("Google OAuth callback is missing code or state.");
      await input.google.handleCallback(code, state);
      res.type("html").send("<html><body><h1>Google connected</h1><p>You can close this window and return to JARVIS.</p></body></html>");
    } catch (error) {
      next(error);
    }
  });

  router.get("/integrations/microsoft/callback", async (req, res, next) => {
    try {
      const code = String(req.query.code ?? "");
      const state = String(req.query.state ?? "");
      if (!code || !state) throw new Error("Microsoft OAuth callback is missing code or state.");
      await input.microsoft.handleCallback(code, state);
      res.type("html").send("<html><body><h1>Microsoft connected</h1><p>You can close this window and return to JARVIS.</p></body></html>");
    } catch (error) {
      next(error);
    }
  });

  router.use(auth);

  router.get("/integrations/google/status", async (req, res, next) => {
    try {
      const connection = await input.google.getConnection(req.userId ?? "local-user");
      res.json({
        configured: input.google.isConfigured(),
        connected: Boolean(connection),
        scopes: connection?.scopes ?? []
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/integrations/google/auth-url", (req, res, next) => {
    try {
      res.json({ url: input.google.authUrl(req.userId ?? "local-user") });
    } catch (error) {
      next(error);
    }
  });

  router.get("/integrations/microsoft/status", async (req, res, next) => {
    try {
      const connection = await input.microsoft.getConnection(req.userId ?? "local-user");
      res.json({
        configured: input.microsoft.isConfigured(),
        connected: Boolean(connection),
        scopes: connection?.scopes ?? []
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/integrations/microsoft/auth-url", (req, res, next) => {
    try {
      res.json({ url: input.microsoft.authUrl(req.userId ?? "local-user") });
    } catch (error) {
      next(error);
    }
  });

  router.post("/assistant/message", async (req, res, next) => {
    try {
      const parsed = AssistantRequestSchema.parse({ ...req.body, userId: req.userId ?? "local-user" });
      res.json(await input.brain.handle(parsed));
    } catch (error) {
      next(error);
    }
  });

  router.get("/tools", (_req, res) => {
    res.json(input.tools.list().map(({ name, description, risk, schema }) => ({ name, description, risk, schema })));
  });

  router.get("/mcp/manifest", (_req, res) => {
    res.json(buildMcpManifest(input.tools));
  });

  router.get("/memory", async (req, res, next) => {
    try {
      res.json(await input.memory.longTerm.recent(req.userId ?? "local-user", 30));
    } catch (error) {
      next(error);
    }
  });

  router.post("/memory", async (req, res, next) => {
    try {
      await input.memory.learn(req.userId ?? "local-user", String(req.body.content), req.body.tags ?? []);
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/schedule", async (req, res, next) => {
    try {
      res.status(201).json(await input.scheduler.createJob(req.body));
    } catch (error) {
      next(error);
    }
  });

  router.get("/approvals", async (req, res, next) => {
    try {
      res.json(await input.approvals.list(req.userId ?? "local-user"));
    } catch (error) {
      next(error);
    }
  });

  router.post("/approvals/:id/approve", async (req, res, next) => {
    try {
      res.json(await input.approvals.decide({ approvalId: req.params.id, userId: req.userId ?? "local-user", approved: true }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/approvals/:id/reject", async (req, res, next) => {
    try {
      res.json(await input.approvals.decide({ approvalId: req.params.id, userId: req.userId ?? "local-user", approved: false }));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
