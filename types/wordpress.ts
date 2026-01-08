// types/wordpress.ts
// WordPress integration types for content publishing and analytics

// ============================================================================
// Connection Types
// ============================================================================

export type WordPressConnectionStatus = 'pending' | 'verified' | 'error' | 'disconnected';

export interface WordPressConnection {
  id: string;
  user_id: string;
  project_id?: string;

  // Connection details
  site_url: string;
  site_name?: string;
  api_username: string;
  // Note: api_password_encrypted is not exposed to frontend

  // Plugin verification
  plugin_version?: string;
  plugin_verified_at?: string;

  // Status
  status: WordPressConnectionStatus;
  last_sync_at?: string;
  last_error?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface WordPressConnectionInput {
  site_url: string;
  site_name?: string;
  api_username: string;
  api_password: string; // Plain text, will be encrypted on server
  project_id?: string;
}

// ============================================================================
// Publication Types
// ============================================================================

export type PublicationStatus =
  | 'draft'           // Pushed as WP draft
  | 'pending_review'  // Awaiting approval in WP
  | 'scheduled'       // Scheduled for future
  | 'published'       // Live on site
  | 'unpublished'     // Was published, now draft
  | 'trashed';        // In WP trash

export interface WordPressPublication {
  id: string;
  connection_id: string;
  topic_id: string;
  brief_id?: string;

  // WordPress post reference
  wp_post_id: number;
  wp_post_url?: string;
  wp_post_slug?: string;

  // Publication status
  status: PublicationStatus;

  // Scheduling
  scheduled_at?: string;
  published_at?: string;

  // Version tracking
  app_version_hash?: string;
  wp_version_hash?: string;
  has_wp_changes: boolean;

  // Sync metadata
  last_pushed_at?: string;
  last_pulled_at?: string;
  last_sync_status?: string;

  created_at: string;
  updated_at: string;
}

export interface PublishOptions {
  status: 'draft' | 'publish' | 'pending' | 'future';
  scheduled_at?: string;
  categories?: number[];
  tags?: number[];  // WordPress tag IDs
  featured_image_id?: number;
  yoast_meta?: {
    focus_keyword?: string;
    meta_description?: string;
  };
  rankmath_meta?: {
    focus_keyword?: string;
    meta_description?: string;
  };
}

// ============================================================================
// Media Types
// ============================================================================

export type WordPressMediaType = 'hero' | 'section' | 'infographic' | 'diagram' | 'schema';

export interface WordPressMedia {
  id: string;
  connection_id: string;
  publication_id?: string;

  // App-side image reference
  app_image_url?: string;
  image_type?: WordPressMediaType;
  placeholder_id?: string;

  // WordPress media reference
  wp_media_id: number;
  wp_media_url: string;
  wp_thumbnail_url?: string;

  // Metadata
  alt_text?: string;
  caption?: string;
  width?: number;
  height?: number;
  file_size?: number;
  mime_type?: string;

  created_at: string;
}

export interface MediaUploadInput {
  file_url: string;      // URL to fetch the image from (Cloudinary)
  filename: string;
  alt_text?: string;
  caption?: string;
  image_type?: WordPressMediaType;
  placeholder_id?: string;
}

export interface MediaUploadResult {
  wp_media_id: number;
  wp_media_url: string;
  wp_thumbnail_url?: string;
  width?: number;
  height?: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface WordPressAnalytics {
  id: string;
  publication_id: string;
  date: string;

  // WordPress stats
  wp_views: number;
  wp_visitors: number;
  wp_comments: number;

  // GSC data
  gsc_impressions: number;
  gsc_clicks: number;
  gsc_ctr?: number;
  gsc_position?: number;
  gsc_queries?: GscQueryData[];

  created_at: string;
}

export interface GscQueryData {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface AggregatedAnalytics {
  total_views: number;
  total_visitors: number;
  total_comments: number;
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number;
  avg_position: number;
  top_queries: GscQueryData[];
  daily_data: WordPressAnalytics[];
}

// ============================================================================
// History Types
// ============================================================================

export type PublicationAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'media_added'
  | 'pulled'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'unpublished'
  | 'deleted';

export type PublicationTrigger = 'user' | 'sync' | 'webhook' | 'schedule';

export interface PublicationHistoryEntry {
  id: string;
  publication_id: string;
  action: PublicationAction;
  previous_status?: string;
  new_status?: string;
  content_diff_summary?: string;
  triggered_by?: PublicationTrigger;
  app_content_snapshot?: string;
  wp_content_snapshot?: string;
  created_at: string;
}

// ============================================================================
// Conflict Types
// ============================================================================

export interface ConflictReport {
  publication_id: string;
  detected_at: string;

