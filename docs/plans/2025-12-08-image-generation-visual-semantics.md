# Image Generation & Visual Semantics System - Implementation Plan

## Overview
Implement a comprehensive image generation and management system for the content generation pipeline, following the Holistic SEO framework's Visual Semantics rules.

## Context & Requirements

### Source Documents
- `docs/build-docs/images img.md` - Complete image audit rules
- `docs/build-docs/image - hero image.md` - Hero image specifications
- `docs/build-docs/Content brief rules.md` - Brief integration
- `docs/build-docs/structured data.md` - Schema requirements

### API Keys Available
| Service | Purpose |
|---------|---------|
| Cloudinary | Image hosting & optimization |
| MarkupGo | Hero images with text overlays |
| Gemini | AI image generation (existing) |

### Key Design Decisions
1. **On-demand generation only** - Pass 4 creates placeholders, user triggers generation
2. **Static images first** - Interactive charts/components deferred
3. **Cloudinary free tier** - For image storage
4. **Brand Kit at topical map level** - In business_info

---

## Phase 1: Foundation Types & Brand Kit

### Task 1.1: Add Image Types to `types.ts`

**File:** `types.ts`

Add after line ~310 (after VisualSemantics):

```typescript
// Image Generation Types
export type ImageType = 'HERO' | 'SECTION' | 'INFOGRAPHIC' | 'CHART' | 'DIAGRAM' | 'AUTHOR';

export interface ImagePlaceholder {
  id: string;
  type: ImageType;
  position: number;
  sectionKey?: string;
  description: string;
  altTextSuggestion: string;
  status: 'placeholder' | 'generating' | 'uploaded' | 'generated' | 'error';
  generatedUrl?: string;
  userUploadUrl?: string;
  specs: ImageSpecs;
  metadata?: ImageMetadata;
}

export interface ImageSpecs {
  width: number;
  height: number;
  format: 'avif' | 'webp' | 'png' | 'jpeg';
  maxFileSize: number;
  textOverlay?: {
    text: string;
    position: 'center' | 'bottom' | 'top';
    style: string;
  };
  logoOverlay?: {
    position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
    opacity: number;
  };
}

export interface ImageMetadata {
  filename: string;
  altText: string;
  caption?: string;
  exif: {
    author: string;
    copyright: string;
    software: string;
    description: string;
  };
  iptc: {
    creator: string;
    rights: string;
    source: string;
    keywords: string[];
  };
  schema: {
    "@type": "ImageObject";
    url: string;
    width: number;
    height: number;
    caption: string;
    license?: string;
    acquireLicensePage?: string;
  };
}

export interface BrandKit {
  logo?: {
    url: string;
    cloudinaryId?: string;
  };
  logoPlacement: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  logoOpacity: number;
  colors: {
    primary: string;
    secondary: string;
    textOnImage: string;
    overlayGradient?: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  copyright: {
    holder: string;
    licenseUrl?: string;
  };
  heroTemplates: HeroTemplate[];
}

export interface HeroTemplate {
  id: string;
  name: string;
  description: string;
  markupGoTemplateId?: string;
  style: {
    textPosition: 'center' | 'bottom-left' | 'bottom-center' | 'top-center';
    hasGradientOverlay: boolean;
    hasSubtitle: boolean;
    backgroundColor?: string;
  };
  preview?: string;
}
```

**Verification:** `npx tsc --noEmit` passes

---

### Task 1.2: Extend BusinessInfo with BrandKit

**File:** `types.ts`

Find the `BusinessInfo` interface and add:

```typescript
// Add to BusinessInfo interface
brandKit?: BrandKit;
cloudinaryCloudName?: string;
cloudinaryApiKey?: string;
markupGoApiKey?: string;
```

**Verification:** TypeScript compiles without errors

---

### Task 1.3: Create Default Hero Templates

**File:** `config/imageTemplates.ts` (NEW)

