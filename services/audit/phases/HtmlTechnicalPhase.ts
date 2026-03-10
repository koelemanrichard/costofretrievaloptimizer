/**
 * HTML Technical Phase Adapter
 *
 * Validates HTML tag structure, heading hierarchy, semantic HTML usage, and schema markup presence.
 * Covers on-page technical SEO checks at the HTML level.
 *
 * Rule 256: All images must have alt text.
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { HtmlNestingValidator } from '../rules/HtmlNestingValidator';
import { HtmlTechnicalValidator } from '../rules/HtmlTechnicalValidator';
import { HtmlStructureExtendedValidator } from '../rules/HtmlStructureExtendedValidator';
import { ImageMetadataValidator } from '../rules/ImageMetadataValidator';
import { PromptInjectionDefenseValidator } from '../rules/PromptInjectionDefenseValidator';
import { ImageProcessingService } from '../../imageProcessingService';

export class HtmlTechnicalPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'htmlTechnical';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    const html = this.extractHtml(content);
    if (html) {
      // Rule 256: All images must have alt text
      totalChecks++;
      const altIssues = this.checkAltText(html);
      findings.push(...altIssues);

      // Rules 242, 243, 251, 252, CoR-dom: HTML nesting checks
      totalChecks += 4;
      const nestingValidator = new HtmlNestingValidator();
      const sa = this.extractStructuralAnalysis(content);
      const nestingIssues = nestingValidator.validate(html, sa);
      for (const issue of nestingIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Proper HTML nesting ensures correct rendering and prevents parsing errors by search engines.',
          category: 'HTML Technical',
        }));
      }

      // Rules 233, 239, 244, 255, 258, 261: HTML technical checks
      totalChecks++;
      const techValidator = new HtmlTechnicalValidator();
      const techIssues = techValidator.validate(html);
      for (const issue of techIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'HTML structure affects how search engines parse and render content.',
          category: 'HTML Technical',
        }));
      }

      // Rules 245-250: Extended HTML structure checks
      totalChecks++;
      const structureValidator = new HtmlStructureExtendedValidator();
      const structureIssues = structureValidator.validate(html);
      for (const issue of structureIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Clean HTML structure ensures correct rendering and accessibility compliance.',
          category: 'HTML Technical',
        }));
      }

      // Image SEO validation via ImageProcessingService
      totalChecks++;
      const imgSrcRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
      let imgMatch;
      const imageSeoIssues: string[] = [];
      while ((imgMatch = imgSrcRegex.exec(html)) !== null) {
        const altM = imgMatch[0].match(/\balt=["']([^"']*)["']/i);
        const widthM = imgMatch[0].match(/\bwidth=["']?(\d+)/i);
        const heightM = imgMatch[0].match(/\bheight=["']?(\d+)/i);
        const validation = ImageProcessingService.validateForSeo({
          width: widthM ? parseInt(widthM[1]) : undefined,
          height: heightM ? parseInt(heightM[1]) : undefined,
          format: imgMatch[1].split('.').pop(),
          exif: {},
          iptc: altM ? { description: altM[1] } : {},
        });
        if (validation.issues.length > 0) {
          imageSeoIssues.push(...validation.issues.map(i => `${imgMatch![1]}: ${i}`));
        }
      }
      if (imageSeoIssues.length > 0) {
        findings.push(this.createFinding({
          ruleId: 'rule-img-seo',
          severity: 'medium',
          title: 'Image SEO issues detected',
          description: `${imageSeoIssues.length} image SEO issue(s): ${imageSeoIssues.slice(0, 3).join('; ')}${imageSeoIssues.length > 3 ? '...' : ''}`,
          whyItMatters: 'Optimized images improve page speed, accessibility, and image search visibility.',
          category: 'HTML Technical',
        }));
      }

      // Prompt injection defense checks
      totalChecks++;
      const injectionValidator = new PromptInjectionDefenseValidator();
      const injectionIssues = injectionValidator.validate(html);
      for (const issue of injectionIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Hidden or obfuscated text can be exploited as prompt injection vectors by AI crawlers and LLM-based search systems.',
          category: 'HTML Technical',
        }));
      }

      // Rules 260-267: Image metadata checks
      totalChecks++;
      const imageValidator = new ImageMetadataValidator();
      const imageIssues = imageValidator.validate(html);
      for (const issue of imageIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Image metadata affects page performance, accessibility, and image search visibility.',
          category: 'HTML Technical',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractHtml(content: unknown): string | null {
    if (!content) return null;
    if (typeof content === 'string') return content;
    if (typeof content === 'object' && 'html' in (content as Record<string, unknown>)) {
      return (content as Record<string, unknown>).html as string;
    }
    return null;
  }

  private extractStructuralAnalysis(content: unknown): import('../../../types').StructuralAnalysis | undefined {
    if (!content || typeof content !== 'object') return undefined;
    return (content as Record<string, unknown>).structuralAnalysis as import('../../../types').StructuralAnalysis | undefined;
  }

  /**
   * Rule 256: Check that all <img> tags have non-empty alt attributes.
   */
  checkAltText(html: string): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const imgRegex = /<img\b[^>]*>/gi;
    let match;
    const missingAlt: string[] = [];
    const emptyAlt: string[] = [];

    while ((match = imgRegex.exec(html)) !== null) {
      const imgTag = match[0];
      const altMatch = imgTag.match(/\balt\s*=\s*["']([^"']*)["']/i);
      const srcMatch = imgTag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      const src = srcMatch?.[1] || 'unknown';

      if (!altMatch) {
        missingAlt.push(src);
      } else if (altMatch[1].trim() === '') {
        emptyAlt.push(src);
      }
    }

    if (missingAlt.length > 0) {
      findings.push(this.createFinding({
        ruleId: 'rule-256-missing',
        severity: 'critical',
        title: 'Images missing alt attribute',
        description: `${missingAlt.length} image(s) have no alt attribute: ${missingAlt.slice(0, 3).join(', ')}${missingAlt.length > 3 ? '...' : ''}`,
        whyItMatters: 'Alt text is essential for accessibility and helps search engines understand image content.',
        currentValue: `${missingAlt.length} images without alt`,
        expectedValue: 'All images should have descriptive alt text',
        exampleFix: 'Add alt="descriptive text" to each img tag',
        category: 'HTML Technical',
        estimatedImpact: 'high',
      }));
    }

    if (emptyAlt.length > 0) {
      findings.push(this.createFinding({
        ruleId: 'rule-256-empty',
        severity: 'high',
        title: 'Images with empty alt text',
        description: `${emptyAlt.length} image(s) have empty alt attributes: ${emptyAlt.slice(0, 3).join(', ')}${emptyAlt.length > 3 ? '...' : ''}`,
        whyItMatters: 'Empty alt text is only appropriate for decorative images. Content images need descriptive alt text.',
        currentValue: `${emptyAlt.length} images with alt=""`,
        expectedValue: 'Descriptive alt text for non-decorative images',
        category: 'HTML Technical',
        estimatedImpact: 'medium',
      }));
    }

    return findings;
  }
}
