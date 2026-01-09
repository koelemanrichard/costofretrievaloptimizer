# Quality Enforcement System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a comprehensive quality enforcement system with 17 new validators, conflict detection, and a quality dashboard ensuring all 113+ content rules are actively enforced.

**Architecture:** Three-phase implementation: (1) Add new validators following existing patterns in `rulesEngine/validators/`, (2) Build tracking infrastructure with snapshots and conflict detection in new `tracking/` module, (3) Create React components for the quality dashboard in `components/quality/`.

**Tech Stack:** TypeScript, React, Supabase (PostgreSQL), existing validator pattern with `ValidationViolation` interface.

---

## Phase 1: Foundation & Critical Validators

### Task 1: Create Rule Registry

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/ruleRegistry.ts`
- Test: `services/ai/contentGeneration/rulesEngine/__tests__/ruleRegistry.test.ts`

**Step 1: Write the failing test**

```typescript
// services/ai/contentGeneration/rulesEngine/__tests__/ruleRegistry.test.ts
import { RuleRegistry, QualityRule } from '../ruleRegistry';

describe('RuleRegistry', () => {
  it('should return all rules', () => {
    const rules = RuleRegistry.getAllRules();
    expect(rules.length).toBeGreaterThanOrEqual(113);
  });

  it('should get rule by ID', () => {
    const rule = RuleRegistry.getRule('A1');
    expect(rule).toBeDefined();
    expect(rule?.id).toBe('A1');
    expect(rule?.category).toBe('Central Entity');
  });

  it('should get rules by category', () => {
    const rules = RuleRegistry.getRulesByCategory('Central Entity');
    expect(rules.length).toBe(7);
    expect(rules.every(r => r.category === 'Central Entity')).toBe(true);
  });

  it('should get critical rules', () => {
    const rules = RuleRegistry.getCriticalRules();
    expect(rules.every(r => r.isCritical)).toBe(true);
    expect(rules.some(r => r.id === 'A1')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=ruleRegistry.test.ts`
Expected: FAIL with "Cannot find module '../ruleRegistry'"

**Step 3: Write the implementation**

```typescript
// services/ai/contentGeneration/rulesEngine/ruleRegistry.ts

export type RuleSeverity = 'error' | 'warning' | 'info';
export type RuleCategory =
  | 'Central Entity' | 'Introduction' | 'EAV Integration' | 'Sentence Structure'
  | 'Headings' | 'Paragraphs' | 'Word Count' | 'Vocabulary' | 'Modality'
  | 'YMYL' | 'Lists' | 'Tables' | 'Images' | 'Contextual Flow' | 'Format Codes'
  | 'Schema' | 'Audit' | 'Systemic';

export interface QualityRule {
  id: string;
  category: RuleCategory;
  name: string;
  description: string;
  severity: RuleSeverity;
  isCritical: boolean;
  validatorName?: string;
  threshold?: Record<string, number>;
  upgradeDate?: string;  // ISO date when WARNING becomes ERROR
}

const RULES: QualityRule[] = [
  // Category A: Central Entity
  { id: 'A1', category: 'Central Entity', name: 'Entity in title', description: 'Central entity must appear in article title', severity: 'error', isCritical: true, validatorName: 'CentralEntityFocusValidator' },
  { id: 'A2', category: 'Central Entity', name: 'Entity in H1', description: 'Central entity must appear in H1 heading', severity: 'error', isCritical: true, validatorName: 'HeadingEntityAlignment' },
  { id: 'A3', category: 'Central Entity', name: 'Entity in H2s', description: 'Central entity should appear in 80%+ of H2 headings', severity: 'warning', isCritical: false, validatorName: 'HeadingEntityAlignment', threshold: { minPercentage: 80 } },
  { id: 'A4', category: 'Central Entity', name: 'Entity in first paragraph', description: 'Central entity must appear in first paragraph', severity: 'error', isCritical: true, validatorName: 'CenterpieceValidator' },
  { id: 'A5', category: 'Central Entity', name: 'Entity density 30%+', description: 'Central entity mention density of 30%+ in body text', severity: 'warning', isCritical: false, validatorName: 'CentralEntityFocusValidator', threshold: { minDensity: 30 } },
  { id: 'A6', category: 'Central Entity', name: 'Entity per paragraph', description: 'Each paragraph should reference central entity or related attribute', severity: 'info', isCritical: false },
  { id: 'A7', category: 'Central Entity', name: 'No entity drift', description: 'Avoid introducing unrelated entities', severity: 'info', isCritical: false },

  // Category B: Introduction
  { id: 'B1', category: 'Introduction', name: 'Centerpiece in 100 words', description: 'Centerpiece must appear in first 100 words', severity: 'error', isCritical: true, validatorName: 'CenterpieceValidator' },
  { id: 'B2', category: 'Introduction', name: 'No fluff', description: 'No fluff or filler in introduction', severity: 'error', isCritical: false, validatorName: 'ProhibitedLanguageValidator' },
  { id: 'B3', category: 'Introduction', name: 'No meta-commentary', description: 'No meta-commentary like "In this article..."', severity: 'error', isCritical: false, validatorName: 'ProhibitedLanguageValidator' },
  { id: 'B4', category: 'Introduction', name: 'Intent alignment', description: 'Introduction must align with user search intent', severity: 'info', isCritical: false },
  { id: 'B5', category: 'Introduction', name: 'Intro min 150 words', description: 'Introduction minimum 150 words', severity: 'warning', isCritical: false, validatorName: 'WordCountValidator', threshold: { min: 150 } },
  { id: 'B6', category: 'Introduction', name: 'Intro EAVs', description: 'Introduction should contain 1-2 UNIQUE/ROOT EAVs', severity: 'warning', isCritical: false, validatorName: 'EavPlacementValidator' },
  { id: 'B7', category: 'Introduction', name: 'No intro questions', description: 'No questions in introduction unless rhetorical', severity: 'info', isCritical: false },

  // Category C: EAV Integration
  { id: 'C1', category: 'EAV Integration', name: 'EAVs present', description: 'EAVs must be present in content', severity: 'warning', isCritical: false, validatorName: 'EAVDensityValidator' },
  { id: 'C2', category: 'EAV Integration', name: 'UNIQUE in 300 words', description: 'UNIQUE category EAVs in first 300 words', severity: 'warning', isCritical: true, validatorName: 'EavPlacementValidator', threshold: { maxPosition: 300 } },
  { id: 'C3', category: 'EAV Integration', name: 'ROOT in 500 words', description: 'ROOT category EAVs in first 500 words', severity: 'warning', isCritical: false, validatorName: 'EavPlacementValidator', threshold: { maxPosition: 500 } },
  { id: 'C4', category: 'EAV Integration', name: 'RARE in core', description: 'RARE category EAVs distributed in core sections', severity: 'info', isCritical: false },
  { id: 'C5', category: 'EAV Integration', name: 'COMMON anywhere', description: 'COMMON category EAVs can appear anywhere', severity: 'info', isCritical: false },
  { id: 'C6', category: 'EAV Integration', name: 'EAV density', description: 'EAV density target: 1 EAV per 100-150 words', severity: 'warning', isCritical: false, validatorName: 'EAVDensityValidator' },
  { id: 'C7', category: 'EAV Integration', name: 'Natural EAVs', description: 'EAVs must be naturally integrated', severity: 'info', isCritical: false },
  { id: 'C8', category: 'EAV Integration', name: 'EAV vocabulary', description: 'EAV attributes should extend vocabulary', severity: 'info', isCritical: false },

  // Category D: Sentence Structure
  { id: 'D1', category: 'Sentence Structure', name: 'S-P-O structure', description: 'Subject-Predicate-Object sentence structure', severity: 'warning', isCritical: false, validatorName: 'StructureValidator' },
  { id: 'D2', category: 'Sentence Structure', name: 'Subject in first 40%', description: 'Subject in first 40% of sentence', severity: 'warning', isCritical: false, validatorName: 'SubjectPositioning' },
  { id: 'D3', category: 'Sentence Structure', name: 'Entity as subject', description: 'Entity as subject in majority of sentences', severity: 'warning', isCritical: false },
  { id: 'D4', category: 'Sentence Structure', name: 'Passive under 15%', description: 'Passive voice under 15% of sentences', severity: 'warning', isCritical: false, validatorName: 'PassiveVoice' },
  { id: 'D5', category: 'Sentence Structure', name: 'Discourse chaining', description: 'Discourse chaining (S1 object → S2 subject)', severity: 'warning', isCritical: false, validatorName: 'DiscourseChainingValidator' },
  { id: 'D6', category: 'Sentence Structure', name: 'No orphan pronouns', description: 'No orphan pronouns without clear antecedent', severity: 'info', isCritical: false },
  { id: 'D7', category: 'Sentence Structure', name: 'Sentence variety', description: 'Sentence length variety', severity: 'info', isCritical: false },
  { id: 'D8', category: 'Sentence Structure', name: 'No run-ons', description: 'No run-on sentences over 40 words', severity: 'info', isCritical: false },

  // Category E: Headings
  { id: 'E1', category: 'Headings', name: 'Single H1', description: 'Single H1 per article', severity: 'error', isCritical: true, validatorName: 'HierarchyValidator' },
  { id: 'E2', category: 'Headings', name: 'No level skip', description: 'No heading level skipping', severity: 'error', isCritical: true, validatorName: 'HierarchyValidator' },
  { id: 'E3', category: 'Headings', name: 'H2 entity alignment', description: 'H2 headings must contain central entity or attribute', severity: 'warning', isCritical: false, validatorName: 'HeadingContentValidator', threshold: { minJaccard: 0.25 } },
  { id: 'E4', category: 'Headings', name: 'No generic headings', description: 'No generic headings like "Introduction"', severity: 'warning', isCritical: false, validatorName: 'GenericHeadings' },
  { id: 'E5', category: 'Headings', name: 'Question/claim headings', description: 'Headings should be questions or specific claims', severity: 'info', isCritical: false },
  { id: 'E6', category: 'Headings', name: 'H2-H3 count', description: 'H2-H3 count: minimum 3, maximum 12', severity: 'warning', isCritical: false },
  { id: 'E7', category: 'Headings', name: 'Heading word count', description: 'Heading word count: 3-10 words optimal', severity: 'info', isCritical: false },
  { id: 'E8', category: 'Headings', name: 'No duplicate headings', description: 'No duplicate headings in article', severity: 'warning', isCritical: false },
  { id: 'E9', category: 'Headings', name: 'Contextual vectors', description: 'Contextual vectors define heading flow logic', severity: 'warning', isCritical: false, validatorName: 'ContextualVectorValidator' },

  // Category F: Paragraphs
  { id: 'F1', category: 'Paragraphs', name: 'Heading relevance', description: 'First paragraph after heading must relate to heading', severity: 'warning', isCritical: false, validatorName: 'HeadingContentValidator' },
  { id: 'F2', category: 'Paragraphs', name: 'Paragraphs per section', description: 'Each section: 2-5 paragraphs', severity: 'warning', isCritical: false },
  { id: 'F3', category: 'Paragraphs', name: 'Paragraph length', description: 'Paragraph length: 3-6 sentences optimal', severity: 'info', isCritical: false },
  { id: 'F4', category: 'Paragraphs', name: 'Topic sentence', description: 'Topic sentence at paragraph start', severity: 'info', isCritical: false },
  { id: 'F5', category: 'Paragraphs', name: 'One idea per para', description: 'One main idea per paragraph', severity: 'info', isCritical: false },
  { id: 'F6', category: 'Paragraphs', name: 'Smooth transitions', description: 'Smooth transitions between paragraphs', severity: 'warning', isCritical: false },

  // Category G: Word Count
  { id: 'G1', category: 'Word Count', name: 'Article word count', description: 'Article total word count matches brief target ±10%', severity: 'warning', isCritical: true, validatorName: 'WordCountValidator' },
  { id: 'G2', category: 'Word Count', name: 'Intro 150-250 words', description: 'Introduction: 150-250 words', severity: 'warning', isCritical: false, validatorName: 'WordCountValidator', threshold: { min: 150, max: 250 } },
  { id: 'G3', category: 'Word Count', name: 'Core 200-400 words', description: 'Core sections: 200-400 words each', severity: 'warning', isCritical: false, validatorName: 'WordCountValidator', threshold: { min: 200, max: 400 } },
  { id: 'G4', category: 'Word Count', name: 'Conclusion 100-200', description: 'Conclusion: 100-200 words', severity: 'warning', isCritical: false, validatorName: 'WordCountValidator', threshold: { min: 100, max: 200 } },
  { id: 'G5', category: 'Word Count', name: 'Proportional sections', description: 'Section word counts proportional to importance', severity: 'info', isCritical: false },

  // Category H: Vocabulary
  { id: 'H1', category: 'Vocabulary', name: 'TTR 0.4-0.7', description: 'Type-Token Ratio 0.4-0.7', severity: 'warning', isCritical: false, validatorName: 'VocabularyRichness' },
  { id: 'H2', category: 'Vocabulary', name: 'Stop words 40-55%', description: 'Stop word ratio 40-55%', severity: 'warning', isCritical: false, validatorName: 'StopWordRatio' },
  { id: 'H3', category: 'Vocabulary', name: 'No LLM signatures', description: 'No LLM signature phrases', severity: 'error', isCritical: true, validatorName: 'ProhibitedLanguageValidator' },
  { id: 'H4', category: 'Vocabulary', name: 'No filler words', description: 'No filler words like "very", "really"', severity: 'warning', isCritical: false, validatorName: 'ProhibitedLanguageValidator' },
  { id: 'H5', category: 'Vocabulary', name: 'No hedging', description: 'No hedging phrases', severity: 'warning', isCritical: false },
  { id: 'H6', category: 'Vocabulary', name: 'Define terms', description: 'Technical terms defined on first use', severity: 'info', isCritical: false },
  { id: 'H7', category: 'Vocabulary', name: 'Consistent terms', description: 'Consistent terminology throughout', severity: 'warning', isCritical: false },
  { id: 'H8', category: 'Vocabulary', name: 'No section repetition', description: 'No repetitive phrases within section', severity: 'warning', isCritical: false, validatorName: 'RepetitionValidator' },
  { id: 'H9', category: 'Vocabulary', name: 'No cross-section rep', description: 'No repetitive phrases across sections', severity: 'warning', isCritical: false, validatorName: 'CrossSectionRepetitionValidator' },

  // Category I: Modality
  { id: 'I1', category: 'Modality', name: 'Certainty 60-85%', description: 'Certainty ratio 60-85%', severity: 'warning', isCritical: false, validatorName: 'ModalityValidator' },
  { id: 'I2', category: 'Modality', name: 'Is/are for facts', description: 'Use is/are/will for established facts', severity: 'warning', isCritical: false },
  { id: 'I3', category: 'Modality', name: 'May/might uncertain', description: 'Use may/might/could for uncertain claims', severity: 'warning', isCritical: false },
  { id: 'I4', category: 'Modality', name: 'Evidence matching', description: 'Match modality to evidence strength', severity: 'info', isCritical: false },
  { id: 'I5', category: 'Modality', name: 'YMYL hedging', description: 'YMYL topics require hedged language', severity: 'warning', isCritical: false, validatorName: 'YMYLValidator' },

  // Category J: YMYL
  { id: 'J1', category: 'YMYL', name: 'YMYL detection', description: 'YMYL detection from topic/brief', severity: 'info', isCritical: false },
  { id: 'J2', category: 'YMYL', name: 'Disclaimer required', description: 'Disclaimer required for YMYL content', severity: 'error', isCritical: true, validatorName: 'YMYLValidator' },
  { id: 'J3', category: 'YMYL', name: 'Consultation rec', description: 'Professional consultation recommendation', severity: 'warning', isCritical: false },
  { id: 'J4', category: 'YMYL', name: 'Source citations', description: 'Source citations for claims', severity: 'warning', isCritical: false },
  { id: 'J5', category: 'YMYL', name: 'Author qualifications', description: 'Author qualifications statement', severity: 'info', isCritical: false },
  { id: 'J6', category: 'YMYL', name: 'Date sensitivity', description: 'Date sensitivity acknowledgment', severity: 'info', isCritical: false },

  // Category K: Lists
  { id: 'K1', category: 'Lists', name: 'Prose ratio 60-80%', description: 'Prose-to-structured ratio 60-80% prose', severity: 'warning', isCritical: false, validatorName: 'ProseStructuredBalance' },
  { id: 'K2', category: 'Lists', name: 'Definition before list', description: 'Definition sentence before every list', severity: 'warning', isCritical: false, validatorName: 'ListDefinitionSentence' },
  { id: 'K3', category: 'Lists', name: 'No section start list', description: 'Never open section with list', severity: 'warning', isCritical: false },
  { id: 'K4', category: 'Lists', name: 'List items 3-7', description: 'List items: minimum 3, maximum 7', severity: 'warning', isCritical: false, validatorName: 'ListStructureValidator' },
  { id: 'K5', category: 'Lists', name: 'Parallel structure', description: 'List items should be parallel structure', severity: 'warning', isCritical: false, validatorName: 'ListStructureValidator' },
  { id: 'K6', category: 'Lists', name: 'Ordered for sequence', description: 'Ordered lists for sequential/ranked content', severity: 'info', isCritical: false },
  { id: 'K7', category: 'Lists', name: 'Unordered non-seq', description: 'Unordered lists for non-sequential items', severity: 'info', isCritical: false },
  { id: 'K8', category: 'Lists', name: 'Complete thoughts', description: 'List items should be complete thoughts', severity: 'info', isCritical: false },

  // Category L: Tables
  { id: 'L1', category: 'Tables', name: 'Comparative only', description: 'Tables for comparative data only', severity: 'info', isCritical: false },
  { id: 'L2', category: 'Tables', name: 'Min 2 cols 3 rows', description: 'Minimum dimensions: 2 columns, 3 rows', severity: 'warning', isCritical: false, validatorName: 'TableStructureValidator' },
  { id: 'L3', category: 'Tables', name: 'Clear headers', description: 'Clear, descriptive headers', severity: 'warning', isCritical: false, validatorName: 'TableStructureValidator' },
  { id: 'L4', category: 'Tables', name: 'No merged cells', description: 'No merged cells', severity: 'warning', isCritical: false, validatorName: 'TableStructureValidator' },
  { id: 'L5', category: 'Tables', name: 'Consistent data types', description: 'Consistent data types per column', severity: 'warning', isCritical: false, validatorName: 'TableStructureValidator' },
  { id: 'L6', category: 'Tables', name: 'Definition before table', description: 'Definition sentence before table', severity: 'warning', isCritical: false },
  { id: 'L7', category: 'Tables', name: 'Reference in text', description: 'Table should be referenced in surrounding text', severity: 'info', isCritical: false },

  // Category M: Images
  { id: 'M1', category: 'Images', name: 'No heading-para gap', description: 'Never place image between heading and first paragraph', severity: 'error', isCritical: true, validatorName: 'ImagePlacement' },
  { id: 'M2', category: 'Images', name: 'Image density', description: 'Image density: 1 per 300-500 words', severity: 'warning', isCritical: false },
  { id: 'M3', category: 'Images', name: 'Descriptive alt', description: 'Alt text must describe image content', severity: 'info', isCritical: false },
  { id: 'M4', category: 'Images', name: 'Alt vocabulary', description: 'Alt text should extend vocabulary', severity: 'info', isCritical: false },
  { id: 'M5', category: 'Images', name: 'Alt entity', description: 'Alt text includes relevant entity/attribute', severity: 'info', isCritical: false },
  { id: 'M6', category: 'Images', name: 'Budget zones', description: 'Image placement in format budget zones', severity: 'warning', isCritical: false },
  { id: 'M7', category: 'Images', name: 'Decorative empty alt', description: 'Decorative images should have empty alt', severity: 'info', isCritical: false },

  // Category N: Contextual Flow
  { id: 'N1', category: 'Contextual Flow', name: 'Vector relationships', description: 'Contextual vectors define section relationships', severity: 'warning', isCritical: false, validatorName: 'ContextualVectorValidator' },
  { id: 'N2', category: 'Contextual Flow', name: 'H2+ relationship', description: 'Each H2+ has relationship type to previous', severity: 'warning', isCritical: false },
  { id: 'N3', category: 'Contextual Flow', name: 'Supplementary bridge', description: 'SUPPLEMENTARY sections need contextual bridge', severity: 'warning', isCritical: false, validatorName: 'ContextualBridgeValidator' },
  { id: 'N4', category: 'Contextual Flow', name: 'Section transitions', description: 'Smooth transitions between sections', severity: 'warning', isCritical: false },
  { id: 'N5', category: 'Contextual Flow', name: 'No topic shifts', description: 'No abrupt topic shifts', severity: 'info', isCritical: false },
  { id: 'N6', category: 'Contextual Flow', name: 'Conclusion ties back', description: 'Conclusion ties back to introduction', severity: 'info', isCritical: false },

  // Category O: Format Codes
  { id: 'O1', category: 'Format Codes', name: 'Response code format', description: 'Response code determines answer format', severity: 'warning', isCritical: false, validatorName: 'FormatCodeValidator' },
  { id: 'O2', category: 'Format Codes', name: 'DEFINITION format', description: 'DEFINITION format: concise, direct definition', severity: 'info', isCritical: false },
  { id: 'O3', category: 'Format Codes', name: 'COMPARISON format', description: 'COMPARISON format: balanced pros/cons', severity: 'info', isCritical: false },
  { id: 'O4', category: 'Format Codes', name: 'HOW-TO format', description: 'HOW-TO format: numbered steps', severity: 'info', isCritical: false },
  { id: 'O5', category: 'Format Codes', name: 'LIST format', description: 'LIST format: comprehensive enumeration', severity: 'info', isCritical: false },
  { id: 'O6', category: 'Format Codes', name: 'EXPLANATION format', description: 'EXPLANATION format: logical exposition', severity: 'info', isCritical: false },

  // Category P: Schema (all implemented)
  { id: 'P1', category: 'Schema', name: 'Article schema', description: 'Article schema with all required properties', severity: 'error', isCritical: false },
  { id: 'P2', category: 'Schema', name: 'Author schema', description: 'Author schema with proper attribution', severity: 'error', isCritical: false },
  { id: 'P3', category: 'Schema', name: 'Publisher schema', description: 'Publisher/Organization schema', severity: 'error', isCritical: false },
  { id: 'P4', category: 'Schema', name: 'FAQPage schema', description: 'FAQPage schema when content has Q&A', severity: 'warning', isCritical: false },
  { id: 'P5', category: 'Schema', name: 'HowTo schema', description: 'HowTo schema for instructional content', severity: 'warning', isCritical: false },
  { id: 'P6', category: 'Schema', name: 'Entity resolution', description: 'Entity resolution via Wikidata', severity: 'warning', isCritical: false },
  { id: 'P7', category: 'Schema', name: 'sameAs links', description: 'sameAs links for entities', severity: 'warning', isCritical: false },
  { id: 'P8', category: 'Schema', name: 'Schema validation', description: 'Schema validation against schema.org', severity: 'error', isCritical: false },
  { id: 'P9', category: 'Schema', name: 'Auto-fix', description: 'Auto-fix for common schema errors', severity: 'info', isCritical: false },
  { id: 'P10', category: 'Schema', name: 'Breadcrumb schema', description: 'BreadcrumbList schema', severity: 'warning', isCritical: false },

  // Category Q: Audit
  { id: 'Q1', category: 'Audit', name: 'Algorithmic audit', description: 'Algorithmic audit runs 12+ checks', severity: 'error', isCritical: false },
  { id: 'Q2', category: 'Audit', name: 'Compliance score', description: 'Compliance score calculation', severity: 'info', isCritical: false },
  { id: 'Q3', category: 'Audit', name: 'Final score calc', description: 'Final score = 60% algorithmic + 40% compliance', severity: 'info', isCritical: false },
  { id: 'Q4', category: 'Audit', name: 'Critical threshold', description: 'Critical threshold: 50% blocks content', severity: 'error', isCritical: true },
  { id: 'Q5', category: 'Audit', name: 'Warning threshold', description: 'Warning threshold: 70% logs warning', severity: 'warning', isCritical: false },
  { id: 'Q6', category: 'Audit', name: 'Rule weights', description: 'Critical rules weighted higher', severity: 'info', isCritical: false },

  // Category S: Systemic
  { id: 'S1', category: 'Systemic', name: 'Output language', description: 'Output language matches configured language', severity: 'error', isCritical: true, validatorName: 'LanguageOutputValidator' },
  { id: 'S2', category: 'Systemic', name: 'Regional spelling', description: 'Regional spelling consistency (US vs UK)', severity: 'warning', isCritical: false, validatorName: 'RegionalSpellingValidator' },
  { id: 'S3', category: 'Systemic', name: 'Pillar alignment', description: 'Content aligns with 3 SEO pillars', severity: 'warning', isCritical: true, validatorName: 'PillarAlignmentValidator' },
  { id: 'S4', category: 'Systemic', name: 'Readability match', description: 'Readability matches target audience', severity: 'warning', isCritical: false, validatorName: 'ReadabilityValidator' },
  { id: 'S5', category: 'Systemic', name: 'Author voice', description: 'Author voice/stylometry consistency', severity: 'info', isCritical: false, validatorName: 'StylometryValidator' },
];

export class RuleRegistry {
  private static rules: QualityRule[] = RULES;

  static getAllRules(): QualityRule[] {
    return [...this.rules];
  }

  static getRule(id: string): QualityRule | undefined {
    return this.rules.find(r => r.id === id);
  }

  static getRulesByCategory(category: RuleCategory): QualityRule[] {
    return this.rules.filter(r => r.category === category);
  }

  static getCriticalRules(): QualityRule[] {
    return this.rules.filter(r => r.isCritical);
  }

  static getRulesBySeverity(severity: RuleSeverity): QualityRule[] {
    return this.rules.filter(r => r.severity === severity);
  }

  static getCategories(): RuleCategory[] {
    return [...new Set(this.rules.map(r => r.category))];
  }

  static getRuleCount(): number {
    return this.rules.length;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=ruleRegistry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/ruleRegistry.ts services/ai/contentGeneration/rulesEngine/__tests__/ruleRegistry.test.ts
git commit -m "feat(quality): add RuleRegistry with 113+ quality rules"
```

---

### Task 2: Create LanguageOutputValidator (S1)

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/languageOutputValidator.ts`
- Test: `services/ai/contentGeneration/rulesEngine/validators/__tests__/languageOutputValidator.test.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/index.ts`

**Step 1: Write the failing test**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/__tests__/languageOutputValidator.test.ts
import { LanguageOutputValidator } from '../languageOutputValidator';

describe('LanguageOutputValidator', () => {
  it('should pass when content matches expected language', () => {
    const dutchContent = 'Dit is een test artikel over zonnepanelen. Zonnepanelen zijn een effectieve manier om energie op te wekken.';
    const result = LanguageOutputValidator.validate(dutchContent, 'Dutch');
    expect(result.isValid).toBe(true);
    expect(result.detectedLanguage).toBe('Dutch');
  });

  it('should fail when content is in wrong language', () => {
    const englishContent = 'This is a test article about solar panels. Solar panels are an effective way to generate energy.';
    const result = LanguageOutputValidator.validate(englishContent, 'Dutch');
    expect(result.isValid).toBe(false);
    expect(result.detectedLanguage).toBe('English');
  });

  it('should return violations for wrong language', () => {
    const englishContent = 'This is English content that should be Dutch.';
    const violations = LanguageOutputValidator.validateWithViolations(englishContent, { language: 'Dutch' } as any);
    expect(violations.length).toBe(1);
    expect(violations[0].rule).toBe('S1_LANGUAGE_OUTPUT');
    expect(violations[0].severity).toBe('error');
  });

  it('should handle German content correctly', () => {
    const germanContent = 'Dies ist ein Testartikel über Solarpaneele. Solarpaneele sind eine effektive Möglichkeit, Energie zu erzeugen.';
    const result = LanguageOutputValidator.validate(germanContent, 'German');
    expect(result.isValid).toBe(true);
    expect(result.detectedLanguage).toBe('German');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=languageOutputValidator.test.ts`
Expected: FAIL with "Cannot find module '../languageOutputValidator'"

**Step 3: Write the implementation**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/languageOutputValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';

interface LanguageDetectionResult {
  isValid: boolean;
  detectedLanguage: string;
  confidence: number;
  expectedLanguage: string;
}

// Common words by language for detection (top 20 most frequent)
const LANGUAGE_MARKERS: Record<string, string[]> = {
  'English': ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'been', 'will', 'would', 'could', 'should', 'with', 'that', 'this', 'from', 'they', 'which', 'their', 'what'],
  'Dutch': ['de', 'het', 'een', 'van', 'en', 'in', 'is', 'op', 'te', 'dat', 'die', 'voor', 'zijn', 'met', 'als', 'aan', 'er', 'maar', 'om', 'ook'],
  'German': ['der', 'die', 'das', 'und', 'ist', 'von', 'zu', 'den', 'mit', 'sich', 'des', 'auf', 'für', 'nicht', 'eine', 'als', 'auch', 'es', 'an', 'werden'],
  'French': ['le', 'la', 'les', 'de', 'et', 'est', 'un', 'une', 'du', 'en', 'que', 'qui', 'dans', 'pour', 'ce', 'pas', 'sur', 'sont', 'avec', 'plus'],
  'Spanish': ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'los', 'del', 'las', 'por', 'con', 'una', 'para', 'al', 'no', 'son', 'su'],
};

// Unique character patterns for languages
const LANGUAGE_PATTERNS: Record<string, RegExp> = {
  'Dutch': /\b(ij|oe|ui|eu|aa|ee|oo|uu)\b/gi,
  'German': /[äöüßÄÖÜ]/g,
  'French': /[àâçéèêëîïôùûüÿœæ]/gi,
  'Spanish': /[áéíóúñ¿¡]/gi,
};

export class LanguageOutputValidator {
  /**
   * Validate that content is in the expected language
   */
  static validate(content: string, expectedLanguage: string): LanguageDetectionResult {
    const normalizedExpected = getLanguageName(expectedLanguage);
    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 1);

    if (words.length < 10) {
      // Not enough content to reliably detect
      return {
        isValid: true,
        detectedLanguage: normalizedExpected,
        confidence: 0.5,
        expectedLanguage: normalizedExpected,
      };
    }

    // Score each language
    const scores: Record<string, number> = {};

    for (const [lang, markers] of Object.entries(LANGUAGE_MARKERS)) {
      const markerSet = new Set(markers);
      const matchCount = words.filter(w => markerSet.has(w)).length;
      scores[lang] = matchCount / words.length;

      // Boost score if language-specific characters found
      const pattern = LANGUAGE_PATTERNS[lang];
      if (pattern) {
        const patternMatches = (content.match(pattern) || []).length;
        scores[lang] += (patternMatches / content.length) * 10;
      }
    }

    // Find highest scoring language
    let detectedLanguage = 'English';
    let highestScore = 0;

    for (const [lang, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        detectedLanguage = lang;
      }
    }

    const confidence = Math.min(highestScore * 5, 1); // Normalize to 0-1

    return {
      isValid: detectedLanguage === normalizedExpected,
      detectedLanguage,
      confidence,
      expectedLanguage: normalizedExpected,
    };
  }

  /**
   * Validate with violations for integration with RulesValidator
   */
  static validateWithViolations(
    content: string,
    context: SectionGenerationContext
  ): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const expectedLanguage = context.language || 'English';

    const result = this.validate(content, expectedLanguage);

    if (!result.isValid && result.confidence > 0.6) {
      violations.push({
        rule: 'S1_LANGUAGE_OUTPUT',
        text: `Content appears to be in ${result.detectedLanguage} but should be ${result.expectedLanguage}`,
        position: 0,
        suggestion: `Rewrite content in ${result.expectedLanguage}. Current content detected as ${result.detectedLanguage} with ${Math.round(result.confidence * 100)}% confidence.`,
        severity: 'error',
      });
    }

    return violations;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=languageOutputValidator.test.ts`
Expected: PASS

**Step 5: Add to validators index**

```typescript
// Add to services/ai/contentGeneration/rulesEngine/validators/index.ts

// Add import at top
import { LanguageOutputValidator } from './languageOutputValidator';

// Add to validate() method after line 60:
    // 12. Language Output Validation (systemic)
    violations.push(...LanguageOutputValidator.validateWithViolations(content, context));

// Add export at bottom
export { LanguageOutputValidator } from './languageOutputValidator';
```

**Step 6: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/languageOutputValidator.ts services/ai/contentGeneration/rulesEngine/validators/__tests__/languageOutputValidator.test.ts services/ai/contentGeneration/rulesEngine/validators/index.ts
git commit -m "feat(quality): add LanguageOutputValidator for S1 rule"
```

---

### Task 3: Create WordCountValidator (G1-G4)

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/wordCountValidator.ts`
- Test: `services/ai/contentGeneration/rulesEngine/validators/__tests__/wordCountValidator.test.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/index.ts`

**Step 1: Write the failing test**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/__tests__/wordCountValidator.test.ts
import { WordCountValidator } from '../wordCountValidator';
import { SectionGenerationContext } from '../../../../../../types';

describe('WordCountValidator', () => {
  const createContext = (sectionType: string, targetWordCount?: number): SectionGenerationContext => ({
    section: {
      heading: 'Test Section',
      level: 2,
      section_key: 'test',
      zone: 'CORE',
      format_code: 'EXPLANATION',
    },
    sectionType,
    targetWordCount,
  } as any);

  it('should pass for introduction with 150+ words', () => {
    const content = 'word '.repeat(160);
    const violations = WordCountValidator.validate(content, createContext('introduction'));
    const errors = violations.filter(v => v.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('should fail for introduction with less than 150 words', () => {
    const content = 'word '.repeat(100);
    const violations = WordCountValidator.validate(content, createContext('introduction'));
    expect(violations.some(v => v.rule === 'G2_INTRO_WORD_COUNT')).toBe(true);
  });

  it('should pass for core section with 200-400 words', () => {
    const content = 'word '.repeat(300);
    const violations = WordCountValidator.validate(content, createContext('core'));
    const errors = violations.filter(v => v.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('should warn for core section under 200 words', () => {
    const content = 'word '.repeat(150);
    const violations = WordCountValidator.validate(content, createContext('core'));
    expect(violations.some(v => v.rule === 'G3_CORE_WORD_COUNT')).toBe(true);
  });

  it('should validate article total against target', () => {
    const content = 'word '.repeat(2000);
    const result = WordCountValidator.validateArticleTotal(content, 2500);
    expect(result.isValid).toBe(false); // 2000 is outside ±10% of 2500
    expect(result.actualCount).toBe(2000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=wordCountValidator.test.ts`
Expected: FAIL with "Cannot find module '../wordCountValidator'"

**Step 3: Write the implementation**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/wordCountValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

interface WordCountResult {
  isValid: boolean;
  actualCount: number;
  targetCount: number;
  tolerance: number;
  minAllowed: number;
  maxAllowed: number;
}

interface SectionWordCountRules {
  min: number;
  max: number;
}

const SECTION_RULES: Record<string, SectionWordCountRules> = {
  introduction: { min: 150, max: 250 },
  core: { min: 200, max: 400 },
  conclusion: { min: 100, max: 200 },
  supplementary: { min: 100, max: 300 },
};

export class WordCountValidator {
  /**
   * Count words in content
   */
  static countWords(content: string): number {
    return content
      .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
      .replace(/[#*_`~\[\]]/g, ' ')  // Remove markdown
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  /**
   * Validate section word count
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const wordCount = this.countWords(content);

    // Determine section type from context
    const sectionType = this.determineSectionType(context);
    const rules = SECTION_RULES[sectionType] || SECTION_RULES.core;

    if (wordCount < rules.min) {
      const ruleId = this.getRuleId(sectionType, 'under');
      violations.push({
        rule: ruleId,
        text: `Section has ${wordCount} words, minimum is ${rules.min}`,
        position: 0,
        suggestion: `Add ${rules.min - wordCount} more words to meet the minimum of ${rules.min} words for ${sectionType} sections.`,
        severity: 'warning',
      });
    }

    if (wordCount > rules.max) {
      const ruleId = this.getRuleId(sectionType, 'over');
      violations.push({
        rule: ruleId,
        text: `Section has ${wordCount} words, maximum is ${rules.max}`,
        position: 0,
        suggestion: `Remove ${wordCount - rules.max} words to meet the maximum of ${rules.max} words for ${sectionType} sections.`,
        severity: 'warning',
      });
    }

    return violations;
  }

  /**
   * Validate total article word count against target
   */
  static validateArticleTotal(content: string, targetWordCount: number, tolerance: number = 0.10): WordCountResult {
    const actualCount = this.countWords(content);
    const minAllowed = Math.floor(targetWordCount * (1 - tolerance));
    const maxAllowed = Math.ceil(targetWordCount * (1 + tolerance));

    return {
      isValid: actualCount >= minAllowed && actualCount <= maxAllowed,
      actualCount,
      targetCount: targetWordCount,
      tolerance,
      minAllowed,
      maxAllowed,
    };
  }

  /**
   * Get violations for article total word count
   */
  static validateArticleTotalWithViolations(content: string, targetWordCount: number): ValidationViolation[] {
    const result = this.validateArticleTotal(content, targetWordCount);

    if (result.isValid) {
      return [];
    }

    const diff = result.actualCount - result.targetCount;
    const direction = diff < 0 ? 'under' : 'over';

    return [{
      rule: 'G1_ARTICLE_WORD_COUNT',
      text: `Article has ${result.actualCount} words, target is ${result.targetCount} (±${result.tolerance * 100}%)`,
      position: 0,
      suggestion: direction === 'under'
        ? `Add ${Math.abs(diff)} more words to reach the target range of ${result.minAllowed}-${result.maxAllowed} words.`
        : `Remove ${diff} words to reach the target range of ${result.minAllowed}-${result.maxAllowed} words.`,
      severity: 'warning',
    }];
  }

  private static determineSectionType(context: SectionGenerationContext): string {
    const heading = context.section.heading.toLowerCase();

    if (heading.includes('introduction') || heading.includes('intro') || context.section.level === 1) {
      return 'introduction';
    }
    if (heading.includes('conclusion') || heading.includes('summary') || heading.includes('final')) {
      return 'conclusion';
    }
    if (context.section.zone === 'SUPPLEMENTARY') {
      return 'supplementary';
    }
    return 'core';
  }

  private static getRuleId(sectionType: string, direction: 'under' | 'over'): string {
    const ruleMap: Record<string, string> = {
      introduction: 'G2_INTRO_WORD_COUNT',
      core: 'G3_CORE_WORD_COUNT',
      conclusion: 'G4_CONCLUSION_WORD_COUNT',
      supplementary: 'G3_CORE_WORD_COUNT', // Use core rules for supplementary
    };
    return ruleMap[sectionType] || 'G3_CORE_WORD_COUNT';
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=wordCountValidator.test.ts`
Expected: PASS

**Step 5: Add to validators index**

```typescript
// Add to services/ai/contentGeneration/rulesEngine/validators/index.ts

// Add import at top
import { WordCountValidator } from './wordCountValidator';

// Add to validate() method:
    // 13. Word Count Validation
    violations.push(...WordCountValidator.validate(content, context));

// Add export at bottom
export { WordCountValidator } from './wordCountValidator';
```

**Step 6: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/wordCountValidator.ts services/ai/contentGeneration/rulesEngine/validators/__tests__/wordCountValidator.test.ts services/ai/contentGeneration/rulesEngine/validators/index.ts
git commit -m "feat(quality): add WordCountValidator for G1-G4 rules"
```

---

### Task 4: Create EavPlacementValidator (C2-C3)

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/eavPlacementValidator.ts`
- Test: `services/ai/contentGeneration/rulesEngine/validators/__tests__/eavPlacementValidator.test.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/index.ts`

**Step 1: Write the failing test**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/__tests__/eavPlacementValidator.test.ts
import { EavPlacementValidator } from '../eavPlacementValidator';
import { SemanticTriple } from '../../../../../../types';

describe('EavPlacementValidator', () => {
  const createEav = (category: string, label: string): SemanticTriple => ({
    subject: { label: 'Solar Panel' },
    predicate: { label: 'has' },
    object: { value: label },
    category: category as any,
  } as any);

  it('should pass when UNIQUE EAV appears in first 300 words', () => {
    const content = 'word '.repeat(100) + 'monocrystalline efficiency ' + 'word '.repeat(100);
    const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
    const result = EavPlacementValidator.validatePlacement(content, eavs);
    expect(result.uniqueInFirst300).toBe(true);
  });

  it('should fail when UNIQUE EAV appears after 300 words', () => {
    const content = 'word '.repeat(350) + 'monocrystalline efficiency ' + 'word '.repeat(100);
    const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
    const result = EavPlacementValidator.validatePlacement(content, eavs);
    expect(result.uniqueInFirst300).toBe(false);
  });

  it('should pass when ROOT EAV appears in first 500 words', () => {
    const content = 'word '.repeat(400) + 'photovoltaic cells ' + 'word '.repeat(100);
    const eavs = [createEav('ROOT', 'photovoltaic cells')];
    const result = EavPlacementValidator.validatePlacement(content, eavs);
    expect(result.rootInFirst500).toBe(true);
  });

  it('should return violations for missing early EAV placement', () => {
    const content = 'word '.repeat(600) + 'monocrystalline efficiency';
    const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
    const violations = EavPlacementValidator.validate(content, { eavs } as any);
    expect(violations.some(v => v.rule === 'C2_UNIQUE_EAV_PLACEMENT')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=eavPlacementValidator.test.ts`
Expected: FAIL with "Cannot find module '../eavPlacementValidator'"

**Step 3: Write the implementation**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/eavPlacementValidator.ts

import { ValidationViolation, SectionGenerationContext, SemanticTriple } from '../../../../../types';

interface EavPlacementResult {
  uniqueInFirst300: boolean;
  rootInFirst500: boolean;
  uniqueEavs: { eav: SemanticTriple; position: number | null }[];
  rootEavs: { eav: SemanticTriple; position: number | null }[];
}

export class EavPlacementValidator {
  /**
   * Count words up to a position in content
   */
  private static countWordsToPosition(content: string, position: number): number {
    const substring = content.substring(0, position);
    return substring.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Find the word position of a term in content
   */
  private static findTermPosition(content: string, term: string): number | null {
    const lowerContent = content.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const charPosition = lowerContent.indexOf(lowerTerm);

    if (charPosition === -1) {
      return null;
    }

    return this.countWordsToPosition(content, charPosition);
  }

  /**
   * Validate EAV placement in content
   */
  static validatePlacement(content: string, eavs: SemanticTriple[]): EavPlacementResult {
    const uniqueEavs = eavs.filter(e => e.category === 'UNIQUE');
    const rootEavs = eavs.filter(e => e.category === 'ROOT');

    const uniquePositions = uniqueEavs.map(eav => {
      const term = eav.object?.value?.toString() || '';
      return {
        eav,
        position: this.findTermPosition(content, term),
      };
    });

    const rootPositions = rootEavs.map(eav => {
      const term = eav.object?.value?.toString() || '';
      return {
        eav,
        position: this.findTermPosition(content, term),
      };
    });

    // Check if any UNIQUE EAV appears in first 300 words
    const uniqueInFirst300 = uniqueEavs.length === 0 ||
      uniquePositions.some(p => p.position !== null && p.position <= 300);

    // Check if any ROOT EAV appears in first 500 words
    const rootInFirst500 = rootEavs.length === 0 ||
      rootPositions.some(p => p.position !== null && p.position <= 500);

    return {
      uniqueInFirst300,
      rootInFirst500,
      uniqueEavs: uniquePositions,
      rootEavs: rootPositions,
    };
  }

  /**
   * Validate with violations for integration with RulesValidator
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Only validate at article level or first section
    if (context.section.level > 1 && !context.section.heading.toLowerCase().includes('introduction')) {
      return violations;
    }

    const eavs = context.eavs || [];
    if (eavs.length === 0) {
      return violations;
    }

    const result = this.validatePlacement(content, eavs);

    if (!result.uniqueInFirst300 && result.uniqueEavs.length > 0) {
      const missingEavs = result.uniqueEavs
        .filter(p => p.position === null || p.position > 300)
        .map(p => p.eav.object?.value)
        .filter(Boolean);

      violations.push({
        rule: 'C2_UNIQUE_EAV_PLACEMENT',
        text: `UNIQUE EAVs not found in first 300 words: ${missingEavs.join(', ')}`,
        position: 0,
        suggestion: `Move UNIQUE EAV content earlier in the article. These high-value semantic triples should appear in the first 300 words for maximum SEO impact.`,
        severity: 'warning',
      });
    }

    if (!result.rootInFirst500 && result.rootEavs.length > 0) {
      const missingEavs = result.rootEavs
        .filter(p => p.position === null || p.position > 500)
        .map(p => p.eav.object?.value)
        .filter(Boolean);

      violations.push({
        rule: 'C3_ROOT_EAV_PLACEMENT',
        text: `ROOT EAVs not found in first 500 words: ${missingEavs.join(', ')}`,
        position: 0,
        suggestion: `Move ROOT EAV content earlier in the article. These foundational semantic triples should appear in the first 500 words.`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=eavPlacementValidator.test.ts`
Expected: PASS

**Step 5: Add to validators index**

```typescript
// Add to services/ai/contentGeneration/rulesEngine/validators/index.ts

// Add import at top
import { EavPlacementValidator } from './eavPlacementValidator';

// Add to validate() method:
    // 14. EAV Placement Validation
    violations.push(...EavPlacementValidator.validate(content, context));

// Add export at bottom
export { EavPlacementValidator } from './eavPlacementValidator';
```

**Step 6: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/eavPlacementValidator.ts services/ai/contentGeneration/rulesEngine/validators/__tests__/eavPlacementValidator.test.ts services/ai/contentGeneration/rulesEngine/validators/index.ts
git commit -m "feat(quality): add EavPlacementValidator for C2-C3 rules"
```

---

### Task 5: Create PillarAlignmentValidator (S3)

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/pillarAlignmentValidator.ts`
- Test: `services/ai/contentGeneration/rulesEngine/validators/__tests__/pillarAlignmentValidator.test.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/index.ts`

**Step 1: Write the failing test**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/__tests__/pillarAlignmentValidator.test.ts
import { PillarAlignmentValidator } from '../pillarAlignmentValidator';

describe('PillarAlignmentValidator', () => {
  const pillars = {
    centralEntity: 'solar panels',
    sourceContext: 'sustainable energy solutions for homeowners',
    centralSearchIntent: 'learn how solar panels work',
  };

  it('should score high when content mentions central entity frequently', () => {
    const content = 'Solar panels are devices that convert sunlight into electricity. Solar panels use photovoltaic cells. Modern solar panels are highly efficient.';
    const result = PillarAlignmentValidator.calculateAlignment(content, pillars);
    expect(result.centralEntityScore).toBeGreaterThan(70);
  });

  it('should score low when content rarely mentions central entity', () => {
    const content = 'Renewable energy is important. Many people want to reduce their carbon footprint. Green technology is advancing rapidly.';
    const result = PillarAlignmentValidator.calculateAlignment(content, pillars);
    expect(result.centralEntityScore).toBeLessThan(50);
  });

  it('should calculate overall alignment score', () => {
    const content = 'Solar panels help homeowners generate sustainable energy. Solar panels are a key part of renewable energy solutions.';
    const result = PillarAlignmentValidator.calculateAlignment(content, pillars);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it('should return violations when alignment is below threshold', () => {
    const content = 'This content is completely unrelated to the topic at hand.';
    const context = { pillars } as any;
    const violations = PillarAlignmentValidator.validate(content, context);
    expect(violations.some(v => v.rule === 'S3_PILLAR_ALIGNMENT')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=pillarAlignmentValidator.test.ts`
Expected: FAIL with "Cannot find module '../pillarAlignmentValidator'"

**Step 3: Write the implementation**

```typescript
// services/ai/contentGeneration/rulesEngine/validators/pillarAlignmentValidator.ts

import { ValidationViolation, SectionGenerationContext, SEOPillars } from '../../../../../types';

interface PillarAlignmentResult {
  centralEntityScore: number;      // 0-100
  sourceContextScore: number;      // 0-100
  searchIntentScore: number;       // 0-100
  overallScore: number;            // Weighted average
  passing: boolean;
}

const PASSING_THRESHOLD = 70;

export class PillarAlignmentValidator {
  /**
   * Calculate term frequency in content
   */
  private static calculateTermFrequency(content: string, term: string): number {
    if (!term || term.trim().length === 0) return 0;

    const lowerContent = content.toLowerCase();
    const lowerTerm = term.toLowerCase().trim();
    const words = lowerContent.split(/\s+/);
    const termWords = lowerTerm.split(/\s+/);

    // For multi-word terms, look for exact phrase
    if (termWords.length > 1) {
      const regex = new RegExp(lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = content.match(regex) || [];
      return matches.length;
    }

    // For single words
    return words.filter(w => w === lowerTerm).length;
  }

  /**
   * Calculate semantic overlap between content and a description
   */
  private static calculateSemanticOverlap(content: string, description: string): number {
    if (!description || description.trim().length === 0) return 50; // Neutral if no description

    const contentWords = new Set(
      content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3)
    );

    const descriptionWords = description.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    if (descriptionWords.length === 0) return 50;

    const matchCount = descriptionWords.filter(w => contentWords.has(w)).length;
    return Math.min(100, (matchCount / descriptionWords.length) * 100);
  }

  /**
   * Calculate alignment scores for content against pillars
   */
  static calculateAlignment(content: string, pillars: SEOPillars): PillarAlignmentResult {
    const wordCount = content.split(/\s+/).length;

    // Central Entity Score: Based on mention frequency
    const entityMentions = this.calculateTermFrequency(content, pillars.centralEntity);
    const entityDensity = wordCount > 0 ? (entityMentions / wordCount) * 100 : 0;
    // Target: entity mentioned roughly every 50-100 words (1-2%)
    const centralEntityScore = Math.min(100, entityDensity * 50);

    // Source Context Score: Based on semantic overlap with value proposition
    const sourceContextScore = this.calculateSemanticOverlap(content, pillars.sourceContext);

    // Search Intent Score: Based on semantic overlap with intent
    const searchIntentScore = this.calculateSemanticOverlap(content, pillars.centralSearchIntent);

    // Weighted overall: Entity most important (50%), then intent (30%), then context (20%)
    const overallScore = Math.round(
      centralEntityScore * 0.5 +
      searchIntentScore * 0.3 +
      sourceContextScore * 0.2
    );

    return {
      centralEntityScore: Math.round(centralEntityScore),
      sourceContextScore: Math.round(sourceContextScore),
      searchIntentScore: Math.round(searchIntentScore),
      overallScore,
      passing: overallScore >= PASSING_THRESHOLD,
    };
  }

  /**
   * Validate with violations for integration with RulesValidator
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    const pillars = context.pillars;
    if (!pillars || !pillars.centralEntity) {
      return violations; // No pillars to validate against
    }

    const result = this.calculateAlignment(content, pillars);

    if (!result.passing) {
      const issues: string[] = [];

      if (result.centralEntityScore < 50) {
        issues.push(`central entity "${pillars.centralEntity}" underrepresented (${result.centralEntityScore}%)`);
      }
      if (result.searchIntentScore < 50) {
        issues.push(`search intent alignment weak (${result.searchIntentScore}%)`);
      }
      if (result.sourceContextScore < 50) {
        issues.push(`value proposition alignment weak (${result.sourceContextScore}%)`);
      }

      violations.push({
        rule: 'S3_PILLAR_ALIGNMENT',
        text: `Content alignment with SEO pillars is ${result.overallScore}% (threshold: ${PASSING_THRESHOLD}%)`,
        position: 0,
        suggestion: `Improve pillar alignment: ${issues.join('; ')}. Mention "${pillars.centralEntity}" more frequently and ensure content addresses the search intent.`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=pillarAlignmentValidator.test.ts`
Expected: PASS

**Step 5: Add to validators index**

```typescript
// Add to services/ai/contentGeneration/rulesEngine/validators/index.ts

// Add import at top
import { PillarAlignmentValidator } from './pillarAlignmentValidator';

// Add to validate() method:
    // 15. Pillar Alignment Validation (systemic)
    violations.push(...PillarAlignmentValidator.validate(content, context));

// Add export at bottom
export { PillarAlignmentValidator } from './pillarAlignmentValidator';
```

**Step 6: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/pillarAlignmentValidator.ts services/ai/contentGeneration/rulesEngine/validators/__tests__/pillarAlignmentValidator.test.ts services/ai/contentGeneration/rulesEngine/validators/index.ts
git commit -m "feat(quality): add PillarAlignmentValidator for S3 rule"
```

---

### Task 6: Create Database Migration for Rule Tracking

**Files:**
- Create: `supabase/migrations/20260109000001_quality_rules_tracking.sql`

**Step 1: Write the migration**

```sql
-- supabase/migrations/20260109000001_quality_rules_tracking.sql

-- Quality rule definitions (seeded from application)
CREATE TABLE IF NOT EXISTS quality_rules (
  id VARCHAR(10) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('error', 'warning', 'info')),
  is_critical BOOLEAN DEFAULT false,
  threshold JSONB,
  upgrade_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rule status snapshots after each pass
CREATE TABLE IF NOT EXISTS content_rule_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
  pass_number INTEGER NOT NULL,
  snapshot_type VARCHAR(20) NOT NULL CHECK (snapshot_type IN ('before', 'after')),
  rules JSONB NOT NULL,
  content_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rule_snapshots_job_pass
ON content_rule_snapshots(job_id, pass_number);

-- Pass change deltas for conflict detection
CREATE TABLE IF NOT EXISTS content_pass_deltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
  pass_number INTEGER NOT NULL,
  rules_fixed TEXT[],
  rules_regressed TEXT[],
  rules_unchanged TEXT[],
  auto_reverted BOOLEAN DEFAULT false,
  revert_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pass_deltas_job
ON content_pass_deltas(job_id);

-- Section-level versioning for rollback
CREATE TABLE IF NOT EXISTS content_section_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
  section_key VARCHAR(50) NOT NULL,
  pass_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  rule_snapshot JSONB,
  is_best_version BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_section_versions_lookup
ON content_section_versions(job_id, section_key, pass_number);

-- Historical analytics aggregation
CREATE TABLE IF NOT EXISTS quality_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  articles_generated INTEGER DEFAULT 0,
  articles_passed_first_time INTEGER DEFAULT 0,
  articles_auto_fixed INTEGER DEFAULT 0,
  articles_manual_intervention INTEGER DEFAULT 0,
  rule_compliance JSONB,
  conflict_patterns JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Add RLS policies
ALTER TABLE quality_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_rule_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pass_deltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_section_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Quality rules are readable by all authenticated users
CREATE POLICY "quality_rules_read" ON quality_rules
  FOR SELECT TO authenticated USING (true);

-- Snapshots accessible via job ownership
CREATE POLICY "snapshots_via_job" ON content_rule_snapshots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- Deltas accessible via job ownership
CREATE POLICY "deltas_via_job" ON content_pass_deltas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- Section versions accessible via job ownership
CREATE POLICY "versions_via_job" ON content_section_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- Analytics accessible by owner
CREATE POLICY "analytics_owner" ON quality_analytics_daily
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Add updated_at trigger for quality_rules
CREATE OR REPLACE FUNCTION update_quality_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quality_rules_updated_at
  BEFORE UPDATE ON quality_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_quality_rules_updated_at();
```

**Step 2: Apply migration locally**

Run: `supabase db reset` or `supabase migration up`
Expected: Migration applies successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260109000001_quality_rules_tracking.sql
git commit -m "feat(db): add quality rules tracking tables and RLS policies"
```

---

## Phase 1 Checkpoint

At this point you should have:
- ✅ RuleRegistry with 113+ rules defined
- ✅ LanguageOutputValidator (S1)
- ✅ WordCountValidator (G1-G4)
- ✅ EavPlacementValidator (C2-C3)
- ✅ PillarAlignmentValidator (S3)
- ✅ Database migration for tracking

**Run full test suite:**
```bash
npm test -- --testPathPattern="rulesEngine"
```

**All tests should pass before continuing to Phase 2.**

---

## Phase 2 Tasks (Remaining Validators + Conflict Detection)

### Task 7: Create ListStructureValidator (K4-K5)
### Task 8: Create TableStructureValidator (L2-L5)
### Task 9: Create CrossSectionRepetitionValidator (H9)
### Task 10: Create ReadabilityValidator (S4)
### Task 11: Create DiscourseChainingValidator (D5)
### Task 12: Create RuleSnapshotService
### Task 13: Create ConflictDetector
### Task 14: Integrate Tracking into Pass Execution

---

## Phase 3 Tasks (Dashboard Components)

### Task 15: Create QualityRulePanel Component
### Task 16: Create LiveGenerationMonitor Component
### Task 17: Create ArticleQualityReport Component
### Task 18: Create PortfolioAnalytics Component
### Task 19: Create ContentGenerationModeSelector
### Task 20: Integration Testing

---

## Execution Notes

- Each task follows TDD: test first, then implement
- Commit after each task
- Run full test suite at phase checkpoints
- Deploy database migrations before dependent code

---

**Plan complete and saved to `docs/plans/2026-01-09-quality-enforcement-system.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**