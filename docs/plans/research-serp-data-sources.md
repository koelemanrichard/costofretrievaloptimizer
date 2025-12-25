# Research Plan: SERP Data Sources

> **Document Created:** December 25, 2024
> **Status:** DECIDED - Ready for Implementation
> **Priority:** Critical - Must complete before Phase 2 implementation
> **Estimated Effort:** 2-3 days
> **Researcher:** [Your name]

---

## DECISIONS MADE (December 25, 2024)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Fast-Track Source** | AI Inference (Perplexity/Gemini) | Cost-effective for exploration |
| **Deep-Dive Source** | DataForSEO | Already available, reliable |
| **SERP Cache Duration** | 7 days | SERPs stable enough for this window |
| **Hybrid Approach** | Confirmed viable | AI for speed, DataForSEO for accuracy |

### Architecture Confirmed

```
┌─────────────────────────────────────────────────────────────┐
│                    SERP DATA STRATEGY                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ⚡ FAST TRACK                    🔬 DEEP DIVE              │
│   ─────────────                    ─────────────             │
│   Source: AI Inference             Source: DataForSEO        │
│   (Perplexity/Gemini)              (API)                     │
│   Cost: ~$0.01/topic               Cost: ~$0.05/topic        │
│   Speed: ~3 seconds                Speed: ~5 seconds         │
│   Use: Exploration, bulk           Use: Content creation,    │
│        prioritization                   gap analysis         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│   CACHING: 7 days for all SERP data                          │
│   Cache key: query + country + language + mode               │
└─────────────────────────────────────────────────────────────┘
```

### Next Steps
1. Verify DataForSEO integration exists in codebase
2. Create SERP service abstraction layer
3. Implement caching with 7-day TTL
4. Proceed with Phase 1 implementation

---

## Why This Research Matters

The Topic-Level Competitive Intelligence system needs SERP data for:

1. **Competitor Discovery** - Which URLs rank for a topic?
2. **SERP Feature Detection** - Featured snippets, PAA, image packs, etc.
3. **Position Tracking** - Where do competitors rank?
4. **Rich Result Analysis** - What schema triggers what displays?

Without reliable SERP data, the system is guessing. The roadmap proposes "AI inference" for fast-track and "real SERP" for deep analysis - but we need to validate this hybrid approach works.

---

## What We Need to Decide

| Decision | Options | Impact |
|----------|---------|--------|
| **Primary SERP source** | AI inference vs API | Cost, accuracy, speed |
| **Fallback source** | Different API vs none | Reliability |
| **Caching strategy** | How long is SERP data valid? | Cost optimization |
| **Feature scope** | All features vs subset? | Complexity |

---

## Research Experiments

### Experiment 1: AI Inference Accuracy Test

**Goal:** Determine if Perplexity/Gemini can accurately infer SERP data

**Method:**
1. Select 20 test queries across different intents:
   - 5 informational (e.g., "what is semantic seo")
   - 5 commercial (e.g., "best running shoes for flat feet")
   - 5 local (e.g., "dentist amsterdam")
   - 5 transactional (e.g., "buy nike air max")

2. For each query, get AI inference:
   ```
   Prompt for Perplexity/Gemini:
   "For the search query '[QUERY]', provide:
   1. The top 10 ranking URLs
   2. Which SERP features are present (Featured Snippet, People Also Ask, Image Pack, Video, Knowledge Panel, Local Pack)
   3. The dominant content type (listicle, guide, product page, etc.)
   4. Estimated search intent

   Base this on current Google SERP data."
   ```

3. For the same 20 queries, get actual SERP via SerpAPI free tier or manual Google search

4. Compare and score:

| Metric | How to Measure | Target |
|--------|----------------|--------|
| Top 3 URL accuracy | How many of top 3 URLs match? | >80% |
| Top 10 URL accuracy | How many of top 10 URLs match? | >60% |
| Feature detection | Which features correctly identified? | >70% |
| Intent classification | Does intent match actual SERP? | >80% |

**Record Results Here:**

| Query | AI Top 3 Match | AI Top 10 Match | Features Correct | Intent Correct |
|-------|----------------|-----------------|------------------|----------------|
| Query 1 | /3 | /10 | /X | Yes/No |
| Query 2 | /3 | /10 | /X | Yes/No |
| ... | | | | |
| **TOTAL** | **X%** | **X%** | **X%** | **X%** |

**Decision Point:**
- If Top 3 accuracy > 80%: AI inference is viable for fast-track
- If Top 3 accuracy < 60%: AI inference is not reliable, need real SERP API

---

### Experiment 2: SERP API Comparison

