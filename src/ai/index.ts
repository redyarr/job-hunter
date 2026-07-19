import { env } from "@/config/env";
import { AIProvider } from "@/ai/AIProvider";
import { GeminiProvider } from "@/ai/GeminiProvider";
import { OpenAIProvider } from "@/ai/OpenAIProvider";
import { FallbackAIProvider } from "@/ai/FallbackAIProvider";

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const providers: { name: string; provider: AIProvider }[] = [];

  // 1. Add specific providers if their API keys are configured
  if (env.GEMINI_API_KEY) {
    providers.push({
      name: "Gemini",
      provider: new GeminiProvider(env.GEMINI_API_KEY),
    });
  }

  if (env.OPENROUTER_API_KEY) {
    providers.push({
      name: "OpenRouter",
      provider: new OpenAIProvider(
        env.OPENROUTER_API_KEY,
        "https://openrouter.ai/api/v1",
        process.env.OPENROUTER_MODEL || "openrouter/free"
      ),
    });
  }

  if (env.GROQ_API_KEY) {
    providers.push({
      name: "Groq",
      provider: new OpenAIProvider(
        env.GROQ_API_KEY,
        "https://api.groq.com/openai/v1",
        process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
      ),
    });
  }

  if (env.NVIDIA_API_KEY) {
    providers.push({
      name: "NVIDIA NIM",
      provider: new OpenAIProvider(
        env.NVIDIA_API_KEY,
        "https://integrate.api.nvidia.com/v1",
        process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct"
      ),
    });
  }

  if (env.OPENAI_API_KEY) {
    providers.push({
      name: "OpenAI",
      provider: new OpenAIProvider(env.OPENAI_API_KEY),
    });
  }

  // 2. Fallback to legacy single-provider config if set and not duplicate
  if (env.AI_API_KEY) {
    const isDuplicate =
      env.AI_API_KEY === env.GEMINI_API_KEY ||
      env.AI_API_KEY === env.OPENAI_API_KEY ||
      env.AI_API_KEY === env.OPENROUTER_API_KEY ||
      env.AI_API_KEY === env.GROQ_API_KEY ||
      env.AI_API_KEY === env.NVIDIA_API_KEY;

    if (!isDuplicate) {
      const name = `Legacy-${env.AI_PROVIDER}`;
      let provider: AIProvider;
      if (env.AI_PROVIDER === "openai") {
        provider = new OpenAIProvider(env.AI_API_KEY);
      } else if (env.AI_PROVIDER === "openrouter") {
        provider = new OpenAIProvider(
          env.AI_API_KEY,
          "https://openrouter.ai/api/v1",
          process.env.OPENROUTER_MODEL || "openrouter/free"
        );
      } else if (env.AI_PROVIDER === "groq") {
        provider = new OpenAIProvider(
          env.AI_API_KEY,
          "https://api.groq.com/openai/v1",
          process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
        );
      } else if (env.AI_PROVIDER === "nvidia") {
        provider = new OpenAIProvider(
          env.AI_API_KEY,
          "https://integrate.api.nvidia.com/v1",
          process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct"
        );
      } else {
        provider = new GeminiProvider(env.AI_API_KEY);
      }
      providers.push({ name, provider });
    }
  }

  if (providers.length === 0) {
    throw new Error("No AI API keys configured.");
  }

  cached = new FallbackAIProvider(providers);
  return cached;
}
