/**
 * Style Guide Types
 *
 * Types for the Visual Style Guide Extraction system.
 * Extracted from actual DOM elements of target websites — real data, not AI guessing.
 */

export type StyleGuideCategory =
  | 'typography' | 'buttons' | 'cards' | 'navigation'
  | 'accordions' | 'section-breaks' | 'backgrounds'
  | 'images' | 'tables' | 'forms' | 'icons' | 'colors';

export type PageRegion = 'header' | 'hero' | 'main' | 'sidebar' | 'footer' | 'unknown';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface StyleGuideElement {
  id: string;
  category: StyleGuideCategory;
  subcategory: string;                // "h1", "primary-button", "article-card"
  label: string;                      // "Primary Heading (Inter Bold 48px)"
  pageRegion: PageRegion;
  outerHtml: string;                  // Cleaned outer HTML
  computedCss: Record<string, string>; // Relevant computed CSS properties
  selfContainedHtml: string;          // Standalone HTML with inline styles
  selector: string;                   // CSS selector used to find element
  elementTag: string;
  classNames: string[];
  approvalStatus: ApprovalStatus;
  userComment?: string;
  referenceImageBase64?: string;
  referenceUrl?: string;
  qualityScore?: number;              // AI validation score 0-100
  elementScreenshotBase64?: string;   // Playwright element screenshot
  sourcePageUrl?: string;             // Which page this element was found on
  aiValidated?: boolean;              // Whether AI has validated this element
  aiGenerated?: boolean;              // Whether AI created this element (fallback)
}

export interface StyleGuideColor {
  hex: string;
  rgb: string;
  usage: string;
  source: string;
  frequency: number;
  approvalStatus: ApprovalStatus;
}

export interface StyleGuide {
  id: string;
  hostname: string;
  sourceUrl: string;
  screenshotBase64?: string;
  extractedAt: string;
  elements: StyleGuideElement[];
  colors: StyleGuideColor[];
  googleFontsUrls: string[];
  googleFontFamilies: string[];
  isApproved: boolean;
  approvedAt?: string;
  extractionDurationMs: number;
  elementCount: number;
  version: number;
  pageScreenshots?: { url: string; base64: string }[];  // Screenshots per crawled page
  pagesScanned?: number;              // Number of pages crawled
}

export interface SavedStyleGuide {
  id: string;
  user_id: string;
  hostname: string;
  source_url: string;
  style_guide: StyleGuide;
  version: number;
  created_at: string;
  updated_at: string;
}
