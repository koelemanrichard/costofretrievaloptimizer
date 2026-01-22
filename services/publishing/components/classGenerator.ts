/**
 * Component Class Generator
 *
 * Generates final CSS class strings from component definitions and variant selections.
 * Follows the CVA (Class Variance Authority) pattern.
 *
 * @module services/publishing/components/classGenerator
 */

import type { ComponentDefinition, ComponentVariants, ComponentName } from './registry';
import { componentRegistry, getComponentDefinition } from './registry';

// ============================================================================
// TYPES
// ============================================================================

export type VariantSelection<V extends ComponentVariants> = Partial<{
  [K in keyof V]: keyof V[K];
}>;

export interface GeneratedComponent {
  classes: string;
  element: string;
  ariaRole?: string;
  schemaType?: string;
  attributes: Record<string, string>;
}

// ============================================================================
// MAIN CLASS GENERATOR
// ============================================================================

/**
 * Generate final class string from component definition and variant selection
 */
export function generateComponentClasses<V extends ComponentVariants>(
  definition: ComponentDefinition<V>,
  selectedVariants: VariantSelection<V> = {}
): string {
  const classes: string[] = [];

  // Add base classes
  classes.push(definition.baseClasses);

  // Apply variant classes
  for (const [variantKey, variantOptions] of Object.entries(definition.variants)) {
    const selected = selectedVariants[variantKey as keyof V] ??
                     definition.defaultVariants[variantKey as keyof V];

    if (selected && variantOptions[selected as string]) {
      classes.push(variantOptions[selected as string] as string);
    }
  }

  // Apply compound variants
  if (definition.compoundVariants) {
    for (const compound of definition.compoundVariants) {
      const matches = Object.entries(compound.conditions).every(
        ([key, value]) => {
          const selectedValue = selectedVariants[key as keyof V] ??
                               definition.defaultVariants[key as keyof V];
          return selectedValue === value;
        }
      );

      if (matches) {
        classes.push(compound.classes);
      }
    }
  }

  // Filter empty strings and deduplicate
  return [...new Set(classes.filter(Boolean))].join(' ');
}

/**
 * Generate complete component with classes and attributes
 */
