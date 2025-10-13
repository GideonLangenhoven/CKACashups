import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

    const body = await req.json();
    const { email } = body;

    if (!email) return new Response('Email required', { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();

    console.log(`\n=== Clearing email: ${normalizedEmail} ===\n`);

    // Find all guides with this email
    const guides = await prisma.guide.findMany({
      where: { email: normalizedEmail }
    });

    console.log(`Found ${guides.length} guide(s) with this email`);

    // Find all users with this email
    const users = await prisma.user.findMany({
      where: { email: normalizedEmail }
    });

    console.log(`Found ${users.length} user(s) with this email`);

    let cleared = 0;

    // Clear email from all guides
    for (const guide of guides) {
      await prisma.guide.update({
        where: { id: guide.id },
        data: { email: null }
      });
      console.log(`  ✓ Cleared email from guide: ${guide.name}`);
      cleared++;
    }

    // Remove all users with this email
    for (const user of users) {
      // Check if user has any dependencies
      const tripCount = await prisma.trip.count({
        where: { createdById: user.id }
      });

      const inviteCount = await prisma.invite.count({
        where: { invitedById: user.id }
      });

      const auditCount = await prisma.auditLog.count({
        where: { actorUserId: user.id }
      });

      if (tripCount > 0 || inviteCount > 0 || auditCount > 0) {
        // Replace with placeholder instead of deleting
        const placeholderEmail = `removed_${user.id}@placeholder.local`;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            email: placeholderEmail,
            guideId: null
          }
        });
        console.log(`  ✓ Replaced email with placeholder for user: ${user.name}`);
        cleared++;
      } else {
        // Safe to delete
        await prisma.user.delete({
          where: { id: user.id }
        });
        console.log(`  ✓ Deleted user: ${user.name}`);
        cleared++;
      }
    }

    console.log(`\n✅ Done! Cleared ${cleared} record(s)\n`);

    return Response.json({
      success: true,
      message: `Cleared ${cleared} record(s) with email ${email}`,
      details: {
        guides: guides.length,
        users: users.length
      }
    });
  } catch (error: any) {
    console.error('Error clearing email:', error);
    return new Response(error.message || 'Failed to clear email', { status: 500 });
  }
}
