# Accessibility Improvements - December 2024

This document details the accessibility improvements made to the application as part of the comprehensive audit implementation.

## Overview

A new reusable `Modal` component was created with full accessibility support, and existing modal components are being migrated to use it.

## New Components Created

### `components/ui/Modal.tsx`

A fully accessible modal component implementing WAI-ARIA Dialog Modal pattern.

**Features:**
- `role="dialog"` and `aria-modal="true"` for screen readers
- `aria-labelledby` linked to modal title
- `aria-describedby` for optional description (screen reader only)
- Focus trapping (Tab cycles within modal)
- Escape key to close
- Click outside to close (configurable)
- Body scroll lock when open
- Auto-focus first focusable element on open
- Return focus to trigger element on close

**Usage:**
```tsx
import { Modal } from './ui/Modal';

<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Modal Title"
  description="Optional description for screen readers"
  maxWidth="max-w-2xl"
  zIndex="z-50"
  closeOnBackdropClick={true}
  closeOnEscape={true}
  footer={
    <>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button onClick={handleSubmit}>Submit</Button>
    </>
  }
>
  {/* Modal content */}
</Modal>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | boolean | required | Whether modal is open |
| onClose | () => void | required | Close callback |
| title | string | required | Modal title (used for aria-labelledby) |
| description | string | optional | Screen reader description |
| children | ReactNode | required | Modal content |
| maxWidth | string | 'max-w-2xl' | Max width class |
| zIndex | string | 'z-50' | Z-index class |
| closeOnBackdropClick | boolean | true | Close on backdrop click |
| closeOnEscape | boolean | true | Close on Escape key |
| footer | ReactNode | optional | Footer content |
| showHeader | boolean | true | Show default header |
| headerIcon | ReactNode | optional | Icon in header |
| customHeader | ReactNode | optional | Replace default header |
| className | string | '' | Additional card class |

## Migrated Components

### Completed Migrations - Phase 1

1. **`components/ui/ConfirmationModal.tsx`**
   - Now uses accessible Modal component
   - Added configurable confirm/cancel button text
   - Added confirmVariant prop for styling

2. **`components/ui/MergeConfirmationModal.tsx`**
   - Uses accessible Modal component
   - Added role="list" and aria-label to topic list
   - Added aria-describedby hints for inputs
   - Added aria-label to textarea

3. **`components/NewMapModal.tsx`**
   - Uses accessible Modal component
   - Added aria-describedby for input hints
   - Form properly linked to submit button via id

4. **`components/HelpModal.tsx`**
   - Uses accessible Modal component
   - AccordionItem now properly implements ARIA pattern:
     - `aria-expanded` on button
     - `aria-controls` linking to content
     - `role="region"` on content
     - `aria-labelledby` linking to header
     - Unique IDs for each section

### Completed Migrations - Phase 2

5. **`components/ContentBriefModal.tsx`**
   - Uses accessible Modal component with custom header
   - Added `aria-expanded` and `aria-controls` to settings toggle
   - Added `aria-describedby` to multi-pass checkbox
   - Footer moved to footer prop

6. **`components/SettingsModal.tsx`**
   - Uses accessible Modal component
   - Proper tab ARIA pattern with `aria-selected`, `aria-controls`
   - Tab panels have `role="tabpanel"` and `aria-labelledby`
   - Form linked to submit button via `form` attribute

7. **`components/AddTopicModal.tsx`**
   - Uses accessible Modal component
   - Proper tab ARIA pattern for Manual/Template/AI tabs
   - Tab panels have `role="tabpanel"` and `aria-labelledby`

8. **`components/BusinessInfoModal.tsx`**
   - Uses accessible Modal component
   - Proper tab ARIA pattern for General/Identity/Brand/API tabs
   - Tab panels have `role="tabpanel"` and `aria-labelledby`

### Completed Migrations - Phase 3 (2024-12-19 continued)

9. **`components/ValidationResultModal.tsx`**
   - Uses accessible Modal component
   - Full ARIA tabs pattern with `role="tablist"`, `role="tab"`, `role="tabpanel"`
   - `aria-selected`, `aria-controls`, `aria-labelledby` for tab navigation
   - Uses `useId()` for unique IDs

10. **`components/SemanticAnalysisModal.tsx`**
    - Uses accessible Modal component
    - Simple modal with screen reader description

11. **`components/PublicationPlanModal.tsx`**
    - Uses accessible Modal component
    - Large modal (max-w-6xl) with publication planning display

12. **`components/EavManagerModal.tsx`**
    - Uses accessible Modal component
    - Custom footer with status indicators
    - Semantic triple management interface

13. **`components/FlowAuditModal.tsx`**
    - Uses accessible Modal component with higher z-index (z-70)
    - Preserved inline styles for print styling

14. **`components/GenerationLogModal.tsx`**
    - Uses accessible Modal component
    - JSON display for generated data

15. **`components/SchemaModal.tsx`**
    - Uses accessible Modal component with custom header
    - Full ARIA tabs pattern for JSON-LD, Validation, and Entity tabs
    - Uses `useId()` for unique IDs

### Completed Migrations - Phase 4 (2024-12-20)

16. **`components/TopicExpansionModal.tsx`**
    - Uses accessible Modal component with custom header (shows topic title)
    - Full ARIA radiogroup pattern for expansion strategy selection
    - `role="radiogroup"`, `role="radio"`, `aria-checked` attributes
    - Keyboard navigation (Enter/Space to select)
    - `aria-describedby` for textarea hint

17. **`components/ContentCalendarModal.tsx`**
    - Uses accessible Modal component
    - Simple calendar view modal with screen reader description

18. **`components/GscExpansionHubModal.tsx`**
    - Uses accessible Modal component
    - Screen reader label for file input
    - `aria-describedby` linking input to description
    - `role="alert"` for error messages
    - `aria-live="polite"` for loading status
    - `role="list"` for opportunities list

19. **`components/InternalLinkingModal.tsx`**
    - Uses accessible Modal component (full-height)
    - Custom header with description
    - `role="alert"` for warning messages
    - Graph visualization with accessible error states

20. **`components/MergeSuggestionsModal.tsx`**
    - Uses accessible Modal component
    - `role="list"` and `role="listitem"` for suggestions
    - Nested `aria-label` for topics list

21. **`components/PillarEditModal.tsx`**
    - Uses accessible Modal component with custom header
    - `htmlFor` labels linked to inputs via `useId()`
    - `aria-describedby` for all input hints
    - `role="status"` with `aria-live="polite"` for completion status
    - `role="alert"` for validation warnings
    - `aria-hidden="true"` for decorative icons

### Deferred Migrations

- **`components/DraftingModal.tsx`** (2211 lines)
  - This is a full-workspace application view, not a typical modal
  - Contains multiple nested modals (ImageGenerationModal, ReportModal)
  - Complex header with multiple toggles and tab controls
  - Full-screen layout (98vw x 95vh)
  - Requires special architectural consideration for migration

- **`components/LinkingAuditModal.tsx`** (947 lines)
  - Very complex multi-pass audit modal with nested sub-components
  - Contains expandable sections, issue cards, and site overview
  - Requires significant refactoring effort

## Remaining Migrations

The following modal components should be migrated to use the new Modal component:

### Lower Priority
- `InternalLinkingAuditModal.tsx` - Complex audit display
- `PillarChangeConfirmationModal.tsx` - Simple confirmation
- `TemplateSelectionModal.tsx` - Template picker
- `TopicalAuthorityModal.tsx` - Authority display
- `TopicResourcesModal.tsx` - Resource management
- `KnowledgeDomainModal.tsx` - Knowledge domain
- `ContextualCoverageModal.tsx` - Coverage analysis
- `ImprovementConfirmationModal.tsx` - Simple confirmation
- `ExportSettingsModal.tsx` - Export configuration
- `ResponseCodeSelectionModal.tsx` - Code picker
- `ContentIntegrityModal.tsx` - Content audit
- `ImprovementLogModal.tsx` - Log display
- `BriefReviewModal.tsx` - Brief review
- `CompetitorManagerModal.tsx` - Competitor management

## Migration Guide

To migrate an existing modal to use the new Modal component:

### Before (Old Pattern)
```tsx
const MyModal: React.FC<Props> = ({ isOpen, onClose, ...props }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Title</h2>
          {/* Content */}
        </div>
        <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end gap-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </Card>
    </div>
  );
};
```

### After (New Pattern)
```tsx
import { Modal } from './ui/Modal';

const MyModal: React.FC<Props> = ({ isOpen, onClose, ...props }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Title"
      maxWidth="max-w-lg"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {/* Content - no padding needed, Modal provides p-6 */}
    </Modal>
  );
};
```

### Key Changes
1. Remove the `if (!isOpen) return null;` - Modal handles this
2. Remove the backdrop div - Modal provides it
3. Remove the Card wrapper - Modal uses Card internally
4. Remove header div - Modal provides configurable header
5. Move footer content to `footer` prop
6. Content goes directly as children (padding provided)

## Testing Accessibility

To test the accessibility improvements:

1. **Keyboard Navigation**
   - Press Tab to move through focusable elements
   - Press Shift+Tab to move backwards
   - Focus should stay within modal
   - Press Escape to close

2. **Screen Reader**
   - Modal should announce title when opened
   - Dialog role should be announced
   - Close button should announce "Close modal"

3. **Focus Management**
   - First focusable element should receive focus on open
   - Focus should return to trigger element on close

## References

- [WAI-ARIA Dialog Modal Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [MDN ARIA: dialog role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/dialog_role)
