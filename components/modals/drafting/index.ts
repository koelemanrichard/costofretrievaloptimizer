// components/modals/drafting/index.ts
// Barrel export for DraftingModal modules

// Context
export {
  DraftingProvider,
  useDraftingContext,
  default as DraftingContext,
} from './DraftingContext';
export type {
  DraftingContextValue,
  DatabaseJobInfo,
  DraftVersion,
  OverrideSettings,
} from './DraftingContext';

// Draft Content Management
export {
  useDraftContentManager,
  default as DraftContentManager,
} from './DraftContentManager';
export type { DraftContentManagerHook } from './DraftContentManager';

// Database Sync Management
export {
  useDatabaseSyncManager,
  default as DatabaseSyncManager,
} from './DatabaseSyncManager';
export type { DatabaseSyncManagerHook } from './DatabaseSyncManager';

// Content Enhancement (Polish, Audit, Re-run passes)
export {
  useContentEnhancement,
  default as ContentEnhancement,
} from './ContentEnhancement';
export type { ContentEnhancementHook } from './ContentEnhancement';

// Image Management
export {
  useImageManager,
  replaceImagePlaceholdersWithUrls,
  default as ImageManager,
} from './ImageManager';
export type { ImageManagerHook } from './ImageManager';

// Publishing & Export
export {
  usePublishingExport,
  default as PublishingExport,
} from './PublishingExport';
export type { PublishingExportHook } from './PublishingExport';

// UI Panels
export { DraftingImagePanel } from './DraftingImagePanel';
export { DraftingPreviewPanel } from './DraftingPreviewPanel';
export { AuditIssuesPanelSection, QualityTabContent } from './DraftingAuditPanel';
export { DraftingPublishingPanel } from './DraftingPublishingPanel';
export { DraftingSocialPanel } from './DraftingSocialPanel';
export { RerunPassesModal, VersionHistoryModal } from './DraftingModals';
