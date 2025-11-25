The following is a de-duplicated and exhaustive list of rules for content construction and validation, categorized to serve as a complete reference for algorithmic authorship, validation, and content brief generation. These rules are derived directly from the sources and the principles of semantic content network design, focusing on decreasing the **Cost of Retrieval** for search engines.

---

## **I. Foundational & Strategic Authorship Rules (Identity, E-A-T, and Context)**

These rules dictate how the author and the website establish trust and expertise within the Semantic Content Network.

| Categorie | Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Incorrect Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **A. Author Identity** | **Define Author as Entity** | The author must be defined as an **Entity** within the Knowledge Graph, using structured data (Schema) to support Entity Reconciliation. | Use **Article Structured Data** to state the author and organization/owner. | Using only a nickname or 'Admin' as the author identifier. |  |
| **B. Expertise (E-A-T)** | **Use Domain Experts** | Employ **domain experts** for authorship, particularly in YMYL (Your Money or Your Life) or B2B content. | A CEO (thought leader) or founder is registered as the author to boost authority. | Using low-level, generic writers for complex or sensitive topics. |  |
| **C. Trust & Corroboration** | **Gather External Citations** | The author's authority and prominence are confirmed by citations on external sources (Wikipedia, Google Scholar, Podcasts, etc.). | Publish research papers or original studies to increase citing opportunities. | Failing to provide real-world existence references or using fake profiles. |  |
| **D. Activity & Momentum** | **Maintain Publishing Frequency** | An author should maintain activity and a consistent publication frequency, as this signals continuous relevance. | An author updates core articles regularly, preventing the content from becoming stale. | Publishing content and leaving it untouched for six months or more, leading to decay. |  |
| **E. Expression Identity** | **Create Unique Stylometry** | The author's writing must adhere to a strict and unique **Expression Identity** (stylometry) based on phrase patterns and sentence structure, differentiating it from generic AI output. | Removing common large language model phrases (e.g., "I had the pleasure of visiting" or "Overall") from the text. | Using public AI tools without customization, resulting in similar word sequences and generic author vectors. |  |

---

## **II. Algorithmic Authorship Rules (Linguistic, EAV, and Density)**

These rules are for fine-tuning the text itself, focusing on **Information Density** and clear communication of **EAV triples** to the search engine.

| Categorie | Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Incorrect Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **A. Conciseness & Density** | **One Fact Per Sentence** | Write sentences as **short as possible, but as long as necessary**. Provide **one unique piece of information per sentence**. | Sentences keep the Dependency Tree short to maximize entity detection. | Using long, complex sentences with multiple clauses, which increases semantic complexity. |  |
| **B. EAV Consistency** | **Maintain Fact Consistency** | EAV values (facts, measurements, names, dates) must be **consistent and non-conflicting** across the entire Semantic Content Network. | If 'pH level' is stated as a specific range in one article, all related articles must align with that range or justify the deviation. | Stating contradictory numerical values or definitions for the same entity attribute across different pages. |  |
| **C. Ambiguity & Explicit Naming** | **Avoid Co-reference** | **Do not use co-reference resolution** (e.g., "he," "they") if it creates ambiguity. Explicitly state the named entity every time. | If mentioning two similar concepts, use full, explicit names to prevent confusion for Named Entity Recognition (NER). | Using an ambiguous pronoun like "he" when two male names were recently mentioned in the paragraph. |  |
| **D. Uniqueness & Originality** | **Create Unique Context** | **Originality is necessary**. Create new contexts, new suggestions, new definitions, or new EAV triples (Unique Attributes) not previously seen on competitor sites. | Introducing a unique expression or specific attribute not found elsewhere, making your topic scope "bigger". | Repeating common N-grams or using generic definitions found on all top-ranking sites. |  |
| **E. Fact-Checking & Modality** | **Give Safe Answers** | Provide definitive answers (present tense) but support them with **conditions, factors, and multiple perspectives** (e.g., user, manufacturer, scientist) for complex or sensitive topics. Avoid modality terms (*can, might*) in consensus facts. | For "Does X produce clean edges?" answer "Yes, but this depends on material type (manufacturer perspective) and speed settings (user perspective)". | Stating an uncertain fact without condition (e.g., "This might happen") or providing only a simple "Yes/No". |  |

---

## **III. Content Brief and Structure Rules (Layout and Content Flow)**

These rules guide the structural execution, ensuring the content is organized logically for the search engine's **Contextual Vector** and passage scoring.

| Categorie | Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Incorrect Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **A. Brief Completeness** | **Pre-define Everything** | The content brief must be highly detailed, pre-defining the **contextual vector (headings), article methodology/format, anchor text, image alt tags, and list item counts**. | Use code language or prompts (e.g., FS, PAA) to give strict instructions to the author. | Providing only H1 and H2s, forcing the author to decide the structural details. |  |
| **B. Contextual Vector** | **Follow Incremental Order** | The headings (H1, H2, H3) must be organized in an **incrementally ordered** list to ensure a logical flow of context. | Order sections from broad (Definition) to specific (Symptoms) to corrective action (Treatment). | Placing a detailed H3 before its parent H2 is introduced, breaking the flow. |  |
| **C. Subordinate Text** | **Optimize First Sentence** | The text immediately following a heading (Subordinate Text) must be highly responsive, definitive, and often serves as the **Candidate Answer Passage**. | Answer the question directly in the first sentence. For Featured Snippets (FS), keep the answer under **40 words** or **340 characters**. | Starting the paragraph with "As stated before..." or tangential introductory phrases. |  |
| **D. Question Protection** | **Protect Question Format** | The answer must directly follow and **protect the question format** used in the heading. | H2: "What are the benefits?" $\\rightarrow$ Answer starts with: "The benefits are...". | H2: "What is X?" $\\rightarrow$ Answer starts with "If you look at X...". |  |
| **E. List and Table Use** | **Use Optimal Format** | Use the correct content format (prose, table, list) for the given query type and context. Tables are best for complex data and comparisons. Lists must be preceded by a **definitive introductory sentence**. | For instructional lists ("How to..."), state the exact number of steps in the definition. | Using a long paragraph where a list or table is the clear optimal format for comprehension. |  |