export function generateComponent<V extends ComponentVariants>(
  definition: ComponentDefinition<V>,
  selectedVariants: VariantSelection<V> = {},
  additionalClasses?: string
): GeneratedComponent {
  const classes = generateComponentClasses(definition, selectedVariants);

  const attributes: Record<string, string> = {};

  // Add ARIA role if specified
  if (definition.ariaRole) {
    attributes['role'] = definition.ariaRole;
  }

  // Add schema type attributes if specified
  if (definition.schemaType) {
    attributes['itemscope'] = '';
    attributes['itemtype'] = `https://schema.org/${definition.schemaType}`;
  }

  return {
    classes: additionalClasses ? `${classes} ${additionalClasses}` : classes,
    element: definition.semanticElement,
    ariaRole: definition.ariaRole,
    schemaType: definition.schemaType,
    attributes,
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Generate button classes
 */
export function buttonClasses(
  intent: 'primary' | 'secondary' | 'ghost' | 'white' | 'outline' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md'
): string {
  return generateComponentClasses(componentRegistry.button, { intent, size });
}

/**
 * Generate hero classes
 */
export function heroClasses(
  layout: 'centered' | 'split' | 'minimal' | 'asymmetric' | 'full-bleed' = 'centered',
  background: 'gradient' | 'solid' | 'image' | 'image-overlay' = 'gradient'
): string {
  return generateComponentClasses(componentRegistry.hero, { layout, background });
}

/**
 * Generate card classes
 */
export function cardClasses(
  elevation: 'flat' | 'raised' | 'floating' | 'outlined' | 'glass' = 'raised',
  padding: 'compact' | 'normal' | 'spacious' = 'normal'
): string {
  return generateComponentClasses(componentRegistry.card, { elevation, padding });
}

/**
 * Generate timeline classes
 */
export function timelineClasses(
  orientation: 'vertical' | 'horizontal' | 'zigzag' = 'zigzag',
  style: 'numbered' | 'icons' | 'dots' = 'numbered'
): string {
  return generateComponentClasses(componentRegistry.timeline, { orientation, style });
}

/**
 * Generate testimonial classes
 */
export function testimonialClasses(
  layout: 'card' | 'minimal' | 'featured' = 'card'
): string {
  return generateComponentClasses(componentRegistry.testimonial, { layout });
}

/**
 * Generate FAQ classes
 */
export function faqClasses(
  style: 'accordion' | 'cards' | 'simple' = 'accordion'
): string {
  return generateComponentClasses(componentRegistry.faq, { style });
}

/**
 * Generate CTA section classes
 */
export function ctaSectionClasses(
  variant: 'gradient' | 'solid' | 'outlined' | 'bold-contrast' | 'gradient-glow' | 'warm-gradient' = 'gradient'
): string {
  return generateComponentClasses(componentRegistry['cta-section'], { variant });
}

/**
 * Generate key takeaways classes
 */
export function keyTakeawaysClasses(
  style: 'box' | 'cards' | 'numbered' | 'icons' = 'box'
): string {
  return generateComponentClasses(componentRegistry['key-takeaways'], { style });
}

/**
 * Generate benefits grid classes
 */
export function benefitsGridClasses(
  columns: '2' | '3' | '4' = '3',
  style: 'icons' | 'cards' | 'minimal' = 'icons'
): string {
  return generateComponentClasses(componentRegistry['benefits-grid'], { columns, style });
}

/**
 * Generate author box classes
 */
export function authorBoxClasses(
  layout: 'horizontal' | 'vertical' | 'compact' = 'horizontal'
): string {
  return generateComponentClasses(componentRegistry['author-box'], { layout });
}

/**
 * Generate ToC classes
 */
export function tocClasses(
  position: 'sidebar' | 'inline' | 'floating' = 'sidebar'
): string {
  return generateComponentClasses(componentRegistry.toc, { position });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Merge multiple class strings
 */
export function mergeClasses(...classStrings: (string | undefined | null)[]): string {
  return classStrings
    .filter(Boolean)
    .join(' ')
    .split(/\s+/)
    .filter((c, i, arr) => arr.indexOf(c) === i) // Dedupe
    .join(' ');
}

/**
 * Conditionally apply classes
 */
export function conditionalClasses(
  baseClasses: string,
  conditionals: Record<string, boolean>
): string {
  const classes = [baseClasses];

  for (const [className, condition] of Object.entries(conditionals)) {
    if (condition) {
      classes.push(className);
    }
  }

  return classes.join(' ');
}

/**
 * Get available variants for a component
 */
export function getComponentVariants(componentName: ComponentName): {
  name: string;
  options: string[];
  default?: string;
}[] {
  const definition = getComponentDefinition(componentName);

  return Object.entries(definition.variants).map(([name, options]) => ({
    name,
    options: Object.keys(options),
    default: definition.defaultVariants[name] as string | undefined,
  }));
}

/**
 * Validate variant selection against component definition
 */
export function validateVariantSelection<V extends ComponentVariants>(
  definition: ComponentDefinition<V>,
  selection: VariantSelection<V>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [variantKey, selectedOption] of Object.entries(selection)) {
    if (!definition.variants[variantKey]) {
      errors.push(`Unknown variant: ${variantKey}`);
      continue;
    }

    if (selectedOption && !definition.variants[variantKey][selectedOption as string]) {
      errors.push(`Invalid option '${selectedOption}' for variant '${variantKey}'`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate CSS class documentation for a component
 */
export function generateComponentDocs(componentName: ComponentName): string {
  const definition = getComponentDefinition(componentName);
  const lines: string[] = [];

  lines.push(`## ${definition.name}`);
  lines.push('');
  lines.push(definition.description);
  lines.push('');
  lines.push(`**Element:** \`<${definition.semanticElement}>\``);

  if (definition.ariaRole) {
    lines.push(`**ARIA Role:** \`${definition.ariaRole}\``);
  }

  if (definition.schemaType) {
    lines.push(`**Schema.org Type:** \`${definition.schemaType}\``);
  }

  lines.push('');
  lines.push('### Base Classes');
  lines.push(`\`${definition.baseClasses}\``);
  lines.push('');
  lines.push('### Variants');

  for (const [variantName, options] of Object.entries(definition.variants)) {
    lines.push(`#### ${variantName}`);
    const defaultOption = definition.defaultVariants[variantName];

    for (const [optionName, classes] of Object.entries(options)) {
      const isDefault = optionName === defaultOption;
      lines.push(`- **${optionName}**${isDefault ? ' (default)' : ''}: \`${classes}\``);
    }
    lines.push('');
  }

  if (definition.slots && definition.slots.length > 0) {
    lines.push('### Slots');
    for (const slot of definition.slots) {
      lines.push(`- \`${slot}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}
