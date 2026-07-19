-- CreateTable
CREATE TABLE "JobPost" (
    "id" TEXT NOT NULL,
    "telegramChannel" TEXT NOT NULL,
    "telegramMessageId" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "postedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAnalysis" (
    "id" TEXT NOT NULL,
    "jobPostId" TEXT NOT NULL,
    "isJobPost" BOOLEAN NOT NULL,
    "isRelevant" BOOLEAN NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "location" TEXT,
    "remoteStatus" TEXT,
    "remoteEligibility" TEXT,
    "salary" TEXT,
    "requiredSkills" TEXT,
    "applicationEmail" TEXT,
    "applicationUrl" TEXT,
    "deadline" TEXT,
    "matchScore" INTEGER,
    "confidenceScore" INTEGER,
    "whyItMatches" TEXT,
    "missingRequirements" TEXT,
    "rejectionReason" TEXT,
    "suspiciousFlags" TEXT,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "jobPostId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING_FOR_APPROVAL',
    "recipientEmail" TEXT,
    "subject" TEXT,
    "emailBody" TEXT,
    "cvPath" TEXT,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobPost_status_idx" ON "JobPost"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JobPost_telegramChannel_telegramMessageId_key" ON "JobPost"("telegramChannel", "telegramMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "JobAnalysis_jobPostId_key" ON "JobAnalysis"("jobPostId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobPostId_key" ON "Application"("jobPostId");

-- AddForeignKey
ALTER TABLE "JobAnalysis" ADD CONSTRAINT "JobAnalysis_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "JobPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "JobPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
