This detailed checklist and rule set specify how to design and utilize structured content formats—specifically **Unordered Lists, Ordered Lists, and Tables**—within your Semantic Content Network (SCN). These elements are crucial for increasing **Information Density**, maximizing **Information Extraction**, and achieving high **Information Responsiveness**.

## **I. Foundational Rules for Structured Content (General)**

All structured content elements must adhere to these foundational principles to communicate clearly with search algorithms.

| Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Semantic HTML Usage** | Use the correct Semantic HTML tags to signal the function and position of the content block. This aids search engines in weighting sections differently. | Use `<section>` around an H2 block. Use `<table>`, `<thead>`, `<tbody>` for comparative data. Use `<ol>` or `<ul>` for lists. | Relying solely on non-semantic `<div>` tags for structure. |  |
| **B. List Definition Completeness** | Every list or table must be preceded by a **complete, definitive sentence** that introduces the content (List Definition). | "The benefits of drinking water in the morning **are listed below**." (Complete sentence). | "Benefits of drinking water:" (Incomplete sentence ending in a colon or fragment). |  |
| **C. Content Density** | Every list item or table cell should deliver **one unique piece of information** (EAV triple). Avoid repetition or unnecessary bridge words. | List item: "Improves mood by X%" (Specific, measurable fact). | List item: "It is very important that you should feel better." (Fluff/Opinion). |  |
| **D. Contextual Term Alignment** | List/Table content must contain **context terms** (synonyms or related attributes) that connect it back to the specific query and the main heading. | In a list under H3: "Morning Benefits," list items use the word "morning" or synonyms like "day". | List items discuss "evening effects" under a heading for "morning benefits," breaking context. |  |
| **E. Featured Snippet (FS) Target** | Use lists and tables to target **Featured Snippet** opportunities, as search engines often prefer these formats for concise answers. | Use the tag/instruction **FS** in the content brief to guide the author to use the optimal format and length (\<40 words). | Using a long prose block for a question type that consistently triggers a list FS on the SERP. |  |

---

## **II. Specific Rules for Lists**

### **A. Ordered Lists (`<ol>`) Specifications**

Ordered lists signal sequence, priority, or strict enumeration, directly appealing to instructional or superlative search intent.

| Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **1\. Sequential/Superlative Condition** | Must be used when the query or heading uses a **superlative term** (e.g., biggest, top 5, smallest) or if the content is **instructional** (steps, procedures, methods). | H2: "Top 5 Benefits of X." (Uses ordered list). H2: "How to follow X." (Uses ordered list). | Using an ordered list for a simple definition or list of general features. |  |
| **2\. Count Specificity** | If the list is instructional or finite, the introductory sentence must state the **exact number** of items that follow (e.g., "There are five steps..."). | "To follow X, there are **five steps**:" followed by five numbered list items. | Stating "Here are the steps" but providing seven items, breaking the expected pattern. |  |
| **3\. Instructional Verb Usage** | Every item in an instructional list must begin with an **instructional predicate** (a verb in the command form, like run, understand, adjust). | 1\. **Run** the program. 2\. **Remove** the old file. | 1\. The program starts automatically. 2\. The old file is removed. (Uses non-instructional phrases). |  |
| **4\. Contextual Specification** | For superlative lists, the item must include **numeric values** and **context qualifiers** to justify the rank (e.g., biggest in size, not cost). | 1\. **Church A** (100,000 square meters) \- largest building size. | 1\. Church A \- Very big church. (Lacks numeric proof and context). |  |

### **B. Unordered Lists (`<ul>`) Specifications**

Unordered lists are used for attributes, features, definitions, or benefits where the order is not critical.

| Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **1\. General Grouping** | Used to group related attributes or items (e.g., features, types, advantages) without implying hierarchy or sequence. | H2: "Types of Solar Panels." Uses an unordered list for Monocrystalline, Polycrystalline, etc.. | Using an unordered list for a 'How-To' guide, which requires sequencing. |  |
| **2\. Bolding Rule** | When defining types or features in an unordered list, **bold the answer** or the descriptive part of the statement, not the entity name itself. | **Feature:** The material **is resistant to high heat**. | **Feature:** **High heat** is tolerated by the material. (Bolding the wrong part of the proposition). |  |

---

## **III. Rules for Tables (`<table>`) Specifications**

