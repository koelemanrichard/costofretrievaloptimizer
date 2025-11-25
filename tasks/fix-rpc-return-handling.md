
# Task: Fix RPC Return Handling (Critical Crash)

**Status:** [x] Completed
**Priority:** CRITICAL
**Target Files:**
- `utils/parsers.ts`
- `App.tsx`
- `components/ProjectDashboardContainer.tsx`

## 1. The Issue
The application crashes with `Cannot read properties of undefined (reading 'id')` when creating a new project or map.
- **Root Cause:** The code expects Supabase RPC calls (`create_new_project`, `create_new_map`) to return an array `[record]`, and attempts to access `data[0]`. However, depending on the PostgREST configuration and function definition, it often returns the single object `{...}` directly.
- **Failure Mode:** accessing `object[0]` returns `undefined`. Accessing `undefined.id` crashes the app.

## 2. The Solution
Implement a `normalizeRpcData` utility in `parsers.ts` that accepts `T | T[]` and always returns `T`.
- If array and length > 0: return `data[0]`.
- If array and empty: throw error or return null.
- If object: return `data`.

Then apply this to the calling locations.

## 3. Verification
- Create New Project -> Should succeed.
- Create New Map -> Should succeed.
