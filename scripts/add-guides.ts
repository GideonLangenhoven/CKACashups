import { prisma } from "../lib/prisma";

const guides = [
  { name: "John", initial: "J", rank: "SENIOR" },
  { name: "Dedre", initial: "De", rank: "SENIOR" },
  { name: "Collings", initial: "Co", rank: "INTERMEDIATE" },
  { name: "Trace", initial: "T", rank: "SENIOR" },
  { name: "Leander", initial: "Le", rank: "SENIOR" },
  { name: "Rudi", initial: "R", rank: "INTERMEDIATE" },
  { name: "Kirshia", initial: "K", rank: "SENIOR" },
  { name: "Joshua", initial: "Js", rank: "INTERMEDIATE" },
  { name: "Matt", initial: "Mt", rank: "SENIOR" },
  { name: "Hassani", initial: "H", rank: "INTERMEDIATE" },
  { name: "Noah", initial: "N", rank: "JUNIOR" },
  { name: "Leo", initial: "L", rank: "SENIOR" },
  { name: "Steve", initial: "St", rank: "INTERMEDIATE" },
  { name: "Tammy", initial: "Tm", rank: "JUNIOR" },
  { name: "Josh", initial: "Jt", rank: "JUNIOR" },
  { name: "Noah B", initial: "Nh", rank: "SENIOR" },
  { name: "Tammy", initial: "Ta", rank: "JUNIOR" },
  { name: "Ethan", initial: "E", rank: "JUNIOR" },
  { name: "Victoria", initial: "V", rank: "JUNIOR" },
  { name: "Kaisea", initial: "Ks", rank: "JUNIOR" },
  { name: "Nicholas", initial: "Nm", rank: "JUNIOR" },
  { name: "Erin", initial: "Er", rank: "JUNIOR" },
  { name: "Sam", initial: "S", rank: "JUNIOR" },
  { name: "Shadreck", initial: "Sh", rank: "INTERMEDIATE" },
  { name: "Tuhafeni", initial: "Tf", rank: "TRAINEE" },
  { name: "Nicole", initial: "Nc", rank: "TRAINEE" }
];

async function main() {
  console.log("Adding guides to database...");

  for (const guide of guides) {
    try {
      // Check if guide already exists by name
      const existing = await prisma.guide.findFirst({
        where: { name: guide.name }
      });

      if (existing) {
        console.log(`Guide "${guide.name}" already exists, skipping...`);
        continue;
      }

      const created = await prisma.guide.create({
        data: {
          name: guide.name,
          rank: guide.rank as "SENIOR" | "INTERMEDIATE" | "JUNIOR" | "TRAINEE",
          active: true
        }
      });

      console.log(`✓ Created guide: ${created.name} (${guide.initial}) - ${created.rank}`);
    } catch (error) {
      console.error(`✗ Failed to create guide "${guide.name}":`, error);
    }
  }

  console.log("\nDone! All guides have been processed.");
  console.log("You can now add email addresses for each guide in the admin dashboard.");
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
