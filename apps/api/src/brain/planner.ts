import type { ToolCall } from "@jarvis/contracts";
import { PermissionSystem } from "../security/permissionSystem.js";

export interface Plan {
  intent: string;
  steps: string[];
  toolCalls: ToolCall[];
}

export class Planner {
  constructor(private readonly permissions = new PermissionSystem()) {}

  createPlan(prompt: string): Plan {
    const lower = prompt.toLowerCase();
    const steps = ["Understand the request", "Retrieve relevant memory", "Select specialist agent", "Execute safe tools", "Return concise result"];
    const toolCalls: ToolCall[] = [];

    if (lower.includes("unread email")) toolCalls.push(this.permissions.prepareCall("email.summarize_unread", { limit: 20 }));
    if (lower.includes("calendar") || lower.includes("agenda")) toolCalls.push(this.permissions.prepareCall("calendar.agenda", {}));
    if (lower.includes("search") || lower.includes("find")) toolCalls.push(this.permissions.prepareCall("web.search", { query: prompt }));
    if (lower.includes("open chrome")) toolCalls.push(this.permissions.prepareCall("desktop.open_app", { appName: "Google Chrome" }));
    if (lower.includes("launch vs code") || lower.includes("open vscode")) {
      toolCalls.push(this.permissions.prepareCall("desktop.open_app", { appName: "Visual Studio Code" }));
    }

    return { intent: this.intent(prompt), steps, toolCalls };
  }

  private intent(prompt: string): string {
    if (/email/i.test(prompt)) return "email_triage";
    if (/video|podcast|reel|short/i.test(prompt)) return "video_workflow";
    if (/code|debug|project|vscode/i.test(prompt)) return "coding";
    if (/calendar|schedule|study plan|remind/i.test(prompt)) return "productivity";
    if (/search|find|research|internship/i.test(prompt)) return "research";
    return "general_assistance";
  }
}
