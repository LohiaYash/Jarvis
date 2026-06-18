import { EventEmitter } from "node:events";
import { env } from "../config/env.js";
import type { Brain } from "../brain/brain.js";

export class VoiceEngine extends EventEmitter {
  private interrupted = false;

  constructor(private readonly brain: Brain) {
    super();
  }

  interrupt(): void {
    this.interrupted = true;
    this.emit("speech:interrupt");
  }

  async processTranscript(transcript: string, conversationId?: string): Promise<void> {
    if (!/\bjarvis\b/i.test(transcript)) return;
    this.interrupted = false;
    this.emit("transcript", transcript);
    const response = await this.brain.handle({
      userId: "local-user",
      message: transcript.replace(/\bjarvis\b/i, "").trim(),
      conversationId,
      mode: "voice"
    });
    this.emit("assistant", response.answer);
    if (!this.interrupted) this.emit("tts", await this.synthesize(response.answer));
  }

  async synthesize(text: string): Promise<{ provider: string; audioBase64?: string; text: string }> {
    if (!env.ELEVENLABS_API_KEY) return { provider: "piper-local-fallback", text };
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL", {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5" })
    });
    const audio = Buffer.from(await response.arrayBuffer()).toString("base64");
    return { provider: "elevenlabs", audioBase64: audio, text };
  }
}
