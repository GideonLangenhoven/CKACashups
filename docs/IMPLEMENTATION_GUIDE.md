# CKA Cash Ups — Implementation Guide

This guide documents how to set up, run, and deploy the CKA Cash Ups application, along with a concise overview of the architecture and common operational workflows.

## Overview
- Purpose: Track daily cash ups with a guided wizard, calculate guide fees, and export monthly reports (PDF/Excel) with optional scheduled email delivery.
- Stack: Next.js 14 (App Router), TypeScript, Prisma (PostgreSQL), NextAuth (Google OAuth), SWR (client data fetching), pdfmake (PDF), ExcelJS (Excel), PWA (service worker/manifest).

## Prerequisites
- Node.js 18+
- PostgreSQL database URL
- Google OAuth client (for NextAuth)
- Optional: Resend API key (for scheduled report email delivery)

## Repository Layout
- App entry and routes: `app/`
  - Global layout: `app/layout.tsx`
  - Home redirect: `app/page.tsx`
  - Auth UI: `app/auth/signin/page.tsx`
  - Cash up wizard: `app/trips/new/page.tsx`
  - Trips list/detail: `app/trips/page.tsx`, `app/trips/[id]/page.tsx`
  - Admin features: `app/admin/*` (guides, rates, invites, reports, trips)
  - API routes: `app/api/*`
- Data layer: `lib/prisma.ts` (Prisma client), `prisma/schema.prisma` (models)
- Auth config: `lib/auth.ts`, middleware: `middleware.ts`
- PWA: `public/manifest.json`, `public/service-worker.js`
- Styling: `app/globals.css`
- Env template: `.env.example`
- Quick start: `README.md`

Note: The `cka-cashups/` folder is a separate Vite template and not used by this Next.js app.

## Environment Configuration
Copy `.env.example` to `.env.local` and set values:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Strong random string
- `NEXTAUTH_URL`: Base URL for auth callbacks (e.g., `http://localhost:3000` or your production URL)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: From Google Cloud Console (OAuth consent + Web client)
- `ADMIN_EMAILS`: Comma-separated admin emails (bootstrap first admin)
- `RESEND_API_KEY`: Optional; enables report email delivery via Resend
- `TZ`: Timezone for date handling (defaults to `Africa/Johannesburg`)
- `BRAND_PRIMARY`, `BRAND_ACCENT`: Branding colors (used in meta/theme and docs)
- Optional SMTP vars are present but not wired; Resend is used by default in `lib/sendMail.ts`

## Local Development
1) Install dependencies
- `npm install` (see `README.md:6`)

2) Generate Prisma client
- `npm run prisma:generate` (`package.json:5`)

3) Create and migrate the database
- Dev schema/apply: `npx prisma migrate dev --name init` (`README.md:7`)
  - For existing DBs in other environments, use `npm run prisma:migrate` to `deploy` (`package.json:10`).

4) Run the app
- `npm run dev` (Next.js dev server at `http://localhost:3000`) (`README.md:8`)

5) Sign in
- Visit `/auth/signin` and use a Google account listed in `ADMIN_EMAILS` or invited by an admin.

## Data Model (Prisma)
Key models in `prisma/schema.prisma`:
- `User`, `Guide` (ranked: SENIOR/INTERMEDIATE/JUNIOR)
- `Trip`, with related `PaymentBreakdown`, `DiscountLine`, and `TripGuide`
- `AuditLog`, `Setting`

## Authentication and Authorization
- NextAuth Google OAuth configured in `lib/auth.ts` and `app/api/auth/[...nextauth]/route.ts`.
- Access control via middleware for `/trips`, `/admin`, and `/api` routes (`middleware.ts`):
  - Admins (role `ADMIN`) can access admin endpoints/pages
  - Regular users (role `USER`) can access their own trips
- Admin bootstrap: if a Google account email matches `ADMIN_EMAILS`, it is upserted with `ADMIN` role on first sign-in (`lib/auth.ts:17`).

## Admin Features
- Manage guides: list/add/deactivate (`app/admin/guides/page.tsx`), API in `app/api/guides/*`
- View trips: search/filter all trips, set statuses (`app/admin/trips/page.tsx` -> `app/api/trips/[id]/route.ts`)
- Reports: download daily/monthly/yearly PDF/Excel; set scheduled email (`app/admin/reports/page.tsx`)
- Audit logs: CSV export at `/api/audit-logs`

## Cash Up Workflow (User)
- Create new cash up at `/trips/new`
  1) Trip basics: date, lead name, optional pax guide notes
  2) Guides & pax: select guides, enter per-guide pax
  3) Payments & flags: capture payments, any discounts, and post-trip flags
- Drafts auto-save to local storage; submitting creates a `Trip` and related records via `POST /api/trips`.
- View your submissions in `/trips` and details at `/trips/[id]`.

## Reports
- On-demand monthly report:
  - PDF: `GET /api/reports/monthly?month=YYYY-MM&format=pdf` (default `pdf`)
  - Excel: `GET /api/reports/monthly?month=YYYY-MM&format=xlsx`
- Scheduled email delivery:
  - Endpoint: `GET /api/reports/monthly-email?month=YYYY-MM`
  - Recipients: `ADMIN_EMAILS` env var
  - Email provider: Resend via `RESEND_API_KEY` (`lib/sendMail.ts`)
  - Configure a cron (e.g., Vercel) for the 29th 08:00 SAST

## PWA & Branding
- PWA manifest: `public/manifest.json`
- Service worker: `public/service-worker.js` (basic offline-first cache)
- Branding: place your logo at `public/CKAlogo.png` (`app/layout.tsx:17`, `public/manifest.json:9`)

## Scripts
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm start` — start production server
- `npm run prisma:generate` — generate Prisma client
- `npm run prisma:migrate` — run `prisma migrate deploy`
- `npm run prisma:studio` — open Prisma Studio

## Deployment
- Recommended: Vercel for Next.js
- Steps:
  1) Provision PostgreSQL (e.g., Neon, Supabase) and set `DATABASE_URL`
  2) Set env vars in your hosting provider (`.env.example` as reference)
  3) Run migrations: `prisma migrate deploy` (CI/CD or build step)
  4) Configure Google OAuth callback (`NEXTAUTH_URL` must match)
  5) Set a cron to call `/api/reports/monthly-email` if scheduled reports are required

## Troubleshooting
- Cannot sign in: verify Google OAuth creds and `NEXTAUTH_URL` matches the deployment URL; ensure your email is in `ADMIN_EMAILS` or invited.
- DB/Prisma errors: confirm `DATABASE_URL` and that migrations ran (`npx prisma migrate dev` locally or `deploy` in prod).
- Report email not sent: set `RESEND_API_KEY`; without it `sendEmail` throws by design.
- Missing logo: add `public/CKAlogo.png` to avoid broken image references.
- Timezone issues: adjust `TZ` env; see `lib/time.ts` for local-date derivation used by the wizard.

## File Pointers
- Quick start: `README.md:1`
- Scripts: `package.json:5`
- Models: `prisma/schema.prisma:1`
- Auth config: `lib/auth.ts:1`, `app/api/auth/[...nextauth]/route.ts:1`
- Protected routes: `middleware.ts:1`
- Trips API: `app/api/trips/route.ts:1`, `app/api/trips/[id]/route.ts:1`
- Reports API: `app/api/reports/monthly/route.ts:1`, `app/api/reports/monthly-email/route.ts:1`
- Admin UI: `app/admin/page.tsx:1`
- Wizard UI: `app/trips/new/page.tsx:1`
- PWA: `public/manifest.json:1`, `public/service-worker.js:1`