**Goal:** Compare cost, speed, and data quality of SERP API providers

**Providers to Test:**

| Provider | Free Tier | Paid Starting | Test URL |
|----------|-----------|---------------|----------|
| **SerpAPI** | 100 searches/mo | $50/mo (5000) | https://serpapi.com |
| **DataForSEO** | $1 credit | Pay-as-you-go | https://dataforseo.com |
| **ValueSERP** | 25 searches/mo | $50/mo (3000) | https://valueserp.com |
| **Serper.dev** | 2500 free | $50/mo (50k) | https://serper.dev |
| **ScrapingBee** | 1000 credits | $49/mo | https://scrapingbee.com |

**Test Each Provider:**

For 5 test queries, evaluate:

1. **Response Time**
   - How long from request to response?
   - Target: < 3 seconds

2. **Data Completeness**
   - Does it return all top 10 URLs?
   - Does it detect SERP features?
   - Does it include rich snippet data?

3. **Cost Calculation**
   ```
   Estimated usage per user:
   - Topics per map: ~50
   - Deep analysis per topic: 1 SERP query
   - Fast analysis per topic: 0 (AI inference)
   - Total per map: ~50 queries

   Monthly estimate per active user: ~100 queries
   ```

4. **API Ergonomics**
   - Is the API easy to integrate?
   - Good documentation?
   - Reliable uptime?

**Record Results Here:**

| Provider | Avg Response | Top 10 Complete | Features | Cost/100 queries | Notes |
|----------|--------------|-----------------|----------|------------------|-------|
| SerpAPI | Xs | Yes/No | X/Y | $X | |
| DataForSEO | Xs | Yes/No | X/Y | $X | |
| ValueSERP | Xs | Yes/No | X/Y | $X | |
| Serper.dev | Xs | Yes/No | X/Y | $X | |
| ScrapingBee | Xs | Yes/No | X/Y | $X | |

**Decision Point:**
- Best value = lowest cost with complete data
- Consider: Free tier for development, paid for production

---

### Experiment 3: SERP Freshness Test

**Goal:** Determine how long SERP data remains valid for caching

**Method:**
1. Pick 10 queries (mix of stable and trending topics)
2. Record SERP results on Day 1
3. Record SERP results on Day 3
4. Record SERP results on Day 7
5. Compare changes

**Measure:**
- How many positions changed by 1-2 spots?
- How many URLs dropped out of top 10?
- Did any SERP features change?

**Record Results Here:**

| Query Type | Day 1→3 Changes | Day 1→7 Changes | Recommendation |
|------------|-----------------|-----------------|----------------|
| Stable informational | X positions | X positions | Cache X days |
| Trending news | X positions | X positions | Cache X days |
| Commercial | X positions | X positions | Cache X days |
| Local | X positions | X positions | Cache X days |

**Decision Point:**
- If stable queries change <10% in 7 days: Cache for 7 days
- If queries change >20% in 3 days: Cache for 1-2 days max
- Consider query-type-specific caching

---

### Experiment 4: Feature Detection Requirements

**Goal:** Determine which SERP features we actually need to detect

**List all possible SERP features:**

| Feature | Relevant to Us? | Why/Why Not | Detection Difficulty |
|---------|-----------------|-------------|---------------------|
| Organic results (1-10) | Yes | Core data | Easy |
| Featured Snippet | Yes | Content optimization target | Medium |
| People Also Ask | Yes | Content gap indicator | Easy |
| Image Pack | Yes | Visual content signal | Easy |
| Video Carousel | Yes | Content type signal | Easy |
| Knowledge Panel | Maybe | Authority signal | Hard |
| Local Pack | Maybe | Only for local topics | Medium |
| Shopping Results | Maybe | Only for products | Medium |
| News Carousel | Maybe | Only for timely topics | Medium |
| Sitelinks | Yes | Authority indicator | Easy |
| Reviews/Ratings | Yes | Schema opportunity | Easy |
| FAQ Rich Result | Yes | Schema opportunity | Easy |
| How-To Rich Result | Yes | Schema opportunity | Medium |
| Breadcrumbs | Yes | Schema indicator | Easy |
| AI Overview | Yes | Future-proofing | Hard |

**Decision Point:**
- **Must Have:** Organic 1-10, Featured Snippet, PAA, Image Pack, Video, Sitelinks, Reviews, FAQ, Breadcrumbs
- **Nice to Have:** Knowledge Panel, Local Pack, Shopping, News
- **Future:** AI Overview (research separately)

---

## Existing Services in Codebase

Before adding new services, check what already exists:

