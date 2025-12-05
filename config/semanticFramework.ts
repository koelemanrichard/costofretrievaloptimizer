// config/semanticFramework.ts
// Semantic SEO Framework based on Koray Tugberk GUBUR methodology

export const SEMANTIC_FRAMEWORK = `
MACRO SEMANTICS (Structure & Architecture)
=========================================
**Macro-Semantics** defines the overall **Contextual Vector**, the hierarchy of information, and the "skeleton" of meaning.

1. **The Contextual Vector (Straight Line of Meaning)**
   - **Linearity**: The content must flow logically from H1 to the final heading. No detours.
   - **H1 Alignment**: H1 must reflect the Central Entity and User Intent.
   - **Signifiers**: Consistent use of predicates and adjectives (e.g., if discussing "Risks", use negative verbs).

2. **Contextual Hierarchy (Headings)**
   - **Incremental Ordering**: H2 -> H3 must follow logical depth (Attribute -> Sub-attribute).
   - **Feature Snippets**: Use lists in headings for "Types of", "Benefits of", etc.
   - **Prioritization**: Most important attributes (e.g., "Location" for a country) come before minor ones (e.g., "Cinema").

3. **Page Segmentation (Macro vs Micro)**
   - **Border Control**: Clear separation between Main Content and Supplementary Content.
   - **Contextual Bridges**: Logical sentences connecting different sections (e.g., "Now that we understand X, let's look at Y...").
   - **Link Placement**: Links to distinct topics should be in the footer/supplementary zone, not disrupting the main vector.

4. **Source Context & Brand**
   - **Sharpening**: Content must align with the site's expertise/monetization model.
   - **Tone**: Definitive statements ("X is Y") build authority.

MICRO SEMANTICS (Granular & Linguistics)
=======================================
**Micro-Semantics** determines *how* the search engine scores accuracy and relevance at the sentence/word level.

1. **Sentence Structure & Modality**
   - **Modality**: Use "is/are" (definitive) over "can/might" (probability) wherever possible.
   - **Stop Words**: Remove fluff words ("also", "basically", "very").
   - **Subject Positioning**: The main entity should be the Subject of the sentence.
   - **Information Density**: Every sentence must add a new "Fact" (Entity + Attribute + Value).

2. **Contextual Flow**
   - **First Sentence Rule**: The first sentence of a paragraph must directly answer/define the header above it.
   - **Centerpiece Annotation**: The core answer to the user's query must exist in the first 400 characters.

3. **HTML & Visual Semantics**
   - **Lists**: Use <ul> for ingredients/unordered, <ol> for steps/rankings.
   - **Tables**: Use for comparing attributes (Price, Specs).
   - **Alt Text**: Describe the *relation* of the image to the text, not just the image itself.
`;

export const SMART_FIX_PROMPT_TEMPLATE = `
You are a Micro-Semantic Expert Assistant.

TASK: The user needs to implement the following action on their webpage:
Action: "{title}"
Description: "{description}"
Rule Reference: "{ruleReference}"
{businessContext}
CONTEXT (The specific webpage content):
"""
{pageContent}
"""

INSTRUCTION:
Provide a CONCRETE, PRACTICAL example of how to fix this *specifically* for this content.
- If it's a contextual bridge, write the exact sentence to insert.
- If it's a heading fix, show the Old Heading vs New Heading.
- If it's fluff removal, show the sentence before and after.
- Explain *why* this specific change helps the vector/semantics.
- All suggestions must be appropriate for the target market/region and audience specified above.
- Keep it concise but actionable (max 200 words).
`;
