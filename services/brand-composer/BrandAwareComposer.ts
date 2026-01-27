/**
 * BrandAwareComposer
 *
 * Composes article content using extracted brand components.
 * Produces styled HTML that matches the brand's visual identity
 * while preserving all SEO semantic markup.
 */

import { ComponentLibrary } from '../brand-extraction/ComponentLibrary';
import { ContentMatcher, type ContentBlock } from './ContentMatcher';
import { StandaloneCssGenerator } from './StandaloneCssGenerator';
import type {
  ExtractedComponent,
  ExtractedTokens,
  SynthesizedComponent,
  BrandReplicationOutput
} from '../../types/brandExtraction';

/**
 * Article section structure
 */
export interface ArticleSection {
  id: string;
  heading: string;
  headingLevel: number;
  content: string;
}

/**
 * Article content structure for composition
 */
export interface ArticleContent {
  title: string;
  sections: ArticleSection[];
}

/**
 * Constructor options for BrandAwareComposer
 */
export interface BrandAwareComposerOptions {
  projectId: string;
  aiProvider: string;
  apiKey: string;
}

/**
 * Fallback tokens when no brand extraction exists
 */
const FALLBACK_TOKENS: ExtractedTokens = {
  id: 'fallback',
  projectId: '',
  colors: {
    values: [
      { hex: '#1a1a2e', usage: 'primary', frequency: 1 },
      { hex: '#4a4a68', usage: 'secondary', frequency: 1 },
      { hex: '#f5f5f7', usage: 'background', frequency: 1 }
    ]
  },
  typography: {
    headings: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 700
    },
    body: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 400,
      lineHeight: 1.6
    }
  },
  spacing: {
    sectionGap: '2rem',
    cardPadding: '1.5rem',
    contentWidth: '800px'
  },
  shadows: {
    card: '0 2px 4px rgba(0,0,0,0.1)',
    elevated: '0 4px 12px rgba(0,0,0,0.15)'
  },
  borders: {
    radiusSmall: '4px',
    radiusMedium: '8px',
    radiusLarge: '12px',
    defaultColor: '#e0e0e0'
  },
  extractedFrom: [],
  extractedAt: new Date().toISOString()
};

/**
 * Fallback CSS for when no components are available
 */
const FALLBACK_CSS = `
/* Fallback Brand Styles */
.brand-article {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #1a1a2e;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.brand-article h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #1a1a2e;
}

.brand-article h2 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #1a1a2e;
}

.brand-article h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #4a4a68;
}

.brand-article p {
  margin-bottom: 1rem;
}

.brand-article .brand-section {
  margin-bottom: 2rem;
}
`;

export class BrandAwareComposer {
  private projectId: string;
  private aiProvider: string;
  private apiKey: string;
  private componentLibrary: ComponentLibrary;
  private cssGenerator: StandaloneCssGenerator;

  constructor(options: BrandAwareComposerOptions) {
    this.projectId = options.projectId;
    this.aiProvider = options.aiProvider;
    this.apiKey = options.apiKey;
    this.componentLibrary = new ComponentLibrary(options.projectId);
    this.cssGenerator = new StandaloneCssGenerator();
  }

  /**
   * Convert markdown content to HTML.
   * Simple markdown parser for common patterns.
   */
  private markdownToHtml(markdown: string): string {
    if (!markdown) return '';

    let html = markdown;

    // Convert markdown headings (but preserve heading structure)
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Convert bold (**text** or __text__)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Convert italic (*text* or _text_) - be careful not to match already converted bold
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

    // Convert links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Convert unordered lists
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
    // Wrap consecutive li elements in ul
    html = html.replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, (match) => {
      return '<ul>' + match + '</ul>';
    });

    // Convert ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Convert paragraphs (double newlines)
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs
      .map(p => {
        const trimmed = p.trim();
        // Don't wrap if already wrapped in block elements
        if (
          trimmed.startsWith('<h') ||
          trimmed.startsWith('<ul') ||
          trimmed.startsWith('<ol') ||
          trimmed.startsWith('<li') ||
          trimmed.startsWith('<p') ||
          trimmed.startsWith('<div') ||
          trimmed.startsWith('<section') ||
          trimmed.startsWith('<img') ||
          trimmed.startsWith('<table')
        ) {
          return trimmed;
        }
        if (trimmed) {
          return `<p>${trimmed}</p>`;
        }
        return '';
      })
      .filter(p => p)
      .join('\n');

