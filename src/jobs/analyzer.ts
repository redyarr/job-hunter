import { prisma } from "@/database/client";
import { logger } from "@/config/logger";
import { getAIProvider } from "@/ai";
import { profile } from "@/profile/profile";
import { JobAnalysisResult } from "@/ai/schemas";

/**
 * Processes a single JobPost: NEW -> ANALYZING -> RELEVANT | REJECTED_BY_AI | ANALYSIS_FAILED.
 * A failure here never throws out of this function — it's caught, logged,
 * and the post is marked so the loop can continue with the next one.
 */
export async function analyzeOnePost(postId: string): Promise<void> {
  const post = await prisma.jobPost.findUnique({ where: { id: postId } });
  if (!post || post.status !== "NEW") return;

  await prisma.jobPost.update({ where: { id: post.id }, data: { status: "ANALYZING" } });

  const ai = getAIProvider();

  let result: JobAnalysisResult;
  try {
    result = await ai.analyzeJob(post.originalText, profile);
  } catch (err) {
    logger.error("AI analysis failed, skipping post", {
      postId: post.id,
      error: err instanceof Error ? err.message : String(err),
    });
    await prisma.jobPost.update({
      where: { id: post.id },
      data: { status: "ANALYSIS_FAILED", processedAt: new Date() },
    });
    return;
  }

  const finalStatus = result.is_job_post && result.is_relevant ? "RELEVANT" : "REJECTED_BY_AI";

  await prisma.jobAnalysis.create({
    data: {
      jobPostId: post.id,
      isJobPost: result.is_job_post,
      isRelevant: result.is_relevant,
      category: JSON.stringify(result.job_category),
      title: result.job_title,
      company: result.company,
      location: result.location,
      remoteStatus: result.remote_status,
      remoteEligibility: result.remote_eligibility,
      salary: result.salary,
      requiredSkills: JSON.stringify(result.required_skills),
      applicationEmail: result.application_email,
      applicationUrl: result.application_url,
      deadline: result.deadline,
      matchScore: result.match_score,
      confidenceScore: result.confidence_score,
      whyItMatches: JSON.stringify(result.why_it_matches),
      missingRequirements: JSON.stringify(result.missing_requirements),
      rejectionReason: result.reason_for_rejection,
      suspiciousFlags: JSON.stringify(result.suspicious_flags),
    },
  });

  await prisma.jobPost.update({
    where: { id: post.id },
    data: { status: finalStatus, processedAt: new Date() },
  });

  logger.info("Analyzed job post", {
    postId: post.id,
    status: finalStatus,
    matchScore: result.match_score,
    title: result.job_title,
  });

  if (finalStatus === "RELEVANT") {
    // Lazy import avoids a hard dependency between the analyzer and the
    // Telegram bot for callers (e.g. tests) that only care about analysis.
    const { sendJobNotification } = await import("@/notifications/telegramBot");
    try {
      await sendJobNotification(post.id);
    } catch (err) {
      logger.error("Failed to send job notification", {
        postId: post.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * Polls for NEW posts and analyzes them one at a time (sequential, not
 * parallel — respects free-tier rate limits). Call on an interval from
 * the main process.
 */
export async function analyzePendingPosts(): Promise<number> {
  const pending = await prisma.jobPost.findMany({
    where: { status: "NEW" },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  for (const post of pending) {
    await analyzeOnePost(post.id);
  }

  return pending.length;
}
