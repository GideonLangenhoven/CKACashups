# Database Migration Scripts

This directory contains one-time database migration and backfill scripts.

## Available Scripts

### `backfill-trip-leader-earnings.ts`

**Purpose**: Fixes historical data where trip leaders were assigned but didn't receive earnings records.

**Problem it solves**:
- In the past, when a trip was created with a trip leader, the `tripLeaderId` field was set but the trip leader wasn't automatically added to the `guides` array
- This resulted in trip leaders showing as leading trips but having R 0.00 earnings
- Example: Leander showed 1 trip but R 0.00 earnings

**What it does**:
1. Finds all trips where `tripLeaderId` is set
2. Checks if the trip leader has a corresponding `TripGuide` record (earnings)
3. For any missing records, creates them with the correct earnings calculation based on:
   - Guide's rank
   - Total passengers on the trip
   - Trip leader bonus rates

**When to run**:
- After deploying the fix that ensures trip leaders are automatically added to guides array
- To correct all historical data

**How to run**:

On your local machine (if you have database access):
```bash
npx tsx scripts/backfill-trip-leader-earnings.ts
```

On production server via Vercel or SSH:
```bash
pnpm run backfill:trip-leaders
```

**Output**:
The script provides detailed output including:
- Number of trips checked
- Number of trips already correct
- Number of trips fixed
- Any errors encountered
- Details of each fix (trip date, guide name, earnings added)

**Safety**:
- ✅ Safe to run multiple times (idempotent)
- ✅ Only adds missing records, never modifies existing ones
- ✅ Provides detailed logging of all changes
- ✅ Uses the same earnings calculation as the main application

## Running Scripts in Production

### Option 1: Via Vercel CLI (Recommended)
```bash
vercel env pull .env.local
npx tsx scripts/backfill-trip-leader-earnings.ts
```

### Option 2: Via SSH to production server
If your app is hosted on a VPS:
```bash
ssh your-server
cd /path/to/app
pnpm run backfill:trip-leaders
```

### Option 3: Create a temporary API endpoint
For extra safety, you can create a protected admin-only API route that runs the script and then remove it after use.

## Adding New Scripts

When creating new migration scripts:

1. **Use descriptive names**: `backfill-{what-it-fixes}.ts`
2. **Add comprehensive documentation** at the top of the file
3. **Make scripts idempotent**: Safe to run multiple times
4. **Provide detailed logging**: Show what's being changed
5. **Add error handling**: Catch and report errors clearly
6. **Add to package.json**: Create a `npm script` for easy running
7. **Document in this README**: Add to the list above

## Best Practices

- ✅ Always test scripts on a database backup first
- ✅ Review the output carefully before considering it complete
- ✅ Keep scripts after running them (for documentation)
- ✅ Add audit logging for any data changes
- ✅ Make scripts verbose - better too much info than too little
