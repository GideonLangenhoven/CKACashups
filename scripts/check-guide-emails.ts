import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const guides = await prisma.guide.findMany({
    where: { active: true },
    orderBy: { name: 'asc' }
  });

  console.log('\n=== Guide Email Status ===\n');

  let withEmail = 0;
  let withoutEmail = 0;

  for (const guide of guides) {
    if (guide.email) {
      console.log(`✓ ${guide.name.padEnd(20)} | Email: ${guide.email}`);
      withEmail++;
    } else {
      console.log(`✗ ${guide.name.padEnd(20)} | No email set`);
      withoutEmail++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total guides: ${guides.length}`);
  console.log(`With email: ${withEmail}`);
  console.log(`Without email: ${withoutEmail}\n`);

  console.log('Note: Guides without emails can sign in with ANY email + their exact name on first login.');
  console.log('After first login, that email will be permanently linked to their guide profile.\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
