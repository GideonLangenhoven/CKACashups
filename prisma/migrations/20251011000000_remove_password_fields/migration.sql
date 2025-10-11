-- AlterTable: Remove password-related columns from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";
ALTER TABLE "User" DROP COLUMN IF EXISTS "needsPasswordReset";

-- DropTable: Remove PasswordResetToken table
DROP TABLE IF EXISTS "PasswordResetToken";
