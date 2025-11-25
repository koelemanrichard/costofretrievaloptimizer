
# Improvement Task 11: Advanced Data Export (XLSX/CSV)

**Status:** [x] Completed
**Priority:** HIGH
**Objective:** Allow users to download their entire Topical Map strategy as a comprehensive spreadsheet. This export must include all the granular columns defined in the Holistic SEO framework specs.

## 1. Dependencies
- `xlsx` (SheetJS) library: `npm install xlsx` (or import via CDN/ESM in `utils/export.ts`).

## 2. Implementation Steps

### Step 2.1: Create `utils/exportUtils.ts`
Implement a `generateMasterExport(topics, briefs, pillars, metrics)` function.

**Logic: Flattening the Graph**
The goal is to create a "Master View" where each row represents a Topic.
We need to join data from `EnrichedTopic` (Identity), `ContentBrief` (Structure), and `Metrics` (Logistics).

**Required Columns (Exact Mapping to Specs):**

**I. Foundational Components & Node Identification**
*   `Central Entity (CE)` (from Pillars)
*   `Topical Map Section` (from `topic.topic_class`)
*   `Attribute (Subtopic)` (from `topic.attribute_focus` or Metadata)
*   `Target Query Network` (Joined string from `topic.query_network`)
*   `Canonical Query (CQ)` (from `topic.metadata`)
*   `Query Type` (from `brief.responseCode` or inferred)

**II. Content Structure**
*   `Macro Context / H1` (Topic/Brief Title)
*   `Contextual Vector` (Brief Outline - stringified)
*   `Contextual Hierarchy` (H1/H2/H3 depth - calculated)
*   `Article Methodology` (from `brief.methodology_note`)
*   `Subordinate Text Hint` (extracted from brief sections)
*   `Image Alt Text` (from `brief.visuals`)
*   `URL Hint` (from `topic.url_slug_hint`)
*   `Perspective Requirement` (from `brief.perspectives`)

**III. Interlinking**
*   `Target URL / TM Node` (Link Target)
*   `Anchor Text`
*   `Annotation Text Hint` (from `contextualBridge`)
*   `Contextual Bridge Link` (Full link object stringified)

**IV. Logistics & Metrics**
*   `Publication Date` (from `topic.planned_publication_date`)
*   `Semantic Compliance Score` (calculated/placeholder)
*   `Hub-Spoke Ratio` (from Metrics)
*   `Context Coherence Score` (calculated/placeholder)
*   `Initial Ranking / Status` (Placeholder)
*   `Topical Borders` (from `topic.topical_border_note`)

### Step 2.2: UI Integration
**File:** `components/dashboard/WorkbenchPanel.tsx`

*   Add an "Export Data" dropdown menu.
*   Options:
    *   "Download as Excel (.xlsx)" - Preferred, supports multiple sheets (Overview, Matrix, Edges).
    *   "Download as CSV" - Flat master table.

### Step 2.3: Implementation Details
*   Use `XLSX.utils.json_to_sheet` to create the worksheets.
*   Use `XLSX.writeFile` to trigger the browser download.
*   Filename format: `[ProjectName]_[MapName]_HolisticMap_[Date].xlsx`.

## 3. Verification
1.  Load a map with topics and briefs.
2.  Click "Download as Excel".
3.  Open the file. Verify **every** column listed above is present.
