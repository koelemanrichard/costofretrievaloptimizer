
# EAV Task 01: Schema & Type Upgrade

**Status:** [x] Completed
**Priority:** HIGH
**Target File:** `types.ts`

## 1. Objective
Update the `SemanticTriple` interface to support the granular classification and validation rules defined in the Holistic SEO specification (Root/Unique/Rare, Truth Ranges).

## 2. Implementation Steps

### Step 2.1: Define Enums and Types
In `types.ts`:
```typescript
export type AttributeCategory = 'UNIQUE' | 'ROOT' | 'RARE' | 'COMMON';
export type AttributeClass = 'TYPE' | 'COMPONENT' | 'BENEFIT' | 'RISK' | 'PROCESS' | 'SPECIFICATION';

// Extend or Replace existing SemanticTriple
export interface SemanticTriple {
  subject: { 
      label: string; 
      type: string; 
  };
  predicate: { 
      relation: string; 
      type: string; // Keep for backward compat
      category?: AttributeCategory; // NEW: Rule I.B, I.C
      classification?: AttributeClass; // NEW: Rule II.D
  };
  object: { 
      value: string | number; 
      type: string; // Keep for backward compat
      unit?: string; // NEW: Rule III.B
      truth_range?: string; // NEW: Rule III.C (e.g. "7.0 - 7.8")
  };
}
```

## 3. Verification
-   Compile the application.
-   Ensure existing parsers in `utils/parsers.ts` don't break (they should treat new optional fields as undefined).
