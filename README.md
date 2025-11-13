CKA Cash Ups — App

Quick start
- Prereqs: Node 18+, PostgreSQL URL
- Copy `.env.example` to `.env.local` and fill values.
- Install deps: `npm install`
- Generate Prisma client: `npm run prisma:generate`
- Apply schema (create DB): `npx prisma migrate dev --name init`
- Run dev: `npm run dev`

Environment
- `DATABASE_URL` Postgres connection
- `NEXTAUTH_SECRET` random string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` OAuth from Google
- `ADMIN_EMAILS` comma-separated list; first admin can sign in immediately
- `TZ` defaults to `Africa/Johannesburg`
- Optional email: `RESEND_API_KEY` (or implement SMTP in `lib/sendMail.ts`)

Features
- Google sign-in; invite-only users
- Wizard form for cash ups (trip basics → guides+pax → payments+flags)
- Admin panel: manage guides, list trips, export reports
- Exports: PDF and Excel per month at `/admin/reports`
- PWA installable with offline asset cache; form drafts saved locally

QA automation
- `npm run qa:guide-journey` replays the guide workflow end-to-end. It requires `DATABASE_URL` to point at the Neon (or other) database and will:
  1. Pick two active guides with linked accounts
  2. Create a temporary trip as the admin user, verifying guide earnings and “My Trips” tallies
  3. Snapshot monthly reporting totals
  4. Clean up the QA trip so production data stays unchanged
- Use it after schema/data changes to prove guides can be added to trips and invoice totals/reporting stay correct.

Scheduled report email
- Configure Vercel Cron to GET `/api/reports/monthly-email?month=YYYY-MM` on the 29th 08:00 SAST
- Recipients come from `ADMIN_EMAILS`

Branding
- Place your logo at `public/CKAlogo.png`
