import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider } from "@/ai/AIProvider";
import { Profile } from "@/profile/profile";
import { jobAnalysisSchema, emailDraftSchema, JobAnalysisResult, EmailDraft } from "@/ai/schemas";
import { buildAnalysisPrompt, buildEmailPrompt } from "@/ai/prompts";
import { extractJson } from "@/ai/extractJson";
import { logger } from "@/config/logger";

const MODEL_NAME = "gemini-2.0-flash"; // fast + generous free tier

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private async callModel(prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
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

  /**
   * One retry on invalid JSON / schema failure, then throw. Callers
   * (the analyzer loop, application service) are responsible for marking
   * the record as failed and moving on rather than crashing the process.
   */
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
