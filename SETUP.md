# Quick Setup Guide

## 1. Find and Edit Your Environment File

**Location:** `/Users/user/Desktop/CKACashups/.env.local`

This file has been created for you. Open it in any text editor and fill in these required values:

### Required Fields:

#### DATABASE_URL
Replace this line:
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

With your PostgreSQL details, for example:
```
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/cka_cashups?schema=public"
```

#### NEXTAUTH_SECRET
Replace `"replace-with-strong-secret"` with a random string.

**Generate one by running this command in your terminal:**
```bash
openssl rand -base64 32
```

Then paste the result:
```
NEXTAUTH_SECRET="your-generated-secret-here"
```

#### GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

**How to get these:**

1. Go to: https://console.cloud.google.com
2. Create a new project (or select existing)
3. Click **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

Paste them in `.env.local`:
```
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

#### ADMIN_EMAILS

Replace with your actual email (use the same email as your Google account):
```
ADMIN_EMAILS="youremail@gmail.com"
```

**You can add multiple emails separated by commas:**
```
ADMIN_EMAILS="admin1@gmail.com,admin2@gmail.com"
```

---

## 2. Install and Run

Open terminal in `/Users/user/Desktop/CKACashups/` and run:

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

---

## 3. First Login

1. Open browser: http://localhost:3000
2. Click **Sign In**
3. Sign in with Google using the email you added to `ADMIN_EMAILS`
4. You'll automatically become the first admin

---

## File Locations Summary

| What | Where |
|------|-------|
| **Environment file to edit** | `/Users/user/Desktop/CKACashups/.env.local` |
| **Logo file** | `/Users/user/Desktop/CKACashups/public/CKAlogo.png` ✓ |
| **Project folder** | `/Users/user/Desktop/CKACashups/` |

---

## Troubleshooting

**Can't connect to database?**
- Make sure PostgreSQL is running
- Check your DATABASE_URL has correct username, password, host, and database name

**Google login fails?**
- Verify redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`
- Make sure your ADMIN_EMAILS matches the Google account you're signing in with

**Port 3000 already in use?**
- Kill the process using port 3000 or change the port in package.json
