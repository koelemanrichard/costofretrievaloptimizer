import { describe, it, expect } from 'vitest';
import { ContextualFlowPhase } from '../ContextualFlowPhase';

describe('ContextualFlowPhase', () => {
  const phase = new ContextualFlowPhase();
  const baseRequest = {
    type: 'internal' as const,
    projectId: 'p1',
    depth: 'deep' as const,
    phases: ['contextualFlow' as const],
    scrapingProvider: 'direct' as const,
    language: 'en',
    includeFactValidation: false,
    includePerformanceData: false,
  };

  it('returns empty result when no content provided', async () => {
    const result = await phase.execute(baseRequest);
    expect(result.findings).toHaveLength(0);
    expect(result.totalChecks).toBe(0);
  });

  it('detects missing CE in first 400 chars (rule 113)', async () => {
    const content = {
      text: 'This article discusses various topics in the field of technology and best practices for developers.',
      centralEntity: 'React hooks',
      keyAttributes: ['state management', 'lifecycle'],
    };
    const result = await phase.execute(baseRequest, content);
    expect(result.findings).toContainEqual(expect.objectContaining({ ruleId: 'rule-113-ce' }));
  });

  it('passes when CE is in first 400 chars', async () => {
    const content = {
      text: 'React hooks are a powerful feature that enables state management in functional components. The lifecycle of hooks is well-defined.',
      centralEntity: 'React hooks',
      keyAttributes: ['state management', 'lifecycle'],
    };
    const result = await phase.execute(baseRequest, content);
    expect(result.findings.find(f => f.ruleId === 'rule-113-ce')).toBeUndefined();
  });

  it('detects missing definition pattern', async () => {
    const content = {
      text: 'React hooks — enabling functional state. Great for developers who need component lifecycle management.',
      centralEntity: 'React hooks',
      keyAttributes: ['state', 'lifecycle'],
    };
    const result = await phase.execute(baseRequest, content);
    expect(result.findings).toContainEqual(expect.objectContaining({ ruleId: 'rule-113-def' }));
  });

  it('detects missing key attributes in intro', async () => {
    const content = {
      text: 'React hooks are a modern feature introduced in React 16.8 that changed how developers write components.',
      centralEntity: 'React hooks',
      keyAttributes: ['state management', 'side effects', 'memoization'],
    };
    const result = await phase.execute(baseRequest, content);
    expect(result.findings).toContainEqual(expect.objectContaining({ ruleId: 'rule-113-attr' }));
  });

  it('passes fully compliant centerpiece text', async () => {
    const content = {
      text: 'React hooks are a powerful mechanism for state management in functional components. They handle side effects through useEffect and optimize performance via memoization.',
      centralEntity: 'React hooks',
      keyAttributes: ['state management', 'side effects', 'memoization'],
    };
    const result = await phase.execute(baseRequest, content);
    expect(result.findings).toHaveLength(0);
  });

  it('handles plain string content', async () => {
    const result = await phase.execute(baseRequest, 'Some plain text content');
    // No CE to check, but obstruction, flow, and discourse validators all run on text content
    expect(result.totalChecks).toBe(3);
  });
});
