# Future Research: Competitive Intelligence Enhancements

> **Document Created:** December 25, 2024
> **Status:** Research & Discussion Required
> **Purpose:** Capture potential improvements that need further investigation before implementation
> **Review Cadence:** Revisit after Phase 3 completion

---

## Overview

This document captures **8 potential improvements** to the Topic-Level Competitive Intelligence system that require additional research, validation, or discussion before implementation.

Unlike the definitive improvements (see `definitive-improvements-plan.md`), these items have one or more of:
- Unclear implementation approach
- Uncertain ROI
- High complexity vs unclear benefit
- Dependency on external research
- Need for user validation

---

## Research Items

### 1. Semantic Distance Calculation

**Status:** Concept Sound, Implementation Complex

**The Opportunity:**
Semantic Distance is foundational to the Koray framework. Calculating the distance between a competitor's content and the optimal semantic position could reveal exploitable weaknesses.

**Research Quote:**
> "Semantic Distance is calculated based on Cosine Similarity, Context Weight, and Co-occurrence metrics. The formula is: 1 - (Cosine Similarity × Context Weight × Co-occurrence)"

**Open Questions:**

| Question | Why It Matters | Possible Approaches |
|----------|----------------|---------------------|
| How do we vectorize content for cosine similarity? | Core to the calculation | OpenAI embeddings, Gemini embeddings, custom Word2Vec |
| What defines "optimal" semantic position? | Need a target to measure against | Aggregate of top 3 competitors? Wikidata entity definition? |
| What distance threshold = "too far"? | Need actionable cutoffs | Research suggests >5 nodes, but need validation |
| Is per-topic distance worth the compute cost? | API costs add up | ~$0.01 per embedding, could be $1+ per full analysis |

**Proposed Research Approach:**

1. **Experiment 1: Embedding Comparison**
   - Take 10 topics with known good/bad competitor content
   - Generate embeddings using OpenAI text-embedding-3-small
   - Calculate cosine similarity between competitors
   - Correlate with actual ranking positions
   - **Question to answer:** Does embedding similarity correlate with ranking?

2. **Experiment 2: Threshold Discovery**
   - For topics where user content ranks well, measure distance to competitors
   - For topics where user content ranks poorly, measure distance to competitors
   - **Question to answer:** What distance threshold separates success from failure?

3. **Experiment 3: Cost/Benefit Analysis**
   - Calculate actual API costs for 100-topic analysis
   - Estimate value of insights gained
   - **Question to answer:** Is this worth building?

**Decision Criteria:**
- [ ] Embedding similarity correlates with ranking (r > 0.5)
- [ ] Clear threshold can be defined (not just continuous spectrum)
- [ ] Cost per analysis < $0.50

**Estimated Research Effort:** 2-3 days

---

### 2. Contextual Vector "Straight Line" Measurement

**Status:** Concept Clear, Measurement Method Unclear

**The Opportunity:**
The research emphasizes that content should maintain a "straight line" from H1 to conclusion, where every sentence supports the next. Detecting "zigzag" content in competitors could identify quality gaps.

**Research Quote:**
> "A straight line from H1 to the last heading, where every sentence supports the next" vs. "a distracted/zigzag vector where paragraphs jump between unrelated entities."

**Open Questions:**

| Question | Why It Matters | Possible Approaches |
|----------|----------------|---------------------|
| How do we define "supports the next"? | Core to detection | Entity consistency? Topic modeling? Embedding similarity? |
| What constitutes a "jump"? | Need threshold | Embedding distance > X between paragraphs? |
| Is section-level or paragraph-level analysis needed? | Granularity affects cost | Start with sections (H2-H2), refine if needed |
| Can we visualize this usefully? | UX matters | Line graph of "topic drift" over content? |

**Proposed Research Approach:**

1. **Literature Review:**
   - Research academic papers on "topic coherence" metrics
   - Look at existing tools (Grammarly, Hemingway) for coherence measurement

2. **Prototype Test:**
   - Take 5 articles known to be "coherent" and 5 known to be "scattered"
   - Calculate embedding similarity between consecutive paragraphs
   - Plot as a line graph
   - **Question to answer:** Can we visually distinguish coherent from scattered?

3. **Threshold Discovery:**
   - If paragraph embeddings work, what similarity drop = "drift"?
   - **Question to answer:** Is 0.7 similarity between paragraphs normal? Is 0.3 a "jump"?

**Decision Criteria:**
- [ ] Can reliably distinguish coherent from scattered content
- [ ] Threshold is not arbitrary but based on data
- [ ] Visualization adds value beyond a score

