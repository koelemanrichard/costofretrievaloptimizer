import { describe, it, expect } from 'vitest';
import { ContextualFlowValidator } from '../ContextualFlowValidator';

describe('ContextualFlowValidator', () => {
  const validator = new ContextualFlowValidator();

  it('detects low CE distribution (rule 115)', () => {
    const paragraphs = [
      'React hooks are a modern feature.',
      'TypeScript provides type safety for applications.',
      'Testing ensures reliability of software.',
      'Documentation helps onboard developers.',
      'Deployment pipelines automate releases.',
    ];
    const issues = validator.validate({
      text: paragraphs.join('\n\n'),
      centralEntity: 'React hooks',
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-115' }));
  });

  it('detects CE missing from conclusion (rule 117)', () => {
    const text = 'React hooks enable state management.\n\nReact hooks simplify components.\n\nIn summary, modern development benefits from these patterns.';
    const issues = validator.validate({ text, centralEntity: 'React hooks' });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-117' }));
  });

  it('detects overly long paragraphs (rule 125)', () => {
    const longPara = Array(201).fill('word').join(' ');
    const text = 'First paragraph.\n\n' + longPara + '\n\nThird paragraph.\n\nFourth paragraph.';
    const issues = validator.validate({ text });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-125' }));
  });

  it('detects duplicate headings (rule 136)', () => {
    const issues = validator.validate({
      text: 'Content',
      headings: [
        { level: 2, text: 'Benefits' },
        { level: 2, text: 'Benefits' },
        { level: 2, text: 'Features' },
      ],
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-136' }));
  });

  it('detects keyword stuffing in heading (rule 144)', () => {
    const issues = validator.validate({
      text: 'Content',
      headings: [
        { level: 2, text: 'React React React hooks hooks hooks' },
      ],
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-144' }));
  });

  it('passes well-structured content', () => {
    const text = [
      'React hooks are the modern way to manage state.',
      'The useState hook provides local state for React hooks components.',
      'Additionally, React hooks enable side effect management with useEffect.',
      'Furthermore, custom React hooks allow logic reuse across components.',
      'In conclusion, React hooks have transformed React development.',
    ].join('\n\n');
    const issues = validator.validate({
      text,
      centralEntity: 'React hooks',
      headings: [
        { level: 1, text: 'Understanding React Hooks' },
        { level: 2, text: 'State Management with useState' },
        { level: 2, text: 'Side Effects with useEffect' },
      ],
    });
    expect(issues.find(i => i.ruleId === 'rule-115')).toBeUndefined();
    expect(issues.find(i => i.ruleId === 'rule-136')).toBeUndefined();
  });
});
