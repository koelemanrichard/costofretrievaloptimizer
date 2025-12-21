/**
 * Navigation Types Module
 *
 * Contains navigation and foundation page types including:
 * - FoundationPage: Core site pages (About, Contact, etc.)
 * - NavigationStructure: Header/footer navigation config
 * - NavigationLink: Individual navigation links
 * - NAPData: Name, Address, Phone for E-A-T
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/navigation
 */

// ============================================================================
// FOUNDATION PAGE TYPES
// ============================================================================

/**
 * Foundation page type
 */
export type FoundationPageType =
  | 'homepage'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'author';

/**
 * Foundation page section specification
 */
export interface FoundationPageSection {
  heading: string;
  purpose?: string;
  required?: boolean;
  content_type?: 'text' | 'team_grid' | 'faq' | 'contact_form' | 'map' | 'list';
  order?: number;
}

/**
 * Office location for multi-location support
 */
export interface OfficeLocation {
  id: string;
  name: string;                    // e.g., "Headquarters", "Amsterdam Office"
  is_headquarters: boolean;
  address: string;
  city?: string;
  country?: string;                // ISO code: "NL", "US", "DE"
  phone: string;
  email?: string;
}

/**
 * NAP (Name, Address, Phone) data for E-A-T
 */
export interface NAPData {
  company_name: string;
  // Primary location fields (backward compatible)
  address: string;
  phone: string;
  email: string;
  founded_year?: string;
  // Multi-location support
  locations?: OfficeLocation[];
}

/**
 * Foundation page specification
 */
export interface FoundationPage {
  id: string;
  map_id: string;
  user_id?: string;
  page_type: FoundationPageType;
  title: string;
  slug: string;
  meta_description?: string;
  h1_template?: string;
  schema_type?: 'Organization' | 'AboutPage' | 'ContactPage' | 'WebPage';

  // Content structure hints
  sections?: FoundationPageSection[];

  // E-A-T fields (for about/contact)
  nap_data?: NAPData;

  // Soft delete support
  deleted_at?: string | null;
  deletion_reason?: 'user_deleted' | 'not_needed';

  // Publication status
  status?: 'draft' | 'published';

  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

/**
 * Navigation link definition
 */
export interface NavigationLink {
  id?: string;
  text: string;
  target_topic_id?: string;
  target_foundation_page_id?: string;
  external_url?: string;
  prominence: 'high' | 'medium' | 'low';
  order?: number;
}

/**
 * Footer section with heading
 */
export interface FooterSection {
  id?: string;
  heading: string;  // Will use H4/H5
  links: NavigationLink[];
}

/**
 * Navigation structure for header and footer
 */
export interface NavigationStructure {
  id: string;
  map_id: string;

  // Header configuration
  header: {
    logo_alt_text: string;
    primary_nav: NavigationLink[];
    cta_button?: {
      text: string;
      target_topic_id?: string;
      target_foundation_page_id?: string;
      url?: string;
    };
  };

  // Footer configuration
  footer: {
    sections: FooterSection[];
    legal_links: NavigationLink[];  // Privacy, Terms
    nap_display: boolean;
    copyright_text: string;
  };

  // Boilerplate rules
  max_header_links: number;  // Default: 10
  max_footer_links: number;  // Default: 30
  dynamic_by_section: boolean;  // Change nav based on topic_class

  // Sticky header behavior
  sticky?: boolean;

  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Navigation sync status - tracks changes between topical map and navigation
 */
export interface NavigationSyncStatus {
  map_id: string;
  lastSyncedAt: string;
  topicsModifiedSince: number;  // Count of changes since last sync
  requiresReview: boolean;
  pendingChanges: {
    addedTopics: string[];
    deletedTopics: string[];
    renamedTopics: { id: string; oldTitle: string; newTitle: string }[];
  };
}

// ============================================================================
// FOUNDATION PAGE GENERATION
// ============================================================================

/**
 * Foundation page generation result
 */
export interface FoundationPageGenerationResult {
  foundationPages: Omit<FoundationPage, 'id' | 'map_id' | 'user_id' | 'created_at'>[];
  napSuggestion: NAPData;
}

/**
 * Non-blocking notification for foundation pages
 */
export interface FoundationNotification {
  id: string;
  type: 'info' | 'warning';  // Never 'error' for missing pages
  message: string;
  dismissable: boolean;
  showOnce: boolean;
  dismissed?: boolean;
  dismissedAt?: string;
  action?: {
    label: string;
    actionType: 'add_page' | 'configure_nav' | 'run_audit';
    targetPageType?: FoundationPageType;
  };
}

// ============================================================================
// SITEMAP TYPES
// ============================================================================

/**
 * Sitemap node for hierarchical view
 */
export interface SitemapNode {
  id: string;
  type: 'foundation' | 'core' | 'outer';
  title: string;
  slug: string;
  children?: SitemapNode[];
}

// Forward declaration for EnrichedTopic to avoid circular dependency
interface EnrichedTopicRef {
  id: string;
  title: string;
  slug: string;
}

/**
 * Computed sitemap view (not stored, generated from topics + foundation pages)
 */
export interface SitemapView {
  foundationPages: FoundationPage[];
  coreTopics: EnrichedTopicRef[];
  outerTopics: EnrichedTopicRef[];
  totalUrls: number;
  hierarchicalView: SitemapNode[];
}

// ============================================================================
// INTERNAL LINKING RULES
// ============================================================================

/**
 * Internal linking rules configuration
 */
export interface InternalLinkingRules {
  maxLinksPerPage: number;           // Default: 150
  maxAnchorRepetitionPerTarget: number; // Default: 3
  requireAnnotationText: boolean;    // Require context around anchors
  forbidFirstSentenceLinks: boolean; // Links before entity defined
  genericAnchorsToAvoid: string[];   // "click here", "read more", etc.
  qualityNodeThreshold: number;      // Score threshold (0-100)
}

/**
 * Default internal linking rules
 */
export const DEFAULT_INTERNAL_LINKING_RULES: InternalLinkingRules = {
  maxLinksPerPage: 150,
  maxAnchorRepetitionPerTarget: 3,
  requireAnnotationText: true,
  forbidFirstSentenceLinks: true,
  genericAnchorsToAvoid: ['click here', 'read more', 'learn more', 'this article', 'here'],
  qualityNodeThreshold: 70
};
