import type { ToolCall, ToolRisk } from "@jarvis/contracts";
import { randomUUID } from "node:crypto";

const destructiveVerbs = ["delete", "remove", "rm", "format", "erase", "send_email", "purchase", "apply"];

export class PermissionSystem {
  classify(toolName: string, input: Record<string, unknown>): ToolRisk {
    const joined = `${toolName} ${JSON.stringify(input)}`.toLowerCase();
    if (destructiveVerbs.some((verb) => joined.includes(verb))) return "critical";
    if (toolName.includes("terminal") || toolName.includes("desktop")) return "high";
    if (toolName.includes("email") || toolName.includes("calendar")) return "medium";
    return "low";
  }

  prepareCall(name: string, input: Record<string, unknown>): ToolCall {
    const risk = this.classify(name, input);
    return {
      id: randomUUID(),
      name,
      input,
      risk,
      requiresApproval: risk === "high" || risk === "critical"
    };
  }
}
