import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find Josh's guide record
  const josh = await prisma.guide.findFirst({
    where: { name: 'Josh' }
  });

  if (!josh) {
    console.log('❌ Josh not found in guides table');
    return;
  }

  console.log(`\n✓ Found Josh (ID: ${josh.id})`);
  console.log(`  Email: ${josh.email || 'No email set'}`);
  console.log(`  Rank: ${josh.rank}`);

  // Find Josh's user account
  const user = await prisma.user.findFirst({
    where: { guideId: josh.id }
  });

  if (user) {
    console.log(`\n✓ Found Josh's user account (ID: ${user.id})`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
  } else {
    console.log(`\n❌ Josh does not have a user account yet`);
  }

  // Find all TripGuide records for Josh
  const tripGuides = await prisma.tripGuide.findMany({
    where: { guideId: josh.id },
    include: {
      trip: {
        include: {
          payments: true,
          createdBy: true
        }
      }
    },
    orderBy: { trip: { tripDate: 'desc' } }
  });

  console.log(`\n=== Josh's Trip Assignments (${tripGuides.length} total) ===\n`);

  if (tripGuides.length === 0) {
    console.log('❌ No trips found for Josh in TripGuide table');
    console.log('\nThis means Josh has NOT been added as a guide to any trips.');
  } else {
    for (const tg of tripGuides) {
      const trip = tg.trip;
      console.log(`Trip ID: ${trip.id}`);
      console.log(`  Date: ${new Date(trip.tripDate).toLocaleDateString()}`);
      console.log(`  Lead: ${trip.leadName}`);
      console.log(`  Status: ${trip.status}`);
      console.log(`  Total Pax: ${trip.totalPax}`);
      console.log(`  Josh's Earnings: R ${tg.feeAmount?.toString() || '0'}`);
      console.log(`  Created by User ID: ${trip.createdById}`);
      console.log(`  Trip Leader ID: ${trip.tripLeaderId || 'None'}`);
      console.log('');
    }
  }

  // Also check all trips to see which ones exist
  const allTrips = await prisma.trip.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      guides: {
        include: { guide: true }
      }
    }
  });

  console.log(`\n=== Recent Trips in Database (last 5) ===\n`);
  for (const trip of allTrips) {
    console.log(`Trip ID: ${trip.id}`);
    console.log(`  Date: ${new Date(trip.tripDate).toLocaleDateString()}`);
    console.log(`  Lead: ${trip.leadName}`);
    console.log(`  Status: ${trip.status}`);
    console.log(`  Guides: ${trip.guides.map(g => g.guide.name).join(', ') || 'None'}`);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
