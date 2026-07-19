/**
 * One-time interactive login for the personal Telegram account used to
 * READ job channels. Run with: npm run telegram:login
 *
 * This does NOT use the full env.ts validator, since at first-run time
 * TELEGRAM_SESSION and other fields legitimately don't exist yet — it
 * only needs API_ID/API_HASH.
 *
 * Prints a session string at the end. Paste it into .env as
 * TELEGRAM_SESSION. Treat that string like a password: it grants full
 * access to your Telegram account. Never commit it, never share it.
 */
import "dotenv/config";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import * as readline from "readline";

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

async function main() {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    console.error(
      "TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env before running login.\n" +
        "Get them from https://my.telegram.org"
    );
    process.exit(1);
  }

  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => ask("Phone number (with country code, e.g. +964...): "),
    password: async () => ask("2FA password (leave blank if none): "),
    phoneCode: async () => ask("Login code sent to Telegram: "),
    onError: (err) => console.error("Login error:", err.message),
  });

  console.log("\nLogin successful.\n");
  console.log("Copy this string into .env as TELEGRAM_SESSION:\n");
  console.log(client.session.save());
  console.log(
    "\nThis string is as sensitive as your Telegram password. Do not share it or commit it.\n"
  );

  await client.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Login failed:", err);
  process.exit(1);
});
