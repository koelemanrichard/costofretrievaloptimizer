This audit plan provides a detailed, start-to-finish, action-oriented methodology for evaluating an existing website based on the Holistic SEO framework. The primary goal is to generate a report with actionable items designed to decrease the **Cost of Retrieval (CoR)** and consolidate **Ranking Signals**.  
For any of the items listed below provide me with possible options is external information or tooling is needed in order to decide what will be the best tool to use. For example for GSC data, this must be uploaded from a default eport from GSC and entered into the database per project for analysis so that would need an upload and processing function in order to be useful. For the webscraping we have apify that can extract the html and save to the database which can be analysed and processed, for contextual understanding [jina.ai](http://jina.ai) might be the better option, that should be used if possible since that is already available etc. etc. Important is to have a hash to decide if information has been changed and needs to be updated or not and if we need to add new information or if information is no longer relevant.

## **Site Audit Plan: Semantic Content Network & Contextual Flow**

### **PHASE 0: Initial Setup, Data Acquisition, & Cost of Retrieval (CoR) Check**

This phase establishes the technical baseline and identifies where the search engine is wasting time and budget on the site.

| Actie PUNT (Action Item) | Check / Validation Method | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Technical Data Acquisition** | Crawl the entire website using a data science crawler (e.g., OnCrawl, apify, [jina.ai](http://jina.ai), firecrawl pick what is available). Perform Log File Analysis (LFA) to understand crawler behavior and resource allocation. | All critical pages (CS) receive high crawl frequency. | The majority of crawl budget is spent on irrelevant, non-indexable URLs. |  |
| **B. Indexation Thresholds** | Audit the Google Search Console (GSC) Pages Report. The goal is to make the "Not Indexed" section zero. | All necessary pages are indexed, and the **URL count is minimized** to increase value per page. | Millions of unnecessary URLs (e.g., faceted navigation, old pages) exist, causing the search engine to stop crawling the entire domain. |  |
| **C. Performance & CoR Check** | Measure **Time to First Byte (TTFB)** (Target: \< 200ms, optimally \< 100ms) and calculate the CoR. Check HTML/DOM size. | Page speed metrics are high, and HTML is clean (low DOM size) to ensure quick rendering and low processing cost. | The web server responds slowly (e.g., \> 1 second), signaling high CoR to the search engine. |  |
| **D. Technical Errors** | Audit for technical issues: 404/410/301 errors, orphaned pages, and canonicalization problems. | Unnecessary links are removed or hidden (e.g., using JavaScript events) to prevent PageRank leakage. | Important pages are more than 3 clicks deep from the homepage, signaling low importance. |  |

---

### **PHASE 1: Foundational Semantic Extraction & Entity Definition**

This phase establishes the five core components that define the website's topical and commercial identity.

| Actie PUNT (Action Item) | REGEL (Rule Detail) | Check / Validation Method | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **A. Extract Central Entity (CE)** | Identify the **single primary subject/entity** that the entire website should revolve around. | CE is 'Mail Merge' for a SaaS tool. The word appears site-wide, especially in boilerplate N-grams. | The site focuses equally on 'Mail Merge' and 'Video Editing Software'. |  |  |
| **B. Extract Source Context (SC)** | Define **who you are** and **how you monetize**. This determines the correct angle and attribute prioritization. | SC is 'Bulk Mail Sending SaaS Company'. Content focuses on conversions, security, and comparison. | SC is undefined, leading to attributes being chosen only for traffic (e.g., chasing trending topics). |  |  |
| **C. Extract Central Search Intent (CSI)** | Define the **canonical verb/action** that links the CE to the SC. This must appear in all content briefs and main content areas. | CSI is 'Generate and Send' (bulk mail sending). Predicates align with this canonical action. | Using irrelevant or low-prominence verbs like 'Read' or 'View'. |  |  |
| **D. Section Classification** | Classify content pages into the **Core Section (CS)** (Monetization focus: CE \+ SC) and **Author Section (AS)** (Historical Data focus: CE \+ part of CSI). | CS is the 'Pricing/Tool' section. AS includes 'Historical Articles' or 'Cultural Guides' that boost relevance. | The majority of published articles are generic and do not clearly belong to either CS or AS. |  |  |

---

### **III. Network Structure Audit: Internal Linking & Contextual Flow**

This phase audits the flow of PageRank and relevance signals across the site, focusing on link placement and boundary definitions.

| Actie PUNT (Action Item) | REGEL (Rule Detail / Principle) | Check / Validation Method | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **A. Link Count Restriction** | Limit the total number of internal links per page (target: \< 150\) to increase the **PageRank weight** per link. | Use dynamic footers/headers to minimize links in the boilerplate content. | Pages contain over 450 links, or low-value pages are heavily linked, causing PageRank Dilution. |  |  |
| **B. Link Prominence & Flow** | Internal links must be prioritized in the **Main Content** and links must flow from the **Author Section back to the Core Section**. | The highest authority links flow to CS pages that have high conversion value. | Important links are buried deep in the site structure or hidden in sidebars. |  |  |
| **C. Contextual Bridge Analysis** | Identify and analyze links that serve as **Contextual Bridges**, justifying the connection between different topical sections (e.g., linking from a general topic to the monetization topic). | An article on 'German History' includes a transitional sentence and anchor link to the 'Germany Visa Requirements' page. | Linking two unrelated pages (e.g., 'Banana recipes' and 'Carving tools') without any mutual context or bridge. |  |  |
| **D. Anchor Text Management** | Audit Anchor Text repetition (Max 3 times exact match per page) and ensure descriptive, non-generic language. | Anchor texts use variations/synonyms (e.g., "high performance tool," then "best performing tool"). | Using repetitive, templated anchor text or vague phrases like "click here" or "read more". |  |  |
| **E. Annotation Text Audit** | The text immediately surrounding the anchor link (**Annotation Text**) must be audited to ensure it supports the relevance of the link. | The Annotation Text includes words from the title/H1 of the target page, strengthening the relevance signal. | The Annotation Text is irrelevant to the target page, weakening the link signal. |  |  |

---

### **IV. Content Quality & Microsemantics Audit (Intra-Page Flow)**

This phase ensures the content itself is structured logically and efficiently for **Information Extraction** and **Passage Indexing**.

| Actie PUNT | REGEL (Rule Detail / Principle) | Check / Validation Method | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **A. Contextual Vector Integrity** | Verify that the heading order (H1 to Hx) is a **straight, logical flow** and that the semantic distance between sequential sections is justified. | The flow follows the natural progression of the topic (e.g., Definition $\\rightarrow$ Benefits $\\rightarrow$ Risks $\\rightarrow$ Solutions). | Placing 'Solutions' before 'Risks,' breaking the contextual progression. |  |  |
| **B. Subordinate Text Responsiveness** | The first sentence after a heading must be a direct answer, highly responsive, and concise to optimize for **Featured Snippets**. | Sentences directly answer the question implied by the H2 and adhere to character/word limits. | Starting the paragraph with fluff or historical context before giving the answer. |  |  |
| **C. Discourse Integration** | Sentences and paragraphs must maintain **Discourse Integration** by linking concepts between adjacent text blocks. | The end of one paragraph uses a concept that is immediately continued or referenced at the start of the next paragraph. | Abrupt shifts in topic without using mutual phrases or transition markers. |  |  |
| **D. EAV Information Density** | Check that content is dense and concise. **One sentence should deliver one unique fact (EAV triple)**. | Long, complex sentences are broken down into short, factual declarations to reduce semantic ambiguity. | Using long, run-on sentences that combine multiple unrelated facts. |  |  |
| **E. Content Format Check** | Ensure the content format (e.g., lists, tables, prose) correctly matches the query type (e.g., instructional, comparative). | **Instructional lists** (How-To) are properly **ordered** (`<ol>`) and the introduction states the exact item count. | Instructional content is presented in a dense prose block or an unordered list (`<ul>`). |  |  |

---

### **V. Visuals, Schema, & Metadata Audit**

This section audits non-textual components which signal structural clarity, E-A-T, and contribute to **Ranking Signal Consolidation**.

| Actie PUNT | REGEL (Rule Detail / Principle) | Check / Validation Method | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Incorrect Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **A. Visual Hierarchy** | The visual presentation (font size/weight) of headings and components must accurately reflect the **structural hierarchy**. | H1 is the largest/boldest; H2 is visually subordinate; component size reflects importance (Visual Semantics). | H3 uses the same font size or weight as H2, confusing the structural flow. |  |  |
| **B. Image Quality & Metadata** | Images must be unique, high quality, and their Alt tags/URLs must expand the page’s overall topical vocabulary. | Images include EXIF data and unique composition. Alt text uses synonyms not present in the H1. | Using generic stock images or image Alt tags that repeat the H1 verbatim. |  |  |
| **C. Schema Markup Correctness** | Audit the JSON-LD Schema (Article, FAQ, Product, Organization) for **completeness, correctness, and consistency** site-wide. | Structured data accurately reflects the EAV facts, author entity, and organizational identity across the site. | Schema contains errors or omits critical EAV values (e.g., product price, author name). |  |  |
| **D. Multilingual Symmetry** | For sites using `hreflang`, check if content maintains **symmetry** (same facts, hierarchy, and attribute order) across language versions. | The sequence of H2s is identical across English, German, and French versions. | Translating content selectively or having different heading sequences across languages, leading to content conflict. |  |  |

---

## **VI. Actionable Report Generation (Prioritization)**

The final audit report should prioritize fixes based on their impact on the **Cost of Retrieval** and the semantic network's stability.

1. **Technical Debt (CoR Fixes):** Address all Phase 0 items immediately: high TTFB, large DOM size, and indexation errors (noindex/404s/301s).  
2. **Foundational Alignment (Phase 1):** Confirm the CE, SC, and CSI are correctly defined and reflected in site-wide N-grams, especially in headers and footers.  
3. **Link Flow & Dilution Fixes (Phase 2):** Fix **Contextual Bridges** where they are weak or missing. Implement link limitations and ensure the AS $\\rightarrow$ CS flow is dominant to consolidate authority.  
4. **Microsemantic Compliance (Phase 3):** Focus on correcting broken Contextual Vectors and improving Subordinate Text responsiveness to exceed the semantic **Compliance Score of \>85%**.  
5. **Expansion Strategy:** Use the extracted entities and attributes to identify **Topical Gaps** (Similar, Alternative, Origin concepts) that need to be filled with new content briefs to increase **Topical Authority**.

---

## **VII. Essential Concepts Not Included as Specific Audit Steps**

These strategic concepts are vital for implementing the audit findings but do not fit into single audit columns.

* **Initial Ranking (IR):** The quality signals identified during the audit (EAV consistency, unique images) directly influence the IR score the search engine assigns upon indexing. A higher IR leads to better Predictive Ranking (PR).  
* **Ranking Signal Consolidation:** The entire audit serves to ensure that non-conflicting signals are sent, preventing the dilution of ranking authority across the content network.  
* **Semantic Distance:** The calculated proximity between topics. Links should connect entities with manageable semantic distance.  
* **Momentum:** The consistent publishing speed of high-quality content is necessary to activate the network and gather sufficient **Historical Data**.  
* **Algorithmic Authorship:** The Content Brief (Content Engineering Guide) must be the primary tool used to implement the findings, controlling sentence structure, content format, and EAV delivery.

