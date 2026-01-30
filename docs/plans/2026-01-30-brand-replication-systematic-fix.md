# Brand Replication System - Systematic Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all identified issues in the brand replication pipeline so output looks like design-agency quality HTML with accurate brand styling — not templated garbage.

**Architecture:** The pipeline flows: BrandDiscovery (Apify) → AI DesignDNA extraction → BrandDesignSystemGenerator (AI CSS) → Layout Blueprint → CleanArticleRenderer (HTML) → Assembled output. Two code paths exist for brand detection: "Quick Detection" (`useBrandDetection.ts`) and "Full Extraction" (`BrandIntelligenceStep.tsx`). The Full Extraction path is used in the Style & Publish modal and is missing critical fixes. The SemanticLayoutEngine (optional) crashes due to type mismatches. Color palette accuracy and component diversity are degraded.

**Tech Stack:** React 18, TypeScript, Vite, TailwindCSS, Supabase, Gemini/Anthropic AI

---

## Issue Summary

| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| 1 | BrandIntelligenceStep missing color/font merge + generator params | CRITICAL | `processFullExtraction()` builds DesignDNA from token indices, no DOM override, calls `generator.generate()` with 3 of 5 params |
| 2 | SemanticLayoutEngine crashes every time | HIGH | `LayoutIntelligenceService` produces `BlueprintSection` objects missing `heading: {text,level,id}`, TOC uses `title` not `text` |
| 3 | Flat/wrong color palette in output CSS | HIGH | Colors assigned by array index from extraction tokens; primaryLight = white, accent = black |
| 4 | ComponentRenderer always falls back to prose | MEDIUM | ContentStructureParser defaults to `{type:'prose', confidence:1}` which prevents re-extraction; feature-grid never primary |
| 5 | RLS policy violations for brand data caching | MEDIUM | `brand_components`, `brand_design_dna`, `brand_design_systems` tables have missing or wrong RLS policies |
| 6 | CSS undefined variables | LOW | AI generates var names not in `:root`; 8 undefined vars found |

---

## Task 1: Fix BrandIntelligenceStep Color/Font Merge + Generator Params

**Why:** This is the #1 reason output "looks like shit." The Style & Publish modal uses `BrandIntelligenceStep.tsx` → `processFullExtraction()`, NOT `useBrandDetection.ts`. The color/font merge we added to `useBrandDetection.ts` never executes in the actual user flow. Also, `generator.generate()` is called without `screenshotBase64` (no AI vision) and without `googleFontsUrl` (no font imports).

**Files:**
- Modify: `components/publishing/steps/BrandIntelligenceStep.tsx:196-401`

**Step 1: Fix generator.generate() call to pass all 5 parameters**

At line 386-390, the current code is:
```typescript
const designSystem = await generator.generate(
  designDna,
  'Extracted Brand',
  brandExtraction.selectedUrls[0] || ''
);
```

Change to:
```typescript
const designSystem = await generator.generate(
  designDna,
  'Extracted Brand',
  brandExtraction.selectedUrls[0] || '',
  brandExtraction.screenshotBase64 || undefined,
  brandExtraction.googleFontsUrl || undefined
);
```

This passes the screenshot for AI vision input (better CSS quality) and the Google Fonts URL for `@import` in compiled CSS.

**Step 2: Add DOM color/font merge before DesignDNA construction**

At lines 208-237, colors are assigned by array index from `tokens.colors.values[]`. This is fragile — position [1] might not be "primary light", [4] might not be "accent". Add a merge step that uses the Full Extraction's own findings data.

After the `designDna` object is constructed (after line ~375) and before `generator.generate()` is called (line 386), add:

