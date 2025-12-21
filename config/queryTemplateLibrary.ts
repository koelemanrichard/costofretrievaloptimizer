/**
 * Query Template Library
 * Based on Koray Tugberk GÜBÜR's Semantic SEO Framework
 *
 * Pre-built search pattern templates with placeholder variables
 * for scaling Local SEO and service variations.
 *
 * Template syntax: [PlaceholderName] for variables
 * Example: "Best [Service] in [City]" -> "Best Plumber in Amsterdam"
 */

import type { QueryTemplate, QueryTemplateCategory, TemplatePlaceholder } from '../types';

/**
 * Common placeholder definitions
 */
export const COMMON_PLACEHOLDERS: Record<string, Omit<TemplatePlaceholder, 'required'>> = {
  Service: {
    name: 'Service',
    bracket_syntax: '[Service]',
    entity_type: 'Service',
    example_values: ['Plumber', 'Electrician', 'Lawyer', 'Dentist', 'Accountant'],
  },
  City: {
    name: 'City',
    bracket_syntax: '[City]',
    entity_type: 'City',
    validation_pattern: '^[A-Za-z\\s-]+$',
    example_values: ['Amsterdam', 'Rotterdam', 'New York', 'London', 'Berlin'],
  },
  Region: {
    name: 'Region',
    bracket_syntax: '[Region]',
    entity_type: 'AdministrativeArea',
    example_values: ['North Holland', 'California', 'Bavaria', 'Lombardy'],
  },
  Neighborhood: {
    name: 'Neighborhood',
    bracket_syntax: '[Neighborhood]',
    entity_type: 'Place',
    example_values: ['Centrum', 'Downtown', 'West Side', 'Old Town'],
  },
  Product: {
    name: 'Product',
    bracket_syntax: '[Product]',
    entity_type: 'Product',
    example_values: ['iPhone 15', 'Tesla Model 3', 'Nike Air Max', 'MacBook Pro'],
  },
  ProductCategory: {
    name: 'Product Category',
    bracket_syntax: '[Product Category]',
    entity_type: 'ProductCategory',
    example_values: ['Smartphones', 'Electric Cars', 'Running Shoes', 'Laptops'],
  },
  Audience: {
    name: 'Audience',
    bracket_syntax: '[Audience]',
    entity_type: 'Audience',
    example_values: ['Small Business', 'Homeowners', 'Students', 'Seniors', 'Startups'],
  },
  UseCase: {
    name: 'Use Case',
    bracket_syntax: '[Use Case]',
    entity_type: 'UseCase',
    example_values: ['Home Renovation', 'Tax Filing', 'Wedding Planning', 'Gaming'],
  },
  Year: {
    name: 'Year',
    bracket_syntax: '[Year]',
    entity_type: 'Year',
    validation_pattern: '^20[0-9]{2}$',
    example_values: ['2024', '2025'],
  },
  Price: {
    name: 'Price',
    bracket_syntax: '[Price]',
    entity_type: 'PriceRange',
    example_values: ['Under $100', 'Under €500', 'Budget', 'Premium'],
  },
  Brand: {
    name: 'Brand',
    bracket_syntax: '[Brand]',
    entity_type: 'Brand',
    example_values: ['Apple', 'Samsung', 'Nike', 'Toyota'],
  },
};

/**
 * Pre-built query templates organized by category
 */
