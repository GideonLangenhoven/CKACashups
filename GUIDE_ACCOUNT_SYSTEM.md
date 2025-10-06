# Guide Account System - How It Works

## Overview

The system now automatically links guides to user accounts so guides can see their own trips when they log in.

## How It Works

### 1. **When a Guide Logs In**

When someone signs in with their name and email:
- The system checks if there's a guide with a matching name in the database
- If found, it links that guide to the user account
- The user can now see ALL trips where they were a guide

### 2. **"My Trips" Shows:**

For regular users (guides):
- ✅ Trips they created themselves
- ✅ Trips where they were added as a guide

For admins:
- Can toggle to see all trips in the system

### 3. **When Admin Adds a New Guide**

As an admin, when you add a guide in `/admin/guides`:
1. Enter the guide's name (required)
2. **NEW:** Enter the guide's email (optional but recommended)
3. Select their rank (Senior/Intermediate/Junior)
4. Click "Add"

**What happens:**
- Guide is created in the system
- If email was provided → User account is automatically created and linked to the guide
- That person can now log in with their email and see their trips

### 4. **Example Flow**

**Scenario:** You have a junior guide named "John Smith"

**Option A - With Email (Recommended):**
1. Admin adds guide: Name: "John Smith", Email: "john@example.com", Rank: Junior
2. System creates guide + user account (linked together)
3. John logs in with "john@example.com" and his name
4. John sees all trips where he was a guide

**Option B - Without Email:**
1. Admin adds guide: Name: "John Smith", Rank: Junior (no email)
2. System creates guide only
3. When John first logs in with any email and name "John Smith"
4. System automatically links his new account to the existing guide
5. John can now see his trips

### 5. **What Changed in the Database**

**New fields:**
- `Guide.email` - Optional email for the guide
- `User.guideId` - Links user account to their guide profile

**Migration:**
- Database updated automatically on deployment
- Existing data not affected
- No action required for existing guides

### 6. **Use Cases**

**Use Case 1: Create account for all existing guides**
1. Go to Admin → Manage Guides
2. For each guide, use "Change Rank" button (even if keeping same rank)
3. In future update: Add ability to edit guide and add email

**Use Case 2: Someone logs a trip for a junior guide**
1. Trip creator adds "John Smith" as a guide
2. When John Smith logs in (with any email), system auto-links him
3. John can see the trip in "My Trips"

**Use Case 3: Pre-create accounts for new guides**
1. Admin adds guide with email: "newguide@email.com"
2. Guide receives instructions to log in
3. Guide logs in with that email → automatically linked → sees their trips

### 7. **Testing the System**

**Test 1 - Verify existing behavior:**
1. Log in as yourself
2. Go to "My Trips"
3. You should see trips you created

**Test 2 - Create new guide with email:**
1. Go to Admin → Manage Guides
2. Add guide: "Test Guide", "test@example.com", Junior
3. Log out
4. Log in with "test@example.com" and name "Test Guide"
5. Create a trip and add yourself as a guide
6. Check "My Trips" - you should see it

**Test 3 - Have someone else add you as guide:**
1. Have another user create a trip
2. They add your name as a guide
3. Log in - trip should appear in "My Trips"

## Production URLs

- Main app: https://y-rose-seven.vercel.app
- Admin panel: https://y-rose-seven.vercel.app/admin

## Summary

✅ Guides automatically get accounts when added with email
✅ Guides see their own trips in "My Trips"
✅ Name matching works - signing in with matching name links to guide
✅ No manual work needed for most cases
✅ Backward compatible - existing system still works

---

**Questions or Issues?**

If a guide can't see their trips:
1. Verify their name exactly matches the guide name in the system
2. Check they're logging in with the same name they were added with
3. As admin, verify the guide is marked as "active"
