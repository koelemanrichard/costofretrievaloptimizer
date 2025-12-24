/**
 * Hero Image Semantic Validation Rules
 *
 * Based on Koray Tugberk GUBUR's "Pixels, Letters, and Bytes" framework
 * for semantic SEO optimization of hero/featured images.
 *
 * Reference: docs/build-docs/hero image.md
 */

import { HeroValidationRule, HeroValidationSeverity } from '../types';

// ============================================
// VALIDATION RULE DEFINITIONS
// ============================================

/**
 * Central Object Rules
 * The central entity must be fully visible and centered
 */
export const centralObjectRules: HeroValidationRule[] = [
  {
    id: 'central-object-centered',
    category: 'centerpiece',
    severity: 'warning', // Changed from 'error' - positioning is a design choice, not a blocker
    name: 'Central Object Centering',
    description: 'The central object entity is typically positioned at the center, but can be adjusted for composition',
    checkMessage: 'Central object is not centered (may be intentional)',
    passMessage: 'Central object is properly centered',
    autoFixAvailable: true,
    autoFixDescription: 'Move central object to center position',
    check: (composition) => {
      const centralLayer = composition.layers.find(l => l.type === 'centralObject');
      if (!centralLayer) return { passed: true }; // No central object, skip

      const position = centralLayer.position;
      // Calculate center position (object center should be at 50%, 50%)
      const objectCenterX = position.x + (position.width / 2);
      const objectCenterY = position.y + (position.height / 2);

      // Allow 10% tolerance for centering
      const tolerance = 10;
      const isCenteredX = Math.abs(objectCenterX - 50) <= tolerance;
      const isCenteredY = Math.abs(objectCenterY - 50) <= tolerance;

      return {
        passed: isCenteredX && isCenteredY,
        details: {
          currentCenterX: objectCenterX,
          currentCenterY: objectCenterY,
          tolerance,
          isCenteredX,
          isCenteredY
        }
      };
    },
    autoFix: (composition) => {
      const centralLayer = composition.layers.find(l => l.type === 'centralObject');
      if (!centralLayer) return composition;

      // Center the object
      const newX = 50 - (centralLayer.position.width / 2);
      const newY = 50 - (centralLayer.position.height / 2);

      return {
        ...composition,
        layers: composition.layers.map(l =>
          l.type === 'centralObject'
            ? { ...l, position: { ...l.position, x: newX, y: newY } }
            : l
        )
      };
    }
  },
  {
    id: 'central-object-visible',
    category: 'centerpiece',
    severity: 'error',
    name: 'Central Object Visibility',
    description: 'The central object must be 100% visible, not truncated or cropped',
    checkMessage: 'Central object is truncated or extends beyond canvas bounds',
    passMessage: 'Central object is fully visible within canvas',
    autoFixAvailable: true,
    autoFixDescription: 'Scale down central object to fit within canvas bounds',
    check: (composition) => {
      const centralLayer = composition.layers.find(l => l.type === 'centralObject');
      if (!centralLayer) return { passed: true };

      const pos = centralLayer.position;
      const isWithinBounds =
        pos.x >= 0 &&
        pos.y >= 0 &&
        (pos.x + pos.width) <= 100 &&
        (pos.y + pos.height) <= 100;

      return {
        passed: isWithinBounds,
        details: {
          left: pos.x,
          top: pos.y,
          right: pos.x + pos.width,
          bottom: pos.y + pos.height,
          exceedsLeft: pos.x < 0,
          exceedsTop: pos.y < 0,
          exceedsRight: (pos.x + pos.width) > 100,
          exceedsBottom: (pos.y + pos.height) > 100
        }
      };
    },
    autoFix: (composition) => {
      const centralLayer = composition.layers.find(l => l.type === 'centralObject');
      if (!centralLayer) return composition;

      let { x, y, width, height } = centralLayer.position;

      // Scale down if too large
      if (width > 100) {
        const scale = 90 / width;
        width = 90;
        height = height * scale;
      }
      if (height > 100) {
        const scale = 90 / height;
        height = 90;
        width = width * scale;
      }

      // Re-center after scaling
      x = 50 - (width / 2);
      y = 50 - (height / 2);

      return {
        ...composition,
        layers: composition.layers.map(l =>
          l.type === 'centralObject'
            ? { ...l, position: { x, y, width, height } }
            : l
        )
      };
    }
  },
  {
    id: 'central-object-not-blurred',
    category: 'centerpiece',
    severity: 'warning',
    name: 'Central Object Clarity',
    description: 'The central object should be sharp and clear, not blurred or faint',
    checkMessage: 'Central object may be blurred or low quality',
    passMessage: 'Central object appears clear',
    autoFixAvailable: false,
    check: (composition) => {
      const centralLayer = composition.layers.find(l => l.type === 'centralObject');
      if (!centralLayer) return { passed: true };

      // Check if image URL exists (basic validation)
      // Actual blur detection would require image analysis
      if (centralLayer.type === 'centralObject' && !centralLayer.imageUrl) {
        return { passed: false, details: { reason: 'No image URL set' } };
      }

      return { passed: true };
    }
  }
];

