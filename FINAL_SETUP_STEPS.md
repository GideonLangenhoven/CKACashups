# Final Vercel Setup Steps

## ✅ Completed Steps

I've successfully set up the following environment variables in your Vercel project:

- ✅ NEXTAUTH_SECRET
- ✅ NEXTAUTH_URL
- ✅ SMTP_HOST
- ✅ SMTP_PORT
- ✅ SMTP_USER
- ✅ SMTP_PASS
- ✅ ADMIN_EMAILS
- ✅ BRAND_PRIMARY
- ✅ BRAND_ACCENT
- ✅ EMAIL_DAY_OF_MONTH
- ✅ EMAIL_HOUR_LOCAL

## 🔴 Remaining Steps (YOU NEED TO DO THIS)

### Step 1: Create Vercel Postgres Database

The Vercel CLI doesn't support creating Postgres databases from the command line in the current version, so you need to create it via the dashboard:

1. **Go to your project's Storage page:**
   👉 https://vercel.com/gideonlangenhovens-projects/y/stores

2. **Click "Create Database"**

3. **Select "Postgres"**

4. **Configure the database:**
   - Name: `cka-cashups-db` (or any name you prefer)
   - Region: Choose the region closest to your users (e.g., `iad1` for US East)
   - Click **Create**

5. **Connect the database to your project:**
   - After creation, click "Connect to Project"
   - Select project: **y**
   - Click **Connect**

6. **This will automatically add the following environment variables:**
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL` (this is used as DATABASE_URL by Prisma)
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

### Step 2: Deploy to Production

Once the database is connected, deploy your app:

**Option A: Using Vercel CLI (from this directory)**
```bash
cd "/Users/user/Desktop/CKACashups 3"
vercel --prod
```

**Option B: Using Vercel Dashboard**
1. Go to: https://vercel.com/gideonlangenhovens-projects/y
2. Click **"Redeploy"** on the latest deployment
3. Make sure to **uncheck "Use existing Build Cache"** to ensure migrations run
4. Click **Redeploy**

### Step 3: Verify the Deployment

1. **Wait for the deployment to complete** (usually 2-3 minutes)

2. **Visit your app:**
   - Production URL: https://y-rose-seven.vercel.app
   - Or: https://y-gideonlangenhovens-projects.vercel.app

3. **You should see the login page!**

4. **Try signing in:**
   - Enter your email and name
   - The app will create an account for you automatically

5. **Check the logs if there are issues:**
   ```bash
   vercel logs --follow
   ```
   Or visit: https://vercel.com/gideonlangenhovens-projects/y/logs

## 🔍 Troubleshooting

### If migrations fail during build:

The build script includes `prisma migrate deploy`, which will run all migrations automatically. If this fails:

1. Check the build logs in Vercel dashboard
2. The DATABASE_URL might not be set - ensure the Postgres database is connected to project
3. Make sure you connected the database to the **y** project (not cka-cashups)

### If you can't sign in:

1. Check browser console for errors
2. Check Vercel function logs: https://vercel.com/gideonlangenhovens-projects/y/logs
3. Verify NEXTAUTH_SECRET is set: `vercel env ls`
4. Verify database is connected and migrations ran

### If you get "500 Internal Server Error":

1. Check function logs for specific error
2. Most likely database connection issue
3. Verify `POSTGRES_PRISMA_URL` exists in environment variables

## 📊 Project URLs

- **Production**: https://y-rose-seven.vercel.app
- **Dashboard**: https://vercel.com/gideonlangenhovens-projects/y
- **Storage**: https://vercel.com/gideonlangenhovens-projects/y/stores
- **Logs**: https://vercel.com/gideonlangenhovens-projects/y/logs
- **Environment Variables**: https://vercel.com/gideonlangenhovens-projects/y/settings/environment-variables

## ✅ Success Checklist

- [ ] Vercel Postgres database created
- [ ] Database connected to project "y"
- [ ] Deployed to production (migrations ran successfully)
- [ ] Can access login page at production URL
- [ ] Can sign in and create account
- [ ] Can create a new cash-up
- [ ] Can view trips list

---

**Once you complete Step 1 (creating the database), just run:**
```bash
cd "/Users/user/Desktop/CKACashups 3"
vercel --prod
```

**And your app will be fully deployed and working! 🎉**
