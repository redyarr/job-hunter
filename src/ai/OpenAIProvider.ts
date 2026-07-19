import OpenAI from "openai";
import { AIProvider } from "@/ai/AIProvider";
import { Profile } from "@/profile/profile";
import { jobAnalysisSchema, emailDraftSchema, JobAnalysisResult, EmailDraft } from "@/ai/schemas";
import { buildAnalysisPrompt, buildEmailPrompt } from "@/ai/prompts";
import { extractJson } from "@/ai/extractJson";
import { logger } from "@/config/logger";

const MODEL_NAME = "gpt-4o-mini";

/**
 * Kept for provider-abstraction completeness. Not the default — OpenAI's
 * API has no meaningful free tier, only a small one-time trial credit for
 * new accounts. Switch to this by setting AI_PROVIDER=openai if you ever
 * want to (e.g. you have spare credits or prefer it), no other code changes
 * needed.
 */
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private modelName: string;

  constructor(apiKey: string, baseURL?: string, modelName: string = "gpt-4o-mini") {
    this.client = new OpenAI({ apiKey, baseURL });
    this.modelName = modelName;
  }

  private async callModel(prompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    return completion.choices[0]?.message?.content ?? "";
  }

  async analyzeJob(rawText: string, profile: Profile): Promise<JobAnalysisResult> {
    const prompt = buildAnalysisPrompt(rawText, profile);
    return this.runWithRetry(prompt, jobAnalysisSchema, "analyzeJob");
  }

  async generateApplicationEmail(
    analysis: JobAnalysisResult,
    profile: Profile
  ): Promise<EmailDraft> {
    const prompt = buildEmailPrompt(JSON.stringify(analysis), profile);
    return this.runWithRetry(prompt, emailDraftSchema, "generateApplicationEmail");
  }

  private async runWithRetry<T>(
    prompt: string,
    schema: { parse: (v: unknown) => T },
    label: string
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const raw = await this.callModel(prompt);
        const parsed = extractJson(raw);
        return schema.parse(parsed);
      } catch (err) {
        lastError = err;
        logger.warn(`${label}: attempt ${attempt} failed`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    throw new Error(
      `${label} failed after retries: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }
}