export const QUERY_TEMPLATES: QueryTemplate[] = [
  // ==========================================================================
  // LOCAL SEO TEMPLATES
  // ==========================================================================
  {
    id: 'local-best-service',
    name: 'Best [Service] in [City]',
    pattern: 'Best [Service] in [City]',
    description: 'Local service search with "best" modifier for high-intent users',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.Service, required: true },
      { ...COMMON_PLACEHOLDERS.City, required: true },
    ],
    category: 'local',
    search_intent: 'transactional',
    example_output: 'Best Plumber in Amsterdam',
    suggested_topic_class: 'monetization',
  },
  {
    id: 'local-service-near-me',
    name: '[Service] near [Neighborhood]',
    pattern: '[Service] near [Neighborhood]',
    description: 'Hyper-local service search for specific neighborhoods',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.Service, required: true },
      { ...COMMON_PLACEHOLDERS.Neighborhood, required: true },
    ],
    category: 'local',
    search_intent: 'transactional',
    example_output: 'Plumber near Centrum',
    suggested_topic_class: 'monetization',
  },
  {
    id: 'local-affordable-service',
    name: 'Affordable [Service] in [City]',
    pattern: 'Affordable [Service] in [City]',
    description: 'Price-conscious local service search',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.Service, required: true },
      { ...COMMON_PLACEHOLDERS.City, required: true },
    ],
    category: 'local',
    search_intent: 'commercial',
    example_output: 'Affordable Electrician in Rotterdam',
    suggested_topic_class: 'monetization',
  },
  {
    id: 'local-emergency-service',
    name: 'Emergency [Service] [City]',
    pattern: 'Emergency [Service] [City]',
    description: 'Urgent local service needs',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.Service, required: true },
      { ...COMMON_PLACEHOLDERS.City, required: true },
    ],
    category: 'local',
    search_intent: 'transactional',
    example_output: 'Emergency Plumber Amsterdam',
    suggested_topic_class: 'monetization',
  },
  {
    id: 'local-service-for-audience',
    name: '[Service] for [Audience] in [City]',
    pattern: '[Service] for [Audience] in [City]',
    description: 'Audience-targeted local service',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.Service, required: true },
      { ...COMMON_PLACEHOLDERS.Audience, required: true },
      { ...COMMON_PLACEHOLDERS.City, required: true },
    ],
    category: 'local',
    search_intent: 'commercial',
    example_output: 'Accountant for Small Business in Amsterdam',
    suggested_topic_class: 'monetization',
  },

  // ==========================================================================
  // COMPARISON TEMPLATES
  // ==========================================================================
  {
    id: 'comparison-vs',
    name: '[Product A] vs [Product B]',
    pattern: '[Product A] vs [Product B]',
    description: 'Direct product comparison',
    placeholders: [
      { name: 'Product A', bracket_syntax: '[Product A]', entity_type: 'Product', example_values: ['iPhone 15', 'Samsung Galaxy S24'], required: true },
      { name: 'Product B', bracket_syntax: '[Product B]', entity_type: 'Product', example_values: ['Pixel 8', 'OnePlus 12'], required: true },
    ],
    category: 'comparison',
    search_intent: 'commercial',
    example_output: 'iPhone 15 vs Samsung Galaxy S24',
    suggested_topic_class: 'informational',
  },
  {
    id: 'comparison-vs-use-case',
    name: '[Product A] vs [Product B] for [Use Case]',
    pattern: '[Product A] vs [Product B] for [Use Case]',
    description: 'Use-case specific product comparison',
    placeholders: [
      { name: 'Product A', bracket_syntax: '[Product A]', entity_type: 'Product', example_values: ['MacBook Pro', 'Dell XPS'], required: true },
      { name: 'Product B', bracket_syntax: '[Product B]', entity_type: 'Product', example_values: ['ThinkPad X1', 'Surface Laptop'], required: true },
      { ...COMMON_PLACEHOLDERS.UseCase, required: true },
    ],
    category: 'comparison',
    search_intent: 'commercial',
    example_output: 'MacBook Pro vs Dell XPS for Video Editing',
    suggested_topic_class: 'informational',
  },
  {
    id: 'comparison-alternatives',
    name: '[Product] alternatives',
    pattern: '[Product] alternatives',
    description: 'Finding alternatives to a specific product',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.Product, required: true },
    ],
    category: 'comparison',
    search_intent: 'commercial',
    example_output: 'Slack alternatives',
    suggested_topic_class: 'informational',
  },

  // ==========================================================================
  // BEST-OF / REVIEW TEMPLATES
  // ==========================================================================
  {
    id: 'best-of-category-year',
    name: 'Best [Product Category] [Year]',
    pattern: 'Best [Product Category] [Year]',
    description: 'Annual best-of roundup',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
      { ...COMMON_PLACEHOLDERS.Year, required: true },
    ],
    category: 'best-of',
    search_intent: 'commercial',
    example_output: 'Best Smartphones 2024',
    suggested_topic_class: 'informational',
  },
  {
    id: 'best-of-for-audience',
    name: 'Best [Product Category] for [Audience]',
    pattern: 'Best [Product Category] for [Audience]',
    description: 'Best-of targeted to specific audience',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
      { ...COMMON_PLACEHOLDERS.Audience, required: true },
    ],
    category: 'best-of',
    search_intent: 'commercial',
    example_output: 'Best Laptops for Students',
    suggested_topic_class: 'informational',
  },
  {
    id: 'best-of-under-price',
    name: 'Best [Product Category] [Price]',
    pattern: 'Best [Product Category] [Price]',
    description: 'Budget-conscious best-of list',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
      { ...COMMON_PLACEHOLDERS.Price, required: true },
    ],
    category: 'best-of',
    search_intent: 'commercial',
    example_output: 'Best Headphones Under $100',
    suggested_topic_class: 'informational',
  },
  {
    id: 'review-product',
    name: '[Product] review',
    pattern: '[Product] review',
    description: 'Single product review',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.Product, required: true },
    ],
    category: 'review',
    search_intent: 'commercial',
    example_output: 'iPhone 15 Pro review',
    suggested_topic_class: 'informational',
  },

  // ==========================================================================
  // HOW-TO TEMPLATES
  // ==========================================================================
  {
    id: 'how-to-action',
    name: 'How to [Action]',
    pattern: 'How to [Action]',
    description: 'Process-oriented how-to guide',
    placeholders: [
      { name: 'Action', bracket_syntax: '[Action]', entity_type: 'Action', example_values: ['file taxes', 'change a tire', 'cook pasta'], required: true },
    ],
    category: 'how-to',
    search_intent: 'informational',
    example_output: 'How to file taxes',
    suggested_topic_class: 'informational',
  },
  {
    id: 'how-to-choose',
    name: 'How to choose [Product Category]',
    pattern: 'How to choose [Product Category]',
    description: 'Buying guide format',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'how-to',
    search_intent: 'informational',
    example_output: 'How to choose a laptop',
    suggested_topic_class: 'informational',
  },
  {
    id: 'how-to-for-audience',
    name: 'How to [Action] for [Audience]',
    pattern: 'How to [Action] for [Audience]',
    description: 'Audience-targeted how-to',
    placeholders: [
      { name: 'Action', bracket_syntax: '[Action]', entity_type: 'Action', example_values: ['save money', 'start investing', 'learn coding'], required: true },
      { ...COMMON_PLACEHOLDERS.Audience, required: true },
    ],
    category: 'how-to',
    search_intent: 'informational',
    example_output: 'How to save money for Students',
    suggested_topic_class: 'informational',
  },

  // ==========================================================================
  // COST / PRICING TEMPLATES
  // ==========================================================================
  {
    id: 'cost-service',
    name: '[Service] cost',
    pattern: '[Service] cost',
    description: 'Service pricing information',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.Service, required: true },
    ],
    category: 'cost',
    search_intent: 'commercial',
    example_output: 'Plumber cost',
    suggested_topic_class: 'informational',
  },
  {
    id: 'cost-service-city',
    name: 'How much does [Service] cost in [City]',
    pattern: 'How much does [Service] cost in [City]',
    description: 'Location-specific pricing',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.Service, required: true },
      { ...COMMON_PLACEHOLDERS.City, required: true },
    ],
    category: 'cost',
    search_intent: 'commercial',
    example_output: 'How much does a plumber cost in Amsterdam',
    suggested_topic_class: 'informational',
  },
  {
    id: 'cost-product-price',
    name: '[Product] price',
    pattern: '[Product] price',
    description: 'Product pricing lookup',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.Product, required: true },
    ],
    category: 'cost',
    search_intent: 'commercial',
    example_output: 'iPhone 15 price',
    suggested_topic_class: 'informational',
  },

  // ==========================================================================
  // PROBLEM-SOLUTION TEMPLATES
  // ==========================================================================
  {
    id: 'problem-solution',
    name: 'Why [Problem] and how to fix it',
    pattern: 'Why [Problem] and how to fix it',
    description: 'Problem identification and solution',
    placeholders: [
      { name: 'Problem', bracket_syntax: '[Problem]', entity_type: 'Problem', example_values: ['is my computer slow', 'won\'t my car start', 'does my sink leak'], required: true },
    ],
    category: 'problem-solution',
    search_intent: 'informational',
    example_output: 'Why is my computer slow and how to fix it',
    suggested_topic_class: 'informational',
  },
  {
    id: 'problem-cause',
    name: 'What causes [Problem]',
    pattern: 'What causes [Problem]',
    description: 'Root cause explanation',
    placeholders: [
      { name: 'Problem', bracket_syntax: '[Problem]', entity_type: 'Problem', example_values: ['hair loss', 'slow internet', 'high energy bills'], required: true },
    ],
    category: 'problem-solution',
    search_intent: 'informational',
    example_output: 'What causes slow internet',
    suggested_topic_class: 'informational',
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: QueryTemplateCategory): QueryTemplate[] {
  return QUERY_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates by search intent
 */
export function getTemplatesByIntent(intent: QueryTemplate['search_intent']): QueryTemplate[] {
  return QUERY_TEMPLATES.filter(t => t.search_intent === intent);
}

/**
 * Get monetization-focused templates
 */
export function getMonetizationTemplates(): QueryTemplate[] {
  return QUERY_TEMPLATES.filter(t => t.suggested_topic_class === 'monetization');
}

/**
 * Get local SEO templates
 */
export function getLocalSEOTemplates(): QueryTemplate[] {
  return QUERY_TEMPLATES.filter(t => t.category === 'local');
}

/**
 * Find template by ID
 */
export function getTemplateById(id: string): QueryTemplate | undefined {
  return QUERY_TEMPLATES.find(t => t.id === id);
}

/**
 * Template categories with descriptions
 */
export const TEMPLATE_CATEGORIES: Record<QueryTemplateCategory, { label: string; description: string }> = {
  local: {
    label: 'Local SEO',
    description: 'Location-based service and business searches',
  },
  comparison: {
    label: 'Comparison',
    description: 'Product vs product and alternative searches',
  },
  'how-to': {
    label: 'How-To',
    description: 'Process and instructional content',
  },
  'problem-solution': {
    label: 'Problem-Solution',
    description: 'Troubleshooting and fix-it content',
  },
  'best-of': {
    label: 'Best-Of Lists',
    description: 'Roundup and recommendation content',
  },
  review: {
    label: 'Reviews',
    description: 'Product and service reviews',
  },
  cost: {
    label: 'Cost/Pricing',
    description: 'Price and cost information',
  },
  ecommerce: {
    label: 'E-commerce',
    description: 'Product category and shopping templates',
  },
  custom: {
    label: 'Custom',
    description: 'User-defined templates',
  },
};

// =============================================================================
// E-COMMERCE SEMANTIC CONTENT NETWORK TEMPLATES
// Based on Koray's discussion about Query Augmentation Hierarchy for e-commerce
// Creates "Context Pages" that provide topical coverage around product categories
// =============================================================================

/**
 * E-commerce specific templates for building semantic content networks
 * around product categories. These create the "context pages" that help
 * Google understand your product taxonomy through semantic relationships.
 */
export const ECOMMERCE_TEMPLATES: QueryTemplate[] = [
  // Product Category Context Templates
  {
    id: 'ecom-category-guide',
    name: '[Product Category] Buying Guide',
    pattern: '[Product Category] Buying Guide',
    description: 'Comprehensive guide for a product category - core contextual content',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: 'Running Shoes Buying Guide',
    suggested_topic_class: 'informational',
  },
  {
    id: 'ecom-category-types',
    name: 'Types of [Product Category]',
    pattern: 'Types of [Product Category]',
    description: 'Explains different types/subcategories - helps Google understand taxonomy',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'informational',
    example_output: 'Types of Running Shoes',
    suggested_topic_class: 'informational',
  },
  {
    id: 'ecom-category-vs',
    name: '[Product Type A] vs [Product Type B]',
    pattern: '[Product Type A] vs [Product Type B]',
    description: 'Compare product subtypes within category',
    placeholders: [
      { name: 'Product Type A', bracket_syntax: '[Product Type A]', entity_type: 'ProductType', example_values: ['Trail Running Shoes', 'Neutral Running Shoes'], required: true },
      { name: 'Product Type B', bracket_syntax: '[Product Type B]', entity_type: 'ProductType', example_values: ['Road Running Shoes', 'Stability Running Shoes'], required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: 'Trail Running Shoes vs Road Running Shoes',
    suggested_topic_class: 'informational',
  },

  // Attribute-based Templates (Size, Color, Material)
  {
    id: 'ecom-attribute-size',
    name: '[Product Category] Size Guide',
    pattern: '[Product Category] Size Guide',
    description: 'Size information for product category - high commercial intent',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'informational',
    example_output: 'Running Shoes Size Guide',
    suggested_topic_class: 'informational',
  },
  {
    id: 'ecom-attribute-material',
    name: 'Best [Material] [Product Category]',
    pattern: 'Best [Material] [Product Category]',
    description: 'Material-specific product recommendations',
    placeholders: [
      { name: 'Material', bracket_syntax: '[Material]', entity_type: 'Material', example_values: ['Leather', 'Canvas', 'Mesh', 'Gore-Tex'], required: true },
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: 'Best Mesh Running Shoes',
    suggested_topic_class: 'informational',
  },
  {
    id: 'ecom-attribute-color',
    name: '[Color] [Product Category]',
    pattern: '[Color] [Product Category]',
    description: 'Color variant searches - long tail but high conversion',
    placeholders: [
      { name: 'Color', bracket_syntax: '[Color]', entity_type: 'Color', example_values: ['Black', 'White', 'Red', 'Blue'], required: true },
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'transactional',
    example_output: 'Black Running Shoes',
    suggested_topic_class: 'monetization',
  },

  // Audience-based Product Templates
  {
    id: 'ecom-audience-best',
    name: 'Best [Product Category] for [Audience]',
    pattern: 'Best [Product Category] for [Audience]',
    description: 'Audience-targeted product recommendations',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
      { ...COMMON_PLACEHOLDERS.Audience, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: 'Best Running Shoes for Beginners',
    suggested_topic_class: 'informational',
  },
  {
    id: 'ecom-audience-gender',
    name: "[Gender]'s [Product Category]",
    pattern: "[Gender]'s [Product Category]",
    description: 'Gender-specific product category pages',
    placeholders: [
      { name: 'Gender', bracket_syntax: '[Gender]', entity_type: 'Gender', example_values: ["Men", "Women", "Kids", "Unisex"], required: true },
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: "Women's Running Shoes",
    suggested_topic_class: 'monetization',
  },

  // Use-case Based Templates
  {
    id: 'ecom-usecase-for',
    name: '[Product Category] for [Use Case]',
    pattern: '[Product Category] for [Use Case]',
    description: 'Use-case specific product recommendations',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
      { ...COMMON_PLACEHOLDERS.UseCase, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: 'Running Shoes for Marathons',
    suggested_topic_class: 'informational',
  },
  {
    id: 'ecom-usecase-condition',
    name: '[Product Category] for [Condition]',
    pattern: '[Product Category] for [Condition]',
    description: 'Condition/problem-specific product recommendations',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
      { name: 'Condition', bracket_syntax: '[Condition]', entity_type: 'Condition', example_values: ['Flat Feet', 'Wide Feet', 'Plantar Fasciitis', 'Overpronation'], required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: 'Running Shoes for Flat Feet',
    suggested_topic_class: 'informational',
  },

  // Price-based Templates
  {
    id: 'ecom-price-under',
    name: '[Product Category] Under [Price]',
    pattern: '[Product Category] Under [Price]',
    description: 'Budget-conscious product searches',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
      { ...COMMON_PLACEHOLDERS.Price, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'transactional',
    example_output: 'Running Shoes Under $100',
    suggested_topic_class: 'monetization',
  },
  {
    id: 'ecom-price-cheap',
    name: 'Cheap [Product Category]',
    pattern: 'Cheap [Product Category]',
    description: 'Budget product searches - high volume',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'transactional',
    example_output: 'Cheap Running Shoes',
    suggested_topic_class: 'monetization',
  },
  {
    id: 'ecom-price-luxury',
    name: 'Luxury [Product Category]',
    pattern: 'Luxury [Product Category]',
    description: 'Premium/luxury segment searches',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: 'Luxury Running Shoes',
    suggested_topic_class: 'informational',
  },

  // Brand-related Templates
  {
    id: 'ecom-brand-vs',
    name: '[Brand A] vs [Brand B] [Product Category]',
    pattern: '[Brand A] vs [Brand B] [Product Category]',
    description: 'Brand comparison within product category',
    placeholders: [
      { name: 'Brand A', bracket_syntax: '[Brand A]', entity_type: 'Brand', example_values: ['Nike', 'Adidas'], required: true },
      { name: 'Brand B', bracket_syntax: '[Brand B]', entity_type: 'Brand', example_values: ['New Balance', 'ASICS'], required: true },
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: 'Nike vs Adidas Running Shoes',
    suggested_topic_class: 'informational',
  },
  {
    id: 'ecom-brand-best',
    name: 'Best [Brand] [Product Category]',
    pattern: 'Best [Brand] [Product Category]',
    description: 'Best products from specific brand',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.Brand, required: true },
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: 'Best Nike Running Shoes',
    suggested_topic_class: 'informational',
  },

  // Seasonal/Temporal Templates
  {
    id: 'ecom-year-best',
    name: 'Best [Product Category] [Year]',
    pattern: 'Best [Product Category] [Year]',
    description: 'Annual best-of lists for products',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
      { ...COMMON_PLACEHOLDERS.Year, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: 'Best Running Shoes 2024',
    suggested_topic_class: 'informational',
  },
  {
    id: 'ecom-seasonal',
    name: '[Season] [Product Category]',
    pattern: '[Season] [Product Category]',
    description: 'Seasonal product recommendations',
    placeholders: [
      { name: 'Season', bracket_syntax: '[Season]', entity_type: 'Season', example_values: ['Winter', 'Summer', 'Spring', 'Fall'], required: true },
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'commercial',
    example_output: 'Winter Running Shoes',
    suggested_topic_class: 'informational',
  },

  // Care & Maintenance Templates (Contextual Coverage)
  {
    id: 'ecom-care-how',
    name: 'How to Clean [Product Category]',
    pattern: 'How to Clean [Product Category]',
    description: 'Product care and maintenance - contextual support content',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'informational',
    example_output: 'How to Clean Running Shoes',
    suggested_topic_class: 'informational',
  },
  {
    id: 'ecom-care-lifespan',
    name: 'How Long Do [Product Category] Last',
    pattern: 'How Long Do [Product Category] Last',
    description: 'Product lifespan information - contextual support',
    placeholders: [
      { ...COMMON_PLACEHOLDERS.ProductCategory, required: true },
    ],
    category: 'ecommerce' as QueryTemplateCategory,
    search_intent: 'informational',
    example_output: 'How Long Do Running Shoes Last',
    suggested_topic_class: 'informational',
  },
];

// Add e-commerce templates to main templates array
export const ALL_TEMPLATES: QueryTemplate[] = [...QUERY_TEMPLATES, ...ECOMMERCE_TEMPLATES];

/**
 * E-commerce Content Network Hierarchy
 * Based on Koray's query augmentation framework
 *
 * Structure:
 * 1. Category Pillar Page (e.g., "Running Shoes")
 * 2. Context Pages (Types, Guides, Comparisons)
 * 3. Attribute Pages (Size, Material, Color)
 * 4. Audience Pages (For Beginners, For Women)
 * 5. Use-case Pages (For Marathons, For Flat Feet)
 * 6. Product Pages (Individual products)
 */
export interface EcommerceHierarchyLevel {
  level: number;
  name: string;
  template_ids: string[];
  seo_purpose: string;
  internal_linking: string;
}

export const ECOMMERCE_HIERARCHY: EcommerceHierarchyLevel[] = [
  {
    level: 1,
    name: 'Category Pillar',
    template_ids: ['ecom-category-guide'],
    seo_purpose: 'Main category page that establishes topical authority',
    internal_linking: 'Links to all Level 2 pages; receives links from homepage/navigation',
  },
  {
    level: 2,
    name: 'Context Pages',
    template_ids: ['ecom-category-types', 'ecom-category-vs', 'ecom-year-best'],
    seo_purpose: 'Provide semantic context and demonstrate comprehensive coverage',
    internal_linking: 'Link to pillar and to relevant attribute/audience pages',
  },
  {
    level: 3,
    name: 'Attribute Pages',
    template_ids: ['ecom-attribute-size', 'ecom-attribute-material', 'ecom-attribute-color'],
    seo_purpose: 'Capture attribute-modified searches (long-tail, high conversion)',
    internal_linking: 'Link to pillar, relevant products, and related attributes',
  },
  {
    level: 4,
    name: 'Audience Pages',
    template_ids: ['ecom-audience-best', 'ecom-audience-gender', 'ecom-usecase-for', 'ecom-usecase-condition'],
    seo_purpose: 'Capture audience-specific and use-case searches',
    internal_linking: 'Link to pillar, relevant products, and related audience pages',
  },
  {
    level: 5,
    name: 'Price Pages',
    template_ids: ['ecom-price-under', 'ecom-price-cheap', 'ecom-price-luxury'],
    seo_purpose: 'Capture price-conscious searches (high transactional intent)',
    internal_linking: 'Link to pillar and directly to product pages in price range',
  },
  {
    level: 6,
    name: 'Brand Comparison',
    template_ids: ['ecom-brand-vs', 'ecom-brand-best'],
    seo_purpose: 'Capture brand-conscious searches and comparisons',
    internal_linking: 'Link to brand category pages and top brand products',
  },
  {
    level: 7,
    name: 'Support Content',
    template_ids: ['ecom-care-how', 'ecom-care-lifespan', 'ecom-seasonal'],
    seo_purpose: 'Contextual content that supports authority without competing for commercial terms',
    internal_linking: 'Link to pillar and product pages with helpful anchor text',
  },
];

/**
 * Get e-commerce templates only
 */
export function getEcommerceTemplates(): QueryTemplate[] {
  return ECOMMERCE_TEMPLATES;
}

/**
 * Get templates for a specific hierarchy level
 */
export function getTemplatesForHierarchyLevel(level: number): QueryTemplate[] {
  const hierarchyLevel = ECOMMERCE_HIERARCHY.find(h => h.level === level);
  if (!hierarchyLevel) return [];

  return ECOMMERCE_TEMPLATES.filter(t => hierarchyLevel.template_ids.includes(t.id));
}

/**
 * Generate complete e-commerce content network for a product category
 */
export function generateEcommerceContentNetwork(
  productCategory: string,
  options?: {
    includeBrands?: string[];
    includeAudiences?: string[];
    includeMaterials?: string[];
    includeUseCases?: string[];
    year?: string;
  }
): Array<{ template: QueryTemplate; variables: Record<string, string>; level: number }> {
  const network: Array<{ template: QueryTemplate; variables: Record<string, string>; level: number }> = [];
  const {
    includeBrands = [],
    includeAudiences = [],
    includeMaterials = [],
    includeUseCases = [],
    year = new Date().getFullYear().toString()
  } = options || {};

  // Level 1: Category Guide
  const categoryGuide = ECOMMERCE_TEMPLATES.find(t => t.id === 'ecom-category-guide');
  if (categoryGuide) {
    network.push({
      template: categoryGuide,
      variables: { 'Product Category': productCategory },
      level: 1,
    });
  }

  // Level 2: Context pages
  const typesTemplate = ECOMMERCE_TEMPLATES.find(t => t.id === 'ecom-category-types');
  if (typesTemplate) {
    network.push({
      template: typesTemplate,
      variables: { 'Product Category': productCategory },
      level: 2,
    });
  }

  const yearBestTemplate = ECOMMERCE_TEMPLATES.find(t => t.id === 'ecom-year-best');
  if (yearBestTemplate) {
    network.push({
      template: yearBestTemplate,
      variables: { 'Product Category': productCategory, 'Year': year },
      level: 2,
    });
  }

  // Level 3: Attribute pages
  const sizeTemplate = ECOMMERCE_TEMPLATES.find(t => t.id === 'ecom-attribute-size');
  if (sizeTemplate) {
    network.push({
      template: sizeTemplate,
      variables: { 'Product Category': productCategory },
      level: 3,
    });
  }

  includeMaterials.forEach(material => {
    const materialTemplate = ECOMMERCE_TEMPLATES.find(t => t.id === 'ecom-attribute-material');
    if (materialTemplate) {
      network.push({
        template: materialTemplate,
        variables: { 'Product Category': productCategory, 'Material': material },
        level: 3,
      });
    }
  });

  // Level 4: Audience pages
  includeAudiences.forEach(audience => {
    const audienceTemplate = ECOMMERCE_TEMPLATES.find(t => t.id === 'ecom-audience-best');
    if (audienceTemplate) {
      network.push({
        template: audienceTemplate,
        variables: { 'Product Category': productCategory, 'Audience': audience },
        level: 4,
      });
    }
  });

  includeUseCases.forEach(useCase => {
    const useCaseTemplate = ECOMMERCE_TEMPLATES.find(t => t.id === 'ecom-usecase-for');
    if (useCaseTemplate) {
      network.push({
        template: useCaseTemplate,
        variables: { 'Product Category': productCategory, 'Use Case': useCase },
        level: 4,
      });
    }
  });

  // Level 5: Price pages (always include)
  ['ecom-price-cheap', 'ecom-price-luxury'].forEach(templateId => {
    const priceTemplate = ECOMMERCE_TEMPLATES.find(t => t.id === templateId);
    if (priceTemplate) {
      network.push({
        template: priceTemplate,
        variables: { 'Product Category': productCategory },
        level: 5,
      });
    }
  });

  // Level 6: Brand pages
  includeBrands.forEach(brand => {
    const brandTemplate = ECOMMERCE_TEMPLATES.find(t => t.id === 'ecom-brand-best');
    if (brandTemplate) {
      network.push({
        template: brandTemplate,
        variables: { 'Product Category': productCategory, 'Brand': brand },
        level: 6,
      });
    }
  });

  // Level 7: Support content
  ['ecom-care-how', 'ecom-care-lifespan'].forEach(templateId => {
    const careTemplate = ECOMMERCE_TEMPLATES.find(t => t.id === templateId);
    if (careTemplate) {
      network.push({
        template: careTemplate,
        variables: { 'Product Category': productCategory },
        level: 7,
      });
    }
  });

  return network;
}
