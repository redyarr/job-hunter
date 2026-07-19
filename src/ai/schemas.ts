import { z } from "zod";

/**
 * This is the trust boundary: job post text is untrusted (written by
 * strangers on the internet) and AI output built from it is also
 * untrusted. Nothing downstream should consume AI output that hasn't
 * passed this schema.
 */
export const jobAnalysisSchema = z.object({
  is_job_post: z.boolean(),
  is_relevant: z.boolean(),
  job_category: z.array(z.string()).default([]),
  job_title: z.string().nullable().default(null),
  company: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  remote_status: z
    .enum(["fully_remote", "hybrid", "on_site", "unclear"])
    .default("unclear"),
  remote_eligibility: z
    .enum(["worldwide", "iraq_accepted", "restricted", "n/a"])
    .default("n/a"),
  salary: z.string().nullable().default(null),
  required_skills: z.array(z.string()).default([]),
  application_email: z.string().nullable().default(null),
  application_url: z.string().nullable().default(null),
  deadline: z.string().nullable().default(null),
  seniority: z
    .enum(["internship", "junior", "mid", "senior", "lead", "manager", "unclear"])
    .default("unclear"),
  match_score: z.number().min(0).max(100).default(0),
  confidence_score: z.number().min(0).max(100).default(0),
  why_it_matches: z.array(z.string()).default([]),
  missing_requirements: z.array(z.string()).default([]),
  reason_for_rejection: z.string().nullable().default(null),
  suspicious_flags: z.array(z.string()).default([]),
});

export type JobAnalysisResult = z.infer<typeof jobAnalysisSchema>;

export const emailDraftSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

export type EmailDraft = z.infer<typeof emailDraftSchema>;
