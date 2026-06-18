import type { ChatMessage } from "@jarvis/contracts";

export class ShortTermMemory {
  private readonly conversations = new Map<string, ChatMessage[]>();

  append(conversationId: string, message: ChatMessage): void {
    const messages = this.conversations.get(conversationId) ?? [];
    messages.push(message);
    this.conversations.set(conversationId, messages.slice(-40));
  }

  get(conversationId: string): ChatMessage[] {
    return this.conversations.get(conversationId) ?? [];
  }
}