```typescript
// config/imageTemplates.ts
import { HeroTemplate } from '../types';

export const DEFAULT_HERO_TEMPLATES: HeroTemplate[] = [
  {
    id: 'bold-center',
    name: 'Bold Center',
    description: 'Large title centered with gradient overlay',
    style: {
      textPosition: 'center',
      hasGradientOverlay: true,
      hasSubtitle: false,
    },
  },
  {
    id: 'bottom-bar',
    name: 'Bottom Bar',
    description: 'Title at bottom with dark bar overlay',
    style: {
      textPosition: 'bottom-center',
      hasGradientOverlay: true,
      hasSubtitle: true,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Small title, large visual space',
    style: {
      textPosition: 'bottom-left',
      hasGradientOverlay: false,
      hasSubtitle: false,
    },
  },
  {
    id: 'gradient-fade',
    name: 'Gradient Fade',
    description: 'Title fades into background',
    style: {
      textPosition: 'center',
      hasGradientOverlay: true,
      hasSubtitle: true,
    },
  },
];

export const IMAGE_SPECS_BY_TYPE = {
  HERO: {
    width: 1200,
    height: 630,
    format: 'avif' as const,
    maxFileSize: 100,
  },
  SECTION: {
    width: 800,
    height: 600,
    format: 'webp' as const,
    maxFileSize: 80,
  },
  INFOGRAPHIC: {
    width: 800,
    height: 1200,
    format: 'png' as const,
    maxFileSize: 200,
  },
  CHART: {
    width: 800,
    height: 600,
    format: 'png' as const,
    maxFileSize: 100,
  },
  DIAGRAM: {
    width: 1000,
    height: 600,
    format: 'png' as const,
    maxFileSize: 150,
  },
  AUTHOR: {
    width: 400,
    height: 400,
    format: 'webp' as const,
    maxFileSize: 50,
  },
};
```

**Verification:** File exists and exports are accessible

---

### Task 1.4: Create BrandKitEditor Component

**File:** `components/BrandKitEditor.tsx` (NEW)

```typescript
// components/BrandKitEditor.tsx
import React, { useState } from 'react';
import { BrandKit, HeroTemplate } from '../types';
import { DEFAULT_HERO_TEMPLATES } from '../config/imageTemplates';
import { Card } from './ui/Card';
import { Label } from './ui/Label';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { InfoTooltip } from './ui/InfoTooltip';

interface BrandKitEditorProps {
  brandKit: BrandKit | undefined;
  onChange: (brandKit: BrandKit) => void;
}

const defaultBrandKit: BrandKit = {
  logoPlacement: 'bottom-right',
  logoOpacity: 0.3,
  colors: {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    textOnImage: '#FFFFFF',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  copyright: {
    holder: '',
  },
  heroTemplates: DEFAULT_HERO_TEMPLATES,
};

export const BrandKitEditor: React.FC<BrandKitEditorProps> = ({ brandKit, onChange }) => {
  const kit = brandKit || defaultBrandKit;

  const updateKit = (updates: Partial<BrandKit>) => {
    onChange({ ...kit, ...updates });
  };

  const updateColors = (colorUpdates: Partial<BrandKit['colors']>) => {
    onChange({ ...kit, colors: { ...kit.colors, ...colorUpdates } });
  };

  const updateCopyright = (copyrightUpdates: Partial<BrandKit['copyright']>) => {
    onChange({ ...kit, copyright: { ...kit.copyright, ...copyrightUpdates } });
  };

  return (
    <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/30">
      <h3 className="text-lg font-semibold text-amber-400 flex items-center mb-4">
        Brand Kit
        <InfoTooltip text="Configure your brand assets for consistent image generation. Logo, colors, and text styles will be applied to generated images." />
      </h3>

      <div className="space-y-4">
        {/* Logo Section */}
        <div>
          <Label>Logo URL</Label>
          <Input
            value={kit.logo?.url || ''}
            onChange={(e) => updateKit({ logo: { url: e.target.value } })}
            placeholder="https://... (Cloudinary or direct URL)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Logo Position</Label>
            <Select
              value={kit.logoPlacement}
              onChange={(e) => updateKit({ logoPlacement: e.target.value as BrandKit['logoPlacement'] })}
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
            </Select>
          </div>
          <div>
            <Label>Logo Opacity</Label>
            <Input
              type="number"
              min="0.1"
              max="1"
              step="0.1"
              value={kit.logoOpacity}
              onChange={(e) => updateKit({ logoOpacity: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        {/* Colors Section */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={kit.colors.primary}
                onChange={(e) => updateColors({ primary: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={kit.colors.primary}
                onChange={(e) => updateColors({ primary: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label>Secondary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={kit.colors.secondary}
                onChange={(e) => updateColors({ secondary: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={kit.colors.secondary}
                onChange={(e) => updateColors({ secondary: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label>Text on Image</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={kit.colors.textOnImage}
                onChange={(e) => updateColors({ textOnImage: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={kit.colors.textOnImage}
                onChange={(e) => updateColors({ textOnImage: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Copyright Holder</Label>
            <Input
              value={kit.copyright.holder}
              onChange={(e) => updateCopyright({ holder: e.target.value })}
              placeholder="e.g., Kjenmarks SEO"
            />
          </div>
          <div>
            <Label>License URL (optional)</Label>
            <Input
              value={kit.copyright.licenseUrl || ''}
              onChange={(e) => updateCopyright({ licenseUrl: e.target.value })}
              placeholder="https://yoursite.com/license"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandKitEditor;
```

