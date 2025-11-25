Your request details the exact workflow necessary to transition an existing, chaotic website into a disciplined **Semantic Content Network**. This plan is structured into four distinct phases, starting with data ingestion and culminating in an actionable optimization roadmap, ensuring every element is checked against the principles of the Koray Framework.

---

## **Phase 1: Technical Foundation & Data Ingestion (Loading Site)**

This initial phase focuses on acquiring and structuring the necessary raw data efficiently, aiming to establish the baseline for **Cost of Retrieval (CoR)** and indexing status.

| Action Point | Description and Required Tools / Data Models | Output / Database Storage | Sources |
| ----- | ----- | ----- | ----- |
| **A. Infrastructure Setup** | Establish the required technology stack: **Backend** (Python/FastAPI), **Databases** (PostgreSQL for standard data/time series; **Neo4j/Graph Database** for storing entity relationships, Topical Maps, and link structures), and **Queue** (Celery/RabbitMQ). | System Architecture Pattern, Initialized Databases. |  |
| **B. Sitemap & URL Ingestion** | Upload the current sitemap(s) and allow manual URL input. All URLs must be saved to the database for tracking. URLs should be checked for consistent structure, URL parameters, and trailing slash/case-sensitivity issues. | Table of all URLs (Domain Model), URL Consolidation Report. |  |
| **C. Comprehensive Crawling (Raw Data)** | Perform a full technical crawl using a dedicated crawler (e.g., OnCrawl, JetOctopus). Extract raw data, including Page Speed metrics (CWV), status codes (200, 301, 404), link counts, and HTML size. | Raw HTML, HTTP Status Codes, Link Count per Page, Technical Metrics (DOM Size, Response Size). |  |
| **D. Semantic Contextual Data Extraction** | Scrape pages to retrieve structured semantic data. Use specialized scraping (e.g., Jina.AI or custom NLP) to extract key on-page elements: Title, H-tags, canonicals, Schema Markup, and Anchor Text/Annotation Text. | Extracted Meta Tags, Canonical Status, Heading Hierarchy. |  |
| **E. Log File Analysis (LFA)** | Integrate a Log Analyzer (e.g., ElasticSearch/Kibana, OnCrawl LFA, custom Python script). Analyze bot activity (Googlebot/Bingbot) to determine crawl frequency, crawl rate, and **Cost of Retrieval (CoR)**. | CoR Score, Crawl Budget Distribution Report, TTFB/Response Time per URL. |  |

---

## **Phase 2: Foundational Semantic Definition & Knowledge Graph Alignment**

This phase focuses on identifying the website's core identity, which is essential for determining the correctness of the existing Topical Map structure and linking flow.

| Actie PUNT (Action Item) | REGEL (Rule Detail / Principle) | Check / Validation Method | Actionable Output (Database/Report) | Sources |
| ----- | ----- | ----- | ----- | ----- |
| **A. Central Entity (CE) Extraction** | Determine the **single main entity** the site focuses on. Extract the CE by analyzing **site-wide N-grams** (phrases appearing across all boilerplate/menus). | Compare the most frequent entities extracted via NLP (Spacy/Google NLP) across the entire site. | Defined Central Entity, Site-wide N-gram Report, Entity Profile (Entity Model). |  |
| **B. Source Context (SC) Classification** | Define **who the business is** and **how it monetizes** (e.g., SaaS, E-commerce, Consultancy). This guides attribute prioritization. | Analyze `About Us` pages, corporate documents, and primary commercial intent pages (CS). | Defined Source Context (SC), SC Alignment Score. |  |
| **C. Central Search Intent (CSI) Determination** | Define the **canonical action/verb** that links the CE and SC. The CSI must be reflected everywhere, especially in the Core Section (CS). | Analyze predicates (verbs) used in high-prominence areas (H1s, titles) across monetization pages. | Defined Central Search Intent (CSI). |  |
| **D. Initial Topical Map Construction** | Create an initial Topical Map (TM) based on existing indexed content. Cluster pages based on entity/attribute similarity. Use similarity matrix calculation (Semantic Distance). | Initial TM visualization (e.g., using D3.js/Cytoscape.js) and Semantic Distance scores between all pages. |  |  |
| **E. Knowledge Graph (KG) Alignment** | Use the Google Knowledge Graph API to check if the brand and CE are recognized as entities. Corroborate external mentions and trust elements (reviews, social media presence). | KG Status Report (Entity recognition score), Corroboration Check for E-A-T signals. |  |  |

