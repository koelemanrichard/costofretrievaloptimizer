import { describe, it, expect } from 'vitest';
import { CostOfRetrievalAuditor } from '../CostOfRetrievalAuditor';

describe('CostOfRetrievalAuditor', () => {
  const auditor = new CostOfRetrievalAuditor();

  it('detects excessive DOM nodes (rule 292)', () => {
    const html = '<div>' + '<div><p>Content</p></div>'.repeat(800) + '</div>';
    const issues = auditor.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-292' }));
  });

  it('warns on high DOM node count', () => {
    const html = '<div>' + '<div><p>Content</p></div>'.repeat(550) + '</div>';
    const issues = auditor.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-292-warn' }));
  });

  it('passes low DOM node count', () => {
    const html = '<div><p>Simple content</p></div>';
    const issues = auditor.validate(html);
    expect(issues.find(i => i.ruleId.startsWith('rule-292'))).toBeUndefined();
  });

  it('detects very slow TTFB (rule 304)', () => {
    const issues = auditor.validate('<div></div>', { ttfbMs: 600 });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-304' }));
  });

  it('detects slow TTFB', () => {
    const issues = auditor.validate('<div></div>', { ttfbMs: 300 });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-304-slow' }));
  });

  it('passes fast TTFB', () => {
    const issues = auditor.validate('<div></div>', { ttfbMs: 80 });
    expect(issues.find(i => i.ruleId.startsWith('rule-304'))).toBeUndefined();
  });

  it('detects no compression (rule 308)', () => {
    const issues = auditor.validate('<div></div>', { contentEncodingHeader: 'identity' });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-308' }));
  });

  it('passes gzip compression', () => {
    const issues = auditor.validate('<div></div>', { contentEncodingHeader: 'gzip' });
    expect(issues.find(i => i.ruleId === 'rule-308')).toBeUndefined();
  });

  it('passes Brotli compression', () => {
    const issues = auditor.validate('<div></div>', { contentEncodingHeader: 'br' });
    expect(issues.find(i => i.ruleId === 'rule-308')).toBeUndefined();
  });
});