**Verification:** Component renders without errors

---

### Task 1.5: Integrate BrandKitEditor into BusinessInfoForm

**File:** `components/BusinessInfoForm.tsx`

Add import at top:
```typescript
import BrandKitEditor from './BrandKitEditor';
```

Add after AuthorConfiguration section (~line 292):
```typescript
{/* Brand Kit Section */}
<BrandKitEditor
  brandKit={localBusinessInfo.brandKit}
  onChange={(brandKit) => setLocalBusinessInfo(prev => ({ ...prev, brandKit }))}
/>
```

**Verification:** Brand Kit section appears in Business Info form

---

## Phase 2: Placeholder Enhancement

### Task 2.1: Create Placeholder Parser Service

**File:** `services/ai/imageGeneration/placeholderParser.ts` (NEW)

```typescript
// services/ai/imageGeneration/placeholderParser.ts
import { ImagePlaceholder, ImageType, ImageSpecs } from '../../../types';
import { IMAGE_SPECS_BY_TYPE } from '../../../config/imageTemplates';
import { v4 as uuidv4 } from 'uuid';

const IMAGE_PLACEHOLDER_REGEX = /\[IMAGE:\s*([^|]+)\s*\|\s*alt="([^"]+)"\]/g;

export interface ParsedPlaceholder {
  fullMatch: string;
  description: string;
  altText: string;
  position: number;
  sectionKey?: string;
}

export function parsePlaceholders(content: string): ParsedPlaceholder[] {
  const placeholders: ParsedPlaceholder[] = [];
  let match;

  while ((match = IMAGE_PLACEHOLDER_REGEX.exec(content)) !== null) {
    placeholders.push({
      fullMatch: match[0],
      description: match[1].trim(),
      altText: match[2].trim(),
      position: match.index,
    });
  }

  return placeholders;
}

export function determineImageType(description: string, position: number, isFirst: boolean): ImageType {
  const lowerDesc = description.toLowerCase();

  if (isFirst || lowerDesc.includes('hero') || lowerDesc.includes('featured')) {
    return 'HERO';
  }
  if (lowerDesc.includes('chart') || lowerDesc.includes('graph') || lowerDesc.includes('data')) {
    return 'CHART';
  }
  if (lowerDesc.includes('infographic') || lowerDesc.includes('statistics')) {
    return 'INFOGRAPHIC';
  }
  if (lowerDesc.includes('diagram') || lowerDesc.includes('flow') || lowerDesc.includes('process')) {
    return 'DIAGRAM';
  }
  if (lowerDesc.includes('author') || lowerDesc.includes('profile')) {
    return 'AUTHOR';
  }

  return 'SECTION';
}

export function createImagePlaceholder(
  parsed: ParsedPlaceholder,
  index: number,
  totalCount: number
): ImagePlaceholder {
  const isFirst = index === 0;
  const type = determineImageType(parsed.description, parsed.position, isFirst);
  const specs = IMAGE_SPECS_BY_TYPE[type];

  return {
    id: uuidv4(),
    type,
    position: parsed.position,
    description: parsed.description,
    altTextSuggestion: parsed.altText,
    status: 'placeholder',
    specs: {
      ...specs,
      textOverlay: type === 'HERO' ? {
        text: '',  // Will be filled from H1
        position: 'center',
        style: 'bold-center',
      } : undefined,
    },
  };
}

export function extractPlaceholdersFromDraft(draft: string): ImagePlaceholder[] {
  const parsed = parsePlaceholders(draft);
  return parsed.map((p, i) => createImagePlaceholder(p, i, parsed.length));
}
```

