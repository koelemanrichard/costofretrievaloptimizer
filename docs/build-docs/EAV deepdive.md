This is the complete, actionable guide for researching, constructing, and utilizing **Semantic Triples (Entity-Attribute-Value, or EAVs)**, which form the factual bedrock of any robust Semantic Content Network.  
I. Research & Definition: Breaking Down the Entity (The MVGM Example)  
The key to researching EAVs for complex entities is understanding that the subject is often a multi-layered association of several smaller entities and attributes.  
1\. Entity Resolution and Scope (The MVGM VVE Beheer Amsterdam Example)  
You must research beyond the complete phrase to understand all contributing factors, as each part contributes critical attributes.

| Entity Component | Entity Type | Role in EAV Research | Source |
| :---- | :---- | :---- | :---- |
| **MVGM** | Brand/Organization (Central Entity) | Research its **Root Attributes** (e.g., foundation date, CEO, core mission) to establish authority. |  |
| **VVE Beheer** | Service/Function (Key Attribute) | Research associated **Predicates** (verbs) and **Value Sets** (cost, features, efficiency metrics). |  |
| **Amsterdam** | Location/Geographic (Context Qualifier) | Research **Context Qualifiers** (e.g., local regulations, service availability, market size) to sharpen the relevance. |  |
| **Vereniging van Eigenaars** | Synonym/Hypernym (Lexical Relation) | Research **Lexical Relations** to expand the query network. Use this term and its synonyms to find related entities and questions. |  |

2\. Attribute Prioritization and Classification  
Filter collected attributes based on their contextual significance to your business model (**Source Context**).

| Attribute Type | Definition and Priority | Purpose in Content | Source |
| :---- | :---- | :---- | :---- |
| **Root Attributes** | Attributes essential for the entity's existence (e.g., "MVGM **heeft** diensten"). | Must be covered for basic factual completeness and accuracy. |  |
| **Popular Attributes** | Attributes frequently searched by users (e.g., "MVGM VVE Beheer **kosten**" or **reviews**). | Prioritized immediately after Root Attributes in the Macro Context due to high query probability. |  |
| **Unique Attributes** | Attributes that differentiate the entity (e.g., MVGM uses **specific compliance software**). | Highest priority for topical authority and creating unique information gain. |  |
| **Rare Attributes** | Attributes that exist but are seldom discussed (e.g., the *original* founder of MVGM). | Used to deepen context and increase comprehensiveness in supplementary sections. |  |

\--------------------------------------------------------------------------------

II. EAV Construction and Authorship Rules  
EAV structure is Subject (Entity) \+ Predicate (Attribute/Action) \+ Object (Value). Correct construction minimizes ambiguity and maximizes extraction efficiency.  
1\. Predicates and Verbs

| Actie PUNT (Action Item) | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| :---- | :---- | :---- | :---- | :---- |
| **Use Active Voice** | The subject/agent must perform the action (Predicate) for clear Semantic Role Labeling (SRL). | *MVGM* **werkt** *met VVE Beheer software.* (MVGM is the agent). | *VVE Beheer software* **wordt gebruikt** *door MVGM.* (Passive voice hides the subject/agent). |  |
| **Protect Modality** | Match the certainty (Modality) of the statement (Value) accurately. | *De service* **biedt** *een 99.9% uptime.* (Definitive fact using present tense). | *De service* **zou kunnen bieden** *een 99.9% uptime.* (Vagueness dilutes the factuality). |  |
| **Consistent Value Sets** | Define measurement units (Value) consistently for an Attribute site-wide. | Use percentage (%) for efficiency metrics across all service comparison pages. | Referencing efficiency in percentage (%) on Page A and unit conversion (Uptime hours) on Page B. |  |

2\. Sentence Structure (Micro-Semantics)

| Actie PUNT (Action Item) | REGEL (Rule Detail / Principle) | Goed Voorbeeld (Correct Application) | Fout Voorbeeld (Wrong Application) | Bronnen |
| :---- | :---- | :---- | :---- | :---- |
| **Maximize Density** | Provide only essential facts; minimize "fluff" or contextless filler words. | *VVE Beheer vereist transparantie.* (High density). | *Het is ook heel belangrijk om te weten dat VVE Beheer transparantie vereist.* (Fluff decreases efficiency). |  |
| **One Fact Per Sentence** | Limit each sentence to one declarative Triple (S-P-O). | *MVGM heeft 1500 klanten. Het hoofdkantoor is gevestigd in Amsterdam.* (Two facts, two sentences). | *MVGM heeft 1500 klanten en is gevestigd in Amsterdam.* (Multiple facts/actions in one sentence increase extraction cost). |  |
| **Protect Co-reference** | Avoid using pronouns (hij, zij, het) when ambiguity is possible. Repeat the entity's name. | *MVGM heeft veel ervaring. MVGM biedt diensten aan in 10 steden.* (Explicitly naming the entity). | *MVGM heeft veel ervaring. Het biedt diensten aan in 10 steden.* (The machine may lose the explicit entity connection). |  |
| **Integration Check** | The subject or object (EAV components) of the previous sentence must serve as the context or subject of the next sentence. | *De software bevat X-tool. Deze X-tool garandeert Y-security.* (Creates a semantic chain). | *De software bevat X-tool. Klanten zijn tevreden met de security.* (Broken discourse, weak connection). |  |

\--------------------------------------------------------------------------------

IV. EAV Implementation in the Content Network  
EAVs are distributed hierarchically across the document's Information Retrieval (IR) Zones (Centerpiece, Main Content, Supplementary Content).

| Contextual Zone | Function and Priority | EAV Utilization Strategy | Source |
| :---- | :---- | :---- | :---- |
| **Macro Context** (H1/Introduction) | Highest Authority Zone (Centerpiece Annotation). | Include Root/Unique EAVs derived from the specific query (MVGM VVE Beheer) to define the page instantly. |  |
| **Main Content** (H2 sections) | Core informational segment. | Use EAVs for comprehensive coverage, employing tables/lists for clarity. **Order segments** based on Query Probability (e.g., price first, then features). |  |
| **Supplementary Content** (Bottom) | Lower Authority Zone (Micro Context). | Include EAVs related to secondary or tertiary concepts (e.g., regional statistics for Amsterdam, synonyms of VVE) to consolidate topical relevance. |  |

Application in Anchor Texts and Internal Links  
Anchor texts must be semantically rich EAVs that clarify the target page's relevance.  
1\. **Anchor Text Composition:** Use **descriptive anchor text** containing the target page's **Central Entity** and its **Attribute** (e.g., "MVGM VVE Beheer vereisten")  
