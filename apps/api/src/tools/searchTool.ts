import type { ToolDefinition } from "./tool.js";

export const webSearchTool: ToolDefinition<{ query: string }> = {
  name: "web.search",
  description: "Search the web through a configured search provider.",
  risk: "low",
  schema: { query: "Search query" },
  async execute(input) {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(input.query)}`;
    const response = await fetch(url, { headers: { "user-agent": "JarvisAssistant/0.1" } });
    const html = await response.text();
    const titles = [...html.matchAll(/class="result__a"[^>]*>(.*?)<\/a>/g)]
      .slice(0, 8)
      .map((match) => match[1]?.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&"));
    return { query: input.query, results: titles };
  }
};
