/**
 * Brand Extraction Types
 *
 * These types enforce literal code storage - NO abstraction fields allowed.
 * This prevents template thinking from creeping back in.
 */

// ============================================================================
// CONTENT SLOTS (where content can be injected)
// ============================================================================

export interface ContentSlot {
  name: string;
  selector: string;
  type: 'text' | 'html' | 'image' | 'list' | 'link';
  required: boolean;
  constraints?: {
    maxLength?: number;
    allowedTags?: string[];
  };
}

// ============================================================================
// EXTRACTED COMPONENT (literal code, no abstraction)
// ============================================================================

export interface ExtractedComponent {
  id: string;
  extractionId: string;
  projectId: string;
  visualDescription: string;
  componentType?: string;
  literalHtml: string;
  literalCss: string;
  theirClassNames: string[];
  contentSlots: ContentSlot[];
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: string;
}

// ============================================================================
// PAGE EXTRACTION (full page capture)
// ============================================================================

export interface BrandExtraction {
  id: string;
  projectId: string;
  sourceUrl: string;
  pageType: 'homepage' | 'service' | 'article' | 'contact' | 'other';
  screenshotUrl?: string;
  screenshotBase64?: string;
  rawHtml: string;
  computedStyles?: Record<string, Record<string, string>>;
  extractedAt: string;
}

// ============================================================================
// DESIGN TOKENS (actual values, not categories)
// ============================================================================

export interface ExtractedTokens {
  id: string;
  projectId: string;
  colors: {
    values: Array<{
      hex: string;
      usage: string;
      frequency: number;
    }>;
  };
  typography: {
    headings: {
      fontFamily: string;
      fontWeight: number;
      letterSpacing?: string;
    };
    body: {
      fontFamily: string;
      fontWeight: number;
      lineHeight: number;
    };
  };
  spacing: {
    sectionGap: string;
    cardPadding: string;
    contentWidth: string;
  };
  shadows: {
    card: string;
    elevated: string;
    button?: string;
  };
  borders: {
    radiusSmall: string;
    radiusMedium: string;
    radiusLarge: string;
    defaultColor: string;
  };
  gradients?: {
    hero?: string;
    cta?: string;
    accent?: string;
  };
  extractedFrom: string[];
  extractedAt: string;
}

// ============================================================================
// AI ANALYSIS OUTPUT
// ============================================================================

export interface ExtractionAnalysisResult {
  tokens: Omit<ExtractedTokens, 'id' | 'projectId' | 'extractedAt'>;
  components: Array<Omit<ExtractedComponent, 'id' | 'extractionId' | 'projectId' | 'createdAt'>>;
  pageLayout: {
    sections: Array<{
      order: number;
      componentRef: number;
      role: string;
    }>;
    gridSystem: string;
  };
}

// ============================================================================
// COMPONENT MATCHING (for content injection)
// ============================================================================

export interface ComponentMatch {
  component: ExtractedComponent;
  confidence: number;
  matchReason: string;
}

// ============================================================================
// SYNTHESIZED COMPONENT (for missing components)
// ============================================================================

export interface SynthesizedComponent {
  visualDescription: string;
  componentType: string;
  generatedHtml: string;
  generatedCss: string;
  ourClassNames: string[];
  contentSlots: ContentSlot[];
  synthesizedFrom: string[];
}

// ============================================================================
// RENDER OUTPUT
// ============================================================================

export interface BrandReplicationOutput {
  html: string;
  standaloneCss: string;
  componentsUsed: Array<{
    id: string;
    type: 'extracted' | 'synthesized';
    theirClasses: string[];
    ourClasses: string[];
  }>;
  metadata: {
    brandProjectId: string;
    extractionsUsed: string[];
    synthesizedCount: number;
    renderTime: number;
  };
}