**Verification:** Function correctly parses `[IMAGE: ... | alt="..."]` patterns

---

### Task 2.2: Enhance Pass 4 Prompt for Detailed Specs

**File:** `config/prompts.ts`

Replace `PASS_4_VISUAL_SEMANTICS_PROMPT` (~line 2353):

```typescript
export const PASS_4_VISUAL_SEMANTICS_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in visual semantics.

**LANGUAGE: ${info.language || 'English'} | Target: ${info.targetMarket || 'Global'}**

## Current Draft
${draft}

## Central Entity: ${info.seedKeyword}
## Title: ${brief.title}

## Visual Semantics Rules:
1. **Alt Tag Vocabulary Extension**: Alt tags MUST use NEW vocabulary not in H1/Title (synonyms, related terms)
2. **Context Bridging**: Alt text bridges the image to surrounding content
3. **No Image Between H and Text**: NEVER place image between heading and its subordinate text
4. **Textual Qualification**: Sentence before/after image MUST reference it
5. **LCP Prominence**: First major image relates directly to Central Entity

## Image Types to Consider:
- **HERO**: Top of page, LCP element, includes text overlay with title/keyword
- **SECTION**: Supporting content, placed AFTER definitions/explanations
- **CHART**: For statistical data, comparisons, trends
- **INFOGRAPHIC**: For bullet points, statistics, process summaries
- **DIAGRAM**: For process flows, how-to steps, decision trees

## Instructions:
Insert image placeholders using this EXACT format:
[IMAGE: detailed description of what the image should show | alt="vocabulary-extending alt text"]

Placement rules:
- HERO image: After first paragraph (LCP position)
- SECTION images: After key definitions or explanations
- CHART/INFOGRAPHIC: Where data needs visualization
- NEVER immediately after a heading - always after subordinate text

Image description should include:
- What object/scene should be depicted
- What text overlay is needed (for HERO)
- What data should be visualized (for CHART)

Examples:
[IMAGE: Hero image showing modern contract management dashboard interface with title overlay "${brief.title}" | alt="digital contract workflow automation platform interface"]

[IMAGE: Bar chart comparing contract processing times before and after automation showing 60% reduction | alt="contract automation efficiency metrics comparison"]

[IMAGE: Step-by-step diagram showing document approval workflow from submission to signature | alt="automated document approval process stages"]

**Write all descriptions and alt text in ${info.language || 'English'}.**

Return the COMPLETE article with image placeholders inserted. Do not summarize or truncate.
`;
```

**Verification:** Pass 4 generates more detailed placeholders

---

### Task 2.3: Store Placeholders in Content Generation Job

**File:** `services/ai/contentGeneration/orchestrator.ts`

Add method to orchestrator class:

```typescript
async updateImagePlaceholders(jobId: string, placeholders: ImagePlaceholder[]): Promise<void> {
  const { error } = await this.supabase
    .from('content_generation_jobs')
    .update({
      image_placeholders: placeholders as unknown as Json,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  if (error) throw new Error(`Failed to update image placeholders: ${error.message}`);
}
```

**File:** `types.ts` - Add to ContentGenerationJob:

```typescript
image_placeholders?: ImagePlaceholder[];
```

**Verification:** Placeholders can be saved to and loaded from database

---

## Phase 3: Cloudinary Integration

### Task 3.1: Create Cloudinary Service

**File:** `services/cloudinaryService.ts` (NEW)

```typescript
// services/cloudinaryService.ts
import { BusinessInfo } from '../types';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function uploadToCloudinary(
  file: File | Blob,
  businessInfo: BusinessInfo,
  options: {
    folder?: string;
    publicId?: string;
    transformation?: string;
  } = {}
): Promise<CloudinaryUploadResult> {
  const cloudName = businessInfo.cloudinaryCloudName;
  const apiKey = businessInfo.cloudinaryApiKey;

  if (!cloudName || !apiKey) {
    throw new Error('Cloudinary credentials not configured');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('upload_preset', 'ml_default'); // Unsigned upload preset

  if (options.folder) {
    formData.append('folder', options.folder);
  }
  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }

  const response = await fetch(
    `${CLOUDINARY_UPLOAD_URL}/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudinary upload failed: ${error}`);
  }

  return response.json();
}

export function getOptimizedUrl(
  publicId: string,
  cloudName: string,
  options: {
    width?: number;
    height?: number;
    format?: 'avif' | 'webp' | 'auto';
    quality?: number;
  } = {}
): string {
  const transforms: string[] = [];

  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.format) transforms.push(`f_${options.format}`);
  if (options.quality) transforms.push(`q_${options.quality}`);

  transforms.push('c_fill'); // Crop mode

  const transformString = transforms.join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${publicId}`;
}
```

**Verification:** Upload and URL generation functions work

---

### Task 3.2: Create MarkupGo Provider for Hero Images

**File:** `services/ai/imageGeneration/providers/markupGoProvider.ts` (NEW)

```typescript
// services/ai/imageGeneration/providers/markupGoProvider.ts
import { BusinessInfo, BrandKit, HeroTemplate } from '../../../../types';

const MARKUPGO_API_URL = 'https://api.markupgo.com/api/v1';

interface MarkupGoImageRequest {
  template_id?: string;
  html?: string;
  css?: string;
  context?: Record<string, any>;
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg' | 'webp';
}

export async function generateHeroImage(
  title: string,
  subtitle: string | undefined,
  backgroundPrompt: string,
  brandKit: BrandKit,
  template: HeroTemplate,
  apiKey: string
): Promise<Blob> {
  // Build HTML template for hero image
  const html = buildHeroHtml(title, subtitle, brandKit, template);
  const css = buildHeroCss(brandKit, template);

  const request: MarkupGoImageRequest = {
    html,
    css,
    width: 1200,
    height: 630,
    format: 'png',
    context: {
      title,
      subtitle,
      logoUrl: brandKit.logo?.url,
      primaryColor: brandKit.colors.primary,
      textColor: brandKit.colors.textOnImage,
    },
  };

  const response = await fetch(`${MARKUPGO_API_URL}/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MarkupGo API error: ${error}`);
  }

  return response.blob();
}

function buildHeroHtml(
  title: string,
  subtitle: string | undefined,
  brandKit: BrandKit,
  template: HeroTemplate
): string {
  const logoHtml = brandKit.logo?.url
    ? `<img class="logo logo-${brandKit.logoPlacement}" src="${brandKit.logo.url}" style="opacity: ${brandKit.logoOpacity}" />`
    : '';

  const subtitleHtml = subtitle && template.style.hasSubtitle
    ? `<p class="subtitle">${subtitle}</p>`
    : '';

  return `
    <div class="hero-container">
      <div class="overlay ${template.style.hasGradientOverlay ? 'gradient' : ''}"></div>
      <div class="content text-${template.style.textPosition}">
        <h1 class="title">${title}</h1>
        ${subtitleHtml}
      </div>
      ${logoHtml}
    </div>
  `;
}

function buildHeroCss(brandKit: BrandKit, template: HeroTemplate): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .hero-container {
      width: 1200px;
      height: 630px;
      position: relative;
      background: ${template.style.backgroundColor || brandKit.colors.primary};
      font-family: ${brandKit.fonts.heading}, sans-serif;
    }
    .overlay {
      position: absolute;
      inset: 0;
    }
    .overlay.gradient {
      background: linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%);
    }
    .content {
      position: absolute;
      z-index: 10;
      color: ${brandKit.colors.textOnImage};
      padding: 40px;
    }
    .text-center { inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
    .text-bottom-left { bottom: 0; left: 0; }
    .text-bottom-center { bottom: 0; left: 0; right: 0; text-align: center; }
    .text-top-center { top: 0; left: 0; right: 0; text-align: center; }
    .title {
      font-size: 48px;
      font-weight: 700;
      line-height: 1.2;
      max-width: 900px;
    }
    .subtitle {
      font-size: 24px;
      margin-top: 16px;
      opacity: 0.9;
    }
    .logo {
      position: absolute;
      width: 120px;
      height: auto;
    }
    .logo-bottom-right { bottom: 20px; right: 20px; }
    .logo-bottom-left { bottom: 20px; left: 20px; }
    .logo-top-right { top: 20px; right: 20px; }
    .logo-top-left { top: 20px; left: 20px; }
  `;
}
```

**Verification:** Hero image generation works with MarkupGo API

---

## Phase 4: Image Generation UI

### Task 4.1: Create ImagePlaceholderCard Component

**File:** `components/imageGeneration/ImagePlaceholderCard.tsx` (NEW)

```typescript
// components/imageGeneration/ImagePlaceholderCard.tsx
import React from 'react';
import { ImagePlaceholder } from '../../types';
import { Button } from '../ui/Button';

