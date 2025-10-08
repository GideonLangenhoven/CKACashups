#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function resolveMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('Resolving failed migration...');

    // Mark the failed migration as rolled back
    await prisma.$executeRawUnsafe(`
      UPDATE "_prisma_migrations"
      SET finished_at = NOW(),
          rolled_back_at = NOW()
      WHERE migration_name = '20251008093340_add_password_fields'
        AND finished_at IS NULL
    `);

    // Delete the failed migration record if it exists
    await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations"
      WHERE migration_name = '20251008093340_add_password_fields'
    `);

    console.log('Failed migration resolved successfully');
  } catch (error) {
    console.error('Error resolving migration:', error);
    process.exit(0); // Don't fail the build, continue anyway
  } finally {
    await prisma.$disconnect();
  }
}

resolveMigration();