/**
 * Text Overlay Rules
 * Text must be positioned at top or bottom, never overlapping central object
 */
export const textOverlayRules: HeroValidationRule[] = [
  {
    id: 'text-position-valid',
    category: 'text',
    severity: 'warning', // Changed from 'error' - text positioning is a design choice
    name: 'Text Position Constraint',
    description: 'Text overlays are best positioned at the top or bottom of the image, away from the central object',
    checkMessage: 'Text is positioned in the middle zone (may overlap central object)',
    passMessage: 'Text is correctly positioned at top or bottom',
    autoFixAvailable: true,
    autoFixDescription: 'Move text to nearest valid position (top or bottom)',
    check: (composition) => {
      const textLayers = composition.layers.filter(l => l.type === 'textOverlay');
      if (textLayers.length === 0) return { passed: true };

      const violations: string[] = [];

      for (const layer of textLayers) {
        if (layer.type !== 'textOverlay') continue;

        // Text placement must be 'top' or 'bottom'
        if (layer.placement !== 'top' && layer.placement !== 'bottom') {
          violations.push(`Text "${layer.text?.substring(0, 20)}..." has invalid placement: ${layer.placement}`);
        }

        // Position check: top zone is 0-25%, bottom zone is 75-100%
        const centerY = layer.position.y + (layer.position.height / 2);
        const isInTopZone = centerY <= 30;
        const isInBottomZone = centerY >= 70;

        if (!isInTopZone && !isInBottomZone) {
          violations.push(`Text at Y=${centerY.toFixed(1)}% is in middle zone`);
        }
      }

      return {
        passed: violations.length === 0,
        details: { violations }
      };
    },
    autoFix: (composition) => {
      return {
        ...composition,
        layers: composition.layers.map(layer => {
          if (layer.type !== 'textOverlay') return layer;

          const centerY = layer.position.y + (layer.position.height / 2);
          const closerToTop = centerY < 50;

          // Move to top or bottom based on which is closer
          const newY = closerToTop
            ? 5 // Top position
            : 85 - layer.position.height; // Bottom position

          return {
            ...layer,
            placement: closerToTop ? 'top' : 'bottom',
            position: { ...layer.position, y: newY }
          };
        })
      };
    }
  },
  {
    id: 'text-no-overlap',
    category: 'text',
    severity: 'warning', // Changed from 'error' - overlap may be intentional for design purposes
    name: 'Text-Object Overlap Prevention',
    description: 'Text overlays typically should not overlap with the central object, but may be intentional',
    checkMessage: 'Text overlaps with central object (may be intentional)',
    passMessage: 'Text does not overlap central object',
    autoFixAvailable: true,
    autoFixDescription: 'Adjust text position to eliminate overlap',
    check: (composition) => {
      const textLayers = composition.layers.filter(l => l.type === 'textOverlay');
      const centralLayer = composition.layers.find(l => l.type === 'centralObject');

      if (textLayers.length === 0 || !centralLayer) return { passed: true };

      const overlaps: Array<{ textId: string; overlapPercent: number }> = [];
      const centralPos = centralLayer.position;

      for (const textLayer of textLayers) {
        const textPos = textLayer.position;

        // Calculate overlap using AABB intersection
        const xOverlap = Math.max(0,
          Math.min(centralPos.x + centralPos.width, textPos.x + textPos.width) -
          Math.max(centralPos.x, textPos.x)
        );
        const yOverlap = Math.max(0,
          Math.min(centralPos.y + centralPos.height, textPos.y + textPos.height) -
          Math.max(centralPos.y, textPos.y)
        );

        const overlapArea = xOverlap * yOverlap;
        const textArea = textPos.width * textPos.height;
        const overlapPercent = textArea > 0 ? (overlapArea / textArea) * 100 : 0;

        if (overlapPercent > 5) { // Allow 5% tolerance for slight touch
          overlaps.push({ textId: textLayer.id, overlapPercent });
        }
      }

      return {
        passed: overlaps.length === 0,
        details: { overlaps }
      };
    },
    autoFix: (composition) => {
      const centralLayer = composition.layers.find(l => l.type === 'centralObject');
      if (!centralLayer) return composition;

      const centralPos = centralLayer.position;
      const centralTop = centralPos.y;
      const centralBottom = centralPos.y + centralPos.height;

      return {
        ...composition,
        layers: composition.layers.map(layer => {
          if (layer.type !== 'textOverlay') return layer;

          const textBottom = layer.position.y + layer.position.height;
          const textTop = layer.position.y;

          // Check for overlap
          if (textBottom > centralTop && textTop < centralBottom) {
            // Move based on placement preference
            const newY = layer.placement === 'top'
              ? Math.max(2, centralTop - layer.position.height - 5)
              : Math.min(98 - layer.position.height, centralBottom + 5);

            return {
              ...layer,
              position: { ...layer.position, y: newY }
            };
          }

          return layer;
        })
      };
    }
  },
  {
    id: 'text-h1-alignment',
    category: 'text',
    severity: 'warning',
    name: 'H1 Text Alignment',
    description: 'Text overlay should be a shorter, punchy version of the page H1',
    checkMessage: 'Text may not align with page H1 context',
    passMessage: 'Text appears aligned with page context',
    autoFixAvailable: false,
    check: (composition) => {
      const textLayers = composition.layers.filter(l => l.type === 'textOverlay');

      for (const layer of textLayers) {
        if (layer.type !== 'textOverlay') continue;

        // Basic checks for good text
        if (!layer.text || layer.text.length < 3) {
          return { passed: false, details: { reason: 'Text too short' } };
        }
        if (layer.text.length > 100) {
          return { passed: false, details: { reason: 'Text too long for hero image' } };
        }
      }

      return { passed: true };
    }
  }
];

