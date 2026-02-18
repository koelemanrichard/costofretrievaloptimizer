/**
 * Rule Registry - Central repository for all quality enforcement rules
 *
 * This module defines 131+ quality rules organized into 20 categories
 * for the Holistic SEO content generation quality enforcement system.
 */

export type RuleSeverity = 'error' | 'warning' | 'info';

export type RuleCategory =
  | 'Central Entity'
  | 'Introduction'
  | 'EAV Integration'
  | 'Sentence Structure'
  | 'Headings'
  | 'Paragraphs'
  | 'Word Count'
  | 'Vocabulary'
  | 'Modality'
  | 'YMYL'
  | 'Lists'
  | 'Tables'
  | 'Images'
  | 'Contextual Flow'
  | 'Format Codes'
  | 'Schema'
  | 'Audit'
  | 'Systemic'
  | 'Internal Linking'
  | 'Query Intelligence';

export interface QualityRule {
  id: string;
  category: RuleCategory;
  name: string;
  description: string;
  severity: RuleSeverity;
  isCritical: boolean;
  validatorName?: string;
  threshold?: Record<string, number>;
  upgradeDate?: string;
}

/**
 * All quality rules organized by category
 */
const QUALITY_RULES: QualityRule[] = [
  // ============================================
  // Category A: Central Entity (7 rules: A1-A7)
  // ============================================
  {
    id: 'A1',
    category: 'Central Entity',
    name: 'Entity in title',
    description: 'The central entity must appear in the page title/meta title for proper topic identification',
    severity: 'error',
    isCritical: true,
    validatorName: 'CentralEntityValidator'
  },
  {
    id: 'A2',
    category: 'Central Entity',
    name: 'Entity in H1',
    description: 'The central entity must appear in the H1 heading for semantic clarity',
    severity: 'error',
    isCritical: true,
    validatorName: 'CentralEntityValidator'
  },
  {
    id: 'A3',
    category: 'Central Entity',
    name: 'Entity density',
    description: 'The central entity should appear with appropriate frequency throughout the content (0.5-2% density)',
    severity: 'warning',
    isCritical: false,
    threshold: { minDensity: 0.5, maxDensity: 2.0 },
    validatorName: 'CentralEntityValidator'
  },
  {
    id: 'A4',
    category: 'Central Entity',
    name: 'Entity in first paragraph',
    description: 'The central entity should appear in the first paragraph to establish topic early',
    severity: 'warning',
    isCritical: false,
    validatorName: 'CentralEntityValidator'
  },
  {
    id: 'A5',
    category: 'Central Entity',
    name: 'Entity variations',
    description: 'Use synonyms and semantic variations of the central entity to avoid keyword stuffing',
    severity: 'info',
    isCritical: false,
    validatorName: 'CentralEntityValidator'
  },
  {
    id: 'A6',
    category: 'Central Entity',
    name: 'Entity in meta description',
    description: 'The central entity should appear in the meta description for SERP relevance',
    severity: 'warning',
    isCritical: false,
    validatorName: 'CentralEntityValidator'
  },
  {
    id: 'A7',
    category: 'Central Entity',
    name: 'Entity context clarity',
    description: 'The central entity should be introduced with sufficient context for disambiguation',
    severity: 'info',
    isCritical: false,
    validatorName: 'CentralEntityValidator'
  },

  // ============================================
  // Category B: Introduction (7 rules: B1-B7)
  // ============================================
  {
    id: 'B1',
    category: 'Introduction',
    name: 'Centerpiece in 100 words',
    description: 'The main topic centerpiece must appear within the first 100 words of the article',
    severity: 'error',
    isCritical: true,
    threshold: { maxWords: 100 },
    validatorName: 'IntroductionValidator'
  },
  {
    id: 'B2',
    category: 'Introduction',
    name: 'Hook statement',
    description: 'Introduction should start with an engaging hook that captures reader attention',
    severity: 'warning',
    isCritical: false,
    validatorName: 'IntroductionValidator'
  },
  {
    id: 'B3',
    category: 'Introduction',
    name: 'Value proposition',
    description: 'Introduction should clearly state what the reader will learn or gain',
    severity: 'warning',
    isCritical: false,
    validatorName: 'IntroductionValidator'
  },
  {
    id: 'B4',
    category: 'Introduction',
    name: 'No premature detail',
    description: 'Introduction should not dive into technical details before establishing context',
    severity: 'info',
    isCritical: false,
    validatorName: 'IntroductionValidator'
  },
  {
    id: 'B5',
    category: 'Introduction',
    name: 'Scope definition',
    description: 'Introduction should define the scope and boundaries of the article content',
    severity: 'info',
    isCritical: false,
    validatorName: 'IntroductionValidator'
  },
  {
    id: 'B6',
    category: 'Introduction',
    name: 'Audience alignment',
    description: 'Introduction should address the target audience directly or implicitly',
    severity: 'info',
    isCritical: false,
    validatorName: 'IntroductionValidator'
  },
  {
    id: 'B7',
    category: 'Introduction',
    name: 'Transition to body',
    description: 'Introduction should provide a smooth transition to the main content sections',
    severity: 'info',
    isCritical: false,
    validatorName: 'IntroductionValidator'
  },

  // ============================================
  // Category C: EAV Integration (8 rules: C1-C8)
  // ============================================
  {
    id: 'C1',
    category: 'EAV Integration',
    name: 'Unique EAV coverage',
    description: 'All UNIQUE-classified EAVs from the brief must be covered in the content',
    severity: 'error',
    isCritical: true,
    validatorName: 'EAVIntegrationValidator'
  },
  {
    id: 'C2',
    category: 'EAV Integration',
    name: 'Root EAV coverage',
    description: 'All ROOT-classified EAVs must be addressed with appropriate depth',
    severity: 'warning',
    isCritical: false,
    validatorName: 'EAVIntegrationValidator'
  },
  {
    id: 'C3',
    category: 'EAV Integration',
    name: 'Rare EAV inclusion',
    description: 'RARE-classified EAVs should be included for competitive differentiation',
    severity: 'info',
    isCritical: false,
    validatorName: 'EAVIntegrationValidator'
  },
  {
    id: 'C4',
    category: 'EAV Integration',
    name: 'EAV natural integration',
    description: 'EAVs must be integrated naturally into the content flow, not forced',
    severity: 'warning',
    isCritical: false,
    validatorName: 'EAVIntegrationValidator'
  },
  {
    id: 'C5',
    category: 'EAV Integration',
    name: 'EAV attribute accuracy',
    description: 'EAV attributes must be accurately represented with correct values',
    severity: 'error',
    isCritical: false,
    validatorName: 'EAVIntegrationValidator'
  },
  {
    id: 'C6',
    category: 'EAV Integration',
    name: 'EAV distribution',
    description: 'EAVs should be distributed across sections, not clustered in one area',
    severity: 'info',
    isCritical: false,
    validatorName: 'EAVIntegrationValidator'
  },
  {
    id: 'C7',
    category: 'EAV Integration',
    name: 'EAV classification adherence',
    description: 'Content depth for each EAV should match its classification (TYPE/COMPONENT/BENEFIT/etc.)',
    severity: 'warning',
    isCritical: false,
    validatorName: 'EAVIntegrationValidator'
  },
  {
    id: 'C8',
    category: 'EAV Integration',
    name: 'EAV semantic linking',
    description: 'Related EAVs should be semantically linked to show relationships',
    severity: 'info',
    isCritical: false,
    validatorName: 'EAVIntegrationValidator'
  },

  // ============================================
  // Category D: Sentence Structure (8 rules: D1-D8)
  // ============================================
  {
    id: 'D1',
    category: 'Sentence Structure',
    name: 'Subject-first sentences',
    description: 'Sentences should place the subject before the verb for clarity (SVO order)',
    severity: 'warning',
    isCritical: false,
    threshold: { minPercentage: 70 },
    validatorName: 'SentenceStructureValidator'
  },
  {
    id: 'D2',
    category: 'Sentence Structure',
    name: 'Sentence length variety',
    description: 'Content should have a mix of short, medium, and long sentences for rhythm',
    severity: 'info',
    isCritical: false,
    validatorName: 'SentenceStructureValidator'
  },
  {
    id: 'D3',
    category: 'Sentence Structure',
    name: 'No run-on sentences',
    description: 'Sentences should not exceed 40 words without proper punctuation breaks',
    severity: 'warning',
    isCritical: false,
    threshold: { maxWords: 40 },
    validatorName: 'SentenceStructureValidator'
  },
  {
    id: 'D4',
    category: 'Sentence Structure',
    name: 'Active voice preference',
    description: 'Active voice should be preferred over passive voice (70%+ active)',
    severity: 'warning',
    isCritical: false,
    threshold: { minActivePercentage: 70 },
    validatorName: 'SentenceStructureValidator'
  },
  {
    id: 'D5',
    category: 'Sentence Structure',
    name: 'Clear antecedents',
    description: 'Pronouns must have clear antecedents to avoid ambiguity',
    severity: 'warning',
    isCritical: false,
    validatorName: 'SentenceStructureValidator'
  },
  {
    id: 'D6',
    category: 'Sentence Structure',
    name: 'Parallel structure',
    description: 'Lists and series within sentences should maintain parallel grammatical structure',
    severity: 'info',
    isCritical: false,
    validatorName: 'SentenceStructureValidator'
  },
  {
    id: 'D7',
    category: 'Sentence Structure',
    name: 'Transition variety',
    description: 'Sentence transitions should be varied, avoiding repetitive connectors',
    severity: 'info',
    isCritical: false,
    validatorName: 'SentenceStructureValidator'
  },
  {
    id: 'D8',
    category: 'Sentence Structure',
    name: 'No dangling modifiers',
    description: 'Modifiers must clearly relate to the word they are intended to modify',
    severity: 'warning',
    isCritical: false,
    validatorName: 'SentenceStructureValidator'
  },

  // ============================================
  // Category E: Headings (9 rules: E1-E9)
  // ============================================
  {
    id: 'E1',
    category: 'Headings',
    name: 'Single H1',
    description: 'Document must have exactly one H1 heading',
    severity: 'error',
    isCritical: true,
    validatorName: 'HeadingValidator'
  },
  {
    id: 'E2',
    category: 'Headings',
    name: 'No level skip',
    description: 'Heading levels must not skip (e.g., H2 to H4 without H3)',
    severity: 'error',
    isCritical: true,
    validatorName: 'HeadingValidator'
  },
  {
    id: 'E3',
    category: 'Headings',
    name: 'Descriptive headings',
    description: 'Headings should be descriptive and indicate section content',
    severity: 'warning',
    isCritical: false,
    validatorName: 'HeadingValidator'
  },
  {
    id: 'E4',
    category: 'Headings',
    name: 'Heading keyword inclusion',
    description: 'Relevant keywords should appear in headings where natural',
    severity: 'info',
    isCritical: false,
    validatorName: 'HeadingValidator'
  },
  {
    id: 'E5',
    category: 'Headings',
    name: 'Heading length limits',
    description: 'Headings should be concise (ideally under 70 characters)',
    severity: 'info',
    isCritical: false,
    threshold: { maxChars: 70 },
    validatorName: 'HeadingValidator'
  },
  {
    id: 'E6',
    category: 'Headings',
    name: 'Unique headings',
    description: 'Each heading should be unique within the document',
    severity: 'warning',
    isCritical: false,
    validatorName: 'HeadingValidator'
  },
  {
    id: 'E7',
    category: 'Headings',
    name: 'Question headings',
    description: 'Use question-style headings for FAQ sections to match search intent',
    severity: 'info',
    isCritical: false,
    validatorName: 'HeadingValidator'
  },
  {
    id: 'E8',
    category: 'Headings',
    name: 'Heading hierarchy depth',
    description: 'Heading hierarchy should not exceed H4 level for readability',
    severity: 'warning',
    isCritical: false,
    threshold: { maxLevel: 4 },
    validatorName: 'HeadingValidator'
  },
  {
    id: 'E9',
    category: 'Headings',
    name: 'Content under headings',
    description: 'Each heading must be followed by content before the next heading',
    severity: 'error',
    isCritical: false,
    validatorName: 'HeadingValidator'
  },

  // ============================================
  // Category F: Paragraphs (6 rules: F1-F6)
  // ============================================
  {
    id: 'F1',
    category: 'Paragraphs',
    name: 'Paragraph length',
    description: 'Paragraphs should be 3-7 sentences for optimal readability',
    severity: 'warning',
    isCritical: false,
    threshold: { minSentences: 3, maxSentences: 7 },
    validatorName: 'ParagraphValidator'
  },
  {
    id: 'F2',
    category: 'Paragraphs',
    name: 'Single idea per paragraph',
    description: 'Each paragraph should focus on a single main idea or concept',
    severity: 'info',
    isCritical: false,
    validatorName: 'ParagraphValidator'
  },
  {
    id: 'F3',
    category: 'Paragraphs',
    name: 'Topic sentence',
    description: 'Paragraphs should begin with a topic sentence that introduces the main point',
    severity: 'info',
    isCritical: false,
    validatorName: 'ParagraphValidator'
  },
  {
    id: 'F4',
    category: 'Paragraphs',
    name: 'Paragraph transitions',
    description: 'Paragraphs should have smooth transitions connecting ideas',
    severity: 'info',
    isCritical: false,
    validatorName: 'ParagraphValidator'
  },
  {
    id: 'F5',
    category: 'Paragraphs',
    name: 'No orphan paragraphs',
    description: 'Single-sentence paragraphs should be rare and intentional',
    severity: 'warning',
    isCritical: false,
    validatorName: 'ParagraphValidator'
  },
  {
    id: 'F6',
    category: 'Paragraphs',
    name: 'Visual paragraph breaks',
    description: 'Long sections should be broken into digestible paragraphs for web reading',
    severity: 'info',
    isCritical: false,
    validatorName: 'ParagraphValidator'
  },

  // ============================================
  // Category G: Word Count (5 rules: G1-G5)
  // ============================================
  {
    id: 'G1',
    category: 'Word Count',
    name: 'Minimum word count',
    description: 'Content must meet the minimum word count specified in the brief',
    severity: 'error',
    isCritical: false,
    validatorName: 'WordCountValidator'
  },
  {
    id: 'G2',
    category: 'Word Count',
    name: 'Maximum word count',
    description: 'Content should not significantly exceed the target word count',
    severity: 'warning',
    isCritical: false,
    validatorName: 'WordCountValidator'
  },
  {
    id: 'G3',
    category: 'Word Count',
    name: 'Section balance',
    description: 'Word count should be balanced across sections based on importance',
    severity: 'info',
    isCritical: false,
    validatorName: 'WordCountValidator'
  },
  {
    id: 'G4',
    category: 'Word Count',
    name: 'Introduction ratio',
    description: 'Introduction should be 5-10% of total content length',
    severity: 'info',
    isCritical: false,
    threshold: { minRatio: 5, maxRatio: 10 },
    validatorName: 'WordCountValidator'
  },
  {
    id: 'G5',
    category: 'Word Count',
    name: 'Conclusion ratio',
    description: 'Conclusion should be 5-8% of total content length',
    severity: 'info',
    isCritical: false,
    threshold: { minRatio: 5, maxRatio: 8 },
    validatorName: 'WordCountValidator'
  },

  // ============================================
  // Category H: Vocabulary (9 rules: H1-H9)
  // ============================================
  {
    id: 'H1',
    category: 'Vocabulary',
    name: 'Domain vocabulary',
    description: 'Content should use appropriate domain-specific vocabulary from the brief',
    severity: 'warning',
    isCritical: false,
    validatorName: 'VocabularyValidator'
  },
  {
    id: 'H2',
    category: 'Vocabulary',
    name: 'Vocabulary diversity',
    description: 'Content should demonstrate lexical diversity (varied word choices)',
    severity: 'info',
    isCritical: false,
    validatorName: 'VocabularyValidator'
  },
  {
    id: 'H3',
    category: 'Vocabulary',
    name: 'No LLM signatures',
    description: 'Content must not contain typical LLM signature phrases (delve, tapestry, unleash, etc.)',
    severity: 'error',
    isCritical: true,
    validatorName: 'VocabularyValidator'
  },
  {
    id: 'H4',
    category: 'Vocabulary',
    name: 'Consistent terminology',
    description: 'Terminology should be consistent throughout the document',
    severity: 'warning',
    isCritical: false,
    validatorName: 'VocabularyValidator'
  },
  {
    id: 'H5',
    category: 'Vocabulary',
    name: 'Jargon explanation',
    description: 'Technical jargon should be explained on first use',
    severity: 'info',
    isCritical: false,
    validatorName: 'VocabularyValidator'
  },
  {
    id: 'H6',
    category: 'Vocabulary',
    name: 'Avoid filler words',
    description: 'Minimize filler words and phrases that add no value',
    severity: 'info',
    isCritical: false,
    validatorName: 'VocabularyValidator'
  },
  {
    id: 'H7',
    category: 'Vocabulary',
    name: 'Reading level appropriateness',
    description: 'Vocabulary complexity should match the target audience reading level',
    severity: 'info',
    isCritical: false,
    validatorName: 'VocabularyValidator'
  },
  {
    id: 'H8',
    category: 'Vocabulary',
    name: 'Avoid overused words',
    description: 'Individual words should not appear excessively (excluding stop words)',
    severity: 'warning',
    isCritical: false,
    threshold: { maxFrequency: 2.0 },
    validatorName: 'VocabularyValidator'
  },
  {
    id: 'H9',
    category: 'Vocabulary',
    name: 'Brand terminology',
    description: 'Use correct brand-specific terminology when discussing products/services',
    severity: 'warning',
    isCritical: false,
    validatorName: 'VocabularyValidator'
  },

  // ============================================
  // Category I: Modality (5 rules: I1-I5)
  // ============================================
  {
    id: 'I1',
    category: 'Modality',
    name: 'Modal verb variety',
    description: 'Use a variety of modal verbs (can, should, must, may, might, etc.)',
    severity: 'info',
    isCritical: false,
    validatorName: 'ModalityValidator'
  },
  {
    id: 'I2',
    category: 'Modality',
    name: 'Certainty calibration',
    description: 'Modal language should match the certainty level of claims',
    severity: 'warning',
    isCritical: false,
    validatorName: 'ModalityValidator'
  },
  {
    id: 'I3',
    category: 'Modality',
    name: 'No false certainty',
    description: 'Avoid definitive claims without evidence (always, never, definitely)',
    severity: 'warning',
    isCritical: false,
    validatorName: 'ModalityValidator'
  },
  {
    id: 'I4',
    category: 'Modality',
    name: 'Hedging balance',
    description: 'Balance confidence with appropriate hedging where needed',
    severity: 'info',
    isCritical: false,
    validatorName: 'ModalityValidator'
  },
  {
    id: 'I5',
    category: 'Modality',
    name: 'Actionable language',
    description: 'Use actionable modal verbs in how-to and instructional content',
    severity: 'info',
    isCritical: false,
    validatorName: 'ModalityValidator'
  },

  // ============================================
  // Category J: YMYL (6 rules: J1-J6)
  // ============================================
  {
    id: 'J1',
    category: 'YMYL',
    name: 'YMYL detection',
    description: 'Detect if content falls under Your Money or Your Life categories',
    severity: 'info',
    isCritical: false,
    validatorName: 'YMYLValidator'
  },
  {
    id: 'J2',
    category: 'YMYL',
    name: 'YMYL disclaimer required',
    description: 'YMYL content must include appropriate disclaimers and professional advice notices',
    severity: 'error',
    isCritical: true,
    validatorName: 'YMYLValidator'
  },
  {
    id: 'J3',
    category: 'YMYL',
    name: 'Source citations',
    description: 'YMYL content should cite authoritative sources for claims',
    severity: 'warning',
    isCritical: false,
    validatorName: 'YMYLValidator'
  },
  {
    id: 'J4',
    category: 'YMYL',
    name: 'Expert attribution',
    description: 'YMYL content should attribute information to qualified experts',
    severity: 'warning',
    isCritical: false,
    validatorName: 'YMYLValidator'
  },
  {
    id: 'J5',
    category: 'YMYL',
    name: 'Last updated date',
    description: 'YMYL content should indicate when it was last reviewed/updated',
    severity: 'info',
    isCritical: false,
    validatorName: 'YMYLValidator'
  },
  {
    id: 'J6',
    category: 'YMYL',
    name: 'Risk language',
    description: 'YMYL content should include appropriate risk warnings where applicable',
    severity: 'warning',
    isCritical: false,
    validatorName: 'YMYLValidator'
  },

  // ============================================
  // Category K: Lists (8 rules: K1-K8)
  // ============================================
  {
    id: 'K1',
    category: 'Lists',
    name: 'List introduction',
    description: 'Lists should be preceded by an introductory sentence or phrase',
    severity: 'warning',
    isCritical: false,
    validatorName: 'ListValidator'
  },
  {
    id: 'K2',
    category: 'Lists',
    name: 'List item consistency',
    description: 'List items should have consistent grammatical structure',
    severity: 'warning',
    isCritical: false,
    validatorName: 'ListValidator'
  },
  {
    id: 'K3',
    category: 'Lists',
    name: 'Minimum list items',
    description: 'Lists should have at least 3 items to justify list format',
    severity: 'info',
    isCritical: false,
    threshold: { minItems: 3 },
    validatorName: 'ListValidator'
  },
  {
    id: 'K4',
    category: 'Lists',
    name: 'Maximum list items',
    description: 'Lists should not exceed 10 items without sub-categorization',
    severity: 'info',
    isCritical: false,
    threshold: { maxItems: 10 },
    validatorName: 'ListValidator'
  },
  {
    id: 'K5',
    category: 'Lists',
    name: 'Ordered vs unordered',
    description: 'Use ordered lists for sequential items, unordered for non-sequential',
    severity: 'info',
    isCritical: false,
    validatorName: 'ListValidator'
  },
  {
    id: 'K6',
    category: 'Lists',
    name: 'Featured snippet optimization',
    description: 'Structure lists to be eligible for featured snippet extraction',
    severity: 'info',
    isCritical: false,
    validatorName: 'ListValidator'
  },
  {
    id: 'K7',
    category: 'Lists',
    name: 'List punctuation',
    description: 'List items should have consistent punctuation style',
    severity: 'info',
    isCritical: false,
    validatorName: 'ListValidator'
  },
  {
    id: 'K8',
    category: 'Lists',
    name: 'Nested list depth',
    description: 'Nested lists should not exceed 2 levels of depth',
    severity: 'warning',
    isCritical: false,
    threshold: { maxDepth: 2 },
    validatorName: 'ListValidator'
  },

  // ============================================
  // Category L: Tables (7 rules: L1-L7)
  // ============================================
  {
    id: 'L1',
    category: 'Tables',
    name: 'Table header row',
    description: 'Tables must have a clearly defined header row',
    severity: 'error',
    isCritical: false,
    validatorName: 'TableValidator'
  },
  {
    id: 'L2',
    category: 'Tables',
    name: 'Table caption',
    description: 'Tables should have a descriptive caption or preceding explanation',
    severity: 'warning',
    isCritical: false,
    validatorName: 'TableValidator'
  },
  {
    id: 'L3',
    category: 'Tables',
    name: 'Minimum table data',
    description: 'Tables should have at least 2 columns and 2 data rows',
    severity: 'info',
    isCritical: false,
    threshold: { minColumns: 2, minRows: 2 },
    validatorName: 'TableValidator'
  },
  {
    id: 'L4',
    category: 'Tables',
    name: 'Table data consistency',
    description: 'Table cells in a column should contain consistent data types',
    severity: 'warning',
    isCritical: false,
    validatorName: 'TableValidator'
  },
  {
    id: 'L5',
    category: 'Tables',
    name: 'No empty cells',
    description: 'Table cells should not be empty; use N/A or - where appropriate',
    severity: 'info',
    isCritical: false,
    validatorName: 'TableValidator'
  },
  {
    id: 'L6',
    category: 'Tables',
    name: 'Table accessibility',
    description: 'Tables should be structured for screen reader accessibility',
    severity: 'warning',
    isCritical: false,
    validatorName: 'TableValidator'
  },
  {
    id: 'L7',
    category: 'Tables',
    name: 'Comparison table structure',
    description: 'Comparison tables should clearly identify the items being compared',
    severity: 'info',
    isCritical: false,
    validatorName: 'TableValidator'
  },

  // ============================================
  // Category M: Images (7 rules: M1-M7)
  // ============================================
  {
    id: 'M1',
    category: 'Images',
    name: 'No heading-para gap for images',
    description: 'Images must not be placed immediately after a heading without introductory text',
    severity: 'error',
    isCritical: true,
    validatorName: 'ImageValidator'
  },
  {
    id: 'M2',
    category: 'Images',
    name: 'Alt text required',
    description: 'All images must have descriptive alt text for accessibility',
    severity: 'error',
    isCritical: false,
    validatorName: 'ImageValidator'
  },
  {
    id: 'M3',
    category: 'Images',
    name: 'Alt text vocabulary extension',
    description: 'Alt text should extend vocabulary with semantically relevant terms',
    severity: 'info',
    isCritical: false,
    validatorName: 'ImageValidator'
  },
  {
    id: 'M4',
    category: 'Images',
    name: 'Image relevance',
    description: 'Images must be relevant to the surrounding content context',
    severity: 'warning',
    isCritical: false,
    validatorName: 'ImageValidator'
  },
  {
    id: 'M5',
    category: 'Images',
    name: 'Image distribution',
    description: 'Images should be distributed throughout content, not clustered',
    severity: 'info',
    isCritical: false,
    validatorName: 'ImageValidator'
  },
  {
    id: 'M6',
    category: 'Images',
    name: 'Caption text',
    description: 'Complex images should include caption text for additional context',
    severity: 'info',
    isCritical: false,
    validatorName: 'ImageValidator'
  },
  {
    id: 'M7',
    category: 'Images',
    name: 'Image-text ratio',
    description: 'Content should maintain an appropriate image-to-text ratio',
    severity: 'info',
    isCritical: false,
    validatorName: 'ImageValidator'
  },

  // ============================================
  // Category N: Contextual Flow (6 rules: N1-N6)
  // ============================================
  {
    id: 'N1',
    category: 'Contextual Flow',
    name: 'Section transitions',
    description: 'Sections should have smooth transitions connecting ideas',
    severity: 'warning',
    isCritical: false,
    validatorName: 'ContextualFlowValidator'
  },
  {
    id: 'N2',
    category: 'Contextual Flow',
    name: 'Logical progression',
    description: 'Content should follow a logical progression from concept to concept',
    severity: 'warning',
    isCritical: false,
    validatorName: 'ContextualFlowValidator'
  },
  {
    id: 'N3',
    category: 'Contextual Flow',
    name: 'Contextual bridge alignment',
    description: 'Content should align with the contextual bridge from the brief',
    severity: 'warning',
    isCritical: false,
    validatorName: 'ContextualFlowValidator'
  },
  {
    id: 'N4',
    category: 'Contextual Flow',
    name: 'No abrupt topic changes',
    description: 'Content should not abruptly change topics without transition',
    severity: 'warning',
    isCritical: false,
    validatorName: 'ContextualFlowValidator'
  },
  {
    id: 'N5',
    category: 'Contextual Flow',
    name: 'Conclusion synthesis',
    description: 'Conclusion should synthesize key points from all sections',
    severity: 'info',
    isCritical: false,
    validatorName: 'ContextualFlowValidator'
  },
  {
    id: 'N6',
    category: 'Contextual Flow',
    name: 'Call-to-action alignment',
    description: 'Any call-to-action should align with the content purpose and flow',
    severity: 'info',
    isCritical: false,
    validatorName: 'ContextualFlowValidator'
  },

  // ============================================
  // Category O: Format Codes (6 rules: O1-O6)
  // ============================================
  {
    id: 'O1',
    category: 'Format Codes',
    name: 'Format code parsing',
    description: 'Content brief format codes must be correctly parsed and applied',
    severity: 'error',
    isCritical: false,
    validatorName: 'FormatCodeValidator'
  },
  {
    id: 'O2',
    category: 'Format Codes',
    name: 'Format code compliance',
    description: 'Generated content must comply with all specified format codes',
    severity: 'warning',
    isCritical: false,
    validatorName: 'FormatCodeValidator'
  },
  {
    id: 'O3',
    category: 'Format Codes',
    name: 'Budget allocation',
    description: 'Format budget allocation should be respected for lists/tables/images',
    severity: 'info',
    isCritical: false,
    validatorName: 'FormatCodeValidator'
  },
  {
    id: 'O4',
    category: 'Format Codes',
    name: 'Format type matching',
    description: 'Format types should match content requirements (comparison=table, steps=list)',
    severity: 'info',
    isCritical: false,
    validatorName: 'FormatCodeValidator'
  },
  {
    id: 'O5',
    category: 'Format Codes',
    name: 'Format position accuracy',
    description: 'Format elements should appear at specified positions in content',
    severity: 'warning',
    isCritical: false,
    validatorName: 'FormatCodeValidator'
  },
  {
    id: 'O6',
    category: 'Format Codes',
    name: 'Format element quality',
    description: 'Format elements must be well-formed and serve their purpose',
    severity: 'warning',
    isCritical: false,
    validatorName: 'FormatCodeValidator'
  },

  // ============================================
  // Category P: Schema (10 rules: P1-P10)
  // ============================================
  {
    id: 'P1',
    category: 'Schema',
    name: 'Schema type detection',
    description: 'Correct schema type must be detected based on content analysis',
    severity: 'error',
    isCritical: false,
    validatorName: 'SchemaValidator'
  },
  {
    id: 'P2',
    category: 'Schema',
    name: 'Required properties',
    description: 'All required schema properties must be present',
    severity: 'error',
    isCritical: false,
    validatorName: 'SchemaValidator'
  },
  {
    id: 'P3',
    category: 'Schema',
    name: 'Entity resolution',
    description: 'Named entities should be resolved to Wikidata IDs where applicable',
    severity: 'warning',
    isCritical: false,
    validatorName: 'SchemaValidator'
  },
  {
    id: 'P4',
    category: 'Schema',
    name: 'Schema validation',
    description: 'Generated schema must pass JSON-LD validation',
    severity: 'error',
    isCritical: false,
    validatorName: 'SchemaValidator'
  },
  {
    id: 'P5',
    category: 'Schema',
    name: 'Recommended properties',
    description: 'Recommended schema properties should be included when data is available',
    severity: 'info',
    isCritical: false,
    validatorName: 'SchemaValidator'
  },
  {
    id: 'P6',
    category: 'Schema',
    name: 'FAQ schema extraction',
    description: 'FAQ content should be extracted into FAQPage schema',
    severity: 'info',
    isCritical: false,
    validatorName: 'SchemaValidator'
  },
  {
    id: 'P7',
    category: 'Schema',
    name: 'HowTo schema extraction',
    description: 'Step-by-step content should be extracted into HowTo schema',
    severity: 'info',
    isCritical: false,
    validatorName: 'SchemaValidator'
  },
  {
    id: 'P8',
    category: 'Schema',
    name: 'Author schema',
    description: 'Article schema should include author information when available',
    severity: 'info',
    isCritical: false,
    validatorName: 'SchemaValidator'
  },
  {
    id: 'P9',
    category: 'Schema',
    name: 'Organization schema',
    description: 'Publisher/organization schema should be linked correctly',
    severity: 'info',
    isCritical: false,
    validatorName: 'SchemaValidator'
  },
  {
    id: 'P10',
    category: 'Schema',
    name: 'Schema auto-fix',
    description: 'Invalid schema should be auto-fixed where possible',
    severity: 'info',
    isCritical: false,
    validatorName: 'SchemaValidator'
  },

  // ============================================
  // Category Q: Audit (6 rules: Q1-Q6)
  // ============================================
  {
    id: 'Q1',
    category: 'Audit',
    name: 'Pass completion',
    description: 'All content generation passes must complete successfully',
    severity: 'error',
    isCritical: false,
    validatorName: 'AuditValidator'
  },
  {
    id: 'Q2',
    category: 'Audit',
    name: 'Audit score minimum',
    description: 'Content must meet the minimum audit score threshold',
    severity: 'warning',
    isCritical: false,
    threshold: { minScore: 70 },
    validatorName: 'AuditValidator'
  },
  {
    id: 'Q3',
    category: 'Audit',
    name: 'No critical failures',
    description: 'Content must not have any critical audit check failures',
    severity: 'error',
    isCritical: false,
    validatorName: 'AuditValidator'
  },
  {
    id: 'Q4',
    category: 'Audit',
    name: 'Critical threshold 50%',
    description: 'At least 50% of critical rules must pass for content acceptance',
    severity: 'error',
    isCritical: true,
    threshold: { minPercentage: 50 },
    validatorName: 'AuditValidator'
  },
  {
    id: 'Q5',
    category: 'Audit',
    name: 'Improvement tracking',
    description: 'Audit scores should improve or maintain across content revisions',
    severity: 'info',
    isCritical: false,
    validatorName: 'AuditValidator'
  },
  {
    id: 'Q6',
    category: 'Audit',
    name: 'Audit report generation',
    description: 'Detailed audit reports must be generated for each content piece',
    severity: 'info',
    isCritical: false,
    validatorName: 'AuditValidator'
  },

  // ============================================
  // Category S: Systemic (5 rules: S1-S5)
  // ============================================
  {
    id: 'S1',
    category: 'Systemic',
    name: 'Output language',
    description: 'Content must be output in the language specified by the user or brief',
    severity: 'error',
    isCritical: true,
    validatorName: 'LanguageOutputValidator'
  },
  {
    id: 'S2',
    category: 'Systemic',
    name: 'Encoding consistency',
    description: 'Content must use consistent character encoding (UTF-8)',
    severity: 'error',
    isCritical: false,
    validatorName: 'EncodingValidator'
  },
  {
    id: 'S3',
    category: 'Systemic',
    name: 'Pillar alignment',
    description: 'Content must align with the SEO pillar strategy from the topical map',
    severity: 'warning',
    isCritical: true,
    validatorName: 'PillarAlignmentValidator'
  },
  {
    id: 'S4',
    category: 'Systemic',
    name: 'Content uniqueness',
    description: 'Generated content must be unique and not duplicate existing content',
    severity: 'error',
    isCritical: false,
    validatorName: 'UniquenessValidator'
  },
  {
    id: 'S5',
    category: 'Systemic',
    name: 'Brief adherence',
    description: 'Content must adhere to the specifications in the content brief',
    severity: 'warning',
    isCritical: false,
    validatorName: 'BriefAdherenceValidator'
  },

  // ============================================
  // Category D (extended): Sentence Structure (D9-D13)
  // ============================================
  {
    id: 'D9',
    category: 'Sentence Structure',
    name: 'Active voice enforcement',
    description: 'Content should use active voice in 70%+ of sentences for clarity and directness',
    severity: 'warning',
    isCritical: false,
    threshold: { minActivePercentage: 70 },
    validatorName: 'ActiveVoiceValidator'
  },
  {
    id: 'D10',
    category: 'Sentence Structure',
    name: 'Definitional sentence length',
    description: 'Definitional sentences (containing "is", "are", "refers to") should be 15-20 words',
    severity: 'info',
    isCritical: false,
    threshold: { minWords: 15, maxWords: 20 },
    validatorName: 'SentenceLengthValidator'
  },
  {
    id: 'D11',
    category: 'Sentence Structure',
    name: 'Explanatory sentence length',
    description: 'Explanatory sentences (containing "because", "since") should be 20-30 words',
    severity: 'info',
    isCritical: false,
    threshold: { minWords: 20, maxWords: 30 },
    validatorName: 'SentenceLengthValidator'
  },
  {
    id: 'D12',
    category: 'Sentence Structure',
    name: 'Instructional sentence length',
    description: 'Instructional sentences (imperatives, steps) should be 10-15 words',
    severity: 'info',
    isCritical: false,
    threshold: { minWords: 10, maxWords: 15 },
    validatorName: 'SentenceLengthValidator'
  },
  {
    id: 'D13',
    category: 'Sentence Structure',
    name: 'Future tense for facts',
    description: 'Established facts should use present tense, not future tense ("will")',
    severity: 'warning',
    isCritical: false,
    validatorName: 'FutureTenseValidator'
  },

  // ============================================
  // Category H (extended): Vocabulary (H10-H13)
  // ============================================
  {
    id: 'H10',
    category: 'Vocabulary',
    name: 'Stop word ratio',
    description: 'Stop words should comprise less than 30% of total content words',
    severity: 'warning',
    isCritical: false,
    threshold: { maxRatio: 30 },
    validatorName: 'StopWordValidator'
  },
  {
    id: 'H11',
    category: 'Vocabulary',
    name: 'Information density score',
    description: 'Content should maintain a minimum information density (facts per 100 words)',
    severity: 'warning',
    isCritical: false,
    validatorName: 'StopWordValidator'
  },
  {
    id: 'H12',
    category: 'Vocabulary',
    name: 'Expression identity detection',
    description: 'Content must not contain LLM signature phrases ("It\'s important to note", "delve into", "In the realm of")',
    severity: 'error',
    isCritical: true,
    validatorName: 'ProhibitedLanguageValidator'
  },
  {
    id: 'H13',
    category: 'Vocabulary',
    name: 'Weak connector ban',
    description: 'Avoid "also" as a weak connector; use specific semantic bridges instead',
    severity: 'warning',
    isCritical: false,
    validatorName: 'ProhibitedLanguageValidator'
  },

  // ============================================
  // Category J (extended): YMYL (J7-J9)
  // ============================================
  {
    id: 'J7',
    category: 'YMYL',
    name: 'YMYL conditions step',
    description: 'YMYL Safe Answer Protocol: conditions/exceptions must follow the direct answer',
    severity: 'warning',
    isCritical: false,
    validatorName: 'YMYLValidator'
  },
  {
    id: 'J8',
    category: 'YMYL',
    name: 'YMYL perspectives step',
    description: 'YMYL Safe Answer Protocol: multiple perspectives must be presented after conditions',
    severity: 'warning',
    isCritical: false,
    validatorName: 'YMYLValidator'
  },
  {
    id: 'J9',
    category: 'YMYL',
    name: 'YMYL citation ordering',
    description: 'YMYL Safe Answer Protocol: citations must appear after perspectives',
    severity: 'warning',
    isCritical: false,
    validatorName: 'YMYLValidator'
  },

  // ============================================
  // Category B (extended): Introduction (B8)
  // ============================================
  {
    id: 'B8',
    category: 'Introduction',
    name: 'Negative constraints',
    description: 'Definitions should include "what X is NOT" statements for disambiguation',
    severity: 'info',
    isCritical: false,
    validatorName: 'NegativeConstraintValidator'
  },

  // ============================================
  // Category R: Internal Linking (3 rules: R1-R3)
  // ============================================
  {
    id: 'R1',
    category: 'Internal Linking',
    name: 'Link semantic alignment',
    description: 'Internal links must be semantically aligned with surrounding content context',
    severity: 'warning',
    isCritical: false,
    validatorName: 'LinkSemanticValidator'
  },
  {
    id: 'R2',
    category: 'Internal Linking',
    name: 'Link after definition',
    description: 'Internal links must be placed after the linked entity/concept is defined',
    severity: 'warning',
    isCritical: false,
    validatorName: 'LinkInsertionValidator'
  },
  {
    id: 'R3',
    category: 'Internal Linking',
    name: 'Link density',
    description: 'Internal link density should be 1 link per 100-200 words in main content',
    severity: 'info',
    isCritical: false,
    validatorName: 'LinkInsertionValidator'
  },

  // ============================================
  // Category T: Query Intelligence (2 rules: T1-T2)
  // ============================================
  {
    id: 'T1',
    category: 'Query Intelligence',
    name: 'Query probability ordering',
    description: 'Sections should be ordered by search volume/probability from the brief',
    severity: 'info',
    isCritical: false,
    validatorName: 'QueryOrderingValidator'
  },
  {
    id: 'T2',
    category: 'Query Intelligence',
    name: 'Query category ordering',
    description: 'Informational queries before commercial queries in the content structure',
    severity: 'info',
    isCritical: false,
    validatorName: 'QueryOrderingValidator'
  }
];

