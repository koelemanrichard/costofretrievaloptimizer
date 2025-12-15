
// services/ai/foundationPages.ts
// Foundation Pages Generation and Management Service

import {
  BusinessInfo,
  SEOPillars,
  EnrichedTopic,
  FoundationPage,
  FoundationPageType,
  NavigationStructure,
  NavigationLink,
  FooterSection,
  NAPData,
  FoundationPageSection
} from '../../types';
import * as prompts from '../../config/prompts';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import { AIResponseSanitizer } from '../aiResponseSanitizer';
import { useSupabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import React from 'react';

// Type for AI-generated foundation pages response
interface GeneratedFoundationPagesResponse {
  foundationPages: {
    page_type: FoundationPageType;
    title: string;
    slug: string;
    meta_description?: string;
    h1_template?: string;
    schema_type?: 'Organization' | 'AboutPage' | 'ContactPage' | 'WebPage';
    sections?: FoundationPageSection[];
  }[];
  napDataSuggestions?: {
    company_name?: string;
    address_hint?: string;
    phone_hint?: string;
    email_hint?: string;
  };
  navigationSuggestions?: {
    headerLinks?: string[];
    footerSections?: { heading: string; links: string[] }[];
    ctaButton?: { text: string; target: string };
  };
}

// Type for AI-generated navigation response
interface GeneratedNavigationResponse {
  header: {
    logo_alt_text: string;
    primary_nav: {
      text: string;
      target_foundation_page_id?: string | null;
      target_topic_id?: string | null;
      prominence: 'high' | 'medium' | 'low';
      order: number;
    }[];
    cta_button?: {
      text: string;
      target_foundation_page_id?: string | null;
      target_topic_id?: string | null;
    } | null;
  };
  footer: {
    sections: {
      heading: string;
      links: {
        text: string;
        target_foundation_page_id?: string | null;
        target_topic_id?: string | null;
        prominence: 'medium' | 'low';
      }[];
    }[];
    legal_links: {
      text: string;
      target_foundation_page_id?: string;
    }[];
    nap_display: boolean;
    copyright_text: string;
  };
}

// ============================================
// CLUSTER ROLE FALLBACK LOGIC
// Ensures topics have cluster_role assigned even if map generation didn't set it
// ============================================

const PILLAR_SPOKE_THRESHOLD = 3; // Minimum spokes for a core topic to be considered a pillar

/**
 * Ensures core topics have cluster_role assigned.
 * If cluster_role is missing, assigns it based on spoke count.
 *
 * @param coreTopics - Core topics that may or may not have cluster_role
 * @param allTopics - All topics (including outer) to count spokes
 * @returns Core topics with cluster_role guaranteed
 */
const ensureClusterRoles = (
  coreTopics: EnrichedTopic[],
  allTopics: EnrichedTopic[]
): EnrichedTopic[] => {
  // Check if any core topics are missing cluster_role
  const hasMissingRoles = coreTopics.some(t => !t.cluster_role);

  if (!hasMissingRoles) {
    // All topics already have cluster_role assigned
    return coreTopics;
  }

  // Count spokes per core topic
  const outerTopics = allTopics.filter(t => t.type === 'outer');
  const spokeCountMap = new Map<string, number>();

  for (const outer of outerTopics) {
    if (outer.parent_topic_id) {
      const current = spokeCountMap.get(outer.parent_topic_id) || 0;
      spokeCountMap.set(outer.parent_topic_id, current + 1);
    }
  }

  // Assign cluster_role based on spoke count
  return coreTopics.map(core => {
    if (core.cluster_role) {
      return core; // Already has role
    }

    const spokeCount = spokeCountMap.get(core.id) || 0;
    const clusterRole: 'pillar' | 'cluster_content' = spokeCount >= PILLAR_SPOKE_THRESHOLD
      ? 'pillar'
      : 'cluster_content';

    return {
      ...core,
      cluster_role: clusterRole
    };
  });
};

/**
 * Generate foundation pages via AI based on business context and SEO pillars
 * @param selectedPages - Optional array of page types to generate. If not provided, generates all standard pages.
 */
export const generateFoundationPages = async (
  businessInfo: BusinessInfo,
  pillars: SEOPillars,
  dispatch: React.Dispatch<any>,
  selectedPages?: FoundationPageType[]
): Promise<GeneratedFoundationPagesResponse> => {
  const pagesToGenerate = selectedPages || ['homepage', 'about', 'contact', 'privacy', 'terms'];
  dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: `Generating ${pagesToGenerate.length} foundation pages: ${pagesToGenerate.join(', ')}...`, status: 'info', timestamp: Date.now() } });

  const sanitizer = new AIResponseSanitizer(dispatch);
  const prompt = prompts.GENERATE_FOUNDATION_PAGES_PROMPT(businessInfo, pillars);

  const fallback: GeneratedFoundationPagesResponse = {
    foundationPages: getDefaultFoundationPages(businessInfo, pillars),
    napDataSuggestions: {
      company_name: businessInfo.domain.replace(/\.(com|nl|org|net)$/, '').replace(/-/g, ' '),
      address_hint: 'Enter your business address',
      phone_hint: '+XX XXX XXX XXXX',
      email_hint: `info@${businessInfo.domain}`
    },
    navigationSuggestions: {
      headerLinks: ['Home', 'About', 'Services', 'Contact'],
      footerSections: [
        { heading: 'Company', links: ['About Us', 'Contact'] },
        { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service'] }
      ],
      ctaButton: { text: 'Contact Us', target: 'contact' }
    }
  };

  try {
    // Use the configured AI provider
    let result: GeneratedFoundationPagesResponse;

    switch (businessInfo.aiProvider) {
      case 'anthropic':
        result = await callAnthropicForFoundationPages(prompt, businessInfo, dispatch, sanitizer, fallback);
        break;
      case 'openai':
        result = await callOpenAIForFoundationPages(prompt, businessInfo, dispatch, sanitizer, fallback);
        break;
      case 'gemini':
      default:
        result = await callGeminiForFoundationPages(prompt, businessInfo, dispatch, sanitizer, fallback);
        break;
    }

    // Filter to only include selected page types (normalize AI-returned types first)
    const filteredPages = result.foundationPages.filter(page => {
      const normalizedType = normalizePageType(page.page_type);
      return normalizedType && pagesToGenerate.includes(normalizedType);
    });

    // If author page is selected but not in AI result, add a default author page
    if (pagesToGenerate.includes('author') && !filteredPages.some(p => p.page_type === 'author')) {
      const companyName = businessInfo.domain.replace(/\.(com|nl|org|net)$/, '').replace(/-/g, ' ');
      const capitalizedName = companyName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      filteredPages.push({
        page_type: 'author',
        title: `Our Team | ${capitalizedName}`,
        slug: '/team',
        meta_description: `Meet the experts behind ${capitalizedName}. Our team brings years of experience and expertise.`,
        h1_template: `Meet the ${capitalizedName} Team`,
        schema_type: 'AboutPage',
        sections: [
          { heading: 'Our Expertise', content_type: 'text', order: 1 },
          { heading: 'Team Members', content_type: 'team_grid', order: 2 },
          { heading: 'Our Values', content_type: 'text', order: 3 }
        ]
      });
    }

    dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: `Generated ${filteredPages.length} foundation pages (filtered from ${result.foundationPages.length})`, status: 'success', timestamp: Date.now() } });

    return {
      ...result,
      foundationPages: filteredPages
    };
  } catch (error) {
    dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: `Error generating foundation pages: ${error}`, status: 'failure', timestamp: Date.now() } });

    // Filter fallback to only include selected pages
    const filteredFallback = {
      ...fallback,
      foundationPages: fallback.foundationPages.filter(page =>
        pagesToGenerate.includes(page.page_type as FoundationPageType)
      )
    };

    // Add author page to fallback if selected
    if (pagesToGenerate.includes('author') && !filteredFallback.foundationPages.some(p => p.page_type === 'author')) {
      const companyName = businessInfo.domain.replace(/\.(com|nl|org|net)$/, '').replace(/-/g, ' ');
      const capitalizedName = companyName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      filteredFallback.foundationPages.push({
        page_type: 'author',
        title: `Our Team | ${capitalizedName}`,
        slug: '/team',
        meta_description: `Meet the experts behind ${capitalizedName}. Our team brings years of experience and expertise.`,
        h1_template: `Meet the ${capitalizedName} Team`,
        schema_type: 'AboutPage',
        sections: []
      });
    }

    return filteredFallback;
  }
};

