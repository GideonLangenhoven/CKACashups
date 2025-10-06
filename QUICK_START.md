# GuideCash Reporter - Quick Start Guide

## 🚀 How to Deploy This App

### 1. **Get Gmail App Password**
1. Go to https://myaccount.google.com → Security
2. Enable 2-Step Verification
3. Click "App passwords"
4. Create app password for "Mail" → "Other (CKA Cash Ups)"
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### 2. **Get Your Database Ready**
- Sign up for [Vercel Postgres](https://vercel.com/storage/postgres) or [Supabase](https://supabase.com)
- Copy your PostgreSQL connection string

### 3. **Deploy to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# When prompted, add these environment variables:
# - DATABASE_URL: your postgres connection string
# - JWT_SECRET: run 'openssl rand -base64 32' to generate
# - NEXTAUTH_SECRET: run 'openssl rand -base64 32' to generate
# - NEXTAUTH_URL: https://your-app-name.vercel.app
# - SMTP_HOST: smtp.gmail.com
# - SMTP_PORT: 587
# - SMTP_USER: your-email@gmail.com
# - SMTP_PASS: your-16-char-app-password (no spaces!)
# - ADMIN_EMAILS: admin1@example.com,admin2@example.com
# - TZ: Africa/Johannesburg
```

### 4. **Initialize Database**
```bash
# After deployment, run:
npx prisma db push
```

### 5. **Access Your App**
Visit your Vercel URL and sign in with one of your admin emails!

---

## 📊 How to Test & View Reports

### **Option 1: Download Reports (No Email)**

1. Go to: `https://your-app.vercel.app/admin/reports`
2. Select report type:
   - **Daily** - Shows trips for a specific date
   - **Weekly** - Shows guide statistics with trip counts, dates/times, and cash totals
   - **Monthly** - Summary of all trips in the month
   - **Yearly** - Annual summary
3. Click **"Download PDF"** or **"Download Excel"**
4. View the report on your computer

**What You'll See:**
- **Weekly reports** include per-guide trip tallies with dates, times, and cash amounts
- **All reports** include your logo and date ranges
- **Excel files** have multiple sheets with detailed data

### **Option 2: Send Test Email**

1. Go to: `https://your-app.vercel.app/admin/reports`
2. Select **Weekly** or **Monthly** report type
3. Choose the date/week/month
4. Click **"📧 Send Weekly Email"** or **"📧 Send Monthly Email"**
5. Confirm when prompted
6. Check your inbox (and spam folder!)

**What You'll Get:**
- An email with **both PDF and Excel** attachments
- The email subject shows the period (e.g., "Weekly Cash Ups Report — 2025-W01")
- All admin emails will receive the report
- Email sent from your Gmail account

### **Option 3: Test via Command Line (Advanced)**

```bash
# Test Weekly Report
curl "https://your-app.vercel.app/api/reports/weekly-email?week=2025-W01"

# Test Monthly Report
curl "https://your-app.vercel.app/api/reports/monthly-email?month=2025-01"
```

---

## ⏰ When Will Reports Be Sent Automatically?

Reports are sent automatically based on the schedule in `vercel.json`:

### **Default Schedule:**
- **Weekly Reports**: Every Monday at 8:00 AM
- **Monthly Reports**: Every 29th day of the month at 8:00 AM

### **To Change the Schedule:**

Edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/reports/weekly-email",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

**Cron Format:**
```
┌─ minute (0-59)
│ ┌─ hour (0-23)
│ │ ┌─ day of month (1-31)
│ │ │ ┌─ month (1-12)
│ │ │ │ ┌─ day of week (0-6, Sun=0)
* * * * *
```

**Examples:**
- `0 9 * * 5` = Every Friday at 9:00 AM
- `0 17 1 * *` = 1st of every month at 5:00 PM
- `0 0 * * 0` = Every Sunday at midnight

After editing, commit and push to deploy:
```bash
git add vercel.json
git commit -m "Update cron schedule"
git push
```

Vercel automatically detects and configures the cron jobs!

---

## 📧 Gmail Configuration Notes

### **Using Gmail SMTP:**
- **Host**: smtp.gmail.com
- **Port**: 587 (TLS)
- **Username**: Your full Gmail address
- **Password**: 16-character App Password (NOT your regular password!)

### **Important Gmail Notes:**
- ⚠️ You MUST use an App Password (generate from Google Account → Security)
- ⚠️ 2-Step Verification must be enabled to generate App Passwords
- ⚠️ Remove all spaces from the App Password in environment variables
- ⚠️ Free Gmail: 500 emails/day limit | Google Workspace: 2000 emails/day

### **Common Gmail Issues:**

**"Invalid credentials"**
- Make sure you're using the App Password, not your regular Gmail password
- Remove spaces from the password
- Verify 2-Step Verification is enabled

**Emails going to spam**
- Add the sending email to contacts
- Mark test emails as "Not Spam"
- For production, consider Google Workspace with a custom domain

**How to check if Gmail is working:**
```bash
# Send a test password reset email
curl -X POST https://your-app.vercel.app/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-admin-email@gmail.com"}'
```

Check your inbox. If you receive the email, Gmail SMTP is working! ✅

---

## 🎨 New UI/UX Features

### **Professional Animations:**
- ✨ Smooth button hover effects with ripple animations
- 🎯 Cards lift on hover with shadow transitions
- 📝 Input fields highlight with focus rings
- 🌊 Page content fades in smoothly
- 🎨 Gradient background for modern look

### **Better User Experience:**
- 📅 Click anywhere in date/time fields to open pickers
- 🖱️ Visual feedback on all interactive elements
- 📱 Fully responsive on mobile devices
- ⚡ Fast, smooth transitions throughout

---

## 📋 Quick Testing Checklist

After deployment, test these features:

### ✅ **Basic Functionality**
- [ ] Sign in as admin
- [ ] Create guides with different ranks
- [ ] Submit a test trip
- [ ] View trip details
- [ ] Fill in Trip Report field

### ✅ **Reports**
- [ ] Download a daily PDF report
- [ ] Download a weekly PDF report (verify guide tallies)
- [ ] Download a monthly Excel report
- [ ] Check that logo appears on all reports
- [ ] Verify date ranges are correct

### ✅ **Email Testing**
- [ ] Test password reset email (verifies Gmail SMTP works)
- [ ] Click "📧 Send Weekly Email" button
- [ ] Check inbox for email with attachments
- [ ] Check Gmail Sent folder to confirm delivery
- [ ] Open PDF attachment - verify logo and formatting
- [ ] Open Excel attachment - check data accuracy
- [ ] Verify all admin emails received the report

### ✅ **Automation** (After 1 week)
- [ ] Verify weekly email arrives on Monday
- [ ] Verify monthly email arrives on 29th
- [ ] Check Vercel Dashboard → Functions for cron logs
- [ ] Check Gmail Sent folder for automated sends

---

## 🆘 Common Issues & Solutions

### **Reports are empty**
- Make sure you have created trips in the selected time period
- Check that trips have guides assigned
- Verify trips are not in DRAFT status

### **Gmail "Invalid credentials" error**
- Verify you're using App Password (NOT regular Gmail password)
- Remove all spaces from the App Password
- Make sure 2-Step Verification is enabled
- Try regenerating the App Password

### **Email not received**
- Check spam/junk folder
- Verify SMTP_USER matches the account that generated the App Password
- Check Gmail Sent folder to see if it was sent
- Look for spaces in SMTP_PASS environment variable

### **Cron jobs not running**
- Verify `vercel.json` is committed and pushed
- Check Vercel Dashboard → Settings → Cron Jobs
- View function logs in Vercel Dashboard
- Note: Cron jobs require Vercel Pro plan

### **Database connection errors**
- Verify DATABASE_URL is set in Vercel environment variables
- Run `npx prisma db push` to sync schema
- Check database connection limits

---

## 📞 Support & Documentation

- **Full Deployment Guide**: See `DEPLOYMENT.md`
- **Product Specification**: See `pfd.md`
- **Setup Instructions**: See `SETUP.md`

For urgent issues, contact: **info@kayak.co.za**

---

## 🎯 Next Steps

1. **Generate Gmail App Password** (required for email reports)
2. **Create your first guide users** in the admin panel
3. **Submit test trips** to generate sample data
4. **Download and review** a sample report
5. **Send a test email** to verify Gmail SMTP works
6. **Set up cron jobs** for automated weekly/monthly reports
7. **Monitor the first scheduled send** to ensure it works

---

## 🔐 Security Checklist

Before going to production:

- [ ] Gmail App Password is stored only in environment variables (never in code)
- [ ] JWT_SECRET is 32+ characters and randomly generated
- [ ] NEXTAUTH_SECRET is 32+ characters and randomly generated
- [ ] DATABASE_URL is not exposed in client-side code
- [ ] .env files are in .gitignore
- [ ] Admin emails are correct
- [ ] 2-Step Verification is enabled on Gmail account
- [ ] Test middleware protection (non-admins can't access /admin)

---

## 📨 Gmail App Password Quick Reference

**Generate App Password:**
1. https://myaccount.google.com → Security
2. Enable 2-Step Verification (if not already on)
3. Click "App passwords"
4. Select: Mail → Other (Custom name) → "CKA Cash Ups"
5. Copy the 16-character password
6. **IMPORTANT**: Remove all spaces when adding to .env

**Format**: `abcdefghijklmnop` (16 characters, no spaces)

**Where to use it**:
```bash
SMTP_PASS=abcdefghijklmnop
```

**Common mistakes**:
- ❌ Using Gmail password instead of App Password
- ❌ Including spaces: `abcd efgh ijkl mnop`
- ❌ Not enabling 2-Step Verification first

---

Enjoy your new cash-up reporting system with Gmail! 🎉
