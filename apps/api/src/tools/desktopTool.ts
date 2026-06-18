import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolDefinition } from "./tool.js";

const execFileAsync = promisify(execFile);

export const openAppTool: ToolDefinition<{ appName: string }> = {
  name: "desktop.open_app",
  description: "Open an installed macOS application.",
  risk: "high",
  schema: { appName: "Application name, for example Visual Studio Code" },
  async execute(input, context) {
    if (!context.approved) throw new Error("Approval required before controlling the desktop.");
    await execFileAsync("open", ["-a", input.appName], { timeout: 30_000 });
    return { opened: input.appName };
  }
};