/**
 * Generate default navigation structure based on foundation pages and core topics
 */
export const generateDefaultNavigation = async (
  foundationPages: FoundationPage[],
  coreTopics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  allTopics?: EnrichedTopic[] // Include outer topics for cluster role fallback
): Promise<NavigationStructure> => {
  dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: 'Generating navigation structure...', status: 'info', timestamp: Date.now() } });

  // Ensure topics have cluster_role assigned (fallback if missing)
  const topicsWithRoles = ensureClusterRoles(coreTopics, allTopics || []);

  const sanitizer = new AIResponseSanitizer(dispatch);
  const prompt = prompts.GENERATE_DEFAULT_NAVIGATION_PROMPT(
    foundationPages.map(p => ({ page_type: p.page_type, title: p.title, slug: p.slug })),
    // Pass cluster_role and topic_class to the prompt
    topicsWithRoles.map(t => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      cluster_role: t.cluster_role,
      topic_class: t.topic_class
    })),
    businessInfo
  );

  // Log pillar detection stats
  const pillarCount = topicsWithRoles.filter(t => t.cluster_role === 'pillar').length;
  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'FoundationPages',
      message: `Navigation generation: ${pillarCount} pillars, ${topicsWithRoles.filter(t => t.topic_class === 'monetization').length} monetization topics identified`,
      status: 'info',
      timestamp: Date.now()
    }
  });

  const defaultNav = createDefaultNavigation(foundationPages, topicsWithRoles, businessInfo);

  try {
    // Use the configured AI provider
    let response: GeneratedNavigationResponse;

    switch (businessInfo.aiProvider) {
      case 'anthropic':
        response = await callAnthropicForNavigation(prompt, businessInfo, dispatch, sanitizer, defaultNav);
        break;
      case 'openai':
        response = await callOpenAIForNavigation(prompt, businessInfo, dispatch, sanitizer, defaultNav);
        break;
      case 'gemini':
      default:
        response = await callGeminiForNavigation(prompt, businessInfo, dispatch, sanitizer, defaultNav);
        break;
    }

    dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: 'Navigation structure generated', status: 'success', timestamp: Date.now() } });

    return {
      id: uuidv4(),
      map_id: '', // Will be set when saving
      header: {
        logo_alt_text: response.header.logo_alt_text,
        primary_nav: response.header.primary_nav.map((link, index) => ({
          id: uuidv4(),
          text: link.text,
          target_topic_id: link.target_topic_id || undefined,
          target_foundation_page_id: link.target_foundation_page_id || undefined,
          prominence: link.prominence,
          order: link.order ?? index
        })),
        cta_button: response.header.cta_button ? {
          text: response.header.cta_button.text,
          target_topic_id: response.header.cta_button.target_topic_id || undefined,
          target_foundation_page_id: response.header.cta_button.target_foundation_page_id || undefined
        } : undefined
      },
      footer: {
        sections: response.footer.sections.map(section => ({
          id: uuidv4(),
          heading: section.heading,
          links: section.links.map(link => ({
            id: uuidv4(),
            text: link.text,
            target_topic_id: link.target_topic_id || undefined,
            target_foundation_page_id: link.target_foundation_page_id || undefined,
            prominence: link.prominence
          }))
        })),
        legal_links: response.footer.legal_links.map(link => ({
          id: uuidv4(),
          text: link.text,
          target_foundation_page_id: link.target_foundation_page_id,
          prominence: 'low' as const
        })),
        nap_display: response.footer.nap_display,
        copyright_text: response.footer.copyright_text
      },
      max_header_links: 10,
      max_footer_links: 30,
      dynamic_by_section: true
    };
  } catch (error) {
    dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: `Error generating navigation: ${error}`, status: 'failure', timestamp: Date.now() } });
    return defaultNav;
  }
};

