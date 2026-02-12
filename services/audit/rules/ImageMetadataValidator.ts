/**
 * ImageMetadataValidator
 *
 * Validates image-related metadata and best practices in HTML content.
 * Focuses on performance, accessibility, and SEO optimization for images.
 *
 * Rules implemented:
 *   260 - Next-gen image formats (WebP, AVIF, SVG preferred)
 *   261 - Width/height attributes to prevent CLS
 *   262 - Image file size hint (detect potentially large file names)
 *   263 - Responsive images (srcset or <picture> for responsive serving)
 *   264 - Descriptive file names (not generic like IMG_001.jpg)
 *   265 - Lazy loading (images below the fold should have loading="lazy")
 *   266 - Decorative images (alt="" should have role="presentation")
 *   267 - Image captions (<img> inside <figure> should have <figcaption>)
 */

export interface ImageMetadataIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

/** Patterns indicating non-optimized legacy image formats. */
const LEGACY_FORMAT_PATTERN = /\.(jpe?g|png|gif|bmp|tiff?)(\?[^"']*)?$/i;

/** Patterns indicating generic / non-descriptive file names. */
const GENERIC_FILENAME_PATTERNS = [
  /^img[-_]?\d+/i,
  /^image[-_]?\d*/i,
  /^photo[-_]?\d*/i,
  /^screenshot[-_]?\d*/i,
  /^picture[-_]?\d*/i,
  /^DSC[-_]?\d+/i,
  /^DCIM[-_]?\d+/i,
  /^untitled/i,
  /^file[-_]?\d*/i,
];

/** Patterns in filenames that suggest uncompressed / large images. */
const LARGE_FILE_PATTERNS = [
  /original/i,
  /full[-_]?size/i,
  /uncompressed/i,
  /raw[-_]?/i,
  /hi[-_]?res/i,
  /high[-_]?resolution/i,
];

export class ImageMetadataValidator {
  /**
   * Run all image metadata checks against the provided HTML string.
   * Returns an array of issues found (empty array = clean).
   */
  validate(html: string): ImageMetadataIssue[] {
    const issues: ImageMetadataIssue[] = [];

    // Parse all <img> tags once for shared use across rules
    const imgTags = this.extractImgTags(html);

    if (imgTags.length === 0) return issues;

    this.checkNextGenFormats(imgTags, issues);         // Rule 260
    this.checkDimensions(imgTags, issues);              // Rule 261
    this.checkFileSizeHints(imgTags, issues);           // Rule 262
    this.checkResponsiveImages(imgTags, html, issues);  // Rule 263
    this.checkDescriptiveFileNames(imgTags, issues);    // Rule 264
    this.checkLazyLoading(imgTags, issues);             // Rule 265
    this.checkDecorativeImages(imgTags, issues);        // Rule 266
    this.checkImageCaptions(html, issues);              // Rule 267

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Extract all <img> tag strings from the HTML. */
  private extractImgTags(html: string): string[] {
    const pattern = /<img\b[^>]*\/?>/gi;
    return html.match(pattern) || [];
  }

  /** Extract the src attribute value from an <img> tag. */
  private getSrc(imgTag: string): string | null {
    const match = imgTag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  /** Extract just the filename from a src path/URL. */
  private getFilename(src: string): string {
    // Remove query params and hash
    const clean = src.split(/[?#]/)[0];
    // Get the last path segment
    const parts = clean.split('/');
    return parts[parts.length - 1] || '';
  }

  // ---------------------------------------------------------------------------
  // Rule 260: Next-gen image formats
  // ---------------------------------------------------------------------------

  private checkNextGenFormats(
    imgTags: string[],
    issues: ImageMetadataIssue[]
  ): void {
    const legacyImages: string[] = [];

    for (const tag of imgTags) {
      const src = this.getSrc(tag);
      if (src && LEGACY_FORMAT_PATTERN.test(src)) {
        legacyImages.push(this.getFilename(src));
      }
    }

    if (legacyImages.length > 0) {
      issues.push({
        ruleId: 'rule-260',
        severity: 'medium',
        title: 'Legacy image formats detected',
        description:
          `Found ${legacyImages.length} image(s) using legacy formats (JPG, PNG, GIF). ` +
          'Next-gen formats like WebP and AVIF offer significantly better compression ' +
          'with comparable quality, improving page load speed and Core Web Vitals.',
        affectedElement: legacyImages.slice(0, 5).join(', '),
        exampleFix:
          'Convert images to WebP or AVIF format, or use <picture> with fallbacks: ' +
          '<picture><source srcset="image.avif" type="image/avif"><source srcset="image.webp" ' +
          'type="image/webp"><img src="image.jpg" alt="..."></picture>',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 261: Width/height attributes
  // ---------------------------------------------------------------------------

  private checkDimensions(
    imgTags: string[],
    issues: ImageMetadataIssue[]
  ): void {
    let missingCount = 0;

    for (const tag of imgTags) {
      const hasWidth = /\bwidth\s*=/i.test(tag);
      const hasHeight = /\bheight\s*=/i.test(tag);
      if (!hasWidth || !hasHeight) {
        missingCount++;
      }
    }

    if (missingCount > 0) {
      issues.push({
        ruleId: 'rule-261',
        severity: 'medium',
        title: 'Images missing width/height attributes',
        description:
          `${missingCount} image(s) lack explicit width and/or height attributes. ` +
          'Without dimensions, the browser cannot reserve space before the image loads, ' +
          'causing Cumulative Layout Shift (CLS) which negatively impacts Core Web Vitals.',
        exampleFix:
          'Add width and height attributes to all <img> tags: ' +
          '<img src="photo.webp" alt="..." width="800" height="600">',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 262: Image file size hint
  // ---------------------------------------------------------------------------

  private checkFileSizeHints(
    imgTags: string[],
    issues: ImageMetadataIssue[]
  ): void {
    const suspectImages: string[] = [];

    for (const tag of imgTags) {
      const src = this.getSrc(tag);
      if (!src) continue;
      const filename = this.getFilename(src);

      for (const pattern of LARGE_FILE_PATTERNS) {
        if (pattern.test(filename)) {
          suspectImages.push(filename);
          break;
        }
      }
    }

    if (suspectImages.length > 0) {
      issues.push({
        ruleId: 'rule-262',
        severity: 'low',
        title: 'Potentially unoptimized images detected',
        description:
          `Found ${suspectImages.length} image(s) with filenames suggesting unoptimized ` +
          'versions (containing "original", "full-size", "uncompressed", etc.). ' +
          'These may be unnecessarily large and should be compressed for web delivery.',
        affectedElement: suspectImages.slice(0, 5).join(', '),
        exampleFix:
          'Compress and resize images for web delivery. Use tools like Squoosh, ' +
          'ImageOptim, or build-time optimization plugins.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 263: Responsive images
  // ---------------------------------------------------------------------------

  private checkResponsiveImages(
    imgTags: string[],
    html: string,
    issues: ImageMetadataIssue[]
  ): void {
    // Count images inside <picture> elements (they are responsive by design)
    const pictureImgCount = (html.match(/<picture[\s\S]*?<\/picture>/gi) || []).length;

    let noSrcset = 0;

    for (const tag of imgTags) {
      const hasSrcset = /\bsrcset\s*=/i.test(tag);
      if (!hasSrcset) {
        noSrcset++;
      }
    }

    // Subtract picture elements (those images are responsive via <source>)
    const nonResponsive = Math.max(0, noSrcset - pictureImgCount);

    if (nonResponsive > 0) {
      issues.push({
        ruleId: 'rule-263',
        severity: 'medium',
        title: 'Images missing responsive serving',
        description:
          `${nonResponsive} image(s) lack srcset attributes and are not inside <picture> ` +
          'elements. Responsive images serve appropriately sized files to different devices, ' +
          'reducing bandwidth on mobile and improving page speed.',
        exampleFix:
          'Add srcset with multiple sizes: <img src="photo-800.webp" ' +
          'srcset="photo-400.webp 400w, photo-800.webp 800w, photo-1200.webp 1200w" ' +
          'sizes="(max-width: 600px) 400px, 800px" alt="...">',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 264: Descriptive file names
  // ---------------------------------------------------------------------------

  private checkDescriptiveFileNames(
    imgTags: string[],
    issues: ImageMetadataIssue[]
  ): void {
    const genericImages: string[] = [];

    for (const tag of imgTags) {
      const src = this.getSrc(tag);
      if (!src) continue;
      const filename = this.getFilename(src);
      // Strip extension for pattern matching
      const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

      for (const pattern of GENERIC_FILENAME_PATTERNS) {
        if (pattern.test(nameWithoutExt)) {
          genericImages.push(filename);
          break;
        }
      }
    }

    if (genericImages.length > 0) {
      issues.push({
        ruleId: 'rule-264',
        severity: 'low',
        title: 'Non-descriptive image file names',
        description:
          `Found ${genericImages.length} image(s) with generic file names. ` +
          'Descriptive file names help search engines understand image content and ' +
          'improve image search rankings. Avoid names like "IMG_001.jpg" or "photo.png".',
        affectedElement: genericImages.slice(0, 5).join(', '),
        exampleFix:
          'Use descriptive, hyphenated file names: "red-mountain-bike-trail.webp" ' +
          'instead of "IMG_001.jpg".',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 265: Lazy loading
  // ---------------------------------------------------------------------------

  private checkLazyLoading(
    imgTags: string[],
    issues: ImageMetadataIssue[]
  ): void {
    // Only flag if there are more than 3 images and none have lazy loading.
    if (imgTags.length <= 3) return;

    const hasAnyLazy = imgTags.some(tag =>
      /\bloading\s*=\s*["']lazy["']/i.test(tag)
    );

    if (!hasAnyLazy) {
      issues.push({
        ruleId: 'rule-265',
        severity: 'medium',
        title: 'No lazy loading on images',
        description:
          `Found ${imgTags.length} images but none have loading="lazy". ` +
          'Images below the fold should use lazy loading to defer off-screen image ' +
          'requests, improving initial page load time and Largest Contentful Paint (LCP).',
        exampleFix:
          'Add loading="lazy" to images below the fold. Keep loading="eager" ' +
          '(or omit the attribute) for the hero/above-fold image.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 266: Decorative images
  // ---------------------------------------------------------------------------

  private checkDecorativeImages(
    imgTags: string[],
    issues: ImageMetadataIssue[]
  ): void {
    let missingRole = 0;
    const affectedSrcs: string[] = [];

    for (const tag of imgTags) {
      // Detect alt="" (empty alt, indicating decorative)
      const hasEmptyAlt = /\balt\s*=\s*["']\s*["']/i.test(tag);
      if (!hasEmptyAlt) continue;

      const hasPresentation = /\brole\s*=\s*["']presentation["']/i.test(tag);
      if (!hasPresentation) {
        missingRole++;
        const src = this.getSrc(tag);
        if (src) affectedSrcs.push(this.getFilename(src));
      }
    }

    if (missingRole > 0) {
      issues.push({
        ruleId: 'rule-266',
        severity: 'low',
        title: 'Decorative images missing role="presentation"',
        description:
          `${missingRole} image(s) have empty alt text (alt="") but lack ` +
          'role="presentation". Adding role="presentation" explicitly tells assistive ' +
          'technologies to skip the image, improving the screen reader experience.',
        affectedElement:
          affectedSrcs.length > 0
            ? affectedSrcs.slice(0, 5).join(', ')
            : undefined,
        exampleFix:
          'Add role="presentation" to decorative images: ' +
          '<img src="divider.svg" alt="" role="presentation">',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 267: Image captions
  // ---------------------------------------------------------------------------

  private checkImageCaptions(
    html: string,
    issues: ImageMetadataIssue[]
  ): void {
    // Find all <figure> elements containing <img> but no <figcaption>
    const figurePattern = /<figure\b[^>]*>([\s\S]*?)<\/figure>/gi;
    let match: RegExpExecArray | null;
    let missingCaptions = 0;

    while ((match = figurePattern.exec(html)) !== null) {
      const figureContent = match[1];
      const hasImg = /<img\b/i.test(figureContent);
      const hasFigcaption = /<figcaption\b/i.test(figureContent);

      if (hasImg && !hasFigcaption) {
        missingCaptions++;
      }
    }

    if (missingCaptions > 0) {
      issues.push({
        ruleId: 'rule-267',
        severity: 'low',
        title: 'Images in <figure> missing <figcaption>',
        description:
          `${missingCaptions} <figure> element(s) contain images but lack a <figcaption>. ` +
          'Captions provide contextual information that helps search engines understand ' +
          'the relationship between images and surrounding content, and improves accessibility.',
        exampleFix:
          'Add a <figcaption> inside each <figure>: ' +
          '<figure><img src="chart.webp" alt="Sales growth"><figcaption>Quarterly sales growth 2024</figcaption></figure>',
      });
    }
  }
}
