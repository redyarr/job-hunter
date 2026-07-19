import { describe, it, expect } from "vitest";
import { preFilter } from "../src/jobs/preFilter";

describe("preFilter", () => {
  it("rejects very short messages", () => {
    expect(preFilter("hi").pass).toBe(false);
  });

  it("rejects messages with no job signal words", () => {
    expect(
      preFilter(
        "Good morning everyone, hope you all have a wonderful and productive day ahead!"
      ).pass
    ).toBe(false);
  });

  it("rejects obvious crypto spam", () => {
    expect(
      preFilter(
        "Huge crypto giveaway today! Invest now and get guaranteed profit, click here to claim your reward."
      ).pass
    ).toBe(false);
  });

  it("passes a plausible English job post", () => {
    expect(
      preFilter(
        "We are hiring a Backend Developer (Node.js, Express, SQL) for a remote worldwide position. Apply by sending your CV to jobs@example.com"
      ).pass
    ).toBe(true);
  });

  it("passes a plausible Arabic job post", () => {
    expect(
      preFilter(
        "مطلوب مبرمج باك اند يجيد Node.js و SQL للعمل عن بعد، يرجى إرسال السيرة الذاتية"
      ).pass
    ).toBe(true);
  });
});
