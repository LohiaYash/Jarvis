import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ToolDefinition } from "./tool.js";

const execFileAsync = promisify(execFile);

export const videoProbeTool: ToolDefinition<{ inputPath: string; outputDir: string }> = {
  name: "video.prepare_reels",
  description: "Probe a video and create a folder for generated shorts/reels assets.",
  risk: "high",
  schema: { inputPath: "Video path", outputDir: "Output directory" },
  async execute(input, context) {
    if (!context.approved) throw new Error("Approval required before processing media files.");
    await mkdir(input.outputDir, { recursive: true });
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      input.inputPath
    ]);
    return {
      inputPath: input.inputPath,
      outputDir: path.resolve(input.outputDir),
      durationSeconds: Number(stdout.trim()),
      next: "Run Whisper transcription, silence detection, and clip scoring from this prepared job."
    };
  }
};
