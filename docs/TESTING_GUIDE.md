# CKA Cashups - Testing Guide

This guide will help you set up and test the application from scratch.

---

## Step 1: Locate the Environment File Template

**Location:** `/Users/user/Desktop/CKACashups/.env.example`

This file contains all the environment variables you need to configure.

---

## Step 2: Create Your Local Environment File

1. **In the project root directory** (`/Users/user/Desktop/CKACashups/`), create a new file called `.env.local`
2. Copy all contents from `.env.example` into `.env.local`
3. Fill in the required values (see Step 3)

**Quick command to create the file:**
```bash
cp .env.example .env.local
```

---

## Step 3: Fill in Environment Variables

Open `.env.local` and configure the following:

### Required Variables:

#### 1. DATABASE_URL
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```
- Replace `USER`, `PASSWORD`, `HOST`, `PORT`, and `DATABASE` with your PostgreSQL credentials
- Example: `postgresql://postgres:mypassword@localhost:5432/cka_cashups?schema=public`

#### 2. NEXTAUTH_SECRET
```
NEXTAUTH_SECRET="your-long-random-string-here"
```
- Generate a secure random string (at least 32 characters)
- **Quick generation command:**
  ```bash
  openssl rand -base64 32
  ```

#### 3. NEXTAUTH_URL
```
NEXTAUTH_URL="http://localhost:3000"
```
- Keep as-is for local development

#### 4. Google OAuth Credentials

**Where to get them:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy the Client ID and Client Secret

```
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

#### 5. ADMIN_EMAILS
```
ADMIN_EMAILS="admin1@example.com,admin2@example.com"
```
- Use comma-separated email addresses
- **Important:** Use an email you have access to (preferably your Google account email)
- This email will be used to sign in and create the first admin user

### Optional Variables:

#### 6. RESEND_API_KEY (for scheduled emails)
```
RESEND_API_KEY="re_xxxxxxxxxxxxx"
```
- Only needed if you want to test scheduled email functionality
- Get from [resend.com](https://resend.com)

---

## Step 4: Install Dependencies

In the project root directory, run:

```bash
npm install
```

**Expected outcome:** All dependencies from `package.json` should install without errors.

---

## Step 5: Set Up Database

Run the Prisma migration to create database tables:

```bash
npx prisma migrate dev --name init
```

**What this does:**
- Creates all necessary database tables
- Sets up the schema based on your Prisma configuration

**Expected outcome:** Migration completes successfully with confirmation message.

---

## Step 6: Add Your Logo

1. Locate your logo file (should be a square PNG)
2. **Rename it to:** `CKAlogo.png`
3. **Place it in:** `/Users/user/Desktop/CKACashups/public/CKAlogo.png`

**Note:** There's already a file named `CKALOGO.png` in the public folder. You may need to:
- Replace it with your own logo, or
- Rename it to `CKAlogo.png` (lowercase 'logo')

---

## Step 7: Start the Development Server

Run:

```bash
npm run dev
```

**Expected outcome:**
- Server starts on `http://localhost:3000`
- No compilation errors

---

## Step 8: Test Authentication & Admin Bootstrap

1. **Open your browser** and navigate to: `http://localhost:3000`
2. **Click "Sign In"** (or navigate to the login page)
3. **Sign in with Google** using one of the email addresses you added to `ADMIN_EMAILS`
4. **First sign-in:** This should automatically bootstrap you as the first admin user

**What to verify:**
- ✓ Sign-in completes successfully
- ✓ You're redirected to the dashboard/home page
- ✓ You have admin privileges (check if you can access admin features)

---

## Step 9: Test Core Functionality

Once logged in, test the following:

### Basic Navigation
- [ ] Dashboard loads without errors
- [ ] All menu items are accessible
- [ ] Logo displays correctly

### Cashup Features
- [ ] Can create a new cashup
- [ ] Can view existing cashups
- [ ] Can edit/update cashups
- [ ] Can delete cashups (if applicable)

### Admin Features (if applicable)
- [ ] Can access admin panel
- [ ] Can manage users
- [ ] Can view reports

### Data Persistence
- [ ] Create a test record
- [ ] Refresh the page
- [ ] Verify the record still exists (database is working)

---

## Step 10: Test Scheduled Emails (Optional)

If you configured `RESEND_API_KEY`:

1. Verify the email settings:
   - `EMAIL_DAY_OF_MONTH="29"` (day of month when emails send)
   - `EMAIL_HOUR_LOCAL="08"` (8 AM in your timezone)
   - `TZ="Africa/Johannesburg"` (your timezone)

2. Test email functionality through the app interface (if available)

---

## Troubleshooting Checklist

### Server won't start:
- [ ] Check `.env.local` exists and has all required variables
- [ ] Run `npm install` again
- [ ] Check for port conflicts (port 3000 in use?)

### Database errors:
- [ ] Verify PostgreSQL is running
- [ ] Check `DATABASE_URL` credentials are correct
- [ ] Try running migrations again: `npx prisma migrate reset`

### Authentication fails:
- [ ] Verify Google OAuth redirect URI matches exactly: `http://localhost:3000/api/auth/callback/google`
- [ ] Check `NEXTAUTH_SECRET` is set
- [ ] Confirm email in `ADMIN_EMAILS` matches your Google account

### Logo doesn't appear:
- [ ] Check filename is exactly `CKAlogo.png` (case-sensitive)
- [ ] Verify file is in `/Users/user/Desktop/CKACashups/public/`
- [ ] Try clearing browser cache

---

## Quick Reference: File Locations

| Item | Location |
|------|----------|
| Environment template | `/Users/user/Desktop/CKACashups/.env.example` |
| Your environment file | `/Users/user/Desktop/CKACashups/.env.local` |
| Logo file | `/Users/user/Desktop/CKACashups/public/CKAlogo.png` |
| Project root | `/Users/user/Desktop/CKACashups/` |

---

## Complete Setup Command Sequence

```bash
# Navigate to project
cd /Users/user/Desktop/CKACashups

# Create environment file
cp .env.example .env.local

# Edit .env.local with your values
# (use your preferred text editor)

# Install dependencies
npm install

# Set up database
npx prisma migrate dev --name init

# Start development server
npm run dev
```

**Then:** Open `http://localhost:3000` and sign in with your admin email.

---

## Success Criteria

Your app is running well when:
- ✅ Server starts without errors
- ✅ You can sign in with Google
- ✅ Dashboard/home page loads
- ✅ You can create and view cashup records
- ✅ Data persists after page refresh
- ✅ Logo displays correctly
- ✅ No console errors in browser developer tools