| Service | Location | Current Use | Can Extend? |
|---------|----------|-------------|-------------|
| `jinaService.ts` | `services/jinaService.ts` | Page content extraction | No - content only |
| `perplexityService.ts` | `services/perplexityService.ts` | AI queries | Yes - for inference |
| `geminiService.ts` | `services/geminiService.ts` | AI queries | Yes - for inference |

**Action:** Review these services to understand current AI capabilities before testing.

---

## Proposed Architecture Decision

Based on experiments, decide on this architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    SERP DATA STRATEGY                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   USER SELECTS MODE:                                         │
│                                                              │
│   ⚡ FAST TRACK                    🔬 DEEP DIVE              │
│   ─────────────                    ─────────────             │
│   Source: [AI Inference]           Source: [SERP API]        │
│   Cost: ~$0.01/topic              Cost: ~$0.05/topic         │
│   Speed: ~3 seconds               Speed: ~5 seconds          │
│   Accuracy: [X]%                  Accuracy: 100%             │
│                                                              │
│   Use when:                       Use when:                  │
│   - Exploring many topics         - Creating content         │
│   - Initial prioritization        - Detailed gap analysis    │
│   - Budget constrained            - Accuracy critical        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│   CACHING LAYER:                                             │
│   - Fast track results: Cache [X] days                       │
│   - Deep dive results: Cache [X] days                        │
│   - Cache key: query + country + language                    │
└─────────────────────────────────────────────────────────────┘
```

Fill in the [X] values based on experiment results.

---

## Final Deliverables

After completing research, produce:

### 1. Decision Document
```markdown
## SERP Data Source Decision

**Date:** [Date]
**Researcher:** [Name]

### Decisions Made:

1. **Fast-Track Source:** [AI Inference / Specific API]
   - Accuracy: X%
   - Cost: $X per query
   - Rationale: [Why]

2. **Deep-Dive Source:** [Specific API]
   - Cost: $X per query
   - Free tier: X queries/month
   - Rationale: [Why]

3. **Caching Strategy:**
   - Stable queries: X days
   - Trending queries: X days

4. **Features to Detect:** [List]

### Rejected Options:
- [Option]: [Why rejected]

### Implementation Notes:
- [Any technical considerations]
```

### 2. Cost Projection
```markdown
## Monthly Cost Projection

| Scenario | Queries | Fast-Track Cost | Deep-Dive Cost | Total |
|----------|---------|-----------------|----------------|-------|
| Light user (1 map) | 50 | $X | $X | $X |
| Medium user (5 maps) | 250 | $X | $X | $X |
| Heavy user (20 maps) | 1000 | $X | $X | $X |
```

### 3. Service Implementation Spec
```markdown
## SERP Service Specification

### Interface:
- `getSerpData(query, options): Promise<SerpResult>`
- Options: { mode: 'fast' | 'deep', country, language }

### SerpResult Type:
[Based on what experiments show is available/needed]

### Error Handling:
- Rate limit exceeded: [Strategy]
- API unavailable: [Fallback]

### Caching:
- Storage: [Supabase table / Local cache]
- TTL: [Based on freshness experiment]
```

---

## Research Timeline

| Day | Tasks |
|-----|-------|
| **Day 1** | Experiment 1 (AI Inference) - 20 queries, compare to manual SERP |
| **Day 2** | Experiment 2 (API Comparison) - Sign up for free tiers, test 5 queries each |
| **Day 2** | Experiment 4 (Feature Requirements) - Finalize feature list |
| **Day 3** | Experiment 3 (Freshness) - Initial data collection (follow up on Day 6, 10) |
| **Day 3** | Write Decision Document and Implementation Spec |

---

## Quick Start Commands

**Test Perplexity API:**
```bash
# You already have perplexityService.ts - test with a SERP query
```

**Sign up for API free tiers:**
- SerpAPI: https://serpapi.com/users/sign_up
- Serper.dev: https://serper.dev (2500 free)
- DataForSEO: https://dataforseo.com/registration

**Test SerpAPI (if you sign up):**
```bash
curl "https://serpapi.com/search.json?q=semantic+seo&api_key=YOUR_KEY"
```

**Test Serper.dev:**
```bash
curl -X POST "https://google.serper.dev/search" \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"q": "semantic seo"}'
```

---

## Notes Space

Use this section to record observations during research:

### Experiment 1 Notes:
```
[Your notes here]
```

### Experiment 2 Notes:
```
[Your notes here]
```

### Experiment 3 Notes:
```
[Your notes here]
```

### Other Observations:
```
[Your notes here]
```

---

*Complete this research before starting Phase 2 implementation. The decisions made here will affect the entire competitive intelligence system.*