/**
 * Logo Rules
 * Logo must be in a consistent corner position
 */
export const logoRules: HeroValidationRule[] = [
  {
    id: 'logo-corner-position',
    category: 'logo',
    severity: 'warning',
    name: 'Logo Corner Positioning',
    description: 'Logo must be placed in one of the four corners for consistent branding',
    checkMessage: 'Logo is not in a corner position',
    passMessage: 'Logo is correctly positioned in corner',
    autoFixAvailable: true,
    autoFixDescription: 'Snap logo to nearest corner',
    check: (composition) => {
      const logoLayer = composition.layers.find(l => l.type === 'logo');
      if (!logoLayer || logoLayer.type !== 'logo') return { passed: true };

      const validCorners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

      if (!validCorners.includes(logoLayer.cornerPosition)) {
        return { passed: false, details: { currentPosition: logoLayer.cornerPosition } };
      }

      // Verify actual position matches declared corner
      const pos = logoLayer.position;
      const centerX = pos.x + (pos.width / 2);
      const centerY = pos.y + (pos.height / 2);

      const isLeft = centerX < 25;
      const isRight = centerX > 75;
      const isTop = centerY < 25;
      const isBottom = centerY > 75;

      const actualCorner =
        isTop && isLeft ? 'top-left' :
        isTop && isRight ? 'top-right' :
        isBottom && isLeft ? 'bottom-left' :
        isBottom && isRight ? 'bottom-right' :
        'middle';

      return {
        passed: actualCorner !== 'middle',
        details: { declaredCorner: logoLayer.cornerPosition, actualCorner }
      };
    },
    autoFix: (composition) => {
      const logoLayer = composition.layers.find(l => l.type === 'logo');
      if (!logoLayer || logoLayer.type !== 'logo') return composition;

      const pos = logoLayer.position;
      const centerX = pos.x + (pos.width / 2);
      const centerY = pos.y + (pos.height / 2);

      // Determine nearest corner
      const isLeft = centerX < 50;
      const isTop = centerY < 50;

      const corner =
        isTop && isLeft ? 'top-left' :
        isTop && !isLeft ? 'top-right' :
        !isTop && isLeft ? 'bottom-left' :
        'bottom-right';

      // Calculate new position
      const margin = 3; // 3% margin from edge
      const newX = isLeft ? margin : 100 - pos.width - margin;
      const newY = isTop ? margin : 100 - pos.height - margin;

      return {
        ...composition,
        layers: composition.layers.map(l =>
          l.type === 'logo'
            ? {
                ...l,
                cornerPosition: corner,
                position: { ...l.position, x: newX, y: newY }
              }
            : l
        )
      };
    }
  },
  {
    id: 'logo-not-oversized',
    category: 'logo',
    severity: 'warning',
    name: 'Logo Size Constraint',
    description: 'Logo should be watermark-sized, not dominating the image',
    checkMessage: 'Logo is too large (>15% of image area)',
    passMessage: 'Logo size is appropriate',
    autoFixAvailable: true,
    autoFixDescription: 'Scale logo down to appropriate size',
    check: (composition) => {
      const logoLayer = composition.layers.find(l => l.type === 'logo');
      if (!logoLayer) return { passed: true };

      const logoArea = logoLayer.position.width * logoLayer.position.height;
      const maxArea = 15 * 15; // 15% x 15% max = 225 square percent

      return {
        passed: logoArea <= maxArea,
        details: { logoArea, maxArea, percentOfMax: (logoArea / maxArea) * 100 }
      };
    },
    autoFix: (composition) => {
      const logoLayer = composition.layers.find(l => l.type === 'logo');
      if (!logoLayer) return composition;

      const maxSize = 12; // 12% max dimension
      let { width, height } = logoLayer.position;

      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width = width * scale;
        height = height * scale;
      }

      // Recalculate position based on corner
      const pos = logoLayer.position;
      const isLeft = pos.x < 50;
      const isTop = pos.y < 50;
      const margin = 3;

      const newX = isLeft ? margin : 100 - width - margin;
      const newY = isTop ? margin : 100 - height - margin;

      return {
        ...composition,
        layers: composition.layers.map(l =>
          l.type === 'logo'
            ? { ...l, position: { x: newX, y: newY, width, height } }
            : l
        )
      };
    }
  }
];

