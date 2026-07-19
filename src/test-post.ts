import "dotenv/config";
import { prisma } from "@/database/client";
import { logger } from "@/config/logger";

const SCENARIOS = {
  relevant: {
    channel: "test_jobs_channel",
    text: `🔥 WE ARE HIRING! 🔥
Position: Backend Developer (Node.js / TypeScript)
Company: SuliTech Solutions
Location: Sulaymaniyah, Kurdistan Region, Iraq
Job Type: Full-time / Hybrid

Requirements:
- Strong experience with Node.js and REST APIs.
- Proficient in TypeScript and writing SQL queries.
- Familiarity with React is a plus.

How to apply:
Send your CV to: recruitment@sulitechsolutions.com with subject "Backend Developer Application".`,
  },
  irrelevant: {
    channel: "test_jobs_channel",
    text: `Hiring: Senior Embedded Software Engineer
Company: AeroDynamics Ltd
Location: Erbil (On-site only)

We are looking for a senior engineer with 8+ years of experience in embedded systems, writing aerospace flight control software in C/C++ and assembly. Must have hardware debugging experience.

Apply via link: https://aerodynamics.com/careers/jobs-10293`,
  },
  scam: {
    channel: "test_jobs_channel",
    text: `URGENT WORK FROM HOME OPPORTUNITY! 💸 
Make $500/day copy-pasting links. No experience required. 

To secure your interview slot and register for training, a registration fee of 0.005 BTC or $50 USDT must be paid to our company wallet: USDT-TRC20: TX9218...

Message @EasyMoneyRecruiter now!`,
  },
};

async function main() {
  const arg = (process.argv[2] || "relevant").toLowerCase();
  
  if (!(arg in SCENARIOS)) {
    console.error(`Unknown scenario: "${arg}". Use: relevant, irrelevant, or scam.`);
    process.exit(1);
  }

  const scenario = SCENARIOS[arg as keyof typeof SCENARIOS];
  const messageId = `mock_msg_${Date.now()}`;

  console.log(`Injecting "${arg}" mock job post...`);

  const jobPost = await prisma.jobPost.create({
    data: {
      telegramChannel: scenario.channel,
      telegramMessageId: messageId,
      originalText: scenario.text,
      status: "NEW",
      sourceUrl: `https://t.me/${scenario.channel}/${messageId}`,
      postedAt: new Date(),
    },
  });

  console.log(`\nSuccess! Created JobPost in DB with ID: ${jobPost.id}`);
  console.log("----------------------------------------------------------------");
  console.log(`Channel: ${jobPost.telegramChannel}`);
  console.log(`Status:  ${jobPost.status}`);
  console.log(`Text:\n${jobPost.originalText}`);
  console.log("----------------------------------------------------------------");
  console.log("\nIf your 'npm run dev' app is running, it will pick this up in its next 30-second polling cycle.");
  console.log("Check your terminal logs and your Telegram bot chat!");
}

main()
  .catch((err) => {
    console.error("Failed to inject mock job post:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
