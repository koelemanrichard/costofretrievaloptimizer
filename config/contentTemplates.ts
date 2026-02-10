/**
 * Content Templates Configuration
 *
 * Defines 12 content templates for different website types and content purposes.
 * Each template specifies section structure, format codes, attribute ordering,
 * and stylometry settings for optimal content generation.
 *
 * @module config/contentTemplates
 */

import { TemplateConfig, TemplateName, Stylometry } from '../types/contentTemplates';
import { FormatCode, ContentZone } from '../types/content';
import { AttributeCategory } from '../types/semantic';
import { WebsiteType } from '../types';

// ============================================================================
// CONTENT TEMPLATES
// ============================================================================

/**
 * Complete collection of content templates
 * 12 templates covering all major content types and website purposes
 */
export const CONTENT_TEMPLATES: Record<TemplateName, TemplateConfig> = {
  // ============================================================================
  // DEFINITIONAL - For informational/educational content
  // ============================================================================
  DEFINITIONAL: {
    templateName: 'DEFINITIONAL',
    label: 'Definitional Article',
    description: 'Educational content defining concepts, terms, or entities',
    sectionStructure: [
      {
        headingPattern: 'What is {entity}?',
        formatCode: FormatCode.FS,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Key Features of {entity}',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 2,
      },
      {
        headingPattern: 'How {entity} Works',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 3,
      },
      {
        headingPattern: 'Types of {entity}',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 4,
      },
      {
        headingPattern: 'Benefits of {entity}',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 5,
      },
      {
        headingPattern: 'Common Questions About {entity}',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 6,
      },
    ],
    formatCodeDefaults: {
      definition: FormatCode.FS,
      features: FormatCode.LISTING,
      explanation: FormatCode.PROSE,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 8,
    minSections: 3,
    csiPredicates: ['defines', 'explains', 'describes', 'clarifies'],
    stylometry: 'ACADEMIC_FORMAL',
  },

  // ============================================================================
  // PROCESS_HOWTO - For step-by-step guides
  // ============================================================================
  PROCESS_HOWTO: {
    templateName: 'PROCESS_HOWTO',
    label: 'How-To Guide',
    description: 'Step-by-step process guides and tutorials',
    sectionStructure: [
      {
        headingPattern: 'How to {entity}: Overview',
        formatCode: FormatCode.FS,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Prerequisites for {entity}',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 2,
      },
      {
        headingPattern: 'Step-by-Step Guide to {entity}',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 3,
      },
      {
        headingPattern: 'Tips for {entity}',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 4,
      },
      {
        headingPattern: 'Common Mistakes to Avoid',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 5,
      },
      {
        headingPattern: 'FAQ About {entity}',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 6,
      },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      steps: FormatCode.LISTING,
      tips: FormatCode.LISTING,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 10,
    minSections: 3,
    csiPredicates: ['guides', 'demonstrates', 'teaches', 'shows'],
    stylometry: 'INSTRUCTIONAL_CLEAR',
  },

  // ============================================================================
  // ECOMMERCE_PRODUCT - For product pages
  // ============================================================================
  ECOMMERCE_PRODUCT: {
    templateName: 'ECOMMERCE_PRODUCT',
    label: 'E-commerce Product',
    description: 'Product pages with specs, features, and buying guidance',
    sectionStructure: [
      {
        headingPattern: '{entity} Overview',
        formatCode: FormatCode.FS,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Key Features',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 2,
      },
      {
        headingPattern: 'Technical Specifications',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 3,
      },
      {
        headingPattern: 'Benefits of {entity}',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 4,
      },
      {
        headingPattern: 'Who Is {entity} Best For?',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 5,
      },
      {
        headingPattern: 'Frequently Asked Questions',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 6,
      },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      features: FormatCode.LISTING,
      specifications: FormatCode.TABLE,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 8,
    minSections: 4,
    csiPredicates: ['features', 'includes', 'offers', 'provides'],
    stylometry: 'PERSUASIVE_SALES',
  },

  // ============================================================================
  // COMPARISON - For comparison and versus articles
  // ============================================================================
  COMPARISON: {
    templateName: 'COMPARISON',
    label: 'Comparison Article',
    description: 'Side-by-side comparison of products, services, or concepts',
    sectionStructure: [
      {
        headingPattern: '{entity} Comparison Overview',
        formatCode: FormatCode.FS,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Key Differences at a Glance',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 2,
      },
      {
        headingPattern: 'Feature-by-Feature Comparison',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 3,
      },
      {
        headingPattern: 'Pros and Cons',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 4,
      },
      {
        headingPattern: 'Which Should You Choose?',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 5,
      },
      {
        headingPattern: 'Common Questions',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 6,
      },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      comparison: FormatCode.TABLE,
      analysis: FormatCode.PROSE,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 8,
    minSections: 4,
    csiPredicates: ['compares', 'contrasts', 'evaluates', 'analyzes'],
    stylometry: 'DIRECT_TECHNICAL',
  },

  // ============================================================================
  // HEALTHCARE_YMYL - For health/medical content (YMYL)
  // ============================================================================
  HEALTHCARE_YMYL: {
    templateName: 'HEALTHCARE_YMYL',
    label: 'Healthcare YMYL',
    description: 'Medical/health content with E-E-A-T considerations',
    sectionStructure: [
      {
        headingPattern: 'What is {entity}?',
        formatCode: FormatCode.DEFINITIVE,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Symptoms and Signs',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 2,
      },
      {
        headingPattern: 'Causes and Risk Factors',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 3,
      },
      {
        headingPattern: 'Diagnosis and Testing',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 4,
      },
      {
        headingPattern: 'Treatment Options',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 5,
      },
      {
        headingPattern: 'Prevention',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 6,
      },
      {
        headingPattern: 'When to See a Doctor',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 7,
      },
      {
        headingPattern: 'Frequently Asked Questions',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 8,
      },
    ],
    formatCodeDefaults: {
      definition: FormatCode.DEFINITIVE,
      symptoms: FormatCode.LISTING,
      treatment: FormatCode.LISTING,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 10,
    minSections: 5,
    csiPredicates: ['diagnoses', 'treats', 'prevents', 'manages'],
    stylometry: 'ACADEMIC_FORMAL',
  },

  // ============================================================================
  // SAAS_FEATURE - For SaaS product features
  // ============================================================================
  SAAS_FEATURE: {
    templateName: 'SAAS_FEATURE',
    label: 'SaaS Feature Page',
    description: 'Software feature pages with use cases and integrations',
    sectionStructure: [
      {
        headingPattern: '{entity}: Feature Overview',
        formatCode: FormatCode.FS,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Key Capabilities',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 2,
      },
      {
        headingPattern: 'Use Cases',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 3,
      },
      {
        headingPattern: 'How It Works',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 4,
      },
      {
        headingPattern: 'Integrations',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 5,
      },
      {
        headingPattern: 'Pricing and Plans',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 6,
      },
      {
        headingPattern: 'FAQ',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 7,
      },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      capabilities: FormatCode.LISTING,
      pricing: FormatCode.TABLE,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 9,
    minSections: 4,
    csiPredicates: ['enables', 'automates', 'streamlines', 'integrates'],
    stylometry: 'DIRECT_TECHNICAL',
  },

  // ============================================================================
  // NEWS_ARTICLE - For news and current events
  // ============================================================================
  NEWS_ARTICLE: {
    templateName: 'NEWS_ARTICLE',
    label: 'News Article',
    description: 'News and current events coverage',
    sectionStructure: [
      {
        headingPattern: '{entity}: Breaking News',
        formatCode: FormatCode.FS,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Key Developments',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 2,
      },
      {
        headingPattern: 'Background',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 3,
      },
      {
        headingPattern: 'Expert Analysis',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 4,
      },
      {
        headingPattern: 'Timeline of Events',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 5,
      },
      {
        headingPattern: "What's Next",
        formatCode: FormatCode.PROSE,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 6,
      },
    ],
    formatCodeDefaults: {
      news: FormatCode.FS,
      timeline: FormatCode.LISTING,
      analysis: FormatCode.PROSE,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 8,
    minSections: 3,
    csiPredicates: ['reports', 'announces', 'reveals', 'updates'],
    stylometry: 'DIRECT_TECHNICAL',
  },

  // ============================================================================
  // LISTING_DIRECTORY - For list and directory pages
  // ============================================================================
  LISTING_DIRECTORY: {
    templateName: 'LISTING_DIRECTORY',
    label: 'Listing/Directory',
    description: 'List articles and directory-style content',
    sectionStructure: [
      {
        headingPattern: 'Best {entity}: Overview',
        formatCode: FormatCode.FS,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Selection Criteria',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 2,
      },
      {
        headingPattern: 'Top {entity} List',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 3,
      },
      {
        headingPattern: 'Comparison Table',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 4,
      },
      {
        headingPattern: 'How to Choose',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 5,
      },
      {
        headingPattern: 'FAQ',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 6,
      },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      list: FormatCode.LISTING,
      comparison: FormatCode.TABLE,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 8,
    minSections: 3,
    csiPredicates: ['lists', 'ranks', 'reviews', 'recommends'],
    stylometry: 'DIRECT_TECHNICAL',
  },

  // ============================================================================
  // EVENT_EXPERIENCE - For events and experiences
  // ============================================================================
  EVENT_EXPERIENCE: {
    templateName: 'EVENT_EXPERIENCE',
    label: 'Event/Experience',
    description: 'Events, experiences, and venue content',
    sectionStructure: [
      {
        headingPattern: '{entity}: Event Overview',
        formatCode: FormatCode.FS,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Event Details',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 2,
      },
      {
        headingPattern: 'What to Expect',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 3,
      },
      {
        headingPattern: 'Schedule and Agenda',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 4,
      },
      {
        headingPattern: 'Getting There',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 5,
      },
      {
        headingPattern: 'Tips for Attendees',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 6,
      },
      {
        headingPattern: 'FAQ',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 7,
      },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      details: FormatCode.TABLE,
      expectations: FormatCode.LISTING,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 9,
    minSections: 4,
    csiPredicates: ['hosts', 'features', 'presents', 'showcases'],
    stylometry: 'PERSUASIVE_SALES',
  },

  // ============================================================================
  // COURSE_EDUCATION - For educational courses and learning
  // ============================================================================
  COURSE_EDUCATION: {
    templateName: 'COURSE_EDUCATION',
    label: 'Course/Education',
    description: 'Educational courses, certifications, and learning content',
    sectionStructure: [
      {
        headingPattern: '{entity}: Course Overview',
        formatCode: FormatCode.FS,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'What You Will Learn',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 2,
      },
      {
        headingPattern: 'Course Curriculum',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 3,
      },
      {
        headingPattern: 'Prerequisites',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 4,
      },
      {
        headingPattern: 'Instructor Information',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 5,
      },
      {
        headingPattern: 'Pricing and Enrollment',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 6,
      },
      {
        headingPattern: 'Student Reviews',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 7,
      },
      {
        headingPattern: 'FAQ',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 8,
      },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      curriculum: FormatCode.LISTING,
      pricing: FormatCode.TABLE,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 10,
    minSections: 4,
    csiPredicates: ['teaches', 'covers', 'certifies', 'prepares'],
    stylometry: 'INSTRUCTIONAL_CLEAR',
  },

  // ============================================================================
  // IMPACT_NONPROFIT - For nonprofit and impact organizations
  // ============================================================================
  IMPACT_NONPROFIT: {
    templateName: 'IMPACT_NONPROFIT',
    label: 'Nonprofit/Impact',
    description: 'Nonprofit organizations and social impact content',
    sectionStructure: [
      {
        headingPattern: 'About {entity}',
        formatCode: FormatCode.FS,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Our Mission',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 2,
      },
      {
        headingPattern: 'Programs and Initiatives',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 3,
      },
      {
        headingPattern: 'Impact and Results',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 4,
      },
      {
        headingPattern: 'How to Get Involved',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 5,
      },
      {
        headingPattern: 'Donate',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 6,
      },
      {
        headingPattern: 'FAQ',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 7,
      },
    ],
    formatCodeDefaults: {
      about: FormatCode.FS,
      mission: FormatCode.PROSE,
      impact: FormatCode.TABLE,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 9,
    minSections: 4,
    csiPredicates: ['supports', 'empowers', 'advocates', 'transforms'],
    stylometry: 'PERSUASIVE_SALES',
  },

  // ============================================================================
  // ECOMMERCE_CATEGORY - For ecommerce category/collection pages
  // ============================================================================
  ECOMMERCE_CATEGORY: {
    templateName: 'ECOMMERCE_CATEGORY',
    label: 'E-commerce Category Page',
    description: 'Category page content with product data, buying guides, and comparison tables',
    sectionStructure: [
      {
        headingPattern: '{entity}: Category Overview',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Top {entity} Picks',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 2,
      },
      {
        headingPattern: 'How to Choose the Right {entity}',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 3,
      },
      {
        headingPattern: '{entity} Comparison',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 4,
      },
      {
        headingPattern: 'Frequently Asked Questions',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 5,
      },
      {
        headingPattern: 'Related Categories',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 6,
      },
    ],
    formatCodeDefaults: {
      overview: FormatCode.PROSE,
      picks: FormatCode.LISTING,
      guide: FormatCode.PROSE,
      comparison: FormatCode.TABLE,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 8,
    minSections: 4,
    csiPredicates: ['features', 'compares', 'recommends', 'includes'],
    stylometry: 'PERSUASIVE_SALES',
  },

  // ============================================================================
  // LOCATION_REALESTATE - For real estate and location-based content
  // ============================================================================
  LOCATION_REALESTATE: {
    templateName: 'LOCATION_REALESTATE',
    label: 'Real Estate/Location',
    description: 'Real estate listings and location-based content',
    sectionStructure: [
      {
        headingPattern: '{entity}: Property Overview',
        formatCode: FormatCode.FS,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 1,
      },
      {
        headingPattern: 'Property Details',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 2,
      },
      {
        headingPattern: 'Features and Amenities',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'CORE_DEFINITION',
        contentZone: ContentZone.MAIN,
        required: true,
        order: 3,
      },
      {
        headingPattern: 'Neighborhood Information',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 4,
      },
      {
        headingPattern: 'Nearby Attractions',
        formatCode: FormatCode.LISTING,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 5,
      },
      {
        headingPattern: 'Schools and Transportation',
        formatCode: FormatCode.TABLE,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 6,
      },
      {
        headingPattern: 'Contact Information',
        formatCode: FormatCode.PROSE,
        attributeCategory: 'COMPETITIVE_EXPANSION',
        contentZone: ContentZone.MAIN,
        required: false,
        order: 7,
      },
      {
        headingPattern: 'FAQ',
        formatCode: FormatCode.PAA,
        attributeCategory: 'SEARCH_DEMAND',
        contentZone: ContentZone.SUPPLEMENTARY,
        required: false,
        order: 8,
      },
    ],
    formatCodeDefaults: {
      overview: FormatCode.FS,
      details: FormatCode.TABLE,
      features: FormatCode.LISTING,
    },
    attributeOrderOverride: ['CORE_DEFINITION', 'SEARCH_DEMAND', 'COMPETITIVE_EXPANSION'],
    maxSections: 10,
    minSections: 4,
    csiPredicates: ['features', 'includes', 'offers', 'provides'],
    stylometry: 'PERSUASIVE_SALES',
  },
};

// ============================================================================
// WEBSITE TYPE TO TEMPLATE MAPPING
// ============================================================================

/**
 * Maps website types to their default content templates
 * Covers all 17 website types defined in WebsiteType
 */
export const WEBSITE_TYPE_TEMPLATE_MAP: Record<WebsiteType, TemplateName> = {
  // Commercial/Transactional
  ECOMMERCE: 'ECOMMERCE_PRODUCT',
  SAAS: 'SAAS_FEATURE',
  MARKETPLACE: 'LISTING_DIRECTORY',

  // Service-based
  SERVICE_B2B: 'SAAS_FEATURE',
  LEAD_GENERATION: 'SAAS_FEATURE',

  // Informational
  INFORMATIONAL: 'DEFINITIONAL',
  AFFILIATE_REVIEW: 'COMPARISON',

  // Industry-specific
  HEALTHCARE: 'HEALTHCARE_YMYL',
  EDUCATION: 'COURSE_EDUCATION',
  REAL_ESTATE: 'LOCATION_REALESTATE',

  // Events and hospitality
  HOSPITALITY: 'EVENT_EXPERIENCE',
  EVENTS: 'EVENT_EXPERIENCE',

  // Media and content
  NEWS_MEDIA: 'NEWS_ARTICLE',

  // Directory and community
  DIRECTORY: 'LISTING_DIRECTORY',
  COMMUNITY: 'DEFINITIONAL',

  // Recruitment
  RECRUITMENT: 'LISTING_DIRECTORY',

  // Nonprofit
  NONPROFIT: 'IMPACT_NONPROFIT',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a template by its name
 * @param name - The template name
 * @returns The template config or undefined if not found
 */
export function getTemplateByName(name: TemplateName): TemplateConfig | undefined {
  return CONTENT_TEMPLATES[name];
}

/**
 * Get the default template for a website type
 * @param websiteType - The website type
 * @returns The default template config for that website type
 */
export function getTemplateForWebsiteType(websiteType: WebsiteType): TemplateConfig {
  const templateName = WEBSITE_TYPE_TEMPLATE_MAP[websiteType];
  return CONTENT_TEMPLATES[templateName];
}

/**
 * Get all template names
 * @returns Array of all template names
 */
export function getAllTemplateNames(): TemplateName[] {
  return Object.keys(CONTENT_TEMPLATES) as TemplateName[];
}

/**
 * Get required sections from a template
 * @param template - The template config
 * @returns Array of required section templates
 */
export function getRequiredSections(template: TemplateConfig): typeof template.sectionStructure {
  return template.sectionStructure.filter(section => section.required);
}

/**
 * Get optional sections from a template
 * @param template - The template config
 * @returns Array of optional section templates
 */
export function getOptionalSections(template: TemplateConfig): typeof template.sectionStructure {
  return template.sectionStructure.filter(section => !section.required);
}
