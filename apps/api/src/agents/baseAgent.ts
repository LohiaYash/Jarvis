import type { AgentEvent } from "@jarvis/contracts";
import type { MemorySystem } from "../memory/memorySystem.js";
import type { ModelManager } from "../models/modelManager.js";
import type { ToolRegistry } from "../tools/index.js";

export interface AgentInput {
  userId: string;
  taskId: string;
  prompt: string;
  conversationId: string;
  approvedToolCallIds?: string[];
}

export interface AgentResult {
  answer: string;
  events: AgentEvent[];
}

export interface AgentRuntime {
  memory: MemorySystem;
  models: ModelManager;
  tools: ToolRegistry;
}

export interface JarvisAgent {
  name: string;
  description: string;
  canHandle(prompt: string): number;
  run(input: AgentInput, runtime: AgentRuntime): Promise<AgentResult>;
}
