import type { ToolRisk } from "@jarvis/contracts";

export interface ToolContext {
  userId: string;
  approved: boolean;
}

export interface ToolDefinition<TInput extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  risk: ToolRisk;
  schema: Record<string, string>;
  execute(input: TInput, context: ToolContext): Promise<TResult>;
}
