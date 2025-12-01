This response provides a comprehensive, action-oriented plan detailing the specialized rules for configuring a **Topical Map (TM)** and **Semantic Content Network** across four distinct types of websites, complete with architecture, design, and flow recommendations. The core goal is to generate high-compliance content and decrease the **Cost of Retrieval (CoR)**.

---

## **I. Foundational Rules for All Websites (Core Framework)**

Regardless of the website type, the following structural components must be defined and consistently applied across the entire Semantic Content Network (SCN).

| Component | Actie PUNT (Action Item) | REGEL (Rule Detail) | Bronnen |
| ----- | ----- | ----- | ----- |
| **Central Entity (CE)** | Identify the single, primary subject/entity of the entire website and site-wide N-grams. | Must appear in boilerplate content, menu links, and all documents to reflect the primary focus. |  |
| **Source Context (SC)** | Define **who you are** and **how you monetize**; this dictates the processing of the topic and attribute prioritization. | The topic might be the same, but the context and its flow must change according to the SC (e.g., Affiliate vs. E-commerce vs. SAS business). |  |
| **Central Search Intent (CSI)** | Unify the SC and CE into the **canonical verb/action** that links them. | The CSI must appear in all content briefs, especially in the top part of the Main Content, often linked to an internal link. |  |
| **Architecture** | Implement the **Hub-Spoke** structure with an optimal **1:7 ratio** (Hub to Spoke). | Use a **Graph Database (Neo4j)** to store entity relationships and Topical Map structure. |  |
| **Quality & Compliance** | Target a **Semantic Compliance Score of \>85%** and a **Context Coherence Score of \>0.8**. | The brief must define every heading, paragraph format, link distance, and sentence structure. |  |
| **Page Rank Flow** | Decrease the total number of links per page to increase **value per web page** and ensure links are in the **Main Content** area. | Links in the boilerplate (header/footer) should be minimized or dynamic to avoid diluting the prominence of main content links. |  |

---

## **II. Specialized Rules by Website Type**

### **A. E-commerce Website (Selling Products)**

E-commerce sites must structure content to handle complex entity attributes (size, color, material) and balance commercial intent with informational depth.

| Focus Area | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **TM Setup / Coverage** | Cover products, brands, services, and dimensions/attributes (price, size, material, warranty). Use **Ontology and Taxonomy** to connect commercial and literature/informational value (e.g., books as a product vs. literature). | TM includes categories for product size, material, usage guidelines, and refund policy. | Only focusing on price and availability, neglecting usage, maintenance, or author information. |  |
| **Structure / Template** | Use both **structured and unstructured content** (prose, tables, lists) to increase the overall quality score. Use the **LIFT Model** for component order. | Product pages use definitive paragraphs and lists/tables for pros/cons or specifications. | Using only prose (unstructured) content for product definitions and comparisons. |  |
| **CTAs / Responsiveness** | Ranking depends heavily on **Responsiveness** and predicted **Click Satisfaction**. Include multiple forms of social proof: brand review, expert review, and customer review. | Order components as: Buy $\\rightarrow$ Compare $\\rightarrow$ Multiple Reviews $\\rightarrow$ Statistics (Macro Context first). | Putting informational content (Statistics, History) above transactional components (Price, Buy button). |  |
| **Link Structure** | Implement internal linking based on the product’s **ontology/taxonomy** (material, type, brand) rather than random connections. Decrease internal link count to reduce PageRank dilution. | Linking a product to pages defining its material (e.g., linking "holster" to "nylon material"). | Opening millions of URLs for every filter/combination without contextual justification. |  |

### **B. SaaS Business Website (Selling Software/Services)**

SaaS websites must generate traffic by linking their technical service (CE) to the relevant real-world user needs and search behaviors.

| Focus Area | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **TM Setup / Identity** | The TM must connect the product to external search activities and user intent (e.g., linking a gym management SaaS to martial arts or personal trainers). | Linking a student management system (SaaS CE) to 'Gym Teachers' or 'Martial Arts' (related queries/users). | Focusing only on 'Student Management System' without linking to the user's operational needs (e.g., 'Membership Fee Collection'). |  |
| **Structure / Template** | Template design must be flexible enough to handle different attribute priorities across similar entities (e.g., different features for different mail merge types). | Creating a standard brief template for 'Mail Merge' but configuring it differently for 'Birthday Mail' vs. 'Survey Mail'. | Using one fixed template for all mail types, neglecting unique attributes required by the context. |  |
| **CTAs / Link Flow** | Use specific predicates (verbs) that define the service (e.g., generate, compare, learn, prevent) in titles and anchor texts. Links must follow popularity: **Homepage is the most linked page**. | Anchor texts use "compare network security technologies" or "learn network security". | The service page (monetization) is less linked than an old blog post. |  |
| **Actionable Outcome** | Use competitor forums and review platforms as a **Source of Attributes** and create dedicated content to draw attention away from competitors (Open Sense section). | Use agents to pull attributes from competitor reviews (pros/cons) and integrate them into own content. | Only analyzing owned content without referencing or utilizing competitor platforms for semantic data. |  |

### **C. Service Business (General or B2B)**

B2B and high-stakes service industries (like finance or legal) require extremely high E-A-T and must structure content around unique expertise and corroborated facts.

