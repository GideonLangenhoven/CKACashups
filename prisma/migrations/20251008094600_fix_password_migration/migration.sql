-- Fix migration: Ensure password fields exist
-- This migration is idempotent and safe to run multiple times

-- Add password column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'User' AND column_name = 'password') THEN
        ALTER TABLE "User" ADD COLUMN "password" TEXT;
    END IF;
END $$;

-- Add needsPasswordReset column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'User' AND column_name = 'needsPasswordReset') THEN
        ALTER TABLE "User" ADD COLUMN "needsPasswordReset" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;
