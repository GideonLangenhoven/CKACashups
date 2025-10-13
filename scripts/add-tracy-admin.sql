-- Add Tracy as admin user
-- Run this in Vercel Postgres SQL Editor

-- Check if user already exists
SELECT id, email, name, role, active FROM "User" WHERE email = 'trace@kayak.co.za';

-- If user doesn't exist, create them
INSERT INTO "User" (id, email, name, role, active, "createdAt", "updatedAt")
VALUES (
  'cuid_' || substr(md5(random()::text), 1, 20),  -- Generate a unique ID
  'trace@kayak.co.za',
  'Tracy',
  'ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  name = 'Tracy',
  role = 'ADMIN',
  active = true,
  "updatedAt" = NOW();

-- Verify the user was created/updated
SELECT id, email, name, role, active FROM "User" WHERE email = 'trace@kayak.co.za';
