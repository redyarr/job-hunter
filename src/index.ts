import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { startMonitoring, stopMonitoring } from "@/telegram/monitor";
import { analyzePendingPosts } from "@/jobs/analyzer";
import { getBot } from "@/notifications/telegramBot";

const ANALYSIS_POLL_INTERVAL_MS = 30_000;
let pollTimer: NodeJS.Timeout | null = null;

async function main() {
  logger.info("Starting job-hunter", { env: env.NODE_ENV });

  // Bot must be up first so notifications/callbacks work as soon as
  // analysis starts producing RELEVANT posts.
  getBot();

  await startMonitoring();

  // Start a simple HTTP server for Render health checks / keep-awake pings
  const port = process.env.PORT || 3000;
  const http = await import("http");
  http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Job Hunter is running.");
  }).listen(port, () => {
    logger.info(`HTTP health check server listening on port ${port}`);
  });

  pollTimer = setInterval(async () => {
    try {
      const count = await analyzePendingPosts();
      if (count > 0) logger.info("Analysis batch complete", { count });
    } catch (err) {
      logger.error("Analysis polling error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, ANALYSIS_POLL_INTERVAL_MS);
}

process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  if (pollTimer) clearInterval(pollTimer);
  await stopMonitoring();
  process.exit(0);
});

main().catch((err) => {
  logger.error("Fatal startup error", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