    return html;
  }

  /**
   * Compose article content into brand-styled HTML.
   *
   * @param content - The article content to compose
   * @param directComponents - Optional: components passed directly (bypasses database)
   * @returns Brand-styled HTML with standalone CSS
   */
  async compose(
    content: ArticleContent,
    directComponents?: ExtractedComponent[]
  ): Promise<BrandReplicationOutput> {
    const startTime = Date.now();

    // Use direct components if provided, otherwise load from database
    const components = directComponents && directComponents.length > 0
      ? directComponents
      : await this.componentLibrary.getAll();

    console.log('[BrandAwareComposer] Using', components.length, 'components',
      directComponents ? '(DIRECT)' : '(from database)');

    const contentMatcher = new ContentMatcher(components);

    // Track components used and extractions
    const componentsUsed: BrandReplicationOutput['componentsUsed'] = [];
    const extractionsUsed = new Set<string>();
    let synthesizedCount = 0;

    // Build HTML sections
    const htmlSections: string[] = [];

    // Add title as H1
    htmlSections.push(this.renderTitle(content.title));

    // Process each section
    for (const section of content.sections) {
      // CRITICAL: Convert markdown content to HTML before composing
      const htmlContent = this.markdownToHtml(section.content);

      const contentBlock: ContentBlock = {
        type: 'section',
        heading: section.heading,
        headingLevel: section.headingLevel,
        body: htmlContent // Use converted HTML
      };

      // Create a copy of the section with HTML content
      const htmlSection: ArticleSection = {
        ...section,
        content: htmlContent
      };

      // Try to match to a component
      const match = await contentMatcher.matchContentToComponent(contentBlock);

      if (match) {
        // Use extracted component
        const renderedSection = this.renderWithComponent(htmlSection, match.component);
        htmlSections.push(renderedSection);

        componentsUsed.push({
          id: match.component.id,
          type: 'extracted',
          theirClasses: match.component.theirClassNames,
          ourClasses: match.component.theirClassNames.map(c => `brand-${c}`)
        });

        extractionsUsed.add(match.component.extractionId);
      } else {
        // Use fallback styling
        const renderedSection = this.renderWithFallback(htmlSection);
        htmlSections.push(renderedSection);
        synthesizedCount++;
      }
    }

    // Wrap in brand-article
    const html = `<article class="brand-article">\n${htmlSections.join('\n')}\n</article>`;

    // Generate CSS
    const standaloneCss = components.length > 0
      ? this.cssGenerator.generate(components, [], FALLBACK_TOKENS)
      : FALLBACK_CSS;

    const renderTime = Date.now() - startTime;

    return {
      html,
      standaloneCss,
      componentsUsed,
      metadata: {
        brandProjectId: this.projectId,
        extractionsUsed: Array.from(extractionsUsed),
        synthesizedCount,
        renderTime
      }
    };
  }

  /**
   * Render the article title as H1.
   */
  private renderTitle(title: string): string {
    return `  <h1>${this.escapeHtml(title)}</h1>`;
  }

  /**
   * Render a section using LITERAL HTML from extracted component.
   * This is the key to design-agency quality output - we use the ACTUAL
   * HTML structure from the target website, not a template.
   */
  private renderWithComponent(section: ArticleSection, component: ExtractedComponent): string {
    // CRITICAL: Use the literal HTML from the extracted component
    // This preserves the exact structure and styling from the target site
    const html = component.literalHtml;

    // Check if we have usable literal HTML (not just a comment or placeholder)
    const hasUsableLiteralHtml = html &&
      html.trim() !== '' &&
      !html.trim().startsWith('<!--') &&
      html.length > 100 && // Must be substantial HTML
      (html.includes('<') && html.includes('>'));

    if (!hasUsableLiteralHtml) {
      // Fallback if no literal HTML available
      // But still apply brand class names for styling
      console.log('[BrandAwareComposer] No usable literal HTML for component:', component.componentType);
      return this.renderWithBrandStyling(section, component);
    }

    // Inject content into the literal HTML structure
    // Strategy: Find the content areas and replace them
    let result = this.injectContentIntoLiteralHtml(html, section, component);

    // Add SEO semantic layer (wrap in semantic element if not already)
    if (!result.includes('<section') && !result.includes('<article')) {
      const classNames = component.theirClassNames.join(' ');
      result = `<section class="${classNames} brand-section" data-brand-component="${component.componentType}">\n${result}\n</section>`;
    }

    return result;
  }

  /**
   * Render a section with brand styling classes but without literal HTML.
   * This is used when component extraction succeeded (got classes) but
   * literal HTML extraction failed.
   */
  private renderWithBrandStyling(section: ArticleSection, component: ExtractedComponent): string {
    const headingTag = `h${section.headingLevel}`;
    const classNames = component.theirClassNames.filter(c => c && c.trim()).join(' ');
    const componentType = component.componentType || 'section';

    // Use brand classes but with semantic HTML structure
    return `<section class="${classNames} brand-section brand-${componentType}" data-brand-component="${componentType}">
    <${headingTag} class="brand-heading">${this.escapeHtml(section.heading)}</${headingTag}>
    <div class="brand-content">
      ${section.content}
    </div>
  </section>`;
  }

  /**
   * Inject article content into literal HTML structure.
   * Uses multiple strategies to find and replace content areas.
   */
  private injectContentIntoLiteralHtml(html: string, section: ArticleSection, component: ExtractedComponent): string {
    const headingTag = `h${section.headingLevel}`;

    // Strategy 1: Use content slots if defined
    if (component.contentSlots && component.contentSlots.length > 0) {
      html = this.injectUsingSlots(html, section, component.contentSlots);
    }

    // Strategy 2: Replace heading patterns
    // Match any h1-h6 and replace with our heading (preserving the tag level from original)
    const headingPattern = /<h([1-6])([^>]*)>([^<]*)<\/h\1>/gi;
    let headingReplaced = false;

    html = html.replace(headingPattern, (match, level, attrs, _text) => {
      if (!headingReplaced) {
        headingReplaced = true;
        // Use the component's heading level for structure, our content
        return `<h${level}${attrs}>${this.escapeHtml(section.heading)}</h${level}>`;
      }
      // Remove subsequent headings (they're from the source page's content)
      return '';
    });

    // If no heading was found, prepend one
    if (!headingReplaced) {
      const firstTag = html.match(/^(\s*<[^>]+>)/);
      if (firstTag) {
        html = html.replace(firstTag[0], `${firstTag[0]}\n    <${headingTag}>${this.escapeHtml(section.heading)}</${headingTag}>`);
      }
    }

    // Strategy 3: Replace paragraph content
    // Find the main content area (after heading) and inject our content
    const paragraphPattern = /<p([^>]*)>[\s\S]*?<\/p>/gi;
    let contentInjected = false;

    html = html.replace(paragraphPattern, (match, attrs) => {
      if (!contentInjected) {
        contentInjected = true;
        // Replace first paragraph with our content
        // Our content may contain multiple paragraphs, preserve structure
        return section.content;
      }
      // Remove subsequent paragraphs (they're from the source page's content)
      return '';
    });

    // If no paragraph was replaced, append content before closing tag
    if (!contentInjected) {
      const closingTag = html.match(/<\/(section|div|article)>\s*$/i);
      if (closingTag) {
        html = html.replace(closingTag[0], `  ${section.content}\n${closingTag[0]}`);
      } else {
        html += `\n${section.content}`;
      }
    }

    return html;
  }

  /**
   * Inject content using defined content slots.
   */
  private injectUsingSlots(html: string, section: ArticleSection, slots: import('../../types/brandExtraction').ContentSlot[]): string {
    for (const slot of slots) {
      // Find the slot selector in HTML and inject content
      if (slot.selector && slot.selector !== '*') {
        // If slot has a specific selector, try to find and fill it
        const selectorPattern = new RegExp(
          `(<[^>]*class="[^"]*${this.escapeRegex(slot.selector)}[^"]*"[^>]*>)([\\s\\S]*?)(<\\/[^>]+>)`,
          'i'
        );

        html = html.replace(selectorPattern, (match, openTag, _content, closeTag) => {
          let replacement = '';
          switch (slot.name) {
            case 'heading':
            case 'title':
              replacement = this.escapeHtml(section.heading);
              break;
            case 'content':
            case 'body':
            case 'text':
              replacement = section.content;
              break;
            default:
              replacement = section.content;
          }
          return `${openTag}${replacement}${closeTag}`;
        });
      }
    }
    return html;
  }

  /**
   * Escape regex special characters.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Render a section with fallback styling.
   * Preserves SEO semantic markup from the content.
   */
  private renderWithFallback(section: ArticleSection): string {
    const headingTag = `h${section.headingLevel}`;

    return `  <section class="brand-section">
    <${headingTag}>${this.escapeHtml(section.heading)}</${headingTag}>
    ${section.content}
  </section>`;
  }

  /**
   * Escape HTML special characters in text.
   * Used for headings and titles to prevent XSS.
   */
  private escapeHtml(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return text.replace(/[&<>"']/g, char => escapeMap[char]);
  }
}