interface ImagePlaceholderCardProps {
  placeholder: ImagePlaceholder;
  onGenerate: () => void;
  onUpload: () => void;
  onSkip: () => void;
}

export const ImagePlaceholderCard: React.FC<ImagePlaceholderCardProps> = ({
  placeholder,
  onGenerate,
  onUpload,
  onSkip,
}) => {
  const typeColors = {
    HERO: 'border-amber-500 bg-amber-900/20',
    SECTION: 'border-blue-500 bg-blue-900/20',
    INFOGRAPHIC: 'border-purple-500 bg-purple-900/20',
    CHART: 'border-green-500 bg-green-900/20',
    DIAGRAM: 'border-cyan-500 bg-cyan-900/20',
    AUTHOR: 'border-pink-500 bg-pink-900/20',
  };

  const statusBadges = {
    placeholder: 'bg-gray-600 text-gray-200',
    generating: 'bg-yellow-600 text-yellow-100 animate-pulse',
    generated: 'bg-green-600 text-green-100',
    uploaded: 'bg-blue-600 text-blue-100',
    error: 'bg-red-600 text-red-100',
  };

  return (
    <div className={`p-4 rounded-lg border ${typeColors[placeholder.type]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-700">
            {placeholder.type}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${statusBadges[placeholder.status]}`}>
            {placeholder.status}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {placeholder.specs.width}x{placeholder.specs.height}
        </span>
      </div>

      <p className="text-sm text-gray-300 mb-2">{placeholder.description}</p>
      <p className="text-xs text-gray-500 italic mb-3">Alt: {placeholder.altTextSuggestion}</p>

      {placeholder.status === 'placeholder' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={onGenerate}>Generate</Button>
          <Button size="sm" variant="secondary" onClick={onUpload}>Upload</Button>
          <Button size="sm" variant="ghost" onClick={onSkip}>Skip</Button>
        </div>
      )}

      {placeholder.generatedUrl && (
        <img
          src={placeholder.generatedUrl}
          alt={placeholder.altTextSuggestion}
          className="mt-2 rounded max-h-32 object-cover"
        />
      )}
    </div>
  );
};
```

**Verification:** Component renders all placeholder states correctly

---

### Task 4.2: Create ImageGenerationModal

**File:** `components/imageGeneration/ImageGenerationModal.tsx` (NEW)

```typescript
// components/imageGeneration/ImageGenerationModal.tsx
import React, { useState } from 'react';
import { ImagePlaceholder, BrandKit, HeroTemplate, BusinessInfo } from '../../types';
import { DEFAULT_HERO_TEMPLATES } from '../../config/imageTemplates';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Loader } from '../ui/Loader';

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeholder: ImagePlaceholder;
  brandKit?: BrandKit;
  businessInfo: BusinessInfo;
  onGenerate: (options: GenerationOptions) => Promise<void>;
}

