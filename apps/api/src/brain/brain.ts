import type { AgentEvent, AssistantRequest, AssistantResponse, ChatMessage } from "@jarvis/contracts";
import { AssistantRequestSchema } from "@jarvis/contracts";
import { allAgents } from "../agents/specializedAgents.js";
import { auditLog } from "../infrastructure/audit.js";
import { id, nowIso } from "../infrastructure/ids.js";
import type { MemorySystem } from "../memory/memorySystem.js";
import type { ModelManager } from "../models/modelManager.js";
import type { ApprovalSystem } from "../security/approvalSystem.js";
import type { ToolRegistry } from "../tools/index.js";
import { Planner } from "./planner.js";

export class Brain {
  private readonly planner = new Planner();

  constructor(
    private readonly memory: MemorySystem,
    private readonly models: ModelManager,
    private readonly tools: ToolRegistry,
    private readonly approvals?: ApprovalSystem
  ) {}

  async handle(raw: AssistantRequest): Promise<AssistantResponse> {
    const request = AssistantRequestSchema.parse(raw);
    const conversationId = request.conversationId ?? id("conv");
    const taskId = id("task");
    const userMessage: ChatMessage = {
      id: id("msg"),
      role: "user",
      content: request.message,
      createdAt: nowIso(),
      metadata: { mode: request.mode }
    };
    this.memory.appendConversation(conversationId, userMessage);

    const plan = this.planner.createPlan(request.message);
    const executable = plan.toolCalls.filter((call) => !call.requiresApproval);
    const pending = plan.toolCalls.filter((call) => call.requiresApproval);
    const events: AgentEvent[] = plan.steps.map((step) => ({
      id: id("evt"),
      taskId,
      agent: "Brain",
      type: "thought" as const,
      message: step,
      createdAt: nowIso(),
      data: { intent: plan.intent }
    }));

    for (const call of executable) {
      const result = await this.tools.get(call.name).execute(call.input, { userId: request.userId, approved: true });
      await auditLog({ actor: request.userId, action: call.name, risk: call.risk, approved: true, details: call.input });
      events.push({
        id: id("evt"),
        taskId,
        agent: "Tool System",
        type: "tool",
        message: `${call.name} executed.`,
        createdAt: nowIso(),
        data: { result: result as unknown }
      });
    }

    const agent = [...allAgents].sort((a, b) => b.canHandle(request.message) - a.canHandle(request.message))[0]!;
    const result = await agent.run(
      { userId: request.userId, taskId, prompt: request.message, conversationId },
      { memory: this.memory, models: this.models, tools: this.tools }
    );

    const finalAnswer = pending.length
      ? `${result.answer}\n\nI need approval before I run: ${pending.map((call) => `${call.name} (${call.risk})`).join(", ")}.`
      : result.answer;

    if (pending.length && this.approvals) {
      await this.approvals.createPending({
        userId: request.userId,
        conversationId,
        taskId,
        toolCalls: pending
      });
      events.push({
        id: id("evt"),
        taskId,
        agent: "Security",
        type: "security",
        message: `${pending.length} tool approval request${pending.length === 1 ? "" : "s"} queued.`,
        createdAt: nowIso(),
        data: { approvals: pending.map((call) => call.id) }
      });
    }

    const assistantMessage: ChatMessage = {
      id: id("msg"),
      role: "assistant",
      content: finalAnswer,
      createdAt: nowIso(),
      metadata: { taskId, agent: agent.name }
    };
    this.memory.appendConversation(conversationId, assistantMessage);
    await this.memory.learn(request.userId, `User asked: ${request.message}\nJARVIS answered: ${finalAnswer}`, [plan.intent]);

    return {
      conversationId,
      taskId,
      status: pending.length ? "waiting_for_approval" : "completed",
      answer: finalAnswer,
      events: [...events, ...result.events],
      pendingToolCalls: pending
    };
  }
}
