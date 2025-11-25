
# Authorship Task 01: Schema & Types for Author Identity

**Status:** [x] Completed
**Priority:** HIGH
**Objective:** Update the application's data structures to support the "Author Identity" rules (Rule I.A - I.E). We need to move from a simple string author to a structured Entity.

## 1. Update `types.ts`

### New Interfaces
Create `AuthorProfile` interface:
```typescript
export type StylometryType = 'ACADEMIC_FORMAL' | 'DIRECT_TECHNICAL' | 'PERSUASIVE_SALES' | 'INSTRUCTIONAL_CLEAR';

export interface AuthorProfile {
    name: string;
    bio: string;
    credentials: string; // "PhD in Computer Science"
    socialUrls: string[];
    stylometry: StylometryType;
    customStylometryRules?: string[]; // e.g. "Never use the word 'delve'"
}
```

### Update `BusinessInfo`
Replace the legacy fields (`authorName`, `authorBio`, etc.) with:
```typescript
export interface BusinessInfo {
    // ... existing fields
    authorProfile?: AuthorProfile; 
    // Keep legacy fields optional for backward compatibility during migration
}
```

## 2. Update `utils/parsers.ts`

*   Update `parseBusinessInfo` to safely parse the nested `authorProfile` object from the database JSON.
*   Ensure strict type checking for `StylometryType`.

## 3. Verification
*   Compile the project.
*   Ensure no type errors in `BusinessInfoForm` or `ProjectDashboard`.

**Progress Update:**
- Updated `types.ts` to include `AuthorProfile` and `StylometryType`.
- Updated `utils/parsers.ts` to parse and sanitize the nested `authorProfile` object.
- Maintained legacy fields for backward compatibility.

**Next Task:** `tasks/authorship-02-ui-identity.md`
