You are asking for absolute completeness regarding the rules for writing based on a semantic content brief. While the previous response covered the core pillars, there are **granular, advanced, and specific "Algorithmic Authorship" rules** and **Content Brief Codes** from Koray Tuğberk GÜBÜR’s framework that were not fully detailed.

To ensure nothing is left out, here are the specific advanced rules, **Content Brief Codes**, and **Micro-Semantic mechanics** that a writer must strictly follow.

---

### **I. The "Code Language" of the Content Brief**

Koray’s briefs use specific abbreviations and codes to instruct writers on the *exact* format and length required for specific sections. Writers must recognize these codes immediately.

| Code | Meaning | Writer Action Required | Source |
| ----- | ----- | ----- | ----- |
| **\[FS\]** | **Featured Snippet** | Write a direct, definitive answer between **40-50 words** (approx. 300-360 characters). Do not exceed this length. The answer must be the *first* sentence after the heading. | , |
| **\[PAA\]** | **People Also Ask** | Write a concise answer targeting a common question. This often requires a **Definition \+ Expansion** structure. |  |
| **\[Listing\]** | **List Format** | Use an HTML list (`<ul>` or `<ol>`). Before the list, write a **"List Definition Sentence"** (e.g., "The main benefits of X include:"). Never drop a list without this preceding sentence. | , |
| **\[Definitive Answer\]** | **Long Form / Detailed** | Provide a comprehensive explanation. Use **all qualifiers and signifiers** (adjectives, attributes) of the entity. Explain concepts, connections, and definitions fully. |  |
| **\[ "..." \]** | **Include Term** | If a phrase is in quotation marks (e.g., `"credit score calculation"`), you **MUST** include that exact phrase in the sentence, protecting its word order and context. |  |
| **\[Anchor Text\]** | **Internal Link** | Use this specific phrase as the hyperlink. **Do not** link from the first word of the sentence. Place the link in the middle or end of the sentence *after* the context is established. | , |

---

### **II. Advanced Algorithmic Authorship Rules (The "Don't" List)**

These are strict prohibitions to prevent "Context Dilution" and ensure the content is treated as fact-based expertise.

| Rule | Explanation & Writer Action | Source |
| ----- | ----- | ----- |
| **No "Opinionated" Language** | **Never** use phrases like "I think," "In my opinion," "We believe," or "Unfortunately/Fortunately." Search engines rank **facts**, not opinions (unless it is a specific review entity). | , |
| **No "Everyday" Language** | Avoid casual conversational fillers. **Banned words:** "Just," "Basically," "Actually," "Very," "Really," "So," "Anyway." These words decrease **Information Density**. |  |
| **No Analogies** | Do not use metaphors or analogies to explain concepts (e.g., "The CPU is like the brain..."). Analogies introduce irrelevant entities (brain) into the vector space of the main entity (CPU), confusing the semantic relevance. |  |
| **No Passive Voice** | Use **Active Voice**. |  |

*Wrong:* "The ball was thrown by the boy." *Correct:* "The boy threw the ball." Active voice clarifies the **Agent (Subject)** and the **Patient (Object)** for Semantic Role Labeling. | | | **No "Co-Reference" Ambiguity** | Avoid using pronouns like "He," "She," "It," or "They" if there is *any* chance of confusion. Repeat the **Entity Name** instead. *Wrong:* "Elon Musk and Jeff Bezos met. He said..." (Who is he?). *Correct:* "Elon Musk and Jeff Bezos met. Elon Musk said..." |, | | **No Future Tense for Facts** | Do not use "will" for permanent facts. Use **Present Simple**. *Wrong:* "The sun will rise in the east." *Correct:* "The sun rises in the east." | |

---

### **III. The "Safe Answer" & Consensus Protocol**

For YMYL (Your Money Your Life) topics, or when scientific consensus is involved, writers must follow a specific logical structure to avoid "Embarrassment Factor" (search engines avoiding wrong answers).

**The "Safe Answer" Formula:**

1. **Direct Answer:** Start with "Yes" or "No" if it’s a boolean question.  
2. **Condition/Exception:** Immediately follow with "However," or "If..." to state conditions.  
3. **Perspective Layers:** Provide the answer from different angles (e.g., "From a manufacturer's perspective...", "From a user's perspective...").  
4. **Consensus/Citation:** Cite a specific study, institution, or expert. **Do not** start the sentence with the citation. State the fact *first*, then the source.  
   * *Correct:* "Water intoxication causes hyponatremia, according to a study by X University."  
   * *Wrong:* "According to a study by X University, water intoxication causes..." |,,

---

### **IV. Paragraph & Information Ordering (Probability Ranking)**

Search engines rank passages based on the probability of user intent. You must order your paragraphs based on **Query Probability**.

**The Rule:** If the main query is "Benefits of X," and the most searched related attributes are "Price" and "Speed":

1. **Paragraph 1:** Must address **Price**.  
2. **Paragraph 2:** Must address **Speed**.  
3. **Paragraph 3:** Address minor attributes (e.g., History, Color).

*Why?* If you put the "History" paragraph first, you push the most probable answer (Price) down the DOM tree, lowering the page's relevance score for the main intent. **You must follow the attribute prominence order defined in the brief.**,

---

### **V. Visual Semantics & Image Rules for Writers**

Writers often ignore image instructions, but in this framework, they are mandatory "Information Extraction Points."

1. **Image Caption Rule:** The sentence immediately *before* or *after* an image must describe or qualify the image content using the **Main Entity** \+ **Attribute** keywords.  
2. **Alt Text Alignment:** The Alt Text must match the **Image URL** structure and the surrounding text context.  
3. **Unique Composition:** If the brief asks for a "Comparison Table Image," the writer must provide the data for that table so it can be generated.,

---

### **VI. The "Contextual Bridge" & "Border" Rule**

When moving from the **Main Content (Macro Context)** to the **Supplementary Content (Micro Context)**, the writer must create a "Bridge."

* **The Problem:** Suddenly switching from "Water Benefits" to "Water Filters" confuses the vector.  
* **The Fix (Bridge Sentence):** "To enjoy these benefits, one must ensure the water is clean using **Water Filters**."  
* **The Border:** There is often a specific heading (e.g., "Frequently Asked Questions" or a specific "Related X" heading) that acts as the hard border. Everything above this must be tightly focused on the main entity. Everything below can explore related entities.,

### **VII. Final Pre-Publishing Scan (The "Gibberish" Test)**

Before submitting, the writer must perform a "Gibberish Score" check:

* **Remove Stop Words:** Read the article without "and," "the," "of," "in." Does it still look like a dense list of **Entity \+ Attribute \+ Value** facts?  
* **Fact Count:** Does every single sentence contain a verifiable fact (Triple: Subject-Predicate-Object)? If a sentence is purely transitional (e.g., "Let's dive into the next section"), **delete it**.,

