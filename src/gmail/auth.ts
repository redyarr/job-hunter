/**
 * One-time OAuth2 flow to get a Gmail refresh token, scoped to
 * gmail.send only (not full mailbox access). Run: npm run gmail:login
 *
 * Prints a URL to open in a browser, then a local server catches the
 * redirect and prints the refresh token to paste into .env.
 */
import "dotenv/config";
import { google } from "googleapis";
import * as http from "http";
import * as url from "url";

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

async function main() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || "http://localhost:3000/oauth2callback";

  if (!clientId || !clientSecret) {
    console.error(
      "GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env.\n" +
        "Create them in Google Cloud Console -> APIs & Services -> Credentials (OAuth client, Desktop or Web app)."
    );
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh token even on repeat runs
    scope: SCOPES,
  });

  console.log("\nOpen this URL in your browser and approve access:\n");
  console.log(authUrl, "\n");

  const port = Number(new url.URL(redirectUri).port) || 3000;

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new url.URL(req.url ?? "", redirectUri);
        const code = reqUrl.searchParams.get("code");
        if (!code) {
          res.end("No code received.");
          return;
        }
        const { tokens } = await oauth2Client.getToken(code);
        res.end("Success — you can close this tab and return to the terminal.");
        server.close();

        console.log("\nCopy this into .env as GMAIL_REFRESH_TOKEN:\n");
        console.log(tokens.refresh_token ?? "(no refresh token returned — try again with prompt=consent)");
        console.log(
          "\nThis token grants permission to send email as you. Do not share it or commit it.\n"
        );
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    server.listen(port, () => {
      console.log(`Waiting for redirect on port ${port}...`);
    });
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("Gmail auth failed:", err);
  process.exit(1);
});
