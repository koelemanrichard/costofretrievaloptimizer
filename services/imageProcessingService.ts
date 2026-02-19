// services/imageProcessingService.ts

import { SERVICE_REGISTRY } from '../config/serviceRegistry';

/**
 * ImageProcessingService
 *
 * Service interfaces and stubs for image processing features from the
 * Semantic SEO framework. These represent cloud-based capabilities
 * that would be integrated with actual image processing APIs.
 *
 * Features:
 * - EXIF/IPTC metadata reading and writing
 * - Branded watermark application
 * - Text overlay for infographics
 * - AVIF format conversion
 * - Hybrid Category image strategy
 */

export interface ImageMetadata {
  /** EXIF data */
  exif?: {
    make?: string;
    model?: string;
    dateTime?: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
    copyright?: string;
    artist?: string;
  };
  /** IPTC data */
  iptc?: {
    title?: string;
    description?: string;
    keywords?: string[];
    creator?: string;
    creditLine?: string;
    copyrightNotice?: string;
    source?: string;
  };
  /** Image dimensions */
  width?: number;
  height?: number;
  /** File format */
  format?: string;
  /** File size in bytes */
  fileSize?: number;
}

export interface WatermarkOptions {
  /** Watermark text (e.g., brand name) */
  text?: string;
  /** Logo image URL */
  logoUrl?: string;
  /** Position */
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  /** Opacity (0-1) */
  opacity: number;
  /** Size relative to image (0-1) */
  relativeSize: number;
}

export interface TextOverlayOptions {
  /** Text to overlay */
  text: string;
  /** Font family */
  fontFamily?: string;
  /** Font size in pixels */
  fontSize: number;
  /** Text color (hex) */
  color: string;
  /** Background color (hex, with opacity) */
  backgroundColor?: string;
  /** Position */
  position: 'top' | 'center' | 'bottom';
  /** Padding */
  padding?: number;
}

export interface ImageConversionOptions {
  /** Target format */
  format: 'avif' | 'webp' | 'png' | 'jpeg';
  /** Quality (0-100) */
  quality: number;
  /** Maximum width */
  maxWidth?: number;
  /** Maximum height */
  maxHeight?: number;
}

export type HybridCategory = 'stock' | 'original' | 'screenshot' | 'infographic' | 'diagram' | 'photo';

export interface HybridCategoryStrategy {
  /** Recommended image category for the content type */
  category: HybridCategory;
  /** Reasoning */
  reasoning: string;
  /** Additional recommendations */
  recommendations: string[];
}

export class ImageProcessingService {
  /**
   * Read EXIF/IPTC metadata from an image.
   * Stub — would integrate with sharp, exif-reader, or cloud API.
   */
  static async readMetadata(_imageUrl: string): Promise<ImageMetadata> {
    // In production, this would use sharp or a cloud API
    return {
      exif: {},
      iptc: {},
      format: 'unknown',
    };
  }

  /**
   * Write EXIF/IPTC metadata to an image.
   * Stub — would integrate with sharp or cloud API.
   */
  static async writeMetadata(
    _imageUrl: string,
    _metadata: Partial<ImageMetadata>
  ): Promise<string> {
    // In production, this would modify the image and return new URL
    return _imageUrl;
  }

  /**
   * Apply a branded watermark to an image.
   * Stub — would integrate with Cloudinary, sharp, or similar.
   */
  static async applyWatermark(
    _imageUrl: string,
    _options: WatermarkOptions
  ): Promise<string> {
    // In production: Cloudinary overlay or sharp composite
    return _imageUrl;
  }

  /**
   * Add text overlay to an image.
   * Stub — would integrate with Cloudinary, canvas, or similar.
   */
  static async addTextOverlay(
    _imageUrl: string,
    _options: TextOverlayOptions
  ): Promise<string> {
    // In production: Cloudinary text overlay or canvas rendering
    return _imageUrl;
  }

