import type { ToolRegistry } from "../tools/index.js";

export function buildMcpManifest(registry: ToolRegistry): Record<string, unknown> {
  return {
    name: "jarvis-local-tools",
    version: "0.1.0",
    protocol: "mcp-compatible",
    tools: registry.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema,
      risk: tool.risk
    }))
  };
}