export interface GenerationOptions {
  textOverlay?: string;
  templateId?: string;
  altText: string;
  additionalPrompt?: string;
}

export const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
  isOpen,
  onClose,
  placeholder,
  brandKit,
  businessInfo,
  onGenerate,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [textOverlay, setTextOverlay] = useState(placeholder.specs.textOverlay?.text || '');
  const [selectedTemplate, setSelectedTemplate] = useState('bold-center');
  const [altText, setAltText] = useState(placeholder.altTextSuggestion);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const templates = brandKit?.heroTemplates || DEFAULT_HERO_TEMPLATES;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await onGenerate({
        textOverlay: placeholder.type === 'HERO' ? textOverlay : undefined,
        templateId: placeholder.type === 'HERO' ? selectedTemplate : undefined,
        altText,
        additionalPrompt,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">
          Generate {placeholder.type} Image
        </h2>

        <div className="space-y-4">
          {/* Description */}
          <div>
            <Label>Image Description</Label>
            <p className="text-sm text-gray-400 bg-gray-900 p-2 rounded">
              {placeholder.description}
            </p>
          </div>

          {/* Hero-specific options */}
          {placeholder.type === 'HERO' && (
            <>
              <div>
                <Label>Text Overlay</Label>
                <Input
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                  placeholder="Title text to display on image"
                />
              </div>
              <div>
                <Label>Template Style</Label>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} - {t.description}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          {/* Alt Text */}
          <div>
            <Label>Alt Text (SEO)</Label>
            <Textarea
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">
              Should extend vocabulary beyond H1/Title
            </p>
          </div>

          {/* Additional prompt */}
          <div>
            <Label>Additional Instructions (optional)</Label>
            <Textarea
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              rows={2}
              placeholder="Any specific requirements for the image..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Specs */}
          <div className="text-xs text-gray-500 flex gap-4">
            <span>Size: {placeholder.specs.width}x{placeholder.specs.height}</span>
            <span>Format: {placeholder.specs.format.toUpperCase()}</span>
            <span>Max: {placeholder.specs.maxFileSize}KB</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <><Loader className="w-4 h-4 mr-2" /> Generating...</> : 'Generate Image'}
          </Button>
        </div>
      </div>
    </div>
  );
};
```

**Verification:** Modal opens and submits generation request

---

## Phase 5: Integration & Orchestration

### Task 5.1: Create Image Generation Orchestrator

**File:** `services/ai/imageGeneration/orchestrator.ts` (NEW)

```typescript
// services/ai/imageGeneration/orchestrator.ts
import { ImagePlaceholder, BusinessInfo, BrandKit, GenerationOptions } from '../../../types';
import { generateHeroImage } from './providers/markupGoProvider';
import { uploadToCloudinary, getOptimizedUrl } from '../../cloudinaryService';
import { DEFAULT_HERO_TEMPLATES } from '../../../config/imageTemplates';