  /**
   * Convert image to target format (AVIF preferred).
   * Stub — would integrate with Cloudinary or sharp.
   */
  static async convert(
    _imageUrl: string,
    _options: ImageConversionOptions
  ): Promise<string> {
    // In production: Cloudinary f_avif or sharp
    return _imageUrl;
  }

  /**
   * Validate image against SEO requirements.
   */
  static validateForSeo(metadata: ImageMetadata): {
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    // Check format (preferred formats from SERVICE_REGISTRY)
    const preferredFormats = SERVICE_REGISTRY.layoutEngine.image.preferredFormats;
    if (metadata.format && !preferredFormats.includes(metadata.format.toLowerCase())) {
      issues.push(`Image format is ${metadata.format}. Prefer ${preferredFormats.join(' or ').toUpperCase()} for better compression.`);
      score -= 10;
    }

    // Check IPTC
    if (!metadata.iptc?.title) {
      issues.push('Missing IPTC title. Add descriptive title for image search.');
      score -= 5;
    }
    if (!metadata.iptc?.description) {
      issues.push('Missing IPTC description. Add description for accessibility and image search.');
      score -= 5;
    }
    if (!metadata.iptc?.copyrightNotice) {
      issues.push('Missing copyright notice in IPTC data.');
      score -= 5;
    }

    // Check dimensions (max width from SERVICE_REGISTRY)
    const maxWidth = SERVICE_REGISTRY.layoutEngine.image.maxWidthPx;
    if (metadata.width && metadata.width > maxWidth) {
      issues.push(`Image width ${metadata.width}px exceeds recommended ${maxWidth}px max. Consider resizing.`);
      score -= 10;
    }

    // Check file size (max size from SERVICE_REGISTRY)
    const maxFileSize = SERVICE_REGISTRY.layoutEngine.image.maxFileSizeBytes;
    if (metadata.fileSize && metadata.fileSize > maxFileSize) {
      issues.push(`Image file size ${Math.round(metadata.fileSize / 1024)}KB exceeds ${Math.round(maxFileSize / 1024)}KB. Compress or convert to AVIF.`);
      score -= 15;
    }

    return { issues, score: Math.max(0, score) };
  }

  /**
   * Determine the hybrid category strategy for a content type.
   */
  static getHybridCategoryStrategy(
    contentType: string,
    entityType?: string
  ): HybridCategoryStrategy {
    const contentLower = contentType.toLowerCase();

    if (contentLower.includes('tutorial') || contentLower.includes('how-to')) {
      return {
        category: 'screenshot',
        reasoning: 'Tutorial/how-to content benefits from real screenshots showing the process.',
        recommendations: [
          'Use annotated screenshots showing exact steps',
          'Add numbered callouts on screenshots',
          'Include before/after comparisons',
        ],
      };
    }

    if (contentLower.includes('comparison') || contentLower.includes('review')) {
      return {
        category: 'infographic',
        reasoning: 'Comparison content benefits from side-by-side infographics.',
        recommendations: [
          'Create comparison tables as images',
          'Use charts for quantitative comparisons',
          'Include product photos for physical products',
        ],
      };
    }

    if (contentLower.includes('technical') || contentLower.includes('architecture')) {
      return {
        category: 'diagram',
        reasoning: 'Technical content benefits from architecture and flow diagrams.',
        recommendations: [
          'Create system architecture diagrams',
          'Use flowcharts for processes',
          'Include code screenshots for implementation details',
        ],
      };
    }

    if (entityType === 'Product' || contentLower.includes('product')) {
      return {
        category: 'photo',
        reasoning: 'Product content needs authentic photos for trust and E-E-A-T.',
        recommendations: [
          'Use original product photography',
          'Include multiple angles',
          'Show product in use context',
          'Add EXIF data showing camera/date for authenticity',
        ],
      };
    }

    // Default: original photography or illustration
    return {
      category: 'original',
      reasoning: 'Default to original imagery for uniqueness and brand differentiation.',
      recommendations: [
        'Avoid generic stock photos',
        'Create branded illustrations consistent with design system',
        'Add IPTC metadata with proper attribution',
      ],
    };
  }
}
