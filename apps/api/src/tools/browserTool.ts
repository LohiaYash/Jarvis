import { chromium } from "playwright";
import type { ToolDefinition } from "./tool.js";

export const browserTool: ToolDefinition<{ url: string; objective?: string }> = {
  name: "browser.open",
  description: "Open a web page in an automated Chromium browser and return page title.",
  risk: "medium",
  schema: { url: "URL to open", objective: "Optional reason" },
  async execute(input) {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      return { title: await page.title(), url: page.url(), objective: input.objective ?? null };
    } finally {
      await browser.close();
    }
  }
};