  app_version: {
    hash: string;
    last_modified: string;
    word_count: number;
    content_preview?: string;
  };

  wp_version: {
    hash: string;
    last_modified: string;
    word_count: number;
    modified_by?: string;
    content_preview?: string;
  };

  diff_summary: {
    sections_changed: number;
    words_added: number;
    words_removed: number;
  };
}

export type ConflictResolution = 'keep_app' | 'keep_wp' | 'merge';

// ============================================================================
// WordPress REST API Types
// ============================================================================

export interface WpPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private' | 'trash';
  type: string;
  link: string;
  title: {
    rendered: string;
    raw?: string;
  };
  content: {
    rendered: string;
    raw?: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    raw?: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  meta: Record<string, unknown>;
  yoast_head_json?: YoastMeta;
  rank_math_meta?: RankMathMeta;
}

export interface WpCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

export interface WpTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WpMedia {
  id: number;
  date: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  alt_text: string;
  caption: {
    rendered: string;
  };
  source_url: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    sizes?: Record<string, {
      file: string;
      width: number;
      height: number;
      source_url: string;
    }>;
  };
}

export interface YoastMeta {
  title?: string;
  description?: string;
  robots?: {
    index?: string;
    follow?: string;
  };
  canonical?: string;
  og_title?: string;
  og_description?: string;
  og_image?: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  twitter_card?: string;
  twitter_title?: string;
  twitter_description?: string;
  schema?: Record<string, unknown>;
}

export interface RankMathMeta {
  focus_keyword?: string;
  title?: string;
  description?: string;
  robots?: string[];
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  twitter_title?: string;
  twitter_description?: string;
}

// ============================================================================
// Plugin Verification Types
// ============================================================================

export interface PluginVerificationResponse {
  verified: boolean;
  plugin_version: string;
  site_id: string;
  hmac_secret: string;  // Only returned on first verification
  capabilities: string[];
  seo_plugin?: 'yoast' | 'rankmath' | 'none';
  gsc_connected?: boolean;
}

export interface PluginVerificationRequest {
  app_version: string;
  verify_token: string;  // One-time token for initial handshake
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreatePostRequest {
  title: string;
  content: string;
  status: 'draft' | 'publish' | 'pending' | 'future';
  date?: string;  // ISO date for scheduling
  slug?: string;
  excerpt?: string;
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  meta?: Record<string, unknown>;
  // Custom fields for our plugin
  cutthecrap_topic_id?: string;
  cutthecrap_brief_id?: string;
  cutthecrap_version_hash?: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  status?: 'draft' | 'publish' | 'pending' | 'future' | 'trash';
  date?: string;
  slug?: string;
  excerpt?: string;
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  meta?: Record<string, unknown>;
  cutthecrap_version_hash?: string;
}

export interface BulkStatusRequest {
  post_ids: number[];
}

export interface BulkStatusResponse {
  posts: Array<{
    id: number;
    status: string;
    modified: string;
    content_hash: string;
  }>;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface PublishModalState {
  isOpen: boolean;
  topic_id?: string;
  connection_id?: string;
  mode: 'create' | 'update';
}

export interface ConnectionModalState {
  isOpen: boolean;
  mode: 'add' | 'edit';
  connection_id?: string;
}

export interface ConflictModalState {
  isOpen: boolean;
  conflict?: ConflictReport;
  publication_id?: string;
}

// ============================================================================
// Topic Publication Status (for dashboard display)
// ============================================================================

export interface TopicPublicationInfo {
  topic_id: string;
  publications: Array<{
    connection_id: string;
    site_url: string;
    site_name?: string;
    wp_post_id: number;
    wp_post_url?: string;
    status: PublicationStatus;
    published_at?: string;
    has_wp_changes: boolean;
    last_pushed_at?: string;
  }>;
}

// ============================================================================
// Content Calendar Types
// ============================================================================

export interface CalendarEntry {
  topic_id: string;
  topic_title: string;
  date: string;  // ISO date
  type: 'published' | 'scheduled' | 'draft' | 'planned';
  publication?: {
    connection_id: string;
    site_url: string;
    wp_post_url?: string;
    status: PublicationStatus;
  };
}

export interface CalendarView {
  month: number;  // 1-12
  year: number;
  entries: CalendarEntry[];
}
