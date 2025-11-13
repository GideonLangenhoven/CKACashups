import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type GuideWithUser = Awaited<ReturnType<typeof fetchGuides>>[number];

const FLAT_RATES = {
  TRAINEE: 200,
  JUNIOR: 350,
  INTERMEDIATE: 550,
  SENIOR: 730,
} as const;

const TRIP_LEADER_RATES = {
  TRAINEE: 810,
  JUNIOR: 810,
  INTERMEDIATE: 700,
  SENIOR: 810,
} as const;

async function fetchGuides() {
  return prisma.guide.findMany({
    where: { active: true, user: { isNot: null } },
    take: 2,
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchAdmin() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", active: true },
  });
  if (!admin) {
    throw new Error("No active admin user found for test trip creation.");
  }
  return admin;
}

function calculateGuideEarnings(
  rank: GuideWithUser["rank"],
  isLeader: boolean
) {
  if (isLeader) {
    return TRIP_LEADER_RATES[rank] ?? 810;
  }
  return FLAT_RATES[rank] ?? 0;
}

function monthWindow(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );
  return { start, end };
}

async function createTestTrip(
  adminId: string,
  guides: GuideWithUser[],
  tripDate: Date
) {
  const totalPax = 18;
  const leader = guides[0];

  return prisma.trip.create({
    data: {
      tripDate,
      status: "SUBMITTED",
      leadName: "Automation QA Trip",
      paxGuideNote: "QA verification run",
      totalPax,
      tripLeaderId: leader.id,
      paymentsMadeYN: true,
      picsUploadedYN: true,
      tripEmailSentYN: false,
      createdById: adminId,
      suggestions: "Automated test data",
      guides: {
        create: guides.map((guide) => {
          const isLeader = guide.id === leader.id;
          const feeAmount = calculateGuideEarnings(guide.rank, isLeader);
          return {
            guideId: guide.id,
            paxCount: Math.floor(totalPax / guides.length),
            feeAmount: new Prisma.Decimal(feeAmount),
          };
        }),
      },
    },
    include: { guides: { include: { guide: true } } },
  });
}

async function verifyGuidePerspective(
  guide: GuideWithUser,
  referenceDate: Date
) {
  const { start, end } = monthWindow(referenceDate);
  const trips = await prisma.trip.findMany({
    where: {
      guides: { some: { guideId: guide.id } },
      tripDate: { gte: start, lte: end },
    },
    include: {
      guides: { where: { guideId: guide.id } },
      tripLeader: true,
    },
    orderBy: { tripDate: "asc" },
  });

  const totals = trips.reduce(
    (acc, trip) => {
      const earnings = parseFloat(trip.guides[0]?.feeAmount?.toString() || "0");
      acc.trips += 1;
      acc.earnings += earnings;
      return acc;
    },
    { trips: 0, earnings: 0 }
  );

  return { trips, totals };
}

async function verifyReportSnapshot(referenceDate: Date) {
  const { start, end } = monthWindow(referenceDate);
  const trips = await prisma.trip.findMany({
    where: { tripDate: { gte: start, lte: end } },
    include: { guides: true },
  });

  const guideTally = trips.map((trip) => ({
    id: trip.id,
    totalGuides: trip.guides.length,
    totalPax: trip.totalPax,
  }));

  return { totalTrips: trips.length, guideTally };
}

async function main() {
  const guides = await fetchGuides();
  if (guides.length < 2) {
    throw new Error("Need at least two active guides with user accounts.");
  }

  const admin = await fetchAdmin();
  const tripDate = new Date();

  console.log("Using guides:", guides.map((g) => g.name));
  console.log("Admin user:", admin.email);

  const createdTrip = await createTestTrip(admin.id, guides, tripDate);
  console.log("Created trip:", {
    id: createdTrip.id,
    date: createdTrip.tripDate,
    guides: createdTrip.guides.map((g) => ({
      guide: g.guide.name,
      feeAmount: g.feeAmount.toString(),
    })),
  });

  for (const guide of guides) {
    const perspective = await verifyGuidePerspective(guide, tripDate);
    console.log(`Guide ${guide.name} monthly summary:`, perspective.totals);
    console.log(
      `Recent trips for ${guide.name}:`,
      perspective.trips.map((trip) => ({
        id: trip.id,
        date: trip.tripDate,
        earnings: trip.guides[0]?.feeAmount?.toString(),
      }))
    );
  }

  const reportSnapshot = await verifyReportSnapshot(tripDate);
  console.log("Monthly report snapshot:", reportSnapshot);

  return createdTrip.id;
}

main()
  .then(async (tripId) => {
    // Clean up the test trip after verification
    await prisma.tripGuide.deleteMany({ where: { tripId } });
    await prisma.trip.delete({ where: { id: tripId } });
    console.log("Cleaned up QA trip", tripId);
  })
  .catch(async (err) => {
    console.error("Guide journey test failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
