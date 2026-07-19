/**
 * Cheap keyword pre-filter. Runs before any AI call.
 * Intentionally loose: false positives just cost one AI call,
 * false negatives lose a real job — so keep rejection conservative.
 */

const JOB_SIGNAL_WORDS = [
  // English
  "hiring", "vacancy", "vacancies", "job", "position", "apply",
  "cv", "resume", "recruit", "recruiting", "opportunity", "opening",
  "we are looking for", "join our team", "career",
  // Arabic
  "وظيفة", "وظائف", "مطلوب", "التوظيف",
  // Kurdish Sorani
  "ھەلی کار", "کارمەند", "داواکراوە",
];

const SPAM_PATTERNS = [
  /guaranteed profit/i,
  /crypto\s*(giveaway|airdrop)/i,
  /telegram\s*premium/i,
  /invest(ment)?\s*(now|today|opportunity)\b.*\bprofit/i,
  /click\s*here\s*to\s*claim/i,
];

const MIN_LENGTH = 40;

export interface PreFilterResult {
  pass: boolean;
  reason: string;
}

export function preFilter(text: string): PreFilterResult {
  const trimmed = text.trim();

  if (trimmed.length < MIN_LENGTH) {
    return { pass: false, reason: "too_short" };
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { pass: false, reason: "spam_pattern_match" };
    }
  }

  const lower = trimmed.toLowerCase();
  const hasSignal = JOB_SIGNAL_WORDS.some((word) =>
    lower.includes(word.toLowerCase())
  );

  if (!hasSignal) {
    return { pass: false, reason: "no_job_signal_words" };
  }

  return { pass: true, reason: "passed" };
}
