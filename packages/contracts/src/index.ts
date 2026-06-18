import { z } from "zod";

export const JarvisRoleSchema = z.enum(["user", "assistant", "system", "tool"]);
export type JarvisRole = z.infer<typeof JarvisRoleSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: JarvisRoleSchema,
  content: z.string(),
  createdAt: z.string(),
  metadata: z.record(z.unknown()).default({})
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const AssistantRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
  mode: z.enum(["text", "voice"]).default("text"),
  userId: z.string().default("local-user")
});
export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;

export const ToolRiskSchema = z.enum(["low", "medium", "high", "critical"]);
export type ToolRisk = z.infer<typeof ToolRiskSchema>;

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.record(z.unknown()),
  risk: ToolRiskSchema,
  requiresApproval: z.boolean()
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

export const TaskStatusSchema = z.enum([
  "queued",
  "planning",
  "waiting_for_approval",
  "executing",
  "completed",
  "failed"
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const AgentEventSchema = z.object({
  id: z.string(),
  taskId: z.string().optional(),
  agent: z.string(),
  type: z.enum(["thought", "tool", "memory", "security", "result", "error"]),
  message: z.string(),
  createdAt: z.string(),
  data: z.record(z.unknown()).default({})
});
export type AgentEvent = z.infer<typeof AgentEventSchema>;

export const AssistantResponseSchema = z.object({
  conversationId: z.string(),
  taskId: z.string(),
  status: TaskStatusSchema,
  answer: z.string(),
  events: z.array(AgentEventSchema),
  pendingToolCalls: z.array(ToolCallSchema).default([])
});
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;

export const ApprovalStatusSchema = z.enum(["pending", "approved", "rejected", "executed", "failed"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  conversationId: z.string(),
  taskId: z.string(),
  toolCall: ToolCallSchema,
  status: ApprovalStatusSchema,
  result: z.unknown().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>;

export const MemoryRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  scope: z.enum(["short_term", "long_term", "semantic"]),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  importance: z.number().min(0).max(1).default(0.5),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type MemoryRecord = z.infer<typeof MemoryRecordSchema>;

export const ScheduledJobSchema = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
  cron: z.string(),
  enabled: z.boolean(),
  createdAt: z.string()
});
export type ScheduledJob = z.infer<typeof ScheduledJobSchema>;

export const ModelProviderSchema = z.enum(["openai", "anthropic", "gemini", "ollama"]);
export type ModelProvider = z.infer<typeof ModelProviderSchema>;

export interface ModelRoute {
  provider: ModelProvider;
  model: string;
  reason: string;
}
