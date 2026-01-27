/**
 * StandaloneCssGenerator
 *
 * Generates standalone CSS from extracted brand components.
 * Preserves literal CSS values (no abstraction to tokens/variables).
 * Creates dual class names: original + brand-prefixed.
 */

import type {
  ExtractedComponent,
  ExtractedTokens,
  SynthesizedComponent
} from '../../types/brandExtraction';

export class StandaloneCssGenerator {
  /**
   * Generate standalone CSS from extracted and synthesized components.
   *
   * @param components - Extracted components with literal CSS
   * @param synthesized - AI-synthesized components for missing patterns
   * @param tokens - Extracted design tokens for :root variables
   * @returns Complete CSS string ready for use
   */
  generate(
    components: ExtractedComponent[],
    synthesized: SynthesizedComponent[],
    tokens: ExtractedTokens
  ): string {
    const sections: string[] = [];

    // Header comment
    sections.push('/* Auto-generated Brand Styles */');
    sections.push('');

    // Base tokens as CSS custom properties
    sections.push('/* Base tokens */');
    sections.push(this.generateRootTokens(tokens));
    sections.push('');

    // Extracted components - preserve literal CSS
    for (const component of components) {
      sections.push(`/* Component: ${component.visualDescription || 'Unnamed'} */`);
      sections.push(this.generateComponentCss(component));
      sections.push('');
    }

    // Synthesized components
    for (const synth of synthesized) {
      sections.push(`/* Component: ${synth.visualDescription} (synthesized) */`);
      sections.push(synth.generatedCss);
      sections.push('');
    }

    return sections.join('\n').trim();
  }

  /**
   * Generate :root CSS custom properties from tokens.
   */
  private generateRootTokens(tokens: ExtractedTokens): string {
    const properties: string[] = [];

    // Colors
    if (tokens.colors?.values) {
      tokens.colors.values.forEach((color, index) => {
        const varName = color.usage ? `--color-${color.usage.replace(/\s+/g, '-').toLowerCase()}` : `--color-${index}`;
        properties.push(`  ${varName}: ${color.hex};`);
      });
    }

    // Typography
    if (tokens.typography) {
      if (tokens.typography.headings) {
        properties.push(`  --font-heading: ${tokens.typography.headings.fontFamily};`);
        properties.push(`  --font-weight-heading: ${tokens.typography.headings.fontWeight};`);
      }
      if (tokens.typography.body) {
        properties.push(`  --font-body: ${tokens.typography.body.fontFamily};`);
        properties.push(`  --font-weight-body: ${tokens.typography.body.fontWeight};`);
        properties.push(`  --line-height-body: ${tokens.typography.body.lineHeight};`);
      }
    }

    // Spacing
    if (tokens.spacing) {
      if (tokens.spacing.sectionGap) properties.push(`  --spacing-section: ${tokens.spacing.sectionGap};`);
      if (tokens.spacing.cardPadding) properties.push(`  --spacing-card: ${tokens.spacing.cardPadding};`);
      if (tokens.spacing.contentWidth) properties.push(`  --content-width: ${tokens.spacing.contentWidth};`);
    }

    // Shadows
    if (tokens.shadows) {
      if (tokens.shadows.card) properties.push(`  --shadow-card: ${tokens.shadows.card};`);
      if (tokens.shadows.elevated) properties.push(`  --shadow-elevated: ${tokens.shadows.elevated};`);
    }

    // Borders
    if (tokens.borders) {
      if (tokens.borders.radiusSmall) properties.push(`  --radius-small: ${tokens.borders.radiusSmall};`);
      if (tokens.borders.radiusMedium) properties.push(`  --radius-medium: ${tokens.borders.radiusMedium};`);
      if (tokens.borders.radiusLarge) properties.push(`  --radius-large: ${tokens.borders.radiusLarge};`);
      if (tokens.borders.defaultColor) properties.push(`  --border-color: ${tokens.borders.defaultColor};`);
    }

    return `:root {\n${properties.join('\n')}\n}`;
  }

