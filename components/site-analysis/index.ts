// components/site-analysis/index.ts
// Export all site analysis components

// V1 Components (legacy)
export { SiteAnalysisTool } from './SiteAnalysisTool';
export { ProjectSetup } from './ProjectSetup';
export { CrawlProgress } from './CrawlProgress';
export { AuditDashboard } from './AuditDashboard';
export { PageAuditDetail } from './PageAuditDetail';

// V2 Components (new architecture with Supabase + dual extraction)
export { SiteAnalysisToolV2 } from './SiteAnalysisToolV2';
export { ProjectSetupV2 } from './ProjectSetupV2';
export { CrawlProgressV2 } from './CrawlProgressV2';
export { PillarValidation } from './PillarValidation';
export { AuditDashboardV2 } from './AuditDashboardV2';
export { PageAuditDetailV2 } from './PageAuditDetailV2';
