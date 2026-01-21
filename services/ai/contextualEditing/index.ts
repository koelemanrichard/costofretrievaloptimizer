// services/ai/contextualEditing/index.ts
/**
 * Contextual Editing Services
 *
 * AI-powered text editing and image generation for the article draft workspace.
 */

export { analyzeContext, extractServicesFromBusinessInfo, findContradictions, checkSeoViolations } from './contextAnalyzer';
export { rewriteText, buildRewritePrompt, detectOptimalScope, shouldUseInlineDiff } from './textRewriter';
export { generateImagePrompt, suggestImageStyle, suggestAspectRatio, generateAltText, determinePlacement } from './imagePromptGenerator';
export { analyzeForConfirmation, buildConfirmedRewritePrompt, buildServiceDetectionPrompt, buildFactDetectionPrompt } from './analysisForConfirmation';
