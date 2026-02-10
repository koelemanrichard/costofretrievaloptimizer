
import { BaseStrategy } from './BaseStrategy';
import { SEOPillars, SemanticTriple, EnrichedTopic, ContentBrief, ResponseCode, KnowledgeGraph, ExpansionMode } from '../../../types';
import type { CategoryPageContext } from '../../../types/catalog';

export class EcommerceStrategy extends BaseStrategy {

    /**
     * Optional catalog data injected before prompt generation.
     * When set, prompts include real product/category information.
     */
    private catalogContext?: {
        categoryNames: string[];
        productTypes: string[];
    };

    /**
     * Set catalog context for this strategy instance.
     * Called when a catalog exists for the map before generation.
     */
    setCatalogContext(categoryNames: string[], productTypes: string[]) {
        this.catalogContext = { categoryNames, productTypes };
    }

    getInitialMapPrompt(pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string {
        const basePrompt = super.getInitialMapPrompt(pillars, eavs, competitors);
        const catalogSection = this.catalogContext
            ? `\n\n**PRODUCT CATALOG DATA:**
The store has ${this.catalogContext.categoryNames.length} categories: ${this.catalogContext.categoryNames.join(', ')}.
Product types include: ${this.catalogContext.productTypes.join(', ')}.
Align topics with these real store categories. Each category should have a corresponding topic.`
            : '';

        return `${basePrompt}

        **STRATEGY OVERRIDE: E-COMMERCE MODEL**
        - **Hierarchy:** Enforce a strict 'Category -> Product Line -> Product' hierarchy.
        - **Spoke Logic:** For every Product/Category Core Topic, spokes MUST include 'Buying Guide', 'Comparison', 'Review', and 'Maintenance/Care'.
        - **Attributes:** Ensure topics cover physical dimensions (Size, Material) and transactional concerns (Warranty, Shipping).
        ${catalogSection}`;
    }

    getBriefPrompt(topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, responseCode: ResponseCode): string {
        const basePrompt = super.getBriefPrompt(topic, allTopics, pillars, kg, responseCode);
        return `${basePrompt}

        **STRATEGY OVERRIDE: E-COMMERCE (LIFT MODEL)**
        - **Structure:** Prioritize the **Value Proposition** and **Urgency**.
        - **Conversion:** The section immediately following the definition MUST be the 'Buying Context' (Price, Availability, CTA).
        - **Visuals:** Request 'Product Diagram', 'Size Chart', or 'Comparison Matrix' in visual_semantics.
        - **Linking:** Enforce Ontology linking: Link from 'Material' (Attribute) pages to specific 'Product' pages.
        `;
    }

    getEavPrompt(pillars: SEOPillars): string {
        const basePrompt = super.getEavPrompt(pillars);
        return `${basePrompt}

        **STRATEGY OVERRIDE: E-COMMERCE ATTRIBUTES**
        - **Dominant Attribute:** 'Price' / 'Value' is the central pivot.
        - **Required Classifications:**
            - **CORE_DEFINITION:** Product Type, Material, Brand.
            - **SEARCH_DEMAND:** Price, Discount, Review Score, Shipping Time.
            - **COMPOSITE:** Dimensions (LxWxH), Weight.
        `;
    }
}

/**
 * Build a category-aware brief prompt supplement.
 * Appended to the brief prompt when a topic has linked category page context.
 */
export function buildCategoryContextPrompt(ctx: CategoryPageContext): string {
    const lines: string[] = [
        '\n\n**CATEGORY PAGE CONTEXT (Real Product Data):**',
        `Category: ${ctx.categoryName}`,
        `Total Products: ${ctx.totalProductCount}`,
    ];

    if (ctx.priceRange) {
        lines.push(`Price Range: ${ctx.priceRange.currency} ${ctx.priceRange.min.toFixed(2)} - ${ctx.priceRange.max.toFixed(2)}`);
    }

    if (ctx.subcategories.length > 0) {
        lines.push(`Subcategories: ${ctx.subcategories.map(s => `${s.name} (${s.productCount})`).join(', ')}`);
    }

    if (ctx.products.length > 0) {
        lines.push('\n**Top Products:**');
        for (const p of ctx.products.slice(0, 10)) {
            const details = [p.name];
            if (p.brand) details.push(`by ${p.brand}`);
            if (p.price) details.push(`${p.currency || 'USD'} ${p.price.toFixed(2)}`);
            if (p.rating) details.push(`${p.rating}/5 (${p.reviewCount || 0} reviews)`);
            lines.push(`- ${details.join(' | ')}`);
        }

        // Extract common attribute keys for buying guide
        const attrKeys = new Map<string, number>();
        for (const p of ctx.products) {
            for (const key of Object.keys(p.attributes)) {
                attrKeys.set(key, (attrKeys.get(key) || 0) + 1);
            }
        }
        const commonAttrs = [...attrKeys.entries()]
            .filter(([, count]) => count >= 3)
            .map(([key]) => key);

        if (commonAttrs.length > 0) {
            lines.push(`\nCommon product attributes (use for buying guide criteria): ${commonAttrs.join(', ')}`);
        }
    }

    if (ctx.isSketchMode) {
        lines.push('\n**NOTE:** This is sketch mode data. Some products lack real URLs and prices. Generate content structure that can be filled once the store is live. Use estimated/placeholder language where real data is missing.');
    }

    lines.push('\n**INSTRUCTIONS:** Use this real product data to ground the content. Reference actual product names, real prices, and real attributes. Do NOT make up products that don\'t exist in this list.');

    return lines.join('\n');
}