/**
 * Accessibility Rules
 * Alt text and semantic requirements
 */
export const accessibilityRules: HeroValidationRule[] = [
  {
    id: 'alt-text-entity',
    category: 'accessibility',
    severity: 'error',
    name: 'Alt Text Entity Reference',
    description: 'Alt text must contain the central entity name for semantic relevance',
    checkMessage: 'Alt text does not reference the central entity',
    passMessage: 'Alt text properly references central entity',
    autoFixAvailable: true,
    autoFixDescription: 'Prepend entity name to alt text',
    check: (composition) => {
      const altText = composition.metadata?.altText?.toLowerCase() || '';
      const centralLayer = composition.layers.find(l => l.type === 'centralObject');

      if (!centralLayer || centralLayer.type !== 'centralObject') {
        return { passed: true }; // No central object, no entity requirement
      }

      const entityName = centralLayer.entityName?.toLowerCase() || '';

      if (!entityName) {
        return { passed: false, details: { reason: 'No entity name defined' } };
      }

      // Check if entity name (or significant words from it) appear in alt text
      const entityWords = entityName.split(/\s+/).filter(w => w.length > 3);
      const hasEntityReference = entityWords.some(word => altText.includes(word));

      return {
        passed: hasEntityReference,
        details: { altText, entityName, entityWords }
      };
    },
    autoFix: (composition) => {
      const centralLayer = composition.layers.find(l => l.type === 'centralObject');
      if (!centralLayer || centralLayer.type !== 'centralObject') return composition;

      const entityName = centralLayer.entityName || '';
      const currentAlt = composition.metadata?.altText || '';

      // Prepend entity name if not already present
      const newAlt = currentAlt.toLowerCase().includes(entityName.toLowerCase())
        ? currentAlt
        : `${entityName} - ${currentAlt}`;

      return {
        ...composition,
        metadata: {
          ...composition.metadata,
          altText: newAlt
        }
      };
    }
  },
  {
    id: 'alt-text-no-stuffing',
    category: 'accessibility',
    severity: 'error',
    name: 'Alt Text Keyword Stuffing',
    description: 'Alt text must not contain repetitive keywords (keyword stuffing)',
    checkMessage: 'Alt text contains repeated keywords',
    passMessage: 'Alt text is natural without keyword repetition',
    autoFixAvailable: true,
    autoFixDescription: 'Remove duplicate keywords from alt text',
    check: (composition) => {
      const altText = composition.metadata?.altText || '';

      if (!altText) {
        return { passed: false, details: { reason: 'No alt text provided' } };
      }

      // Check for repeated significant words (3+ chars)
      const words = altText.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
      const wordCounts = new Map<string, number>();

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }

      const duplicates = Array.from(wordCounts.entries())
        .filter(([_, count]) => count > 2)
        .map(([word, count]) => ({ word, count }));

      return {
        passed: duplicates.length === 0,
        details: { duplicates, wordCounts: Object.fromEntries(wordCounts) }
      };
    },
    autoFix: (composition) => {
      const altText = composition.metadata?.altText || '';

      // Remove duplicate words while preserving sentence structure
      const words = altText.split(/\s+/);
      const seen = new Map<string, number>();

      const deduped = words.filter(word => {
        const lower = word.toLowerCase().replace(/[^a-z]/g, '');
        if (lower.length < 3) return true; // Keep short words

        const count = seen.get(lower) || 0;
        seen.set(lower, count + 1);
        return count < 2; // Allow up to 2 occurrences
      });

      return {
        ...composition,
        metadata: {
          ...composition.metadata,
          altText: deduped.join(' ')
        }
      };
    }
  },
  {
    id: 'alt-text-length',
    category: 'accessibility',
    severity: 'warning',
    name: 'Alt Text Length',
    description: 'Alt text should be between 50-150 characters for optimal description',
    checkMessage: 'Alt text length is outside optimal range',
    passMessage: 'Alt text length is optimal',
    autoFixAvailable: false,
    check: (composition) => {
      const altText = composition.metadata?.altText || '';
      const length = altText.length;

      return {
        passed: length >= 30 && length <= 200,
        details: {
          length,
          minRecommended: 30,
          maxRecommended: 200,
          status: length < 30 ? 'too-short' : length > 200 ? 'too-long' : 'optimal'
        }
      };
    }
  }
];

