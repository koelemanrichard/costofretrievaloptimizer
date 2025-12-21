# Comprehensive Webpage Audit System - User Manual

This manual provides step-by-step instructions for using the audit system features to analyze and optimize your content for search engines and AI systems.

---

## Table of Contents

1. [E-A-T Scanner](#1-e-a-t-scanner)
2. [Corpus Audit](#2-corpus-audit)
3. [Query Network Analysis](#3-query-network-analysis)
4. [Enhanced Metrics Dashboard](#4-enhanced-metrics-dashboard)
5. [Exporting Reports](#5-exporting-reports)
6. [Interpreting Results](#6-interpreting-results)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. E-A-T Scanner

### What It Does

The E-A-T (Expertise, Authority, Trust) Scanner analyzes your brand or entity's online presence across authoritative sources to determine how search engines and AI systems perceive your credibility.

### When to Use

- Before launching a new website or brand
- When auditing an existing brand's online authority
- When planning E-A-T improvement strategies
- Before major content campaigns

### Step-by-Step Usage

#### Step 1: Access the Scanner

1. Navigate to the **Dashboard**
2. Look for the **Advanced Analysis** panel
3. Click the **"E-A-T Scanner"** button

#### Step 2: Configure the Scan

| Field | Description | Example |
|-------|-------------|---------|
| **Entity Name** | Your brand, company, or personal name | "Acme Corporation" |
| **Domain** | Your website domain (without https://) | "acme.com" |
| **Industry** | Your business sector | "Technology", "Healthcare" |
| **Language** | Primary content language | "en" (English) |

#### Step 3: Select Data Sources

Check the boxes for the sources you want to scan:

- **Include Reviews** - Scans review platforms (Google Reviews, Trustpilot, industry-specific)
- **Include Social Mentions** - Analyzes social media presence and mentions
- **Include News Articles** - Searches news coverage and press mentions

#### Step 4: Run the Scan

1. Click **"Run Scan"**
2. Watch the progress indicator (typically 30-60 seconds)
3. Wait for all phases to complete:
   - Phase 1: Wikipedia verification
   - Phase 2: Wikidata entity lookup
   - Phase 3: Knowledge Graph check
   - Phase 4: Reputation signal gathering
   - Phase 5: Co-occurrence analysis

### Expected Output

#### Overview Tab

| Metric | What It Means |
|--------|---------------|
| **Overall Sentiment** | Aggregate sentiment (Positive/Negative/Mixed/Neutral) |
| **Wikipedia Status** | Whether a Wikipedia article exists for your entity |
| **Wikidata ID** | Your entity's unique Wikidata identifier (if found) |
| **Knowledge Graph** | Whether Google recognizes your entity |

#### E-A-T Breakdown Tab

| Score | Range | Interpretation |
|-------|-------|----------------|
| **Expertise Score** | 0-100 | How well you demonstrate subject matter expertise |
| **Authority Score** | 0-100 | Recognition from authoritative sources |
| **Trust Score** | 0-100 | Trustworthiness signals and verification |
| **Overall E-A-T** | 0-100 | Weighted composite score |

**Score Interpretation:**
- 85-100: Excellent - Strong authority signals
- 70-84: Good - Established presence, room for improvement
- 50-69: Moderate - Needs significant E-A-T building
- Below 50: Low - Requires immediate attention

#### Reputation Tab

Lists all found reputation signals:
- Source name and type
- Sentiment (positive/negative/neutral)
- Snippet of the mention
- Date found (if available)

#### Recommendations Tab

Prioritized list of actions to improve E-A-T:
- **Critical** - Must address immediately
- **High** - Address within 30 days
- **Medium** - Address within 90 days
- **Low** - Nice-to-have improvements

### Example Output

```
Entity: Acme Corporation
Wikipedia: Found (article exists)
Wikidata ID: Q12345678
Knowledge Graph: Registered

E-A-T Scores:
- Expertise: 72/100
- Authority: 68/100
- Trust: 81/100
- Overall: 74/100

Top Recommendations:
1. [HIGH] Add more citations to Wikipedia article
2. [MEDIUM] Increase presence on industry review sites
3. [MEDIUM] Publish thought leadership content
```

---

## 2. Corpus Audit

### What It Does

The Corpus Audit analyzes your entire website to identify content patterns, duplicate content issues, anchor text problems, and semantic coverage gaps.

### When to Use

- Quarterly site health checks
- Before major content migrations
- After significant content additions
- When diagnosing ranking issues

### Step-by-Step Usage

#### Step 1: Access the Audit

1. Navigate to the **Dashboard**
2. Find the **Advanced Analysis** panel
3. Click **"Corpus Audit"**

#### Step 2: Configure the Audit

| Field | Description | Recommendation |
|-------|-------------|----------------|
| **Domain** | Your website domain | "yourdomain.com" |
| **Sitemap URL** | Path to your XML sitemap | "https://yourdomain.com/sitemap.xml" |
| **Page Limit** | Maximum pages to audit | Start with 50-100 |
| **Check Overlap** | Detect duplicate content | Enable |
| **Check Anchors** | Analyze internal link text | Enable |

#### Step 3: Select Target EAVs (Optional)

If you have EAVs defined in your topical map, you can select them to measure semantic coverage. This shows which semantic concepts are covered across your site.

#### Step 4: Run the Audit

1. Click **"Start Audit"**
2. Monitor progress through phases:
   - Phase 1: Sitemap discovery
   - Phase 2: Page crawling
   - Phase 3: Content extraction
   - Phase 4: Overlap detection
   - Phase 5: Anchor analysis
   - Phase 6: Coverage calculation

### Expected Output

#### Pages Tab

| Column | Description |
|--------|-------------|
| **URL** | Page address |
| **Title** | Page title tag |
| **Word Count** | Content length |
| **Status** | HTTP status code |
| **Issues** | Number of problems found |

#### Overlaps Tab

Shows pairs of pages with significant content similarity:

| Column | Description |
|--------|-------------|
| **Page A** | First page URL |
| **Page B** | Second page URL |
| **Similarity %** | How similar the content is |
| **Shared Phrases** | Common text segments |

**Similarity Thresholds:**
- 80%+ : Critical - Likely duplicate content issue
- 60-79%: Warning - Significant overlap, review needed
- 40-59%: Moderate - Some overlap, may be intentional
- Below 40%: Normal - Acceptable similarity

#### Anchor Patterns Tab

| Pattern | Issue | Action |
|---------|-------|--------|
| **Generic Anchors** | "Click here", "Read more" | Replace with descriptive text |
| **Repetitive Anchors** | Same text used 10+ times | Vary anchor text |
| **Missing Anchors** | Pages with no internal links | Add contextual links |
| **Over-optimized** | Exact match keywords | Diversify anchor text |

#### Semantic Coverage Tab

If target EAVs were selected:

| Metric | Description |
|--------|-------------|
| **Coverage %** | Percentage of EAVs found in content |
| **Covered EAVs** | List of semantic concepts present |
| **Missing EAVs** | Concepts not found on any page |
| **Recommendations** | Content to create for gaps |

### Example Output

```
Domain: example.com
Pages Audited: 87
Total Issues: 23

Content Overlaps: 4 pairs found
- /services/web-design ↔ /services/website-design (82%)
- /blog/seo-tips ↔ /blog/seo-guide (71%)

Anchor Issues: 12 found
- "Click here" used 8 times
- "Learn more" used 15 times

Semantic Coverage: 67%
- Covered: 42/63 EAVs
- Missing: 21 EAVs (content gaps identified)
```

---

## 3. Query Network Analysis

### What It Does

Analyzes search queries related to your topic to understand user intent, competitive landscape, and content opportunities.

### When to Use

- Planning new content
- Competitive analysis
- Keyword research
- Content gap identification

### Step-by-Step Usage

#### Step 1: Access the Analysis

1. Navigate to the **Dashboard**
2. Find **Query Network Analysis** panel
3. Click **"Start Analysis"**

#### Step 2: Enter Seed Keywords

| Field | Description | Example |
|-------|-------------|---------|
| **Primary Keyword** | Main topic to analyze | "content marketing" |
| **Secondary Keywords** | Related terms (optional) | "content strategy, blogging" |
| **Target Market** | Geographic focus | "United States" |
| **Language** | Content language | "English" |

#### Step 3: Configure Analysis

| Option | Description |
|--------|-------------|
| **Query Depth** | How many query variations to generate (10-100) |
| **Competitor Analysis** | Enable to extract competitor EAVs |
| **Intent Classification** | Categorize queries by user intent |

#### Step 4: Run Analysis

1. Click **"Analyze"**
2. Processing phases:
   - Query generation
   - Intent classification
   - SERP analysis
   - EAV extraction
   - Gap identification

### Expected Output

#### Query Network Tab

| Query | Intent | Volume | Difficulty |
|-------|--------|--------|------------|
| "what is content marketing" | Informational | High | Low |
| "content marketing services" | Commercial | Medium | High |
| "content marketing examples" | Informational | Medium | Medium |

**Intent Types:**
- **Informational** - User wants to learn something
- **Commercial** - User is researching products/services
- **Navigational** - User looking for specific site/page
- **Transactional** - User ready to take action

#### Competitor EAVs Tab

Shows semantic triples extracted from top-ranking content:

| Entity | Attribute | Value | Source |
|--------|-----------|-------|--------|
| Content Marketing | definition | strategic approach | competitor1.com |
| Content Marketing | benefit | increases traffic | competitor2.com |

#### Content Gaps Tab

| Gap | Priority | Recommendation |
|-----|----------|----------------|
| "ROI calculation" | High | Create calculator tool |
| "Case studies" | Medium | Add industry examples |
| "Templates" | Medium | Create downloadable resources |

#### Questions Tab

Questions extracted for Featured Snippet optimization:

```
- What is content marketing?
- How does content marketing work?
- Why is content marketing important?
- How much does content marketing cost?
```

---

## 4. Enhanced Metrics Dashboard

### What It Does

Visualizes semantic compliance, authority indicators, and provides a prioritized action roadmap based on your EAV data and audit results.

### When to Use

- Regular monitoring of content health
- Tracking improvement over time
- Identifying optimization priorities
- Reporting to stakeholders

### Accessing the Dashboard

1. Ensure you have **EAVs defined** in your topical map
2. Navigate to your project **Dashboard**
3. The **Enhanced Metrics Dashboard** appears automatically
4. Or click **"View Enhanced Metrics"** button

### Understanding the Metrics

#### Semantic Compliance Score

| Score Range | Status | Meaning |
|-------------|--------|---------|
| 85-100% | Excellent | Target achieved, maintain quality |
| 70-84% | Good | On track, continue optimization |
| 50-69% | Needs Work | Significant gaps to address |
| Below 50% | Critical | Immediate action required |

**What affects this score:**
- EAV coverage across content
- Category balance (UNIQUE, ROOT, RARE, COMMON)
- Predicate diversity
- Information density

#### Authority Score

| Indicator | Weight | Description |
|-----------|--------|-------------|
| UNIQUE EAVs | 40% | Proprietary insights only you have |
| ROOT EAVs | 30% | Foundational facts about your topic |
| RARE EAVs | 20% | Specialized knowledge |
| COMMON EAVs | 10% | General facts (table stakes) |

**Target:** 75% authority score with emphasis on UNIQUE and ROOT EAVs.

#### Information Density

| Metric | Target | Description |
|--------|--------|-------------|
| Facts per Topic | 5+ | Number of EAVs per topic |
| Topical Depth | 70%+ | Coverage of topic dimensions |

### Category Distribution Chart

Shows the breakdown of your EAVs:

| Category | Ideal Range | Purpose |
|----------|-------------|---------|
| **UNIQUE** | 15-25% | Differentiates your content |
| **ROOT** | 25-35% | Establishes foundational authority |
| **RARE** | 20-30% | Demonstrates expertise |
| **COMMON** | 20-30% | Covers basic expectations |

### Classification Distribution Chart

Shows predicate type usage:

| Type | Purpose | Example |
|------|---------|---------|
| TYPE | Defines what something is | "X is a Y" |
| COMPONENT | Parts and elements | "X contains Y" |
| BENEFIT | Advantages | "X provides Y" |
| RISK | Warnings and cautions | "X may cause Y" |
| PROCESS | How things work | "X involves Y" |
| SPECIFICATION | Details and specs | "X measures Y" |

**Goal:** Use at least 3-4 different classification types for comprehensive coverage.

### Action Roadmap

Prioritized recommendations:

| Priority | Timeline | Action Required |
|----------|----------|-----------------|
| **Critical** | Immediate | Blocking issues |
| **High** | This week | Major improvements |
| **Medium** | This month | Optimizations |
| **Low** | When possible | Nice-to-haves |

---

## 5. Exporting Reports

### Available Export Formats

| Format | Best For | Includes |
|--------|----------|----------|
| **XLSX** | Detailed analysis, data manipulation | All metrics, multiple tabs |
| **HTML** | Sharing, presentations | Visual report, charts |
| **PDF** | Printing, archiving | Formatted document |
| **JSON** | Integration, backup | Raw data |
| **ZIP** | Complete archive | All formats combined |

### XLSX Export

#### How to Export

1. Navigate to your project Dashboard
2. Click **"Export"** button
3. Select **"XLSX (Excel)"**
4. Choose included data:
   - Topics
   - Content Briefs
   - EAVs
   - Audit Results
5. Click **"Generate Export"**

#### XLSX Tabs Included

| Tab | Contents |
|-----|----------|
| Summary | Project overview and key metrics |
| Topics | All topics with metadata |
| Briefs | Content briefs with outlines |
| EAVs | Semantic triples with categories |
| Pillars | SEO pillar structure |
| **Audit Metrics** | Semantic compliance scores |
| **Category Distribution** | EAV category breakdown |
| **Classification Dist** | Predicate type analysis |
| **Recommendations** | Prioritized actions |
| **Audit Summary** | Unified audit overview |
| **Audit Categories** | Category-by-category breakdown |
| **Audit Issues** | All issues with remediation |

### HTML Report Export

#### How to Export

1. From the Enhanced Metrics Dashboard
2. Click **"Export Report"** button
3. Select **"HTML Report"**
4. File downloads automatically

#### HTML Report Contents

- Project header with timestamp
- Score gauges (visual)
- Distribution charts
- Authority indicators
- Full recommendations list
- Action roadmap

### PDF Export

#### How to Export

1. Generate HTML report first
2. Open in browser
3. Use browser's Print → Save as PDF
4. Or use the **"Export PDF"** button if available

---

## 6. Interpreting Results

### E-A-T Scanner Results

#### Wikipedia Status

| Status | Meaning | Action |
|--------|---------|--------|
| **Found** | Article exists | Maintain and improve |
| **Stub** | Short article exists | Expand content |
| **Not Found** | No article | Consider creating (if notable) |

#### Knowledge Graph Status

| Status | Meaning | Action |
|--------|---------|--------|
| **Registered** | Google knows your entity | Maintain Schema markup |
| **Not Found** | Not in Knowledge Graph | Implement comprehensive Schema.org |

### Corpus Audit Results

#### Content Overlap Severity

| Overlap % | Severity | Recommended Action |
|-----------|----------|-------------------|
| 80%+ | Critical | Consolidate or redirect one page |
| 60-79% | High | Differentiate content significantly |
| 40-59% | Medium | Review for intentional overlap |
| Below 40% | Low | No action needed |

#### Anchor Text Health

| Issue | Impact | Fix |
|-------|--------|-----|
| Generic anchors | Misses ranking opportunity | Use descriptive, keyword-rich text |
| Over-optimized | Potential penalty risk | Vary anchor text naturally |
| Missing internal links | Orphaned pages | Add contextual links |

### Query Network Results

#### Intent Distribution Analysis

| Distribution | Interpretation |
|--------------|----------------|
| Mostly Informational | Topic is in awareness stage |
| Mixed Informational/Commercial | Topic has conversion potential |
| Mostly Commercial | High buyer intent topic |

### Dashboard Metrics

#### Red Flags to Watch

| Metric | Red Flag | Action |
|--------|----------|--------|
| Semantic Compliance < 50% | Critical gap | Prioritize EAV creation |
| Authority Score < 40% | Weak differentiation | Add UNIQUE/ROOT EAVs |
| 0 UNIQUE EAVs | No differentiation | Research proprietary insights |
| Single predicate type | Shallow coverage | Diversify content angles |

---

## 7. Troubleshooting

### Common Issues

#### E-A-T Scanner Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| "Entity not found" | Name spelling or entity not notable | Try variations, check notability |
| Slow scan | API rate limits | Wait and retry |
| Missing data sources | API keys not configured | Configure in Settings |

#### Corpus Audit Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| "Sitemap not found" | Invalid URL or blocked | Check robots.txt, verify URL |
| Timeout errors | Too many pages | Reduce page limit |
| Missing pages | Sitemap incomplete | Update sitemap or manually add URLs |

#### Export Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Empty export | No data to export | Ensure data exists first |
| Truncated data | Excel cell limits | Use JSON for full data |
| Formatting issues | Special characters | Export will sanitize automatically |

### Getting Help

1. Check the [Technical Documentation](./comprehensive-audit-system.md)
2. Review error messages in browser console
3. Ensure all required API keys are configured
4. Verify data exists before exporting

---

## Quick Reference Card

### E-A-T Scanner Workflow
```
Dashboard → Advanced Analysis → E-A-T Scanner
↓
Enter entity name + domain
↓
Select data sources (reviews, social, news)
↓
Run Scan → Review E-A-T Breakdown
↓
Export recommendations
```

### Corpus Audit Workflow
```
Dashboard → Advanced Analysis → Corpus Audit
↓
Enter domain + sitemap URL
↓
Set page limit (start with 50)
↓
Enable overlap + anchor checks
↓
Run Audit → Review issues
↓
Export findings
```

### Enhanced Metrics Workflow
```
Create EAVs via EAV Discovery Wizard
↓
View Enhanced Metrics Dashboard
↓
Check Semantic Compliance (target: 85%)
↓
Check Authority Score (target: 75%)
↓
Review Category/Classification distribution
↓
Follow Action Roadmap priorities
↓
Export report for stakeholders
```

### Target Metrics Summary

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Semantic Compliance | 85% | Below 50% |
| Authority Score | 75% | Below 40% |
| UNIQUE EAVs | 15-25% | 0% |
| ROOT EAVs | 25-35% | Below 10% |
| Predicate Types | 3+ | Single type |
| Facts per Topic | 5+ | Below 2 |

---

*Last Updated: December 2024*
*Version: 2.0.0*
