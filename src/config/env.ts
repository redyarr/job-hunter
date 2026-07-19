import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().min(1),

  TELEGRAM_API_ID: z.string().min(1, "TELEGRAM_API_ID is required"),
  TELEGRAM_API_HASH: z.string().min(1, "TELEGRAM_API_HASH is required"),
  TELEGRAM_SESSION: z.string().default(""), // empty until first login

  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_USER_CHAT_ID: z.string().min(1, "TELEGRAM_USER_CHAT_ID is required"),

  TELEGRAM_JOB_CHANNELS: z.string().min(1, "TELEGRAM_JOB_CHANNELS is required"),

  GMAIL_CLIENT_ID: z.string().default(""),
  GMAIL_CLIENT_SECRET: z.string().default(""),
  GMAIL_REDIRECT_URI: z.string().default(""),
  GMAIL_REFRESH_TOKEN: z.string().default(""),

  AI_PROVIDER: z.enum(["gemini", "openai", "openrouter", "groq", "nvidia"]).default("gemini"),
  AI_API_KEY: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),

  CV_PATH: z.string().default("./data/cv/my-cv.pdf"),
}).refine(
  (data) => {
    return !!(
      data.AI_API_KEY ||
      data.GEMINI_API_KEY ||
      data.OPENAI_API_KEY ||
      data.OPENROUTER_API_KEY ||
      data.GROQ_API_KEY ||
      data.NVIDIA_API_KEY
    );
  },
  {
    message:
      "At least one AI API key (AI_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, or NVIDIA_API_KEY) must be provided in .env.",
  }
);

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    // Deliberately does not print process.env or any value — only field names.
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export function getJobChannels(): string[] {
  return env.TELEGRAM_JOB_CHANNELS.split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}
