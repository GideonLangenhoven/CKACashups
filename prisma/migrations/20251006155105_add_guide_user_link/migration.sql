-- AlterTable
ALTER TABLE "Guide" ADD COLUMN "email" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "guideId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Guide_email_key" ON "Guide"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_guideId_key" ON "User"("guideId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;