/**
 * Technical/Metadata Rules
 */
export const technicalRules: HeroValidationRule[] = [
  {
    id: 'metadata-complete',
    category: 'technical',
    severity: 'warning',
    name: 'Metadata Completeness',
    description: 'IPTC/EXIF metadata should be fully populated for authenticity signals',
    checkMessage: 'Image metadata is incomplete',
    passMessage: 'All required metadata fields are populated',
    autoFixAvailable: true,
    autoFixDescription: 'Fill missing metadata from BrandKit or defaults',
    check: (composition) => {
      const meta = composition.metadata;
      const missing: string[] = [];

      // Check IPTC fields
      if (!meta?.iptc?.creator) missing.push('iptc.creator');
      if (!meta?.iptc?.copyright) missing.push('iptc.copyright');
      if (!meta?.iptc?.caption) missing.push('iptc.caption');
      if (!meta?.iptc?.headline) missing.push('iptc.headline');

      // Check EXIF fields
      if (!meta?.exif?.artist) missing.push('exif.artist');
      if (!meta?.exif?.copyright) missing.push('exif.copyright');
      if (!meta?.exif?.imageDescription) missing.push('exif.imageDescription');

      // Check alt text
      if (!meta?.altText) missing.push('altText');
      if (!meta?.fileName) missing.push('fileName');

      return {
        passed: missing.length === 0,
        details: { missing, totalRequired: 9, filled: 9 - missing.length }
      };
    },
    autoFix: (composition) => {
      const currentMeta = composition.metadata;
      const altText = currentMeta?.altText || 'Hero image';

      return {
        ...composition,
        metadata: {
          iptc: {
            creator: currentMeta?.iptc?.creator || 'Content Team',
            copyright: currentMeta?.iptc?.copyright || `Copyright ${new Date().getFullYear()}`,
            caption: currentMeta?.iptc?.caption || altText,
            headline: currentMeta?.iptc?.headline || altText.substring(0, 64),
            keywords: currentMeta?.iptc?.keywords || []
          },
          exif: {
            artist: currentMeta?.exif?.artist || 'Content Team',
            copyright: currentMeta?.exif?.copyright || `Copyright ${new Date().getFullYear()}`,
            imageDescription: currentMeta?.exif?.imageDescription || altText
          },
          schemaOrg: currentMeta?.schemaOrg || {
            '@type': 'ImageObject' as const,
            contentUrl: '',
            name: altText,
            description: altText
          },
          altText: altText,
          fileName: currentMeta?.fileName || `hero-${Date.now()}.avif`
        }
      };
    }
  },
  {
    id: 'dimensions-defined',
    category: 'technical',
    severity: 'error',
    name: 'Dimensions Defined',
    description: 'Canvas dimensions must be explicitly defined to prevent CLS',
    checkMessage: 'Canvas dimensions not properly defined',
    passMessage: 'Canvas dimensions are properly defined',
    autoFixAvailable: true,
    autoFixDescription: 'Set default canvas dimensions (1200x630)',
    check: (composition) => {
      const hasWidth = composition.canvasWidth > 0;
      const hasHeight = composition.canvasHeight > 0;

      // Check for reasonable dimensions (social media optimized)
      const isReasonableSize =
        composition.canvasWidth >= 600 &&
        composition.canvasWidth <= 2400 &&
        composition.canvasHeight >= 300 &&
        composition.canvasHeight <= 1600;

      return {
        passed: hasWidth && hasHeight && isReasonableSize,
        details: {
          width: composition.canvasWidth,
          height: composition.canvasHeight,
          hasWidth,
          hasHeight,
          isReasonableSize
        }
      };
    },
    autoFix: (composition) => {
      return {
        ...composition,
        canvasWidth: composition.canvasWidth > 0 ? composition.canvasWidth : 1200,
        canvasHeight: composition.canvasHeight > 0 ? composition.canvasHeight : 630
      };
    }
  },
  {
    id: 'aspect-ratio-valid',
    category: 'technical',
    severity: 'warning',
    name: 'Aspect Ratio Validation',
    description: 'Aspect ratio should be suitable for social sharing (16:9, 4:3, or 1.91:1)',
    checkMessage: 'Aspect ratio may not be optimal for social sharing',
    passMessage: 'Aspect ratio is social media optimized',
    autoFixAvailable: false,
    check: (composition) => {
      if (!composition.canvasWidth || !composition.canvasHeight) {
        return { passed: false, details: { reason: 'Dimensions not set' } };
      }

      const ratio = composition.canvasWidth / composition.canvasHeight;

      // Common social media aspect ratios
      const validRatios = [
        { name: '16:9', value: 16/9, tolerance: 0.1 },
        { name: '4:3', value: 4/3, tolerance: 0.1 },
        { name: '1.91:1 (Facebook/LinkedIn)', value: 1.91, tolerance: 0.1 },
        { name: '2:1 (Twitter)', value: 2, tolerance: 0.1 },
        { name: '1:1 (Square)', value: 1, tolerance: 0.1 }
      ];

      const matchedRatio = validRatios.find(r =>
        Math.abs(ratio - r.value) <= r.tolerance
      );

      return {
        passed: !!matchedRatio,
        details: {
          currentRatio: ratio.toFixed(2),
          matchedRatio: matchedRatio?.name || 'none',
          validRatios: validRatios.map(r => r.name)
        }
      };
    }
  }
];