/**
 * RuleRegistry - Central registry for quality enforcement rules
 *
 * Provides static methods for querying and filtering the complete set of
 * quality rules used in the Holistic SEO content generation system.
 */
export class RuleRegistry {
  private static readonly rules: QualityRule[] = QUALITY_RULES;

  /**
   * Get all quality rules
   */
  static getAllRules(): QualityRule[] {
    return [...this.rules];
  }

  /**
   * Get a specific rule by ID
   * @param id - Rule ID (e.g., 'A1', 'B2', 'H3')
   */
  static getRule(id: string): QualityRule | undefined {
    return this.rules.find(rule => rule.id === id);
  }

  /**
   * Get all rules in a specific category
   * @param category - The rule category to filter by
   */
  static getRulesByCategory(category: RuleCategory): QualityRule[] {
    return this.rules.filter(rule => rule.category === category);
  }

  /**
   * Get all critical rules (those that block content acceptance if violated)
   */
  static getCriticalRules(): QualityRule[] {
    return this.rules.filter(rule => rule.isCritical);
  }

  /**
   * Get all rules with a specific severity level
   * @param severity - The severity level to filter by
   */
  static getRulesBySeverity(severity: RuleSeverity): QualityRule[] {
    return this.rules.filter(rule => rule.severity === severity);
  }

  /**
   * Get all unique categories
   */
  static getCategories(): RuleCategory[] {
    const categories = new Set<RuleCategory>();
    this.rules.forEach(rule => categories.add(rule.category));
    return Array.from(categories);
  }

  /**
   * Get total count of all rules
   */
  static getRuleCount(): number {
    return this.rules.length;
  }
}
