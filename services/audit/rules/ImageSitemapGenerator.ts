// services/audit/rules/ImageSitemapGenerator.ts

/**
 * ImageSitemapGenerator
 *
 * Generates image sitemap entries from page content analysis.
 * Each image should have: loc, caption, geo_location (if applicable),
 * title, and license information.
 *
 * Also validates existing image sitemap entries for completeness.
 */

export interface ImageSitemapEntry {
  /** Image URL */
  loc: string;
  /** Image caption/description */
  caption?: string;
  /** Geographic location */
  geoLocation?: string;
  /** Image title */
  title?: string;
  /** License URL */
  license?: string;
}

export interface ImageSitemapIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class ImageSitemapGenerator {
  /**
   * Extract images from HTML and generate sitemap entries.
   */
  static extractImages(html: string, pageUrl?: string): ImageSitemapEntry[] {
    const entries: ImageSitemapEntry[] = [];
    const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      const fullTag = match[0];

      // Extract alt text for caption
      const altMatch = fullTag.match(/alt=["']([^"']*?)["']/i);
      const titleMatch = fullTag.match(/title=["']([^"']*?)["']/i);

      // Skip tiny images (icons, spacers)
      const widthMatch = fullTag.match(/width=["']?(\d+)/i);
      if (widthMatch && parseInt(widthMatch[1]) < 50) continue;

      // Skip data URIs and SVGs
      if (src.startsWith('data:') || src.endsWith('.svg')) continue;

      entries.push({
        loc: this.resolveUrl(src, pageUrl),
        caption: altMatch?.[1] || undefined,
        title: titleMatch?.[1] || altMatch?.[1] || undefined,
      });
    }

    return entries;
  }

  /**
   * Generate XML sitemap entries for images.
   */
  static generateSitemapXml(pageUrl: string, entries: ImageSitemapEntry[]): string {
    if (entries.length === 0) return '';

    let xml = `  <url>\n    <loc>${this.escapeXml(pageUrl)}</loc>\n`;

    for (const entry of entries) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${this.escapeXml(entry.loc)}</image:loc>\n`;
      if (entry.caption) {
        xml += `      <image:caption>${this.escapeXml(entry.caption)}</image:caption>\n`;
      }
      if (entry.geoLocation) {
        xml += `      <image:geo_location>${this.escapeXml(entry.geoLocation)}</image:geo_location>\n`;
      }
      if (entry.title) {
        xml += `      <image:title>${this.escapeXml(entry.title)}</image:title>\n`;
      }
      if (entry.license) {
        xml += `      <image:license>${this.escapeXml(entry.license)}</image:license>\n`;
      }
      xml += `    </image:image>\n`;
    }

    xml += `  </url>`;
    return xml;
  }

  /**
   * Validate image sitemap entries for completeness.
   */
  static validate(entries: ImageSitemapEntry[]): ImageSitemapIssue[] {
    const issues: ImageSitemapIssue[] = [];

    if (entries.length === 0) {
      issues.push({
        ruleId: 'img-sitemap-empty',
        severity: 'medium',
        title: 'No images found for sitemap',
        description: 'Page has no images suitable for image sitemap. Consider adding relevant images.',
        exampleFix: 'Add images that illustrate the content with descriptive alt text.',
      });
      return issues;
    }

    let missingCaptions = 0;
    let missingTitles = 0;
    let missingLicenses = 0;

    for (const entry of entries) {
      if (!entry.caption) missingCaptions++;
      if (!entry.title) missingTitles++;
      if (!entry.license) missingLicenses++;
    }

    if (missingCaptions > 0) {
      issues.push({
        ruleId: 'img-sitemap-caption',
        severity: 'medium',
        title: 'Images missing captions',
        description: `${missingCaptions} of ${entries.length} images lack captions in the sitemap.`,
        exampleFix: 'Add descriptive alt text to all images - this becomes the sitemap caption.',
      });
    }

    if (missingLicenses === entries.length) {
      issues.push({
        ruleId: 'img-sitemap-license',
        severity: 'low',
        title: 'No image license information',
        description: 'No images have license information. Add acquireLicensePage for licensed images.',
        exampleFix: 'Add license URLs to images, especially for original photography.',
      });
    }

    return issues;
  }

  private static resolveUrl(src: string, pageUrl?: string): string {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
      return src;
    }
    if (pageUrl) {
      try {
        return new URL(src, pageUrl).toString();
      } catch {
        return src;
      }
    }
    return src;
  }

  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
