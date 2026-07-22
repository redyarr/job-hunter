import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { env, getJobChannels } from "@/config/env";
import { logger } from "@/config/logger";
import { preFilter } from "@/jobs/preFilter";
import { isDuplicate, storeJobPost } from "@/jobs/jobPostService";

let client: TelegramClient | null = null;

export interface RawMessageData {
  channel: string;
  messageId: string;
  text: string;
  postedAt: Date;
  sourceUrl?: string;
}

/**
  * Processes a single raw message through deduplication, pre-filtering, and storage.
  */
export async function processAndStoreMessage(msg: RawMessageData): Promise<boolean> {
  if (!msg.text) {
    logger.debug("Skipping non-text message", { channel: msg.channel, messageId: msg.messageId });
    return false;
  }

  if (await isDuplicate(msg.channel, msg.messageId)) {
    logger.debug("Skipping duplicate message", { channel: msg.channel, messageId: msg.messageId });
    return false;
  }

  const filterResult = preFilter(msg.text);
  const status = filterResult.pass ? "NEW" : "FILTERED";

  await storeJobPost(msg, status);

  if (!filterResult.pass) {
    logger.debug("Message filtered before AI stage", {
      channel: msg.channel,
      messageId: msg.messageId,
      reason: filterResult.reason,
    });
  }

  return true;
}

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
 * Iterates through historical messages (since 2 days ago by default)
 * for each channel and processes un-ingested posts.
 */
export async function backfillToday(
  tgClient: TelegramClient,
  channels: string[],
  startDate?: Date
): Promise<{ processed: number; checked: number }> {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const startThreshold = startDate ?? twoDaysAgo;
  logger.info("Starting historical post backfill", {
    since: startThreshold.toISOString(),
    channels,
  });

  let totalChecked = 0;
  let totalProcessed = 0;

  for (const targetChannel of channels) {
    try {
      logger.info(`Backfilling channel: ${targetChannel}`);
      for await (const message of tgClient.iterMessages(targetChannel, { limit: 300 })) {
        const postedAt = message.date ? new Date(message.date * 1000) : new Date();

        // Messages are returned newest-first. Once we see a message older than startThreshold, stop.
        if (postedAt < startThreshold) {
          break;
        }

        totalChecked++;
        const chat = message.chat as { username?: string; title?: string; id?: unknown } | undefined;
        const channel = chat?.username ?? chat?.title ?? targetChannel.replace(/^@/, "");
        const messageId = String(message.id);
        const text = message.message ?? message.text ?? "";
        const sourceUrl = chat?.username
          ? `https://t.me/${chat.username}/${messageId}`
          : targetChannel.startsWith("@")
            ? `https://t.me/${targetChannel.replace(/^@/, "")}/${messageId}`
            : undefined;

        const stored = await processAndStoreMessage({
          channel,
          messageId,
          text,
          postedAt,
          sourceUrl,
        });

        if (stored) {
          totalProcessed++;
        }
      }
    } catch (err) {
      logger.error(`Error backfilling channel ${targetChannel}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info("Backfill complete", { totalChecked, totalProcessed });
  return { checked: totalChecked, processed: totalProcessed };
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

  try {
    await backfillToday(tgClient, channels);
  } catch (err) {
    logger.error("Error backfilling today's messages", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  tgClient.addEventHandler(async (event: NewMessageEvent) => {
    try {
      const raw = extractChannelInfo(event);
      await processAndStoreMessage(raw);
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

