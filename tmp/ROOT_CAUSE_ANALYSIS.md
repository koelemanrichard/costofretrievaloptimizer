# Root Cause Analysis: Why Output Looks Broken

## Executive Summary

The "Style & Publish" output looks like a broken template because of **3 architectural failures** that compound to produce unusable HTML/CSS.

---

## FAILURE 1: Brand Extraction System Not Connected

### What Was Supposed to Happen
```
User enters brand URL → Extract HTML components from site → Store in ComponentLibrary
                                                                    ↓
BrandAwareComposer uses real brand components → High-quality output
```

### What Actually Happens
```
User enters brand URL → Extract DesignDNA (colors/fonts only) → Generate CSS
                                                                    ↓
ComponentLibrary is EMPTY → hasBrandExtraction() returns false
                                                                    ↓
Falls back to BlueprintRenderer with template HTML + incomplete CSS
```

### Evidence
From console logs:
```
[STYLING PIPELINE] Brand extraction check result: false
[STYLING PIPELINE] STEP 3B: ROUTING TO BlueprintRenderer (FALLBACK PATH)
[STYLING PIPELINE] Reason: No brand extraction components found for project
```

### Root Cause
`useBrandExtraction` hook requires Apify token and edge functions to extract components, but the Style & Publish modal NEVER calls this hook. It only calls `BrandDesignSystemGenerator` which extracts colors/fonts, not HTML components.

---

## FAILURE 2: CSS Variables Not Defined

### The Problem
The `:root` section defines some variables, but AI-generated CSS references UNDEFINED variables:

| Variable Used in CSS | Defined in :root? | Result |
|---------------------|-------------------|--------|
| `--ctc-borders-dividers` | NO | CSS property has no value |
| `--ctc-backgrounds` | NO | Transparent backgrounds |
| `--ctc-text-medium` | NO | Text has no color |
| `--ctc-text-dark` | NO | Text has no color |
| `--ctc-text-darkest` | NO | Text has no color |

### Evidence
From generated CSS:
```css
:root {
  --ctc-primary: #004a7c;
  --ctc-neutral-darkest: #111827;
  /* --ctc-borders-dividers NOT DEFINED */
  /* --ctc-backgrounds NOT DEFINED */
  /* --ctc-text-medium NOT DEFINED */
}

/* But later, AI-generated component CSS uses: */
.ctc-card {
  border: 1px solid var(--ctc-borders-dividers);  /* UNDEFINED! */
  background-color: var(--ctc-backgrounds);        /* UNDEFINED! */
}
```

### Root Cause
`generateTokensFromDNA()` in `BrandDesignSystemGenerator.ts` only defines 40 variables, but AI prompts don't specify which variables to use, so AI invents variable names that don't exist.

---

## FAILURE 3: Missing Component Styles

### Components Without CSS
| Component Class | Used in HTML? | Has CSS? |
|-----------------|---------------|----------|
| `.ctc-toc` | YES | NO |
| `.ctc-toc-list` | YES | NO |
| `.ctc-toc-item` | YES | NO |
| `.ctc-cta-banner` | YES | NO |
| `.ctc-cta-banner-inner` | YES | NO |
| `.ctc-lead-paragraph` | YES | NO |
| `.ctc-main` | YES | NO |
| `.ctc-article` | YES | NO |
| `.ctc-root` | YES | NO |

### Base Layout Missing
```css
/* MISSING: */
body { font-size: ???; line-height: ???; }
.container { max-width: ???; margin: 0 auto; }
main { padding: ???; }
```

### Root Cause
`BrandDesignSystemGenerator` only generates CSS for 12 component types: button, card, hero, timeline, testimonial, faq, cta, keyTakeaways, prose, list, table, blockquote.

But `BlueprintRenderer` outputs HTML using additional components (toc, lead-paragraph, cta-banner, etc.) that have NO CSS.

---

## The Visual Result

Because of these 3 failures:
1. **Text is tiny** - No body font-size, no container max-width
2. **No visual structure** - TOC, CTA-banner, lead-paragraph have no styles
3. **Broken borders/backgrounds** - CSS variables undefined, so properties have no value
4. **Template look** - Same HTML for all brands, only colors change

---

## Solutions

### Option A: Complete the Brand Extraction System
- Make `useBrandExtraction` work in Style & Publish modal
- Extract REAL HTML components from brand site
- Use `BrandAwareComposer` instead of `BlueprintRenderer`

**Pros:** Produces true brand replication
**Cons:** Requires Apify, complex, may have legal issues copying HTML

### Option B: Fix the CSS Generation (Recommended)
- Add ALL missing CSS variables to `generateTokensFromDNA()`
- Add styles for ALL components used by BlueprintRenderer
- Add base layout CSS (body, container, main)

**Pros:** Quick fix, works with existing system
**Cons:** Still template-based, but at least looks professional

### Option C: Replace with Clean Output Generator
- Create new renderer that outputs clean, semantic HTML
- Generate complete, standalone CSS
- Don't try to "replicate brands" - just make it look good

**Pros:** Architectural simplicity, reliable output
**Cons:** Doesn't match any brand, but looks professional

---

## Recommended Fix (Option B + improvements)

1. **Add missing CSS variables to `generateTokensFromDNA()`:**
```typescript
json['--ctc-borders-dividers'] = neutrals?.light || '#e5e7eb';
json['--ctc-backgrounds'] = neutrals?.lightest || '#ffffff';
json['--ctc-text-darkest'] = neutrals?.darkest || '#111827';
json['--ctc-text-dark'] = neutrals?.dark || '#374151';
json['--ctc-text-medium'] = neutrals?.medium || '#6b7280';
```

2. **Add CSS for ALL components used in BlueprintRenderer:**
- `.ctc-toc`, `.ctc-toc-list`, `.ctc-toc-item`, `.ctc-toc-link`
- `.ctc-cta-banner`, `.ctc-cta-banner-inner`, `.ctc-cta-banner-title`
- `.ctc-lead-paragraph`, `.ctc-lead-paragraph-content`
- `.ctc-main`, `.ctc-article`, `.ctc-root`, `.ctc-styled`

3. **Add base layout CSS:**
```css
body {
  font-family: var(--ctc-font-body);
  font-size: var(--ctc-font-size-md);
  line-height: 1.6;
  color: var(--ctc-text-dark);
}

.ctc-root {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}
```

This will transform the broken output into something that at least looks professional, even if it's still "template-based".
