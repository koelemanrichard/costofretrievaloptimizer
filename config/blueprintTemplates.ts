
// config/blueprintTemplates.ts
// Industry-specific blueprint templates for foundation pages and navigation

import { FoundationPageType } from '../types';

export interface BlueprintTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultPages: FoundationPageType[];
  additionalPages?: {
    type: string;
    label: string;
    description: string;
  }[];
  navigationDefaults?: {
    maxHeaderLinks?: number;
    dynamicBySection?: boolean;
    includeCTA?: boolean;
    footerColumns?: number;
  };
  suggestedFooterSections?: string[];
}

export const BLUEPRINT_TEMPLATES: BlueprintTemplate[] = [
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Online stores selling products',
    icon: '🛒',
    defaultPages: ['homepage', 'about', 'contact', 'privacy', 'terms'],
    additionalPages: [
      { type: 'shipping', label: 'Shipping & Delivery', description: 'Shipping policies and delivery info' },
      { type: 'returns', label: 'Returns & Refunds', description: 'Return policy and refund process' },
      { type: 'faq', label: 'FAQ', description: 'Frequently asked questions' },
    ],
    navigationDefaults: {
      maxHeaderLinks: 8,
      dynamicBySection: true,
      includeCTA: true,
      footerColumns: 4,
    },
    suggestedFooterSections: ['Shop', 'Customer Service', 'About Us', 'Legal'],
  },
  {
    id: 'saas',
    name: 'SaaS / Software',
    description: 'Software as a Service products',
    icon: '💻',
    defaultPages: ['homepage', 'about', 'contact', 'privacy', 'terms'],
    additionalPages: [
      { type: 'pricing', label: 'Pricing', description: 'Plans and pricing information' },
      { type: 'features', label: 'Features', description: 'Product features overview' },
      { type: 'support', label: 'Support', description: 'Help center and support options' },
      { type: 'security', label: 'Security', description: 'Security practices and compliance' },
    ],
    navigationDefaults: {
      maxHeaderLinks: 7,
      dynamicBySection: true,
      includeCTA: true,
      footerColumns: 4,
    },
    suggestedFooterSections: ['Product', 'Resources', 'Company', 'Legal'],
  },
  {
    id: 'local-business',
    name: 'Local Business',
    description: 'Local services and brick-and-mortar',
    icon: '📍',
    defaultPages: ['homepage', 'about', 'contact', 'privacy', 'terms'],
    additionalPages: [
      { type: 'services', label: 'Services', description: 'List of services offered' },
      { type: 'service-areas', label: 'Service Areas', description: 'Geographic areas served' },
      { type: 'testimonials', label: 'Testimonials', description: 'Customer reviews and testimonials' },
    ],
    navigationDefaults: {
      maxHeaderLinks: 6,
      dynamicBySection: false,
      includeCTA: true,
      footerColumns: 3,
    },
    suggestedFooterSections: ['Services', 'Contact', 'Legal'],
  },
  {
    id: 'blog-media',
    name: 'Blog / Media',
    description: 'Content publishers and bloggers',
    icon: '📰',
    defaultPages: ['homepage', 'about', 'contact', 'privacy', 'terms', 'author'],
    additionalPages: [
      { type: 'editorial', label: 'Editorial Policy', description: 'Content guidelines and standards' },
      { type: 'advertise', label: 'Advertise', description: 'Advertising opportunities' },
      { type: 'write-for-us', label: 'Write for Us', description: 'Guest posting guidelines' },
    ],
    navigationDefaults: {
      maxHeaderLinks: 8,
      dynamicBySection: true,
      includeCTA: false,
      footerColumns: 4,
    },
    suggestedFooterSections: ['Categories', 'About', 'Connect', 'Legal'],
  },
  {
    id: 'professional-services',
    name: 'Professional Services',
    description: 'Consulting, law, accounting, etc.',
    icon: '👔',
    defaultPages: ['homepage', 'about', 'contact', 'privacy', 'terms', 'author'],
    additionalPages: [
      { type: 'services', label: 'Services', description: 'Professional services offered' },
      { type: 'team', label: 'Our Team', description: 'Team members and expertise' },
      { type: 'case-studies', label: 'Case Studies', description: 'Success stories and results' },
      { type: 'testimonials', label: 'Testimonials', description: 'Client testimonials' },
    ],
    navigationDefaults: {
      maxHeaderLinks: 7,
      dynamicBySection: true,
      includeCTA: true,
      footerColumns: 3,
    },
    suggestedFooterSections: ['Services', 'Company', 'Legal'],
  },
  {
    id: 'startup',
    name: 'Startup / MVP',
    description: 'Early-stage companies',
    icon: '🚀',
    defaultPages: ['homepage', 'about', 'contact', 'privacy', 'terms'],
    additionalPages: [
      { type: 'careers', label: 'Careers', description: 'Job opportunities' },
      { type: 'investors', label: 'Investors', description: 'Investor relations' },
    ],
    navigationDefaults: {
      maxHeaderLinks: 5,
      dynamicBySection: false,
      includeCTA: true,
      footerColumns: 2,
    },
    suggestedFooterSections: ['Company', 'Legal'],
  },
];

/**
 * Get a blueprint template by ID
 */
export const getBlueprintTemplate = (id: string): BlueprintTemplate | undefined => {
  return BLUEPRINT_TEMPLATES.find(t => t.id === id);
};

/**
 * Get default blueprint for general use
 */
export const getDefaultBlueprint = (): BlueprintTemplate => {
  return {
    id: 'default',
    name: 'Default',
    description: 'Standard website setup',
    icon: '🌐',
    defaultPages: ['homepage', 'about', 'contact', 'privacy', 'terms'],
    navigationDefaults: {
      maxHeaderLinks: 7,
      dynamicBySection: true,
      includeCTA: true,
      footerColumns: 3,
    },
    suggestedFooterSections: ['Company', 'Support', 'Legal'],
  };
};
