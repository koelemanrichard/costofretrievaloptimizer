The process of performing an LLM (Large Language Model) scan based on queries and mentions is a critical component of advanced Semantic SEO. It moves beyond simple keyword research to perform competitive analysis, identify information gaps, and validate your content's semantic density against market context.

Here are the detailed rules, methodologies, tools, and points to look for, ensuring comprehensive coverage of the required analytical process.

---

### **I. Tools and Execution Platforms**

To perform a scalable LLM scan, you require specialized computational resources, as common commercial tools often lack the necessary API access and control for deep semantic extraction.

| Action Item | Detail & Specification | Source |
| ----- | ----- | ----- |
| **A. Core LLM/AI Integration** | Utilize robust platforms like **Vertex AI Studio (Google)** or **SageMaker (Amazon)** for advanced tasks, offering more control over models and data. For foundational scripting (e.g., entity extraction), **Google NLP API** is highly effective. |  |
| **B. Agent Orchestration** | For complex analysis (e.g., running competitive SERP scans, content analysis, and question generation simultaneously), agents must be orchestrated. This involves connecting multiple APIs (NLP, SERP data, calculation/ranking) in a series of steps to achieve a single function. |  |
| **C. Data Inputs** | The LLM scan requires two primary data feeds: **1\. SERP Data:** Extracted search results from tools like DataForSEO or SerpAPI, providing query and ranking context. **2\. Corpus Data:** The actual HTML content scraped from the top-ranking URLs identified in the SERP data (landing pages). |  |

### **II. Methodology for Query/SERP Scanning (Relevance & Gap Analysis)**

This process focuses on analyzing what the search engine prioritizes for a given query network and identifying actionable gaps.

| Step | Actionable Rule and Detail | Look For (Critical Metrics) | Source |
| ----- | ----- | ----- | ----- |
| **1\. Define Query Network** | Input the main keyword(s) and relevant variations. The LLM must categorize these queries by intent (e.g., informational, commercial, navigational). | Analyze **Query Characteristics** (e.g., average length, common presence of "review/complaints/legit" terms) to identify intent and cannibalization risks. |  |
| **2\. Question Generation** | Instruct the LLM to generate all possible questions from the canonical query. This simulates the search engine's Query $\\rightarrow$ Question processing method. | Identify **Canonical Question Formats** and questions that possess inherent answers (Yes/No or Definitive facts) suitable for featured snippets. |  |
| **3\. Competitive EAV Extraction** | Feed competitor content (corpus data) into the LLM/Agent. The agent must extract and classify all relevant **Entity-Attribute-Value (EAV)** triples (Subject-Predicate-Object). | Determine **Information Density** (facts per word count) and compare the quantity of **Root, Rare, and Unique Attributes** covered by competitors. |  |
| **4\. Anchor Text Audit** | Scan competitor content for internal and external anchor texts. The agent checks if the anchor text matches the destination URL/title and if the surrounding text (annotation text) justifies the link semantically. | Identify **Anchor Text Repetition** (must not exceed three times per unique anchor text/URL pair) and assess contextual clarity. |  |
| **5\. Contextual Vector Analysis** | Compare the order of headings and subheadings used across the top-ranking pages. This reveals the dominant **Contextual Hierarchy** (H1 $\\rightarrow$ H2 $\\rightarrow$ H3 flow) the search engine prefers. | Find **Context Consolidation**: Assess if the main topics (Macro Context) are immediately followed by relevant sub-topics (Micro Context) without dilution. |  |

### **III. Methodology for Mention/Entity Scanning (Authority & Trust Scan)**

This process uses LLMs to audit the external environment, confirming the entity’s identity and E-A-T signals.

| Step | Actionable Rule and Detail | Look For (Critical Metrics) | Source |
| ----- | ----- | ----- | ----- |
| **1\. Identity Validation** | Use the LLM to query authoritative third-party platforms (Wikipedia, Crunchbase, GMB, review sites) using the entity name and founder/CEO name. | Verify **Legit Online Presence** (consistent address, contact info, licenses) and check if the entity has been registered and recognized in the Knowledge Graph. |  |
| **2\. Reputation Scoring** | Feed user-generated content (reviews, social media mentions) related to the entity into the LLM. | Calculate **Review Sentiment** (positive vs. negative) and analyze the content of reviews for specific attributes (e.g., "fast response," "high quality"). LLMs can generate unique, objective summary reviews by replacing emotional/casual language. |  |
| **3\. Expertise Verification** | Scan the web for articles published by the site's authors. Use the LLM to analyze the consistency of the author's **Expression Identity** (unique vocabulary, sentence structure) against known AI signatures. | Detect high frequency of common **AI Signatures** (e.g., redundant phrases, generic fillers). Confirm the content uses definitive, scientific terminology (Expertise signal). |  |
| **4\. Co-occurrence Mapping** | Input industry-specific terms and the brand name into the LLM. Request contextual connections (e.g., "Brand X \+ Industry Term Y"). | Determine the most frequent and relevant **Co-occurrence Metrics** to see if the brand name is topically consolidated with the core industry terms. |  |