// ============================================
// Database Operations
// ============================================

/**
 * Transform raw database row to typed FoundationPage
 * Handles JSONB fields that come back as Json type from Supabase
 */
function transformToFoundationPage(row: Record<string, unknown>): FoundationPage {
  return {
    id: row.id as string,
    map_id: row.map_id as string,
    user_id: row.user_id as string,
    page_type: row.page_type as FoundationPageType,
    title: row.title as string,
    slug: row.slug as string,
    meta_description: row.meta_description as string | undefined,
    h1_template: row.h1_template as string | undefined,
    schema_type: row.schema_type as FoundationPage['schema_type'],
    sections: row.sections as FoundationPageSection[] | undefined,
    nap_data: row.nap_data as NAPData | undefined,
    deleted_at: row.deleted_at as string | undefined,
    deletion_reason: row.deletion_reason as 'user_deleted' | 'not_needed' | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined
  };
}

/**
 * Save foundation pages to database
 */
export const saveFoundationPages = async (
  mapId: string,
  userId: string,
  pages: FoundationPage[],
  supabaseUrl: string,
  supabaseKey: string
): Promise<FoundationPage[]> => {
  const supabase = useSupabase();

  const pagesToInsert = pages.map(page => ({
    id: page.id || uuidv4(),
    map_id: mapId,
    user_id: userId,
    page_type: page.page_type,
    title: page.title,
    slug: page.slug,
    meta_description: page.meta_description,
    h1_template: page.h1_template,
    schema_type: page.schema_type,
    sections: page.sections,
    nap_data: page.nap_data,
    metadata: page.metadata
  }));

  const { data, error } = await supabase
    .from('foundation_pages')
    .upsert(pagesToInsert as any, { onConflict: 'map_id,page_type' })
    .select();

  if (error) {
    throw new Error(`Failed to save foundation pages: ${error.message}`);
  }

  return (data || []).map(row => transformToFoundationPage(row as Record<string, unknown>));
};

