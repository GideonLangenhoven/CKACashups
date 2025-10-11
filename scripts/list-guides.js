#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function listGuides() {
  const prisma = new PrismaClient();

  try {
    console.log('\n=== ACTIVE GUIDES ===\n');

    const guides = await prisma.guide.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    guides.forEach(guide => {
      console.log(`Guide Name: "${guide.name}"`);
      console.log(`Guide Email: ${guide.email || '(not set)'}`);
      console.log(`Rank: ${guide.rank}`);
      if (guide.user) {
        console.log(`Linked User Account: ${guide.user.email} (name: "${guide.user.name}")`);
      } else {
        console.log(`Linked User Account: (none)`);
      }
      console.log('---');
    });

    console.log(`\nTotal active guides: ${guides.length}\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listGuides();
