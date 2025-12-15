Based on Koray Tuğberk GÜBÜR’s framework, the "optimal mix" of content formats is not about aesthetic balance, but about **Information Extraction Efficiency** and **Query Format Matching**.

If your page feels like it has too many lists or tables, you are likely violating the rule of **Prose vs. Structured Content Balance**. Search engines evaluate pages based on two distinct scores: a "Prose Score" (paragraphs/text) and a "Structured Score" (tables/lists). To maximize your ranking potential, you must score high in both, not just one.

Here is the blueprint for the optimal mix, the rules for each element, and how to fix the "too many lists" problem.

### **I. The Golden Rule: The "Baker" Principle**

According to the framework (referencing Google engineer Stephen Baker), a page achieves the highest quality score when it combines **Prose Content** (Paragraphs) with **Structured Content** (Lists/Tables).

* **The Mistake:** A page consisting *only* of tables and lists looks like a database dump (low prose score). A page with *only* giant walls of text looks like a blog (low structured score).  
* **The Optimal Mix:**  
  1. **Define** the entity/concept with a **Paragraph**.  
  2. **Expand/List** attributes with a **List or Table**.  
  3. **Connect** to the next concept with a **Bridge Paragraph**.

---

### **II. Rules for Specific Content Formats**

#### **1\. Paragraphs (The Definitions & Bridges)**

Use paragraphs for **Macro Context** (the main topic) and **Contextual Bridges**.

* **When to use:** For "What is X?", "Why...", and "How..." (explanation) queries.  
* **Rule:** Every section should start with a paragraph that defines the immediate topic *before* showing a list or table.  
* **Best Practice:** The first sentence of the paragraph must define the entity or answer the heading directly (Direct Answer).  
  * *Correct:* **H2: Benefits of Apples.** \[Paragraph\] Apples provide extensive health benefits due to their high fiber content... \[List follows\]  
  * *Wrong:* **H2: Benefits of Apples.** \[Immediate List\] 1\. Fiber 2\. Vitamins... (Search engine misses the context connection).

#### **2\. Lists (Ordered vs. Unordered)**

Use lists when the user intent implies "plurality" (e.g., "Types of...", "Symptoms of...", "Steps to...").

* **Ordered Lists (`<ol>`):** Use *only* when hierarchy or rank matters.  
  * *Use for:* "Top 10...", "Steps to install...", "Ranking of...".  
* **Unordered Lists (`<ul>`):** Use for items of equal value.  
  * *Use for:* "Ingredients", "Features", "Benefits", "Symptoms".  
* **The "List Definition" Rule:** You must **never** drop a list without a preceding sentence. You must explicitly define what the list contains immediately before the `<ul>` or `<ol>`.  
  * *Correct:* "The primary symptoms of dehydration include:" \[List\]  
  * *Wrong:* \[Heading\] \-\> \[List\] (This disconnects the list items from the heading entity).

#### **3\. Tables (Comparative Data)**

Use tables for **comparative attributes** of multiple entities. Tables are powerful for "Information Extraction" but dangerous if overused.

* **When to use:** When you have 2+ Entities and 2+ Attributes (e.g., Price, Speed, Weight).  
* **Rule:** Column 1 must be the **Entity Name** (Subject). The following columns must be the **Attributes** (Predicates/Values).  
* **The Fix for "Too Many Tables":** If you have a table with only two columns (e.g., "Feature" and "Value"), turn it into a **list**. Tables are for *comparison* or *complex data*, not simple attribute listing.

#### **4\. Images (Visual Semantics)**

Images are not decoration; they are **data containers**.

* **Placement Rule:** Place the image *immediately after* the text that describes it.  
* **The Proximity Constraint:** Never place an image between a Heading (Question) and its Answer (Paragraph). This breaks the HTML proximity and confuses the answer extraction.  
  * *Correct:* H2 \-\> Answer Paragraph \-\> Image \-\> H3.  
  * *Wrong:* H2 \-\> Image \-\> Answer Paragraph.

---

### **III. The Optimal Page Layout Flow (Macro to Micro)**

To solve your issue of the page "not looking right," follow this structural flow. This ensures you satisfy the **Macro Context** (Main Topic) first, then move to **Micro Context** (Details/Related Topics).

| Section | Content Format Mix | Why? |
| ----- | ----- | ----- |
| **1\. Macro Context (Top)** | **Paragraphs (Heavy)** | You must establish the "Definition" and "Core Intent" textually to build the Contextual Vector. |
| **2\. Main Content (Body)** | **Mix of Paragraphs \+ Lists** | Use paragraphs to explain *why/how*, and lists to show *what/which*. Example: "X is beneficial (Para). The benefits include: (List)." |
| **3\. Comparison Area** | **Tables** | Once the entities are defined, use tables to compare them. (e.g., "iPhone vs. Samsung Specs"). |
| **4\. Contextual Bridge** | **Paragraph (Transitional)** | Before moving to a sub-topic (Micro Context), write a paragraph connecting the main topic to the sub-topic. |
| **5\. Supplementary (Bottom)** | **Lists & Links** | Use lists here for "Related X", "Other Types of Y". This is where lists are most acceptable without heavy text. |

### **IV. Determining "When to Use What" (The Query Test)**

If you are unsure whether to use a list, table, or paragraph, look at the **Query Semantics**:

* **Singular Query:** "What is the **price** of X?"  
  * *Format:* **Paragraph**. (Direct answer: "The price of X is $50.")  
* **Plural Query:** "What are the **benefits** of X?"  
  * *Format:* **List**. (There are multiple benefits).  
* **Comparative Query:** "X vs Y" or "X **Specs**"  
  * *Format:* **Table**. (Requires comparing attributes).  
* **Process Query:** "How to **install** X?"  
  * *Format:* **Ordered List**. (Step-by-step).

### **V. Summary Checklist for Your Page**

1. **Does every List have a definition sentence above it?** (If no, add one).  
2. **Is there a Table with only 2 columns?** (If yes, convert to a List).  
3. **Is there an Image between a Heading and the first Paragraph?** (If yes, move the image down).  
4. **Are you using "Also" or "In addition"?** (If yes, delete the fluff. Make the sentence a direct fact).  
5. **Is the top of the page mostly text?** (It should be. Don't start with a giant table; define the topic first).

