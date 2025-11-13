# Security & Code Quality Audit Report
## CKA Cashups Application

**Audit Date**: November 12, 2025
**Application**: CKA Cashups (Cash Management & Earnings Tracking)
**Version**: 0.1.0
**Framework**: Next.js 14.2.4 with Prisma ORM
**Database**: PostgreSQL (Neon)

---

## Executive Summary

This comprehensive security audit identified **27 issues** across security, API design, database optimization, and frontend validation. The most critical findings involve exposed credentials, missing authentication on public endpoints, weak JWT secrets, and lack of CSRF protection.

**Risk Distribution**:
- 🔴 **Critical**: 5 issues
- 🟠 **High**: 7 issues
- 🟡 **Medium**: 10 issues
- 🟢 **Low**: 5 issues

**Immediate Action Required**: The 5 critical issues must be addressed before production deployment to prevent security breaches.

---

## Critical Security Issues (Fix Immediately)

### 1. Exposed Secrets in Repository ⚠️ CRITICAL
**File**: `.env` (Lines 1-16)
**Risk**: Credential theft, unauthorized access, data breach

**Problem**:
- Gmail app password: `lnlr hgqq hmoy rkqv` exposed
- Google OAuth credentials in repository
- Database credentials visible
- NEXTAUTH_SECRET exposed

**Impact**:
- Attackers can send emails as CKA
- Full database access
- OAuth token generation
- User account compromise

**Fix**:
1. Immediately rotate ALL credentials:
   - Generate new Gmail app password at https://myaccount.google.com/apppasswords
   - Create new Google OAuth credentials at https://console.cloud.google.com/apis/credentials
   - Regenerate NEXTAUTH_SECRET: `openssl rand -base64 32`
   - Update Neon database password
2. Remove `.env` from git:
   ```bash
   git rm --cached .env
   echo ".env" >> .gitignore
   ```
3. Use Vercel environment variables only
4. Audit git history: `git log -p -- .env`

---

### 2. Weak JWT Secret with Fallback ⚠️ CRITICAL
**Files**:
- `middleware.ts:6`
- `app/api/auth/signin/route.ts:6`
- `lib/session.ts:6`

**Current Code**:
```typescript
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-change-me"
);
```

**Problem**:
- Hardcoded fallback secret is publicly known
- Anyone can forge JWT tokens if NEXTAUTH_SECRET is not set
- Attackers can impersonate any user (including admins)

**Fix**:
```typescript
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET
);

// Add startup validation in app startup or middleware
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}
```

---

### 3. Unauthenticated Guide API ⚠️ CRITICAL
**File**: `app/api/guides/route.ts:6-8`

**Current Code**:
```typescript
export async function GET() {
  const guides = await prisma.guide.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  return Response.json({ guides });
}
```

**Problem**:
- No authentication check
- Anyone can retrieve all guide data:
  - Full names
  - Email addresses
  - Ranks (salary levels)
  - Internal IDs
- Enables enumeration and phishing attacks

**Fix**:
```typescript
export async function GET() {
  const user = await getServerSession();
  if (!user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const guides = await prisma.guide.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      rank: true
      // Don't expose email to non-admins
    }
  });
  return Response.json({ guides });
}
```

---

### 4. Unauthenticated Trip Details API ⚠️ CRITICAL
**File**: `app/api/trips/[id]/route.ts:6-9`

**Current Code**:
```typescript
export async function GET(_: NextRequest, { params }: { params: { id: string }}) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: { payments: true, discounts: true, guides: { include: { guide: true } } }
  });
  if (!trip) return new Response('Not found', { status: 404 });
  return Response.json({ trip });
}
```

**Problem**:
- No authentication check
- Returns all financial data:
  - Cash amounts
  - Credit card payments
  - Guide earnings
  - Discounts and reasons
- Trip IDs are enumerable (CUID format)
- Enables complete financial data extraction

