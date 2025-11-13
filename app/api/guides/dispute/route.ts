import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { sendEmail } from "@/lib/sendMail";
import { logEvent } from "@/lib/log";

export const dynamic = 'force-dynamic';

const MONTH_PARAM_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user?.id) return new Response('Unauthorized', { status: 401 });

    // Get user's guide info
    const userWithGuide = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        guideId: true,
        guide: {
          select: {
            id: true,
            name: true,
            rank: true,
            email: true
          }
        }
      }
    });

    if (!userWithGuide?.guideId || !userWithGuide.guide) {
      return new Response('You are not linked to a guide profile', { status: 403 });
    }

    const { month, reason } = await req.json();

    if (!month || !reason) {
      return new Response('Month and reason are required', { status: 400 });
    }

    if (typeof month !== 'string' || !MONTH_PARAM_REGEX.test(month)) {
      return new Response('Month must be in YYYY-MM format', { status: 400 });
    }

    if (typeof reason !== 'string' || reason.trim().length === 0) {
      return new Response('Reason must be a non-empty string', { status: 400 });
    }

    const sanitizedReason = escapeHtml(reason).replace(/\n/g, '<br>');

    // Get trip data for the month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    const trips = await prisma.trip.findMany({
      where: {
        guides: {
          some: {
            guideId: userWithGuide.guideId
          }
        },
        tripDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        guides: {
          where: { guideId: userWithGuide.guideId },
          include: { guide: true }
        }
      },
      orderBy: { tripDate: 'asc' }
    });

    const tripCount = trips.length;
    const totalEarnings = trips.reduce((sum, trip) => {
      return sum + parseFloat(trip.guides[0]?.feeAmount?.toString() || '0');
    }, 0);

    // Send email to admin
    const adminEmails = (process.env.ADMIN_EMAILS || 'gidslang89@gmail.com,info@kayak.co.za')
      .split(',').map(e => e.trim()).filter(Boolean);

    const tripList = trips.map(trip => {
      const earnings = parseFloat(trip.guides[0]?.feeAmount?.toString() || '0');
      return `  • ${new Date(trip.tripDate).toISOString().slice(0, 10)} - ${trip.leadName} (R ${earnings.toFixed(2)})`;
    }).join('\n');

    await sendEmail({
      to: adminEmails,
      subject: `⚠️ Trip Dispute from ${userWithGuide.guide.name} - ${month}`,
      html: `
        <h2 style="color: #dc2626;">Trip Count Dispute</h2>

        <h3>Guide Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${userWithGuide.guide.name}</li>
          <li><strong>Rank:</strong> ${userWithGuide.guide.rank}</li>
          <li><strong>Email:</strong> ${userWithGuide.guide.email || user.email}</li>
        </ul>

        <h3>Disputed Period:</h3>
        <ul>
          <li><strong>Month:</strong> ${month}</li>
          <li><strong>Total Trips (in system):</strong> ${tripCount}</li>
          <li><strong>Total Earnings (in system):</strong> R ${totalEarnings.toFixed(2)}</li>
        </ul>

        <h3>Reason for Dispute:</h3>
        <p style="background: #fef2f2; padding: 12px; border-left: 4px solid #dc2626; margin: 16px 0;">
          ${sanitizedReason}
        </p>

        <h3>Trips in System:</h3>
        <pre style="background: #f9fafb; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px;">
${tripList || '  No trips found'}
        </pre>

        <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
          Please review this dispute and contact ${userWithGuide.guide.name} to resolve the issue.
        </p>
      `
    });

    logEvent('guide_dispute_submitted', {
      guideId: userWithGuide.guideId,
      guideName: userWithGuide.guide.name,
      userId: user.id,
      month,
      tripCount,
      totalEarnings,
      reason
    });

    return Response.json({
      success: true,
      message: 'Dispute submitted successfully'
    });
  } catch (error: any) {
    const errorReference = randomUUID();
    console.error(`[Dispute Submit] Error ${errorReference}:`, error);
    return new Response(JSON.stringify({ error: 'Failed to submit dispute', referenceId: errorReference }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