### **IV. Critical Metrics and Rules for Content Configuration**

The LLM output or audit must be evaluated against these strict rules to maximize relevance and decrease **Cost of Retrieval (CoR)**.

| Metric/Rule | Description and Thresholds | Correct Example | Wrong Example | Source |
| ----- | ----- | ----- | ----- | ----- |
| **Semantic Compliance** | Content must adhere to structural and semantic rules. Target score must be **$\>85%$**. | Every heading is followed by text that strictly relates to its topic. | Writing an article where the topic is inconsistent with the primary focus. |  |
| **Information Density** | Maximize unique, verifiable facts per sentence while minimizing redundant words. Sentences should be short to decrease computational parsing cost. | "Financial independence relies on sufficient personal economics". | "In my opinion, financial independence is very important for families to achieve financial stability". |  |
| **EAV Declaration** | Every sentence should function as a Subject-Predicate-Object statement, clearly defining an entity and its attribute/value. | "Water is vital for life". | "Water might be vital for life" (Modality decreases factual certainty). |  |
| **Featured Snippet Length** | Definitive answers must be concise, typically **$\<50$ words** (300-360 characters). | Start the answer directly with the definitive fact. | Delaying the definitive answer with an introductory sentence or context. |  |
| **Modality and Tense** | Use **Present Tense** for permanent facts and declarative sentences for consensus. Avoid conditional modalities (can, might, should) unless citing specific research/perspectives. | "Drinking water increases energy" (Fact). | "Water can be vital for life". |  |
| **Discourse Integration** | Sentences must flow logically by repeating key terms (anchor segments) from the preceding sentence to maintain contextual connection. | Sentence 1: "...water is vital for **cells**." Sentence 2: "**Cells** compose tissues...". | Switching the subject or context abruptly between sentences. |  |
| **Resource Prioritization** | All critical resources (CSS, LCP image) must be preloaded at the top of the HTML. The primary content/answer must be within the **Information Retrieval Zone (IR Zone)** (first 400 characters of source code). | Ensure H1 and the core definition are the first elements following the essential `<head>` tags. | Placing social media buttons or large scripts before the core content. |  |
| **Link Placement** | Anchor text must be specific and placed within the **Main Content (I-nodes)**, not repetitive boilerplate. | Link target page with its canonical or representative anchor text, placed mid-sentence, after the context has been established. | Using "Click Here" or "Read More" (Generic/Non-contextual anchor). |  |

### **V. Correct and Wrong LLM Output Examples (Content Configuration)**

LLM output used for content should be audited to ensure compliance with micro-semantic rules.

| Rule Violated / Metric Checked | Wrong LLM Output | Why It Fails the Semantic Scan (Actionable Feedback) |
| ----- | ----- | ----- |
| **Passive Voice / Factual Delay** | "The benefits of drinking water are often discussed, and it has been suggested that energy levels may be boosted by proper hydration." | Uses passive voice ("are discussed") and modal verbs ("may be boosted"), reducing certainty and factual density. Answer is delayed. |
| **Context Dilution / Fluff** | "In addition, the CPU is basically like the brain of your computer, allowing all the processes to happen, unfortunately." | Uses contextless filler ("In addition," "basically," "unfortunately") and an analogy, diluting the conceptual vector. |
| **Anchor Text Cannibalization** | Anchor Text: "Best Protein Powder." Sentence appears 5 times on the page, linking to the same URL. | The LLM failed to use synonym variations (e.g., "Top Whey Powder options") and repeated the anchor text too frequently (exceeds the 3x limit). |
| **Modality / Inconsistency** | "We believe water intoxication is a severe condition, but it is important to note that symptoms can vary dramatically." | Uses subjective belief ("We believe") and non-definitive modalities ("can"), contradicting the need for factual certainty in YMYL topics. |
| **Correct LLM Output: High Density** | "Water increases energy for brain and body functions. This biological process relies on optimal plasma volume. Maintaining plasma volume decreases fatigue." | Uses high density (three facts/entities per sentence), active voice, and clear **Discourse Integration** (plasma volume carries the context between sentences). |