---

### **Phase 3: Comprehensive Site Audit & Gap Analysis**

This phase performs the detailed comparison of existing content against framework standards and identifies specific gaps relative to competitors.

| Actie PUNT (Action Item) | REGEL (Rule Detail / Principle) | Check / Validation Method | Actionable Output (Audit Report Segment) | Sources |
| ----- | ----- | ----- | ----- | ----- |
| **A. Audit Page Segmentation & Flow** | Verify the integrity of the **Contextual Vector** (H1 to Hx). Check for logical flow (straight line) and proper segmentation (Macro Context vs. Micro Context). | Analyze the sequence and hierarchy of H-tags. Check if H3 defines an attribute of the parent H2. | Report on **Broken Contextual Vectors**, Segmentation Compliance Score. |  |
| **B. EAV Consistency Audit** | Check all pages for conflicting factual information (Values) and attribute definitions. Consistency is key for **KBT (Knowledge-based Trust)**. | Run consistency checks on structured EAV data extracted from the content (e.g., dates, measurements, definitions). | EAV Conflict Report, KBT Score. |  |
| **C. Ranking Signal Dilution Check** | Identify pages with highly similar content that target the same query network (duplication). Also, check if low-value pages cannibalize ranking signals from high-value pages. | Check the similarity hash of document content and the GSC report for **"crawled currently not indexed"** URLs. | Report on **Cannibalization Clusters**, Duplicate Content Report. |  |
| **D. Internal Link Flow Audit** | Analyze link placement and distribution. Ensure links are concentrated in the **Main Content** and flow efficiently. Check the **Hub-Spoke Ratio** (Optimal 1:7). | Verify that irrelevant pages do not have more internal links than the homepage or core money pages. | **Link Prominence Report**, Hub-Spoke Compliance Score. |  |
| **E. Competitor Gap Analysis** | Identify **Information Gaps** (missing entities/attributes) rather than just keyword gaps. | Use **Information Gap Analyzer** agents to compare own content against top-ranking competitors (Healthline, WebMD models). Check for **similar, alternative, and origin** entities. | List of **Missing Entities/Attributes**, Expansion Candidates (similar, alternative, origin). |  |
| **F. Content Format Audit** | Check if the document uses the optimal combination of content formats (prose, list, table) and if the content quality is supported by both structured and unstructured content. | Verify usage of lists (`ol`, `ul`) and tables for comparative data. Check the variety of content formats used per page. | Content Format Usage Report, Recommendation for conversion to tables/lists. |  |
| **G. Visual Semantics Audit** | Analyze the page layout (LIFT Model) and **Visual Hierarchy**. Check component prominence (size/order) and image relevance/metadata. | Check if important elements (e.g., CTA, price) are visually prominent and logically ordered based on intent. Audit image Alt Tags for semantic expansion. | Visual Semantics Score, Image Optimization Report. |  |

---

### **IV. Improvement Plan & Actionable Transformation Roadmap**

This final phase translates the audit findings into a sequenced, prioritized, and actionable set of instructions to align the site with the ideal Semantic Content Network structure.

