# Vercel Deployment Setup Guide

## Step 1: Create Vercel Postgres Database

1. Go to your Vercel dashboard: https://vercel.com/gideonlangenhovens-projects/y
2. Click on the **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Name it: `cka-cashups-db`
6. Select your preferred region (choose closest to your users)
7. Click **Create**
8. Once created, click **Connect** to your project
9. Select your project `y` and click **Connect**

This will automatically add these environment variables to your project:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` ← This is what we need for DATABASE_URL
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## Step 2: Add Additional Environment Variables

Go to: https://vercel.com/gideonlangenhovens-projects/y/settings/environment-variables

Add these variables (one by one):

### Required Variables:

**DATABASE_URL**
- Value: This will be auto-populated as `POSTGRES_PRISMA_URL` when you connect the database
- If not, copy the value from `POSTGRES_PRISMA_URL` variable
- Environment: Production, Preview, Development

**NEXTAUTH_SECRET**
- Value: `g+ysHMZwCXQs/9lKsmDx1p9LTeLu+J9WHFvNkvw+yA4=`
- Environment: Production, Preview, Development

**NEXTAUTH_URL**
- Value: `https://y-70t7qllwf-gideonlangenhovens-projects.vercel.app`
- Environment: Production
- (For Preview/Development, you can use different URLs or leave empty)

### Optional Variables (for email functionality):

**SMTP_HOST**
- Value: `smtp.gmail.com`
- Environment: Production

**SMTP_PORT**
- Value: `587`
- Environment: Production

**SMTP_USER**
- Value: `gidslang89@gmail.com`
- Environment: Production

**SMTP_PASS**
- Value: `lnlr hgqq hmoy rkqv`
- Environment: Production

**ADMIN_EMAILS**
- Value: `gidslang89@gmail.com,info@kayak.co.za`
- Environment: Production

**TZ**
- Value: `Africa/Johannesburg`
- Environment: Production

**BRAND_PRIMARY**
- Value: `#0A66C2`
- Environment: Production

**BRAND_ACCENT**
- Value: `#0B84F3`
- Environment: Production

**EMAIL_DAY_OF_MONTH**
- Value: `29`
- Environment: Production

**EMAIL_HOUR_LOCAL**
- Value: `08`
- Environment: Production

## Step 3: Run Database Migrations

Once the database is created and connected, you need to run Prisma migrations to set up the schema.

### Option A: Via Vercel CLI (if you can link the project)
```bash
vercel env pull .env.production
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### Option B: Manual approach
1. Get the `POSTGRES_PRISMA_URL` from Vercel dashboard
2. Run locally:
```bash
DATABASE_URL="<your-postgres-prisma-url>" npx prisma migrate deploy
```

### Option C: Add a build command (Recommended)
The `package.json` already has `postinstall: prisma generate`, but we should also run migrations on deployment.

Create a new script in package.json or add to build:
```json
"build": "prisma migrate deploy && prisma generate && next build"
```

## Step 4: Redeploy

After all environment variables are set:

1. Go to Deployments tab: https://vercel.com/gideonlangenhovens-projects/y/deployments
2. Click on the latest deployment
3. Click **Redeploy** → **Use existing Build Cache** (uncheck) → **Redeploy**

OR use CLI:
```bash
vercel --prod
```

## Step 5: Verify

1. Visit your app: https://y-70t7qllwf-gideonlangenhovens-projects.vercel.app
2. You should see the login page
3. Try signing in with your email and name
4. Check Vercel logs if there are any errors

## Troubleshooting

If you get database errors:
1. Check that `DATABASE_URL` or `POSTGRES_PRISMA_URL` is set
2. Make sure migrations ran successfully
3. Check Vercel function logs for specific errors

If you can't sign in:
1. Check that `NEXTAUTH_SECRET` is set
2. Check browser console for errors
3. Check Vercel function logs for the signin API route

---

## Quick Setup Commands (if CLI works)

```bash
# Link project
vercel link --yes

# Pull environment variables (after setting them in dashboard)
vercel env pull

# Run migrations
npx prisma migrate deploy

# Deploy
vercel --prod
```