/**
 * Load foundation pages from database
 */
export const loadFoundationPages = async (
  mapId: string
): Promise<FoundationPage[]> => {
  const supabase = useSupabase();

  const { data, error } = await supabase
    .from('foundation_pages')
    .select('*')
    .eq('map_id', mapId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to load foundation pages: ${error.message}`);
  }

  return (data || []).map(row => transformToFoundationPage(row as Record<string, unknown>));
};

/**
 * Update a single foundation page
 */
export const updateFoundationPage = async (
  pageId: string,
  updates: Partial<FoundationPage>
): Promise<FoundationPage> => {
  const supabase = useSupabase();

  const { data, error } = await supabase
    .from('foundation_pages')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    } as any)
    .eq('id', pageId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update foundation page: ${error.message}`);
  }

  return transformToFoundationPage(data as Record<string, unknown>);
};

/**
 * Soft delete a foundation page
 */
export const deleteFoundationPage = async (
  pageId: string,
  reason: 'user_deleted' | 'not_needed' = 'user_deleted'
): Promise<FoundationPage> => {
  const supabase = useSupabase();

  const { data, error } = await supabase
    .from('foundation_pages')
    .update({
      deleted_at: new Date().toISOString(),
      deletion_reason: reason
    } as any)
    .eq('id', pageId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete foundation page: ${error.message}`);
  }

  return transformToFoundationPage(data as Record<string, unknown>);
};

/**
 * Restore a soft-deleted foundation page
 */
export const restoreFoundationPage = async (
  pageId: string
): Promise<FoundationPage> => {
  const supabase = useSupabase();

  const { data, error } = await supabase
    .from('foundation_pages')
    .update({
      deleted_at: null,
      deletion_reason: null
    } as any)
    .eq('id', pageId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to restore foundation page: ${error.message}`);
  }

  return transformToFoundationPage(data as Record<string, unknown>);
};

/**
 * Transform raw database row to typed NavigationStructure
 * Handles JSONB fields that come back as Json type from Supabase
 */
function transformToNavigationStructure(row: Record<string, unknown>): NavigationStructure {
  return {
    id: row.id as string,
    map_id: row.map_id as string,
    header: row.header as NavigationStructure['header'],
    footer: row.footer as NavigationStructure['footer'],
    max_header_links: row.max_header_links as number,
    max_footer_links: row.max_footer_links as number,
    dynamic_by_section: row.dynamic_by_section as boolean,
    metadata: row.metadata as Record<string, unknown> | undefined,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined
  };
}

/**
 * Save navigation structure to database
 */
export const saveNavigationStructure = async (
  mapId: string,
  userId: string,
  navigation: NavigationStructure
): Promise<NavigationStructure> => {
  const supabase = useSupabase();

  const navToUpsert = {
    id: navigation.id || uuidv4(),
    map_id: mapId,
    user_id: userId,
    header: navigation.header,
    footer: navigation.footer,
    max_header_links: navigation.max_header_links,
    max_footer_links: navigation.max_footer_links,
    dynamic_by_section: navigation.dynamic_by_section,
    metadata: navigation.metadata
  };

  const { data, error } = await supabase
    .from('navigation_structures')
    .upsert(navToUpsert as any, { onConflict: 'map_id' })
    .select()
    .single();

  if (error) {
    // If table doesn't exist, just warn and return the navigation as-is
    if (error.message?.includes('406') || error.code === '42P01') {
      console.warn('Navigation structures table not found, skipping save');
      return navigation;
    }
    throw new Error(`Failed to save navigation structure: ${error.message}`);
  }

  return transformToNavigationStructure(data as Record<string, unknown>);
};