export async function generateImage(
  placeholder: ImagePlaceholder,
  options: GenerationOptions,
  businessInfo: BusinessInfo
): Promise<ImagePlaceholder> {
  const brandKit = businessInfo.brandKit;

  try {
    let imageBlob: Blob;

    if (placeholder.type === 'HERO' && businessInfo.markupGoApiKey) {
      // Use MarkupGo for hero images with text
      const templates = brandKit?.heroTemplates || DEFAULT_HERO_TEMPLATES;
      const template = templates.find(t => t.id === options.templateId) || templates[0];

      imageBlob = await generateHeroImage(
        options.textOverlay || '',
        undefined,
        placeholder.description,
        brandKit || getDefaultBrandKit(),
        template,
        businessInfo.markupGoApiKey
      );
    } else {
      // Use Gemini for other image types (to be implemented)
      throw new Error('Gemini image generation not yet implemented');
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      imageBlob,
      businessInfo,
      {
        folder: `seo-images/${placeholder.type.toLowerCase()}`,
        publicId: generatePublicId(placeholder, businessInfo),
      }
    );

    return {
      ...placeholder,
      status: 'generated',
      generatedUrl: uploadResult.secure_url,
      metadata: {
        filename: `${generatePublicId(placeholder, businessInfo)}.${placeholder.specs.format}`,
        altText: options.altText,
        exif: {
          author: brandKit?.copyright.holder || businessInfo.authorName || '',
          copyright: `© ${brandKit?.copyright.holder || businessInfo.authorName || ''} ${new Date().getFullYear()}`,
          software: 'Holistic SEO Generator',
          description: placeholder.description,
        },
        iptc: {
          creator: businessInfo.authorName || '',
          rights: brandKit?.copyright.holder || '',
          source: businessInfo.domain || '',
          keywords: extractKeywords(placeholder.description),
        },
        schema: {
          "@type": "ImageObject",
          url: uploadResult.secure_url,
          width: uploadResult.width,
          height: uploadResult.height,
          caption: options.altText,
          license: brandKit?.copyright.licenseUrl,
        },
      },
    };
  } catch (error) {
    return {
      ...placeholder,
      status: 'error',
    };
  }
}