  /**
   * Generate CSS for an extracted component.
   * Creates dual class selectors: original class AND brand-prefixed class.
   * Preserves literal CSS values - NO abstraction.
   */
  private generateComponentCss(component: ExtractedComponent): string {
    const { literalCss, theirClassNames, componentType } = component;

    // If we have literal CSS, transform it
    if (literalCss && literalCss.trim()) {
      let transformedCss = literalCss;

      // For each of their class names, add a brand-prefixed alternative
      if (theirClassNames?.length) {
        for (const className of theirClassNames) {
          const brandClassName = `brand-${className}`;

          // Match the class selector and create a dual selector
          // .hero { ... } becomes .hero, .brand-hero { ... }
          const classRegex = new RegExp(`\\.${this.escapeRegex(className)}\\s*\\{`, 'g');
          transformedCss = transformedCss.replace(classRegex, `.${className}, .${brandClassName} {`);
        }
      }

      return transformedCss;
    }

    // FALLBACK: Generate baseline CSS when literal extraction failed
    // Use CSS custom properties from tokens for brand consistency
    return this.generateFallbackComponentCss(component);
  }

  /**
   * Generate fallback CSS for components when literal extraction failed.
   * Uses CSS custom properties for brand consistency.
   */
  private generateFallbackComponentCss(component: ExtractedComponent): string {
    const type = component.componentType || 'section';
    const classNames = component.theirClassNames?.filter(c => c && c.trim()) || [];
    const selector = classNames.length > 0
      ? `.${classNames.join(', .')}, .brand-${type}`
      : `.brand-${type}`;

    // Generate semantic CSS based on component type
    switch (type.toLowerCase()) {
      case 'hero':
        return `${selector} {
  padding: var(--spacing-section, 3rem) var(--spacing-card, 1.5rem);
  background: linear-gradient(135deg, var(--color-primary, #1a1a2e) 0%, var(--color-secondary, #4a4a68) 100%);
  color: white;
  text-align: center;
}
${selector} .brand-heading {
  font-family: var(--font-heading);
  font-weight: var(--font-weight-heading, 700);
  font-size: 2.5rem;
  margin-bottom: 1rem;
}`;

      case 'cta':
        return `${selector} {
  padding: var(--spacing-card, 1.5rem);
  background: var(--color-primary, #1a1a2e);
  color: white;
  border-radius: var(--radius-medium, 8px);
  text-align: center;
}
${selector} a, ${selector} button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: var(--color-accent, #3b82f6);
  color: white;
  border-radius: var(--radius-small, 4px);
  text-decoration: none;
  font-weight: 600;
}`;

      case 'article':
      case 'content':
      case 'section':
      default:
        return `${selector} {
  max-width: var(--content-width, 800px);
  margin: 0 auto;
  padding: var(--spacing-card, 1.5rem);
}
${selector} .brand-heading {
  font-family: var(--font-heading);
  font-weight: var(--font-weight-heading, 700);
  font-size: 1.5rem;
  color: var(--color-primary, #1a1a2e);
  margin-bottom: 1rem;
}
${selector} .brand-content {
  font-family: var(--font-body);
  line-height: var(--line-height-body, 1.6);
  color: var(--color-secondary, #4a4a68);
}
${selector} .brand-content p {
  margin-bottom: 1rem;
}
${selector} .brand-content strong {
  color: var(--color-primary, #1a1a2e);
  font-weight: 600;
}
${selector} .brand-content a {
  color: var(--color-accent, #3b82f6);
  text-decoration: underline;
}
${selector} .brand-content ul, ${selector} .brand-content ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
}
${selector} .brand-content li {
  margin-bottom: 0.5rem;
}`;
    }
  }

  /**
   * Escape special regex characters in a string.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