```typescript
// Merge DOM-extracted high-confidence colors into DesignDNA
// (mirrors the merge logic in useBrandDetection.ts)
if (brandExtraction.extractedTokens?.colors?.values) {
  const colorValues = brandExtraction.extractedTokens.colors.values;

  // Find colors by usage label instead of by array index
  const findColor = (usage: string) =>
    colorValues.find((c: { hex?: string; usage?: string }) =>
      c.usage?.toLowerCase().includes(usage)
    );

  const primaryColor = findColor('primary');
  const secondaryColor = findColor('secondary');
  const accentColor = findColor('accent');

  if (primaryColor?.hex) {
    designDna.colors.primary.hex = primaryColor.hex;
    designDna.colors.primary.confidence = 0.95;
    console.log('[BrandIntelligenceStep] Matched primary color by usage:', primaryColor.hex);
  }
  if (secondaryColor?.hex) {
    designDna.colors.secondary.hex = secondaryColor.hex;
    designDna.colors.secondary.confidence = 0.9;
    console.log('[BrandIntelligenceStep] Matched secondary color by usage:', secondaryColor.hex);
  }
  if (accentColor?.hex) {
    designDna.colors.accent.hex = accentColor.hex;
    designDna.colors.accent.confidence = 0.85;
    console.log('[BrandIntelligenceStep] Matched accent color by usage:', accentColor.hex);
  }
}

// Merge DOM-extracted fonts (Google Fonts are more reliable than screenshot inference)
if (brandExtraction.extractedTokens?.typography?.headings?.fontFamily &&
    brandExtraction.extractedTokens.typography.headings.fontFamily !== 'system-ui') {
  designDna.typography.headingFont.family = brandExtraction.extractedTokens.typography.headings.fontFamily;
  console.log('[BrandIntelligenceStep] Using extracted heading font:', designDna.typography.headingFont.family);
}
if (brandExtraction.extractedTokens?.typography?.body?.fontFamily &&
    brandExtraction.extractedTokens.typography.body.fontFamily !== 'system-ui') {
  designDna.typography.bodyFont.family = brandExtraction.extractedTokens.typography.body.fontFamily;
  console.log('[BrandIntelligenceStep] Using extracted body font:', designDna.typography.bodyFont.family);
}
```

**Step 3: Fix the fragile index-based color assignment**

Replace the index-based color assignments at lines 213-237 with usage-aware lookups. The `primaryLight`, `primaryDark`, and neutrals should be COMPUTED from primary, not taken from arbitrary array positions.

Replace lines 213-254 with:

```typescript
colors: {
  primary: {
    hex: tokens.colors?.values?.find((c: any) => c.usage?.toLowerCase().includes('primary'))?.hex
      || tokens.colors?.values?.[0]?.hex || '#3b82f6',
    usage: 'primary',
    confidence: 0.9
  },
  primaryLight: {
    hex: this.lightenColor(
      tokens.colors?.values?.find((c: any) => c.usage?.toLowerCase().includes('primary'))?.hex
      || tokens.colors?.values?.[0]?.hex || '#3b82f6', 0.3),
    usage: 'primary light variant',
    confidence: 0.8
  },
  primaryDark: {
    hex: this.darkenColor(
      tokens.colors?.values?.find((c: any) => c.usage?.toLowerCase().includes('primary'))?.hex
      || tokens.colors?.values?.[0]?.hex || '#3b82f6', 0.2),
    usage: 'primary dark variant',
    confidence: 0.8
  },
  secondary: {
    hex: tokens.colors?.values?.find((c: any) => c.usage?.toLowerCase().includes('secondary'))?.hex
      || tokens.colors?.values?.[1]?.hex || '#1f2937',
    usage: 'secondary',
    confidence: 0.8
  },
  accent: {
    hex: tokens.colors?.values?.find((c: any) => c.usage?.toLowerCase().includes('accent'))?.hex
      || tokens.colors?.values?.[2]?.hex || '#f59e0b',
    usage: 'accent',
    confidence: 0.7
  },
  // ... (neutrals and semantic stay the same)
```

Note: Add helper functions `lightenColor` and `darkenColor` as local functions inside the `useEffect` (or extract a utility). These take a hex and a factor, lighten/darken by mixing with white/black.

