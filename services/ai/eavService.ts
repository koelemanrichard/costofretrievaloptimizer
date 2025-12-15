/**
 * EAV Service
 *
 * Provides industry-specific EAV predicate suggestions and
 * smart recommendations based on entity type and business context.
 */

import { SemanticTriple, AttributeCategory, AttributeClass, BusinessInfo } from '../../types';

/**
 * Industry/vertical types for EAV suggestions
 */
export type IndustryType =
  | 'e-commerce'
  | 'saas'
  | 'publisher'
  | 'local-service'
  | 'b2b'
  | 'healthcare'
  | 'finance'
  | 'education'
  | 'real-estate'
  | 'travel'
  | 'food-beverage'
  | 'general';

/**
 * Entity type classification
 */
export type EntityType =
  | 'product'
  | 'service'
  | 'software'
  | 'person'
  | 'organization'
  | 'location'
  | 'concept'
  | 'event'
  | 'general';

/**
 * Predicate suggestion with metadata
 */
export interface PredicateSuggestion {
  relation: string;
  category: AttributeCategory;
  classification?: AttributeClass;
  description: string;
  exampleValue: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Industry-specific predicate templates
 */
const INDUSTRY_PREDICATES: Record<IndustryType, PredicateSuggestion[]> = {
  'e-commerce': [
    { relation: 'has_price', category: 'ROOT', classification: 'SPECIFICATION', description: 'Product price', exampleValue: '$99.99', priority: 'high' },
    { relation: 'has_sku', category: 'ROOT', classification: 'SPECIFICATION', description: 'Stock keeping unit', exampleValue: 'SKU-12345', priority: 'high' },
    { relation: 'available_in', category: 'ROOT', classification: 'SPECIFICATION', description: 'Availability status', exampleValue: 'In Stock', priority: 'high' },
    { relation: 'has_category', category: 'ROOT', classification: 'TYPE', description: 'Product category', exampleValue: 'Electronics', priority: 'high' },
    { relation: 'has_brand', category: 'UNIQUE', classification: 'TYPE', description: 'Brand name', exampleValue: 'Apple', priority: 'high' },
    { relation: 'has_rating', category: 'UNIQUE', classification: 'SPECIFICATION', description: 'Customer rating', exampleValue: '4.5/5', priority: 'medium' },
    { relation: 'ships_to', category: 'COMMON', classification: 'SPECIFICATION', description: 'Shipping destinations', exampleValue: 'Worldwide', priority: 'medium' },
    { relation: 'has_warranty', category: 'UNIQUE', classification: 'BENEFIT', description: 'Warranty period', exampleValue: '2 years', priority: 'medium' },
    { relation: 'made_of', category: 'RARE', classification: 'COMPONENT', description: 'Material composition', exampleValue: 'Aluminum', priority: 'low' },
    { relation: 'weighs', category: 'RARE', classification: 'SPECIFICATION', description: 'Product weight', exampleValue: '500g', priority: 'low' },
  ],
  'saas': [
    { relation: 'has_feature', category: 'UNIQUE', classification: 'COMPONENT', description: 'Software feature', exampleValue: 'Real-time collaboration', priority: 'high' },
    { relation: 'integrates_with', category: 'UNIQUE', classification: 'COMPONENT', description: 'Third-party integrations', exampleValue: 'Slack, Zapier', priority: 'high' },
    { relation: 'has_pricing_tier', category: 'ROOT', classification: 'SPECIFICATION', description: 'Pricing plan', exampleValue: 'Pro: $49/month', priority: 'high' },
    { relation: 'supports_platform', category: 'ROOT', classification: 'SPECIFICATION', description: 'Supported platforms', exampleValue: 'Web, iOS, Android', priority: 'high' },
    { relation: 'has_api', category: 'UNIQUE', classification: 'COMPONENT', description: 'API availability', exampleValue: 'REST API v2', priority: 'medium' },
    { relation: 'has_sla', category: 'UNIQUE', classification: 'BENEFIT', description: 'Service level agreement', exampleValue: '99.9% uptime', priority: 'medium' },
    { relation: 'requires_login', category: 'COMMON', classification: 'PROCESS', description: 'Authentication required', exampleValue: 'SSO supported', priority: 'low' },
    { relation: 'stores_data_in', category: 'RARE', classification: 'SPECIFICATION', description: 'Data storage location', exampleValue: 'AWS EU', priority: 'low' },
    { relation: 'complies_with', category: 'RARE', classification: 'SPECIFICATION', description: 'Compliance standards', exampleValue: 'GDPR, SOC 2', priority: 'medium' },
    { relation: 'has_free_trial', category: 'UNIQUE', classification: 'BENEFIT', description: 'Trial availability', exampleValue: '14 days', priority: 'medium' },
  ],
  'publisher': [
    { relation: 'authored_by', category: 'ROOT', classification: 'TYPE', description: 'Content author', exampleValue: 'John Smith', priority: 'high' },
    { relation: 'published_on', category: 'ROOT', classification: 'SPECIFICATION', description: 'Publication date', exampleValue: '2024-01-15', priority: 'high' },
    { relation: 'covers_topic', category: 'ROOT', classification: 'TYPE', description: 'Topic coverage', exampleValue: 'SEO Strategy', priority: 'high' },
    { relation: 'has_reading_time', category: 'COMMON', classification: 'SPECIFICATION', description: 'Estimated read time', exampleValue: '8 minutes', priority: 'medium' },
    { relation: 'updated_on', category: 'UNIQUE', classification: 'SPECIFICATION', description: 'Last update date', exampleValue: '2024-03-01', priority: 'medium' },
    { relation: 'cites_source', category: 'RARE', classification: 'COMPONENT', description: 'Referenced sources', exampleValue: 'Google Research', priority: 'low' },
    { relation: 'has_expertise_level', category: 'UNIQUE', classification: 'TYPE', description: 'Content difficulty', exampleValue: 'Advanced', priority: 'medium' },
    { relation: 'includes_media', category: 'COMMON', classification: 'COMPONENT', description: 'Media types included', exampleValue: 'Video, Infographic', priority: 'low' },
  ],
  'local-service': [
    { relation: 'serves_area', category: 'ROOT', classification: 'SPECIFICATION', description: 'Service area', exampleValue: 'Amsterdam Metro', priority: 'high' },
    { relation: 'has_hours', category: 'ROOT', classification: 'SPECIFICATION', description: 'Business hours', exampleValue: 'Mon-Fri 9-5', priority: 'high' },
    { relation: 'has_phone', category: 'ROOT', classification: 'SPECIFICATION', description: 'Contact phone', exampleValue: '+31 20 123 4567', priority: 'high' },
    { relation: 'located_at', category: 'ROOT', classification: 'SPECIFICATION', description: 'Physical address', exampleValue: '123 Main St', priority: 'high' },
    { relation: 'offers_service', category: 'UNIQUE', classification: 'COMPONENT', description: 'Service offered', exampleValue: 'Emergency Repair', priority: 'high' },
    { relation: 'has_certification', category: 'UNIQUE', classification: 'BENEFIT', description: 'Professional certification', exampleValue: 'Licensed & Insured', priority: 'medium' },
    { relation: 'accepts_payment', category: 'COMMON', classification: 'SPECIFICATION', description: 'Payment methods', exampleValue: 'Cash, Card, iDEAL', priority: 'medium' },
    { relation: 'has_rating_on', category: 'UNIQUE', classification: 'SPECIFICATION', description: 'Review platform rating', exampleValue: 'Google: 4.8/5', priority: 'medium' },
    { relation: 'response_time', category: 'UNIQUE', classification: 'BENEFIT', description: 'Typical response time', exampleValue: 'Within 2 hours', priority: 'medium' },
  ],
  'b2b': [
    { relation: 'serves_industry', category: 'ROOT', classification: 'TYPE', description: 'Target industries', exampleValue: 'Healthcare, Finance', priority: 'high' },
    { relation: 'has_case_study', category: 'UNIQUE', classification: 'BENEFIT', description: 'Client case studies', exampleValue: '50+ enterprises', priority: 'medium' },
    { relation: 'provides_solution', category: 'ROOT', classification: 'COMPONENT', description: 'Solution type', exampleValue: 'Data Analytics', priority: 'high' },
    { relation: 'has_partnership', category: 'UNIQUE', classification: 'COMPONENT', description: 'Strategic partnerships', exampleValue: 'Microsoft Partner', priority: 'medium' },
    { relation: 'requires_contract', category: 'COMMON', classification: 'PROCESS', description: 'Contract requirements', exampleValue: 'Annual minimum', priority: 'low' },
    { relation: 'has_team_size', category: 'RARE', classification: 'SPECIFICATION', description: 'Company size', exampleValue: '200+ employees', priority: 'low' },
  ],
  'healthcare': [
    { relation: 'treats_condition', category: 'ROOT', classification: 'TYPE', description: 'Conditions treated', exampleValue: 'Diabetes', priority: 'high' },
    { relation: 'requires_prescription', category: 'ROOT', classification: 'SPECIFICATION', description: 'Prescription needed', exampleValue: 'Yes', priority: 'high' },
    { relation: 'has_side_effects', category: 'RARE', classification: 'RISK', description: 'Known side effects', exampleValue: 'Drowsiness', priority: 'medium' },
    { relation: 'approved_by', category: 'UNIQUE', classification: 'SPECIFICATION', description: 'Regulatory approval', exampleValue: 'FDA Approved', priority: 'high' },
    { relation: 'dosage_form', category: 'ROOT', classification: 'SPECIFICATION', description: 'Form of medication', exampleValue: 'Tablet', priority: 'medium' },
    { relation: 'contraindicated_with', category: 'RARE', classification: 'RISK', description: 'Contraindications', exampleValue: 'Blood thinners', priority: 'medium' },
  ],
  'finance': [
    { relation: 'has_apr', category: 'ROOT', classification: 'SPECIFICATION', description: 'Annual percentage rate', exampleValue: '5.99%', priority: 'high' },
    { relation: 'requires_credit_score', category: 'ROOT', classification: 'SPECIFICATION', description: 'Minimum credit score', exampleValue: '650+', priority: 'high' },
    { relation: 'has_fee', category: 'ROOT', classification: 'SPECIFICATION', description: 'Associated fees', exampleValue: 'No annual fee', priority: 'high' },
    { relation: 'insured_by', category: 'UNIQUE', classification: 'BENEFIT', description: 'Insurance coverage', exampleValue: 'FDIC Insured', priority: 'medium' },
    { relation: 'has_reward', category: 'UNIQUE', classification: 'BENEFIT', description: 'Rewards program', exampleValue: '2% cashback', priority: 'medium' },
    { relation: 'regulated_by', category: 'RARE', classification: 'SPECIFICATION', description: 'Regulatory body', exampleValue: 'SEC', priority: 'low' },
  ],
  'education': [
    { relation: 'teaches_subject', category: 'ROOT', classification: 'TYPE', description: 'Subject taught', exampleValue: 'Data Science', priority: 'high' },
    { relation: 'has_duration', category: 'ROOT', classification: 'SPECIFICATION', description: 'Course duration', exampleValue: '12 weeks', priority: 'high' },
    { relation: 'grants_certificate', category: 'UNIQUE', classification: 'BENEFIT', description: 'Certification offered', exampleValue: 'Professional Certificate', priority: 'medium' },
    { relation: 'taught_by', category: 'UNIQUE', classification: 'TYPE', description: 'Instructor credentials', exampleValue: 'Industry experts', priority: 'medium' },
    { relation: 'requires_prerequisite', category: 'COMMON', classification: 'PROCESS', description: 'Prerequisites', exampleValue: 'Basic Python', priority: 'medium' },
    { relation: 'accredited_by', category: 'RARE', classification: 'SPECIFICATION', description: 'Accreditation body', exampleValue: 'ABET', priority: 'low' },
  ],
  'real-estate': [
    { relation: 'has_price', category: 'ROOT', classification: 'SPECIFICATION', description: 'Property price', exampleValue: '$450,000', priority: 'high' },
    { relation: 'has_sqft', category: 'ROOT', classification: 'SPECIFICATION', description: 'Square footage', exampleValue: '2,500 sq ft', priority: 'high' },
    { relation: 'has_bedrooms', category: 'ROOT', classification: 'SPECIFICATION', description: 'Number of bedrooms', exampleValue: '4', priority: 'high' },
    { relation: 'located_in', category: 'ROOT', classification: 'SPECIFICATION', description: 'Location/neighborhood', exampleValue: 'Downtown', priority: 'high' },
    { relation: 'has_amenity', category: 'UNIQUE', classification: 'COMPONENT', description: 'Property amenities', exampleValue: 'Pool, Gym', priority: 'medium' },
    { relation: 'built_in', category: 'COMMON', classification: 'SPECIFICATION', description: 'Year built', exampleValue: '2020', priority: 'medium' },
    { relation: 'has_hoa', category: 'RARE', classification: 'SPECIFICATION', description: 'HOA fees', exampleValue: '$200/month', priority: 'low' },
  ],
  'travel': [
    { relation: 'located_in', category: 'ROOT', classification: 'SPECIFICATION', description: 'Destination location', exampleValue: 'Paris, France', priority: 'high' },
    { relation: 'has_rating', category: 'UNIQUE', classification: 'SPECIFICATION', description: 'Star rating', exampleValue: '5-star', priority: 'high' },
    { relation: 'offers_amenity', category: 'UNIQUE', classification: 'COMPONENT', description: 'Amenities offered', exampleValue: 'Free WiFi, Pool', priority: 'medium' },
    { relation: 'price_per_night', category: 'ROOT', classification: 'SPECIFICATION', description: 'Nightly rate', exampleValue: '$150', priority: 'high' },
    { relation: 'near_attraction', category: 'UNIQUE', classification: 'COMPONENT', description: 'Nearby attractions', exampleValue: 'Eiffel Tower', priority: 'medium' },
    { relation: 'best_season', category: 'RARE', classification: 'SPECIFICATION', description: 'Best time to visit', exampleValue: 'Spring', priority: 'low' },
  ],
  'food-beverage': [
    { relation: 'has_calories', category: 'ROOT', classification: 'SPECIFICATION', description: 'Calorie content', exampleValue: '250 kcal', priority: 'high' },
    { relation: 'contains_ingredient', category: 'ROOT', classification: 'COMPONENT', description: 'Ingredients', exampleValue: 'Organic oats', priority: 'high' },
    { relation: 'is_dietary', category: 'UNIQUE', classification: 'TYPE', description: 'Dietary classification', exampleValue: 'Vegan, Gluten-free', priority: 'high' },
    { relation: 'has_allergen', category: 'RARE', classification: 'RISK', description: 'Allergen warnings', exampleValue: 'Contains nuts', priority: 'high' },
    { relation: 'serving_size', category: 'COMMON', classification: 'SPECIFICATION', description: 'Portion size', exampleValue: '100g', priority: 'medium' },
    { relation: 'origin_country', category: 'UNIQUE', classification: 'SPECIFICATION', description: 'Country of origin', exampleValue: 'Italy', priority: 'low' },
  ],
  'general': [
    { relation: 'is_a', category: 'ROOT', classification: 'TYPE', description: 'Entity type', exampleValue: 'Service', priority: 'high' },
    { relation: 'has_feature', category: 'UNIQUE', classification: 'COMPONENT', description: 'Key features', exampleValue: 'Automated', priority: 'high' },
    { relation: 'benefits_user', category: 'UNIQUE', classification: 'BENEFIT', description: 'User benefits', exampleValue: 'Saves time', priority: 'medium' },
    { relation: 'costs', category: 'ROOT', classification: 'SPECIFICATION', description: 'Price/cost', exampleValue: 'From $10', priority: 'medium' },
    { relation: 'available_at', category: 'COMMON', classification: 'SPECIFICATION', description: 'Availability', exampleValue: 'Online', priority: 'low' },
  ],
};

/**
 * Detect industry type from business info
 */
export const detectIndustryType = (businessInfo: BusinessInfo): IndustryType => {
  const text = [
    businessInfo.industry,
    businessInfo.valueProp,
    businessInfo.model,
    businessInfo.projectName,
    businessInfo.websiteType
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('e-commerce') || text.includes('shop') || text.includes('store') || text.includes('retail') || text.includes('product')) {
    return 'e-commerce';
  }
  if (text.includes('saas') || text.includes('software') || text.includes('app') || text.includes('platform') || text.includes('tool')) {
    return 'saas';
  }
  if (text.includes('blog') || text.includes('content') || text.includes('news') || text.includes('magazine') || text.includes('media')) {
    return 'publisher';
  }
  if (text.includes('local') || text.includes('plumber') || text.includes('electrician') || text.includes('contractor') || text.includes('repair')) {
    return 'local-service';
  }
  if (text.includes('b2b') || text.includes('enterprise') || text.includes('business') || text.includes('corporate')) {
    return 'b2b';
  }
  if (text.includes('health') || text.includes('medical') || text.includes('clinic') || text.includes('doctor') || text.includes('pharma')) {
    return 'healthcare';
  }
  if (text.includes('finance') || text.includes('bank') || text.includes('invest') || text.includes('insurance') || text.includes('loan')) {
    return 'finance';
  }
  if (text.includes('education') || text.includes('course') || text.includes('learn') || text.includes('school') || text.includes('university')) {
    return 'education';
  }
  if (text.includes('real estate') || text.includes('property') || text.includes('home') || text.includes('apartment') || text.includes('house')) {
    return 'real-estate';
  }
  if (text.includes('travel') || text.includes('hotel') || text.includes('flight') || text.includes('vacation') || text.includes('tourism')) {
    return 'travel';
  }
  if (text.includes('food') || text.includes('restaurant') || text.includes('recipe') || text.includes('beverage') || text.includes('drink')) {
    return 'food-beverage';
  }

  return 'general';
};

/**
 * Get predicate suggestions for an industry
 */
export const getPredicateSuggestions = (
  industryType: IndustryType,
  priorityFilter?: 'high' | 'medium' | 'low'
): PredicateSuggestion[] => {
  const suggestions = INDUSTRY_PREDICATES[industryType] || INDUSTRY_PREDICATES['general'];

  if (priorityFilter) {
    return suggestions.filter(s => s.priority === priorityFilter);
  }

  return suggestions;
};

/**
 * Get missing predicates based on existing EAVs
 */
export const getMissingPredicates = (
  existingEavs: SemanticTriple[],
  industryType: IndustryType
): PredicateSuggestion[] => {
  const existingRelations = new Set(
    existingEavs.map(eav => eav.predicate?.relation?.toLowerCase())
  );

  const suggestions = INDUSTRY_PREDICATES[industryType] || INDUSTRY_PREDICATES['general'];

  return suggestions.filter(suggestion =>
    !existingRelations.has(suggestion.relation.toLowerCase())
  );
};

/**
 * Get high-priority missing predicates
 */
export const getHighPriorityMissing = (
  existingEavs: SemanticTriple[],
  industryType: IndustryType
): PredicateSuggestion[] => {
  return getMissingPredicates(existingEavs, industryType)
    .filter(s => s.priority === 'high');
};

/**
 * Generate EAV template for a predicate suggestion
 */
export const generateEavTemplate = (
  suggestion: PredicateSuggestion,
  centralEntity: string
): Partial<SemanticTriple> => {
  return {
    subject: {
      label: centralEntity,
      type: 'Entity'
    },
    predicate: {
      relation: suggestion.relation,
      type: 'Property',
      category: suggestion.category,
      classification: suggestion.classification
    },
    object: {
      value: '',  // To be filled by user or AI
      type: 'Value'
    }
  };
};

/**
 * Calculate EAV coverage score for an industry
 */
export const calculateIndustryCoverage = (
  existingEavs: SemanticTriple[],
  industryType: IndustryType
): {
  score: number;
  covered: number;
  total: number;
  highPriorityCovered: number;
  highPriorityTotal: number;
} => {
  const suggestions = INDUSTRY_PREDICATES[industryType] || INDUSTRY_PREDICATES['general'];
  const existingRelations = new Set(
    existingEavs.map(eav => eav.predicate?.relation?.toLowerCase())
  );

  const covered = suggestions.filter(s =>
    existingRelations.has(s.relation.toLowerCase())
  ).length;

  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
  const highPriorityCovered = highPrioritySuggestions.filter(s =>
    existingRelations.has(s.relation.toLowerCase())
  ).length;

  return {
    score: Math.round((covered / suggestions.length) * 100),
    covered,
    total: suggestions.length,
    highPriorityCovered,
    highPriorityTotal: highPrioritySuggestions.length
  };
};

export default {
  detectIndustryType,
  getPredicateSuggestions,
  getMissingPredicates,
  getHighPriorityMissing,
  generateEavTemplate,
  calculateIndustryCoverage
};
