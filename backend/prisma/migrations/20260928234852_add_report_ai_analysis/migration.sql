-- CreateEnum
CREATE TYPE "AiPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "ReportAiAnalysis" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "problemType" TEXT NOT NULL,
    "problemLabel" TEXT NOT NULL,
    "priority" "AiPriority" NOT NULL,
    "detectionConfidence" DOUBLE PRECISION NOT NULL,
    "categoryMatchConfidence" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "suggestedCategoryId" TEXT NOT NULL,
    "suggestedCategoryName" TEXT NOT NULL,
    "suggestedDepartmentId" TEXT,
    "suggestedDepartmentName" TEXT,
    "selectedCategoryIdAtSubmission" TEXT NOT NULL,
    "selectedCategoryNameAtSubmission" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "classificationMode" TEXT NOT NULL,
    "suggestionAcceptedAtSubmission" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportAiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportAiAnalysis_reportId_key" ON "ReportAiAnalysis"("reportId");

-- CreateIndex
CREATE INDEX "ReportAiAnalysis_suggestedCategoryId_idx" ON "ReportAiAnalysis"("suggestedCategoryId");

-- CreateIndex
CREATE INDEX "ReportAiAnalysis_classificationMode_idx" ON "ReportAiAnalysis"("classificationMode");

-- CreateIndex
CREATE INDEX "ReportAiAnalysis_priority_idx" ON "ReportAiAnalysis"("priority");

-- AddForeignKey
ALTER TABLE "ReportAiAnalysis" ADD CONSTRAINT "ReportAiAnalysis_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
