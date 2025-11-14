import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateGuideLogin(guideEmail: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SIMULATING LOGIN FOR: ${guideEmail}`);
  console.log('='.repeat(60));

  // Step 1: Find user by email (this is what login does)
  const user = await prisma.user.findUnique({
    where: { email: guideEmail },
    include: { guide: true }
  });

  if (!user) {
    console.log('❌ User not found!');
    return;
  }

  console.log(`\n✓ User found:`);
  console.log(`  User ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Name: ${user.name}`);
  console.log(`  Guide ID: ${user.guideId || 'Not linked to guide'}`);
  console.log(`  Guide Name: ${user.guide?.name || 'N/A'}`);

  if (!user.guideId) {
    console.log('\n❌ User is not linked to a guide!');
    return;
  }

  // Step 2: Get trips (this is what My Earnings page does)
  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { createdById: user.id },
        { guides: { some: { guideId: user.guideId } } }
      ]
    },
    orderBy: { tripDate: "desc" },
    include: {
      payments: true,
      guides: { include: { guide: true } },
      tripLeader: true
    }
  });

  console.log(`\n✓ Trips found: ${trips.length}`);

  for (const trip of trips) {
    console.log(`\n  Trip ID: ${trip.id}`);
    console.log(`  Date: ${new Date(trip.tripDate).toLocaleDateString()}`);
    console.log(`  Lead: ${trip.leadName}`);
    console.log(`  Status: ${trip.status}`);
    console.log(`  Total Pax: ${trip.totalPax}`);
    console.log(`  All Guides: ${trip.guides.map(g => g.guide.name).join(', ')}`);

    // Find THIS guide's assignment
    const myAssignment = trip.guides.find(g => g.guideId === user.guideId);
    if (myAssignment) {
      console.log(`  MY EARNINGS: R ${myAssignment.feeAmount}`);
      console.log(`  Is Trip Leader: ${trip.tripLeaderId === user.guideId ? 'YES' : 'No'}`);
    } else {
      console.log(`  ⚠️  I'm not assigned to this trip!`);
    }
  }

  // Step 3: Calculate earnings
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth();

  const earningsByPeriod = {
    today: 0,
    thisMonth: 0,
    thisYear: 0,
    allTime: 0,
    tripCountToday: 0,
    tripCountThisMonth: 0,
    tripCountThisYear: 0,
    tripCountAllTime: 0,
  };

  for (const trip of trips) {
    const myGuideAssignment = trip.guides.find((g: any) => g.guideId === user.guideId);
    if (!myGuideAssignment) continue;

    const tripDate = new Date(trip.tripDate);
    const earnings = parseFloat(myGuideAssignment.feeAmount?.toString() || '0');

    earningsByPeriod.allTime += earnings;
    earningsByPeriod.tripCountAllTime++;

    if (tripDate.getFullYear() === currentYear) {
      earningsByPeriod.thisYear += earnings;
      earningsByPeriod.tripCountThisYear++;

      if (tripDate.getMonth() === currentMonthNum) {
        earningsByPeriod.thisMonth += earnings;
        earningsByPeriod.tripCountThisMonth++;

        if (tripDate.getDate() === now.getDate()) {
          earningsByPeriod.today += earnings;
          earningsByPeriod.tripCountToday++;
        }
      }
    }
  }

  console.log(`\n✓ Earnings Summary:`);
  console.log(`  Today: R ${earningsByPeriod.today.toFixed(2)} (${earningsByPeriod.tripCountToday} trips)`);
  console.log(`  This Month: R ${earningsByPeriod.thisMonth.toFixed(2)} (${earningsByPeriod.tripCountThisMonth} trips)`);
  console.log(`  This Year: R ${earningsByPeriod.thisYear.toFixed(2)} (${earningsByPeriod.tripCountThisYear} trips)`);
  console.log(`  All Time: R ${earningsByPeriod.allTime.toFixed(2)} (${earningsByPeriod.tripCountAllTime} trips)`);

  console.log(`\n✓ PAGE HEADER SHOULD SHOW: "My Earnings - ${user.guide?.name}"`);
}

async function main() {
  console.log('\n');
  console.log('#'.repeat(60));
  console.log('# SIMULATING WHAT EACH GUIDE SHOULD SEE');
  console.log('#'.repeat(60));

  await simulateGuideLogin('leandermm@gmail.com');
  await simulateGuideLogin('joshtraut@icloud.com');

  console.log('\n');
  console.log('#'.repeat(60));
  console.log('# SIMULATION COMPLETE');
  console.log('#'.repeat(60));
  console.log('\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
