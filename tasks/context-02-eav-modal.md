
# Task: Create EAV Manager Modal

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `components/EavManagerModal.tsx`
**Dependencies:** `types.ts`

## 1. Objective
Create a modal component to manage the Semantic Triples (EAVs). This allows users to refine the "facts" the AI uses for content generation.

## 2. Requirements
- **Props:**
    - `isOpen`: boolean
    - `onClose`: () => void
    - `eavs`: SemanticTriple[]
    - `onSave`: (newEavs: SemanticTriple[]) => Promise<void>
- **State:** Local `localEavs`.
- **UI Elements:**
    - Scrollable list of EAVs.
    - Each row shows Subject | Predicate | Object.
    - "Delete" button per row.
    - "Add New Triple" form (3 inputs + Add button).
    - "Save Changes" button.

## 3. Implementation Steps
1.  Create `components/EavManagerModal.tsx`.
2.  Implement Modal layout.
3.  Render list of `SemanticTriple` objects.
4.  Create inputs for `subject.label`, `predicate.relation`, `object.value`. (Auto-fill types like 'Concept'/'Property'/'Value' for simplicity or add inputs for them too).
5.  Implement `onSave`.

## 4. Verification
- Compile check.