// Cache key for tracking if navigation_structures table exists
const NAV_TABLE_EXISTS_KEY = 'nav_structures_table_exists';
const NAV_TABLE_CHECK_EXPIRY = 1000 * 60 * 60; // 1 hour

/**
 * Check if we should skip the navigation structures query
 * (because we know the table doesn't exist)
 */
const shouldSkipNavigationQuery = (): boolean => {
  try {
    const cached = localStorage.getItem(NAV_TABLE_EXISTS_KEY);
    if (!cached) return false;

    const { exists, timestamp } = JSON.parse(cached);
    // If cache is expired, allow the query
    if (Date.now() - timestamp > NAV_TABLE_CHECK_EXPIRY) {
      return false;
    }
    // Skip query if we know table doesn't exist
    return exists === false;
  } catch {
    return false;
  }
};

/**
 * Mark whether the navigation_structures table exists
 */
const markNavigationTableExists = (exists: boolean): void => {
  try {
    localStorage.setItem(NAV_TABLE_EXISTS_KEY, JSON.stringify({
      exists,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore localStorage errors
  }
};

/**
 * Load navigation structure from database
 * Note: Uses maybeSingle() to avoid errors when no rows exist
 * Silently returns null if table doesn't exist (406 error)
 * Caches table existence to prevent repeated 406 errors
 */
export const loadNavigationStructure = async (
  mapId: string
): Promise<NavigationStructure | null> => {
  // Skip the query entirely if we know the table doesn't exist
  if (shouldSkipNavigationQuery()) {
    return null;
  }

  const supabase = useSupabase();

  try {
    const { data, error } = await supabase
      .from('navigation_structures')
      .select('*')
      .eq('map_id', mapId)
      .maybeSingle();  // Use maybeSingle to avoid error when no rows exist

    // Handle table not existing (406) or other errors
    if (error) {
      // 406 = table doesn't exist, PGRST116 = no rows, 42P01 = undefined table
      const isTableMissing =
        (error as any).status === 406 ||
        error.code === '42P01' ||
        error.message?.includes('406') ||
        error.message?.includes('relation') ||
        error.message?.includes('does not exist');

      if (isTableMissing) {
        // Cache that the table doesn't exist to prevent future 406 errors
        markNavigationTableExists(false);
        return null;
      }

      // For "no rows" error, table exists but is empty
      if (error.code === 'PGRST116') {
        markNavigationTableExists(true);
        return null;
      }

      console.warn(`Navigation structure query error: ${error.message}`);
      return null;
    }

    // Table exists and we got data
    markNavigationTableExists(true);

    if (!data) return null;
    return transformToNavigationStructure(data as Record<string, unknown>);
  } catch (e) {
    // Catch any network errors (including 406) and silently return null
    markNavigationTableExists(false);
    return null;
  }
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get default foundation pages when AI generation fails
 */
function getDefaultFoundationPages(businessInfo: BusinessInfo, pillars: SEOPillars): GeneratedFoundationPagesResponse['foundationPages'] {
  const companyName = businessInfo.domain.replace(/\.(com|nl|org|net)$/, '').replace(/-/g, ' ');
  const capitalizedName = companyName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return [
    {
      page_type: 'homepage',
      title: `${capitalizedName} - ${pillars.sourceContext}`,
      slug: '/',
      meta_description: `${pillars.centralEntity}: ${pillars.sourceContext}. ${pillars.centralSearchIntent}.`,
      h1_template: `${pillars.centralEntity}: ${pillars.sourceContext}`,
      schema_type: 'Organization',
      sections: [
        { heading: 'Hero Section', purpose: 'Primary value proposition and CTA', required: true },
        { heading: 'Services Overview', purpose: 'Top 5-7 core services/products', required: true },
        { heading: 'Why Choose Us', purpose: 'Key differentiators and trust signals', required: true },
        { heading: 'Testimonials', purpose: 'Social proof from customers', required: false }
      ]
    },
    {
      page_type: 'about',
      title: `About ${capitalizedName}`,
      slug: '/about',
      meta_description: `Learn about ${capitalizedName}'s mission, team, and expertise in ${pillars.centralEntity}.`,
      h1_template: `About ${capitalizedName}`,
      schema_type: 'AboutPage',
      sections: [
        { heading: 'Our Story', purpose: 'Company history and founding story', required: true },
        { heading: 'Mission & Values', purpose: 'Company mission statement and core values', required: true },
        { heading: 'Our Team', purpose: 'Team members with credentials', required: true },
        { heading: 'Credentials & Awards', purpose: 'Certifications, awards, press mentions', required: false }
      ]
    },
    {
      page_type: 'contact',
      title: `Contact ${capitalizedName}`,
      slug: '/contact',
      meta_description: `Contact ${capitalizedName} for ${pillars.centralEntity} inquiries. Get in touch with our team.`,
      h1_template: `Contact ${capitalizedName}`,
      schema_type: 'ContactPage',
      sections: [
        { heading: 'Contact Form', purpose: 'Primary contact form', required: true },
        { heading: 'Contact Information', purpose: 'NAP data: address, phone, email', required: true },
        { heading: 'Business Hours', purpose: 'Operating hours', required: false },
        { heading: 'Location', purpose: 'Map or location details', required: false }
      ]
    },
    {
      page_type: 'privacy',
      title: `Privacy Policy - ${capitalizedName}`,
      slug: '/privacy',
      meta_description: `Privacy policy for ${capitalizedName}. Learn how we handle your data.`,
      h1_template: 'Privacy Policy',
      schema_type: 'WebPage',
      sections: [
        { heading: 'Data Collection', purpose: 'What data we collect', required: true },
        { heading: 'Data Usage', purpose: 'How we use collected data', required: true },
        { heading: 'Data Sharing', purpose: 'Third-party sharing policies', required: true },
        { heading: 'Your Rights', purpose: 'GDPR/user rights information', required: true }
      ]
    },
    {
      page_type: 'terms',
      title: `Terms of Service - ${capitalizedName}`,
      slug: '/terms',
      meta_description: `Terms of service for ${capitalizedName}. Read our terms and conditions.`,
      h1_template: 'Terms of Service',
      schema_type: 'WebPage',
      sections: [
        { heading: 'Acceptance of Terms', purpose: 'Agreement to terms', required: true },
        { heading: 'Use of Service', purpose: 'How the service may be used', required: true },
        { heading: 'Limitations', purpose: 'Liability limitations', required: true },
        { heading: 'Governing Law', purpose: 'Legal jurisdiction', required: true }
      ]
    }
  ];
}

/**
 * Create default navigation structure
 */
function createDefaultNavigation(
  foundationPages: FoundationPage[],
  coreTopics: EnrichedTopic[],
  businessInfo: BusinessInfo
): NavigationStructure {
  const companyName = businessInfo.domain.replace(/\.(com|nl|org|net)$/, '').replace(/-/g, ' ');

  const homepage = foundationPages.find(p => p.page_type === 'homepage');
  const about = foundationPages.find(p => p.page_type === 'about');
  const contact = foundationPages.find(p => p.page_type === 'contact');
  const privacy = foundationPages.find(p => p.page_type === 'privacy');
  const terms = foundationPages.find(p => p.page_type === 'terms');

  // Header: Homepage + top core topics + About + Contact
  const headerLinks: NavigationLink[] = [];

  // Add homepage first
  if (homepage) {
    headerLinks.push({
      id: uuidv4(),
      text: 'Home',
      target_foundation_page_id: homepage.id,
      prominence: 'high',
      order: 0
    });
  }

  // Add top 3-4 core topics
  coreTopics.slice(0, 4).forEach((topic, index) => {
    headerLinks.push({
      id: uuidv4(),
      text: topic.title,
      target_topic_id: topic.id,
      prominence: 'high',
      order: index + 1
    });
  });

  // Add About and Contact
  if (about) {
    headerLinks.push({
      id: uuidv4(),
      text: 'About',
      target_foundation_page_id: about.id,
      prominence: 'medium',
      order: headerLinks.length
    });
  }
  if (contact) {
    headerLinks.push({
      id: uuidv4(),
      text: 'Contact',
      target_foundation_page_id: contact.id,
      prominence: 'medium',
      order: headerLinks.length
    });
  }

  // Footer sections
  const footerSections: FooterSection[] = [
    {
      id: uuidv4(),
      heading: 'Services',
      links: coreTopics.slice(0, 6).map(topic => ({
        id: uuidv4(),
        text: topic.title,
        target_topic_id: topic.id,
        prominence: 'medium' as const
      }))
    },
    {
      id: uuidv4(),
      heading: 'Company',
      links: [
        about && { id: uuidv4(), text: 'About Us', target_foundation_page_id: about.id, prominence: 'medium' as const },
        contact && { id: uuidv4(), text: 'Contact', target_foundation_page_id: contact.id, prominence: 'medium' as const }
      ].filter(Boolean) as NavigationLink[]
    }
  ];

  // Legal links
  const legalLinks: NavigationLink[] = [
    privacy && { id: uuidv4(), text: 'Privacy Policy', target_foundation_page_id: privacy.id, prominence: 'low' as const },
    terms && { id: uuidv4(), text: 'Terms of Service', target_foundation_page_id: terms.id, prominence: 'low' as const }
  ].filter(Boolean) as NavigationLink[];

  return {
    id: uuidv4(),
    map_id: '',
    header: {
      logo_alt_text: `${companyName} Logo`,
      primary_nav: headerLinks,
      cta_button: contact ? {
        text: 'Get Started',
        target_foundation_page_id: contact.id
      } : undefined
    },
    footer: {
      sections: footerSections,
      legal_links: legalLinks,
      nap_display: true,
      copyright_text: `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`
    },
    max_header_links: 10,
    max_footer_links: 30,
    dynamic_by_section: true
  };
}

/**
 * Call Gemini API for foundation pages generation
 */
/**
 * Helper to get the correct model for a provider
 */
function getModelForProvider(businessInfo: BusinessInfo, provider: 'gemini' | 'anthropic' | 'openai'): string {
  // If the current provider matches and model is set, use it
  if (businessInfo.aiProvider === provider && businessInfo.aiModel) {
    return businessInfo.aiModel;
  }
  // Otherwise return sensible defaults
  switch (provider) {
    case 'gemini':
      return 'gemini-2.0-flash';
    case 'anthropic':
      return 'claude-sonnet-4-5-20250929';
    case 'openai':
      return 'gpt-4o';
    default:
      return 'gemini-2.0-flash';
  }
}

async function callGeminiForFoundationPages(
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  sanitizer: AIResponseSanitizer,
  fallback: GeneratedFoundationPagesResponse
): Promise<GeneratedFoundationPagesResponse> {
  try {
    const { GoogleGenAI } = await import('@google/genai');

    const apiKey = businessInfo.geminiApiKey;
    if (!apiKey) throw new Error('Gemini API key not configured');

    const ai = new GoogleGenAI({ apiKey });
    const model = getModelForProvider(businessInfo, 'gemini');

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });

    const responseText = response.text;
    if (!responseText) throw new Error('Empty response from Gemini');

    return sanitizer.sanitize(responseText, {
      foundationPages: Array,
      napDataSuggestions: Object,
      navigationSuggestions: Object
    }, fallback);
  } catch (error) {
    dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: `Gemini call failed: ${error}`, status: 'failure', timestamp: Date.now() } });
    return fallback;
  }
}

