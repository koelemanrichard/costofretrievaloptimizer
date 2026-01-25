/**
 * Multi-Pass Design Generation System
 *
 * This module provides a 5-pass approach to generating high-quality styled articles:
 *
 * 1. Content Analysis (contentAnalyzer) - Parses markdown to understand structure
 * 2. Component Selection (componentSelector) - Chooses optimal UI components
 * 3. Visual Rhythm Planning (rhythmPlanner) - Plans emphasis, spacing, anchors
 * 4. Design Application - Builds the complete design blueprint
 * 5. Quality Validation - AI vision comparison with target brand
 *
 * Usage:
 * ```typescript
 * import { MultiPassOrchestrator } from './multipass';
 *
 * const orchestrator = new MultiPassOrchestrator({
 *   markdown: articleContent,
 *   personality: 'modern-minimal',
 *   brandDiscovery: brandReport,
 *   aiProvider: 'gemini',
 *   aiApiKey: apiKey,
 *   onPassComplete: (pass, result) => console.log(`Pass ${pass} complete`)
 * });
 *
 * const { blueprint, state } = await orchestrator.execute();
 * ```
 */

// Pass 1: Content Analysis
export { analyzeContent } from './contentAnalyzer';

// Pass 2: Component Selection
export { selectComponents } from './componentSelector';

// Pass 3: Visual Rhythm Planning
export { planVisualRhythm } from './rhythmPlanner';

// Orchestrator (coordinates all passes)
export { MultiPassOrchestrator } from './orchestrator';
export type { MultiPassConfig, MultiPassResult } from './orchestrator';