// ============================================
// COMBINED RULES EXPORT
// ============================================

export const allHeroImageRules: HeroValidationRule[] = [
  ...centralObjectRules,
  ...textOverlayRules,
  ...logoRules,
  ...accessibilityRules,
  ...technicalRules
];

/**
 * Get rules by category
 */
export const getRulesByCategory = (category: string): HeroValidationRule[] => {
  return allHeroImageRules.filter(rule => rule.category === category);
};

/**
 * Get rules by severity
 */
export const getRulesBySeverity = (severity: HeroValidationSeverity): HeroValidationRule[] => {
  return allHeroImageRules.filter(rule => rule.severity === severity);
};

/**
 * Get only rules that have auto-fix available
 */
export const getAutoFixableRules = (): HeroValidationRule[] => {
  return allHeroImageRules.filter(rule => rule.autoFixAvailable);
};

/**
 * Rule categories for UI display
 */
export const ruleCategories = [
  { id: 'centerpiece', name: 'Central Object', icon: 'image' },
  { id: 'text', name: 'Text Overlay', icon: 'type' },
  { id: 'logo', name: 'Logo', icon: 'badge' },
  { id: 'accessibility', name: 'Accessibility', icon: 'accessibility' },
  { id: 'technical', name: 'Technical', icon: 'settings' }
] as const;
