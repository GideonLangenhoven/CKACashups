import { prisma } from '../lib/prisma';

async function checkLeanderTrips() {
  const guide = await prisma.guide.findFirst({
    where: { email: 'leandermm@gmail.com' }
  });

  if (!guide) {
    console.log('No guide found for leandermm@gmail.com');
    return;
  }

  console.log('Guide:', guide);

  const trips = await prisma.trip.findMany({
    where: {
      guides: {
        some: { guideId: guide.id }
      }
    },
    include: {
      guides: {
        where: { guideId: guide.id }
      }
    },
    orderBy: { tripDate: 'desc' },
    take: 10
  });

  console.log(`\nFound ${trips.length} trips for Leander`);
  if (trips.length > 0) {
    console.log('\nRecent trips:');
    trips.forEach(trip => {
      console.log(`- ${trip.tripDate.toISOString().slice(0, 10)}: ${trip.leadName}, ${trip.totalPax} pax, R${trip.guides[0]?.feeAmount || 0}`);
    });
  }
}

checkLeanderTrips().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
