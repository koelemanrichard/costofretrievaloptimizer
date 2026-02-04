/**
 * Default Templates
 *
 * Built-in templates for each social media platform and post type.
 * These serve as starting points for social post generation.
 */

import type {
  SocialMediaPlatform,
  SocialTemplateType,
  SocialPostTemplate
} from '../../../types/social';

/**
 * Template definition for creation
 */
type TemplateDefinition = Omit<SocialPostTemplate, 'id' | 'user_id' | 'map_id' | 'created_at'>;

/**
 * Default templates organized by platform
 */
export const DEFAULT_TEMPLATES: TemplateDefinition[] = [
  // ============================================================================
  // LINKEDIN TEMPLATES
  // ============================================================================
  {
    platform: 'linkedin',
    template_name: 'Hub Announcement',
    template_type: 'hub_announcement',
    content_pattern: `{{hook}}

{{key_takeaways}}

{{cta}}

{{link}}

{{hashtags}}`,
    hashtag_strategy: {
      count: 5,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [
      'Read the full guide below ↓',
      'Dive deeper into the details ↓',
      'Get the complete breakdown ↓',
      'See the full analysis ↓'
    ],
    character_limits: {
      main: 3000,
      preview: 210
    },
    image_specs: {
      aspect_ratio: '1.91:1',
      width: 1200,
      height: 627,
      max_file_size_mb: 5,
      formats: ['jpg', 'png']
    },
    is_default: true
  },
  {
    platform: 'linkedin',
    template_name: 'Key Takeaway',
    template_type: 'key_takeaway',
    content_pattern: `When it comes to {{entity}}, here's what you need to know:

{{key_takeaway}}

This matters because understanding this can transform how you approach your work.

Read the full breakdown: {{link}}

{{hashtags}}`,
    hashtag_strategy: {
      count: 5,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [
      'Read the full breakdown',
      'Learn more',
      'Deep dive here'
    ],
    character_limits: {
      main: 3000,
      preview: 210
    },
    image_specs: {
      aspect_ratio: '1.91:1',
      width: 1200,
      height: 627,
      max_file_size_mb: 5,
      formats: ['jpg', 'png']
    },
    is_default: true
  },
  {
    platform: 'linkedin',
    template_name: 'Entity Spotlight',
    template_type: 'entity_spotlight',
    content_pattern: `{{entity}} {{attribute}} {{value}}.

This is a {{category}} fact that can change how you think about {{entity}}.

Deep dive: {{link}}

{{hashtags}}`,
    hashtag_strategy: {
      count: 5,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [
      'Deep dive',
      'Learn more about this',
      'Full breakdown'
    ],
    character_limits: {
      main: 3000,
      preview: 210
    },
    image_specs: {
      aspect_ratio: '1.91:1',
      width: 1200,
      height: 627,
      max_file_size_mb: 5,
      formats: ['jpg', 'png']
    },
    is_default: true
  },
  {
    platform: 'linkedin',
    template_name: 'Question Hook',
    template_type: 'question_hook',
    content_pattern: `{{hook}}

Most people get this wrong about {{entity}}.

Here's what the data actually shows:

{{key_takeaway}}

Full analysis: {{link}}

{{hashtags}}`,
    hashtag_strategy: {
      count: 5,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [
      'Full analysis',
      'See the data',
      'The complete picture'
    ],
    character_limits: {
      main: 3000,
      preview: 210
    },
    image_specs: {
      aspect_ratio: '1.91:1',
      width: 1200,
      height: 627,
      max_file_size_mb: 5,
      formats: ['jpg', 'png']
    },
    is_default: true
  },

  // ============================================================================
  // TWITTER TEMPLATES
  // ============================================================================
  {
    platform: 'twitter',
    template_name: 'Hub Thread',
    template_type: 'hub_announcement',
    content_pattern: `Everything you need to know about {{entity}}:

{{hashtags}}

🧵`,
    hashtag_strategy: {
      count: 2,
      placement: 'integrated',
      branded: [],
      niche: []
    },
    cta_templates: [
      'Full breakdown 👇',
      'More details 👇',
      'The complete story 👇'
    ],
    character_limits: {
      main: 280,
      thread_segment: 280
    },
    image_specs: {
      aspect_ratio: '1.91:1',
      width: 1200,
      height: 628,
      max_file_size_mb: 5,
      formats: ['jpg', 'png', 'gif']
    },
    is_default: true
  },
  {
    platform: 'twitter',
    template_name: 'Single Tweet',
    template_type: 'key_takeaway',
    content_pattern: `{{entity}}: {{key_takeaway}}

👇 {{link}}

{{hashtags}}`,
    hashtag_strategy: {
      count: 2,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [
      '👇',
      'More 👇',
      'Details 👇'
    ],
    character_limits: {
      main: 280
    },
    image_specs: {
      aspect_ratio: '1.91:1',
      width: 1200,
      height: 628,
      max_file_size_mb: 5,
      formats: ['jpg', 'png', 'gif']
    },
    is_default: true
  },
  {
    platform: 'twitter',
    template_name: 'Question Tweet',
    template_type: 'question_hook',
    content_pattern: `What's the biggest misconception about {{entity}}?

The answer might surprise you 👇

{{link}}

{{hashtags}}`,
    hashtag_strategy: {
      count: 2,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [],
    character_limits: {
      main: 280
    },
    image_specs: {
      aspect_ratio: '1.91:1',
      width: 1200,
      height: 628,
      max_file_size_mb: 5,
      formats: ['jpg', 'png', 'gif']
    },
    is_default: true
  },

  // ============================================================================
  // FACEBOOK TEMPLATES
  // ============================================================================
  {
    platform: 'facebook',
    template_name: 'Hub Post',
    template_type: 'hub_announcement',
    content_pattern: `Ever wondered about the truth behind {{entity}}? 🤔

{{key_takeaways}}

Read the full story 👉 {{link}}

{{hashtags}}`,
    hashtag_strategy: {
      count: 3,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [
      'Read the full story 👉',
      'Get the complete guide 👉',
      'Learn more 👉'
    ],
    character_limits: {
      main: 63206,
      preview: 80
    },
    image_specs: {
      aspect_ratio: '1.91:1',
      width: 1200,
      height: 628,
      max_file_size_mb: 4,
      formats: ['jpg', 'png']
    },
    is_default: true
  },
  {
    platform: 'facebook',
    template_name: 'Engagement Question',
    template_type: 'question_hook',
    content_pattern: `What's your biggest question about {{entity}}?

Drop your thoughts in the comments! 👇

Then check out what we found: {{link}}

{{hashtags}}`,
    hashtag_strategy: {
      count: 3,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [
      'Drop your thoughts in the comments! 👇',
      'Tell us in the comments!',
      'Share your experience below!'
    ],
    character_limits: {
      main: 63206,
      preview: 80
    },
    image_specs: {
      aspect_ratio: '1.91:1',
      width: 1200,
      height: 628,
      max_file_size_mb: 4,
      formats: ['jpg', 'png']
    },
    is_default: true
  },

  // ============================================================================
  // INSTAGRAM TEMPLATES
  // ============================================================================
  {
    platform: 'instagram',
    template_name: 'Carousel Hub',
    template_type: 'hub_announcement',
    content_pattern: `{{entity}} explained in slides 📚

Swipe through to learn:
{{key_takeaways}}

💡 Save this post for later!
🔗 Full guide linked in bio

.
.
.

{{hashtags}}`,
    hashtag_strategy: {
      count: 5,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [
      '💡 Save this post for later!',
      '💾 Bookmark this for reference!',
      '📌 Save for later!'
    ],
    character_limits: {
      main: 2200,
      preview: 125
    },
    image_specs: {
      aspect_ratio: '4:5',
      width: 1080,
      height: 1350,
      max_file_size_mb: 8,
      formats: ['jpg', 'png']
    },
    is_default: true
  },
  {
    platform: 'instagram',
    template_name: 'Single Post',
    template_type: 'key_takeaway',
    content_pattern: `📌 {{key_takeaway}}

Double tap if you found this helpful!

🔗 More insights in bio

.
.
.

{{hashtags}}`,
    hashtag_strategy: {
      count: 5,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [
      'Double tap if you found this helpful!',
      'Like if you agree!',
      'Save this for later!'
    ],
    character_limits: {
      main: 2200,
      preview: 125
    },
    image_specs: {
      aspect_ratio: '4:5',
      width: 1080,
      height: 1350,
      max_file_size_mb: 8,
      formats: ['jpg', 'png']
    },
    is_default: true
  },
  {
    platform: 'instagram',
    template_name: 'Listicle',
    template_type: 'listicle',
    content_pattern: `{{count}} things to know about {{entity}}:

{{numbered_takeaways}}

💡 Save for later
🔗 Full breakdown in bio

.
.
.

{{hashtags}}`,
    hashtag_strategy: {
      count: 5,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [
      '💡 Save for later',
      '📌 Bookmark this!',
      '💾 Save this post!'
    ],
    character_limits: {
      main: 2200,
      preview: 125
    },
    image_specs: {
      aspect_ratio: '4:5',
      width: 1080,
      height: 1350,
      max_file_size_mb: 8,
      formats: ['jpg', 'png']
    },
    is_default: true
  },

  // ============================================================================
  // PINTEREST TEMPLATES
  // ============================================================================
  {
    platform: 'pinterest',
    template_name: 'Guide Pin',
    template_type: 'hub_announcement',
    content_pattern: `{{title}}

Learn everything you need to know about {{entity}}. {{key_takeaways}}

{{keywords}}`,
    hashtag_strategy: {
      count: 0,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [],
    character_limits: {
      main: 500,
      preview: 100
    },
    image_specs: {
      aspect_ratio: '2:3',
      width: 1000,
      height: 1500,
      max_file_size_mb: 32,
      formats: ['jpg', 'png']
    },
    is_default: true
  },
  {
    platform: 'pinterest',
    template_name: 'Tip Pin',
    template_type: 'tip_series',
    content_pattern: `{{title}}

{{numbered_tips}}

{{keywords}}`,
    hashtag_strategy: {
      count: 0,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [],
    character_limits: {
      main: 500,
      preview: 100
    },
    image_specs: {
      aspect_ratio: '2:3',
      width: 1000,
      height: 1500,
      max_file_size_mb: 32,
      formats: ['jpg', 'png']
    },
    is_default: true
  },
  {
    platform: 'pinterest',
    template_name: 'Entity Pin',
    template_type: 'entity_spotlight',
    content_pattern: `{{entity}}: {{attribute}}

{{value}}

This is a {{category}} fact for anyone interested in {{entity}}.

{{keywords}}`,
    hashtag_strategy: {
      count: 0,
      placement: 'end',
      branded: [],
      niche: []
    },
    cta_templates: [],
    character_limits: {
      main: 500,
      preview: 100
    },
    image_specs: {
      aspect_ratio: '2:3',
      width: 1000,
      height: 1500,
      max_file_size_mb: 32,
      formats: ['jpg', 'png']
    },
    is_default: true
  }
];

/**
 * Get default templates for a platform
 */
export function getDefaultTemplatesForPlatform(
  platform: SocialMediaPlatform
): TemplateDefinition[] {
  return DEFAULT_TEMPLATES.filter(t => t.platform === platform);
}

/**
 * Get default template by type
 */
export function getDefaultTemplate(
  platform: SocialMediaPlatform,
  templateType: SocialTemplateType
): TemplateDefinition | undefined {
  return DEFAULT_TEMPLATES.find(
    t => t.platform === platform && t.template_type === templateType
  );
}

/**
 * Get all default template types for a platform
 */
export function getAvailableTemplateTypes(
  platform: SocialMediaPlatform
): SocialTemplateType[] {
  return [...new Set(
    DEFAULT_TEMPLATES
      .filter(t => t.platform === platform)
      .map(t => t.template_type)
  )];
}

/**
 * Get all default templates as SocialPostTemplate objects
 */
export function getDefaultTemplates(): SocialPostTemplate[] {
  return DEFAULT_TEMPLATES.map(def => ({
    id: `default-${def.platform}-${def.template_type}`,
    user_id: 'system',
    platform: def.platform,
    template_name: def.template_name,
    template_type: def.template_type,
    content_pattern: def.content_pattern,
    hashtag_strategy: def.hashtag_strategy,
    cta_templates: def.cta_templates,
    character_limits: def.character_limits,
    image_specs: def.image_specs,
    is_default: true,
    created_at: new Date().toISOString(),
  }));
}

/**
 * Template placeholder definitions
 */
export const TEMPLATE_PLACEHOLDERS = {
  title: 'Article title',
  entity: 'Primary entity name',
  attribute: 'EAV attribute',
  value: 'EAV value',
  category: 'EAV category (UNIQUE/RARE/ROOT/COMMON)',
  key_takeaway: 'Single key takeaway',
  key_takeaways: 'Multiple key takeaways formatted as list',
  numbered_takeaways: 'Numbered key takeaways',
  numbered_tips: 'Numbered tips list',
  hook: 'Attention-grabbing opening',
  cta: 'Call to action',
  hashtags: 'Platform-appropriate hashtags',
  keywords: 'Pinterest SEO keywords',
  link: 'Article link with UTM',
  count: 'Number of items'
};
