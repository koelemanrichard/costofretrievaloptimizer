/**
 * Module Service - CRUD operations for service modules
 *
 * Provides database persistence for service modules with fallback to config.
 * Uses Supabase for storage when available.
 *
 * Note: Database tables (quotation_service_modules) need to be created via migration.
 * Until then, this service falls back to config.
 */

import { useSupabase } from '../supabaseClient';
import {
  ServiceModule,
  ServiceModuleRecord,
  toServiceModule,
} from '../../types/quotation';
import { SERVICE_MODULES } from '../../config/quotation/modules';

// =============================================================================
// Types
// =============================================================================

interface ModuleServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// =============================================================================
// Convert to database record format
// =============================================================================

function toModuleRecord(module: ServiceModule): Omit<ServiceModuleRecord, 'created_at' | 'updated_at'> {
  return {
    id: module.id,
    category: module.category,
    name: module.name,
    description: module.description || null,
    base_price_min: module.basePriceMin,
    base_price_max: module.basePriceMax,
    is_recurring: module.isRecurring,
    recurring_interval: module.recurringInterval || null,
    kpi_contributions: module.kpiContributions,
    deliverables: module.deliverables,
    display_order: module.displayOrder,
    is_active: module.isActive,
  };
}

// =============================================================================
// In-memory store for modified modules (until database is available)
// =============================================================================

let modulesCache: ServiceModule[] | null = null;

function getModulesFromCache(): ServiceModule[] {
  if (!modulesCache) {
    modulesCache = [...SERVICE_MODULES] as ServiceModule[];
  }
  return modulesCache;
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get all modules (from database with fallback to config)
 */
export async function getModules(): Promise<ModuleServiceResult<ServiceModule[]>> {
  try {
    const supabase = useSupabase();
    const { data, error } = await supabase
      .from('quotation_service_modules' as any)
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.warn('Failed to fetch modules from database, using config fallback:', error.message);
      return { data: getModulesFromCache(), error: null };
    }

    if (!data || data.length === 0) {
      // No data in database, return config modules
      return { data: getModulesFromCache(), error: null };
    }

    // Update cache with database data
    modulesCache = data.map((record: any) => toServiceModule(record as ServiceModuleRecord));
    return { data: modulesCache, error: null };
  } catch (err) {
    console.warn('Module service error, using config fallback:', err);
    return { data: getModulesFromCache(), error: null };
  }
}

/**
 * Get a single module by ID
 */
export async function getModuleById(id: string): Promise<ModuleServiceResult<ServiceModule>> {
  const modules = getModulesFromCache();
  const module = modules.find((m) => m.id === id);
  return {
    data: module || null,
    error: module ? null : new Error('Module not found'),
  };
}

/**
 * Create a new module
 */
export async function createModule(
  module: Omit<ServiceModule, 'id'> & { id?: string }
): Promise<ModuleServiceResult<ServiceModule>> {
  try {
    const id = module.id || `module_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newModule: ServiceModule = { ...module, id } as ServiceModule;

    // Try to save to database
    try {
      const supabase = useSupabase();
      const record = toModuleRecord(newModule);
      await supabase
        .from('quotation_service_modules' as any)
        .insert(record);
    } catch (dbErr) {
      console.warn('Could not save module to database, using local cache:', dbErr);
    }

    // Update cache
    const modules = getModulesFromCache();
    modules.push(newModule);
    modulesCache = modules;

    return { data: newModule, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Update an existing module
 */
export async function updateModule(module: ServiceModule): Promise<ModuleServiceResult<ServiceModule>> {
  try {
    // Try to save to database
    try {
      const supabase = useSupabase();
      const record = toModuleRecord(module);
      await supabase
        .from('quotation_service_modules' as any)
        .upsert(record);
    } catch (dbErr) {
      console.warn('Could not update module in database, using local cache:', dbErr);
    }

    // Update cache
    const modules = getModulesFromCache();
    const index = modules.findIndex((m) => m.id === module.id);
    if (index >= 0) {
      modules[index] = module;
    } else {
      modules.push(module);
    }
    modulesCache = modules;

    return { data: module, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Delete a module (soft delete - sets is_active to false)
 */
export async function deleteModule(id: string): Promise<ModuleServiceResult<boolean>> {
  try {
    // Try to update in database
    try {
      const supabase = useSupabase();
      await supabase
        .from('quotation_service_modules' as any)
        .update({ is_active: false })
        .eq('id', id);
    } catch (dbErr) {
      console.warn('Could not delete module in database, using local cache:', dbErr);
    }

    // Update cache
    const modules = getModulesFromCache();
    const index = modules.findIndex((m) => m.id === id);
    if (index >= 0) {
      modules[index] = { ...modules[index], isActive: false };
      modulesCache = modules;
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: false, error: err as Error };
  }
}

/**
 * Seed modules from config to database
 */
export async function seedModulesFromConfig(): Promise<ModuleServiceResult<number>> {
  try {
    const supabase = useSupabase();
    const records = SERVICE_MODULES.map((m) => toModuleRecord(m as ServiceModule));

    const { data, error } = await supabase
      .from('quotation_service_modules' as any)
      .upsert(records)
      .select();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data?.length || 0, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