```typescript
function lightenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * (1 - factor));
  const dg = Math.round(g * (1 - factor));
  const db = Math.round(b * (1 - factor));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}
```

**Step 4: Add provider selection (not hardcoded)**

At line 382, change:
```typescript
provider: 'gemini',
```
to:
```typescript
provider: (geminiApiKey ? 'gemini' : 'anthropic') as 'gemini' | 'anthropic',
```

And add anthropicApiKey retrieval near the top where `geminiApiKey` is read.

**Step 5: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit --pretty 2>&1 | findstr /i "BrandIntelligenceStep"`
Expected: No errors

**Step 6: Manual validation**

1. Open app → navigate to project → open topical map → select topic
2. Click "Draft" → generate article → click "Style & Publish"
3. In Brand Intelligence step, enter brand URL and run Full Extraction
4. Check browser console for:
   - `[BrandIntelligenceStep] Matched primary color by usage: #XXXXXX` (NOT just index assignment)
   - `[BrandIntelligenceStep] Using extracted heading font: Poppins` (or whatever the brand uses)
   - `[BrandDesignSystemGenerator] Using brand screenshot for AI vision input` (proves screenshot passed)
   - `[BrandDesignSystemGenerator] Adding Google Fonts import:` (proves googleFontsUrl passed)
5. In Preview step, verify output CSS contains `@import url('https://fonts.googleapis.com/...')` and uses correct hex colors

**Step 7: Commit**

```bash
git add components/publishing/steps/BrandIntelligenceStep.tsx
git commit -m "fix(brand): add color/font merge + pass screenshot & googleFontsUrl to generator in Full Extraction path"
```

---

## Task 2: Fix SemanticLayoutEngine Property Mismatches

**Why:** The SemanticLayoutEngine crashes every time it runs, always falling back. This removes the AI-driven layout intelligence entirely. Three property mismatches between `LayoutIntelligenceService` output and `SemanticRenderer` expectations.

**Files:**
- Modify: `services/semantic-layout/LayoutIntelligenceService.ts:696-738`

**Step 1: Fix BlueprintSection `heading` property**

At line 696-711 in `buildBlueprintSections()`, the code creates:
```typescript
const blueprintSection: BlueprintSection = {
  id: section.id,
  originalHeading: section.heading,    // ← string, NOT in type
  headingLevel: section.headingLevel,  // ← number, NOT in type
  // ... missing: heading: { text, level, id }
```

The `BlueprintSection` type at `services/semantic-layout/types.ts:617-652` requires:
```typescript
heading: {
  text: string;
  level: 1 | 2 | 3 | 4;
  id: string;
};
```

Replace lines 696-711 with:
```typescript
const blueprintSection: BlueprintSection = {
  id: section.id,
  heading: {
    text: section.heading,
    level: (section.headingLevel || 2) as 1 | 2 | 3 | 4,
    id: `heading-${section.id}`,
  },
  intelligence: intel,
  transformation,
  layout: {
    component: intel.visualRecommendation.primaryComponent,
    emphasis: intel.visualRecommendation.emphasis,
    width: this.getWidthForEmphasis(intel.visualRecommendation.emphasis),
    background: this.getBackgroundForEmphasis(intel.visualRecommendation.emphasis),
    spacing: this.getSpacingForPosition(i, sections.length),
  },
  accessories: [],
  internalLinks: [],
  position: i,
};
```

Note: The `layout` sub-object shape also needs to match the type. The type requires `component`, `emphasis`, `width`, `background`, and `spacing: { marginTop, marginBottom, paddingY }`. The current code uses different property names. Check the return type of `getSpacingForPosition()` and adjust to return `{ marginTop: string, marginBottom: string, paddingY: string }`.

**Step 2: Fix TOC `title` → `text` property**

At lines 722-730, `generateTOC()` creates items with `title`:
```typescript
.map(s => ({
  id: s.id,
  title: s.originalHeading,  // ← WRONG: should be 'text'
  level: s.headingLevel,
  anchor: `section-${s.id}`,
}));
```

