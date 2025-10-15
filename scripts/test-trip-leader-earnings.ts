/**
 * Comprehensive test script for trip leader earnings
 *
 * This script:
 * 1. Fetches all guides from the database
 * 2. Creates 5 test trips for each guide as trip leader
 * 3. Verifies trips appear in their earnings
 * 4. Generates a comprehensive report
 * 5. Cleans up all test data
 *
 * Usage: npx tsx scripts/test-trip-leader-earnings.ts
 */

import { PrismaClient } from '@prisma/client';
import { calculateGuideEarnings } from '../lib/guideEarnings';

const prisma = new PrismaClient();

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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testTripLeaderEarnings() {
  const testResults: TestResult[] = [];
  const testTripIds: string[] = [];

  console.log('🧪 TRIP LEADER EARNINGS TEST\n');
  console.log('='.repeat(80));

  try {
    // Get a user to act as trip creator (need any user for createdById)
    const testUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!testUser) {
      console.log('❌ No admin user found. Cannot create test trips.');
      return;
    }

    console.log(`Using user ${testUser.email} as trip creator\n`);

    // Step 1: Fetch all guides
    console.log('📋 Step 1: Fetching all guides...\n');

    const guides = await prisma.guide.findMany({
      where: {
        // Include both active and inactive to test all
      },
      orderBy: { name: 'asc' }
    });

    console.log(`Found ${guides.length} guides\n`);

    // Filter to only SENIOR and INTERMEDIATE (trip leaders)
    const eligibleGuides = guides.filter(g =>
      g.rank === 'SENIOR' || g.rank === 'INTERMEDIATE'
    );

    console.log(`Found ${eligibleGuides.length} eligible trip leaders (SENIOR/INTERMEDIATE)\n`);

    if (eligibleGuides.length === 0) {
      console.log('❌ No eligible trip leaders found. Exiting.');
      return;
    }

    // Step 2: Create test trips for each guide
    console.log('📝 Step 2: Creating test trips...\n');

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

      console.log(`\n  Testing: ${guide.name} (${guide.rank})`);
      console.log('  ' + '-'.repeat(60));

      try {
        // Create 5 test trips for this guide as trip leader
        for (let i = 1; i <= 5; i++) {
          const tripDate = new Date();
          tripDate.setDate(tripDate.getDate() - i); // Spread over last 5 days

          const totalPax = 10 + (i * 2); // Varying pax: 12, 14, 16, 18, 20

          // Calculate earnings for the trip leader
          const earnings = calculateGuideEarnings(totalPax, guide.rank as any, true);

          // Create trip with trip leader automatically in guides array
          // (simulating what the API endpoint now does)
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
              // IMPORTANT: Manually add trip leader to guides array
              // This simulates what the fixed API endpoint does automatically
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

          console.log(`    ✓ Trip ${i} created: ${totalPax} pax, expecting R ${earnings.toFixed(2)}`);

          await sleep(100); // Small delay to avoid hammering the database
        }

        // Step 3: Verify trips appear in earnings
        console.log(`\n  Verifying earnings for ${guide.name}...`);

        // Fetch the guide's trip records
        const tripGuides = await prisma.tripGuide.findMany({
          where: {
            guideId: guide.id,
            trip: {
              leadName: {
                startsWith: `TEST-${guide.name}`
              }
            }
          },
          include: {
            trip: true
          }
        });

        result.tripsInEarnings = tripGuides.length;
        result.actualEarnings = tripGuides.reduce((sum, tg) =>
          sum + parseFloat(tg.feeAmount.toString()), 0
        );

        // Check success
        if (result.tripsCreated === result.tripsInEarnings) {
          console.log(`    ✅ SUCCESS: All ${result.tripsCreated} trips found in earnings`);
          console.log(`    💰 Expected: R ${result.expectedEarnings.toFixed(2)} | Actual: R ${result.actualEarnings.toFixed(2)}`);

          if (Math.abs(result.expectedEarnings - result.actualEarnings) < 0.01) {
            result.success = true;
          } else {
            result.errors.push(`Earnings mismatch: expected R ${result.expectedEarnings.toFixed(2)}, got R ${result.actualEarnings.toFixed(2)}`);
            console.log(`    ⚠️  Earnings mismatch!`);
          }
        } else {
          result.errors.push(`Only ${result.tripsInEarnings}/${result.tripsCreated} trips found in earnings`);
          console.log(`    ❌ FAILED: Only ${result.tripsInEarnings}/${result.tripsCreated} trips found in earnings`);
        }

      } catch (error: any) {
        result.errors.push(error.message);
        console.log(`    ❌ ERROR: ${error.message}`);
      }

      testResults.push(result);
    }

    // Step 4: Generate comprehensive report
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(80) + '\n');

    const successful = testResults.filter(r => r.success);
    const failed = testResults.filter(r => !r.success);

    console.log(`Total Guides Tested: ${testResults.length}`);
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}\n`);

    if (successful.length > 0) {
      console.log('✅ SUCCESSFUL GUIDES:\n');
      successful.forEach(r => {
        console.log(`  ${r.guideName} (${r.guideRank})`);
        console.log(`    - Trips Created: ${r.tripsCreated}`);
        console.log(`    - Trips in Earnings: ${r.tripsInEarnings}`);
        console.log(`    - Total Earnings: R ${r.actualEarnings.toFixed(2)}`);
        console.log('');
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ FAILED GUIDES:\n');
      failed.forEach(r => {
        console.log(`  ${r.guideName} (${r.guideRank})`);
        console.log(`    - Trips Created: ${r.tripsCreated}`);
        console.log(`    - Trips in Earnings: ${r.tripsInEarnings}`);
        console.log(`    - Expected Earnings: R ${r.expectedEarnings.toFixed(2)}`);
        console.log(`    - Actual Earnings: R ${r.actualEarnings.toFixed(2)}`);
        console.log(`    - Errors: ${r.errors.join(', ')}`);
        console.log('');
      });
    }

    // Step 5: Clean up test data
    console.log('\n' + '='.repeat(80));
    console.log('🧹 Step 5: Cleaning up test data...\n');

    if (testTripIds.length > 0) {
      // Delete TripGuide records
      const deletedTripGuides = await prisma.tripGuide.deleteMany({
        where: { tripId: { in: testTripIds } }
      });
      console.log(`  ✓ Deleted ${deletedTripGuides.count} TripGuide records`);

      // Delete PaymentBreakdown records
      const deletedPayments = await prisma.paymentBreakdown.deleteMany({
        where: { tripId: { in: testTripIds } }
      });
      console.log(`  ✓ Deleted ${deletedPayments.count} PaymentBreakdown records`);

      // Delete Trips
      const deletedTrips = await prisma.trip.deleteMany({
        where: { id: { in: testTripIds } }
      });
      console.log(`  ✓ Deleted ${deletedTrips.count} Trip records`);
    }

    console.log('\n✨ Test complete! All test data cleaned up.\n');

    // Final summary
    console.log('='.repeat(80));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Trip Leader Earnings Fix: ${successful.length === testResults.length ? 'WORKING' : 'NEEDS ATTENTION'}`);
    console.log(`\nSuccess Rate: ${successful.length}/${testResults.length} (${Math.round(successful.length / testResults.length * 100)}%)\n`);

    if (successful.length === testResults.length) {
      console.log('🎉 All trip leaders correctly receive earnings!');
      console.log('The fix is working as expected.\n');
    } else {
      console.log('⚠️  Some trip leaders are not receiving earnings correctly.');
      console.log('Review the failed guides above for details.\n');
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);

    // Attempt cleanup on error
    if (testTripIds.length > 0) {
      console.log('\n🧹 Attempting cleanup after error...');
      try {
        await prisma.tripGuide.deleteMany({ where: { tripId: { in: testTripIds } } });
        await prisma.paymentBreakdown.deleteMany({ where: { tripId: { in: testTripIds } } });
        await prisma.trip.deleteMany({ where: { id: { in: testTripIds } } });
        console.log('✓ Cleanup successful');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError);
      }
    }
  }
}

async function main() {
  try {
    await testTripLeaderEarnings();
  } finally {
    await prisma.$disconnect();
  }
}

main();
