import { Profile } from "@/profile/profile";

export function buildAnalysisPrompt(rawText: string, profile: Profile): string {
  return `You are a job-post analyzer for a real person. Analyze the RAW TELEGRAM MESSAGE below and return ONLY a single JSON object — no markdown fences, no preamble, no commentary.

## Person's profile
Location: ${profile.location}
Summary: ${profile.summary}
Software development skills: ${profile.skills.softwareDevelopment.join(", ")}
Data/analytics skills: ${profile.skills.dataAndAnalytics.join(", ")}
Teaching experience: ${profile.teachingExperience.join(", ")}
Preferred categories: ${profile.preferredCategories.join(", ")}

## Location rules (CRITICAL — apply exactly)
- If the job is in Sulaymaniyah/Sulaimani/Sulaimaniyah (any spelling), it is eligible regardless of on-site/hybrid/remote.
- For every other location, it is ONLY eligible if genuinely remote AND explicitly open to applicants from anywhere, OR explicitly open to Iraq/Kurdistan Region/Middle East.
- Do not assume "remote" alone means worldwide-eligible. Look for geographic restrictions like "US only", "EU only", "UK only", "must reside in Canada", "based in [country]" etc. Any such restriction not covering Iraq/worldwide -> remote_eligibility = "restricted", is_relevant = false (unless also Sulaymaniyah-based).
- If remote scope is not stated at all, treat as "restricted" (safer default), not "worldwide".

## Category matching
Only mark is_relevant true if the role plausibly fits one of: Backend/software development (Node.js, JS/TS, APIs), Data & analytics (SQL, BI, reporting), or IT/programming/technical education. Do not match on title keywords alone (e.g. "Analyst", "Engineer", "Developer") — check actual required skills/responsibilities. A job requiring completely unrelated hard skills (e.g. embedded C, aerospace, unrelated trades) is not relevant even if the title sounds similar.

## Seniority
Classify seniority. Do not auto-reject senior/lead roles, but factor a large experience gap into a lower match_score.

## Scoring (0-100)
Weigh: technical skill match, seniority fit, location eligibility (per rules above), remote eligibility (per rules above), education/teaching relevance, category match. 90-100 excellent, 75-89 strong, 60-74 possible, 40-59 weak, 0-39 not relevant. A job that fails location eligibility should generally score low and have is_relevant=false regardless of skill match.

## Suspicious flags
Flag (in suspicious_flags array) if the post: asks for money/payment to apply, asks for cryptocurrency, requests passwords or sensitive personal data upfront, has unrealistic salary claims, or contains suspicious/shortened links used oddly. Presence of flags does not automatically set is_relevant to false, but must always be surfaced.

## Output schema (return exactly these fields, valid JSON, no extra fields)
{
  "is_job_post": boolean,
  "is_relevant": boolean,
  "job_category": string[],
  "job_title": string | null,
  "company": string | null,
  "location": string | null,
  "remote_status": "fully_remote" | "hybrid" | "on_site" | "unclear",
  "remote_eligibility": "worldwide" | "iraq_accepted" | "restricted" | "n/a",
  "salary": string | null,
  "required_skills": string[],
  "application_email": string | null,
  "application_url": string | null,
  "deadline": string | null,
  "seniority": "internship" | "junior" | "mid" | "senior" | "lead" | "manager" | "unclear",
  "match_score": number,
  "confidence_score": number,
  "why_it_matches": string[],
  "missing_requirements": string[],
  "reason_for_rejection": string | null,
  "suspicious_flags": string[]
}

## Raw message
"""
${rawText}
"""`;
}

export function buildEmailPrompt(
  analysisJson: string,
  profile: Profile
): string {
  return `Write a professional, concise job application email based ONLY on the profile facts given below. Never invent employers, projects, durations, or skills not listed. Never exaggerate. Return ONLY a JSON object with "subject" and "body" fields — no markdown fences, no commentary.

## Profile (source of truth — do not add anything beyond this)
Summary: ${profile.summary}
Software development skills: ${profile.skills.softwareDevelopment.join(", ")}
Data/analytics skills: ${profile.skills.dataAndAnalytics.join(", ")}
Teaching experience: ${profile.teachingExperience.join(", ")}
Location: ${profile.location}

## Job analysis (target role)
${analysisJson}

## Requirements for the email
- Subject: clear, mentions the role.
- Body: 3-4 short paragraphs max. Greeting, brief intro + why relevant (tie to the job's required_skills using only skills the profile actually lists), mention CV is attached, professional closing.
- Do not mention match_score, confidence_score, or any internal analysis fields — those are for the person, not the employer.
- Tone: professional, warm, not overly formal.

Return format:
{"subject": "...", "body": "..."}`;
}