**Estimated Research Effort:** 3-4 days

---

### 3. Knowledge-Based Trust (KBT) Verification

**Status:** Powerful Concept, High Implementation Cost

**The Opportunity:**
If a competitor makes factual claims that contradict Wikidata consensus, that's a trust failure we could exploit by being more accurate.

**Research Quote:**
> "The values assigned to entity attributes must align with the 'Ground Truth' or established web consensus to maintain Knowledge-Based Trust (KBT)."

**Open Questions:**

| Question | Why It Matters | Possible Approaches |
|----------|----------------|---------------------|
| How do we extract verifiable claims? | Not all text is claims | NLP claim extraction, regex patterns for numbers/dates |
| Which Wikidata properties to check? | Can't check everything | Focus on common: population, dates, prices, measurements |
| How to handle claims not in Wikidata? | Limited coverage | Flag as "unverifiable" vs "incorrect" |
| Is this actually actionable? | Effort vs reward | If 1% of content has KBT issues, is it worth detecting? |

**Proposed Research Approach:**

1. **Claim Frequency Analysis:**
   - Analyze 20 competitor pages across 5 topics
   - Manually count verifiable factual claims
   - **Question to answer:** How often do pages make checkable claims?

2. **Wikidata Coverage Test:**
   - For claims found, check what % can be verified via Wikidata
   - **Question to answer:** Is Wikidata coverage sufficient?

3. **Error Rate Estimation:**
   - For checkable claims, manually verify accuracy
   - **Question to answer:** Do competitors actually have KBT failures?

**Decision Criteria:**
- [ ] >20% of content contains verifiable claims
- [ ] >50% of claims can be checked against Wikidata
- [ ] >5% of competitor claims have KBT failures (otherwise not worth detecting)

**Estimated Research Effort:** 4-5 days

**Alternative Approach:**
Instead of automated verification, provide a "claims extraction" feature that lists all factual claims for manual review. Lower cost, still valuable.

---

### 4. AI Overview Citability Prediction

**Status:** Hypothesis, Not Research-Backed

**The Opportunity:**
Predicting which content is likely to be cited in AI Overviews could help prioritize optimization efforts for the AI-first search era.

**Current Hypothesis:**
Based on the Semantic SEO framework, content likely to be cited has:
- Clear EAV triples (explicit Subject-Predicate-Object statements)
- High KBT (factually accurate)
- Proper `about` schema with Wikidata reconciliation
- Definitional statements in introduction (X is Y)
- High authority signals (E-E-A-T)

**Open Questions:**

| Question | Why It Matters | Possible Approaches |
|----------|----------------|---------------------|
| What actually correlates with AI citations? | Hypothesis needs validation | Test queries, note cited sources, analyze |
| Does this differ by query type? | May not be universal | Segment by informational, commercial, etc. |
| How stable are AI Overview citations? | If volatile, prediction less useful | Test same query over time |
| Is Perplexity/Claude citation behavior similar to Google? | Could use as proxy | Compare citation patterns across AI systems |

**Proposed Research Approach:**

1. **Citation Pattern Analysis:**
   - Run 50 queries across 5 topic categories
   - Record which sources get cited in AI Overviews
   - Analyze those pages for common characteristics
   - **Question to answer:** What patterns emerge in cited content?

2. **Hypothesis Validation:**
   - For each hypothesized factor (EAV clarity, KBT, schema), score cited vs non-cited pages
   - **Question to answer:** Do our hypothesized factors actually correlate?

3. **Prediction Model Test:**
   - Build simple scoring model based on findings
   - Test on held-out queries
   - **Question to answer:** Can we predict citation with >70% accuracy?

**Decision Criteria:**
- [ ] Clear patterns emerge in cited content
- [ ] At least 3 of 5 hypothesized factors correlate
- [ ] Prediction accuracy exceeds 60%

**Estimated Research Effort:** 5-7 days

**Risk:**
This is new territory. Google's AI Overview algorithm is unknown. We may find no predictable patterns.

---

### 5. Attribute Prominence Calculation

**Status:** Mentioned in Research, Not Fully Defined

**The Opportunity:**
Understanding which attributes are "prominent" in a market helps prioritize which EAVs to cover. But prominence isn't clearly defined.

**Research Quote:**
> "Semantic Distance between attributes and the Entity defines the importance of the attribute. Closer distance implies higher relevance."

**Open Questions:**

