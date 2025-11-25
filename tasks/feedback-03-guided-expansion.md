
# Task: Guided Topic Expansion

**Status:** [x] Completed
**Priority:** MEDIUM (Feature)
**Target Files:**
- `config/prompts.ts`
- `services/ai/mapGeneration.ts`
- `components/TopicExpansionModal.tsx` (New)
- `components/ProjectDashboardContainer.tsx`
- `components/TopicItem.tsx` / `components/ui/TopicDetailPanel.tsx`

## 1. Objective
Replace the "Blind Expand" button with a modal that allows the user to select the expansion mode (Attribute, Entity, Context) and provide specific instructions (e.g., "Focus on cost-saving aspects").

## 2. Implementation Steps

### Step 2.1: Update Logic
-   **Prompts:** Update `EXPAND_CORE_TOPIC_PROMPT` to accept `userContext?: string`. Inject this into the instructions: "User Guidance: ${userContext}".
-   **Service:** Update `expandCoreTopic` in `mapGeneration.ts` to accept the argument.

### Step 2.2: New Component (`TopicExpansionModal.tsx`)
-   **Props:** `isOpen`, `onClose`, `coreTopic`, `onExpand(mode, context)`.
-   **UI:**
    -   Display Topic Title.
    -   Radio Buttons for Mode (Context, Attribute, Entity).
    -   `Textarea` "Additional Instructions (Optional)".
    -   Buttons: "Cancel", "Expand".

### Step 2.3: Integration (`ProjectDashboardContainer.tsx`)
-   Add `topicExpansionModal` to `modals` state (or local state in Container if simpler, but global is consistent).
-   Create handler `handleExpandWithContext(coreTopic, mode, context)`.
-   Call the updated service.

### Step 2.4: Trigger Update
-   Update `TopicalMapDisplay` / `TopicItem` / `TopicDetailPanel`.
-   The "Expand" button should now open this modal instead of immediately triggering the API.

## 3. Verification
1.  Click Expand on a Core Topic.
2.  Enter instruction: "Focus on enterprise pricing".
3.  Click Expand.
4.  Verify generated topics align with instructions.
