The concept of **Semantic Triples** is central to establishing a highly disciplined **Semantic Content Network** because it is the fundamental data structure used by search engines to store and index facts. Triples enable search engines to move beyond matching strings to matching meanings and contexts.

A semantic triple is the expression of a fact, typically structured as the **Subject-Predicate-Object (S-P-O)** model. This structure is analogous to the **Entity-Attribute-Value (EAV)** model, which organizes data into an entity, a specific attribute, and a value.

---

## **I. Foundational Rules: Definition and Function**

Semantic triples are the building blocks of a Knowledge Base. A knowledge base stores facts, and the triple structure helps organize these facts in a machine-readable form.

| Actie PUNT | REGEL (Rule Detail / Principle) | Specificatie / Component | Bronnen |
| ----- | ----- | ----- | ----- |
| **A. Triple Structure Definition** | A triple represents one object and two subjects, typically organized as Subject, Predicate, and Object. | **Subject (Entity):** The main entity (e.g., Tom Hanks). **Predicate:** The verb or relationship that connects the subject and object (e.g., acted in, married to). **Object (Value/Attribute):** The value or related entity (e.g., The Green Mile, wife's name). |  |
| **B. Context Signaling** | The **Predicate** signals the specific context of the sentence (the frame or role label) and determines the context in which the document should be indexed. | Example: "Tom Hanks acted in" signals the **filmography** context. "Tom Hanks married to" signals the **biography** context. |  |
| **C. Indexing and Organization** | Search engines use triples for **efficient indexing** by generating templates for entire groups of documents. This helps classify and organize the information on the web. | Triples help search engines group entities, facts, attributes, questions, and answers based on their similarity. |  |
| **D. Fact Extraction** | Triples are required for **Information Extraction** and for turning retrieved information into certified **Facts**. | Fact extraction algorithms need popular **consistency** over time from authoritative sources for a specific proposition. |  |

---

## **II. Content Creation Rules: Semantic Compliance via Triples**

For optimal relevance and high **Semantic Compliance** (target: 85%+), content must be engineered so that its inherent triples align with the user's query and the site's intended structure.

| Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Subject-Predicate Match** | The **Subject** of the query must be the **Subject** of the triple in the document to maintain a strong contextual connection. | Query: "Tom Hanks's biography." Document Sentence: "Tom Hanks (Subject) married (Predicate) Rita Wilson (Object)." | Document Sentence: "Rita Wilson married (Predicate) Tom Hanks (Object)." (Subject-object position swapped, connection is weaker). |  |
| **B. Sentence Structure Simplicity** | Use clear, grammatically sound, and concise sentences. Complex, long sentences (high dependency tree) obscure the triples and decrease **Information Density**. | Sentences should be short, delivering **one piece of information per sentence** (one clear EAV triple). | Using long, complex sentences with multiple clauses, making it difficult for the search engine to extract the specific triple. |  |
| **C. Consistency of Declarations** | All EAV declarations (facts) across the **Semantic Content Network** must be consistent to build **Knowledge-based Trust (KBT)**. | If Article A states the pH is 3.8, all subsequent articles referencing this fact must use 3.8. | Declaring a product as "best" on one page and a conflicting product as "best" on another page (conflicting declaration). |  |
| **D. Predicate Prominence** | Predicates must be carefully selected as they are the **most central word** in a sentence and signal the contextual relevance. | Choosing specific predicates like 'acquire profit' or 'secure profit' when writing about business. | Using vague or low-relevance predicates that do not align with the **Central Search Intent (CSI)**. |  |
| **E. Entity Proximity** | Semantically related words (Entity, Attribute, Value) should be used in **close proximity** to each other to ease the extraction of the triple. | Placing measurement units (Value) immediately next to the attribute they define (e.g., "1.5 kg weight"). | Separating the subject, predicate, and object with unnecessary fluff or context-less N-grams. |  |

---

## **III. Specialized Triples: Entity-Attribute-Value (EAV) Architecture**

The EAV model is an enriched triple structure required to handle the complex, specialized data needed by modern websites (e.g., product dimensions for E-commerce or user roles for SaaS).

| EAV Component | Specification / Classification Rule | Example of Specialized Attribute | Bronnen |
| ----- | ----- | ----- | ----- |
| **Entity (E)** | A self-dependent thing in the real world (physical or conceptual). Entities are living things inside the knowledge bases with different attribute-value pairs. | Cristiano Ronaldo (Focus on Skill for Sports Site) vs. Cristiano Ronaldo (Focus on Personality for Psychology Site). |  |
| **Attribute (A)** | Classified based on its necessity and uniqueness to the entity. | **Root Attribute:** Essential for the entity's definition (e.g., Population for a country). **Unique Attribute:** Definitive features not widely shared; prioritizes ranking. |  |
| **Value (V)** | The specific content of the attribute. Values must be verified against constraints (e.g., Type, Temporal). | **Direct/Simple Value:** Cannot be chunked further (e.g., height). **Composite Value:** Can be parsed into sub-attributes (e.g., Size $\\rightarrow$ Height, Width, Depth). |  |
| **Indirect Attributes** | An attribute that belongs to a specific **part of the entity**, rather than the whole entity. | **Specification:** Wheel Height and Window Height both use the same attribute 'height' but are assigned to different parts of the car. |  |
| **Derived Attributes** | An attribute whose value is derived from another attribute in the system (Dependency). | **Specification:** If the stored attribute is 'Birthdate,' the derived attribute 'Age' is calculated automatically. |  |

---

## **IV. Advanced Triples and Network Construction**

The deployment of triples extends beyond single-page optimization to define the structure of the entire **Semantic Content Network**.

| Concept | Explanation and Application | Context / Importance | Bronnen |
| ----- | ----- | ----- | ----- |
| **Knowledge Graph Construction** | Triples are aggregated to form a **Knowledge Graph**, which visualizes the entities, their properties, and their relationships. | The Knowledge Graph and Knowledge Base are connected concepts; every Knowledge Graph requires a Knowledge Base built on facts (triples). |  |
| **Anchor Text Indexing** | Search engines index Anchor Tags, and optimized anchor text must include a related entity or attribute to strengthen the link's triple connection to the target page. | **Action:** Use attributes/entities in anchor text to signal the context and relevance, transferring authority efficiently. |  |
| **Entity Identity Resolution** | Triples are used to recognize an entity with its type, attributes, and values. Conflicting triples make **Entity Identity Resolution** difficult for search engines. | **Action:** The Entity Home (the authoritative page defining the entity) must consolidate non-conflicting triples to define the entity's identity. |  |
| **Triple Ambiguity** | When an entity or concept is used ambiguously, the surrounding words determine the correct triple. **Word Sense Disambiguation** is necessary to select the correct triple context. | Example: "Tom Hanks acted in" determines the "filmography" triple; without the predicate, the context is ambiguous. |  |
| **Contextual Consolidation** | Triples are crucial for **Contextual Consolidation**, where similar facts or contexts are repeated across documents to establish authority. | **Action:** Use similar sentence structures across different content pieces (templates) for different query-intent pairs, as long as the underlying proposition (the triple) is factually correct. |  |

