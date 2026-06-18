import type { ChatMessage, MemoryRecord } from "@jarvis/contracts";
import { ShortTermMemory } from "./shortTermMemory.js";
import { LongTermMemory } from "./longTermMemory.js";
import { SemanticMemory, type SemanticHit } from "./semanticMemory.js";

export class MemorySystem {
  readonly shortTerm = new ShortTermMemory();
  readonly longTerm = new LongTermMemory();
  readonly semantic = new SemanticMemory();

  appendConversation(conversationId: string, message: ChatMessage): void {
    this.shortTerm.append(conversationId, message);
  }

  async retrieveContext(userId: string, conversationId: string, query: string): Promise<{
    shortTerm: ChatMessage[];
    longTerm: MemoryRecord[];
    semantic: SemanticHit[];
  }> {
    const [longTerm, semantic] = await Promise.all([
      this.longTerm.recent(userId, 8).catch(() => []),
      this.semantic.search(userId, query, 5).catch(() => [])
    ]);
    return {
      shortTerm: this.shortTerm.get(conversationId),
      longTerm,
      semantic
    };
  }

  async learn(userId: string, content: string, tags: string[] = []): Promise<void> {
    await Promise.allSettled([
      this.longTerm.remember({ userId, scope: "long_term", content, tags, importance: 0.65 }),
      this.semantic.add(userId, content, { tags })
    ]);
  }
}
