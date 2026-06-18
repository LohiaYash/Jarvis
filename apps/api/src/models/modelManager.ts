import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type { ModelRoute } from "@jarvis/contracts";
import { env } from "../config/env.js";

export interface GenerateInput {
  system: string;
  prompt: string;
  taskKind?: "reasoning" | "tool" | "large_context" | "local";
}

export class ModelManager {
  private openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
  private anthropic = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
  private gemini = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;

  route(input: GenerateInput): ModelRoute {
    if (input.taskKind === "reasoning" && this.anthropic) {
      return { provider: "anthropic", model: "claude-3-5-sonnet-latest", reason: "long-form reasoning" };
    }
    if (input.taskKind === "large_context" && this.gemini) {
      return { provider: "gemini", model: "gemini-1.5-pro", reason: "large context" };
    }
    if (this.openai) {
      return { provider: "openai", model: "gpt-4o-mini", reason: "tool-aware default" };
    }
    return { provider: "ollama", model: "llama3.1", reason: "local fallback" };
  }

  async generate(input: GenerateInput): Promise<string> {
    const route = this.route(input);
    if (route.provider === "openai" && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: route.model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt }
        ],
        temperature: 0.4
      });
      return response.choices[0]?.message.content ?? "";
    }
    if (route.provider === "anthropic" && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: route.model,
        max_tokens: 1600,
        system: input.system,
        messages: [{ role: "user", content: input.prompt }]
      });
      return response.content.map((part) => (part.type === "text" ? part.text : "")).join("");
    }
    if (route.provider === "gemini" && this.gemini) {
      const model = this.gemini.getGenerativeModel({ model: route.model });
      const response = await model.generateContent(`${input.system}\n\n${input.prompt}`);
      return response.response.text();
    }
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: route.model, prompt: `${input.system}\n\n${input.prompt}`, stream: false })
    }).catch(() => null);
    if (!response?.ok) {
      return "I can plan this locally, but no model provider is reachable yet. Configure OpenAI, Claude, Gemini, or Ollama to enable live reasoning.";
    }
    const json = (await response.json()) as { response?: string };
    return json.response ?? "";
  }
}
