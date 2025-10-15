import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { NextRequest } from "next/server";
import { calculateGuideEarnings } from "@/lib/guideEarnings";

/**
 * TEMPORARY TEST ENDPOINT - DELETE AFTER USE
 *
 * Tests that trip leaders are correctly added to earnings.
 * Creates 5 test trips for each guide, verifies earnings, then cleans up.
 */

interface TestResult {
  guideName: string;
  guideRank: string;
  tripsCreated: number;
  tripsInEarnings: number;
  expectedEarnings: number;
  actualEarnings: number;
  success: boolean;
  errors: string[];
}

export async function GET(req: NextRequest) {
  try {
    // STRICT ADMIN CHECK
    const user = await getServerSession();
    if (!user?.id || user.role !== 'ADMIN') {
      return new Response('Forbidden - Admin only', { status: 403 });
    }

    const testResults: TestResult[] = [];
    const testTripIds: string[] = [];
    let logs: string[] = [];

    const log = (message: string) => {
      logs.push(message);
      console.log(message);
    };

    log('🧪 Starting Trip Leader Earnings Test...');

    // Get a user to act as trip creator
    const testUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!testUser) {
      return new Response('No admin user found', { status: 500 });
    }

    log(`Using ${testUser.email} as trip creator`);

    // Fetch all guides
    const guides = await prisma.guide.findMany({
      orderBy: { name: 'asc' }
    });

    const eligibleGuides = guides.filter(g =>
      g.rank === 'SENIOR' || g.rank === 'INTERMEDIATE'
    );

    log(`\nFound ${guides.length} total guides, ${eligibleGuides.length} eligible trip leaders\n`);

    // Test each eligible guide
    for (const guide of eligibleGuides) {
      const result: TestResult = {
        guideName: guide.name,
        guideRank: guide.rank,
        tripsCreated: 0,
        tripsInEarnings: 0,
        expectedEarnings: 0,
        actualEarnings: 0,
        success: false,
        errors: []
      };

      log(`\nTesting: ${guide.name} (${guide.rank})`);

      try {
        // Create 5 test trips
        for (let i = 1; i <= 5; i++) {
          const tripDate = new Date();
          tripDate.setDate(tripDate.getDate() - i);
          const totalPax = 10 + (i * 2);

          const earnings = calculateGuideEarnings(totalPax, guide.rank as any, true);

          const trip = await prisma.trip.create({
            data: {
              tripDate,
              leadName: `TEST-${guide.name}-Trip${i}`,
              paxGuideNote: `Test trip ${i} for ${guide.name}`,
              totalPax,
              tripLeaderId: guide.id,
              paymentsMadeYN: true,
              picsUploadedYN: true,
              tripEmailSentYN: true,
              tripReport: 'Test trip report',
              status: 'APPROVED',
              createdById: testUser.id,
              payments: {
                create: {
                  cashReceived: 1000,
                  creditCards: 0,
                  onlineEFTs: 0,
                  vouchers: 0,
                  members: 0,
                  agentsToInvoice: 0,
                  waterPhoneSunblock: 0,
                  discountsTotal: 0
                }
              },
              guides: {
                create: [{
                  guideId: guide.id,
                  paxCount: 0,
                  feeAmount: earnings
                }]
              }
            }
          });

          testTripIds.push(trip.id);
          result.tripsCreated++;
          result.expectedEarnings += earnings;

          log(`  ✓ Trip ${i}: ${totalPax} pax, R ${earnings.toFixed(2)}`);
        }

        // Verify earnings
        const tripGuides = await prisma.tripGuide.findMany({
          where: {
            guideId: guide.id,
            trip: {
              leadName: {
                startsWith: `TEST-${guide.name}`
              }
            }
          }
        });

        result.tripsInEarnings = tripGuides.length;
        result.actualEarnings = tripGuides.reduce((sum, tg) =>
          sum + parseFloat(tg.feeAmount.toString()), 0
        );

        if (result.tripsCreated === result.tripsInEarnings &&
            Math.abs(result.expectedEarnings - result.actualEarnings) < 0.01) {
          result.success = true;
          log(`  ✅ SUCCESS: ${result.tripsCreated} trips, R ${result.actualEarnings.toFixed(2)}`);
        } else {
          result.errors.push(`Mismatch: ${result.tripsInEarnings}/${result.tripsCreated} trips found`);
          log(`  ❌ FAILED: ${result.errors.join(', ')}`);
        }

      } catch (error: any) {
        result.errors.push(error.message);
        log(`  ❌ ERROR: ${error.message}`);
      }

      testResults.push(result);
    }

    // Cleanup
    log('\n🧹 Cleaning up test data...');

    if (testTripIds.length > 0) {
      const deletedTripGuides = await prisma.tripGuide.deleteMany({
        where: { tripId: { in: testTripIds } }
      });
      const deletedPayments = await prisma.paymentBreakdown.deleteMany({
        where: { tripId: { in: testTripIds } }
      });
      const deletedTrips = await prisma.trip.deleteMany({
        where: { id: { in: testTripIds } }
      });

      log(`✓ Cleaned up: ${deletedTrips.count} trips, ${deletedTripGuides.count} earnings records`);
    }

    const successful = testResults.filter(r => r.success);
    const failed = testResults.filter(r => !r.success);

    // Generate HTML report
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Trip Leader Earnings Test Results</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 40px auto;
      padding: 0 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    .summary {
      background: ${successful.length === testResults.length ? '#dcfce7' : '#fef3c7'};
      border-left: 4px solid ${successful.length === testResults.length ? '#22c55e' : '#f59e0b'};
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .summary h2 {
      margin-top: 0;
      color: ${successful.length === testResults.length ? '#166534' : '#92400e'};
    }
    .stat {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .stat:last-child { border-bottom: none; }
    .stat-label {
      font-weight: 500;
      color: #374151;
    }
    .stat-value {
      font-weight: 700;
      color: #111827;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover { background: #f9fafb; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .badge-success {
      background: #dcfce7;
      color: #166534;
    }
    .badge-failed {
      background: #fee2e2;
      color: #991b1b;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9em;
    }
    pre {
      background: #1f2937;
      color: #f3f4f6;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.85em;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 Trip Leader Earnings Test Results</h1>

    <div class="summary">
      <h2>📊 Test Summary</h2>
      <div class="stat">
        <span class="stat-label">Total Guides Tested:</span>
        <span class="stat-value">${testResults.length}</span>
      </div>
      <div class="stat">
        <span class="stat-label">✅ Successful:</span>
        <span class="stat-value" style="color: #059669;">${successful.length}</span>
      </div>
      <div class="stat">
        <span class="stat-label">❌ Failed:</span>
        <span class="stat-value" style="color: #dc2626;">${failed.length}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Success Rate:</span>
        <span class="stat-value">${Math.round(successful.length / testResults.length * 100)}%</span>
      </div>
    </div>

    ${successful.length === testResults.length ? `
      <div style="background: #dcfce7; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <strong>🎉 All Tests Passed!</strong><br>
        Trip leader earnings are working correctly for all guides.
      </div>
    ` : `
      <div class="warning">
        <strong>⚠️ Some Tests Failed</strong><br>
        ${failed.length} guide${failed.length === 1 ? '' : 's'} not receiving earnings correctly. See details below.
      </div>
    `}

    <h2>📋 Detailed Results</h2>
    <table>
      <thead>
        <tr>
          <th>Guide Name</th>
          <th>Rank</th>
          <th>Status</th>
          <th>Trips Created</th>
          <th>Trips in Earnings</th>
          <th>Expected Earnings</th>
          <th>Actual Earnings</th>
          <th>Errors</th>
        </tr>
      </thead>
      <tbody>
        ${testResults.map(r => `
          <tr>
            <td><strong>${r.guideName}</strong></td>
            <td>${r.guideRank}</td>
            <td><span class="badge badge-${r.success ? 'success' : 'failed'}">${r.success ? 'SUCCESS' : 'FAILED'}</span></td>
            <td>${r.tripsCreated}</td>
            <td>${r.tripsInEarnings}</td>
            <td>R ${r.expectedEarnings.toFixed(2)}</td>
            <td>R ${r.actualEarnings.toFixed(2)}</td>
            <td>${r.errors.length > 0 ? r.errors.join(', ') : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="warning" style="margin-top: 40px;">
      <strong>⚠️ IMPORTANT:</strong> This is a temporary test endpoint. Delete after use:<br>
      <code>app/api/admin/test-trip-leader-earnings/route.ts</code>
    </div>

    <h2>📝 Execution Log</h2>
    <pre>${logs.join('\n')}</pre>
  </div>
</body>
</html>
    `;

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error: any) {
    console.error('[Test] Fatal error:', error);

    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }
    .error {
      background: #fee2e2;
      border-left: 4px solid #dc2626;
      padding: 20px;
      border-radius: 4px;
    }
    h1 { color: #991b1b; margin-top: 0; }
    pre {
      background: #f3f4f6;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="error">
    <h1>❌ Test Failed</h1>
    <p><strong>Error:</strong> ${error.message}</p>
    <pre>${error.stack || error.toString()}</pre>
  </div>
</body>
</html>
    `;

    return new Response(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}
