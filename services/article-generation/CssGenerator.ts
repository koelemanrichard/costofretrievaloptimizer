
import { ProcessedDesignSystem } from '../design-analysis/StyleExtractor';

export const CssGenerator = {
    /**
     * Generates the complete CSS block for the article
     */
    generateCss(designSystem: ProcessedDesignSystem): string {
        return `
      :root {
        ${designSystem.cssVariables}
        --spacing-unit: 1rem;
        --content-width: 800px;
        --header-height: 70px;
      }

      /* Reset & Base */
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        background-color: var(--c-bg);
        color: var(--c-text);
        font-family: var(--f-body);
        line-height: 1.7;
        font-size: var(--base-size, 16px);
        -webkit-font-smoothing: antialiased;
        overflow-x: hidden;
      }

      /* Typography */
      h1, h2, h3, h4, h5, h6 {
        font-family: var(--f-heading);
        color: var(--c-secondary); /* Usually dark / brand color */
        line-height: 1.25;
        margin-bottom: 1rem;
        margin-top: 2rem;
      }

      h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; }
      h2 { font-size: 2rem; font-weight: 700; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border, #eee); }
      h3 { font-size: 1.5rem; font-weight: 600; }
      
      p { margin-bottom: 1.5rem; }
      
      a { color: var(--c-primary); text-decoration: none; transition: all 0.2s; }
      a:hover { text-decoration: underline; opacity: 0.8; }

      /* Components */
      .btn-primary {
        display: inline-block;
        background-color: var(--btn-bg);
        color: var(--btn-text);
        padding: 0.75rem 1.5rem;
        border-radius: var(--r-btn);
        font-weight: 600;
        text-decoration: none;
        transition: transform 0.1s;
        border: none;
        cursor: pointer;
      }
      .btn-primary:active { transform: scale(0.98); }

      .card {
        background-color: var(--surface, #fff);
        border-radius: var(--r-card);
        padding: 2rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        margin-bottom: 2rem;
      }

      /* Layout */
      .article-container {
        max-width: var(--content-width);
        margin: 0 auto;
        padding: 2rem;
      }

      header.article-header {
        text-align: center;
        padding: 4rem 0;
        max-width: 900px;
        margin: 0 auto;
      }

      /* Table of Contents */
      .toc {
        background: var(--c-bg);
        border: 1px solid var(--border, #eee);
        border-left: 4px solid var(--c-primary);
        padding: 1.5rem;
        margin: 2rem 0;
        border-radius: 4px;
      }
      .toc h3 { margin-top: 0; font-size: 1.25rem; }
      .toc ul { list-style: none; padding-left: 0; }
      .toc li { margin-bottom: 0.5rem; }
      .toc a { color: var(--c-text); opacity: 0.8; }
      .toc a:hover { color: var(--c-primary); opacity: 1; }

      /* Responsive */
      @media (max-width: 768px) {
        h1 { font-size: 2rem; }
        .article-container { padding: 1rem; }
      }
      
      /* Images */
      img {
        max-width: 100%;
        height: auto;
        border-radius: var(--r-card);
        margin: 1.5rem 0;
      }
      
      blockquote {
        border-left: 4px solid var(--c-accent);
        background: rgba(0,0,0,0.03);
        padding: 1.5rem;
        margin: 2rem 0;
        font-style: italic;
      }
    `;
    }
};
