import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

function getOAuthClient() {
  const client = new google.auth.OAuth2(
    env.GMAIL_CLIENT_ID,
    env.GMAIL_CLIENT_SECRET,
    env.GMAIL_REDIRECT_URI
  );
  client.setCredentials({ refresh_token: env.GMAIL_REFRESH_TOKEN });
  return client;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

interface SendArgs {
  to: string;
  subject: string;
  body: string;
  cvPath: string;
}

/**
 * Validates the CV exists and is readable, builds a multipart MIME
 * message with the attachment, and sends via Gmail API. Never called
 * except from the CONFIRM SEND callback path.
 */
export async function sendApplicationEmail(args: SendArgs): Promise<void> {
  const { to, subject, body, cvPath } = args;

  const resolvedPath = path.resolve(cvPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`CV not found at ${resolvedPath}`);
  }
  fs.accessSync(resolvedPath, fs.constants.R_OK); // throws if unreadable

  const cvBuffer = fs.readFileSync(resolvedPath);
  const cvFilename = path.basename(resolvedPath);
  const boundary = "job_hunter_boundary_" + Date.now();

  const mimeMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
    "",
    `--${boundary}`,
    `Content-Type: application/octet-stream; name="${cvFilename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${cvFilename}"`,
    "",
    cvBuffer.toString("base64"),
    "",
    `--${boundary}--`,
  ].join("\r\n");

  const auth = getOAuthClient();
  const gmail = google.gmail({ version: "v1", auth });

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: base64url(mimeMessage) },
  });

  logger.info("Application email sent", { to, subject });
}