---

## **IV. Visuals, Metadata, and Schema Rules**

These rules ensure non-text content contributes positively to the page's topical relevance and structural clarity.

| Categorie | Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Incorrect Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **A. Image Content** | **Use Unique/Informative Visuals** | Images must be **unique**. Use visuals that enhance the informational value, such as **infographics** containing data, definitions, or clear text. | Branded images or graphics that contain readable text and data points (Visual Semantics). | Using stock images that are not unique or are not visually tied to the specific content section. |  |
| **B. Image Attributes** | **Expand Topicality** | Image Alt tags and URLs should **expand and variate** the overall topicality vocabulary of the page (Title/URL/Description). | Alt text includes synonyms or relevant attributes that are not explicitly in the H1. | Alt tag repeats the H1 verbatim or is left blank. |  |
| **C. Structured Data (Schema)** | **Define Entity Identity** | Implement Structured Data (JSON-LD) to define the **Author Entity, Brand Entity, and Organization**. This supports **Entity Reconciliation** and E-A-T signals. | Using FAQ structured data to increase SERP real estate (pixels). | Using inconsistent schema markups across different language versions of the site. |  |
| **D. Layout (Visual Semantics)** | **Use Semantic Layouts** | Design the page layout using **visual segmentation** (tabs, tables, lists) that aligns with the user experience (UX) and the dominant search intent (LIFT Model). | Ordering components (e.g., product, price, review carousel) logically to reflect user intent. | Excessive use of boilerplate content that dilutes the prominence of the main content. |  |

---

## **V. Internal Linking and Network Rules (Contextual Connections)**

Linking signals the contextual relationships between nodes, governing the flow of relevance and authority.

| Categorie | Actie PUNT | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Incorrect Application) | Sources |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **A. Anchor Text Limit** | **Limit Repetition** | **Do not use the same exact anchor text more than three times** per page. | Use synonyms or change the word order for the fourth instance of a concept link. | Using the exact same phrase ten times, which signals templated content. |  |
| **B. Link Placement** | **Define Before Linking** | **Never link before the entity or concept has been clearly defined** in the content. | Place the internal link in the main content after the definition is given. | Linking a concept in the first sentence of the article before the reader/crawler knows what it means. |  |
| **C. Contextual Bridges** | **Link Strategically** | Internal links must be based on complementary attributes or contexts. The Author Section must primarily link back to the **Core Section** (monetization). | Using a link in the supplementary content (micro context) to transition back to the most relevant main page (macro context). | Linking randomly everywhere, diluting the importance (PageRank) per link. |  |
| **D. Link Density** | **Avoid Bloating** | Limit the total number of internal links per page (recommended fewer than 150\) to prevent **PageRank Dilution**. | Distribute PageRank using quality notes or carousels to the most important articles. | Linking hundreds of pages from headers and footers, diluting the weight of important links. |  |

---

## **VI. Essential Topical Map and Network Concepts (TM Configuration)**

These are crucial concepts that govern the construction and effectiveness of the Topical Map structure itself, forming the context for the authorship rules above.

| Concept | Explanation and Strategic Importance | Source(s) |
| ----- | ----- | ----- |
| **Source Context (SC)** | Defines the perspective and function of the website (who you are, how you monetize). The SC determines the entire TM configuration and which attributes are prioritized. |  |
| **Central Entity (CE)** | The single, primary subject of the entire website and the topical map. Every page must connect back to the CE to consolidate topicality. |  |
| **Core Section (CS) & Author Section (AS)** | **CS** (Central Entity \+ Source Context) is for monetization. **AS** (Central Entity \+ Predicate) is for generating **Historical Data** and relevance signals, which are transferred to the CS. |  |
| **Momentum** | The frequency and consistency of publishing high-quality content. It is crucial for gathering **Historical Data** and increasing the **Initial Ranking** (IR). |  |
| **Topical Borders** | The intentional boundaries of the content network, defining where one topic ends and another begins. Only nodes requiring a new index segment should get a new page. |  |
| **Semantic Distance** | The measurable relationship between entities or concepts. Semantic distance dictates which nodes should be connected and how contexts should flow. |  |
| **Ranking Signal Consolidation** | The practice of giving clear, non-conflicting signals to the search engine, ensuring they know exactly which page should rank for which query, minimizing **Ranking Signal Dilution**. |  |
| **Content Configuration and Iteration** | The continuous process of reviewing and updating content (changing internal links, EAV values, word order) based on search engine feedback (new/lost queries) to ensure "always-on" responsiveness. |  |
| **Unique Information Gain Score** | A metric that proves the content provides **new context, new attributes, or new facts** beyond what competitors offer, proving expertise and originality. |  |