| Actie PUNT (Action Item) | REGEL (Rule Detail / Principle) | Audit Phase Source | Actionable Outcome for Report | Sources |
| ----- | ----- | ----- | ----- | ----- |
| **A. Technical Remediation (CoR)** | Decrease **CoR** by fixing high-priority technical errors (high TTFB, HTML bloat, 404/301 loops). | Phase 1 (B, C, E) | **Action:** Execute HTML/JS Minification; Fix all internal 404/301 links; Optimize server response time. |  |
| **B. Index Clean-up & Consolidation** | Remove or consolidate low-quality/thin/duplicate URLs to prevent **Ranking Signal Dilution**. | Phase 3 (C) | **Action:** Set 301 Redirects for pages with weak authority into a relevant **Quality Node**; **Noindex** URLs that are necessary but not index-worthy; Consolidate thin content pages. |  |
| **C. Content Clustering & Canonicalization** | Use the TM analysis to identify cannibalization issues and ensure **Canonical Queries** map to the correct URL. | Phase 3 (C) | **Action:** Cluster semantically similar pages and use **canonical tags** to point low-value pages to the high-value CE page; Merge pages that require the same **Index Construction**. |  |
| **D. Core Section Authority Flow** | Reroute internal link juice to maximize the prominence of monetization pages (CS) and **Quality Nodes**. | Phase 3 (D) | **Action:** Update boilerplate (headers/footers) to reduce link count; Introduce **Contextual Bridges** (internal links) from AS content back to the CS. |  |
| **E. Semantic Content Brief Creation** | Generate new content briefs for the **Information Gaps** identified in Phase 3\. Use the existing SC, CE, and CSI to formulate the **Contextual Vector** and structure. | Phase 3 (E) | **Action:** Create new content briefs focusing on **Missing Entities/Attributes**; Define exact heading hierarchy, content formats (tables/lists), and specific EAV constraints. |  |
| **F. Layout and Visual Compliance** | Implement changes based on the Visual Semantics audit to improve responsiveness and signal prominence correctly. | Phase 3 (G) | **Action:** Restructure above-the-fold area to place Centerpiece Text/CTA prominently; Ensure heading typography follows **Visual Hierarchy**; Optimize images and provide dimension attributes to eliminate CLS issues. |  |
| **G. Content Configuration** | Initiate the process of **Microsemantics**—small, disciplined, site-wide changes to sentences, flow, and EAV delivery. | Phase 3 (A, B) | **Action:** Define an **Algorithmic Authorship Template** to be applied to existing articles, focusing on EAV density, sentence conciseness, and eliminating ambiguous pronouns. |  |
| **H. Momentum Generation** | Establish a high-quality publishing schedule. | Phase 1 (E), Phase 4 (E) | **Action:** Publish new **Quality Nodes** quickly (Momentum) to gather **Historical Data** and overcome the competitor's authority threshold. |  |

---

## **Architectural Guidelines Summary**

The success of this audit and transformation relies on adhering to specific architectural guidelines derived from the framework documentation.

| Component | Architectural Guideline | Source(s) |
| ----- | ----- | ----- |
| **Database Structure** | Utilize a combination of **PostgreSQL** (for time-series data and general storage) and a **Graph Database (Neo4j)** for modeling the semantic network, entity relationships, and link flow. The graph database is essential for calculating **Semantic Distance**. |  |
| **Data Extraction** | Implement specialized scraping tools (Apify/Jina) alongside Google NLP or Spacy to extract **Named Entities, Entity Types, and Attribute counts**. This provides structured EAV data from unstructured content. |  |
| **Analysis Algorithms** | The system must calculate the **Semantic Distance** between documents and queries using the formula: $1 \- (\\text{Cosine Similarity} \\times \\text{Context Weight} \\times \\text{Co-occurrence})$. It should also calculate the **Topical Authority** score, integrating Coverage, Depth, Consistency, and Historical Data. |  |
| **Compliance Scoring** | Implement a **Compliance Scoring** module (target: \>85%) that validates content structure, EAV inclusion, and adherence to the content brief before and after optimization. |  |
| **AI Integration** | Use LLMs (OpenAI/Anthropic) for **Natural Language Generation (NLG)** during content creation, but only after **task-specific fine-tuning** for classification and recognition. Crucially, use **Information Gap Analyzer** agents to find missing concepts. |  |
| **Prioritization** | Prioritize fixes based on the largest potential reduction in **Cost of Retrieval (CoR)** and the highest increase in **Ranking Signal Consolidation**. |  |

