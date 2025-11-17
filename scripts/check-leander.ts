import { prisma } from '../lib/prisma';

async function checkLeander() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'leander', mode: 'insensitive' } },
        { name: { contains: 'leander', mode: 'insensitive' } }
      ]
    },
    include: {
      guide: true
    }
  });

  console.log('Users matching "leander":');
  console.log(JSON.stringify(users, null, 2));

  const guides = await prisma.guide.findMany({
    where: {
      name: { contains: 'leander', mode: 'insensitive' }
    }
  });

  console.log('\nGuides matching "leander":');
  console.log(JSON.stringify(guides, null, 2));
}

checkLeander().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
