import { AIProvider } from "@/ai/AIProvider";
import { Profile } from "@/profile/profile";
import { JobAnalysisResult, EmailDraft } from "@/ai/schemas";
import { logger } from "@/config/logger";

export class FallbackAIProvider implements AIProvider {
  constructor(private providers: { name: string; provider: AIProvider }[]) {}

  async analyzeJob(rawText: string, profile: Profile): Promise<JobAnalysisResult> {
    let lastError: unknown;
    for (const { name, provider } of this.providers) {
      try {
        logger.info(`Analyzing job post using AI provider: ${name}`);
        return await provider.analyzeJob(rawText, profile);
      } catch (err) {
        lastError = err;
        logger.warn(`AI provider "${name}" failed during analyzeJob, falling back to next...`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    throw new Error(
      `All configured AI providers failed to analyze job: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  async generateApplicationEmail(
    analysis: JobAnalysisResult,
    profile: Profile
  ): Promise<EmailDraft> {
    let lastError: unknown;
    for (const { name, provider } of this.providers) {
      try {
        logger.info(`Generating email draft using AI provider: ${name}`);
        return await provider.generateApplicationEmail(analysis, profile);
      } catch (err) {
        lastError = err;
        logger.warn(`AI provider "${name}" failed during generateApplicationEmail, falling back to next...`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    throw new Error(
      `All configured AI providers failed to generate email: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }
}