async function callAnthropicForFoundationPages(
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  sanitizer: AIResponseSanitizer,
  fallback: GeneratedFoundationPagesResponse
): Promise<GeneratedFoundationPagesResponse> {
  try {
    const responseText = await anthropicService.generateText(prompt, businessInfo, dispatch);

    if (!responseText) throw new Error('Empty response from Anthropic');

    return sanitizer.sanitize(responseText, {
      foundationPages: Array,
      napDataSuggestions: Object,
      navigationSuggestions: Object
    }, fallback);
  } catch (error) {
    dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: `Anthropic call failed: ${error}`, status: 'failure', timestamp: Date.now() } });
    return fallback;
  }
}

async function callOpenAIForFoundationPages(
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  sanitizer: AIResponseSanitizer,
  fallback: GeneratedFoundationPagesResponse
): Promise<GeneratedFoundationPagesResponse> {
  try {
    const responseText = await openAiService.generateText(prompt, businessInfo, dispatch);

    if (!responseText) throw new Error('Empty response from OpenAI');

    return sanitizer.sanitize(responseText, {
      foundationPages: Array,
      napDataSuggestions: Object,
      navigationSuggestions: Object
    }, fallback);
  } catch (error) {
    dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: `OpenAI call failed: ${error}`, status: 'failure', timestamp: Date.now() } });
    return fallback;
  }
}

