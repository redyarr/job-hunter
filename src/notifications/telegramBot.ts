import TelegramBot from "node-telegram-bot-api";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { prisma } from "@/database/client";
import { generateDraftForPost } from "@/applications/applicationService";

let bot: TelegramBot | null = null;

export function getBot(): TelegramBot {
  if (!bot) {
    bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });
    registerCallbackHandlers(bot);
    logger.info("Telegram bot started (polling)");
  }
  return bot;
}

function parseArray(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function bulletList(items: string[]): string {
  return items.length ? items.map((i) => `• ${i}`).join("\n") : "—";
}

/**
 * Sends a job match notification with APPLY / REJECT / VIEW ORIGINAL
 * buttons. Only ever sent to TELEGRAM_USER_CHAT_ID — this bot never
 * messages anyone else.
 */
export async function sendJobNotification(jobPostId: string): Promise<void> {
  const post = await prisma.jobPost.findUnique({
    where: { id: jobPostId },
    include: { analysis: true },
  });
  if (!post || !post.analysis) return;
  const a = post.analysis;

  const categories = parseArray(a.category).join(", ") || "Uncategorized";
  const whyMatches = bulletList(parseArray(a.whyItMatches));
  const missing = bulletList(parseArray(a.missingRequirements));
  const flags = parseArray(a.suspiciousFlags);

  const flagBanner = flags.length
    ? `\n\n🚩 *CAUTION — possible red flags:*\n${bulletList(flags)}`
    : "";

  const text =
    `🔥 *NEW JOB MATCH*\n\n` +
    `*${a.title ?? "Untitled role"}*\n\n` +
    `🏢 *Company:*\n${a.company ?? "Not specified"}\n\n` +
    `📍 *Location:*\n${a.location ?? "Not specified"} (${a.remoteStatus})\n\n` +
    `💼 *Category:*\n${categories}\n\n` +
    `🎯 *Match Score:*\n${a.matchScore ?? "?"}/100\n\n` +
    `💰 *Salary:*\n${a.salary ?? "Not specified"}\n\n` +
    `✅ *Why it matches:*\n${whyMatches}\n\n` +
    `⚠️ *Missing:*\n${missing}\n\n` +
    `📧 *Application:*\n${a.applicationEmail ?? "Not specified"}\n\n` +
    `🔗 *Link:*\n${a.applicationUrl ?? "Not specified"}\n\n` +
    `📢 *Source:*\n${post.telegramChannel}` +
    flagBanner;

  await getBot().sendMessage(env.TELEGRAM_USER_CHAT_ID, text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ APPLY", callback_data: `apply:${post.id}` },
          { text: "❌ REJECT", callback_data: `reject:${post.id}` },
        ],
        [{ text: "🔎 VIEW ORIGINAL", callback_data: `view:${post.id}` }],
      ],
    },
  });

  logger.info("Sent job notification", { jobPostId: post.id });
}

async function sendDraftForReview(applicationId: string): Promise<void> {
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) return;

  const text =
    `📝 *APPLICATION DRAFT*\n\n` +
    `*To:* ${app.recipientEmail ?? "No email found for this job"}\n\n` +
    `*Subject:* ${app.subject}\n\n` +
    `${app.emailBody}`;

  await getBot().sendMessage(env.TELEGRAM_USER_CHAT_ID, text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ CONFIRM SEND", callback_data: `confirm_send:${app.id}` },
          { text: "🚫 CANCEL", callback_data: `cancel:${app.id}` },
        ],
      ],
    },
  });
}

function registerCallbackHandlers(b: TelegramBot) {
  b.on("callback_query", async (query) => {
    const data = query.data ?? "";
    const [action, id] = data.split(":");

    try {
      if (action === "apply") {
        await b.answerCallbackQuery(query.id, { text: "Generating draft..." });
        const app = await generateDraftForPost(id);
        if (app) await sendDraftForReview(app.id);
      } else if (action === "reject") {
        await prisma.jobPost.update({ where: { id }, data: { status: "REJECTED_BY_USER" } });
        await b.answerCallbackQuery(query.id, { text: "Rejected" });
      } else if (action === "view") {
        const post = await prisma.jobPost.findUnique({ where: { id } });
        await b.answerCallbackQuery(query.id);
        if (post) {
          await b.sendMessage(env.TELEGRAM_USER_CHAT_ID, `📄 Original message:\n\n${post.originalText}`);
        }
      } else if (action === "confirm_send") {
        await b.answerCallbackQuery(query.id, { text: "Sending..." });
        const { confirmAndSend } = await import("@/applications/applicationService");
        const result = await confirmAndSend(id);
        await b.sendMessage(
          env.TELEGRAM_USER_CHAT_ID,
          result.success ? "✅ Application sent." : `❌ Send failed: ${result.error}`
        );
      } else if (action === "cancel") {
        await prisma.application.update({ where: { id }, data: { status: "CANCELLED" } });
        await b.answerCallbackQuery(query.id, { text: "Cancelled" });
      }
    } catch (err) {
      logger.error("Error handling callback", {
        action,
        error: err instanceof Error ? err.message : String(err),
      });
      await b.answerCallbackQuery(query.id, { text: "Something went wrong." });
    }
  });
}
