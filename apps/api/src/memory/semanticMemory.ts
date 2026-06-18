import { ChromaClient } from "chromadb";
import { env } from "../config/env.js";
import { id } from "../infrastructure/ids.js";

export interface SemanticHit {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

function simpleEmbedding(text: string): number[] {
  const dims = 384;
  const vector = Array.from({ length: dims }, () => 0);
  for (let i = 0; i < text.length; i += 1) {
    const index = i % dims;
    vector[index] = (vector[index] ?? 0) + text.charCodeAt(i) / 255;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

export class SemanticMemory {
  private client = new ChromaClient({ path: env.CHROMA_URL });

  async add(userId: string, content: string, metadata: Record<string, unknown> = {}): Promise<string> {
    const collection = await this.client.getOrCreateCollection({ name: `jarvis_${userId}` });
    const memoryId = id("sem");
    await collection.add({
      ids: [memoryId],
      documents: [content],
      embeddings: [simpleEmbedding(content)],
      metadatas: [{ ...metadata, userId }]
    });
    return memoryId;
  }

  async search(userId: string, query: string, limit = 5): Promise<SemanticHit[]> {
    const collection = await this.client.getOrCreateCollection({ name: `jarvis_${userId}` });
    const result = await collection.query({
      queryEmbeddings: [simpleEmbedding(query)],
      nResults: limit
    });
    const ids = result.ids[0] ?? [];
    const docs = result.documents[0] ?? [];
    const distances = result.distances?.[0] ?? [];
    const metas = result.metadatas[0] ?? [];
    return ids.map((hitId, index) => ({
      id: String(hitId),
      content: docs[index] ?? "",
      score: 1 - Number(distances[index] ?? 1),
      metadata: (metas[index] ?? {}) as Record<string, unknown>
    }));
  }
}