/**
 * Call Gemini API for navigation generation
 */
async function callGeminiForNavigation(
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  sanitizer: AIResponseSanitizer,
  fallback: NavigationStructure
): Promise<GeneratedNavigationResponse> {
  try {
    const { GoogleGenAI } = await import('@google/genai');

    const apiKey = businessInfo.geminiApiKey;
    if (!apiKey) throw new Error('Gemini API key not configured');

    const ai = new GoogleGenAI({ apiKey });
    const model = getModelForProvider(businessInfo, 'gemini');

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });

    const responseText = response.text;
    if (!responseText) throw new Error('Empty response from Gemini');

    return sanitizer.sanitize(responseText, {
      header: Object,
      footer: Object
    }, {
      header: fallback.header,
      footer: fallback.footer
    } as GeneratedNavigationResponse);
  } catch (error) {
    dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: `Gemini navigation call failed: ${error}`, status: 'failure', timestamp: Date.now() } });
    return {
      header: fallback.header,
      footer: fallback.footer
    } as GeneratedNavigationResponse;
  }
}

async function callAnthropicForNavigation(
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  sanitizer: AIResponseSanitizer,
  fallback: NavigationStructure
): Promise<GeneratedNavigationResponse> {
  try {
    const responseText = await anthropicService.generateText(prompt, businessInfo, dispatch);

    if (!responseText) throw new Error('Empty response from Anthropic');

    return sanitizer.sanitize(responseText, {
      header: Object,
      footer: Object
    }, {
      header: fallback.header,
      footer: fallback.footer
    } as GeneratedNavigationResponse);
  } catch (error) {
    dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: `Anthropic navigation call failed: ${error}`, status: 'failure', timestamp: Date.now() } });
    return {
      header: fallback.header,
      footer: fallback.footer
    } as GeneratedNavigationResponse;
  }
}

