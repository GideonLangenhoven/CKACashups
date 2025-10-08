-- AlterEnum
ALTER TYPE "GuideRank" ADD VALUE 'TRAINEE';

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "tripLeaderId" TEXT;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_tripLeaderId_fkey" FOREIGN KEY ("tripLeaderId") REFERENCES "Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;
