import { describe, it, expect, vi, beforeEach } from "vitest";
import { backfillToday, processAndStoreMessage } from "../src/telegram/monitor";
import * as jobPostService from "../src/jobs/jobPostService";

vi.mock("../src/jobs/jobPostService", () => ({
  isDuplicate: vi.fn(),
  storeJobPost: vi.fn(),
}));

describe("backfillToday", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips non-text and duplicate messages", async () => {
    vi.mocked(jobPostService.isDuplicate).mockResolvedValue(true);

    const result = await processAndStoreMessage({
      channel: "testchannel",
      messageId: "100",
      text: "We are hiring a Remote Fullstack Developer (Node.js/React)",
      postedAt: new Date(),
    });

    expect(result).toBe(false);
    expect(jobPostService.storeJobPost).not.toHaveBeenCalled();
  });

  it("stores new valid non-duplicate messages", async () => {
    vi.mocked(jobPostService.isDuplicate).mockResolvedValue(false);

    const result = await processAndStoreMessage({
      channel: "testchannel",
      messageId: "101",
      text: "We are hiring a Remote Fullstack Developer (Node.js/React). Send CV to jobs@company.com",
      postedAt: new Date(),
    });

    expect(result).toBe(true);
    expect(jobPostService.storeJobPost).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "testchannel", messageId: "101" }),
      "NEW"
    );
  });

  it("stops iteration when reaching messages older than startDate threshold", async () => {
    vi.mocked(jobPostService.isDuplicate).mockResolvedValue(false);

    const now = new Date();
    const startThreshold = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const olderTime = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago (older than threshold)

    const mockMessages = [
      {
        id: 200,
        date: Math.floor(now.getTime() / 1000),
        message: "Hiring Senior Backend Engineer Remote. Apply now with CV.",
        chat: { username: "jobschannel" },
      },
      {
        id: 199,
        date: Math.floor(olderTime.getTime() / 1000),
        message: "Hiring Frontend Engineer Remote. Apply now with CV.",
        chat: { username: "jobschannel" },
      },
    ];

    const mockTgClient = {
      iterMessages: vi.fn().mockImplementation(async function* () {
        for (const msg of mockMessages) {
          yield msg;
        }
      }),
    } as any;

    const result = await backfillToday(mockTgClient, ["jobschannel"], startThreshold);

    expect(result.checked).toBe(1);
    expect(result.processed).toBe(1);
    expect(jobPostService.storeJobPost).toHaveBeenCalledTimes(1);
  });
});
