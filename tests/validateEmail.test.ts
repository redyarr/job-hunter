import { describe, it, expect } from "vitest";
import { isValidEmail } from "../src/applications/validateEmail";

describe("isValidEmail", () => {
  it("accepts a normal email", () => {
    expect(isValidEmail("jobs@example.com")).toBe(true);
  });

  it("rejects null (job post with no application email)", () => {
    expect(isValidEmail(null)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects malformed addresses", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing@domain")).toBe(false);
    expect(isValidEmail("@nodomain.com")).toBe(false);
  });
});
