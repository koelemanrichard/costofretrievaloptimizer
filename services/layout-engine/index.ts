/**
 * Layout Engine Module
 *
 * Intelligent layout engine that transforms content briefs into visual layouts
 * based on semantic weight, brand DNA, and SEO best practices.
 */

// Types
export * from './types';

// Services
export { SectionAnalyzer } from './SectionAnalyzer';
export { LayoutPlanner } from './LayoutPlanner';
export { ComponentSelector } from './ComponentSelector';
export { VisualEmphasizer } from './VisualEmphasizer';
export { ImageHandler } from './ImageHandler';
export { LayoutEngine } from './LayoutEngine';
export type { LayoutBlueprintOutput } from './LayoutEngine';

// Audit-layout bridge
export { LayoutRuleEngine } from './LayoutRuleEngine';
export type { LayoutConstraints, LayoutViolation } from './LayoutRuleEngine';

// AI-powered layout planning (for agency-quality results)
export { generateAILayoutBlueprint } from './AILayoutPlanner';

// Component Mappings
export * from './componentMappings';
