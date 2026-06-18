import type { AgentEvent } from "@jarvis/contracts";
import { id, nowIso } from "../infrastructure/ids.js";
import type { AgentInput, AgentResult, AgentRuntime, JarvisAgent } from "./baseAgent.js";

function event(taskId: string, agent: string, type: AgentEvent["type"], message: string, data = {}): AgentEvent {
  return { id: id("evt"), taskId, agent, type, message, createdAt: nowIso(), data };
}

async function answerWithModel(agent: string, input: AgentInput, runtime: AgentRuntime, specialty: string): Promise<AgentResult> {
  const context = await runtime.memory.retrieveContext(input.userId, input.conversationId, input.prompt);
  const response = await runtime.models.generate({
    taskKind: "reasoning",
    system: `You are JARVIS, a professional, concise, slightly witty AI chief of staff. Specialty: ${specialty}. Be proactive and concrete.`,
    prompt: [
      `User request: ${input.prompt}`,
      `Recent conversation: ${context.shortTerm.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
      `Relevant memories: ${[...context.longTerm.map((m) => m.content), ...context.semantic.map((m) => m.content)].join("\n")}`,
      "Respond with an execution-oriented answer. Mention any unavailable external connection plainly."
    ].join("\n\n")
  });
  return {
    answer: response,
    events: [event(input.taskId, agent, "thought", `${agent} completed reasoning.`)]
  };
}

export const productivityAgent: JarvisAgent = {
  name: "Productivity Agent",
  description: "Calendar, scheduling, reminders, priorities, daily plans.",
  canHandle: (prompt) => (/(calendar|schedule|remind|meeting|plan|agenda)/i.test(prompt) ? 0.9 : 0.2),
  run: (input, runtime) => answerWithModel("Productivity Agent", input, runtime, "calendar, scheduling, reminders")
};

export const researchAgent: JarvisAgent = {
  name: "Research Agent",
  description: "Web research, summaries, reports, opportunity discovery.",
  canHandle: (prompt) => (/(research|search|find|summarize|report|internship|news)/i.test(prompt) ? 0.92 : 0.25),
  async run(input, runtime) {
    const events = [event(input.taskId, this.name, "tool", "Checking available research tools.")];
    if (/(search|find|news|internship)/i.test(input.prompt)) {
      const result = await runtime.tools.get("web.search").execute({ query: input.prompt }, { userId: input.userId, approved: true });
      events.push(event(input.taskId, this.name, "tool", "Web search completed.", result as Record<string, unknown>));
    }
    const model = await answerWithModel(this.name, input, runtime, "web research and synthesis");
    return { answer: model.answer, events: [...events, ...model.events] };
  }
};

export const codingAgent: JarvisAgent = {
  name: "Coding Agent",
  description: "Code generation, debugging, refactoring, architecture.",
  canHandle: (prompt) => (/(code|debug|refactor|bug|typescript|python|repo|project|vscode)/i.test(prompt) ? 0.9 : 0.15),
  run: (input, runtime) => answerWithModel("Coding Agent", input, runtime, "software engineering and code review")
};

export const contentAgent: JarvisAgent = {
  name: "Content Agent",
  description: "Writing, scripts, posts, captions, hooks.",
  canHandle: (prompt) => (/(write|blog|script|caption|post|thread|copy)/i.test(prompt) ? 0.86 : 0.15),
  run: (input, runtime) => answerWithModel("Content Agent", input, runtime, "content strategy and drafting")
};

export const videoAgent: JarvisAgent = {
  name: "Video Agent",
  description: "Podcast editing plans, shorts, reels, captions, highlight extraction.",
  canHandle: (prompt) => (/(video|podcast|reel|short|clip|caption|silence|ffmpeg)/i.test(prompt) ? 0.94 : 0.1),
  run: (input, runtime) => answerWithModel("Video Agent", input, runtime, "video editing automation with FFmpeg, Whisper, and OpenCV")
};

export const personalAssistantAgent: JarvisAgent = {
  name: "Personal Assistant Agent",
  description: "Daily planning, notes, tasks, habits, personal operating rhythm.",
  canHandle: () => 0.45,
  run: (input, runtime) => answerWithModel("Personal Assistant Agent", input, runtime, "personal executive assistance")
};

export const computerControlAgent: JarvisAgent = {
  name: "Computer Control Agent",
  description: "Desktop actions, apps, terminal, files, browser navigation.",
  canHandle: (prompt) => (/(open|launch|click|type|terminal|folder|move file|downloads|chrome|youtube)/i.test(prompt) ? 0.96 : 0.12),
  async run(input, runtime) {
    const events = [event(input.taskId, this.name, "security", "Desktop command identified; high-risk actions require approval.")];
    const lower = input.prompt.toLowerCase();
    if (lower.includes("open chrome")) {
      return {
        answer: "I can open Chrome after you approve the desktop action.",
        events,
      };
    }
    return answerWithModel(this.name, input, runtime, "safe computer control and workflow automation");
  }
};

export const allAgents: JarvisAgent[] = [
  productivityAgent,
  researchAgent,
  codingAgent,
  contentAgent,
  videoAgent,
  computerControlAgent,
  personalAssistantAgent
];