The `TOCItem` type at `types.ts:667-672` requires `text`, not `title`:
```typescript
export interface TOCItem {
  id: string;
  text: string;
  level: number;
  children?: TOCItem[];
}
```

Change to:
```typescript
.map(s => ({
  id: s.id,
  text: s.heading.text,
  level: s.heading.level,
  children: undefined,
}));
```

Note: Also remove `anchor` since it's not in the type. Also, use `s.heading.text` and `s.heading.level` since we fixed `BlueprintSection` in Step 1.

**Step 3: Fix getSpacingForPosition return type**

Find `getSpacingForPosition()` in the same file and ensure it returns `{ marginTop: string, marginBottom: string, paddingY: string }` to match the type definition. Current implementation likely returns different properties. Adjust as needed.

**Step 4: Fix null transformation handling**

`transformSection()` can return null on JSON parse failure. The code at line 694 assigns directly:
```typescript
const transformation = await this.transformSection(section, intel, context);
```

Add a fallback:
```typescript
const transformation = await this.transformSection(section, intel, context) ?? {
  targetComponent: intel.visualRecommendation.primaryComponent || 'prose',
  transformedContent: section.content,
  structuralChanges: [],
  confidence: 0.3,
};
```

**Step 5: Remove the obsolete `originalHeading`, `headingLevel`, `originalContent` properties**

After fixing `buildBlueprintSections`, remove `originalHeading`, `headingLevel`, and `originalContent` from the created object — they are not in the type and were causing confusion.

**Step 6: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit --pretty 2>&1 | findstr /i "LayoutIntelligenceService"`
Expected: No errors

**Step 7: Run existing tests**

Run: `npx vitest run --reporter=verbose services/semantic-layout/ 2>&1`
Expected: All tests pass (or identify pre-existing failures)

**Step 8: Manual validation**

1. Enable SemanticLayoutEngine in StylePublishModal (it's `useState(false)` at line 243 — temporarily set to `true`)
2. Generate preview
3. Check browser console for ABSENCE of:
   - `Cannot read properties of undefined (reading 'title')`
   - `Cannot read properties of undefined (reading 'replace')`
   - `JSON parse error` from LayoutIntelligenceService
4. Check that TOC renders (should have `toc-link` elements with text, not empty)
5. Reset `useState(false)` back after testing

**Step 9: Commit**

```bash
git add services/semantic-layout/LayoutIntelligenceService.ts
git commit -m "fix(layout): align BlueprintSection construction with type definition, fix TOC text property, handle null transformations"
```

---

## Task 3: Fix Color Palette Quality — Smart Color Derivation

**Why:** The output CSS has `--ctc-primary-light: #ffffff` and `--ctc-accent: #000000`. This makes the design flat and ugly. Colors should be derived intelligently from the primary brand color, not taken from arbitrary array positions.

**Files:**
- Modify: `services/design-analysis/BrandDesignSystemGenerator.ts` — the `generateTokensFromDNA()` method
- Modify: `services/design-analysis/prompts/designSystemPrompt.ts` — strengthen the prompt for color usage

**Step 1: Find and fix `generateTokensFromDNA()` color derivation**

Read the `generateTokensFromDNA()` method in `BrandDesignSystemGenerator.ts`. The `:root` CSS variables it emits (`--ctc-primary`, `--ctc-primary-light`, `--ctc-accent`, etc.) must:

1. Use the actual `designDna.colors.primary.hex` for `--ctc-primary`
2. Compute `--ctc-primary-light` by lightening primary by 85% (pastel tint), NOT from a secondary color
3. Compute `--ctc-primary-dark` by darkening primary by 20%
4. Use `designDna.colors.accent.hex` for `--ctc-accent` — if it's `#000000` or `#ffffff`, compute one from primary (complementary shift)
5. Use `designDna.colors.secondary.hex` for `--ctc-secondary`

