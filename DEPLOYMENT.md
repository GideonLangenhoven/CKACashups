# GuideCash Reporter - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Gmail Setup for Email Reports](#gmail-setup-for-email-reports)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Deployment to Vercel](#deployment-to-vercel)
6. [Automated Report Scheduling](#automated-report-scheduling)
7. [Testing Reports](#testing-reports)
8. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

Before deploying, ensure you have:
- A Vercel account (https://vercel.com)
- A PostgreSQL database (we recommend Vercel Postgres or Supabase)
- A Gmail account for sending email reports
- Git repository with your code

---

## Gmail Setup for Email Reports

### 1. Enable 2-Step Verification (Required)

1. Go to your Google Account: https://myaccount.google.com
2. Click **Security** in the left sidebar
3. Under "Signing in to Google," click **2-Step Verification**
4. Follow the steps to enable 2-Step Verification

### 2. Generate App Password

1. Still in **Security**, scroll to "Signing in to Google"
2. Click **App passwords** (you'll only see this if 2-Step Verification is on)
3. Select app: **Mail**
4. Select device: **Other (Custom name)**
5. Enter name: **CKA Cash Ups**
6. Click **Generate**
7. Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)
8. **Important:** Save this password - you won't see it again!

### 3. What You'll Need

From your Gmail setup, you'll need:
- **SMTP_HOST**: `smtp.gmail.com`
- **SMTP_PORT**: `587`
- **SMTP_USER**: Your full Gmail address (e.g., `your-email@gmail.com`)
- **SMTP_PASS**: The 16-character app password you just generated

---

## Environment Setup

### 1. Create a `.env` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
NEXTAUTH_SECRET="another-random-secret-key-min-32-chars"
NEXTAUTH_URL="https://your-app.vercel.app"

# Gmail SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-char-app-password"

# Google OAuth (Optional - for enhanced authentication)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Admin Configuration
ADMIN_EMAILS="admin1@example.com,admin2@example.com"

# Timezone & Branding
TZ="Africa/Johannesburg"
BRAND_PRIMARY="#0A66C2"
BRAND_ACCENT="#0B84F3"

# Email Schedule Configuration
EMAIL_DAY_OF_MONTH="29"
EMAIL_HOUR_LOCAL="08"
```

### 2. Generate Secure Secrets

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

Copy the outputs and use them for the respective environment variables.

### 3. Important Notes

- **SMTP_PASS**: Use the App Password from Gmail (NOT your regular Gmail password)
- **ADMIN_EMAILS**: Comma-separated list of emails that will:
  - Have admin access to the dashboard
  - Receive automated reports
- **TZ**: Set to your local timezone (e.g., "Africa/Johannesburg", "America/New_York")
- **EMAIL_DAY_OF_MONTH**: Day of the month to send monthly reports (1-31)
- **EMAIL_HOUR_LOCAL**: Hour of the day to send reports (0-23, in your local timezone)

---

## Database Setup

### 1. Get a PostgreSQL Database

**Option A: Vercel Postgres** (Recommended)
1. Go to https://vercel.com/storage
2. Create a new Postgres database
3. Copy the connection string

**Option B: Supabase**
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (use "Connection pooling" for serverless)

### 2. Push the Prisma schema to your database:

```bash
npx prisma db push
```

### 3. Verify database connection:

```bash
npx prisma studio
```

This opens a web interface to browse your database.

---

## Deployment to Vercel

### Option 1: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure environment variables (see below)
4. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Setting Environment Variables in Vercel

**Critical: Add ALL environment variables from your `.env` file**

Go to your Vercel project → Settings → Environment Variables and add:

**Required Variables:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-here
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://your-app.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAILS=admin1@example.com,admin2@example.com
TZ=Africa/Johannesburg
```

**Optional Variables:**
```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
BRAND_PRIMARY=#0A66C2
BRAND_ACCENT=#0B84F3
EMAIL_DAY_OF_MONTH=29
EMAIL_HOUR_LOCAL=08
```

**Important Notes:**
- Make sure there are NO spaces in comma-separated lists
- Use the exact 16-character app password from Gmail (no spaces)
- For NEXTAUTH_URL, use your actual Vercel URL (e.g., `https://cashups.vercel.app`)

---

## Automated Report Scheduling

### Setting Up Vercel Cron Jobs

**1. The `vercel.json` file is already configured:**

```json
{
  "crons": [
    {
      "path": "/api/reports/weekly-email",
      "schedule": "0 8 * * 1"
    },
    {
      "path": "/api/reports/monthly-email",
      "schedule": "0 8 29 * *"
    }
  ]
}
```

**Default Schedule:**
- **Weekly**: Every Monday at 8:00 AM (your local timezone)
- **Monthly**: Every 29th day at 8:00 AM (your local timezone)

**2. Customize the Schedule (Optional)**

Edit `vercel.json` to change when reports are sent:

```
┌───────────── minute (0 - 59)
│ ┌─────────── hour (0 - 23)
│ │ ┌───────── day of month (1 - 31)
│ │ │ ┌─────── month (1 - 12)
│ │ │ │ ┌───── day of week (0 - 6, Sunday = 0)
│ │ │ │ │
* * * * *
```

**Examples:**
- `0 9 * * 5` = Every Friday at 9:00 AM
- `0 17 1 * *` = 1st of every month at 5:00 PM
- `0 0 * * 0` = Every Sunday at midnight
- `0 8 15,30 * *` = 15th and 30th of every month at 8:00 AM

**3. Deploy the Changes:**

```bash
git add vercel.json
git commit -m "Update cron schedule"
git push
```

Vercel automatically detects and configures the cron jobs!

**4. Verify Cron Jobs are Active:**

1. Go to Vercel Dashboard → Your Project
2. Click **Settings** → **Cron Jobs**
3. You should see your configured cron jobs listed

---

## Testing Reports

### 1. Test Gmail SMTP Connection

Before testing reports, verify Gmail is working:

```bash
# This should send a password reset email
curl -X POST https://your-app.vercel.app/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-admin-email@gmail.com"}'
```

Check your inbox. If you receive the email, Gmail SMTP is working! ✅

### 2. Testing Report Generation (Download Only)

**Weekly Report:**
```bash
# Download current week PDF
curl "https://your-app.vercel.app/api/reports/weekly?week=2025-W01&format=pdf" -o weekly.pdf

# Download current week Excel
curl "https://your-app.vercel.app/api/reports/weekly?week=2025-W01&format=xlsx" -o weekly.xlsx
```

**Monthly Report:**
```bash
# Download current month PDF
curl "https://your-app.vercel.app/api/reports/monthly?month=2025-01&format=pdf" -o monthly.pdf

# Download current month Excel
curl "https://your-app.vercel.app/api/reports/monthly?month=2025-01&format=xlsx" -o monthly.xlsx
```

### 3. Testing Email Reports (Sends Actual Email)

**Test Weekly Email:**
```bash
# Send weekly report for current week
curl "https://your-app.vercel.app/api/reports/weekly-email"

# Send for specific week
curl "https://your-app.vercel.app/api/reports/weekly-email?week=2025-W01"
```

**Test Monthly Email:**
```bash
# Send monthly report for current month
curl "https://your-app.vercel.app/api/reports/monthly-email"

# Send for specific month
curl "https://your-app.vercel.app/api/reports/monthly-email?month=2025-01"
```

### 4. Preview Reports in Browser (Easiest Method!)

1. Sign in to your app as an admin
2. Go to: `https://your-app.vercel.app/admin/reports`
3. Select report type (Daily/Weekly/Monthly/Yearly)
4. Choose the date/week/month/year
5. Click **"Download PDF"** or **"Download Excel"** to preview
6. Click **"📧 Send Weekly Email"** or **"📧 Send Monthly Email"** to send a test

This lets you see exactly what will be sent in automated emails!

### 5. Verify Email Delivery

**Check Gmail Sent Folder:**
1. Log into the Gmail account you're using for SMTP
2. Check the "Sent" folder
3. You should see the sent reports

**Check Recipient Inboxes:**
1. Check all admin email inboxes
2. Look in spam/junk folders if you don't see them
3. Mark as "Not Spam" if needed

---

## Troubleshooting Gmail Issues

### "Invalid credentials" or "Username and Password not accepted"

**Solution:**
1. Verify you're using an **App Password**, NOT your regular Gmail password
2. The app password should be 16 characters (4 groups of 4)
3. Remove all spaces from the password in your environment variables
4. Make sure 2-Step Verification is enabled on your Google Account

### "Authentication failed" or "SMTP error"

**Solution:**
1. Double-check SMTP settings:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: Your full Gmail address
   - Pass: 16-character app password (no spaces)
2. Try regenerating the app password
3. Check that your Gmail account isn't locked or restricted

### Emails going to spam

**Solution:**
1. Add the sending email to your contacts
2. Mark test emails as "Not Spam"
3. For production: Consider setting up a custom domain with Gmail

### "Daily sending limit exceeded"

Gmail has limits:
- **Free Gmail**: 500 emails per day
- **Google Workspace**: 2000 emails per day

**Solution:**
- Use a Google Workspace account for higher limits
- Reduce the number of recipients
- Consider using a dedicated email service for high volume

---

## Post-Deployment Checklist

### ✅ **Initial Setup**
- [ ] Database is connected and migrations are applied
- [ ] Admin emails are configured correctly
- [ ] Gmail App Password is generated and added to environment variables
- [ ] Sign in as admin and verify access to admin dashboard
- [ ] Create initial guides with different ranks

### ✅ **Test Email Configuration**
- [ ] Send password reset email (test SMTP connection)
- [ ] Verify email arrives in inbox
- [ ] Check sender appears as "CKA Cash Ups"
- [ ] Check email doesn't go to spam

### ✅ **Test Core Functionality**
- [ ] Create a test trip as a guide
- [ ] View trip details and download single trip PDF
- [ ] Update guide ranks from admin panel
- [ ] Test trip status changes (Draft → Submitted → Approved)
- [ ] Fill in Trip Report field and verify it saves

### ✅ **Test Reporting**
- [ ] Generate a daily report (PDF and Excel)
- [ ] Generate a weekly report (PDF and Excel)
- [ ] Generate a monthly report (PDF and Excel)
- [ ] Verify logo appears on all reports
- [ ] Verify date ranges are correct
- [ ] Check guide trip tallies are accurate in weekly reports

### ✅ **Test Email Reports**
- [ ] Use "Send Weekly Email" button in admin/reports
- [ ] Verify email arrives with PDF and Excel attachments
- [ ] Check all admin emails receive the reports
- [ ] Open attachments and verify data is correct
- [ ] Test monthly email report

### ✅ **Test Cron Jobs**
- [ ] Verify `vercel.json` is deployed
- [ ] Check Vercel Dashboard → Settings → Cron Jobs
- [ ] Wait for first scheduled execution (or trigger manually)
- [ ] Confirm emails are sent on schedule
- [ ] Check Vercel function logs for any errors

### ✅ **Security & Performance**
- [ ] Verify JWT_SECRET is set and secure (32+ characters)
- [ ] Confirm DATABASE_URL is not exposed in client-side code
- [ ] Test middleware protection (try accessing /admin as non-admin)
- [ ] Check that inactive users cannot sign in
- [ ] Verify HTTPS is enabled (automatic with Vercel)
- [ ] Ensure Gmail app password is not committed to Git

### ✅ **User Experience**
- [ ] Test on mobile device
- [ ] Test PWA installation (Add to Home Screen)
- [ ] Verify offline capability (service worker caching)
- [ ] Check that animations and hover effects work
- [ ] Test date/time picker popups
- [ ] Verify "Additional Checks" section appears correctly
- [ ] Test Trip Report field

---

## Monitoring & Maintenance

### Monitor Email Delivery

**Check Gmail Sent Folder:**
- Review sent emails to ensure reports are going out
- Check for bounce-backs or delivery failures

**Monitor Cron Job Execution:**
```bash
# View Vercel logs
vercel logs

# Filter for report endpoints
vercel logs --filter="/api/reports"
```

### Regular Maintenance Tasks

**Daily:**
- Check that automated reports are being sent

**Weekly:**
- Check audit logs for unusual activity
- Review any failed email deliveries
- Verify cron jobs executed successfully

**Monthly:**
- Review and archive old audit logs (if needed)
- Check database backup status
- Update dependencies: `npm update`
- Verify Gmail app password still works

**Quarterly:**
- Review and update environment variables
- Rotate JWT_SECRET if needed (requires all users to re-login)
- Check for Next.js and Prisma updates
- Regenerate Gmail app password (security best practice)

---

## Email Configuration Reference

### Current Setup:
- **Provider**: Gmail SMTP
- **Host**: smtp.gmail.com
- **Port**: 587 (TLS)
- **Authentication**: App Password
- **Daily Limit**: 500 emails (free Gmail) / 2000 (Google Workspace)

### Environment Variables:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
ADMIN_EMAILS=recipient1@example.com,recipient2@example.com
```

### Fallback Option:
The system supports Resend as a fallback. If you want to switch:
1. Sign up at https://resend.com
2. Add `RESEND_API_KEY` to environment variables
3. The system will prefer SMTP but fall back to Resend if SMTP fails

---

## Support

For issues or questions:
- Check application logs: `vercel logs`
- Review Gmail sent folder for delivery confirmation
- Check spam folders if emails aren't arriving
- Verify environment variables in Vercel Dashboard
- Contact support: info@kayak.co.za

---

## Quick Reference Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Database operations
npx prisma studio          # Browse database
npx prisma db push         # Push schema changes
npx prisma migrate dev     # Create migration

# Test email locally
curl "http://localhost:3001/api/reports/weekly-email"
curl "http://localhost:3001/api/reports/monthly-email"

# Test email in production
curl "https://your-app.vercel.app/api/reports/weekly-email"
curl "https://your-app.vercel.app/api/reports/monthly-email"

# View logs
vercel logs
vercel logs --follow       # Live logs
vercel logs --filter="/api/reports"  # Filter report logs
```

---

## Gmail App Password Cheat Sheet

**How to Generate:**
1. Google Account → Security
2. Enable 2-Step Verification (if not already on)
3. Go to App passwords
4. Select "Mail" and "Other (Custom name)"
5. Name it "CKA Cash Ups"
6. Copy the 16-character password

**Common Issues:**
- ❌ Using regular Gmail password instead of app password
- ❌ Including spaces in the app password
- ❌ 2-Step Verification not enabled
- ❌ Wrong Gmail address (must match the account that generated the app password)

**Security Tips:**
- Never commit app passwords to Git
- Store in environment variables only
- Regenerate every 3-6 months
- Delete unused app passwords
- Don't share the app password

---

## Next Steps After Deployment

1. **Set up your guides** in the admin panel
2. **Create test trips** to verify everything works
3. **Send a test email report** using the admin dashboard
4. **Wait for first scheduled report** to confirm cron jobs work
5. **Monitor email delivery** for the first few days
6. **Train your team** on how to use the system

Enjoy your automated cash-up reporting system! 🎉