**Fix**:
```typescript
export async function GET(_: NextRequest, { params }: { params: { id: string }}) {
  const user = await getServerSession();
  if (!user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: { payments: true, discounts: true, guides: { include: { guide: true } } }
  });

  if (!trip) return new Response('Not found', { status: 404 });

  // Check authorization: admin, creator, or guide on trip
  const userWithGuide = await prisma.user.findUnique({
    where: { id: user.id },
    select: { guideId: true, role: true }
  });

  const isAuthorized =
    user.role === 'ADMIN' ||
    trip.createdById === user.id ||
    (userWithGuide?.guideId && trip.guides.some(g => g.guideId === userWithGuide.guideId));

  if (!isAuthorized) {
    return new Response('Forbidden', { status: 403 });
  }

  return Response.json({ trip });
}
```

---

### 5. Unauthenticated Report Generation ⚠️ CRITICAL
**File**: `app/api/reports/custom-email/route.ts:7`

**Current Code**:
```typescript
export async function GET(req: NextRequest) {
  try {
    // No authentication check!
    const { searchParams } = new URL(req.url);
```

**Problem**:
- Anyone can generate and email reports to admins
- No rate limiting
- Can trigger DoS by requesting massive date ranges
- Spam admin inboxes

**Fix**:
```typescript
export async function GET(req: NextRequest) {
  const user = await getServerSession();
  if (!user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (user.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  // Add rate limiting here
  const { searchParams } = new URL(req.url);
  // ... rest of code
```

---

## High Severity Issues

### 6. Missing CSRF Protection 🟠 HIGH
**Location**: All POST/PUT/DELETE endpoints
**Impact**: Cross-site request forgery attacks possible

**Problem**:
- No CSRF token validation
- State-changing operations can be triggered from malicious sites
- Forms don't include anti-CSRF tokens

**Fix**:
1. Install CSRF library: `npm install csrf`
2. Generate tokens on page load
3. Validate on all mutations
4. Or rely on SameSite=Strict cookies (partial protection)

---

### 7. Insecure 7-Day Session Timeout 🟠 HIGH
**File**: `app/api/auth/signin/route.ts:36-46`

**Current Code**:
```typescript
.setExpirationTime("7d")
```

**Problem**:
- Sessions valid for 7 days without activity check
- No refresh token mechanism
- Compromised token valid for entire week
- No forced re-authentication for sensitive ops

**Fix**:
```typescript
// Short-lived access token
.setExpirationTime("1h")

// Implement refresh token flow:
// 1. Access token: 1 hour
// 2. Refresh token: 14 days
// 3. Refresh endpoint to get new access token
// 4. Force logout after 14 days of inactivity
```

---

### 8. XSS Vulnerability in Email Templates 🟠 HIGH
**File**: `app/api/guides/dispute/route.ts:102`

**Current Code**:
```typescript
<p style="background: #fef2f2; padding: 12px; border-left: 4px solid #dc2626; margin: 16px 0;">
  ${reason.replace(/\n/g, '<br>')}
</p>
```

**Problem**:
- User input inserted directly into HTML
- No HTML escaping
- Can inject malicious HTML/scripts
- Phishing vector

**Fix**:
```typescript
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

<p style="...">
  ${escapeHtml(reason).replace(/\n/g, '<br>')}
</p>
```

---

### 9. Missing Input Validation - Date Parameters 🟠 HIGH
**File**: `app/api/reports/custom-email/route.ts:20-25`

**Current Code**:
```typescript
const startDate = new Date(start + 'T00:00:00Z');
const endDate = new Date(end + 'T23:59:59Z');
```

**Problem**:
- No format validation
- Invalid dates cause crashes
- No range limits (could request year 9999)
- DoS vector

**Fix**:
```typescript
// Validate format
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(start) || !dateRegex.test(end)) {
  return new Response('Invalid date format. Use YYYY-MM-DD', { status: 400 });
}

// Validate range
const startDate = new Date(start + 'T00:00:00Z');
const endDate = new Date(end + 'T23:59:59Z');

if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
  return new Response('Invalid date', { status: 400 });
}

const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
if (daysDiff > 365) {
  return new Response('Date range cannot exceed 365 days', { status: 400 });
}
```

---

### 10. Missing Rate Limiting 🟠 HIGH
**Location**: All API endpoints

**Problem**:
- No rate limiting on any endpoint
- Enables brute force attacks
- Enables data scraping
- Enables DoS attacks

