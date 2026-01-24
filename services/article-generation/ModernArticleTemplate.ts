
import { ProcessedDesignSystem } from '../design-analysis/StyleExtractor';
import { CssGenerator } from './CssGenerator';

export interface ArticleData {
    title: string;
    metaDescription: string;
    content: string; // The HTML body content (headings, paragraphs, etc.)
    author?: string;
    publishedDate?: string;
}

export const ModernArticleTemplate = {
    /**
     * Generates the full HTML document with styling
     */
    generateHtml(article: ArticleData, designSystem: ProcessedDesignSystem): string {
        const css = CssGenerator.generateCss(designSystem);

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title}</title>
    <meta name="description" content="${article.metaDescription}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <!-- Note: We are not auto-injecting Google Fonts yet, relying on system fallbacks or pre-existing imports if available -->
    <style>
        ${css}
    </style>
</head>
<body>

    <header class="article-header">
        <h1>${article.title}</h1>
        ${article.author ? `<p class="meta">By ${article.author} | ${article.publishedDate || new Date().toLocaleDateString()}</p>` : ''}
    </header>

    <main class="article-container">
        <article>
            ${article.content}
        </article>
    </main>

    <footer>
        <div class="article-container">
            <p>&copy; ${new Date().getFullYear()} ${designSystem.name}. All rights reserved.</p>
        </div>
    </footer>

</body>
</html>
    `.trim();
    }
};
