import { prisma } from "@/database/client";
import { logger } from "@/config/logger";
import { getAIProvider } from "@/ai";
import { profile } from "@/profile/profile";
import { sendApplicationEmail } from "@/gmail/gmailClient";
import * as fs from "fs";
import * as path from "path";
import { isValidEmail } from "@/applications/validateEmail";

/**
 * Triggered by APPLY. Generates the email draft via AI and creates the
 * Application row in WAITING_FOR_APPROVAL -> DRAFT_GENERATED. Does NOT
 * send anything — sending only happens in confirmAndSend, gated on an
 * explicit CONFIRM SEND callback.
 */
export async function generateDraftForPost(jobPostId: string) {
  const post = await prisma.jobPost.findUnique({
    where: { id: jobPostId },
    include: { analysis: true },
  });
  if (!post || !post.analysis) {
    logger.warn("Cannot generate draft: no analysis found", { jobPostId });
    return null;
  }

  const existing = await prisma.application.findUnique({ where: { jobPostId } });
  if (existing) return existing; // idempotent — don't regenerate on double-tap

  const application = await prisma.application.create({
    data: {
      jobPostId,
      status: "WAITING_FOR_APPROVAL",
      recipientEmail: post.analysis.applicationEmail,
      cvPath: profile.cvPath,
    },
  });

  try {
    const ai = getAIProvider();
    const analysisForPrompt = {
      is_job_post: post.analysis.isJobPost,
      is_relevant: post.analysis.isRelevant,
      job_category: JSON.parse(post.analysis.category || "[]"),
      job_title: post.analysis.title,
      company: post.analysis.company,
      location: post.analysis.location,
      remote_status: post.analysis.remoteStatus,
      remote_eligibility: post.analysis.remoteEligibility,
      salary: post.analysis.salary,
      required_skills: JSON.parse(post.analysis.requiredSkills || "[]"),
      application_email: post.analysis.applicationEmail,
      application_url: post.analysis.applicationUrl,
      deadline: post.analysis.deadline,
      seniority: "unclear" as const,
      match_score: post.analysis.matchScore ?? 0,
      confidence_score: post.analysis.confidenceScore ?? 0,
      why_it_matches: JSON.parse(post.analysis.whyItMatches || "[]"),
      missing_requirements: JSON.parse(post.analysis.missingRequirements || "[]"),
      reason_for_rejection: post.analysis.rejectionReason,
      suspicious_flags: JSON.parse(post.analysis.suspiciousFlags || "[]"),
    };

    const draft = await ai.generateApplicationEmail(analysisForPrompt, profile);

    return await prisma.application.update({
      where: { id: application.id },
      data: {
        status: "DRAFT_GENERATED",
        subject: draft.subject,
        emailBody: draft.body,
      },
    });
  } catch (err) {
    logger.error("Draft generation failed", {
      jobPostId,
      error: err instanceof Error ? err.message : String(err),
    });
    return await prisma.application.update({
      where: { id: application.id },
      data: { status: "FAILED", errorMessage: "Draft generation failed" },
    });
  }
}

/**
 * The ONLY function in the codebase allowed to call sendApplicationEmail.
 * Only reachable from the CONFIRM SEND Telegram callback. Re-validates
 * everything before sending, since state may have changed since the
 * draft was generated (e.g. CV moved, email edited to something invalid).
 */
export async function confirmAndSend(
  applicationId: string
): Promise<{ success: boolean; error?: string }> {
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) return { success: false, error: "Application not found" };
  if (app.status !== "DRAFT_GENERATED") {
    return { success: false, error: `Cannot send from status ${app.status}` };
  }

  await prisma.application.update({
    where: { id: app.id },
    data: { status: "WAITING_FOR_FINAL_CONFIRMATION" },
  });

  if (!isValidEmail(app.recipientEmail)) {
    const msg = "No valid recipient email for this job";
    await prisma.application.update({
      where: { id: app.id },
      data: { status: "FAILED", errorMessage: msg },
    });
    return { success: false, error: msg };
  }

  const cvPath = app.cvPath ?? profile.cvPath;
  const resolved = path.resolve(cvPath);
  if (!fs.existsSync(resolved)) {
    const msg = `CV not found at ${resolved}`;
    await prisma.application.update({
      where: { id: app.id },
      data: { status: "FAILED", errorMessage: msg },
    });
    return { success: false, error: msg };
  }

  try {
    await sendApplicationEmail({
      to: app.recipientEmail,
      subject: app.subject ?? "Job Application",
      body: app.emailBody ?? "",
      cvPath,
    });
    await prisma.application.update({
      where: { id: app.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.application.update({
      where: { id: app.id },
      data: { status: "FAILED", errorMessage: msg },
    });
    return { success: false, error: msg };
  }
}
