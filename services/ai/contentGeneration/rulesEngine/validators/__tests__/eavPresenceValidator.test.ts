// services/ai/contentGeneration/rulesEngine/validators/__tests__/eavPresenceValidator.test.ts

import { EavPresenceValidator } from '../eavPresenceValidator';
import { SemanticTriple, SectionGenerationContext, BriefSection } from '../../../../../../types';

describe('EavPresenceValidator', () => {
  const createEav = (category: string, subjectLabel: string, objectValue: string): SemanticTriple => ({
    subject: { label: subjectLabel, type: 'Product' },
    predicate: { relation: 'has', type: 'property', category: category as any },
    object: { value: objectValue, type: 'string' },
  });

  const createContext = (sectionEavs: SemanticTriple[]): SectionGenerationContext => ({
    section: {
      key: 'section-0',
      heading: 'Test Section',
      level: 2,
      order: 1,
    } as BriefSection,
    brief: {
      id: 'test-brief',
      topic_id: 'test-topic',
      title: 'Test Article',
      slug: 'test-article',
      metaDescription: 'Test description',
      keyTakeaways: [],
      outline: '',
      serpAnalysis: { peopleAlsoAsk: [], competitorHeadings: [] },
      visuals: { featuredImagePrompt: '', imageAltText: '' },
      contextualVectors: [],
      contextualBridge: [],
    } as any,
    businessInfo: {
      seedKeyword: 'test keyword',
      companyName: 'Test Company',
      website: 'https://test.com',
    } as any,
    allSections: [],
    isYMYL: false,
    sectionEavs,
  } as any);

  it('should return error severity for missing UNIQUE EAV', () => {
    const eavs = [createEav('UNIQUE', 'Solar Panel', 'patented technology')];
    const content = 'This section talks about general topics without mentioning the key concepts.';
    const violations = EavPresenceValidator.validate(content, createContext(eavs));

    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe('error');
    expect(violations[0].rule).toBe('EAV_PRESENCE');
  });

  it('should return error severity for missing ROOT EAV', () => {
    const eavs = [createEav('ROOT', 'Solar Panel', 'renewable energy')];
    const content = 'This section talks about general topics without mentioning the key concepts.';
    const violations = EavPresenceValidator.validate(content, createContext(eavs));

    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe('error');
  });

  it('should return warning severity for missing COMMON EAV', () => {
    const eavs = [createEav('COMMON', 'Solar Panel', 'installation cost')];
    const content = 'This section talks about general topics without mentioning the key concepts.';
    const violations = EavPresenceValidator.validate(content, createContext(eavs));

    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe('warning');
  });

  it('should return warning severity for missing RARE EAV', () => {
    const eavs = [createEav('RARE', 'Solar Panel', 'bifacial modules')];
    const content = 'This section talks about general topics without mentioning the key concepts.';
    const violations = EavPresenceValidator.validate(content, createContext(eavs));

    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe('warning');
  });

  it('should return no violations when all assigned EAVs are present', () => {
    const eavs = [
      createEav('UNIQUE', 'Solar Panel', 'patented technology'),
      createEav('ROOT', 'Solar Panel', 'renewable energy'),
    ];
    const content = 'Solar panel patented technology makes it a leader in renewable energy production.';
    const violations = EavPresenceValidator.validate(content, createContext(eavs));

    expect(violations).toHaveLength(0);
  });

  it('should return no violations when sectionEavs is empty', () => {
    const violations = EavPresenceValidator.validate('Any content here', createContext([]));
    expect(violations).toHaveLength(0);
  });

  it('should detect EAV presence via subject label', () => {
    const eavs = [createEav('UNIQUE', 'Solar Panel', 'xy')]; // object too short to match
    const content = 'The solar panel is an efficient device for energy conversion.';
    const violations = EavPresenceValidator.validate(content, createContext(eavs));

    expect(violations).toHaveLength(0); // Found via subject label
  });

  it('should handle mixed severity for multiple missing EAVs', () => {
    const eavs = [
      createEav('UNIQUE', 'Solar Panel', 'patented technology'),
      createEav('COMMON', 'Solar Panel', 'weight'),
    ];
    const content = 'This content does not mention any relevant concepts at all.';
    const violations = EavPresenceValidator.validate(content, createContext(eavs));

    expect(violations).toHaveLength(2);
    const uniqueViolation = violations.find(v => v.text?.includes('patented technology'));
    const commonViolation = violations.find(v => v.text?.includes('weight'));
    expect(uniqueViolation?.severity).toBe('error');
    expect(commonViolation?.severity).toBe('warning');
  });
});
