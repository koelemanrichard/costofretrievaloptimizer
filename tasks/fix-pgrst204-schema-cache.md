# Task: Fix PGRST204 Schema Cache Error

**Status:** Pending
**Priority:** CRITICAL
**Objective:** Resolve the `PGRST204: Could not find the 'created_at' column` error preventing brief saves.

## 1. The Issue
The Supabase API (PostgREST) maintains an internal cache of the database schema. When we ran the previous migration (`01_add_brief_columns.sql`), the cache might not have refreshed automatically, or the `created_at` column might have been inadvertently affected (though unlikely if the script only added columns). The error explicitly states the API cannot see `created_at` on `content_briefs`.

## 2. The Fix
We need to:
1.  Verify/Ensure `created_at` exists.
2.  Force PostgREST to reload its schema cache.

## 3. Execution
Run the SQL script provided in `docs/migrations/02_fix_schema_cache.txt`.
