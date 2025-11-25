# Task 03: Integrate Parsers into App.tsx

**Status:** [x] Completed
**Priority:** HIGH
**Files to Create/Modify:**
- Modify: `App.tsx`

## 1. Objective
Stop raw, unsanitized JSON from the `topical_maps` database table from entering the global application state. This fixes the root cause of "poisoned state" leading to crashes.

## 2. Implementation Steps

### Step 2.1: Import Parsers
- In `App.tsx`, import `parseTopicalMap` from `./utils/parsers`.

### Step 2.2: Update `handleLoadProject`
- Locate `handleLoadProject`.
- Currently: `const { data, error } = await supabase.from('topical_maps').select('*')....`
- Change the dispatch logic:
  ```typescript
  // Transform raw data through the parser
  const sanitizedMaps = (data || []).map(map => parseTopicalMap(map));
  
  dispatch({ type: 'SET_ACTIVE_PROJECT', payload: projectId });
  dispatch({ type: 'SET_TOPICAL_MAPS', payload: sanitizedMaps });
  ```

## 3. Validation
1.  **Load Project:** Load a project that was previously crashing or has known bad data.
2.  **Observation:** The app should NOT crash.
3.  **Data Integrity:** Check the State Debug Panel. The `topicalMaps` list should contain valid objects. If a field was previously an object-in-a-string-field, it should now be a stringified JSON string (visible as text), but not an object reference.