| Focus Area | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **TM Setup / Identity** | The TM must prove **Expertise and Credibility**. Use statistics, research papers, and unique definitions with examples. | A 3D printing B2B site covers material science, machining, and metallurgy (deep expertise). | Writing generic definitions of 3D printing without diving into materials, chemical processes, or configurations. |  |
| **Structure / Template** | Requires a detailed **Content Engineering Guide** that defines sentence structures, answer formats, and the style/tonality for Expert Authors. Must use conditional language and multiple perspectives. | A brief specifies a **scientific style** for a Pharmacy service, ensuring the author uses objective language and citations. | Using non-expert authors or a casual, subjective tone for sensitive industry topics. |  |
| **Hub-Spoke / Link Flow** | Focus on creating contextual segmentation for different service aspects (e.g., 'Universities and Occupations' $\\rightarrow$ 'Occupations and Salaries'). Anchor texts must align with service predicates. | Linking 'Divorce Process' to content covering 'Psychology' and 'Kid-related issues' within the same sentence (Annotation Text). | Linking randomly to core services without a thematic connection (e.g., linking 'Transfer' to 'Fans' content without context). |  |
| **CTAs / Site Design** | Prioritize **real-world expertise signals** by digitalizing all licenses, awards, and reviews. Use Semantic HTML to highlight critical information. | Using `<figure>` or `<aside>` tags for testimonials and awards; defining brand identity via structured data. | Failing to display real-world credentials digitally or using non-semantic HTML for key trust elements. |  |

### **D. Blog / Informational Website**

Informational sites (or the **Author Section** of any site) must focus on covering entire query networks and proving unique insight, not just summarizing common knowledge.

| Focus Area | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **TM Setup / Identity** | Do not create pages if there is no query connection; the page becomes **dead weight**. If content is created to generate **Historical Data** (AS), it must connect back to the Core Section (CS) to prevent dilution. | Content about 'Mindfulness' (AS) is only processed as far as it can connect back to the core monetization page (CS). | Processing every available topic for a broad subject like 'Mindfulness', resulting in the dilution of the primary focus. |  |
| **Structure / Template** | Templates must ensure comprehensive coverage of the chosen query network. Use unique n-grams and phrases (like "how I experienced") to establish a distinctive author vector and forum angle. | Creating a fixed template for listicles (e.g., "Top 10 X") that dictates the type of predicates used (e.g., compare, learn, examine). | Using templates provided by generic AI systems that produce only simple taxonomies that do not match SERP reality. |  |
| **Content Uniqueness** | Provide **Unique Information Gain** by adding new contexts, attributes, or entities not covered by competitors. | For a guide on "cost of opening a gym," inserting three new entities/factors into the Knowledge Graph that competitors missed. | Providing only the same facts, dates, and definitions found on top-ranking competitor websites. |  |
| **Link Structure** | Use **Bridge Topics** to create relevance between disparate concepts within the TM. | Using an article about 'Swimming Styles' to create a contextual link to 'Pool Construction Materials'. | Randomly placing links in the middle of text blocks without clear contextual justification or bridge topics. |  |

---

## **III. Architectural & System Setup Guidelines**

These guidelines ensure the technical implementation supports the analytical requirements of the framework.

| Architectural Component | Required Action for System Setup | Reason / Framework Alignment | Bronnen |
| ----- | ----- | ----- | ----- |
| **Database Architecture** | Use a **Graph Database (Neo4j)** for modeling the Topical Map, calculating **Semantic Distance**, and storing link relationships. | Semantic Distance dictates how documents should be connected and clustered. Traditional relational databases cannot handle the complexity of entity relationships. |  |
| **Data Scraping & Analysis** | Scrape both **Raw HTML** (for CoR analysis, DOM size, LFA) and **Semantic Contextual Data** (Title, H-tags, Schema, Anchor Text, EAVs). | LFA reveals bot behavior and resource waste. Semantic data is necessary for identifying the **Contextual Vector** and on-page prominence. |  |
| **Initial TM Creation** | Cluster pages based on **Entity/Attribute similarity** and **Semantic Distance**, not just keyword overlap. | AI tools often provide a simple taxonomy, which is insufficient. The TM must reflect user behavior and query verbalization. |  |
| **Actionable Improvement Plan** | The output must prioritize actions that correct **Ranking Signal Dilution** and improve Indexability (e.g., canonicalization, 301s). | Consolidation of signals is necessary due to the chaos of the web and issues like faceted navigation creating millions of unnecessary URLs. |  |
| **URL Consolidation** | Implement checks for URL consistency regarding casing, trailing slashes, and search parameters. | Flawed URL structures (e.g., parameters, case issues) create duplicate content and increase CoR. **Short URLs are preferred** as they are easier to parse. |  |
| **Site Segmentation** | Check for **Inorganic Site Structure** where different segments (subdomains/subfolders) are irrelevant or use disparate branding. | Multiple unrelated topics or differing designs/logos/colors signal separate entities, which can lead to demotion. |  |
| **Query & Topic Mapping** | The system must be able to identify **Query Networks** and map **Canonical Queries (CQ)** to the correct document. | Pages should only be created if they deserve a new **Index Construction**. If no query exists, the topic should be integrated into an existing document. |  |
| **Competitive Analysis** | Use programmatic methods to compare the volume, depth, and order of competitor's entities and attributes. Focus on **Vastness, Deepness, and Momentum** to exceed quality thresholds. | If unable to match vastness, compensate by increasing depth and momentum. Competitors' decay (stale content \> 6 months) makes them easy targets. |  |

