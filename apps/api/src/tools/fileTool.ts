import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import type { ToolDefinition } from "./tool.js";

function safePath(target: string): string {
  const resolved = path.resolve(target.startsWith("~") ? target.replace("~", process.env.HOME ?? "") : target);
  const root = path.resolve(env.JARVIS_SAFE_WORKSPACE);
  if (!resolved.startsWith(root)) throw new Error(`File access denied outside safe workspace: ${root}`);
  return resolved;
}

export const listFilesTool: ToolDefinition<{ path: string }> = {
  name: "file.list",
  description: "List files in a local directory inside the configured safe workspace.",
  risk: "low",
  schema: { path: "Directory path" },
  async execute(input) {
    const dir = safePath(input.path);
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : "file" }));
  }
};

export const readFileTool: ToolDefinition<{ path: string }> = {
  name: "file.read",
  description: "Read a UTF-8 file inside the configured safe workspace.",
  risk: "low",
  schema: { path: "File path" },
  async execute(input) {
    return readFile(safePath(input.path), "utf8");
  }
};

export const writeFileTool: ToolDefinition<{ path: string; content: string }> = {
  name: "file.write",
  description: "Create or replace a file inside the configured safe workspace.",
  risk: "high",
  schema: { path: "File path", content: "New file content" },
  async execute(input, context) {
    if (!context.approved) throw new Error("Approval required before writing files.");
    const file = safePath(input.path);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, input.content, "utf8");
    return { path: file, bytes: Buffer.byteLength(input.content) };
  }
};

export const moveFileTool: ToolDefinition<{ from: string; to: string }> = {
  name: "file.move",
  description: "Move or rename a file inside the configured safe workspace.",
  risk: "high",
  schema: { from: "Current path", to: "Destination path" },
  async execute(input, context) {
    if (!context.approved) throw new Error("Approval required before moving files.");
    const from = safePath(input.from);
    const to = safePath(input.to);
    await mkdir(path.dirname(to), { recursive: true });
    await rename(from, to);
    return { from, to };
  }
};

export const fileInfoTool: ToolDefinition<{ path: string }> = {
  name: "file.info",
  description: "Return metadata for a file or folder.",
  risk: "low",
  schema: { path: "Path" },
  async execute(input) {
    const info = await stat(safePath(input.path));
    return { size: info.size, isDirectory: info.isDirectory(), modifiedAt: info.mtime.toISOString() };
  }
};
