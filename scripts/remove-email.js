const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeEmail() {
  const email = 'joshtraut@icloud.com';
  const normalizedEmail = email.toLowerCase().trim();

  console.log(`\nSearching for email: ${normalizedEmail}\n`);

  // Find all guides with this email
  const guides = await prisma.guide.findMany({
    where: { email: normalizedEmail }
  });

  console.log(`Found ${guides.length} guide(s) with this email:`);
  guides.forEach(g => {
    console.log(`  - Guide ID: ${g.id}, Name: ${g.name}, Active: ${g.active}`);
  });

  // Find all users with this email
  const users = await prisma.user.findMany({
    where: { email: normalizedEmail }
  });

  console.log(`\nFound ${users.length} user(s) with this email:`);
  users.forEach(u => {
    console.log(`  - User ID: ${u.id}, Name: ${u.name}, Active: ${u.active}, GuideId: ${u.guideId}`);
  });

  // Remove email from all guides
  if (guides.length > 0) {
    console.log(`\nClearing email from ${guides.length} guide(s)...`);
    for (const guide of guides) {
      await prisma.guide.update({
        where: { id: guide.id },
        data: { email: null }
      });
      console.log(`  ✓ Cleared email from guide: ${guide.name}`);
    }
  }

  // Delete all users with this email (or update to placeholder)
  if (users.length > 0) {
    console.log(`\nRemoving ${users.length} user(s) with this email...`);
    for (const user of users) {
      // Check if user has any dependencies
      const tripCount = await prisma.trip.count({
        where: { createdById: user.id }
      });

      if (tripCount > 0) {
        // Replace with placeholder instead of deleting
        const placeholderEmail = `removed_${user.id}@placeholder.local`;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            email: placeholderEmail,
            guideId: null
          }
        });
        console.log(`  ✓ Replaced email with placeholder for user: ${user.name} (has ${tripCount} trips)`);
      } else {
        // Safe to delete
        await prisma.user.delete({
          where: { id: user.id }
        });
        console.log(`  ✓ Deleted user: ${user.name}`);
      }
    }
  }

  console.log(`\n✅ Done! Email ${normalizedEmail} has been removed from the system.\n`);
}

removeEmail()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
