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
