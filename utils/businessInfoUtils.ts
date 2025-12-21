
// utils/businessInfoUtils.ts
// Utility functions for handling BusinessInfo merging with proper AI settings isolation

import { BusinessInfo } from '../types';

/**
 * Constructs effective business info by merging global settings with map context.
 *
 * IMPORTANT: AI settings (provider, model, API keys) ALWAYS come from global settings.
 * This prevents stale map-level AI configurations from overriding user's current preferences.
 *
 * Business context (domain, industry, valueProp, etc.) comes from map if available.
 *
 * @param globalBusinessInfo - The global business info from app state (contains user_settings)
 * @param mapBusinessInfo - Optional business info stored in the topical map
 * @param projectDomain - Optional domain from the project
 * @param projectName - Optional name from the project
 * @returns Merged BusinessInfo with AI settings from global and context from map
 */
export function getEffectiveBusinessInfo(
    globalBusinessInfo: BusinessInfo,
    mapBusinessInfo?: Partial<BusinessInfo> | null,
    projectDomain?: string,
    projectName?: string
): BusinessInfo {
    if (!mapBusinessInfo) {
        return {
            ...globalBusinessInfo,
            domain: projectDomain || globalBusinessInfo.domain,
            projectName: projectName || globalBusinessInfo.projectName,
        };
    }

    // Strip AI settings from map - they should come from global user_settings
    const {
        aiProvider: _mapAiProvider,
        aiModel: _mapAiModel,
        geminiApiKey: _gk,
        openAiApiKey: _ok,
        anthropicApiKey: _ak,
        perplexityApiKey: _pk,
        openRouterApiKey: _ork,
        ...mapBusinessContext
    } = mapBusinessInfo;

    return {
        ...globalBusinessInfo,
        // Domain priority: map > project > global
        domain: mapBusinessContext.domain || projectDomain || globalBusinessInfo.domain,
        // Project name priority: map > project > global
        projectName: mapBusinessContext.projectName || projectName || globalBusinessInfo.projectName,
        // Spread map's business context (excludes AI settings)
        ...mapBusinessContext,
        // AI settings ALWAYS from global (user_settings), never from map's business_info
        aiProvider: globalBusinessInfo.aiProvider,
        aiModel: globalBusinessInfo.aiModel,
        geminiApiKey: globalBusinessInfo.geminiApiKey,
        openAiApiKey: globalBusinessInfo.openAiApiKey,
        anthropicApiKey: globalBusinessInfo.anthropicApiKey,
        perplexityApiKey: globalBusinessInfo.perplexityApiKey,
        openRouterApiKey: globalBusinessInfo.openRouterApiKey,
    };
}

/**
 * Strips AI-related settings from business info for storage.
 * Use this when saving business_info to a map to prevent stale AI settings.
 *
 * @param businessInfo - Business info to sanitize
 * @returns Business info without AI provider, model, or API keys
 */
export function stripAiSettingsForStorage(
    businessInfo: Partial<BusinessInfo>
): Partial<BusinessInfo> {
    const {
        aiProvider: _ap,
        aiModel: _am,
        geminiApiKey: _gk,
        openAiApiKey: _ok,
        anthropicApiKey: _ak,
        perplexityApiKey: _pk,
        openRouterApiKey: _ork,
        ...businessContext
    } = businessInfo;

    return businessContext;
}

/**
 * Creates a business info object with explicit override settings.
 * Use this for "Just-In-Time" model selection where user explicitly chooses different settings.
 *
 * @param baseBusinessInfo - The base business info (should be effectiveBusinessInfo)
 * @param overrideSettings - Optional explicit provider/model overrides
 * @returns Business info with overrides applied if provided
 */
export function applyOverrideSettings(
    baseBusinessInfo: BusinessInfo,
    overrideSettings?: { provider: string; model: string } | null
): BusinessInfo {
    if (!overrideSettings) {
        return baseBusinessInfo;
    }

    return {
        ...baseBusinessInfo,
        aiProvider: overrideSettings.provider as BusinessInfo['aiProvider'],
        aiModel: overrideSettings.model,
    };
}
