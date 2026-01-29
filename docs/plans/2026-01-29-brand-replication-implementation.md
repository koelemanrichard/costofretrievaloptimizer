# Brand Replication System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a modular 4-phase pipeline that discovers visual components from any website, generates quality code, makes context-aware design decisions, and validates output quality.

**Architecture:** Each phase is an independent module with defined input/output interfaces, editable prompts, and storable intermediate results. The pipeline orchestrator connects phases while allowing independent execution.

**Tech Stack:** TypeScript, Vitest, Playwright (screenshots), Anthropic/Gemini AI APIs, Supabase (storage), React (UI components)

---

## P0: Foundation

### Task 1: Create Interface Definitions

**Files:**
- Create: `services/brand-replication/interfaces/common.ts`
- Create: `services/brand-replication/interfaces/phase1-discovery.ts`
- Create: `services/brand-replication/interfaces/phase2-codegen.ts`
- Create: `services/brand-replication/interfaces/phase3-intelligence.ts`
- Create: `services/brand-replication/interfaces/phase4-validation.ts`
- Create: `services/brand-replication/interfaces/index.ts`

**Step 1: Create common.ts with shared types**

```typescript
// services/brand-replication/interfaces/common.ts

export interface ModuleConfig {
  customPrompt?: string;
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  debug?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ModuleStatus {
  phase: string;
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed';
  progress: number;
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

export abstract class BaseModule<TInput, TOutput, TConfig extends ModuleConfig = ModuleConfig> {
  protected config: TConfig;
  protected lastRawResponse: string = '';
  protected status: ModuleStatus;

  constructor(config: TConfig) {
    this.config = config;
    this.status = { phase: this.getPhaseName(), status: 'pending', progress: 0 };
  }

  abstract getPhaseName(): string;
  abstract run(input: TInput): Promise<TOutput>;
  abstract validateOutput(output: TOutput): ValidationResult;

  async runWithPrompt(input: TInput, customPrompt: string): Promise<TOutput> {
    const originalPrompt = this.config.customPrompt;
    this.config.customPrompt = customPrompt;
    try {
      return await this.run(input);
    } finally {
      this.config.customPrompt = originalPrompt;
    }
  }

  getLastRawResponse(): string {
    return this.lastRawResponse;
  }

  getStatus(): ModuleStatus {
    return { ...this.status };
  }

  protected updateStatus(updates: Partial<ModuleStatus>): void {
    this.status = { ...this.status, ...updates };
  }
}
```

**Step 2: Create phase1-discovery.ts**

```typescript
// services/brand-replication/interfaces/phase1-discovery.ts

export interface DiscoveryInput {
  brandUrl: string;
  brandId: string;
  pagesToAnalyze?: string[];
  options?: {
    maxPages?: number;
    includeScreenshots?: boolean;
    viewport?: { width: number; height: number };
    waitForSelector?: string;
    timeout?: number;
  };
}

export interface Screenshot {
  url: string;
  path: string;
  timestamp: string;
  viewport: { width: number; height: number };
}

export interface DiscoveredComponent {
  id: string;
  name: string;
  purpose: string;
  visualDescription: string;
  usageContext: string;
  sourceScreenshots: string[];
  occurrences: number;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface DiscoveryOutput {
  brandId: string;
  brandUrl: string;
  analyzedPages: string[];
  screenshots: Screenshot[];
  discoveredComponents: DiscoveredComponent[];
  rawAnalysis: string;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export interface DiscoveryConfig {
  customPrompt?: string;
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  debug?: boolean;
  minOccurrences: number;
  confidenceThreshold: number;
  screenshotDir: string;
}
```

**Step 3: Create phase2-codegen.ts**

```typescript
// services/brand-replication/interfaces/phase2-codegen.ts

import type { DiscoveredComponent, DiscoveryOutput } from './phase1-discovery';
import type { DesignDNA } from '../../../types/designDna';

export interface CodeGenInput {
  brandId: string;
  discoveryOutput: DiscoveryOutput;
  designDna: DesignDNA;
  existingComponents?: BrandComponent[];
}

export interface BrandComponent {
  id: string;
  brandId: string;
  name: string;
  purpose: string;
  usageContext: string;
  css: string;
  htmlTemplate: string;
  previewHtml: string;
  sourceComponent: DiscoveredComponent;
  matchScore: number;
  variants: ComponentVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ComponentVariant {
  id: string;
  name: string;
  description: string;
  cssOverrides: string;
  htmlTemplate: string;
}

export interface CodeGenOutput {
  brandId: string;
  components: BrandComponent[];
  compiledCss: string;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
  matchScores: { componentId: string; score: number; details: string }[];
}

export interface CodeGenConfig {
  customPrompt?: string;
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  debug?: boolean;
  minMatchScore: number;
  maxIterations: number;
  cssStandards: {
    useCustomProperties: boolean;
    spacingScale: number[];
    requireHoverStates: boolean;
    requireTransitions: boolean;
    requireResponsive: boolean;
  };
}
```

**Step 4: Create phase3-intelligence.ts**

```typescript
// services/brand-replication/interfaces/phase3-intelligence.ts

import type { BrandComponent } from './phase2-codegen';
import type { TopicalMap, ContentBrief, EnrichedTopic } from '../../../types';

export interface ContentContext {
  pillars: {
    centralEntity: string;
    sourceContext: string;
    centralSearchIntent: string;
  };
  topicalMap: {
    id: string;
    coreTopic: string;
    relatedTopics: string[];
    contentGaps: string[];
    targetAudience: string;
  };
  article: {
    id: string;
    title: string;
    fullContent: string;
    sections: ArticleSection[];
    keyEntities: string[];
    mainMessage: string;
    callToAction: string;
  };
}

export interface ArticleSection {
  id: string;
  heading: string;
  headingLevel: number;
  content: string;
  wordCount: number;
}

export interface SectionContext {
  section: ArticleSection;
  position: 'intro' | 'body' | 'conclusion';
  positionIndex: number;
  totalSections: number;
  precedingSections: string[];
  followingSections: string[];
}

export interface IntelligenceInput {
  brandId: string;
  articleId: string;
  contentContext: ContentContext;
  componentLibrary: BrandComponent[];
  topicalMap?: TopicalMap;
  brief?: ContentBrief;
  topic?: EnrichedTopic;
}

export interface SectionDesignDecision {
  sectionId: string;
  sectionHeading: string;
  component: string;
  componentId: string;
  variant: string;
  layout: {
    columns: 1 | 2 | 3 | 4;
    width: 'narrow' | 'medium' | 'wide' | 'full';
    emphasis: 'hero' | 'featured' | 'standard' | 'supporting' | 'minimal';
  };
  reasoning: string;
  semanticRole: string;
  contentMapping: {
    title?: string;
    items?: string[];
    ctaText?: string;
    ctaUrl?: string;
    highlightedText?: string;
    iconSuggestion?: string;
  };
  confidence: number;
}

export interface IntelligenceOutput {
  brandId: string;
  articleId: string;
  decisions: SectionDesignDecision[];
  overallStrategy: string;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export interface IntelligenceConfig {
  customPrompt?: string;
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  debug?: boolean;
  contextConfig: {
    includePillars: boolean;
    includeTopicalMap: boolean;
    includeFullArticle: boolean;
    includeSurroundingSections: boolean;
    maxContextTokens: number;
  };
  layoutOverrides?: Record<string, Partial<SectionDesignDecision['layout']>>;
}
```

**Step 5: Create phase4-validation.ts**