| Question | Why It Matters | Possible Approaches |
|----------|----------------|---------------------|
| What data source defines prominence? | Need measurable input | Competitor frequency, search volume, Wikidata properties |
| Is prominence = frequency in competitors? | Simple but maybe incomplete | Count attribute mentions across top 10 |
| How does search volume factor in? | Demand signal | PAA questions often reveal attribute demand |
| Is prominence universal or context-specific? | May vary by Source Context | Same entity, different prominence for different sites |

**Proposed Research Approach:**

1. **Multi-Signal Comparison:**
   - For 5 entities, collect:
     - Wikidata properties
     - Attributes from top 10 competitor pages
     - PAA questions (attribute-revealing)
     - Search suggest completions
   - **Question to answer:** Do these sources agree on prominence?

2. **Correlation with Ranking:**
   - Pages covering "prominent" attributes vs those covering "obscure" attributes
   - Which rank better?
   - **Question to answer:** Does covering prominent attributes correlate with ranking?

3. **Formula Development:**
   - If signals agree, create weighted formula
   - If signals disagree, determine which to trust
   - **Question to answer:** Can we create a reliable Attribute Prominence Score?

**Decision Criteria:**
- [ ] Data sources show >60% agreement on top 5 prominent attributes
- [ ] Covering prominent attributes correlates with better rankings
- [ ] Formula produces stable, intuitive results

**Estimated Research Effort:** 3-4 days

---

### 6. Topical Map Distortion (TMD) Strategy

**Status:** Advanced Strategy, Requires Human Judgment

**The Opportunity:**
Strategically expanding the topical map to include concepts that force competitors to either follow (diluting their focus) or ignore (leaving gaps).

**Research Quote:**
> "Strategically expand the TM by adding entities/attributes to dilute a competitor's topical authority by forcing them to cover adjacent but distant concepts."

**Open Questions:**

| Question | Why It Matters | Possible Approaches |
|----------|----------------|---------------------|
| Can TMD be automated, or is it strategic? | Implementation approach | Likely needs human strategy + AI suggestions |
| What makes a good TMD target? | Actionability | Adjacent concepts competitor hasn't covered |
| When is TMD appropriate? | Could backfire | Only when competitor is highly focused |
| How do we measure TMD success? | Need feedback loop | Track competitor response over time |

**Proposed Research Approach:**

1. **Case Study Analysis:**
   - Find examples of successful TMD in the wild (sites that forced competitors to expand)
   - Analyze the pattern
   - **Question to answer:** What did successful TMD look like?

2. **User Interview:**
   - Discuss with experienced SEOs who've done competitive displacement
   - Gather strategies and heuristics
   - **Question to answer:** How do experts think about TMD?

3. **Tool Design:**
   - Based on findings, design a "TMD Opportunity Finder" UI
   - Show adjacent concepts competitor doesn't cover
   - **Question to answer:** Can we surface TMD opportunities without full automation?

**Decision Criteria:**
- [ ] Clear pattern of successful TMD emerges
- [ ] Can define rules for "good TMD target"
- [ ] UI can surface opportunities for human decision

**Estimated Research Effort:** 2-3 days (mostly interviews/case studies)

**Likely Outcome:**
This will probably become a feature that surfaces opportunities rather than automated execution. TMD requires strategic judgment.

---

### 7. "Weird Website" Connection Detection

**Status:** Interesting Concept, Subjective Measurement

**The Opportunity:**
Detecting when a competitor makes semantically nonsensical connections could reveal authority weaknesses.

**Research Quote:**
> "Links plaatsen tussen ongerelateerde onderwerpen (bv. e-sigaretten naar kinderspeelgoed) zonder contextuele rechtvaardiging signaleert een 'weird website'."

**Open Questions:**

| Question | Why It Matters | Possible Approaches |
|----------|----------------|---------------------|
| How do we objectively define "weird"? | Need consistent detection | Embedding distance? Topic model disagreement? |
| Is all cross-topic linking bad? | Many legitimate reasons | Only bad without contextual bridge |
| How does this differ from Bridge Justification? | May overlap | Weird = no bridge + high semantic distance |
| Is this actionable for users? | Value proposition | "Competitor has weird connections" - so what? |

**Proposed Research Approach:**

1. **Example Collection:**
   - Manually find 10 examples of "weird" connections
   - Manually find 10 examples of legitimate cross-topic links
   - **Question to answer:** What distinguishes them?

2. **Measurement Test:**
   - Calculate embedding distance for both groups
   - Check for contextual bridges in both
   - **Question to answer:** Can we reliably distinguish weird from legitimate?

