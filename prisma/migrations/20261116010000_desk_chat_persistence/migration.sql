-- Desk externo: conversas persistidas (arquivo, não delete) + transferências

CREATE TYPE "DeskThreadStatus" AS ENUM ('OPEN', 'WAITING', 'CLOSED');
CREATE TYPE "DeskReviewStatus" AS ENUM ('PENDING', 'REPORT_SENT', 'CLOSED');
CREATE TYPE "DeskMessageRole" AS ENUM ('CLIENT', 'CONSULTANT', 'SYSTEM');

CREATE TABLE "DeskReview" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "clientLabel" TEXT NOT NULL,
    "seasonName" TEXT,
    "status" "DeskReviewStatus" NOT NULL DEFAULT 'PENDING',
    "autoReport" JSONB NOT NULL,
    "assignedConsultantId" TEXT,
    "reportSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeskReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeskThread" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "clientLabel" TEXT NOT NULL,
    "status" "DeskThreadStatus" NOT NULL DEFAULT 'OPEN',
    "assignedConsultantId" TEXT,
    "unreadForConsultant" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeskThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeskMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" "DeskMessageRole" NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "externalLinks" JSONB,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeskMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeskThreadTransfer" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "fromConsultantId" TEXT,
    "toConsultantId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeskThreadTransfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeskReview_status_createdAt_idx" ON "DeskReview"("status", "createdAt");
CREATE INDEX "DeskReview_assignedConsultantId_idx" ON "DeskReview"("assignedConsultantId");

CREATE UNIQUE INDEX "DeskThread_reviewId_key" ON "DeskThread"("reviewId");
CREATE INDEX "DeskThread_assignedConsultantId_archivedAt_idx" ON "DeskThread"("assignedConsultantId", "archivedAt");
CREATE INDEX "DeskThread_status_archivedAt_idx" ON "DeskThread"("status", "archivedAt");
CREATE INDEX "DeskThread_unreadForConsultant_archivedAt_idx" ON "DeskThread"("unreadForConsultant", "archivedAt");

CREATE INDEX "DeskMessage_threadId_createdAt_idx" ON "DeskMessage"("threadId", "createdAt");

CREATE INDEX "DeskThreadTransfer_threadId_createdAt_idx" ON "DeskThreadTransfer"("threadId", "createdAt");
CREATE INDEX "DeskThreadTransfer_toConsultantId_idx" ON "DeskThreadTransfer"("toConsultantId");

ALTER TABLE "DeskReview" ADD CONSTRAINT "DeskReview_assignedConsultantId_fkey" FOREIGN KEY ("assignedConsultantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeskThread" ADD CONSTRAINT "DeskThread_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "DeskReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeskThread" ADD CONSTRAINT "DeskThread_assignedConsultantId_fkey" FOREIGN KEY ("assignedConsultantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeskMessage" ADD CONSTRAINT "DeskMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DeskThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeskMessage" ADD CONSTRAINT "DeskMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeskThreadTransfer" ADD CONSTRAINT "DeskThreadTransfer_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DeskThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeskThreadTransfer" ADD CONSTRAINT "DeskThreadTransfer_fromConsultantId_fkey" FOREIGN KEY ("fromConsultantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeskThreadTransfer" ADD CONSTRAINT "DeskThreadTransfer_toConsultantId_fkey" FOREIGN KEY ("toConsultantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data API deny-all (mesmo padrão das demais tabelas da app)
ALTER TABLE "DeskReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeskThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeskMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeskThreadTransfer" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "DeskReview" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "DeskThread" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "DeskMessage" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "DeskThreadTransfer" FROM anon, authenticated, PUBLIC;