Add this validation at the top of `generateTokensFromDNA()`:
```typescript
// Validate colors - reject black/white as accent or primaryLight
const isUselessColor = (hex: string) => {
  const normalized = hex?.toLowerCase().replace('#', '') || '';
  return ['000000', 'ffffff', 'fff', '000'].includes(normalized);
};

const primary = designDna.colors.primary?.hex || '#3b82f6';
let accent = designDna.colors.accent?.hex || '#f59e0b';
let primaryLight = designDna.colors.primaryLight?.hex;
let primaryDark = designDna.colors.primaryDark?.hex;
let secondary = designDna.colors.secondary?.hex || '#1f2937';

// Fix useless colors by deriving from primary
if (isUselessColor(accent)) {
  accent = this.computeComplementary(primary);
  console.log('[BrandDesignSystemGenerator] Accent was black/white, computed complementary:', accent);
}
if (!primaryLight || isUselessColor(primaryLight)) {
  primaryLight = this.lightenHex(primary, 0.85);
  console.log('[BrandDesignSystemGenerator] PrimaryLight computed from primary:', primaryLight);
}
if (!primaryDark || isUselessColor(primaryDark)) {
  primaryDark = this.darkenHex(primary, 0.2);
  console.log('[BrandDesignSystemGenerator] PrimaryDark computed from primary:', primaryDark);
}
if (isUselessColor(secondary)) {
  secondary = this.darkenHex(primary, 0.4);
  console.log('[BrandDesignSystemGenerator] Secondary was black/white, derived from primary:', secondary);
}
```

Then add these helper methods to the class:
```typescript
private lightenHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return '#' + [r, g, b].map(c =>
    Math.round(c + (255 - c) * factor).toString(16).padStart(2, '0')
  ).join('');
}

private darkenHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return '#' + [r, g, b].map(c =>
    Math.round(c * (1 - factor)).toString(16).padStart(2, '0')
  ).join('');
}

private computeComplementary(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Rotate hue by 180 degrees via HSL
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const rn = r / 255, gn = g / 255, bn = b / 255;
    if (rn === max) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (gn === max) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  h = (h + 0.5) % 1; // Rotate 180°
  // HSL to RGB
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return '#' + [hue2rgb(p, q, h + 1/3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1/3)]
    .map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
}
```

**Step 2: Verify the emitted `:root` CSS block uses these corrected values**

Read the rest of `generateTokensFromDNA()` and ensure the CSS string template uses `primaryLight`, `primaryDark`, `accent`, `secondary` from our corrected variables instead of accessing `designDna.colors.*` directly.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | findstr /i "BrandDesignSystemGenerator"`
Expected: No errors

**Step 4: Run design-analysis tests**

Run: `npx vitest run --reporter=verbose services/design-analysis/ 2>&1`
Expected: 89/89 pass (or identify regressions)

**Step 5: Manual validation**

1. Open browser console
2. Run Full Extraction in Style & Publish modal
3. Check console for corrected color logs
4. In Preview step, inspect the `<style>` tag in the output HTML
5. Verify:
   - `--ctc-primary-light` is NOT `#ffffff` — should be a pastel tint of primary
   - `--ctc-accent` is NOT `#000000` — should be a contrasting color
   - All colors look like a coherent brand palette

**Step 6: Commit**

```bash
git add services/design-analysis/BrandDesignSystemGenerator.ts
git commit -m "fix(colors): derive primaryLight/accent/secondary from primary when AI returns black/white"
```

---

## Task 4: Improve ContentStructureParser Feature Extraction

**Why:** ComponentRenderer tries to render visual components (feature-grid, step-list, etc.) but ContentStructureParser returns `{type:'prose', confidence:1}` for unrecognized content, preventing any extraction. The high confidence (1.0) on prose means the system is very confident it should be plain text — but actually it just didn't try hard enough.

**Files:**
- Modify: `services/publishing/renderer/ContentStructureParser.ts:30-49`

**Step 1: Lower prose default confidence**

