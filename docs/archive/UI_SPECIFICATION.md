# UI Specification & Design System

This document outlines the visual design, component states, and interaction patterns for the Holistic SEO Workbench application. Its purpose is to ensure a consistent, high-quality user experience.

---

## 1. Core Design Philosophy

-   **Clarity & Focus:** The UI should be clean, uncluttered, and guide the user through a logical workflow. Each screen should have a clear primary purpose.
-   **Professional & Data-Driven:** The aesthetic should feel professional and modern, like an expert's tool. Dark themes, clear typography, and effective data visualization are key.
-   **Responsive & Accessible:** The application must be usable across a range of screen sizes, from desktop to mobile. Accessibility standards (WCAG) should be followed, including keyboard navigation and ARIA attributes.

---

## 2. Color Palette

The application uses a dark-themed palette to reduce eye strain and create a professional feel.

-   **Backgrounds:**
    -   `bg-gray-900` (Primary): The main background color for the body.
    -   `bg-gray-800`: Used for card backgrounds and modal headers.
    -   `bg-gray-700`: Used for hover states, borders, and secondary UI elements.
-   **Text:**
    -   `text-gray-100` (Primary): Main body text.
    -   `text-white`: Used for primary headings and important text.
    -   `text-gray-400`: Used for secondary text, descriptions, and placeholders.
-   **Accents (Actions & Status):**
    -   `blue-500` (Primary Action): Buttons, links, focus rings, and important highlights.
    -   `green-400` (Success/Positive): Success notifications, "Core" topic indicators, "Brief Exists" icon.
    -   `yellow-400` (Warning): Warning messages, "in-progress" states.
    -   `red-400` (Danger/Destructive): Error messages, delete actions.
    -   `purple-400` (Secondary Concept): "Outer" topic indicators.

---

## 3. Typography

-   **Font:** `Inter` (sans-serif). Imported from Google Fonts.
-   **Headings:**
    -   `h1`: `text-4xl font-bold text-white`
    -   `h2`: `text-2xl font-bold text-white`
    -   `h3`: `text-xl font-semibold text-white`
-   **Body Text:** `text-base text-gray-100` (prose classes can be used for rich text).
-   **Labels & Secondary Text:** `text-sm text-gray-300`.

---

## 4. Components & States

### 4.1. Buttons (`components/ui/Button.tsx`)

-   **Base:** Rounded corners (`rounded-lg`), padding (`px-6 py-3`), font (`font-semibold`), smooth transition.
-   **Primary (Default):** `bg-blue-600`, `hover:bg-blue-700`.
-   **Secondary:** `bg-gray-600`, `hover:bg-gray-700`.
-   **Disabled State:** `opacity-50`, `cursor-not-allowed`. Should apply to all variants.
-   **Focus State:** A visible focus ring (`focus:ring-2 focus:ring-offset-2`) must be present on all buttons for accessibility.

### 4.2. Cards (`components/ui/Card.tsx`)

-   **Base:** `bg-gray-800/50` with a `backdrop-blur-sm` for a modern, semi-transparent look.
-   **Border:** `border border-gray-700`.
-   **Shadow:** `shadow-lg`.
-   **Rounding:** `rounded-xl`.

### 4.3. Modals

-   **Overlay:** A fixed-position div covering the entire screen with a semi-transparent black background (`bg-black bg-opacity-70`).
-   **Container:** A `Card` component centered on the screen. It should have a max height (`max-h-[90vh]`) and be vertically scrollable if content overflows.
-   **Header:** Pinned to the top of the modal, containing the title and a close button (`&times;`). `bg-gray-800`.
-   **Footer:** Pinned to the bottom, containing primary and secondary actions. `bg-gray-800`.
-   **Interaction:** Clicking the overlay should close the modal. Clicking inside the modal card should not.

### 4.4. Response Code Selection Modal (`components/ResponseCodeSelectionModal.tsx`)

-   **Layout:** Standard modal layout.
-   **Content:** Displays the target topic's title. Shows an AI-suggested response code with reasoning in a highlighted box. Provides a grid of all available response code cards for the user to select.
-   **Interaction:** Clicking a response code card updates the selected state. The "Generate Brief" button in the footer triggers the `onGenerate` callback with the selected code.
-   **State (Loading Suggestion):** While fetching the AI suggestion, the main content area should display a `Loader` component.
-   **State (Processing):** While the parent component is processing the brief generation (indicated by a prop), the "Generate Brief" button must be disabled and show a `Loader`.

### 4.5. Topical Map & Topic Item (`components/TopicalMapDisplay.tsx`, `components/TopicItem.tsx`)

This section details the interactive states of an individual topic item within the main dashboard list view. The top-level container of `TopicItem` must have the `group` class to enable hover effects on child elements.

-   **Layout:** A flex container with a checkbox, the main content (title, slug, description), and a button group for actions.
-   **State (Highlighted):** When a topic is selected for viewing in the brief modal, it should have a visible ring (`ring-2 ring-blue-500`).
-   **State (Core vs. Outer):** Core topics have a left border of `border-green-500/50`. Outer topics have a `border-purple-500/50`.
-   **Hover State:** The background changes (`hover:bg-gray-700/80`). Action icons should fade in (`opacity-0 group-hover:opacity-100`) to keep the default view clean.

#### Topic Item Actions

-   **Generate/View Brief Button:**
    -   **Base:** A circular button that is only visible on hover.
    -   **State 1 (Brief Exists):**
        -   **Icon:** A green eye icon (`text-green-400`).
        -   **Tooltip:** "View Content Brief".
        -   **Behavior:** Enabled. Clicking opens the `ContentBriefModal`.
    -   **State 2 (Brief Missing, Generation Possible):**
        -   **Icon:** A standard pencil/edit icon.
        -   **Tooltip:** "Generate Content Brief".
        -   **Behavior:** Enabled. Clicking opens the `ResponseCodeSelectionModal`.
    -   **State 3 (Brief Missing, Generation Not Possible):**
        -   **Icon:** A standard pencil/edit icon.
        -   **Tooltip:** "Define SEO Pillars and run 'Analyze Domain' to enable."
        -   **Behavior:** **Disabled.** The icon is visible on hover but has the `disabled:opacity-50` and `disabled:cursor-not-allowed` styles.
-   **Expand Topic Button (Core Topics Only):**
    -   **Icon:** A `+` icon.
    -   **Behavior:** Visible on hover. Disabled with an informative tooltip if prerequisites are not met (e.g., Knowledge Domain not analyzed).
-   **Delete Topic Button:**
    -   **Icon:** A trash can icon.
    -   **Behavior:** Visible on hover. Clicking it once changes the icon color to red (`text-red-400`) to indicate a "confirm" state. Clicking again performs the delete action.
-   **Edit Slug Button (Core Topics Only):**
    -   **Icon:** A small pencil icon next to the slug.
    -   **Behavior:** Visible only on hover over the entire topic item (`group-hover:opacity-100`). Clicking it transforms the slug `p` tag into an `Input` field. Save/Cancel icons appear next to the input.
    -   **Visibility:** This action is **only** available for `core` topics, as outer topic slugs are derived from their parent.