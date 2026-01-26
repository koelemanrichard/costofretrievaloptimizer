/**
 * Brand Extraction Module
 *
 * Extracts literal HTML/CSS from target websites for brand replication.
 * NO template abstractions - stores actual code.
 */

export { PageCrawler } from './PageCrawler';
export type { PageCrawlerConfig, PageCaptureResult } from './PageCrawler';

export { ExtractionAnalyzer } from './ExtractionAnalyzer';

export { ComponentLibrary } from './ComponentLibrary';

// Re-export types
export type {
  BrandExtraction,
  ExtractedComponent,
  ExtractedTokens,
  ExtractionAnalysisResult,
  ContentSlot,
} from '../../types/brandExtraction';