3. **Value Validation:**
   - If we detect "weird" connections, what action should user take?
   - **Question to answer:** Is this information actionable?

**Decision Criteria:**
- [ ] Can distinguish weird from legitimate with >80% accuracy
- [ ] Clear action user can take when competitor is "weird"
- [ ] Adds value beyond existing Bridge Justification analysis

**Estimated Research Effort:** 2 days

**Likely Outcome:**
May be redundant with Bridge Justification + Semantic Distance. Consider dropping if those cover the same ground.

---

### 8. Alternative SERP Data Sources

**Status:** Dependency Research

**The Opportunity:**
The roadmap relies on SERP data for accurate competitive intelligence. If primary sources are too expensive or limited, alternatives are needed.

**Current Options:**

| Source | Cost | Data Quality | Limitations |
|--------|------|--------------|-------------|
| AI Inference (Perplexity/Gemini) | Low (~$0.01/query) | Inferred, not actual | Not real SERP data |
| SerpAPI | $50-250/mo | Actual SERP | Rate limited, cost per query |
| DataForSEO | $50+/mo | Actual SERP + Volume | API complexity |
| Bright Data SERP | Enterprise | Full data | Expensive |
| Manual scraping | Free | Actual SERP | Legal concerns, blocks |

**Open Questions:**

| Question | Why It Matters | Research Approach |
|----------|----------------|-------------------|
| How accurate is AI inference vs real SERP? | May be sufficient for MVP | Compare 50 queries: AI inference vs SerpAPI |
| What's the minimum viable SERP data? | Cost optimization | Do we need positions 1-100 or just top 10? |
| Can we cache aggressively? | Reduce costs | How often do SERPs change for stable queries? |
| Are there freemium options? | Budget constraints | Test free tiers of various services |

**Proposed Research Approach:**

1. **Accuracy Comparison:**
   - Run 50 queries through Perplexity/Gemini for SERP inference
   - Run same 50 through SerpAPI for actual data
   - Compare: top 3 accuracy, feature detection, ranking positions
   - **Question to answer:** Is AI inference "good enough"?

2. **Cost Modeling:**
   - Model actual usage: queries per user per month
   - Calculate costs across different providers
   - **Question to answer:** What's the true cost of "accurate" SERP data?

3. **Hybrid Strategy Design:**
   - AI inference for fast-track / exploration
   - Real SERP for deep analysis
   - **Question to answer:** Can we design a cost-effective hybrid?

**Decision Criteria:**
- [ ] AI inference is >80% accurate for top 3 positions
- [ ] Hybrid strategy keeps costs < $0.10 per topic analysis
- [ ] Data quality sufficient for actionable recommendations

**Estimated Research Effort:** 2-3 days

---

## Research Prioritization Matrix

| Item | Impact if Successful | Research Effort | Risk of Failure | Priority |
|------|---------------------|-----------------|-----------------|----------|
| Alternative SERP Sources | High (cost dependency) | Low (2-3 days) | Low | **1** |
| Attribute Prominence | High (core to gaps) | Medium (3-4 days) | Medium | **2** |
| AI Overview Citability | High (future-proofing) | High (5-7 days) | High | **3** |
| Contextual Vector | Medium (quality signal) | Medium (3-4 days) | Medium | **4** |
| Semantic Distance | High (core concept) | Medium (2-3 days) | Medium | **5** |
| KBT Verification | Medium (edge cases) | High (4-5 days) | High | **6** |
| TMD Strategy | Low (strategic) | Low (2-3 days) | Low | **7** |
| Weird Website Detection | Low (may be redundant) | Low (2 days) | Medium | **8** |

---

## Research Schedule Recommendation

**Before Phase 2:**
- Alternative SERP Sources (critical dependency)

**During Phase 3:**
- Attribute Prominence (informs gap analysis)

**After Phase 3 Complete:**
- AI Overview Citability (new capability)
- Contextual Vector (quality enhancement)
- Semantic Distance (advanced analysis)

**Backlog (if resources allow):**
- KBT Verification
- TMD Strategy
- Weird Website Detection

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2024-12-25 | Claude + User | Created from brainstorming session |

---

## How to Use This Document

1. **Pick a research item** from the prioritization matrix
2. **Follow the proposed research approach** step by step
3. **Evaluate against decision criteria** when complete
4. **If criteria met:** Create implementation plan and add to definitive improvements
5. **If criteria not met:** Document findings and move to "Rejected" or "Deferred" section
6. **Update this document** with research results

---

*This document should be reviewed after each major phase completion. Research findings should be added to the relevant section.*
