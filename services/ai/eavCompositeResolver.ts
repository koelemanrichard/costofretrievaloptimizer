// services/ai/eavCompositeResolver.ts

import type { SemanticTriple, AttributeCategory } from '../../types';

/**
 * Composite attribute definitions.
 * A composite attribute is one that should be decomposed into sub-attributes.
 * E.g., "Size" → Height, Width, Depth
 */
interface CompositeDefinition {
  /** The composite attribute name */
  composite: string;
  /** Sub-attributes it decomposes into */
  components: string[];
  /** Optional: unit type expected */
  unit?: string;
}

/**
 * Derived attribute definitions.
 * A derived attribute can be computed from other attributes.
 * E.g., Age derived from Birthdate
 */
interface DerivedDefinition {
  /** The derived attribute name */
  derived: string;
  /** Source attributes needed for derivation */
  sources: string[];
  /** Description of how it's derived */
  derivation: string;
}

/**
 * Validation metadata for an attribute value.
 */
export interface ValidationMetadata {
  /** Expected data type */
  type: 'number' | 'string' | 'date' | 'boolean' | 'enum';
  /** Valid range for numeric values */
  range?: { min?: number; max?: number };
  /** Valid enum values */
  allowedValues?: string[];
  /** Unit of measurement */
  unit?: string;
  /** Source/authority for truth values */
  source?: string;
}

const COMPOSITE_DEFINITIONS: CompositeDefinition[] = [
  { composite: 'size', components: ['height', 'width', 'depth'], unit: 'measurement' },
  { composite: 'dimensions', components: ['height', 'width', 'depth', 'weight'], unit: 'measurement' },
  { composite: 'location', components: ['city', 'state', 'country', 'latitude', 'longitude'] },
  { composite: 'address', components: ['street', 'city', 'state', 'zip code', 'country'] },
  { composite: 'contact', components: ['phone', 'email', 'website', 'social media'] },
  { composite: 'price', components: ['base price', 'currency', 'tax', 'discount'] },
  { composite: 'nutrition', components: ['calories', 'protein', 'fat', 'carbohydrates', 'fiber'] },
  { composite: 'performance', components: ['speed', 'throughput', 'latency', 'accuracy'] },
  { composite: 'color', components: ['hue', 'saturation', 'brightness'] },
  { composite: 'name', components: ['first name', 'last name', 'title'] },
];

const DERIVED_DEFINITIONS: DerivedDefinition[] = [
  { derived: 'age', sources: ['birthdate', 'date of birth', 'born'], derivation: 'Current year minus birth year' },
  { derived: 'bmi', sources: ['height', 'weight'], derivation: 'weight(kg) / height(m)²' },
  { derived: 'duration', sources: ['start date', 'end date'], derivation: 'End date minus start date' },
  { derived: 'profit margin', sources: ['revenue', 'cost'], derivation: '(Revenue - Cost) / Revenue × 100%' },
  { derived: 'growth rate', sources: ['current value', 'previous value'], derivation: '(Current - Previous) / Previous × 100%' },
  { derived: 'density', sources: ['mass', 'volume'], derivation: 'Mass / Volume' },
  { derived: 'roi', sources: ['gain', 'cost'], derivation: '(Gain - Cost) / Cost × 100%' },
  { derived: 'per capita', sources: ['total', 'population'], derivation: 'Total / Population' },
];

/**
 * EavCompositeResolver - Resolves composite and derived EAV attributes.
 *
 * Composite: Decomposes high-level attributes into specific sub-attributes.
 * Derived: Identifies attributes that can be computed from other attributes.
 * Validation: Provides metadata for validating attribute values.
 */
export class EavCompositeResolver {
  /**
   * Check if an attribute is a composite that should be decomposed.
   * Returns component attributes if found.
   */
  static resolveComposite(attribute: string): CompositeDefinition | null {
    const lower = attribute.toLowerCase().trim();
    return COMPOSITE_DEFINITIONS.find(d => d.composite === lower) || null;
  }

  /**
   * Check if an attribute can be derived from other attributes.
   */
  static resolveDerived(attribute: string): DerivedDefinition | null {
    const lower = attribute.toLowerCase().trim();
    return DERIVED_DEFINITIONS.find(d => d.derived === lower) || null;
  }