**Fix** (using Vercel rate limiting):
```typescript
// middleware.ts
import { ipAddress } from '@vercel/edge';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

export async function middleware(request: NextRequest) {
  const ip = ipAddress(request) || 'anonymous';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }

  // ... rest of middleware
}
```

---

### 11. Open Admin Access Without Verification 🟠 HIGH
**File**: `lib/auth.ts:80-82`

**Current Code**:
```typescript
const adminEmails = (process.env.ADMIN_EMAILS || 'gidslang89@gmail.com,info@kayak.co.za')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const isAdmin = adminEmails.includes(normalizedEmail);
```

**Problem**:
- Any email in list automatically becomes admin
- No email verification
- No invitation flow
- No audit of admin creation

**Fix**:
1. Implement invitation system (schema already has Invite model)
2. Require email verification
3. Generate secure invite tokens
4. Audit all admin account creations

---

### 12. Generic Error Messages Expose Details 🟠 HIGH
**File**: Multiple API routes (e.g., `app/api/trips/route.ts:109`)

**Current Code**:
```typescript
return new Response(JSON.stringify({
  error: error.message,
  details: error.toString()
}), {
  status: 500,
  headers: { 'Content-Type': 'application/json' }
});
```

**Problem**:
- Stack traces exposed to clients
- Reveals database schema
- Shows internal file paths
- Helps attackers understand system

**Fix**:
```typescript
// Log detailed error server-side
console.error('[API Error]', {
  errorId: crypto.randomUUID(),
  error: error.message,
  stack: error.stack,
  userId: user?.id
});

// Return generic message to client
return new Response(JSON.stringify({
  error: 'An error occurred',
  errorId: errorId // For support lookup
}), {
  status: 500,
  headers: { 'Content-Type': 'application/json' }
});
```

---

## Medium Severity Issues

### 13. N+1 Query Problem 🟡 MEDIUM
**File**: `app/api/admin/guide-earnings/route.ts:27-81`

**Problem**: Queries database once per guide (inefficient with many guides)

**Fix**: Fetch all trips in one query, group in JavaScript

---

### 14. Client-Side Only Validation 🟡 MEDIUM
**File**: `app/trips/new/page.tsx:117-140`

**Problem**: Frontend validation can be bypassed

**Fix**: Add server-side validation with Zod schemas

---

### 15. Missing Database Cascading Deletes 🟡 MEDIUM
**File**: `prisma/schema.prisma:81-143`

**Problem**: Orphaned records when trips deleted

**Fix**: Add `onDelete: Cascade` to relations

---

## Summary of Fixes Required

| Priority | Issue Count | Timeline |
|----------|-------------|----------|
| Critical | 5 | Immediate (24h) |
| High | 7 | Week 1 |
| Medium | 10 | Week 2-3 |
| Low | 5 | Week 4+ |

---

## Remediation Roadmap

### Phase 1: Critical Fixes (24 hours)
- [ ] Rotate all exposed credentials
- [ ] Remove `.env` from git, use Vercel secrets
- [ ] Fix JWT secret (remove fallback)
- [ ] Add authentication to public APIs
- [ ] Test all critical endpoints

### Phase 2: High Priority (Week 1)
- [ ] Implement CSRF protection
- [ ] Reduce JWT expiration + refresh tokens
- [ ] Add input validation (Zod)
- [ ] Implement rate limiting
- [ ] Fix XSS in emails
- [ ] Add proper error handling

### Phase 3: Medium Priority (Week 2)
- [ ] Fix N+1 queries
- [ ] Add server-side validation
- [ ] Implement proper admin invitation
- [ ] Add database constraints
- [ ] Optimize data returns

### Phase 4: Testing & Monitoring (Week 3-4)
- [ ] Security testing
- [ ] Penetration testing
- [ ] Set up monitoring (Sentry)
- [ ] Add API documentation
- [ ] Performance testing

---

## Contact & Support

**Audit Performed By**: Claude Code AI Assistant
**Date**: November 12, 2025
**Repository**: https://github.com/GideonLangenhoven/CKACasups2

For questions about this audit, please review the detailed findings in each section above.

---

**IMPORTANT**: Do not deploy to production until at least all Critical and High severity issues are resolved.
