-- Manual SQL to clear joshtraut@icloud.com from the database
-- Run this in Vercel Postgres SQL Editor

-- 1. Find all guides with this email
SELECT id, name, email, active FROM "Guide" WHERE email = 'joshtraut@icloud.com';

-- 2. Find all users with this email
SELECT id, name, email, active, "guideId" FROM "User" WHERE email = 'joshtraut@icloud.com';

-- 3. Clear email from all guides
UPDATE "Guide" SET email = NULL WHERE email = 'joshtraut@icloud.com';

-- 4. Delete users without trips OR replace email for users with trips
-- First check if users have trips
SELECT u.id, u.name, u.email, COUNT(t.id) as trip_count
FROM "User" u
LEFT JOIN "Trip" t ON t."createdById" = u.id
WHERE u.email = 'joshtraut@icloud.com'
GROUP BY u.id, u.name, u.email;

-- If no trips, delete:
DELETE FROM "User" WHERE email = 'joshtraut@icloud.com' AND id NOT IN (SELECT DISTINCT "createdById" FROM "Trip");

-- If has trips, replace email:
UPDATE "User"
SET email = CONCAT('placeholder_', id, '@removed.local'), "guideId" = NULL
WHERE email = 'joshtraut@icloud.com' AND id IN (SELECT DISTINCT "createdById" FROM "Trip");

-- 5. Verify cleanup
SELECT id, name, email, active FROM "Guide" WHERE email = 'joshtraut@icloud.com';
SELECT id, name, email, active FROM "User" WHERE email = 'joshtraut@icloud.com';
