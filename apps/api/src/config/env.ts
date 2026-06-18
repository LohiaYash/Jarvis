import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4010),
  JWT_SECRET: z.string().min(16).default("dev-only-change-this-secret"),
  ENCRYPTION_KEY_BASE64: z.string().optional(),
  DATABASE_URL: z.string().default("postgresql://jarvis:jarvis@localhost:5432/jarvis"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  CHROMA_URL: z.string().default("http://localhost:8000"),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  JARVIS_SAFE_WORKSPACE: z.string().default(process.cwd()),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().default("http://localhost:4010/api/integrations/google/callback"),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_REDIRECT_URI: z.string().default("http://localhost:4010/api/integrations/microsoft/callback")
});

export const env = EnvSchema.parse(process.env);