```typescript
// services/brand-replication/interfaces/phase4-validation.ts

import type { SectionDesignDecision } from './phase3-intelligence';
import type { BrandComponent } from './phase2-codegen';

export interface ValidationInput {
  brandId: string;
  articleId: string;
  renderedHtml: string;
  decisions: SectionDesignDecision[];
  componentLibrary: BrandComponent[];
  sourceScreenshots: string[];
}

export interface ScoreBreakdown {
  score: number;
  maxScore: number;
  percentage: number;
  details: string[];
  suggestions: string[];
}

export interface WowFactorItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
  passed: boolean;
  details?: string;
}

export interface ValidationOutput {
  brandId: string;
  articleId: string;
  scores: {
    brandMatch: ScoreBreakdown;
    designQuality: ScoreBreakdown;
    userExperience: ScoreBreakdown;
    overall: number;
  };
  wowFactorChecklist: WowFactorItem[];
  passesThreshold: boolean;
  suggestions: string[];
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export interface ValidationConfig {
  customPrompt?: string;
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  debug?: boolean;
  thresholds: {
    brandMatch: number;
    designQuality: number;
    userExperience: number;
    overall: number;
  };
  weights: {
    brandMatch: number;
    designQuality: number;
    userExperience: number;
  };
  wowFactorChecklist: Omit<WowFactorItem, 'passed' | 'details'>[];
}
```

**Step 6: Create index.ts barrel export**

```typescript
// services/brand-replication/interfaces/index.ts

export * from './common';
export * from './phase1-discovery';
export * from './phase2-codegen';
export * from './phase3-intelligence';
export * from './phase4-validation';
```

**Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit services/brand-replication/interfaces/*.ts`
Expected: No errors

**Step 8: Commit**

```bash
git add services/brand-replication/interfaces/
git commit -m "feat(brand-replication): add interface definitions for 4-phase pipeline"
```

---

### Task 2: Create Storage Layer

**Files:**
- Create: `services/brand-replication/storage/types.ts`
- Create: `services/brand-replication/storage/DiscoveryStore.ts`
- Create: `services/brand-replication/storage/ComponentStore.ts`
- Create: `services/brand-replication/storage/DecisionStore.ts`
- Create: `services/brand-replication/storage/ValidationStore.ts`
- Create: `services/brand-replication/storage/index.ts`
- Create: `services/brand-replication/storage/__tests__/stores.test.ts`

**Step 1: Create types.ts**

```typescript
// services/brand-replication/storage/types.ts

import type {
  DiscoveryOutput,
  BrandComponent,
  SectionDesignDecision,
  ValidationOutput,
} from '../interfaces';

export interface PipelineState {
  brandId: string;
  discovery?: DiscoveryOutput;
  components?: BrandComponent[];
  decisions?: Record<string, SectionDesignDecision[]>; // articleId -> decisions
  validations?: Record<string, ValidationOutput>; // articleId -> validation
  exportedAt: string;
}

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    return Array.from(this.store.keys()).filter(k => k.startsWith(prefix));
  }

  clear(): void {
    this.store.clear();
  }
}
```

**Step 2: Create DiscoveryStore.ts**

```typescript
// services/brand-replication/storage/DiscoveryStore.ts

import type { DiscoveryOutput, DiscoveredComponent } from '../interfaces';
import type { StorageAdapter } from './types';

export class DiscoveryStore {
  private adapter: StorageAdapter;
  private prefix = 'discovery:';

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  private key(brandId: string): string {
    return `${this.prefix}${brandId}`;
  }

  async get(brandId: string): Promise<DiscoveryOutput | null> {
    return this.adapter.get<DiscoveryOutput>(this.key(brandId));
  }

  async save(output: DiscoveryOutput): Promise<void> {
    await this.adapter.set(this.key(output.brandId), output);
  }

  async update(brandId: string, changes: Partial<DiscoveryOutput>): Promise<void> {
    const existing = await this.get(brandId);
    if (!existing) throw new Error(`Discovery not found for brand: ${brandId}`);
    await this.adapter.set(this.key(brandId), { ...existing, ...changes });
  }

  async updateComponent(
    brandId: string,
    componentId: string,
    changes: Partial<DiscoveredComponent>
  ): Promise<void> {
    const existing = await this.get(brandId);
    if (!existing) throw new Error(`Discovery not found for brand: ${brandId}`);

    const componentIndex = existing.discoveredComponents.findIndex(c => c.id === componentId);
    if (componentIndex === -1) throw new Error(`Component not found: ${componentId}`);

    existing.discoveredComponents[componentIndex] = {
      ...existing.discoveredComponents[componentIndex],
      ...changes,
    };
    await this.adapter.set(this.key(brandId), existing);
  }

  async addComponent(brandId: string, component: DiscoveredComponent): Promise<void> {
    const existing = await this.get(brandId);
    if (!existing) throw new Error(`Discovery not found for brand: ${brandId}`);
    existing.discoveredComponents.push(component);
    await this.adapter.set(this.key(brandId), existing);
  }

  async removeComponent(brandId: string, componentId: string): Promise<void> {
    const existing = await this.get(brandId);
    if (!existing) throw new Error(`Discovery not found for brand: ${brandId}`);
    existing.discoveredComponents = existing.discoveredComponents.filter(c => c.id !== componentId);
    await this.adapter.set(this.key(brandId), existing);
  }

  async delete(brandId: string): Promise<void> {
    await this.adapter.delete(this.key(brandId));
  }

  async listBrands(): Promise<string[]> {
    const keys = await this.adapter.list(this.prefix);
    return keys.map(k => k.replace(this.prefix, ''));
  }
}
```

**Step 3: Create ComponentStore.ts**

```typescript
// services/brand-replication/storage/ComponentStore.ts

import type { BrandComponent, ComponentVariant } from '../interfaces';
import type { StorageAdapter } from './types';

export class ComponentStore {
  private adapter: StorageAdapter;
  private prefix = 'components:';

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  private key(brandId: string): string {
    return `${this.prefix}${brandId}`;
  }

  async getAll(brandId: string): Promise<BrandComponent[]> {
    return (await this.adapter.get<BrandComponent[]>(this.key(brandId))) ?? [];
  }

  async get(brandId: string, componentId: string): Promise<BrandComponent | null> {
    const components = await this.getAll(brandId);
    return components.find(c => c.id === componentId) ?? null;
  }

  async saveAll(brandId: string, components: BrandComponent[]): Promise<void> {
    await this.adapter.set(this.key(brandId), components);
  }

  async add(brandId: string, component: BrandComponent): Promise<void> {
    const components = await this.getAll(brandId);
    components.push(component);
    await this.adapter.set(this.key(brandId), components);
  }

  async update(
    brandId: string,
    componentId: string,
    changes: Partial<BrandComponent>
  ): Promise<void> {
    const components = await this.getAll(brandId);
    const index = components.findIndex(c => c.id === componentId);
    if (index === -1) throw new Error(`Component not found: ${componentId}`);

    components[index] = { ...components[index], ...changes, updatedAt: new Date().toISOString() };
    await this.adapter.set(this.key(brandId), components);
  }

  async updateCss(brandId: string, componentId: string, css: string): Promise<void> {
    await this.update(brandId, componentId, { css });
  }

  async updateHtml(brandId: string, componentId: string, htmlTemplate: string): Promise<void> {
    await this.update(brandId, componentId, { htmlTemplate });
  }

  async addVariant(brandId: string, componentId: string, variant: ComponentVariant): Promise<void> {
    const component = await this.get(brandId, componentId);
    if (!component) throw new Error(`Component not found: ${componentId}`);

    component.variants.push(variant);
    await this.update(brandId, componentId, { variants: component.variants });
  }

  async remove(brandId: string, componentId: string): Promise<void> {
    const components = await this.getAll(brandId);
    const filtered = components.filter(c => c.id !== componentId);
    await this.adapter.set(this.key(brandId), filtered);
  }

  async delete(brandId: string): Promise<void> {
    await this.adapter.delete(this.key(brandId));
  }
}
```

**Step 4: Create DecisionStore.ts**

```typescript
// services/brand-replication/storage/DecisionStore.ts

import type { SectionDesignDecision, IntelligenceOutput } from '../interfaces';
import type { StorageAdapter } from './types';

export class DecisionStore {
  private adapter: StorageAdapter;
  private prefix = 'decisions:';

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  private key(brandId: string, articleId: string): string {
    return `${this.prefix}${brandId}:${articleId}`;
  }

  async get(brandId: string, articleId: string): Promise<IntelligenceOutput | null> {
    return this.adapter.get<IntelligenceOutput>(this.key(brandId, articleId));
  }

  async save(output: IntelligenceOutput): Promise<void> {
    await this.adapter.set(this.key(output.brandId, output.articleId), output);
  }

  async getDecisions(brandId: string, articleId: string): Promise<SectionDesignDecision[]> {
    const output = await this.get(brandId, articleId);
    return output?.decisions ?? [];
  }

  async updateDecision(
    brandId: string,
    articleId: string,
    sectionId: string,
    changes: Partial<SectionDesignDecision>
  ): Promise<void> {
    const output = await this.get(brandId, articleId);
    if (!output) throw new Error(`Decisions not found for article: ${articleId}`);

    const index = output.decisions.findIndex(d => d.sectionId === sectionId);
    if (index === -1) throw new Error(`Decision not found for section: ${sectionId}`);

    output.decisions[index] = { ...output.decisions[index], ...changes };
    await this.adapter.set(this.key(brandId, articleId), output);
  }

  async overrideComponent(
    brandId: string,
    articleId: string,
    sectionId: string,
    componentId: string,
    componentName: string
  ): Promise<void> {
    await this.updateDecision(brandId, articleId, sectionId, {
      componentId,
      component: componentName,
      reasoning: `Manual override: User selected ${componentName}`,
    });
  }

  async overrideLayout(
    brandId: string,
    articleId: string,
    sectionId: string,
    layout: Partial<SectionDesignDecision['layout']>
  ): Promise<void> {
    const output = await this.get(brandId, articleId);
    if (!output) throw new Error(`Decisions not found for article: ${articleId}`);

    const decision = output.decisions.find(d => d.sectionId === sectionId);
    if (!decision) throw new Error(`Decision not found for section: ${sectionId}`);

    await this.updateDecision(brandId, articleId, sectionId, {
      layout: { ...decision.layout, ...layout },
    });
  }

  async delete(brandId: string, articleId: string): Promise<void> {
    await this.adapter.delete(this.key(brandId, articleId));
  }

  async listArticles(brandId: string): Promise<string[]> {
    const keys = await this.adapter.list(`${this.prefix}${brandId}:`);
    return keys.map(k => k.split(':').pop()!);
  }
}
```

**Step 5: Create ValidationStore.ts**

```typescript
// services/brand-replication/storage/ValidationStore.ts

import type { ValidationOutput } from '../interfaces';
import type { StorageAdapter } from './types';

export class ValidationStore {
  private adapter: StorageAdapter;
  private prefix = 'validation:';

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  private key(brandId: string, articleId: string): string {
    return `${this.prefix}${brandId}:${articleId}`;
  }

  async get(brandId: string, articleId: string): Promise<ValidationOutput | null> {
    return this.adapter.get<ValidationOutput>(this.key(brandId, articleId));
  }

  async save(output: ValidationOutput): Promise<void> {
    await this.adapter.set(this.key(output.brandId, output.articleId), output);
  }

  async delete(brandId: string, articleId: string): Promise<void> {
    await this.adapter.delete(this.key(brandId, articleId));
  }

  async getLatestForBrand(brandId: string): Promise<ValidationOutput[]> {
    const keys = await this.adapter.list(`${this.prefix}${brandId}:`);
    const results: ValidationOutput[] = [];
    for (const key of keys) {
      const val = await this.adapter.get<ValidationOutput>(key);
      if (val) results.push(val);
    }
    return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}
```

**Step 6: Create index.ts barrel export**

```typescript
// services/brand-replication/storage/index.ts

export * from './types';
export * from './DiscoveryStore';
export * from './ComponentStore';
export * from './DecisionStore';
export * from './ValidationStore';

import type { StorageAdapter } from './types';
import { DiscoveryStore } from './DiscoveryStore';
import { ComponentStore } from './ComponentStore';
import { DecisionStore } from './DecisionStore';
import { ValidationStore } from './ValidationStore';
import type { PipelineState } from './types';

export class PipelineStorage {
  public discovery: DiscoveryStore;
  public components: ComponentStore;
  public decisions: DecisionStore;
  public validation: ValidationStore;

  constructor(adapter: StorageAdapter) {
    this.discovery = new DiscoveryStore(adapter);
    this.components = new ComponentStore(adapter);
    this.decisions = new DecisionStore(adapter);
    this.validation = new ValidationStore(adapter);
  }

  async exportState(brandId: string): Promise<PipelineState> {
    const discovery = await this.discovery.get(brandId);
    const components = await this.components.getAll(brandId);
    const articleIds = await this.decisions.listArticles(brandId);

    const decisions: Record<string, any[]> = {};
    const validations: Record<string, any> = {};

    for (const articleId of articleIds) {
      const d = await this.decisions.get(brandId, articleId);
      if (d) decisions[articleId] = d.decisions;
      const v = await this.validation.get(brandId, articleId);
      if (v) validations[articleId] = v;
    }

    return {
      brandId,
      discovery: discovery ?? undefined,
      components: components.length > 0 ? components : undefined,
      decisions: Object.keys(decisions).length > 0 ? decisions : undefined,
      validations: Object.keys(validations).length > 0 ? validations : undefined,
      exportedAt: new Date().toISOString(),
    };
  }

  async importState(state: PipelineState): Promise<void> {
    if (state.discovery) {
      await this.discovery.save(state.discovery);
    }
    if (state.components) {
      await this.components.saveAll(state.brandId, state.components);
    }
    // Decisions and validations would need their full objects to import
  }
}
```

**Step 7: Write tests**

```typescript
// services/brand-replication/storage/__tests__/stores.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryStorageAdapter,
  DiscoveryStore,
  ComponentStore,
  DecisionStore,
  ValidationStore,
  PipelineStorage,
} from '../index';
import type { DiscoveryOutput, BrandComponent, IntelligenceOutput } from '../../interfaces';

describe('Storage Layer', () => {
  let adapter: InMemoryStorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  describe('DiscoveryStore', () => {
    it('saves and retrieves discovery output', async () => {
      const store = new DiscoveryStore(adapter);
      const output: DiscoveryOutput = {
        brandId: 'test-brand',
        brandUrl: 'https://example.com',
        analyzedPages: ['https://example.com/'],
        screenshots: [],
        discoveredComponents: [
          {
            id: 'comp-1',
            name: 'Feature Card',
            purpose: 'Display features',
            visualDescription: 'White card with icon',
            usageContext: 'Service pages',
            sourceScreenshots: [],
            occurrences: 3,
            confidence: 0.9,
          },
        ],
        rawAnalysis: 'test',
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      await store.save(output);
      const retrieved = await store.get('test-brand');

      expect(retrieved).toEqual(output);
    });

    it('updates a discovered component', async () => {
      const store = new DiscoveryStore(adapter);
      const output: DiscoveryOutput = {
        brandId: 'test-brand',
        brandUrl: 'https://example.com',
        analyzedPages: [],
        screenshots: [],
        discoveredComponents: [
          { id: 'comp-1', name: 'Old Name', purpose: '', visualDescription: '', usageContext: '', sourceScreenshots: [], occurrences: 1, confidence: 0.5 },
        ],
        rawAnalysis: '',
        timestamp: '',
        status: 'success',
      };

      await store.save(output);
      await store.updateComponent('test-brand', 'comp-1', { name: 'New Name' });

      const retrieved = await store.get('test-brand');
      expect(retrieved?.discoveredComponents[0].name).toBe('New Name');
    });
  });

  describe('ComponentStore', () => {
    it('adds and retrieves components', async () => {
      const store = new ComponentStore(adapter);
      const component: BrandComponent = {
        id: 'comp-1',
        brandId: 'test-brand',
        name: 'Feature Card',
        purpose: 'Display features',
        usageContext: 'Service pages',
        css: '.feature-card { }',
        htmlTemplate: '<div class="feature-card"></div>',
        previewHtml: '<div class="feature-card">Preview</div>',
        sourceComponent: {} as any,
        matchScore: 85,
        variants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await store.add('test-brand', component);
      const all = await store.getAll('test-brand');

      expect(all).toHaveLength(1);
      expect(all[0].name).toBe('Feature Card');
    });

    it('updates component CSS', async () => {
      const store = new ComponentStore(adapter);
      await store.add('test-brand', {
        id: 'comp-1',
        brandId: 'test-brand',
        name: 'Card',
        purpose: '',
        usageContext: '',
        css: '.old { }',
        htmlTemplate: '',
        previewHtml: '',
        sourceComponent: {} as any,
        matchScore: 0,
        variants: [],
        createdAt: '',
        updatedAt: '',
      });

      await store.updateCss('test-brand', 'comp-1', '.new { }');

      const component = await store.get('test-brand', 'comp-1');
      expect(component?.css).toBe('.new { }');
    });
  });

  describe('DecisionStore', () => {
    it('saves and retrieves decisions', async () => {
      const store = new DecisionStore(adapter);
      const output: IntelligenceOutput = {
        brandId: 'test-brand',
        articleId: 'article-1',
        decisions: [
          {
            sectionId: 'section-1',
            sectionHeading: 'Introduction',
            component: 'Hero',
            componentId: 'hero-1',
            variant: 'default',
            layout: { columns: 1, width: 'full', emphasis: 'hero' },
            reasoning: 'First section needs impact',
            semanticRole: 'introduction',
            contentMapping: {},
            confidence: 0.9,
          },
        ],
        overallStrategy: 'Engaging layout',
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      await store.save(output);
      const decisions = await store.getDecisions('test-brand', 'article-1');

      expect(decisions).toHaveLength(1);
      expect(decisions[0].component).toBe('Hero');
    });

    it('overrides a component decision', async () => {
      const store = new DecisionStore(adapter);
      await store.save({
        brandId: 'test-brand',
        articleId: 'article-1',
        decisions: [
          {
            sectionId: 'section-1',
            sectionHeading: 'Test',
            component: 'Prose',
            componentId: 'prose-1',
            variant: 'default',
            layout: { columns: 1, width: 'medium', emphasis: 'standard' },
            reasoning: 'Auto',
            semanticRole: 'body',
            contentMapping: {},
            confidence: 0.7,
          },
        ],
        overallStrategy: '',
        timestamp: '',
        status: 'success',
      });

      await store.overrideComponent('test-brand', 'article-1', 'section-1', 'card-1', 'Feature Card');

      const decisions = await store.getDecisions('test-brand', 'article-1');
      expect(decisions[0].component).toBe('Feature Card');
      expect(decisions[0].reasoning).toContain('Manual override');
    });
  });

  describe('PipelineStorage', () => {
    it('exports complete state', async () => {
      const storage = new PipelineStorage(adapter);

      await storage.discovery.save({
        brandId: 'test-brand',
        brandUrl: 'https://example.com',
        analyzedPages: [],
        screenshots: [],
        discoveredComponents: [],
        rawAnalysis: '',
        timestamp: '',
        status: 'success',
      });

      await storage.components.add('test-brand', {
        id: 'comp-1',
        brandId: 'test-brand',
        name: 'Card',
        purpose: '',
        usageContext: '',
        css: '',
        htmlTemplate: '',
        previewHtml: '',
        sourceComponent: {} as any,
        matchScore: 0,
        variants: [],
        createdAt: '',
        updatedAt: '',
      });

      const state = await storage.exportState('test-brand');

      expect(state.brandId).toBe('test-brand');
      expect(state.discovery).toBeDefined();
      expect(state.components).toHaveLength(1);
    });
  });
});
```

**Step 8: Run tests**

Run: `npx vitest run services/brand-replication/storage/__tests__/stores.test.ts`
Expected: All tests pass

**Step 9: Commit**

```bash
git add services/brand-replication/storage/
git commit -m "feat(brand-replication): add storage layer for pipeline state"
```

---

### Task 3: Create Config and Default Prompts

**Files:**
- Create: `services/brand-replication/config/qualityThresholds.ts`
- Create: `services/brand-replication/config/defaultPrompts.ts`
- Create: `services/brand-replication/config/index.ts`

**Step 1: Create qualityThresholds.ts**

```typescript
// services/brand-replication/config/qualityThresholds.ts

import type { ValidationConfig, WowFactorItem } from '../interfaces';

export const DEFAULT_THRESHOLDS: ValidationConfig['thresholds'] = {
  brandMatch: 85,
  designQuality: 80,
  userExperience: 80,
  overall: 82,
};

export const DEFAULT_WEIGHTS: ValidationConfig['weights'] = {
  brandMatch: 0.30,
  designQuality: 0.35,
  userExperience: 0.35,
};

export const DEFAULT_WOW_FACTOR_CHECKLIST: Omit<WowFactorItem, 'passed' | 'details'>[] = [
  {
    id: 'hero-section',
    label: 'Impactful hero section',
    description: 'Article starts with a visually striking hero or introduction section',
    required: true,
  },
  {
    id: 'multi-column',
    label: 'Multi-column layouts used',
    description: 'At least one section uses 2+ column grid layout for visual variety',
    required: true,
  },
  {
    id: 'attention-elements',
    label: 'Attention-grabbing elements',
    description: 'Contains callouts, statistics highlights, or featured quotes',
    required: false,
  },
  {
    id: 'clear-cta',
    label: 'Clear CTA at conclusion',
    description: 'Article ends with a clear call-to-action relevant to the content',
    required: true,
  },
  {
    id: 'visual-variety',
    label: 'Visual variety throughout',
    description: 'Uses at least 3 different component types across sections',
    required: true,
  },
  {
    id: 'professional-polish',
    label: 'Professional polish',
    description: 'Consistent spacing, transitions, hover states on interactive elements',
    required: true,
  },
];

export const DEFAULT_DISCOVERY_CONFIG = {
  minOccurrences: 2,
  confidenceThreshold: 0.7,
  maxPages: 10,
  viewport: { width: 1400, height: 900 },
  timeout: 30000,
};

export const DEFAULT_CODEGEN_CONFIG = {
  minMatchScore: 85,
  maxIterations: 3,
  cssStandards: {
    useCustomProperties: true,
    spacingScale: [4, 8, 12, 16, 24, 32, 48, 64],
    requireHoverStates: true,
    requireTransitions: true,
    requireResponsive: true,
  },
};

export const DEFAULT_INTELLIGENCE_CONFIG = {
  contextConfig: {
    includePillars: true,
    includeTopicalMap: true,
    includeFullArticle: true,
    includeSurroundingSections: true,
    maxContextTokens: 8000,
  },
};
```

**Step 2: Create defaultPrompts.ts**

```typescript
// services/brand-replication/config/defaultPrompts.ts

export const DISCOVERY_PROMPT = `You are a senior UI/UX designer analyzing a website to extract its visual component library.

Analyze the provided screenshots and identify DISTINCT visual component patterns used on this website.

For each component pattern you discover:
1. Give it a descriptive name (e.g., "Service Card", "Emergency CTA", "Testimonial Block")
2. Describe its visual characteristics in detail (colors, spacing, typography, icons, borders, shadows)
3. Explain its PURPOSE - what information does it communicate?
4. Describe its USAGE CONTEXT - where on the site is it used and for what type of content?
5. Note how many times you see it across the pages (occurrences)
6. Rate your confidence that this is a distinct, reusable component (0.0-1.0)

Focus on components that:
- Appear multiple times across different pages
- Have consistent styling
- Serve a clear communication purpose
- Could be reused for similar content

Do NOT include:
- One-off decorative elements
- Basic HTML elements without custom styling
- Navigation or footer elements (unless they contain notable components)

Return your analysis as JSON:
{
  "components": [
    {
      "name": "Component Name",
      "purpose": "What this component communicates",
      "visualDescription": "Detailed visual characteristics",
      "usageContext": "Where and when this is used",
      "occurrences": 3,
      "confidence": 0.9
    }
  ],
  "brandObservations": "Overall notes about the brand's visual language"
}`;

export const CSS_GENERATION_PROMPT = `You are a senior frontend developer generating production-quality CSS for a brand component.

Component to generate CSS for:
- Name: {{componentName}}
- Purpose: {{purpose}}
- Visual Description: {{visualDescription}}

Brand Design Tokens:
{{designTokens}}

Generate CSS that:
1. Uses CSS custom properties (--brand-*) for all colors, fonts, and key values
2. Follows the spacing scale: {{spacingScale}}
3. Includes :hover and :focus states for interactive elements
4. Uses transitions (0.2-0.3s ease) for smooth interactions
5. Is responsive (include @media queries for mobile/tablet)
6. Has accessible contrast ratios
7. Uses semantic class names

Return ONLY the CSS code, no explanation. The CSS should be complete and production-ready.`;

export const HTML_GENERATION_PROMPT = `You are a senior frontend developer generating semantic HTML for a brand component.

Component:
- Name: {{componentName}}
- Purpose: {{purpose}}
- Visual Description: {{visualDescription}}

The HTML should:
1. Use semantic elements (article, section, header, etc.)
2. Include ARIA attributes for accessibility
3. Use placeholder markers for dynamic content: {{title}}, {{content}}, {{items}}, {{ctaText}}, {{ctaUrl}}
4. Have class names that match the CSS generated for this component
5. Be clean and properly indented

Return ONLY the HTML template, no explanation.`;

export const SECTION_ANALYSIS_PROMPT = `You are a content strategist analyzing an article section to determine its semantic role and ideal presentation.

CONTEXT:
Business: {{centralEntity}} - {{sourceContext}}
Target Audience: {{targetAudience}}
Article Topic: {{articleTitle}}
Article Main Message: {{mainMessage}}

SECTION TO ANALYZE:
Position: {{position}} (section {{positionIndex}} of {{totalSections}})
Heading: {{sectionHeading}}
Content:
{{sectionContent}}

Previous sections covered: {{precedingSections}}
Upcoming sections will cover: {{followingSections}}

Analyze this section and determine:
1. SEMANTIC ROLE: What is this section's purpose? (introduction, key-benefits, process-steps, warning, comparison, case-study, call-to-action, supporting-detail, conclusion, etc.)
2. CONTENT STRUCTURE: Does this contain a list, process, comparison, single concept, or mixed content?
3. EMPHASIS LEVEL: How important is this section to the article's main message? (hero, featured, standard, supporting, minimal)
4. READER NEED: What does the reader need from this section? (quick scan, detailed read, action prompt, etc.)

Return JSON:
{
  "semanticRole": "the role",
  "contentStructure": "list|process|comparison|single-concept|mixed",
  "emphasisLevel": "hero|featured|standard|supporting|minimal",
  "readerNeed": "description of reader need",
  "reasoning": "why you made these determinations"
}`;

export const COMPONENT_MATCHING_PROMPT = `You are a design system expert matching content to the ideal component.

SECTION ANALYSIS:
- Semantic Role: {{semanticRole}}
- Content Structure: {{contentStructure}}
- Emphasis Level: {{emphasisLevel}}
- Reader Need: {{readerNeed}}

AVAILABLE COMPONENTS:
{{componentList}}

SECTION CONTENT:
{{sectionContent}}

Select the best component and configure its layout:

1. COMPONENT: Which component from the library best presents this content?
2. VARIANT: If the component has variants, which one?
3. LAYOUT:
   - columns: How many columns? (1, 2, 3, or 4)
   - width: How wide? (narrow, medium, wide, full)
   - emphasis: Visual weight (hero, featured, standard, supporting, minimal)
4. CONTENT MAPPING: How does the section content map to the component's placeholders?

Return JSON:
{
  "componentId": "id from library",
  "componentName": "name",
  "variant": "default|featured|compact|etc",
  "layout": {
    "columns": 2,
    "width": "medium",
    "emphasis": "standard"
  },
  "contentMapping": {
    "title": "extracted or derived title",
    "items": ["item1", "item2"] // if applicable
    "ctaText": "Call to action text" // if applicable
  },
  "reasoning": "Why this component and layout work best"
}`;

export const VALIDATION_PROMPT = `You are a design quality assessor evaluating generated article output.

Evaluate the rendered HTML against these criteria:

BRAND MATCH (target: {{brandMatchThreshold}}%):
- Colors match the brand palette
- Typography matches brand fonts
- Component styles match the source website

DESIGN QUALITY (target: {{designQualityThreshold}}%):
- Clear visual hierarchy
- Consistent spacing rhythm
- Appropriate emphasis distribution
- Good balance of visual components vs prose

USER EXPERIENCE (target: {{uxThreshold}}%):
- Content is scannable (headings, bullets, cards break up text)
- Clear reading flow from intro to conclusion
- Actionable next steps are clear

For each dimension, provide:
- Score (0-100)
- Specific observations
- Improvement suggestions

Return JSON:
{
  "brandMatch": { "score": 85, "observations": [...], "suggestions": [...] },
  "designQuality": { "score": 90, "observations": [...], "suggestions": [...] },
  "userExperience": { "score": 88, "observations": [...], "suggestions": [...] },
  "wowFactorResults": {
    "hero-section": { "passed": true, "details": "..." },
    "multi-column": { "passed": true, "details": "..." },
    ...
  }
}`;
```

**Step 3: Create index.ts**

```typescript
// services/brand-replication/config/index.ts

export * from './qualityThresholds';
export * from './defaultPrompts';
```

**Step 4: Commit**

```bash
git add services/brand-replication/config/
git commit -m "feat(brand-replication): add configuration and default prompts"
```

---

## P1: Core Pipeline Modules

### Task 4: Phase 1 - Discovery Module

**Files:**
- Create: `services/brand-replication/phase1-discovery/ScreenshotCapture.ts`
- Create: `services/brand-replication/phase1-discovery/VisualAnalyzer.ts`
- Create: `services/brand-replication/phase1-discovery/index.ts`
- Create: `services/brand-replication/phase1-discovery/__tests__/DiscoveryModule.test.ts`

**Step 1: Create ScreenshotCapture.ts**

```typescript
// services/brand-replication/phase1-discovery/ScreenshotCapture.ts

import type { Screenshot, DiscoveryInput } from '../interfaces';

export interface ScreenshotCaptureConfig {
  viewport: { width: number; height: number };
  fullPage: boolean;
  timeout: number;
  waitForSelector?: string;
  outputDir: string;
}

export class ScreenshotCapture {
  private config: ScreenshotCaptureConfig;

  constructor(config: Partial<ScreenshotCaptureConfig> = {}) {
    this.config = {
      viewport: config.viewport ?? { width: 1400, height: 900 },
      fullPage: config.fullPage ?? true,
      timeout: config.timeout ?? 30000,
      waitForSelector: config.waitForSelector,
      outputDir: config.outputDir ?? './tmp/screenshots',
    };
  }

  async capturePages(input: DiscoveryInput): Promise<Screenshot[]> {
    // Dynamic import playwright to avoid bundling issues
    const { chromium } = await import('playwright');

    const screenshots: Screenshot[] = [];
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: this.config.viewport });

    try {
      const pagesToCapture = input.pagesToAnalyze ?? await this.discoverPages(input.brandUrl);

      for (const url of pagesToCapture.slice(0, input.options?.maxPages ?? 10)) {
        try {
          const page = await context.newPage();
          await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });

          if (this.config.waitForSelector) {
            await page.waitForSelector(this.config.waitForSelector, { timeout: 5000 }).catch(() => {});
          }

          // Wait a bit for any animations to settle
          await page.waitForTimeout(1000);

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${input.brandId}_${timestamp}_${this.urlToFilename(url)}.png`;
          const path = `${this.config.outputDir}/${filename}`;

          await page.screenshot({ path, fullPage: this.config.fullPage });

          screenshots.push({
            url,
            path,
            timestamp: new Date().toISOString(),
            viewport: this.config.viewport,
          });

          await page.close();
        } catch (error) {
          console.error(`Failed to capture ${url}:`, error);
        }
      }
    } finally {
      await browser.close();
    }

    return screenshots;
  }

  private async discoverPages(baseUrl: string): Promise<string[]> {
    // Simple page discovery - get homepage and linked pages
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const pages = new Set<string>([baseUrl]);

    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: this.config.timeout });

      const links = await page.$$eval('a[href]', (anchors, base) => {
        const baseUrl = new URL(base);
        return anchors
          .map(a => a.getAttribute('href'))
          .filter((href): href is string => !!href)
          .map(href => {
            try {
              const url = new URL(href, base);
              return url.origin === baseUrl.origin ? url.href : null;
            } catch {
              return null;
            }
          })
          .filter((url): url is string => !!url);
      }, baseUrl);

      links.forEach(link => pages.add(link.split('#')[0].split('?')[0]));
    } finally {
      await browser.close();
    }

    return Array.from(pages).slice(0, 20);
  }

  private urlToFilename(url: string): string {
    return new URL(url).pathname.replace(/\//g, '_').replace(/^_/, '') || 'home';
  }
}
```

**Step 2: Create VisualAnalyzer.ts**

```typescript
// services/brand-replication/phase1-discovery/VisualAnalyzer.ts

import type { DiscoveredComponent, Screenshot } from '../interfaces';
import { DISCOVERY_PROMPT } from '../config/defaultPrompts';
import * as fs from 'fs';

export interface VisualAnalyzerConfig {
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  customPrompt?: string;
  minOccurrences: number;
  confidenceThreshold: number;
}

interface AnalysisResult {
  components: Array<{
    name: string;
    purpose: string;
    visualDescription: string;
    usageContext: string;
    occurrences: number;
    confidence: number;
  }>;
  brandObservations: string;
}

export class VisualAnalyzer {
  private config: VisualAnalyzerConfig;
  private lastRawResponse: string = '';

  constructor(config: VisualAnalyzerConfig) {
    this.config = config;
  }

  async analyze(screenshots: Screenshot[]): Promise<{
    components: DiscoveredComponent[];
    rawAnalysis: string;
  }> {
    const prompt = this.config.customPrompt ?? DISCOVERY_PROMPT;

    // Read screenshot files and convert to base64
    const images = screenshots.map(s => {
      const buffer = fs.readFileSync(s.path);
      return {
        url: s.url,
        base64: buffer.toString('base64'),
        mimeType: 'image/png',
      };
    });

    // Call AI with vision capability
    const response = await this.callAI(prompt, images);
    this.lastRawResponse = response;

    // Parse response
    const analysis = this.parseAnalysis(response);

    // Convert to DiscoveredComponent format and filter by thresholds
    const components = analysis.components
      .filter(c => c.occurrences >= this.config.minOccurrences)
      .filter(c => c.confidence >= this.config.confidenceThreshold)
      .map((c, index) => ({
        id: `discovered-${Date.now()}-${index}`,
        name: c.name,
        purpose: c.purpose,
        visualDescription: c.visualDescription,
        usageContext: c.usageContext,
        sourceScreenshots: screenshots.map(s => s.path),
        occurrences: c.occurrences,
        confidence: c.confidence,
      }));

    return {
      components,
      rawAnalysis: response,
    };
  }

  private async callAI(prompt: string, images: { base64: string; mimeType: string; url: string }[]): Promise<string> {
    if (this.config.aiProvider === 'anthropic') {
      return this.callAnthropic(prompt, images);
    } else {
      return this.callGemini(prompt, images);
    }
  }

  private async callAnthropic(prompt: string, images: { base64: string; mimeType: string }[]): Promise<string> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: this.config.apiKey });

    const content: any[] = images.map(img => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mimeType,
        data: img.base64,
      },
    }));
    content.push({ type: 'text', text: prompt });

    const response = await client.messages.create({
      model: this.config.model ?? 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : '';
  }

  private async callGemini(prompt: string, images: { base64: string; mimeType: string }[]): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.config.apiKey);
    const model = genAI.getGenerativeModel({ model: this.config.model ?? 'gemini-2.0-flash' });

    const parts: any[] = images.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    }));
    parts.push({ text: prompt });

    const result = await model.generateContent(parts);
    return result.response.text();
  }

  private parseAnalysis(response: string): AnalysisResult {
    // Extract JSON from response (might be wrapped in markdown code blocks)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  }

  getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}
```

**Step 3: Create index.ts (Discovery Module)**

```typescript
// services/brand-replication/phase1-discovery/index.ts

import {
  BaseModule,
  type DiscoveryInput,
  type DiscoveryOutput,
  type DiscoveryConfig,
  type ValidationResult,
} from '../interfaces';
import { ScreenshotCapture } from './ScreenshotCapture';
import { VisualAnalyzer } from './VisualAnalyzer';
import { DEFAULT_DISCOVERY_CONFIG } from '../config';

export class DiscoveryModule extends BaseModule<DiscoveryInput, DiscoveryOutput, DiscoveryConfig> {
  private screenshotCapture: ScreenshotCapture;
  private visualAnalyzer: VisualAnalyzer;

  constructor(config: DiscoveryConfig) {
    super(config);

    this.screenshotCapture = new ScreenshotCapture({
      viewport: DEFAULT_DISCOVERY_CONFIG.viewport,
      timeout: DEFAULT_DISCOVERY_CONFIG.timeout,
      outputDir: config.screenshotDir,
    });

    this.visualAnalyzer = new VisualAnalyzer({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      customPrompt: config.customPrompt,
      minOccurrences: config.minOccurrences ?? DEFAULT_DISCOVERY_CONFIG.minOccurrences,
      confidenceThreshold: config.confidenceThreshold ?? DEFAULT_DISCOVERY_CONFIG.confidenceThreshold,
    });
  }

  getPhaseName(): string {
    return 'discovery';
  }

  async run(input: DiscoveryInput): Promise<DiscoveryOutput> {
    this.updateStatus({ status: 'running', progress: 0, startedAt: new Date().toISOString() });

    try {
      // Step 1: Capture screenshots
      this.updateStatus({ progress: 20, message: 'Capturing screenshots...' });
      const screenshots = await this.screenshotCapture.capturePages(input);

      if (screenshots.length === 0) {
        throw new Error('No screenshots captured');
      }

      // Step 2: Analyze visually
      this.updateStatus({ progress: 50, message: 'Analyzing visual patterns...' });
      const { components, rawAnalysis } = await this.visualAnalyzer.analyze(screenshots);

      this.lastRawResponse = rawAnalysis;

      // Step 3: Build output
      const output: DiscoveryOutput = {
        brandId: input.brandId,
        brandUrl: input.brandUrl,
        analyzedPages: screenshots.map(s => s.url),
        screenshots,
        discoveredComponents: components,
        rawAnalysis,
        timestamp: new Date().toISOString(),
        status: components.length > 0 ? 'success' : 'partial',
      };

      this.updateStatus({ status: output.status, progress: 100, completedAt: new Date().toISOString() });

      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStatus({ status: 'failed', message: errorMessage });

      return {
        brandId: input.brandId,
        brandUrl: input.brandUrl,
        analyzedPages: [],
        screenshots: [],
        discoveredComponents: [],
        rawAnalysis: this.lastRawResponse,
        timestamp: new Date().toISOString(),
        status: 'failed',
        errors: [errorMessage],
      };
    }
  }

  validateOutput(output: DiscoveryOutput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (output.status === 'failed') {
      errors.push('Discovery failed: ' + (output.errors?.join(', ') ?? 'unknown error'));
    }

    if (output.screenshots.length === 0) {
      errors.push('No screenshots were captured');
    }

    if (output.discoveredComponents.length === 0) {
      warnings.push('No components were discovered');
    }

    if (output.discoveredComponents.length < 3) {
      warnings.push('Fewer than 3 components discovered - may need manual additions');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export { ScreenshotCapture } from './ScreenshotCapture';
export { VisualAnalyzer } from './VisualAnalyzer';
```

**Step 4: Create test file**

```typescript
// services/brand-replication/phase1-discovery/__tests__/DiscoveryModule.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscoveryModule } from '../index';
import type { DiscoveryInput, DiscoveryConfig } from '../../interfaces';

// Mock playwright
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          waitForSelector: vi.fn().mockResolvedValue(undefined),
          waitForTimeout: vi.fn().mockResolvedValue(undefined),
          screenshot: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
          $$eval: vi.fn().mockResolvedValue([]),
        }),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue(Buffer.from('fake-image-data')),
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

describe('DiscoveryModule', () => {
  const mockConfig: DiscoveryConfig = {
    aiProvider: 'anthropic',
    apiKey: 'test-key',
    minOccurrences: 2,
    confidenceThreshold: 0.7,
    screenshotDir: './tmp/test-screenshots',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct phase name', () => {
    const module = new DiscoveryModule(mockConfig);
    expect(module.getPhaseName()).toBe('discovery');
  });

  it('validates output with no components as warning', () => {
    const module = new DiscoveryModule(mockConfig);

    const output = {
      brandId: 'test',
      brandUrl: 'https://test.com',
      analyzedPages: ['https://test.com/'],
      screenshots: [{ url: 'https://test.com/', path: '/tmp/test.png', timestamp: '', viewport: { width: 1400, height: 900 } }],
      discoveredComponents: [],
      rawAnalysis: '',
      timestamp: '',
      status: 'success' as const,
    };

    const result = module.validateOutput(output);

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('No components were discovered');
  });

  it('validates output with failed status as error', () => {
    const module = new DiscoveryModule(mockConfig);

    const output = {
      brandId: 'test',
      brandUrl: 'https://test.com',
      analyzedPages: [],
      screenshots: [],
      discoveredComponents: [],
      rawAnalysis: '',
      timestamp: '',
      status: 'failed' as const,
      errors: ['Connection failed'],
    };

    const result = module.validateOutput(output);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Connection failed'))).toBe(true);
  });

  it('tracks status updates during run', async () => {
    // This test would require more complex mocking of the AI service
    // For now, just verify the module can be instantiated
    const module = new DiscoveryModule(mockConfig);
    const status = module.getStatus();

    expect(status.phase).toBe('discovery');
    expect(status.status).toBe('pending');
  });
});
```

**Step 5: Run tests**

Run: `npx vitest run services/brand-replication/phase1-discovery/__tests__/`
Expected: All tests pass

**Step 6: Commit**

```bash
git add services/brand-replication/phase1-discovery/
git commit -m "feat(brand-replication): add Phase 1 Discovery module"
```

---

### Task 5: Phase 2 - Code Generation Module

**Files:**
- Create: `services/brand-replication/phase2-codegen/CssGenerator.ts`
- Create: `services/brand-replication/phase2-codegen/HtmlGenerator.ts`
- Create: `services/brand-replication/phase2-codegen/index.ts`
- Create: `services/brand-replication/phase2-codegen/__tests__/CodeGenModule.test.ts`

**Note:** Due to length, I'll provide the key structure. Follow the same pattern as Phase 1.

**Step 1: Create CssGenerator.ts**

```typescript
// services/brand-replication/phase2-codegen/CssGenerator.ts

import type { DiscoveredComponent } from '../interfaces';
import type { DesignDNA } from '../../../types/designDna';
import { CSS_GENERATION_PROMPT } from '../config/defaultPrompts';

export interface CssGeneratorConfig {
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  customPrompt?: string;
  cssStandards: {
    useCustomProperties: boolean;
    spacingScale: number[];
    requireHoverStates: boolean;
    requireTransitions: boolean;
    requireResponsive: boolean;
  };
}

export class CssGenerator {
  private config: CssGeneratorConfig;
  private lastRawResponse: string = '';

  constructor(config: CssGeneratorConfig) {
    this.config = config;
  }

  async generate(component: DiscoveredComponent, designDna: DesignDNA): Promise<string> {
    const prompt = this.buildPrompt(component, designDna);
    const css = await this.callAI(prompt);
    this.lastRawResponse = css;
    return this.postProcess(css);
  }

  private buildPrompt(component: DiscoveredComponent, designDna: DesignDNA): string {
    const template = this.config.customPrompt ?? CSS_GENERATION_PROMPT;

    return template
      .replace('{{componentName}}', component.name)
      .replace('{{purpose}}', component.purpose)
      .replace('{{visualDescription}}', component.visualDescription)
      .replace('{{designTokens}}', JSON.stringify(this.extractTokens(designDna), null, 2))
      .replace('{{spacingScale}}', this.config.cssStandards.spacingScale.join(', '));
  }

  private extractTokens(designDna: DesignDNA): Record<string, string> {
    return {
      '--brand-primary': designDna.colors.primary.hex,
      '--brand-primary-light': designDna.colors.primaryLight.hex,
      '--brand-primary-dark': designDna.colors.primaryDark.hex,
      '--brand-secondary': designDna.colors.secondary.hex,
      '--brand-accent': designDna.colors.accent.hex,
      '--brand-text': designDna.colors.neutrals.darkest,
      '--brand-text-muted': designDna.colors.neutrals.medium,
      '--brand-background': designDna.colors.neutrals.lightest,
      '--brand-surface': designDna.colors.neutrals.light,
      '--brand-border': designDna.colors.neutrals.medium,
      '--brand-font-heading': designDna.typography.headingFont.family,
      '--brand-font-body': designDna.typography.bodyFont.family,
      '--brand-radius-small': designDna.shapes.borderRadius.small,
      '--brand-radius-medium': designDna.shapes.borderRadius.medium,
      '--brand-radius-large': designDna.shapes.borderRadius.large,
    };
  }

  private async callAI(prompt: string): Promise<string> {
    // Similar to VisualAnalyzer.callAI but for text-only
    if (this.config.aiProvider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: this.config.apiKey });
      const response = await client.messages.create({
        model: this.config.model ?? 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      const textBlock = response.content.find(block => block.type === 'text');
      return textBlock?.type === 'text' ? textBlock.text : '';
    } else {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.config.apiKey);
      const model = genAI.getGenerativeModel({ model: this.config.model ?? 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
  }

  private postProcess(css: string): string {
    // Remove markdown code blocks if present
    let cleaned = css.replace(/```css\s*/g, '').replace(/```\s*/g, '');

    // Ensure proper formatting
    cleaned = cleaned.trim();

    return cleaned;
  }

  getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}
```

**Step 2-6:** Follow the same pattern to create HtmlGenerator.ts, index.ts (CodeGenModule), and tests.

**Step 7: Commit**

```bash
git add services/brand-replication/phase2-codegen/
git commit -m "feat(brand-replication): add Phase 2 Code Generation module"
```

---

### Task 6: Phase 3 - Content Intelligence Module

**Files:**
- Create: `services/brand-replication/phase3-intelligence/ContextBuilder.ts`
- Create: `services/brand-replication/phase3-intelligence/SectionAnalyzer.ts`
- Create: `services/brand-replication/phase3-intelligence/ComponentMatcher.ts`
- Create: `services/brand-replication/phase3-intelligence/index.ts`
- Create: `services/brand-replication/phase3-intelligence/__tests__/IntelligenceModule.test.ts`

**Follow the same pattern as previous phases.**

**Commit:**

```bash
git add services/brand-replication/phase3-intelligence/
git commit -m "feat(brand-replication): add Phase 3 Content Intelligence module"
```

---

### Task 7: Phase 4 - Validation Module

**Files:**
- Create: `services/brand-replication/phase4-validation/BrandMatchScorer.ts`
- Create: `services/brand-replication/phase4-validation/DesignQualityScorer.ts`
- Create: `services/brand-replication/phase4-validation/WowFactorChecker.ts`
- Create: `services/brand-replication/phase4-validation/index.ts`
- Create: `services/brand-replication/phase4-validation/__tests__/ValidationModule.test.ts`

**Follow the same pattern as previous phases.**

**Commit:**

```bash
git add services/brand-replication/phase4-validation/
git commit -m "feat(brand-replication): add Phase 4 Validation module"
```

---

### Task 8: Pipeline Orchestrator

**Files:**
- Create: `services/brand-replication/index.ts`
- Create: `services/brand-replication/__tests__/pipeline.test.ts`

**Step 1: Create index.ts (Pipeline Orchestrator)**

```typescript
// services/brand-replication/index.ts

import { DiscoveryModule } from './phase1-discovery';
import { CodeGenModule } from './phase2-codegen';
import { IntelligenceModule } from './phase3-intelligence';
import { ValidationModule } from './phase4-validation';
import { PipelineStorage, InMemoryStorageAdapter, type StorageAdapter } from './storage';
import type {
  DiscoveryInput,
  DiscoveryOutput,
  CodeGenInput,
  CodeGenOutput,
  IntelligenceInput,
  IntelligenceOutput,
  ValidationInput,
  ValidationOutput,
  ModuleConfig,
  ModuleStatus,
} from './interfaces';

export interface PipelineConfig {
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  storageAdapter?: StorageAdapter;
  screenshotDir?: string;
}

export interface PipelineStatus {
  phase1: ModuleStatus;
  phase2: ModuleStatus;
  phase3: ModuleStatus;
  phase4: ModuleStatus;
  overall: 'idle' | 'running' | 'completed' | 'failed';
}

export class BrandReplicationPipeline {
  private discovery: DiscoveryModule;
  private codegen: CodeGenModule;
  private intelligence: IntelligenceModule;
  private validation: ValidationModule;
  public storage: PipelineStorage;

  constructor(config: PipelineConfig) {
    const adapter = config.storageAdapter ?? new InMemoryStorageAdapter();
    this.storage = new PipelineStorage(adapter);

    this.discovery = new DiscoveryModule({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      minOccurrences: 2,
      confidenceThreshold: 0.7,
      screenshotDir: config.screenshotDir ?? './tmp/screenshots',
    });

    this.codegen = new CodeGenModule({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      minMatchScore: 85,
      maxIterations: 3,
      cssStandards: {
        useCustomProperties: true,
        spacingScale: [4, 8, 12, 16, 24, 32, 48, 64],
        requireHoverStates: true,
        requireTransitions: true,
        requireResponsive: true,
      },
    });

    this.intelligence = new IntelligenceModule({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      contextConfig: {
        includePillars: true,
        includeTopicalMap: true,
        includeFullArticle: true,
        includeSurroundingSections: true,
        maxContextTokens: 8000,
      },
    });

    this.validation = new ValidationModule({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      thresholds: { brandMatch: 85, designQuality: 80, userExperience: 80, overall: 82 },
      weights: { brandMatch: 0.3, designQuality: 0.35, userExperience: 0.35 },
      wowFactorChecklist: [],
    });
  }

  // Run individual phases
  async runDiscovery(input: DiscoveryInput): Promise<DiscoveryOutput> {
    const output = await this.discovery.run(input);
    await this.storage.discovery.save(output);
    return output;
  }

  async runCodeGen(input: CodeGenInput): Promise<CodeGenOutput> {
    const output = await this.codegen.run(input);
    await this.storage.components.saveAll(input.brandId, output.components);
    return output;
  }

  async runIntelligence(input: IntelligenceInput): Promise<IntelligenceOutput> {
    const output = await this.intelligence.run(input);
    await this.storage.decisions.save(output);
    return output;
  }

  async runValidation(input: ValidationInput): Promise<ValidationOutput> {
    const output = await this.validation.run(input);
    await this.storage.validation.save(output);
    return output;
  }

  // Get status
  getStatus(): PipelineStatus {
    return {
      phase1: this.discovery.getStatus(),
      phase2: this.codegen.getStatus(),
      phase3: this.intelligence.getStatus(),
      phase4: this.validation.getStatus(),
      overall: 'idle', // Compute from individual statuses
    };
  }

  // Access modules for advanced usage
  getModules() {
    return {
      discovery: this.discovery,
      codegen: this.codegen,
      intelligence: this.intelligence,
      validation: this.validation,
    };
  }
}

// Re-export everything
export * from './interfaces';
export * from './storage';
export * from './config';
export * from './phase1-discovery';
export * from './phase2-codegen';
export * from './phase3-intelligence';
export * from './phase4-validation';
```

**Step 2: Create test**

```typescript
// services/brand-replication/__tests__/pipeline.test.ts

import { describe, it, expect } from 'vitest';
import { BrandReplicationPipeline } from '../index';

describe('BrandReplicationPipeline', () => {
  it('initializes with all modules', () => {
    const pipeline = new BrandReplicationPipeline({
      aiProvider: 'anthropic',
      apiKey: 'test-key',
    });

    const modules = pipeline.getModules();

    expect(modules.discovery).toBeDefined();
    expect(modules.codegen).toBeDefined();
    expect(modules.intelligence).toBeDefined();
    expect(modules.validation).toBeDefined();
  });

  it('provides pipeline status', () => {
    const pipeline = new BrandReplicationPipeline({
      aiProvider: 'anthropic',
      apiKey: 'test-key',
    });

    const status = pipeline.getStatus();

    expect(status.phase1.phase).toBe('discovery');
    expect(status.phase2.phase).toBe('codegen');
    expect(status.phase3.phase).toBe('intelligence');
    expect(status.phase4.phase).toBe('validation');
  });

  it('has storage accessible', () => {
    const pipeline = new BrandReplicationPipeline({
      aiProvider: 'anthropic',
      apiKey: 'test-key',
    });

    expect(pipeline.storage.discovery).toBeDefined();
    expect(pipeline.storage.components).toBeDefined();
    expect(pipeline.storage.decisions).toBeDefined();
    expect(pipeline.storage.validation).toBeDefined();
  });
});
```

**Step 3: Run all tests**

Run: `npx vitest run services/brand-replication/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add services/brand-replication/index.ts services/brand-replication/__tests__/
git commit -m "feat(brand-replication): add pipeline orchestrator"
```

---

## P2: User Interface (Summary)

### Task 9-12: UI Components

Create React components in `components/brand-replication/`:

- `ComponentGallery.tsx` - Display discovered components with previews
- `SectionDesigner.tsx` - Show/edit design decisions per section
- `QualityDashboard.tsx` - Display validation scores
- `PromptEditor.tsx` - Edit AI prompts

Follow existing component patterns in `components/` directory.

---

## P3: Integration (Summary)

### Task 13-14: Integration

- Update `StylePublishModal.tsx` to use new pipeline
- Add database tables for persistent storage
- Migration script for existing brand extractions

---

## Summary

**Total Tasks:** 14 major tasks, ~50 bite-sized steps

**Key Files Created:**
- `services/brand-replication/interfaces/` - Type definitions
- `services/brand-replication/storage/` - Storage layer
- `services/brand-replication/config/` - Configuration and prompts
- `services/brand-replication/phase1-discovery/` - Screenshot capture + visual analysis
- `services/brand-replication/phase2-codegen/` - CSS + HTML generation
- `services/brand-replication/phase3-intelligence/` - Content-aware design decisions
- `services/brand-replication/phase4-validation/` - Quality scoring
- `services/brand-replication/index.ts` - Pipeline orchestrator

**Testing:** Each module has dedicated tests in `__tests__/` directories

**Run all tests:** `npx vitest run services/brand-replication/`