function generatePublicId(placeholder: ImagePlaceholder, info: BusinessInfo): string {
  const entity = (info.seedKeyword || 'image').toLowerCase().replace(/\s+/g, '-');
  const type = placeholder.type.toLowerCase();
  const timestamp = Date.now();
  return `${entity}-${type}-${timestamp}`;
}

function extractKeywords(description: string): string[] {
  return description
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 10);
}

function getDefaultBrandKit(): BrandKit {
  return {
    logoPlacement: 'bottom-right',
    logoOpacity: 0.3,
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      textOnImage: '#FFFFFF',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    copyright: { holder: '' },
    heroTemplates: DEFAULT_HERO_TEMPLATES,
  };
}
```

**Verification:** End-to-end generation flow works

---

## Database Migration

### Task 6.1: Add image_placeholders to content_generation_jobs

**File:** `supabase/migrations/YYYYMMDD_add_image_placeholders.sql` (NEW)

```sql
-- Add image placeholders column to content_generation_jobs
ALTER TABLE content_generation_jobs
ADD COLUMN IF NOT EXISTS image_placeholders JSONB DEFAULT '[]'::jsonb;

-- Add brand kit fields to topical_maps business_info
-- (This is handled by the existing JSONB business_info column)

COMMENT ON COLUMN content_generation_jobs.image_placeholders IS 'Array of ImagePlaceholder objects for image generation tracking';
```

**Verification:** Migration runs successfully

---

## Verification Checklist

- [ ] Types compile without errors (`npx tsc --noEmit`)
- [ ] Brand Kit editor renders in Business Info form
- [ ] Image placeholders extracted from Pass 4 output
- [ ] Cloudinary upload works (test with sample image)
- [ ] MarkupGo hero generation works (test with API)
- [ ] Generation modal opens and submits
- [ ] Generated images display in placeholder cards
- [ ] Full build succeeds (`npm run build`)

---

## Future Enhancements (Out of Scope)

1. **Chart.js integration** for data visualization
2. **Gemini Imagen** for AI-generated section images
3. **Interactive charts** (Chart.js components)
4. **Project-level brand kit** inheritance
5. **Image sitemap generation**
6. **Bulk generation** for all placeholders
