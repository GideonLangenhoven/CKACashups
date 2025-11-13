import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find Josh's user account (simulating what happens when Josh logs in)
  const user = await prisma.user.findFirst({
    where: { email: 'joshtraut@icloud.com' }
  });

  if (!user) {
    console.log('❌ Josh user account not found');
    return;
  }

  console.log(`✓ Found Josh's user account`);
  console.log(`  User ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Name: ${user.name}`);
  console.log(`  Guide ID: ${user.guideId || 'NOT LINKED'}`);
  console.log(`  Role: ${user.role}`);

  // Get user's guide info (exactly as earnings page does)
  const userWithGuide = await prisma.user.findUnique({
    where: { id: user.id },
    select: { guideId: true, guide: { select: { name: true, rank: true } } }
  });

  console.log(`\n✓ User with guide info:`);
  console.log(`  Guide ID: ${userWithGuide?.guideId || 'NOT LINKED'}`);
  console.log(`  Guide Name: ${userWithGuide?.guide?.name || 'N/A'}`);
  console.log(`  Guide Rank: ${userWithGuide?.guide?.rank || 'N/A'}`);

  if (!userWithGuide?.guideId) {
    console.log('\n❌ User is not linked to a guide profile!');
    console.log('This is the problem - the earnings page will show "You are not linked to a guide profile"');
    return;
  }

  // Get all trips for this guide (exactly as earnings page does)
  console.log(`\n=== Running earnings page query ===`);
  console.log(`Looking for trips where guides.some({ guideId: "${userWithGuide.guideId}" })`);

  const trips = await prisma.trip.findMany({
    where: {
      guides: {
        some: {
          guideId: userWithGuide.guideId
        }
      }
    },
    include: {
      guides: {
        where: { guideId: userWithGuide.guideId },
        include: { guide: true }
      },
      tripLeader: true
    },
    orderBy: { tripDate: 'desc' }
  });

  console.log(`\n✓ Found ${trips.length} trips for Josh\n`);

  if (trips.length === 0) {
    console.log('❌ No trips found! This is why Josh sees no trips on the earnings page.');
    console.log('\nPossible reasons:');
    console.log('1. The TripGuide records exist but the query is not finding them');
    console.log('2. There is a database connection issue');
    console.log('3. The guideId in TripGuide does not match the user\'s guideId');
  } else {
    for (const trip of trips) {
      console.log(`Trip ID: ${trip.id}`);
      console.log(`  Date: ${new Date(trip.tripDate).toLocaleDateString()}`);
      console.log(`  Lead: ${trip.leadName}`);
      console.log(`  Status: ${trip.status}`);
      console.log(`  Total Pax: ${trip.totalPax}`);
      if (trip.guides.length > 0) {
        console.log(`  Josh's earnings: R ${trip.guides[0].feeAmount?.toString() || '0'}`);
      }
      console.log('');
    }
  }

  // Also directly check TripGuide records
  console.log(`\n=== Direct TripGuide check ===`);
  const tripGuides = await prisma.tripGuide.findMany({
    where: { guideId: userWithGuide.guideId }
  });
  console.log(`Found ${tripGuides.length} TripGuide records with guideId: ${userWithGuide.guideId}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
