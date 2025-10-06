-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "GuideRank" AS ENUM ('SENIOR', 'INTERMEDIATE', 'JUNIOR');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('PER_TRIP', 'PER_PAX');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" "GuideRank" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeRate" (
    "id" TEXT NOT NULL,
    "rank" "GuideRank" NOT NULL,
    "rateType" "RateType" NOT NULL DEFAULT 'PER_TRIP',
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "FeeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "tripDate" TIMESTAMP(3) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "leadName" TEXT NOT NULL,
    "paxGuideNote" TEXT,
    "totalPax" INTEGER NOT NULL,
    "paymentsMadeYN" BOOLEAN NOT NULL DEFAULT false,
    "picsUploadedYN" BOOLEAN NOT NULL DEFAULT false,
    "tripEmailSentYN" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripGuide" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "paxCount" INTEGER NOT NULL DEFAULT 0,
    "feeAmount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "TripGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentBreakdown" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "cashReceived" DECIMAL(10,2) NOT NULL,
    "creditCards" DECIMAL(10,2) NOT NULL,
    "onlineEFTs" DECIMAL(10,2) NOT NULL,
    "vouchers" DECIMAL(10,2) NOT NULL,
    "members" DECIMAL(10,2) NOT NULL,
    "agentsToInvoice" DECIMAL(10,2) NOT NULL,
    "discountsTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PaymentBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountLine" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "DiscountLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJSON" JSONB,
    "afterJSON" JSONB,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "emailDayOfMonth" INTEGER NOT NULL DEFAULT 29,
    "emailHourLocal" INTEGER NOT NULL DEFAULT 8,
    "brandPrimary" TEXT NOT NULL DEFAULT '#0A66C2',
    "brandAccent" TEXT NOT NULL DEFAULT '#0B84F3',

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_email_key" ON "Invite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FeeRate_rank_rateType_key" ON "FeeRate"("rank", "rateType");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentBreakdown_tripId_key" ON "PaymentBreakdown"("tripId");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripGuide" ADD CONSTRAINT "TripGuide_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripGuide" ADD CONSTRAINT "TripGuide_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentBreakdown" ADD CONSTRAINT "PaymentBreakdown_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountLine" ADD CONSTRAINT "DiscountLine_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
