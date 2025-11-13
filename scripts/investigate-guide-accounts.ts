import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== INVESTIGATING GUIDE ACCOUNT DATA LEAKAGE ===\n');

  // 1. Get all guides named Leander or Josh
  const guides = await prisma.guide.findMany({
    where: {
      OR: [
        { name: { contains: 'Leander', mode: 'insensitive' } },
        { name: { contains: 'Josh', mode: 'insensitive' } }
      ]
    }
  });

  console.log('=== GUIDES IN DATABASE ===');
  for (const guide of guides) {
    console.log(`\nGuide: ${guide.name}`);
    console.log(`  ID: ${guide.id}`);
    console.log(`  Email: ${guide.email || 'No email'}`);
    console.log(`  Rank: ${guide.rank}`);
    console.log(`  Active: ${guide.active}`);
  }

  // 2. Get all user accounts linked to these guides
  console.log('\n\n=== USER ACCOUNTS ===');
  for (const guide of guides) {
    const users = await prisma.user.findMany({
      where: { guideId: guide.id }
    });

    console.log(`\nGuide: ${guide.name} (ID: ${guide.id})`);
    console.log(`Number of user accounts: ${users.length}`);

    for (const user of users) {
      console.log(`\n  User Account:`);
      console.log(`    User ID: ${user.id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Name: ${user.name}`);
      console.log(`    Role: ${user.role}`);
      console.log(`    Linked to Guide ID: ${user.guideId}`);
      console.log(`    Active: ${user.active}`);
    }
  }

  // 3. Check for duplicate guide emails
  console.log('\n\n=== CHECKING FOR DUPLICATE EMAILS ===');
  const guideEmails = guides.filter(g => g.email).map(g => g.email);
  const duplicates = guideEmails.filter((email, index) => guideEmails.indexOf(email) !== index);

  if (duplicates.length > 0) {
    console.log('⚠️  DUPLICATE EMAILS FOUND:');
    for (const email of duplicates) {
      console.log(`  - ${email}`);
    }
  } else {
    console.log('✓ No duplicate emails found');
  }

  // 4. Get trips for each guide
  console.log('\n\n=== TRIPS FOR EACH GUIDE ===');
  for (const guide of guides) {
    const tripGuides = await prisma.tripGuide.findMany({
      where: { guideId: guide.id },
      include: {
        trip: {
          select: {
            id: true,
            tripDate: true,
            leadName: true,
            status: true
          }
        }
      }
    });

    console.log(`\nGuide: ${guide.name}`);
    console.log(`  Total Trips: ${tripGuides.length}`);

    for (const tg of tripGuides) {
      console.log(`    - ${new Date(tg.trip.tripDate).toLocaleDateString()}: ${tg.trip.leadName} (${tg.trip.status})`);
    }
  }

  // 5. Check if any user accounts are linked to wrong guides
  console.log('\n\n=== CHECKING FOR MISMATCHED USER-GUIDE LINKS ===');
  const allUsers = await prisma.user.findMany({
    include: { guide: true }
  });

  for (const user of allUsers) {
    if (user.guide) {
      const nameMismatch = user.name && user.guide.name &&
        user.name.toLowerCase() !== user.guide.name.toLowerCase();

      if (nameMismatch) {
        console.log(`⚠️  MISMATCH FOUND:`);
        console.log(`    User Name: ${user.name}`);
        console.log(`    Linked Guide Name: ${user.guide.name}`);
        console.log(`    User Email: ${user.email}`);
        console.log(`    Guide Email: ${user.guide.email || 'None'}`);
      }
    }
  }

  console.log('\n\n=== INVESTIGATION COMPLETE ===\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
