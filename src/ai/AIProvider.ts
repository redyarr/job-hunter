import { Profile } from "@/profile/profile";
import { JobAnalysisResult, EmailDraft } from "@/ai/schemas";

export interface AIProvider {
  analyzeJob(rawText: string, profile: Profile): Promise<JobAnalysisResult>;
  generateApplicationEmail(
    analysis: JobAnalysisResult,
    profile: Profile
  ): Promise<EmailDraft>;
}
