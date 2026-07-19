import { describe, it, expect } from "vitest";
import { jobAnalysisSchema } from "../src/ai/schemas";
import { extractJson } from "../src/ai/extractJson";

const baseValid = {
  is_job_post: true,
  is_relevant: true,
  job_category: ["Backend Development"],
  job_title: "Backend Developer",
  company: "Acme",
  location: "Remote",
  remote_status: "fully_remote",
  remote_eligibility: "worldwide",
  salary: "$2000/mo",
  required_skills: ["Node.js", "SQL"],
  application_email: "jobs@acme.com",
  application_url: null,
  deadline: null,
  seniority: "mid",
  match_score: 87,
  confidence_score: 90,
  why_it_matches: ["Node.js match"],
  missing_requirements: [],
  reason_for_rejection: null,
  suspicious_flags: [],
};

describe("jobAnalysisSchema", () => {
  it("accepts well-formed AI output", () => {
    const result = jobAnalysisSchema.parse(baseValid);
    expect(result.match_score).toBe(87);
  });

  it("rejects an out-of-range match_score", () => {
    expect(() => jobAnalysisSchema.parse({ ...baseValid, match_score: 150 })).toThrow();
  });

  it("rejects an invalid remote_eligibility enum value", () => {
    expect(() =>
      jobAnalysisSchema.parse({ ...baseValid, remote_eligibility: "sometimes" })
    ).toThrow();
  });

  it("fills in defaults for missing optional array fields", () => {
    const minimal = { is_job_post: true, is_relevant: false };
    const result = jobAnalysisSchema.parse(minimal);
    expect(result.job_category).toEqual([]);
    expect(result.suspicious_flags).toEqual([]);
    expect(result.remote_eligibility).toBe("n/a");
  });

  it("rejects output missing required boolean fields", () => {
    expect(() => jobAnalysisSchema.parse({ job_title: "X" })).toThrow();
  });
});

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it("strips markdown fences the model adds despite instructions", () => {
    expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("extracts JSON even with stray preamble text", () => {
    expect(extractJson('Here is the result:\n{"a": 1}\nHope that helps!')).toEqual({ a: 1 });
  });

  it("throws on genuinely invalid JSON (caller must handle safely)", () => {
    expect(() => extractJson("not json at all")).toThrow();
  });
});
