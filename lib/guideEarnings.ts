// Guide earnings calculation based on pax count and rank
// Updated earnings structure with Trip Leader role

type GuideRank = 'SENIOR' | 'INTERMEDIATE' | 'JUNIOR' | 'TRAINEE';

interface EarningsRate {
  tripLeader: number;
  senior: number;
  intermediate: number;
  junior: number;
  trainee: number;
}

// Earnings table based on pax count
const EARNINGS_TABLE: Record<number, EarningsRate> = {
  1: { tripLeader: 500, senior: 500, intermediate: 530, junior: 0, trainee: 200 },
  2: { tripLeader: 700, senior: 700, intermediate: 530, junior: 0, trainee: 200 },
  3: { tripLeader: 820, senior: 700, intermediate: 530, junior: 0, trainee: 200 },
  4: { tripLeader: 820, senior: 700, intermediate: 530, junior: 350, trainee: 200 },
  5: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  6: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  7: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  8: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  9: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  10: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  11: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  12: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  13: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  14: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  15: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  16: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  17: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  18: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  19: { tripLeader: 780, senior: 700, intermediate: 530, junior: 300, trainee: 200 },
  20: { tripLeader: 800, senior: 700, intermediate: 500, junior: 300, trainee: 200 },
  21: { tripLeader: 800, senior: 700, intermediate: 500, junior: 300, trainee: 200 },
  22: { tripLeader: 800, senior: 700, intermediate: 500, junior: 300, trainee: 200 },
  23: { tripLeader: 800, senior: 700, intermediate: 500, junior: 300, trainee: 200 },
  24: { tripLeader: 800, senior: 700, intermediate: 500, junior: 300, trainee: 200 },
};

/**
 * Calculate earnings for a guide on a trip
 * @param paxCount Total number of passengers
 * @param rank Guide's rank
 * @param isTripLeader Whether this guide is the trip leader
 * @returns Earnings amount in Rands
 */
export function calculateGuideEarnings(
  paxCount: number,
  rank: GuideRank,
  isTripLeader: boolean = false
): number {
  // Cap pax count at 24 (use 24's rates for anything higher)
  const effectivePax = Math.min(Math.max(paxCount, 1), 24);
  const rates = EARNINGS_TABLE[effectivePax];

  if (!rates) {
    throw new Error(`No earnings rate defined for ${effectivePax} pax`);
  }

  // If they're the trip leader, use trip leader rate (SENIOR or INTERMEDIATE)
  if (isTripLeader && (rank === 'SENIOR' || rank === 'INTERMEDIATE')) {
    return rates.tripLeader;
  }

  // Otherwise use their rank rate
  switch (rank) {
    case 'SENIOR':
      return rates.senior;
    case 'INTERMEDIATE':
      return rates.intermediate;
    case 'JUNIOR':
      return rates.junior;
    case 'TRAINEE':
      return rates.trainee;
    default:
      return 0;
  }
}

/**
 * Calculate earnings for all guides on a trip
 */
export function calculateTripEarnings(
  paxCount: number,
  guides: Array<{ id: string; rank: GuideRank }>,
  tripLeaderId?: string | null
): Record<string, number> {
  const earnings: Record<string, number> = {};

  for (const guide of guides) {
    const isTripLeader = guide.id === tripLeaderId;
    earnings[guide.id] = calculateGuideEarnings(paxCount, guide.rank, isTripLeader);
  }

  return earnings;
}
