import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolDefinition } from "./tool.js";

const execFileAsync = promisify(execFile);
const allowedCommands = new Set(["pwd", "ls", "date", "whoami", "node", "npm", "git"]);

export const terminalTool: ToolDefinition<{ command: string; args?: string[]; cwd?: string }> = {
  name: "terminal.run",
  description: "Run an allowlisted terminal command after approval.",
  risk: "high",
  schema: { command: "Executable", args: "Argument array", cwd: "Working directory" },
  async execute(input, context) {
    if (!context.approved) throw new Error("Approval required before running terminal commands.");
    if (!allowedCommands.has(input.command)) throw new Error(`Command is not allowlisted: ${input.command}`);
    const { stdout, stderr } = await execFileAsync(input.command, input.args ?? [], {
      cwd: input.cwd,
      timeout: 60_000,
      maxBuffer: 1024 * 1024
    });
    return { stdout, stderr };
  }
};