  /**
   * Expand composite EAVs into their component sub-attributes.
   * Returns original triples plus expanded component triples.
   */
  static expandComposites(triples: SemanticTriple[]): {
    expanded: SemanticTriple[];
    additions: SemanticTriple[];
  } {
    const additions: SemanticTriple[] = [];

    for (const triple of triples) {
      const attribute = triple.predicate?.relation || '';
      const composite = this.resolveComposite(attribute);

      if (composite) {
        for (const component of composite.components) {
          // Check if this component already exists
          const exists = triples.some(t =>
            t.subject?.label === triple.subject?.label &&
            t.predicate?.relation?.toLowerCase() === component
          );

          if (!exists) {
            additions.push({
              subject: { ...triple.subject },
              predicate: {
                relation: component,
                type: triple.predicate?.type || 'attribute',
                category: triple.predicate?.category,
              },
              object: {
                value: `[Specify ${component}]`,
                type: 'value',
              },
            });
          }
        }
      }
    }

    return {
      expanded: [...triples, ...additions],
      additions,
    };
  }

  /**
   * Identify derivable attributes from existing EAVs.
   * Returns suggestions for attributes that could be derived.
   */
  static identifyDerivable(triples: SemanticTriple[]): {
    derivable: DerivedDefinition[];
    suggestions: string[];
  } {
    const attributes = new Set(
      triples.map(t => (t.predicate?.relation || '').toLowerCase())
    );

    const derivable: DerivedDefinition[] = [];
    const suggestions: string[] = [];

    for (const def of DERIVED_DEFINITIONS) {
      // Check if source attributes are present
      const hasSource = def.sources.some(s => attributes.has(s));
      // Check if derived attribute is NOT already present
      const hasDerived = attributes.has(def.derived);

      if (hasSource && !hasDerived) {
        derivable.push(def);
        suggestions.push(
          `Consider adding "${def.derived}" attribute (derivable from ${def.sources.join(', ')})`
        );
      }
    }

    return { derivable, suggestions };
  }

  /**
   * Get validation metadata for an attribute.
   */
  static getValidationMetadata(attribute: string): ValidationMetadata | null {
    const lower = attribute.toLowerCase().trim();

    // Common attribute validation rules
    const VALIDATION_MAP: Record<string, ValidationMetadata> = {
      'age': { type: 'number', range: { min: 0, max: 200 }, unit: 'years' },
      'height': { type: 'number', range: { min: 0 }, unit: 'cm or ft/in' },
      'weight': { type: 'number', range: { min: 0 }, unit: 'kg or lbs' },
      'price': { type: 'number', range: { min: 0 }, unit: 'currency' },
      'year': { type: 'number', range: { min: 1000, max: 2100 } },
      'percentage': { type: 'number', range: { min: 0, max: 100 }, unit: '%' },
      'temperature': { type: 'number', range: { min: -273 }, unit: '°C or °F' },
      'rating': { type: 'number', range: { min: 0, max: 10 } },
      'url': { type: 'string' },
      'email': { type: 'string' },
      'date': { type: 'date' },
      'color': { type: 'string' },
      'country': { type: 'string' },
      'language': { type: 'string' },
      'gender': { type: 'enum', allowedValues: ['male', 'female', 'non-binary', 'other'] },
      'status': { type: 'enum', allowedValues: ['active', 'inactive', 'deprecated', 'pending'] },
    };

    return VALIDATION_MAP[lower] || null;
  }

  /**
   * Validate an EAV value against its metadata.
   */
  static validateValue(
    attribute: string,
    value: string
  ): { valid: boolean; issues: string[] } {
    const meta = this.getValidationMetadata(attribute);
    if (!meta) return { valid: true, issues: [] };

    const issues: string[] = [];

    switch (meta.type) {
      case 'number': {
        const num = parseFloat(value);
        if (isNaN(num)) {
          issues.push(`Expected numeric value for "${attribute}", got "${value}"`);
        } else {
          if (meta.range?.min !== undefined && num < meta.range.min) {
            issues.push(`Value ${num} below minimum ${meta.range.min} for "${attribute}"`);
          }
          if (meta.range?.max !== undefined && num > meta.range.max) {
            issues.push(`Value ${num} above maximum ${meta.range.max} for "${attribute}"`);
          }
        }
        break;
      }
      case 'enum': {
        if (meta.allowedValues && !meta.allowedValues.includes(value.toLowerCase())) {
          issues.push(`Invalid value "${value}" for "${attribute}". Allowed: ${meta.allowedValues.join(', ')}`);
        }
        break;
      }
    }

    return { valid: issues.length === 0, issues };
  }
}