async function callOpenAIForNavigation(
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  sanitizer: AIResponseSanitizer,
  fallback: NavigationStructure
): Promise<GeneratedNavigationResponse> {
  try {
    const responseText = await openAiService.generateText(prompt, businessInfo, dispatch);

    if (!responseText) throw new Error('Empty response from OpenAI');

    return sanitizer.sanitize(responseText, {
      header: Object,
      footer: Object
    }, {
      header: fallback.header,
      footer: fallback.footer
    } as GeneratedNavigationResponse);
  } catch (error) {
    dispatch({ type: 'LOG_EVENT', payload: { service: 'FoundationPages', message: `OpenAI navigation call failed: ${error}`, status: 'failure', timestamp: Date.now() } });
    return {
      header: fallback.header,
      footer: fallback.footer
    } as GeneratedNavigationResponse;
  }
}

// Valid page types that match the database CHECK constraint
const VALID_PAGE_TYPES: FoundationPageType[] = ['homepage', 'about', 'contact', 'privacy', 'terms', 'author'];

/**
 * Normalize and validate page_type from AI response
 * Handles variations like "Homepage", "privacy_policy", "Privacy Policy", etc.
 */
const normalizePageType = (rawType: string): FoundationPageType | null => {
  if (!rawType) return null;

  // Normalize: lowercase, remove underscores/spaces, trim
  const normalized = rawType.toLowerCase().replace(/[_\s-]+/g, '').trim();

  // Map common variations to valid types
  const typeMap: Record<string, FoundationPageType> = {
    'homepage': 'homepage',
    'home': 'homepage',
    'index': 'homepage',
    'about': 'about',
    'aboutus': 'about',
    'aboutpage': 'about',
    'contact': 'contact',
    'contactus': 'contact',
    'contactpage': 'contact',
    'privacy': 'privacy',
    'privacypolicy': 'privacy',
    'privacypage': 'privacy',
    'terms': 'terms',
    'termsofservice': 'terms',
    'termsandconditions': 'terms',
    'tos': 'terms',
    'author': 'author',
    'authorpage': 'author',
    'team': 'author'
  };

  return typeMap[normalized] || null;
};

/**
 * Convert foundation pages response to FoundationPage objects ready for saving
 */
export const prepareFoundationPagesForSave = (
  response: GeneratedFoundationPagesResponse,
  mapId: string,
  userId: string,
  napData?: NAPData
): FoundationPage[] => {
  return response.foundationPages
    .map(page => {
      const validPageType = normalizePageType(page.page_type);

      if (!validPageType) {
        console.warn(`Invalid page_type "${page.page_type}" skipped - not in allowed types: ${VALID_PAGE_TYPES.join(', ')}`);
        return null;
      }

      return {
        id: uuidv4(),
        map_id: mapId,
        user_id: userId,
        page_type: validPageType,
        title: page.title,
        slug: page.slug,
        meta_description: page.meta_description,
        h1_template: page.h1_template,
        schema_type: page.schema_type,
        sections: page.sections,
        nap_data: napData,
        metadata: {}
      };
    })
    .filter((page): page is NonNullable<typeof page> => page !== null) as FoundationPage[];
};
