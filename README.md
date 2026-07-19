# Job Hunter

Personal AI-powered job-hunting assistant. Monitors Telegram job channels,
filters and scores posts against your profile, and — only with your explicit
confirmation at each step — drafts and sends application emails via Gmail.

Nothing is ever applied to automatically. See `docs` in the project chat
history for the full architecture writeup.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run db:generate
npx prisma migrate dev --name init
npm run test            # sanity check the pre-filter
```

### Getting credentials (all free)

- **Telegram API ID/Hash**: https://my.telegram.org → API development tools
- **Telegram Bot Token**: message @BotFather, `/newbot`
- **Your Telegram chat ID**: message @userinfobot
- **Gmail OAuth**: Google Cloud Console → create project → enable Gmail API →
  OAuth consent screen (internal/testing is fine) → OAuth client (Desktop app)
- **AI API key**: https://aistudio.google.com — free tier, set `AI_PROVIDER=gemini`

Put your CV at the path set in `CV_PATH` (default `./data/cv/my-cv.pdf`).

## Status

All phases (2-7) implemented and typechecked clean:

- **Telegram monitoring** — personal-account client reads configured channels,
  dedupes, runs the keyword pre-filter, stores posts.
- **AI analysis** — Gemini (free tier, default) or OpenAI via one interface,
  strict Zod schema validation on all AI output, location/remote-eligibility
  rules and scoring rubric baked into the prompt.
- **Telegram bot notifications** — APPLY / REJECT / VIEW ORIGINAL buttons on
  every relevant match.
- **Approval workflow** — APPLY generates an AI email draft from your
  `profile.ts` (never invents experience) and sends it back to you as
  CONFIRM SEND / CANCEL. Nothing reaches Gmail without that explicit tap.
- **Gmail sending** — OAuth2, `gmail.send` scope only, CV existence/
  readability re-validated at send time, MIME attachment built manually
  (no extra paid libraries).
- **Tests** — 18 passing: pre-filter (English/Arabic/spam), AI-output schema
  validation (valid/invalid/malformed JSON), email validation.

### What to verify on your machine (not runnable in this sandbox)

- `npm run db:generate && npx prisma migrate dev --name init` — Prisma's
  engine binary download is blocked by this sandbox's network allowlist;
  works normally with regular internet access.
- `npm run telegram:login` then `npm run gmail:login` — both are
  interactive (phone code / browser OAuth), can't run headlessly here.
- End-to-end run against real channels — needs your live API keys.

### Manual test scenarios worth running once live (from the original spec)

Relevant job · irrelevant job · Sulaymaniyah on-site · Sulaymaniyah hybrid ·
Erbil on-site (should reject — not remote) · Erbil hybrid (should reject) ·
worldwide remote (should accept) · US-only remote (should reject) ·
EU-only remote (should reject) · duplicate post across two channels ·
job with no application email (draft should surface this) · scam-looking
post (should show the 🚩 caution banner) · a deliberately malformed AI
response (retry logic + `ANALYSIS_FAILED` status should kick in).
