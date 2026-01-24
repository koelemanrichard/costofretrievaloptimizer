/**
 * Package Service - CRUD operations for quotation packages
 *
 * Provides database persistence for packages with fallback to config.
 * Uses Supabase for storage when available.
 *
 * Note: Database tables (quotation_packages) need to be created via migration.
 * Until then, this service falls back to config.
 */

import { useSupabase } from '../supabaseClient';
import {
  QuotationPackage,
  QuotationPackageRecord,
  toQuotationPackage,
} from '../../types/quotation';
import { QUOTATION_PACKAGES } from '../../config/quotation/packages';

// =============================================================================
// Types
// =============================================================================

interface PackageServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// =============================================================================
// Convert to database record format
// =============================================================================

function toPackageRecord(pkg: QuotationPackage): Omit<QuotationPackageRecord, 'created_at' | 'updated_at'> {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description || null,
    included_modules: pkg.includedModules,
    base_price: pkg.basePrice,
    discount_percent: pkg.discountPercent,
    target_site_sizes: pkg.targetSiteSizes,
    is_active: pkg.isActive,
    display_order: pkg.displayOrder,
  };
}

// =============================================================================
// In-memory store for modified packages (until database is available)
// =============================================================================

let packagesCache: QuotationPackage[] | null = null;

function getPackagesFromCache(): QuotationPackage[] {
  if (!packagesCache) {
    packagesCache = [...QUOTATION_PACKAGES] as QuotationPackage[];
  }
  return packagesCache;
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get all packages (from database with fallback to config)
 */
export async function getPackages(): Promise<PackageServiceResult<QuotationPackage[]>> {
  try {
    const supabase = useSupabase();
    const { data, error } = await supabase
      .from('quotation_packages' as any)
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.warn('Failed to fetch packages from database, using config fallback:', error.message);
      return { data: getPackagesFromCache(), error: null };
    }

    if (!data || data.length === 0) {
      // No data in database, return config packages
      return { data: getPackagesFromCache(), error: null };
    }

    // Update cache with database data
    packagesCache = data.map((record: any) => toQuotationPackage(record as QuotationPackageRecord));
    return { data: packagesCache, error: null };
  } catch (err) {
    console.warn('Package service error, using config fallback:', err);
    return { data: getPackagesFromCache(), error: null };
  }
}

/**
 * Get active packages only
 */
export async function getActivePackages(): Promise<PackageServiceResult<QuotationPackage[]>> {
  const allPackages = getPackagesFromCache();
  const activePackages = allPackages.filter((p) => p.isActive);
  return { data: activePackages, error: null };
}

/**
 * Get a single package by ID
 */
export async function getPackageById(id: string): Promise<PackageServiceResult<QuotationPackage>> {
  const packages = getPackagesFromCache();
  const pkg = packages.find((p) => p.id === id);
  return {
    data: pkg || null,
    error: pkg ? null : new Error('Package not found'),
  };
}

/**
 * Create a new package
 */
export async function createPackage(
  pkg: Omit<QuotationPackage, 'id'> & { id?: string }
): Promise<PackageServiceResult<QuotationPackage>> {
  try {
    const id = pkg.id || `package_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newPackage: QuotationPackage = { ...pkg, id } as QuotationPackage;

    // Try to save to database
    try {
      const supabase = useSupabase();
      const record = toPackageRecord(newPackage);
      await supabase
        .from('quotation_packages' as any)
        .insert(record);
    } catch (dbErr) {
      console.warn('Could not save package to database, using local cache:', dbErr);
    }

    // Update cache
    const packages = getPackagesFromCache();
    packages.push(newPackage);
    packagesCache = packages;

    return { data: newPackage, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Update an existing package
 */
export async function updatePackage(pkg: QuotationPackage): Promise<PackageServiceResult<QuotationPackage>> {
  try {
    // Try to save to database
    try {
      const supabase = useSupabase();
      const record = toPackageRecord(pkg);
      await supabase
        .from('quotation_packages' as any)
        .upsert(record);
    } catch (dbErr) {
      console.warn('Could not update package in database, using local cache:', dbErr);
    }

    // Update cache
    const packages = getPackagesFromCache();
    const index = packages.findIndex((p) => p.id === pkg.id);
    if (index >= 0) {
      packages[index] = pkg;
    } else {
      packages.push(pkg);
    }
    packagesCache = packages;

    return { data: pkg, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Delete a package (soft delete - sets is_active to false)
 */
export async function deletePackage(id: string): Promise<PackageServiceResult<boolean>> {
  try {
    // Try to update in database
    try {
      const supabase = useSupabase();
      await supabase
        .from('quotation_packages' as any)
        .update({ is_active: false })
        .eq('id', id);
    } catch (dbErr) {
      console.warn('Could not delete package in database, using local cache:', dbErr);
    }

    // Update cache
    const packages = getPackagesFromCache();
    const index = packages.findIndex((p) => p.id === id);
    if (index >= 0) {
      packages[index] = { ...packages[index], isActive: false };
      packagesCache = packages;
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: false, error: err as Error };
  }
}

/**
 * Seed packages from config to database
 */
export async function seedPackagesFromConfig(): Promise<PackageServiceResult<number>> {
  try {
    const supabase = useSupabase();
    const records = QUOTATION_PACKAGES.map((p) => toPackageRecord(p as QuotationPackage));

    const { data, error } = await supabase
      .from('quotation_packages' as any)
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
