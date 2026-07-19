import { prisma } from "@/database/client";
import { logger } from "@/config/logger";

export interface IncomingMessage {
  channel: string;
  messageId: string;
  text: string;
  postedAt: Date;
  sourceUrl?: string;
}

/**
 * Returns true if this exact (channel, messageId) pair has already been
 * stored. This is the primary dedupe guard — cheap and exact.
 * Cross-channel "same job posted twice" duplicate detection (by company +
 * title similarity) is a JobAnalysis-stage concern, not here — we don't
 * know the job title until after AI analysis.
 */
export async function isDuplicate(channel: string, messageId: string): Promise<boolean> {
  const existing = await prisma.jobPost.findUnique({
    where: {
      telegramChannel_telegramMessageId: {
        telegramChannel: channel,
        telegramMessageId: messageId,
      },
    },
  });
  return existing !== null;
}

/**
 * Stores a new JobPost as status NEW (will pass pre-filter) or FILTERED
 * (pre-filter rejected it — kept for audit/tuning, never sent to AI).
 */
export async function storeJobPost(
  msg: IncomingMessage,
  status: "NEW" | "FILTERED"
) {
  try {
    const post = await prisma.jobPost.create({
      data: {
        telegramChannel: msg.channel,
        telegramMessageId: msg.messageId,
        originalText: msg.text,
        sourceUrl: msg.sourceUrl,
        postedAt: msg.postedAt,
        status,
      },
    });
    logger.info("Stored job post", { id: post.id, channel: msg.channel, status });
    return post;
  } catch (err) {
    // Unique constraint race (two near-simultaneous inserts) — treat as
    // duplicate rather than crashing the monitor loop.
    logger.warn("Failed to store job post (likely duplicate race)", {
      channel: msg.channel,
      messageId: msg.messageId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
