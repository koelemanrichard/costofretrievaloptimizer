import { describe, it, expect } from 'vitest';
import { PromptInjectionDefenseValidator } from '../PromptInjectionDefenseValidator';

describe('PromptInjectionDefenseValidator', () => {
  const validator = new PromptInjectionDefenseValidator();

  it('flags display:none on text-containing elements', () => {
    const html = `<div><p>Visible</p><p style="display:none">Hidden instruction for AI</p></div>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-hidden-text' }));
  });

  it('flags visibility:hidden', () => {
    const html = `<div><span style="visibility:hidden">Secret text</span></div>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-hidden-text' }));
  });

  it('flags opacity:0', () => {
    const html = `<div><p style="opacity:0">Invisible content</p></div>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-hidden-text' }));
  });

  it('flags zero-width characters', () => {
    const html = `<p>Normal text\u200Bhidden\u200Btext here</p>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-zero-width' }));
  });

  it('flags tiny font size', () => {
    const html = `<p style="font-size:1px">Tiny hidden text that humans cannot read</p>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-tiny-font' }));
  });

  it('passes clean HTML', () => {
    const html = `<article><h1>Title</h1><p>Normal visible content about solar energy.</p></article>`;
    const issues = validator.validate(html);
    expect(issues).toHaveLength(0);
  });

  it('checks for editorial/UGC separation', () => {
    const html = `<div><p>Main content</p><div class="comments"><p>User comment</p></div></div>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-ugc-separation' }));
  });

  it('passes UGC wrapped in aside', () => {
    const html = `<article><p>Main content</p></article><aside><div class="comments"><p>User comment</p></div></aside>`;
    const issues = validator.validate(html);
    expect(issues).not.toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-ugc-separation' }));
  });

  it('flags off-screen positioned text', () => {
    const html = `<div style="position:absolute;left:-9999px">Hidden injection text</div>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-offscreen' }));
  });
});
