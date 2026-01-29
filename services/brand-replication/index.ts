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
  ModuleStatus,
  DiscoveryConfig,
  CodeGenConfig,
  IntelligenceConfig,
  ValidationConfig,
} from './interfaces';
import {
  DEFAULT_DISCOVERY_CONFIG,
  DEFAULT_CODEGEN_CONFIG,
  DEFAULT_INTELLIGENCE_CONFIG,
  DEFAULT_THRESHOLDS,
  DEFAULT_WEIGHTS,
} from './config';

export interface PipelineConfig {
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  storageAdapter?: StorageAdapter;
  screenshotDir?: string;
  // Phase-specific overrides
  discoveryConfig?: Partial<DiscoveryConfig>;
  codegenConfig?: Partial<CodeGenConfig>;
  intelligenceConfig?: Partial<IntelligenceConfig>;
  validationConfig?: Partial<ValidationConfig>;
}

export interface PipelineStatus {
  phase1: ModuleStatus;
  phase2: ModuleStatus;
  phase3: ModuleStatus;
  phase4: ModuleStatus;
  overall: 'idle' | 'running' | 'completed' | 'failed';
  currentPhase?: string;
}

export class BrandReplicationPipeline {
  private discovery: DiscoveryModule;
  private codegen: CodeGenModule;
  private intelligence: IntelligenceModule;
  private validation: ValidationModule;
  public storage: PipelineStorage;
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    this.config = config;
    const adapter = config.storageAdapter ?? new InMemoryStorageAdapter();
    this.storage = new PipelineStorage(adapter);

    this.discovery = new DiscoveryModule({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      minOccurrences: config.discoveryConfig?.minOccurrences ?? DEFAULT_DISCOVERY_CONFIG.minOccurrences,
      confidenceThreshold: config.discoveryConfig?.confidenceThreshold ?? DEFAULT_DISCOVERY_CONFIG.confidenceThreshold,
      screenshotDir: config.screenshotDir ?? './tmp/screenshots',
      ...config.discoveryConfig,
    });

    this.codegen = new CodeGenModule({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      minMatchScore: config.codegenConfig?.minMatchScore ?? DEFAULT_CODEGEN_CONFIG.minMatchScore,
      maxIterations: config.codegenConfig?.maxIterations ?? DEFAULT_CODEGEN_CONFIG.maxIterations,
      cssStandards: config.codegenConfig?.cssStandards ?? DEFAULT_CODEGEN_CONFIG.cssStandards,
      ...config.codegenConfig,
    });

    this.intelligence = new IntelligenceModule({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      contextConfig: config.intelligenceConfig?.contextConfig ?? DEFAULT_INTELLIGENCE_CONFIG.contextConfig,
      ...config.intelligenceConfig,
    });

    this.validation = new ValidationModule({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      thresholds: config.validationConfig?.thresholds ?? DEFAULT_THRESHOLDS,
      weights: config.validationConfig?.weights ?? DEFAULT_WEIGHTS,
      wowFactorChecklist: config.validationConfig?.wowFactorChecklist ?? [],
      ...config.validationConfig,
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
    const phase1 = this.discovery.getStatus();
    const phase2 = this.codegen.getStatus();
    const phase3 = this.intelligence.getStatus();
    const phase4 = this.validation.getStatus();

    // Determine overall status
    let overall: 'idle' | 'running' | 'completed' | 'failed' = 'idle';
    let currentPhase: string | undefined;

    const statuses = [phase1, phase2, phase3, phase4];

    if (statuses.some(s => s.status === 'running')) {
      overall = 'running';
      currentPhase = statuses.find(s => s.status === 'running')?.phase;
    } else if (statuses.some(s => s.status === 'failed')) {
      overall = 'failed';
    } else if (statuses.every(s => s.status === 'success')) {
      overall = 'completed';
    }

    return {
      phase1,
      phase2,
      phase3,
      phase4,
      overall,
      currentPhase,
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

  // Validate all module outputs
  validateAll(): {
    phase1: ReturnType<DiscoveryModule['validateOutput']> | null;
    phase2: ReturnType<CodeGenModule['validateOutput']> | null;
    phase3: ReturnType<IntelligenceModule['validateOutput']> | null;
    phase4: ReturnType<ValidationModule['validateOutput']> | null;
  } {
    return {
      phase1: null, // Would need to store outputs to validate
      phase2: null,
      phase3: null,
      phase4: null,
    };
  }

  // Get raw AI responses from all modules
  getRawResponses(): {
    discovery: string;
    codegen: string;
    intelligence: string;
    validation: string;
  } {
    return {
      discovery: this.discovery.getLastRawResponse(),
      codegen: this.codegen.getLastRawResponse(),
      intelligence: this.intelligence.getLastRawResponse(),
      validation: this.validation.getLastRawResponse(),
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
