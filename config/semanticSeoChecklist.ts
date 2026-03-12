// config/semanticSeoChecklist.ts
// Semantic SEO Quick-Reference Checklist — data model for daily-use checklist UI

export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  category: 'setup' | 'writing-sentence' | 'writing-section' | 'writing-page' | 'technical' | 'llm-specific';
  autoCheckable: boolean;
  auditRuleId?: string;
}

export interface ChecklistPhase {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export const SEMANTIC_SEO_CHECKLIST: ChecklistPhase[] = [
  {
    id: 'setup',
    title: 'Before Writing: Page Setup',
    items: [
      { id: 'ce-identified', label: 'Central Entity identified and named consistently', category: 'setup', autoCheckable: true, auditRuleId: 'CE_POSITION' },
      { id: 'sc-aligned', label: 'Source Context alignment confirmed', category: 'setup', autoCheckable: true },
      { id: 'target-query', label: 'Target query defined', category: 'setup', autoCheckable: false },
      { id: 'h2-questions', label: 'H2 headings formatted as questions', category: 'setup', autoCheckable: true },
      { id: 'cluster-assigned', label: 'Page assigned to correct cluster (Core or Author Section)', category: 'setup', autoCheckable: false },
    ],
  },
  {
    id: 'writing-sentence',
    title: 'Writing: Every Sentence',
    items: [
      { id: 'spo-structure', label: 'Clear S-P-O structure', category: 'writing-sentence', autoCheckable: true },
      { id: 'one-eav', label: 'One EAV triple per sentence', category: 'writing-sentence', autoCheckable: true },
      { id: 'under-30-words', label: 'Under 30 words per sentence', category: 'writing-sentence', autoCheckable: true },
      { id: 'no-ambiguous-pronouns', label: 'No ambiguous pronouns', category: 'writing-sentence', autoCheckable: true, auditRuleId: 'CHUNKING_ENTITY_REINTRO' },
      { id: 'important-terms-early', label: 'Important terms placed early in sentence', category: 'writing-sentence', autoCheckable: false },
      { id: 'no-filler', label: 'No filler words (very, really, basically, eigenlijk, gewoon)', category: 'writing-sentence', autoCheckable: true, auditRuleId: 'FILLER_NL' },
      { id: 'correct-modality', label: 'Correct modality (is/can/should/might)', category: 'writing-sentence', autoCheckable: false },
      { id: 'specific-values', label: 'Specific values (not "many" or "some")', category: 'writing-sentence', autoCheckable: true },
    ],
  },
  {
    id: 'writing-section',
    title: 'Writing: Every Section (H2/H3)',
    items: [
      { id: 'answer-capsule', label: 'Answer capsule: 40-70 words directly answering heading question', category: 'writing-section', autoCheckable: true, auditRuleId: 'ANSWER_CAPSULE' },
      { id: 'first-sentence-answers', label: 'First sentence directly answers heading\'s implied question', category: 'writing-section', autoCheckable: true },
      { id: 'entity-first-sentence', label: 'Entity named in first sentence (survives chunking)', category: 'writing-section', autoCheckable: true, auditRuleId: 'CHUNKING_ENTITY_REINTRO' },
      { id: 'self-contained', label: 'Self-contained: makes complete sense read in isolation', category: 'writing-section', autoCheckable: false },
      { id: 'no-forward-refs', label: 'No forward/backward references', category: 'writing-section', autoCheckable: true, auditRuleId: 'CHUNKING_FORWARD_REF' },
      { id: 'section-length', label: 'Section length: 200-500 words (optimal for RAG chunks)', category: 'writing-section', autoCheckable: true, auditRuleId: 'CHUNKING_SECTION_LENGTH' },
      { id: 'evidence-paragraph', label: 'Evidence paragraph with cited statistics', category: 'writing-section', autoCheckable: true },
      { id: 'links-after-definition', label: 'Links placed AFTER entity/concept is defined', category: 'writing-section', autoCheckable: false },
    ],
  },
  {
    id: 'writing-page',
    title: 'Writing: Every Page',
    items: [
      { id: 'centerpiece-400', label: 'First 400 characters contain core answer (Centerpiece Annotation)', category: 'writing-page', autoCheckable: true, auditRuleId: 'CENTERPIECE' },
      { id: 'summary-tldr', label: 'Summary/TL;DR at top for long-form (>1500 words)', category: 'writing-page', autoCheckable: true },
      { id: 'facts-consistent', label: 'All facts consistent with other pages (KBT)', category: 'writing-page', autoCheckable: true },
      { id: 'author-byline', label: 'Author byline with credentials visible', category: 'writing-page', autoCheckable: true },
      { id: 'max-150-links', label: 'No more than 150 internal links', category: 'writing-page', autoCheckable: true },
      { id: 'anchor-text-limit', label: 'Same anchor text max 3 times per page', category: 'writing-page', autoCheckable: true },
      { id: 'tables-for-comparisons', label: 'Tables for comparative data', category: 'writing-page', autoCheckable: false },
    ],
  },
  {
    id: 'technical',
    title: 'Technical: Every Page',
    items: [
      { id: 'article-schema', label: 'Article schema: author, datePublished, dateModified, publisher', category: 'technical', autoCheckable: true },
      { id: 'canonical-url', label: 'Canonical URL set and consistent', category: 'technical', autoCheckable: true },
      { id: 'semantic-html', label: 'Semantic HTML: article, main, section, nav, aside', category: 'technical', autoCheckable: true },
      { id: 'dom-under-1500', label: 'DOM under 1500 nodes', category: 'technical', autoCheckable: true },
      { id: 'server-response-100ms', label: 'Server response under 100ms', category: 'technical', autoCheckable: true },
      { id: 'text-code-ratio', label: 'Text-to-code ratio above 50%', category: 'technical', autoCheckable: true },
      { id: 'mobile-responsive', label: 'Mobile-responsive with identical content', category: 'technical', autoCheckable: false },
    ],
  },
  {
    id: 'llm-specific',
    title: 'LLM-Specific: Every Page',
    items: [
      { id: 'question-h2', label: 'Question-formatted H2 headings', category: 'llm-specific', autoCheckable: true },
      { id: 'direct-definition', label: 'Direct definition/answer in first paragraph', category: 'llm-specific', autoCheckable: true },
      { id: 'short-declarative', label: 'Short declarative sentences (2-4 per paragraph)', category: 'llm-specific', autoCheckable: true },
      { id: 'no-referent-loss', label: 'No pronouns that lose referent when section read alone', category: 'llm-specific', autoCheckable: true },
      { id: 'terms-redefined', label: 'Defined terms re-defined on first use in each section', category: 'llm-specific', autoCheckable: false },
      { id: 'entity-definitions', label: 'Clear entity definitions at start of page', category: 'llm-specific', autoCheckable: true },
    ],
  },
];

export function getChecklistByPhase(phaseId: string): ChecklistPhase | undefined {
  return SEMANTIC_SEO_CHECKLIST.find(p => p.id === phaseId);
}

export function getFluffWordsKillList(): string[] {
  return [
    // English
    'actually', 'basically', 'really', 'very', 'quite', 'rather', 'somewhat',
    'overall', 'in conclusion', 'as stated before', 'it goes without saying',
    'needless to say', 'at the end of the day', 'in my opinion',
    'it is important to note that', "in today's world",
    'in the ever-evolving landscape of', 'when it comes to',
    "it's worth noting that", 'without further ado', 'last but not least',
    'in a nutshell', 'it should be noted that', 'the fact of the matter is',
    // Dutch
    'eigenlijk', 'gewoon', 'wellicht', 'sowieso', 'natuurlijk', 'uiteraard',
    'over het algemeen', 'in principe', 'als het ware', 'zeg maar',
    'op dit moment', 'heden ten dage', 'niet onbelangrijk',
    'het moge duidelijk zijn', 'het spreekt voor zich',
    // German
    'eigentlich', 'grundsätzlich', 'sozusagen', 'gewissermaßen',
    'im Grunde genommen', 'an und für sich', 'im Endeffekt',
    'natürlich', 'selbstverständlich', 'im Prinzip', 'quasi', 'halt', 'eben',
  ];
}
