import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { env, getJobChannels } from "@/config/env";
import { logger } from "@/config/logger";
import { preFilter } from "@/jobs/preFilter";
import { isDuplicate, storeJobPost } from "@/jobs/jobPostService";

let client: TelegramClient | null = null;

/**
 * Connects the personal-account Telegram client using the saved session
 * string. Throws with a clear message if no session exists yet — run
 * `npm run telegram:login` first.
 */
export async function connectTelegramClient(): Promise<TelegramClient> {
  if (!env.TELEGRAM_SESSION) {
    throw new Error(
      "No TELEGRAM_SESSION found in .env. Run `npm run telegram:login` first, " +
        "then paste the printed session string into .env."
    );
  }

  const apiId = Number(env.TELEGRAM_API_ID);
  const session = new StringSession(env.TELEGRAM_SESSION);

  client = new TelegramClient(session, apiId, env.TELEGRAM_API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  logger.info("Telegram client connected");
  return client;
}

/**
 * Extracts a stable channel identifier and message id from a GramJS event.
 * Falls back gracefully if fields are missing (e.g. non-channel messages).
 */
function extractChannelInfo(event: NewMessageEvent) {
  const message = event.message;
  const chat = message.chat as { username?: string; title?: string; id?: unknown } | undefined;
  const channel = chat?.username ?? chat?.title ?? String(chat?.id ?? "unknown");
  const messageId = String(message.id);
  const text = message.message ?? "";
  const postedAt = message.date ? new Date(message.date * 1000) : new Date();
  const sourceUrl = chat?.username
    ? `https://t.me/${chat.username}/${messageId}`
    : undefined;
  return { channel, messageId, text, postedAt, sourceUrl };
}

/**
 * Registers the message handler and starts listening to the configured
 * channels. Each incoming message: dedupe check -> pre-filter -> store.
 * AI analysis (Phase 4) will pick up rows with status NEW separately —
 * this module's only job is reliable capture.
 */
export async function startMonitoring() {
  const tgClient = client ?? (await connectTelegramClient());
  const channels = getJobChannels();

  if (channels.length === 0) {
    throw new Error("TELEGRAM_JOB_CHANNELS is empty — nothing to monitor.");
  }

  logger.info("Starting channel monitor", { channels });

  tgClient.addEventHandler(async (event: NewMessageEvent) => {
    try {
      const { channel, messageId, text, postedAt, sourceUrl } = extractChannelInfo(event);

      if (!text) {
        // MVP: text-only. Images/documents logged and skipped, not lost —
        // OCR pipeline can be added later without changing this contract.
        logger.debug("Skipping non-text message", { channel, messageId });
        return;
      }

      if (await isDuplicate(channel, messageId)) {
        logger.debug("Skipping duplicate message", { channel, messageId });
        return;
      }

      const filterResult = preFilter(text);
      const status = filterResult.pass ? "NEW" : "FILTERED";

      await storeJobPost({ channel, messageId, text, postedAt, sourceUrl }, status);

      if (!filterResult.pass) {
        logger.debug("Message filtered before AI stage", {
          channel,
          messageId,
          reason: filterResult.reason,
        });
      }
    } catch (err) {
      // A single bad message must never kill the monitor loop.
      logger.error("Error handling incoming message", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, new NewMessage({ chats: channels }));

  logger.info("Channel monitor active");
}

export async function stopMonitoring() {
  if (client) {
    await client.disconnect();
    logger.info("Telegram client disconnected");
  }
}
