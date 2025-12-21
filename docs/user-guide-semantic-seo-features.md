# Semantic SEO Framework - User Guide

This guide covers the complete workflow for using the new Semantic SEO features based on Koray Tugberk GUBUR's methodology.

---

## Table of Contents

1. [Updating Existing Maps](#updating-existing-maps)
2. [Frame Semantics Expansion](#frame-semantics-expansion)
3. [Money Page 4 Pillars](#money-page-4-pillars)
4. [Query Templates & Local SEO](#query-templates--local-seo)
5. [Visual Semantics](#visual-semantics)
6. [Image Sitemap Export](#image-sitemap-export)
7. [E-commerce Content Networks](#e-commerce-content-networks)
8. [Social Signals for Knowledge Panel](#social-signals-for-knowledge-panel)
9. [Brand Consistency Tracking](#brand-consistency-tracking)

---

## Updating Existing Maps

Most new features work automatically with existing topical maps. Here's what requires action:

### Automatic (No Action Required)

| Feature | When It Applies |
|---------|-----------------|
| Visual Semantics in Briefs | When generating any new brief |
| 4 Pillars Analysis | When generating briefs for `monetization` topics |
| Frame Expansion Mode | Available for all topics in TopicDetailPanel |

### Manual Actions Required

| Feature | Action |
|---------|--------|
| Query Templates | Click "+ Templates" button in TopicalMapDisplay header |
| Location Variants | Add locations via Location Manager before generating |
| Enhanced Briefs | Re-generate briefs for existing topics to get visual semantics |
| New Export Sheets | Re-export your map to include Visual Semantics, Money Pillars, and Templates sheets |
| Image Sitemap | Export via new "Download Image Sitemap" option |

---

## Frame Semantics Expansion

**Use when:** Topics have weak competitor data, low search volume, or abstract concepts.

**What it does:** Analyzes the "scene" around a topic to find related subtopics from Frame Semantics (actions, participants, prerequisites, consequences).

### Workflow

1. **Open TopicalMapDisplay** and select a topic with sparse search data
2. **Click the topic** to open TopicDetailPanel
3. **Find the expansion grid** with buttons for different expansion modes
4. **Click "Frame/Scene" button**
5. **Review the AI analysis:**
   - Frame elements (actions, participants, settings)
   - Scene consequences and prerequisites
   - Generated subtopics from each perspective
6. **Select subtopics to accept** - they become outer topics with frame metadata
7. **EAVs are auto-generated** from frame elements (e.g., "Topic hasAction Cook", "Topic requiresParticipant Chef")

### Best Use Cases

- Management/strategy topics ("Project Management")
- Optimization topics ("SEO Optimization")
- Process topics ("Onboarding Process")
- Abstract concepts with low keyword data

### Example

**Topic:** "Restaurant Kitchen Management"

**Frame Analysis:**
- **Actions:** Supervise, Organize, Train, Inventory
- **Participants:** Head Chef, Line Cooks, Dishwashers
- **Settings:** Commercial Kitchen, Walk-in Cooler
- **Consequences:** Food Quality, Staff Efficiency

**Generated Subtopics:**
- "Head Chef Responsibilities in Kitchen Management"
- "Kitchen Inventory Management Best Practices"
- "Training Line Cooks Effectively"

---

## Money Page 4 Pillars

**Use when:** Creating content for commercial/transactional pages (services, products).

**What it does:** Evaluates briefs against 4 pillars: Verbalization, Contextualization, Monetization, Visualization.

### Workflow

1. **Mark topic as monetization:** When creating or editing a topic, set `topic_class: 'monetization'`
2. **Generate Content Brief** for that topic
3. **AI automatically applies 4 Pillars requirements** to the brief prompt
4. **Open brief in ContentBriefModal**
5. **View MoneyPagePillarsIndicator:**
   - 4 circular scores showing pillar completion
   - Click to expand the full checklist
   - Items grouped by category (headlines, psychology, CTA, etc.)
6. **Use checklist to verify page covers:**

| Pillar | Key Items |
|--------|-----------|
| Verbalization | Benefit-focused headlines, power words, social proof language |
| Contextualization | Industry context, competitor differentiation, unique value proposition |
| Monetization | Primary CTA above fold, multiple CTA placements, FAQ with internal links |
| Visualization | Hero image, trust badges, testimonials with photos |

7. **Export includes Money Pillars sheet** with scores for all monetization topics

### FAQ PageRank Strategy (New)

The Monetization pillar now includes FAQ guidance:

- **m11:** Add FAQ section for broader questions (captures additional queries)
- **m12:** Include internal links in FAQ answers (distributes PageRank)
- **m13:** Add FAQPage schema markup (enables rich results)

**Example FAQ Strategy for "Plumber in Amsterdam":**
- "How do I know if I need emergency plumbing?" → links to Emergency Guide
- "What should I check before calling a plumber?" → links to DIY Checklist
- "How often should pipes be inspected?" → links to Maintenance Schedule

---

## Query Templates & Local SEO

**Use when:** Scaling Local SEO across multiple cities or generating systematic topic variations.

### Basic Workflow

1. **In TopicalMapDisplay,** click "+ Templates" button in header
2. **QueryTemplatePanel opens** with template categories:
   - Local SEO ("Best [Service] in [City]")
   - Comparison ("[Product A] vs [Product B]")
   - How-To, Cost, Problem-Solution, etc.
3. **Select a template category** (e.g., Local)
4. **Choose a template** (e.g., "Best [Service] in [City]")
5. **Fill placeholder values:**
   - Service: "Plumber"
6. **Click "Manage Locations"** to open LocationManagerModal

### Location Manager Workflow

1. **Load preset** (Netherlands, US, UK cities) OR
2. **Add manually:** Name, Type (city/region/neighborhood), Population, Coordinates
3. **Import from CSV:** name,type,population,lat,lng,parent_id format
4. **Close modal** when locations are ready

### Using Location Aliases (New Feature)

When generating topics, the system now understands location aliases:

| Canonical Name | Recognized Aliases |
|---------------|-------------------|
| New York | NYC, NY, The Big Apple, Manhattan |
| Houston | H-Town, HTown, HOU, Space City |
| Los Angeles | LA, L.A., Hollywood, SoCal |
| Amsterdam | AMS, A'dam, Mokum, Dam |
| London | LON, The Big Smoke, The City |

**To include alias variants:**
1. In template generation options, enable "Include Aliases"
2. Set alias limit (default: 2 per location)
3. System generates topics for both:
   - "Best Plumber in Houston"
   - "Best Plumber in H-Town"
   - "Best Plumber in HTown"

### Completing Template Generation

1. **Select locations** from the list
2. **Preview generated queries** at bottom of panel
3. **Click "Generate Topics"**
4. **Topics created as outer topics** under selected parent
5. **Export includes Query Templates sheet** with all generated variants

### Template Popularity (New Feature)

Templates now show search volume indicators:

- **Green (Very High):** 50K+ monthly searches
- **Blue (High):** 15K-50K monthly searches
- **Amber (Medium):** 5K-15K monthly searches
- **Gray (Low):** Under 5K monthly searches

**Opportunity Score:** Sort templates by (Volume × Competition Inverse) to find best ranking opportunities.

---

## Visual Semantics

**Use when:** Generating any content brief - visual semantics are now automatic.

### How It Works

1. **Generate any Content Brief**
2. **System auto-enriches with `enhanced_visual_semantics`:**
   - Hero image specs (description, alt text, file name)
   - Section-by-section image recommendations
   - Image N-grams (expected image types from SERP)
   - Ready-to-copy HTML templates

### Viewing Visual Semantics

1. **Open brief in ContentBriefModal**
2. **Scroll to VisualSemanticsPanel**
3. **For each image, you'll see:**

| Field | Description |
|-------|-------------|
| Image Description | What the image should show |
| Alt Text | SEO-optimized alt attribute with entities |
| File Name | Pattern: `[entity]-[descriptor]-[context].avif` |
| Format | AVIF > WebP > JPEG (with fallbacks) |
| HTML Template | Copy-ready `<figure>/<picture>` markup |

### Alt Text Best Practices (Enforced)

The system follows Koray's 7 characteristics:
1. Contains at least one entity name
2. Natural language flow (no forced keywords)
3. Describes content AND purpose
4. No keyword stuffing (max 1 occurrence each)
5. Aligns with search intent
6. Supports accessibility
7. Matches file name vocabulary

### Example Output

**Topic:** "Tesla Model 3 Charging at Home"

**Hero Image:**
- **Description:** Tesla Model 3 connected to wall-mounted home charging station in residential garage
- **Alt Text:** Tesla Model 3 white sedan charging overnight at home Wall Connector installation
- **File Name:** `tesla-model-3-home-charging-garage.avif`
- **HTML:** Complete `<figure>` with `<picture>` fallbacks and `<figcaption>`

---

## Image Sitemap Export

**Use when:** Ready to help Google discover your images for Google Images ranking.

### Workflow

1. **Ensure briefs have visual semantics** (generate/regenerate if needed)
2. **Go to Export options** in TopicalMapDisplay
3. **Click "Download Image Sitemap"**
4. **Configure options:**
   - Base URL (your domain)
   - Include hero images (recommended)
   - Include section images (optional)
5. **Download `image-sitemap.xml`**
6. **Upload to your site root** (e.g., `example.com/image-sitemap.xml`)
7. **Add to robots.txt:** `Sitemap: https://example.com/image-sitemap.xml`
8. **Submit in Google Search Console**

### Sitemap Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://example.com/tesla-model-3-home-charging</loc>
    <image:image>
      <image:loc>https://example.com/images/tesla-model-3-home-charging-garage.avif</image:loc>
      <image:caption>Tesla Model 3 connected to wall-mounted home charging station</image:caption>
      <image:title>Tesla Model 3 Home Charging Setup</image:title>
    </image:image>
  </url>
</urlset>
```

---

## E-commerce Content Networks

**Use when:** Building comprehensive category coverage for e-commerce sites.

### What It Does

Creates a complete semantic content network around a product category using Koray's Query Augmentation Hierarchy:

| Level | Page Type | Templates |
|-------|-----------|-----------|
| 1 | Category Pillar | "[Category] Buying Guide" |
| 2 | Context Pages | "Types of [Category]", "Best [Category] [Year]" |
| 3 | Attribute Pages | "[Category] Size Guide", "Best [Material] [Category]" |
| 4 | Audience Pages | "Best [Category] for [Audience]", "[Category] for [Condition]" |
| 5 | Price Pages | "[Category] Under [Price]", "Cheap [Category]" |
| 6 | Brand Comparison | "[Brand A] vs [Brand B] [Category]" |
| 7 | Support Content | "How to Clean [Category]", "How Long Do [Category] Last" |

### Workflow

1. **Open Query Templates panel**
2. **Select "E-commerce" category**
3. **Click "Generate Content Network"**
4. **Enter product category:** e.g., "Running Shoes"
5. **Add optional variables:**
   - Brands: Nike, Adidas, New Balance
   - Audiences: Beginners, Marathon Runners, Women
   - Materials: Mesh, Gore-Tex, Leather
   - Use Cases: Trail Running, Daily Training
6. **Preview the network structure**
7. **Click "Generate All"**
8. **Topics created with correct hierarchy levels**

### Example: Running Shoes Network

**Input:** Category = "Running Shoes", Brands = [Nike, Adidas], Audiences = [Beginners, Marathon Runners]

**Generated Topics (17 pages):**
- Running Shoes Buying Guide (Pillar)
- Types of Running Shoes (Context)
- Best Running Shoes 2024 (Context)
- Running Shoes Size Guide (Attribute)
- Best Running Shoes for Beginners (Audience)
- Best Running Shoes for Marathon Runners (Audience)
- Cheap Running Shoes (Price)
- Luxury Running Shoes (Price)
- Best Nike Running Shoes (Brand)
- Best Adidas Running Shoes (Brand)
- How to Clean Running Shoes (Support)
- How Long Do Running Shoes Last (Support)

### Internal Linking Strategy

The system provides linking guidance for each level:
- **Pillar** links to all Level 2-7 pages
- **Attribute pages** link to pillar and relevant products
- **Audience pages** link to pillar and related audiences
- **Support content** links to pillar (passes PageRank without competing)

---

## Social Signals for Knowledge Panel

**Use when:** Building entity authority and working toward Knowledge Panel eligibility.

### What It Does

Tracks and scores your presence across platforms that contribute to entity recognition:

| Platform | KP Weight | Best For |
|----------|-----------|----------|
| YouTube | 9/10 | Persons, Organizations, Brands |
| LinkedIn | 9/10 | Persons, Organizations |
| Twitter/X | 8/10 | Persons, Organizations, Brands |
| GitHub | 8/10 | Persons, Organizations, Software |
| Facebook | 7/10 | Organizations, Local Businesses |
| Instagram | 7/10 | Persons, Brands |
| Medium | 6/10 | Persons, Organizations |
| TikTok | 5/10 | Persons, Brands |
| Quora | 5/10 | Persons, Organizations |
| Pinterest | 4/10 | Brands, Organizations |

### Workflow

1. **Go to Project Dashboard**
2. **Open Social Signals Panel**
3. **Add your social profiles:**
   - Enter URL
   - System auto-detects platform
   - Mark verification status
   - Add follower count (optional)
4. **View your scores:**
   - Per-platform score (0-100)
   - Factors achieved/missing
   - Overall KP Readiness indicator
5. **Review Action Checklist:**
   - High priority: Missing critical platforms, verification needed
   - Medium priority: Consistency issues, activity levels
   - Low priority: Cross-linking, schema markup

### KP Readiness Levels

| Level | Meaning | Requirements |
|-------|---------|--------------|
| Not Ready | Early stage | Score <40, <2 platforms |
| Building | Making progress | Score 40-60, 2+ platforms |
| Ready | Good foundation | Score 60-80, 3+ platforms |
| Strong | Excellent position | Score 80+, 5+ platforms, verified |

### Corroboration Matrix

The system tracks whether your entity facts are consistent across platforms:

| Fact | Sources | Issues |
|------|---------|--------|
| Entity Name | YouTube, LinkedIn, Twitter | Instagram (different name) |
| Website Link | All platforms | None |
| Verification | YouTube, Twitter | LinkedIn, Facebook |

**Fix inconsistencies** to improve corroboration score and KP eligibility.

### Action Checklist Example

For a Software Company:

1. **HIGH:** Create LinkedIn company page with consistent naming
2. **HIGH:** Get verified on YouTube and Twitter
3. **HIGH:** Update Instagram display name to match official entity name
4. **MEDIUM:** Increase posting frequency on LinkedIn
5. **MEDIUM:** Add sameAs schema markup to website
6. **LOW:** Cross-link all social profiles

---

## Brand Consistency Tracking

**Use when:** Ensuring visual brand identity is maintained across all content.

### What It Does

Analyzes images for brand consistency based on Koray's case study: "visual brand consistency functions as entity signal."

### Key Metrics

| Metric | Weight | What It Measures |
|--------|--------|------------------|
| Color Presence | 35% | Brand colors in images |
| Logo Usage | 25% | Logo placement in hero/infographics |
| Style Consistency | 25% | Photographic vs illustrative uniformity |
| Overlay Consistency | 10% | Gradient/color treatment |
| Typography | 5% | Text-on-image styling |

### Workflow

1. **Set up Brand Profile** in Business Info:
   - Primary color (hex)
   - Secondary color (hex)
   - Accent color for CTAs
   - Logo placement preference
   - Image style preference
2. **Generate Content Briefs**
3. **View Brand Consistency Score** in brief modal
4. **Review Issues:**
   - "Only 40% of images contain brand colors"
   - "Logo appears in 3 different positions"
5. **Follow Recommendations:**
   - Add colored borders/overlays to images
   - Standardize logo position (bottom-right at 85% opacity)
   - Use consistent image style (photographic)
6. **Export CSS Variables** for development team:

```css
:root {
  --brand-primary: #1E3A5F;
  --brand-secondary: #2196F3;
  --brand-accent: #FF9800;
  --brand-logo-opacity: 0.85;
  --brand-border-radius: 8px;
}
```

### Best Practices

1. **Add brand color overlay** to hero images (gradient from primary color)
2. **Place logo consistently** (recommended: bottom-right, 85% opacity)
3. **Use one image style** across all content (don't mix photos and illustrations)
4. **Apply brand border radius** to all images (8px recommended)
5. **Include brand colors** in infographics and diagrams

---

## Historical Usage Tracking

**Use when:** Understanding your template usage patterns and getting personalized suggestions.

### What It Tracks

- Which templates you've used
- When you used them
- What variable values you entered
- How many topics were generated

### Viewing Analytics

1. **Open Query Templates panel**
2. **Click "Usage Analytics" tab**
3. **View dashboard:**
   - Most used templates (ranked)
   - Most productive templates (by topics generated)
   - Recent activity timeline
   - Usage trend (increasing/stable/decreasing)

### Personalized Suggestions

Based on your history, the system suggests:

1. **Variable Values:** Previously used values for each placeholder
2. **Similar Templates:** Unused templates from your favorite categories
3. **Unused Templates:** Templates you haven't tried yet

### Export/Import

- **Export History:** Download JSON for backup
- **Import History:** Restore from backup
- **Clear History:** Start fresh

---

## Complete Workflow: New Topical Map

Here's the recommended workflow for a new project using all features:

### Phase 1: Setup

1. Create new project with business info
2. Set up brand profile (colors, logo placement)
3. Add social profiles for entity tracking
4. Complete SEO Pillars and EAV Discovery

### Phase 2: Core Topics

1. Generate initial topical map
2. Use Frame Expansion for abstract/low-data topics
3. Mark commercial topics as `monetization`

### Phase 3: Local/Variations

1. Open Query Templates
2. Load location presets for your market
3. Generate local variants with aliases enabled
4. Use e-commerce templates for product categories

### Phase 4: Briefs & Optimization

1. Generate content briefs (visual semantics auto-applied)
2. Review 4 Pillars scores for monetization topics
3. Check brand consistency scores
4. Address any issues flagged

### Phase 5: Export

1. Export enhanced XLSX with all new sheets
2. Download image sitemap
3. Review social signals action items
4. Implement schema markup recommendations

---

## Troubleshooting

### Visual Semantics Not Appearing

- Ensure you're generating **new** briefs (existing briefs need regeneration)
- Check that topic has sufficient context (title, description, EAVs)

### 4 Pillars Score Low

- Verify topic is marked as `topic_class: 'monetization'`
- Review the checklist - focus on critical items first
- Re-generate brief after adding missing elements to topic context

### Location Aliases Not Working

- Check spelling matches exactly (case-insensitive)
- Add custom aliases via `addCustomAlias()` if needed
- Verify "Include Aliases" is enabled in generation options

### Image Sitemap Empty

- Ensure briefs have `enhanced_visual_semantics` (regenerate if needed)
- Check that base URL is correctly formatted
- Verify hero/section image options are enabled

---

## API Reference

### Key Functions

```typescript
// Image Sitemap
generateImageSitemap(input, options) → string
downloadImageSitemap(input, options, filename)

// Location Aliases
resolveLocationAlias('NYC') → 'New York'
getLocationAliases('Houston') → ['H-Town', 'HTown', 'HOU']
generateVariantsWithAliases(template, locations, mapId, parentId, options)

// Social Signals
calculatePlatformScore(platform, profile) → SocialSignalScore
generateSocialSignalReport(profiles) → OverallSocialSignalReport
generateKPActionChecklist(profiles, entityType) → ActionItem[]

// Brand Consistency
calculateBrandConsistencyScore(images, brandProfile) → BrandConsistencyScore
generateBrandCSSVariables(profile) → string

// Template Popularity
getTemplatesByPopularity() → QueryTemplate[]
getTemplatesByOpportunity() → QueryTemplate[] (with opportunity_score)
getVolumeTier(volume) → 'very-high' | 'high' | 'medium' | 'low'

// E-commerce Network
generateEcommerceContentNetwork(category, options) → NetworkItem[]
getTemplatesForHierarchyLevel(level) → QueryTemplate[]

// Usage Tracking
recordTemplateUsage(templateId, mapId, variables, topicsCount)
getUsageAnalytics() → UsageAnalytics
getSuggestedVariableValues(templateId, placeholder) → string[]
```

---

*Last updated: December 2024*
*Based on Koray Tugberk GUBUR's Semantic SEO Framework*
