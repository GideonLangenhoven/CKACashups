-- CreateTable (if not exists via DO block)
DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "used" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
    );
EXCEPTION
    WHEN duplicate_table THEN NULL;
END $$;

-- CreateIndex (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- AlterTable Trip - Add missing columns
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "tripReport" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "suggestions" TEXT;