At line 48:
```typescript
return { type: 'prose', items: [], remainingProse: content, confidence: 1 };
```

Change to:
```typescript
return { type: 'prose', items: [], remainingProse: content, confidence: 0.3 };
```

This makes the system less confident about "it's definitely prose" and opens the door for component renderers to try harder.

**Step 2: Add `extractFeatures` fallback for paragraph-based content**

Read the existing `extractFeatures()` method and add a new pattern at the end (before the prose fallback). The feature-grid renderer at `ComponentRenderer.ts:258-322` needs 2+ paragraphs > 30 chars. Add:

```typescript
// Pattern 5: Multiple paragraphs (common for feature descriptions)
// Split on double newline or <p> tags and treat each as a feature
const paragraphs = text.split(/(?:\n\s*\n|<\/p>\s*<p[^>]*>)/)
  .map(s => s.replace(/<[^>]+>/g, '').trim())
  .filter(s => s.length > 30);

if (paragraphs.length >= 2) {
  return {
    type: 'features',
    items: paragraphs.map(p => {
      // Try to extract a title from the first sentence
      const firstSentence = p.match(/^([^.!?]+[.!?])/)?.[1] || p.substring(0, 60);
      return { text: p, label: firstSentence };
    }),
    remainingProse: '',
    confidence: 0.45,
  };
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | findstr /i "ContentStructureParser"`
Expected: No errors

**Step 4: Manual validation**

1. Generate a preview in Style & Publish
2. Check console for:
   - `[ComponentRenderer] ✓ Extracted N items for feature-grid` (instead of "⚠ Could not extract")
3. Output HTML should show `feature-grid` divs with multiple items, not just plain `<p>` tags

**Step 5: Commit**

```bash
git add services/publishing/renderer/ContentStructureParser.ts
git commit -m "fix(parser): lower prose default confidence, add paragraph-based feature extraction"
```

---

## Task 5: Fix RLS Policies for Brand Data Caching

**Why:** Console shows `new row violates row-level security policy` for `brand_components`, `brand_design_dna`, `brand_design_systems`. This prevents caching brand data, forcing re-generation every time (slow + expensive).

**Files:**
- Create: `supabase/migrations/YYYYMMDD_fix_brand_rls.sql`

**Step 1: Write the migration SQL**

```sql
-- Fix RLS policies for brand data tables
-- These tables are used to cache extracted brand design data per project

-- brand_design_dna
ALTER TABLE IF EXISTS brand_design_dna ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their project brand DNA" ON brand_design_dna;
CREATE POLICY "Users can manage their project brand DNA" ON brand_design_dna
  FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- brand_design_systems
ALTER TABLE IF EXISTS brand_design_systems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their project brand systems" ON brand_design_systems;
CREATE POLICY "Users can manage their project brand systems" ON brand_design_systems
  FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- brand_components
ALTER TABLE IF EXISTS brand_components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their project brand components" ON brand_components;
CREATE POLICY "Users can manage their project brand components" ON brand_components
  FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
```

**Step 2: Deploy the migration**

Run: `supabase db push --use-api`
Or apply via Supabase dashboard SQL editor.

**Step 3: Manual validation**

1. Run Full Extraction in Style & Publish
2. Check console for ABSENCE of `row-level security policy` errors
3. Run extraction a second time with same brand URL
4. Check console for `[useBrandDetection] Using cached design system` (proves cache works)

**Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "fix(db): add RLS policies for brand_design_dna, brand_design_systems, brand_components"
```

---

## Task 6: Fix CSS Undefined Variables

**Why:** 8 undefined CSS variables in output (`--ctc-gradient-start`, `--ctc-gradient-end`, etc.). These default to nothing, causing invisible backgrounds and borders.

**Files:**
- Modify: `services/design-analysis/BrandDesignSystemGenerator.ts` — in `generateTokensFromDNA()`

**Step 1: Find the `:root` block in `generateTokensFromDNA()`**

Read the method and identify which variables are defined. Based on the console errors, these are missing from `:root`:

```
--ctc-gradient-start
--ctc-gradient-end
--ctc-card-bg
--ctc-card-border
--ctc-hover-bg
--ctc-hover-border
--ctc-text-muted
--ctc-text-heading
```

Add them to the `:root` block, derived from existing colors:

```css
--ctc-gradient-start: var(--ctc-primary);
--ctc-gradient-end: var(--ctc-primary-dark);
--ctc-card-bg: #ffffff;
--ctc-card-border: var(--ctc-border-color, #e5e7eb);
--ctc-hover-bg: var(--ctc-primary-light);
--ctc-hover-border: var(--ctc-primary);
--ctc-text-muted: var(--ctc-neutral-medium, #6b7280);
--ctc-text-heading: var(--ctc-neutral-darkest, #111827);
```

**Step 2: Run CSSPostProcessor test to verify no new undefined vars**

Use the existing test scratchpad or run:
```bash
npx vitest run --reporter=verbose services/design-analysis/ 2>&1
```

**Step 3: Manual validation**

After regenerating preview, check console for ABSENCE of `undefined CSS variable` warnings from CSSPostProcessor.

**Step 4: Commit**

```bash
git add services/design-analysis/BrandDesignSystemGenerator.ts
git commit -m "fix(css): add missing CSS custom properties (gradient, card, hover, text variants)"
```

---

## Task 7: End-to-End Validation

**Why:** All individual fixes need to work together. Run the full pipeline end-to-end and verify the output looks like a real brand website, not a template.

**Files:** None (validation only)

**Step 1: TypeScript compilation check**

Run: `npx tsc --noEmit --pretty`
Expected: 0 new errors in modified files

**Step 2: Run all tests**

Run: `npx vitest run --reporter=verbose 2>&1`
Expected: No new test failures vs. baseline (5 pre-existing failures are acceptable)

**Step 3: Full E2E manual test**

1. Start dev server: `npm run dev`
2. Login as richard@kjenmarks.nl / pannekoek
3. Open Resultaatmakers project → Topical map → select "SEO voor Groothandel"
4. Draft → generate article
5. Style & Publish:
   a. Enter brand URL: https://www.resultaatmakers.online
   b. Run Full Extraction
   c. Verify Brand Intelligence step shows correct colors (primary blue ~#1e73be, NOT #3b82f6)
   d. Verify fonts show "Open Sans" / "Poppins" (NOT "system-ui" / "sans-serif")
   e. Move to Layout Intelligence step → verify component variety (not all prose)
   f. Move to Preview step → verify output:
      - CSS has `@import url('https://fonts.googleapis.com/...')`
      - Colors match brand (blue headers, proper backgrounds)
      - Visual variety: cards, feature-grids, styled headings
      - No `#ffffff` as primary-light, no `#000000` as accent
      - Console has NO "Cannot read properties of undefined" errors
      - Console has NO "row-level security policy" errors

**Step 4: Document results**

Update `docs/plans/2026-01-29-brand-replication-validation-report.md` with new test results.

**Step 5: Commit**

```bash
git add docs/plans/
git commit -m "docs: update brand replication validation report with systematic fix results"
```

---

## Execution Order

Tasks 1-4 are independent and can be done in any order.
Task 5 (RLS) is independent but requires Supabase access.
Task 6 depends on reading the output from Task 3 to know exact variable names.
Task 7 depends on all previous tasks.

Recommended sequential order: **1 → 3 → 6 → 2 → 4 → 5 → 7**

Rationale:
- Task 1 fixes the production code path (highest impact)
- Task 3 fixes color quality (second highest impact, shares file with Task 6)
- Task 6 fixes undefined vars (same file as Task 3, do together)
- Task 2 fixes layout engine crashes (important but engine is disabled by default)
- Task 4 improves component diversity (medium impact)
- Task 5 fixes caching (lower urgency, requires DB access)
- Task 7 validates everything works together
