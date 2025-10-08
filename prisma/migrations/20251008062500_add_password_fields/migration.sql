-- AlterTable
ALTER TABLE "User" ADD COLUMN "password" TEXT;
ALTER TABLE "User" ADD COLUMN "needsPasswordReset" BOOLEAN NOT NULL DEFAULT true;