Tables are essential for displaying structured, complex data, especially comparisons, specifications, and factual summaries, enabling advanced information extraction by crawlers.

| Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Comparison & Specifications** | Must be used for **comparison content** (versus pages) or complex **product specifications** where attributes need to be cross-referenced (e.g., materials, dimensions, price ranges). | A table comparing Kimber vs. Colt holsters, detailing design, shape, and material. | Using prose paragraphs to describe the complex feature differences between two products. |  |
| **B. Structure Control** | The content brief should define the exact structure: **row count, column count, column names, and column order**. | Table column names include: 'Advantages,' 'Disadvantages,' 'Price Range,' 'Lens Options,' and 'Frame Depth'. | Using a generic table without specifying the exact attribute columns required for the brief. |  |
| **C. Metadata Integration** | Tables should integrate complex attribute data, including different measurement units or derived attributes, to enhance factual density. | Column includes 'Size (Meters)' and a separate column includes 'Size (Feet)'. | Using only one unit of measurement when the search intent requires multiple formats (e.g., liters, gallons, cups). |  |
| **D. Machine Readability** | Search engines analyze HTML tables by checking column and row names to understand the context and the relationships between cells. | Clearly label all columns (e.g., "Price Range," "Shipping Cost," "Material"). | Using abbreviations or vague headers that require human inference. |  |

---

## **IV. Placement and Contextual Flow Rules**

The placement of lists and tables dictates their prominence and relevance for a specific query network.

| Actie PUNT | REGEL (Rule Detail) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| ----- | ----- | ----- | ----- | ----- |
| **A. Macro Context Placement** | The first structured content element (list/table) must be placed high on the page, within the **Macro Context (Main Content)**, to maximize the chance of capturing an FS. | The comparison table showing product types and prices is placed immediately after the introductory H2 section. | Burying the only list on the page deep in the Supplementary Content (Micro Context), diminishing its relevance for the main query. |  |
| **B. Consistency of Format** | If a page is designed to target a specific query type (e.g., "Best X" \- requiring an ordered list), that format must be used in the most relevant section (Macro Context). | If the page targets the "Best X" query, the first answer in the Macro Context uses an ordered list. | Using a prose paragraph to answer the "Best X" question in the main content, while using the correct ordered list format in a low-prominence section. |  |
| **C. Subordinate Text Proximity** | Do not interrupt the flow between the **Heading** (question) and the **Structured Answer** (list definition/table) with unrelated elements (e.g., images, large ads). | The introductory sentence for the list directly follows the H2 tag. | An irrelevant image is inserted between the H2 ("What are the types?") and the defining sentence. |  |
| **D. Template Configuration** | Ensure that the content brief template allows for the customization of lists and tables, as the context will shift for different entities of the same type. | The general 'Mail Merge' template is configured to use a list for 'Mail Types' but a table for 'Template Comparison'. | Using an identical, unconfigured template for 500 different entities (e.g., plants) where attribute importance changes based on the entity type. |  |

---

## **V. Incorrect Practices (Wrong Examples)**

| Actie PUNT | Incorrect Practice | Framework Violation | Sources |
| ----- | ----- | ----- | ----- |
| **A. Conflicting Formats** | Using the same optimal content format (e.g., an ordered list) multiple times on the same page for closely related query networks. | Causes **Cannibalization** and signals conflicting relevance, making the search engine unable to choose the best answer passage. |  |
| **B. Fluff Inclusion** | Starting list items or table cells with phrases like "It is important to note that..." or "Overall...". | Dilutes the **Information Density** and violates the rule that every word must contribute unique value to the factual assertion. |  |
| **C. Separating Triples** | Writing long sentences within a list item that separate the Subject, Predicate, and Object (the EAV triple). | Increases the **Semantic Complexity** and makes **Information Extraction** difficult for the machine. |  |
| **D. Missing Predicates** | Using lists without clear predicates (verbs) when dealing with instructional or action-oriented content (e.g., tips, steps). | Fails to match the **Query Semantics** (CSI) required by "How-To" queries, which depend on instructional verbs. |  |
| **E. Inconsistent Facts** | Displaying one fact (Value) in a table on Page A and a contradictory fact in a list on Page B. | Creates **Conflicting Declarations** within the SCN, significantly reducing **Knowledge-based Trust (KBT)**. |  |

