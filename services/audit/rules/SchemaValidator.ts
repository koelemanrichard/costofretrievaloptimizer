/**
 * SchemaValidator
 *
 * Validates JSON-LD structured data for semantic SEO best practices.
 * Checks schema about vs mentions separation, @graph consolidation,
 * content parity between markup and visible text, and ImageObject licensing.
 *
 * Rules implemented:
 *   285 - about vs mentions: about should reference primary entity, mentions for secondary
 *   286 - @graph consolidation: single @graph array, resolved @id references, no duplicates
 *   287 - Content parity: schema facts (name, description, datePublished) must match visible HTML
 *   288 - ImageObject licensing: acquireLicensePage and license properties on ImageObject
 */

export interface SchemaIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  currentValue?: string;
  exampleFix?: string;
}

export class SchemaValidator {
  validate(html: string): SchemaIssue[] {
    const issues: SchemaIssue[] = [];
    const schemas = this.extractSchemas(html);

    if (schemas.length === 0) {
      // No schemas to validate; MetaValidator already flags missing JSON-LD
      return issues;
    }

    this.checkAboutVsMentions(schemas, issues);       // Rule 285
    this.checkGraphConsolidation(schemas, issues);     // Rule 286
    this.checkContentParity(schemas, html, issues);    // Rule 287
    this.checkImageObjectLicensing(schemas, issues);   // Rule 288

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Schema extraction helper
  // ---------------------------------------------------------------------------

  /**
   * Extract and parse all JSON-LD blocks from the HTML.
   * Returns an array of successfully parsed schema objects.
   */
  private extractSchemas(html: string): object[] {
    const schemaRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const schemas: object[] = [];
    let match;
    while ((match = schemaRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        schemas.push(parsed);
      } catch {
        // Skip invalid JSON; MetaValidator rule-284 already catches this
      }
    }
    return schemas;
  }

  /**
   * Collect all schema items across all JSON-LD blocks, flattening @graph arrays.
   */
  private collectAllItems(schemas: object[]): any[] {
    const items: any[] = [];
    for (const schema of schemas) {
      const s = schema as any;
      if (s['@graph'] && Array.isArray(s['@graph'])) {
        items.push(...s['@graph']);
      } else if (s['@type']) {
        items.push(s);
      }
    }
    return items;
  }

  // ---------------------------------------------------------------------------
  // Rule 285: about vs mentions — about should reference the primary entity,
  // mentions should reference secondary entities. Both should be present in
  // Article and WebPage schemas.
  // ---------------------------------------------------------------------------

  checkAboutVsMentions(schemas: object[], issues: SchemaIssue[]): void {
    const items = this.collectAllItems(schemas);

    const contentItems = items.filter((item: any) =>
      ['Article', 'BlogPosting', 'NewsArticle', 'TechArticle', 'WebPage'].includes(item['@type'])
    );

    if (contentItems.length === 0) return;

    for (const item of contentItems) {
      const type = (item as any)['@type'];
      const hasAbout = !!(item as any).about;
      const hasMentions = !!(item as any).mentions;

      if (!hasAbout && !hasMentions) {
        issues.push({
          ruleId: 'rule-285',
          severity: 'medium',
          title: `${type} missing both "about" and "mentions" properties`,
          description:
            `The ${type} schema has neither an "about" nor a "mentions" property. ` +
            'The "about" property should reference the primary entity (the page\'s main topic), ' +
            'while "mentions" should list secondary entities discussed on the page. ' +
            'These properties help search engines understand entity relationships.',
          affectedElement: `${type} schema`,
          exampleFix:
            '"about": [{"@type": "Thing", "name": "Primary Topic", "sameAs": "https://en.wikipedia.org/wiki/..."}], ' +
            '"mentions": [{"@type": "Thing", "name": "Secondary Topic"}]',
        });
      } else if (!hasAbout) {
        issues.push({
          ruleId: 'rule-285-no-about',
          severity: 'medium',
          title: `${type} missing "about" property for primary entity`,
          description:
            `The ${type} schema does not include an "about" property. ` +
            'The "about" property should reference the primary entity — the main topic of the page. ' +
            'Without it, search engines cannot distinguish the primary topic from secondary mentions.',
          affectedElement: `${type} schema`,
          exampleFix:
            '"about": {"@type": "Thing", "name": "Primary Topic", "sameAs": "https://en.wikipedia.org/wiki/..."}',
        });
      } else if (!hasMentions) {
        issues.push({
          ruleId: 'rule-285-no-mentions',
          severity: 'low',
          title: `${type} missing "mentions" property for secondary entities`,
          description:
            `The ${type} schema has an "about" property but no "mentions" property. ` +
            'Adding "mentions" for secondary entities discussed on the page improves ' +
            'entity disambiguation and strengthens the knowledge graph signal.',
          affectedElement: `${type} schema`,
          exampleFix:
            '"mentions": [{"@type": "Thing", "name": "Related Topic"}, {"@type": "Organization", "name": "Example Corp"}]',
        });
      } else {
        // Both exist — check that about references primary (not an array of many items)
        // and mentions references secondary entities
        this.validateAboutMentionsSeparation(item, type, issues);
      }
    }
  }

  /**
   * When both about and mentions are present, verify that:
   * - "about" is focused (ideally 1-2 primary entities, not a long list)
   * - "about" and "mentions" do not overlap (same entity in both)
   */
  private validateAboutMentionsSeparation(item: any, type: string, issues: SchemaIssue[]): void {
    const about = Array.isArray(item.about) ? item.about : [item.about];
    const mentions = Array.isArray(item.mentions) ? item.mentions : [item.mentions];

    // Flag if about has too many entities (suggests primary/secondary confusion)
    if (about.length > 3) {
      issues.push({
        ruleId: 'rule-285-about-unfocused',
        severity: 'low',
        title: `${type} "about" property references too many entities (${about.length})`,
        description:
          `The "about" property in the ${type} schema contains ${about.length} entities. ` +
          'The "about" property should reference only the primary entity (1-2 items). ' +
          'Move secondary entities to the "mentions" property instead.',
        affectedElement: `${type} schema "about"`,
        currentValue: `${about.length} entities in "about"`,
        exampleFix:
          'Keep only the primary entity in "about" and move the rest to "mentions".',
      });
    }

    // Check for overlapping entities between about and mentions
    const aboutNames = new Set(
      about
        .filter((a: any) => a && typeof a === 'object')
        .map((a: any) => (a.name || a['@id'] || '').toLowerCase())
        .filter((n: string) => n)
    );
    const overlapping = mentions
      .filter((m: any) => m && typeof m === 'object')
      .filter((m: any) => {
        const name = (m.name || m['@id'] || '').toLowerCase();
        return name && aboutNames.has(name);
      });

    if (overlapping.length > 0) {
      const names = overlapping.map((o: any) => o.name || o['@id']).join(', ');
      issues.push({
        ruleId: 'rule-285-overlap',
        severity: 'low',
        title: `Duplicate entities in both "about" and "mentions"`,
        description:
          `The following entities appear in both "about" and "mentions": ${names}. ` +
          'An entity should be in "about" (primary) OR "mentions" (secondary), not both.',
        affectedElement: `${type} schema`,
        currentValue: names,
        exampleFix:
          'Remove the duplicate entities from "mentions" since they are already in "about".',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 286: @graph consolidation — all schema entities should be in a single
  // @graph array, each with a resolved @id, and no duplicate @id values.
  // ---------------------------------------------------------------------------

  checkGraphConsolidation(schemas: object[], issues: SchemaIssue[]): void {
    // Check 1: Multiple separate JSON-LD blocks instead of a single @graph
    const blocksWithType = schemas.filter((s: any) => s['@type'] && !s['@graph']);
    const blocksWithGraph = schemas.filter((s: any) => s['@graph']);

    if (blocksWithType.length > 1 && blocksWithGraph.length === 0) {
      issues.push({
        ruleId: 'rule-286',
        severity: 'medium',
        title: 'Multiple separate JSON-LD blocks instead of consolidated @graph',
        description:
          `Found ${blocksWithType.length} separate JSON-LD script blocks without a @graph wrapper. ` +
          'All schema entities should be consolidated into a single JSON-LD block using a @graph array. ' +
          'A consolidated @graph allows entities to cross-reference each other via @id, ' +
          'creating a coherent knowledge graph for search engines.',
        affectedElement: '<script type="application/ld+json">',
        currentValue: `${blocksWithType.length} separate JSON-LD blocks`,
        exampleFix:
          '{"@context": "https://schema.org", "@graph": [{"@type": "Article", "@id": "#article", ...}, {"@type": "Organization", "@id": "#org", ...}]}',
      });
    }

    // Also flag if there are multiple @graph blocks
    if (blocksWithGraph.length > 1) {
      issues.push({
        ruleId: 'rule-286-multiple-graphs',
        severity: 'medium',
        title: 'Multiple @graph blocks found',
        description:
          `Found ${blocksWithGraph.length} separate JSON-LD blocks each with their own @graph array. ` +
          'Consolidate all entities into a single @graph array within one JSON-LD block ' +
          'to ensure proper cross-referencing between entities.',
        affectedElement: '<script type="application/ld+json">',
        currentValue: `${blocksWithGraph.length} @graph blocks`,
        exampleFix:
          'Merge all @graph arrays into a single JSON-LD block.',
      });
    }

    // Check 2: Items within @graph missing @id
    const allItems = this.collectAllItems(schemas);
    const itemsMissingId = allItems.filter((item: any) => item['@type'] && !item['@id']);

    if (itemsMissingId.length > 0) {
      const types = itemsMissingId.map((i: any) => i['@type']).join(', ');
      issues.push({
        ruleId: 'rule-286-missing-id',
        severity: 'medium',
        title: `Schema entities missing @id references (${itemsMissingId.length})`,
        description:
          `${itemsMissingId.length} schema entities lack an @id property: ${types}. ` +
          'Every entity in a @graph should have a unique @id so other entities can reference it. ' +
          'Use URL-based identifiers (e.g., "https://example.com/#article") for resolvable @id values.',
        affectedElement: 'JSON-LD @graph items',
        currentValue: `Missing @id on: ${types}`,
        exampleFix:
          '"@id": "https://example.com/#article" — use the page URL with a fragment identifier.',
      });
    }

    // Check 3: Duplicate @id values
    const ids = allItems
      .filter((item: any) => item['@id'])
      .map((item: any) => item['@id']);
    const idCounts = new Map<string, number>();
    for (const id of ids) {
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }
    const duplicateIds = [...idCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id]) => id);

    if (duplicateIds.length > 0) {
      issues.push({
        ruleId: 'rule-286-duplicate-id',
        severity: 'high',
        title: `Duplicate @id values in schema (${duplicateIds.length})`,
        description:
          `The following @id values appear more than once: ${duplicateIds.join(', ')}. ` +
          'Each @id must be unique within the schema graph. Duplicate @id values cause ' +
          'entity confusion and can break cross-references between schema entities.',
        affectedElement: 'JSON-LD @id',
        currentValue: duplicateIds.join(', '),
        exampleFix:
          'Ensure each entity has a unique @id. Use different fragment identifiers: #article, #author, #publisher, etc.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 287: Content parity — facts stated in schema markup must match
  // visible HTML text. Checks name, headline, description, datePublished.
  // ---------------------------------------------------------------------------

  checkContentParity(schemas: object[], html: string, issues: SchemaIssue[]): void {
    const items = this.collectAllItems(schemas);

    // Strip HTML tags to get visible text
    const visibleText = this.stripHtmlTags(html);

    for (const item of items) {
      const type = (item as any)['@type'];
      if (!type) continue;

      // Check headline / name parity
      const name = (item as any).headline || (item as any).name;
      if (name && typeof name === 'string' && name.length > 3) {
        this.checkFieldInVisibleText(name, 'name/headline', type, visibleText, html, issues);
      }

      // Check description parity
      const description = (item as any).description;
      if (description && typeof description === 'string' && description.length > 10) {
        // For descriptions, check a meaningful substring (first 60 chars) since
        // meta descriptions may differ slightly from visible body text
        this.checkDescriptionParity(description, type, visibleText, html, issues);
      }

      // Check datePublished parity
      const datePublished = (item as any).datePublished;
      if (datePublished && typeof datePublished === 'string') {
        this.checkDateParity(datePublished, type, visibleText, html, issues);
      }
    }
  }

  /**
   * Verify that a schema field value appears in the visible HTML text.
   */
  private checkFieldInVisibleText(
    value: string,
    fieldName: string,
    type: string,
    visibleText: string,
    html: string,
    issues: SchemaIssue[]
  ): void {
    const normalizedValue = value.trim().toLowerCase();
    const normalizedVisible = visibleText.toLowerCase();

    // Check visible text first
    if (normalizedVisible.includes(normalizedValue)) return;

    // Also check if it appears in the raw HTML (e.g., in title tag, meta tags, heading attributes)
    // This accounts for cases where the name appears in <title> or <meta> but not in body text
    const normalizedHtml = html.toLowerCase();
    if (normalizedHtml.includes(normalizedValue)) return;

    issues.push({
      ruleId: 'rule-287',
      severity: 'medium',
      title: `Schema ${fieldName} not found in visible page content`,
      description:
        `The ${type} schema contains ${fieldName} "${value}" which does not appear ` +
        'in the visible HTML text of the page. Schema markup facts should match ' +
        'the visible content to avoid being flagged as misleading structured data. ' +
        'Google may issue a manual action for schema that misrepresents page content.',
      affectedElement: `${type} schema "${fieldName}"`,
      currentValue: value,
      exampleFix:
        `Ensure "${value}" appears in the visible page content, or update the schema to match what is actually displayed.`,
    });
  }

  /**
   * Check that the schema description is substantially reflected in the page content.
   * Uses a substring match approach since descriptions may be abbreviated in schema.
   */
  private checkDescriptionParity(
    description: string,
    type: string,
    visibleText: string,
    html: string,
    issues: SchemaIssue[]
  ): void {
    const normalizedDesc = description.trim().toLowerCase();
    const normalizedVisible = visibleText.toLowerCase();
    const normalizedHtml = html.toLowerCase();

    // Check if the full description or a significant portion appears in the content
    if (normalizedVisible.includes(normalizedDesc) || normalizedHtml.includes(normalizedDesc)) {
      return;
    }

    // Check with a shorter substring (first 50% of the description)
    const substringLength = Math.max(20, Math.floor(normalizedDesc.length * 0.5));
    const descSubstring = normalizedDesc.substring(0, substringLength);

    if (normalizedVisible.includes(descSubstring) || normalizedHtml.includes(descSubstring)) {
      return; // Partial match is acceptable for descriptions
    }

    // Extract significant keywords from description and check overlap
    const descWords = new Set(normalizedDesc.split(/\s+/).filter(w => w.length > 3));
    const visibleWords = new Set(normalizedVisible.split(/\s+/).filter(w => w.length > 3));
    const overlap = [...descWords].filter(w => visibleWords.has(w));
    const overlapRatio = descWords.size > 0 ? overlap.length / descWords.size : 0;

    if (overlapRatio >= 0.5) {
      return; // At least half the significant words match
    }

    issues.push({
      ruleId: 'rule-287-description',
      severity: 'medium',
      title: `Schema description for ${type} does not match visible page content`,
      description:
        `The schema description "${description.substring(0, 80)}..." does not appear to match ` +
        'the visible text on the page. Schema descriptions should accurately reflect the page content. ' +
        'Misleading descriptions may result in rich result removal or manual actions.',
      affectedElement: `${type} schema "description"`,
      currentValue: description.length > 100 ? description.substring(0, 100) + '...' : description,
      exampleFix:
        'Update the schema description to match the content visible to users, such as the meta description or lead paragraph.',
    });
  }

  /**
   * Check that datePublished in schema is reflected somewhere in the visible content.
   * Extracts the date in multiple formats and checks for any match.
   */
  private checkDateParity(
    datePublished: string,
    type: string,
    visibleText: string,
    html: string,
    issues: SchemaIssue[]
  ): void {
    const normalizedVisible = visibleText.toLowerCase();
    const normalizedHtml = html.toLowerCase();

    // Generate possible date format representations
    const dateFormats = this.generateDateFormats(datePublished);

    for (const format of dateFormats) {
      if (normalizedVisible.includes(format.toLowerCase()) || normalizedHtml.includes(format.toLowerCase())) {
        return; // Found a match
      }
    }

    // Also check if the date exists in a <time> element in the HTML
    const timeRegex = new RegExp(`<time[^>]*datetime=["']${datePublished.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    if (timeRegex.test(html)) {
      return; // Date is in a <time> element even if not visually shown
    }

    issues.push({
      ruleId: 'rule-287-date',
      severity: 'low',
      title: `Schema datePublished for ${type} not found in visible content`,
      description:
        `The schema datePublished "${datePublished}" does not appear in the visible page content ` +
        'or in a <time> element. While not always required to be visible, displaying the publication date ' +
        'improves content trust signals and helps users assess content freshness.',
      affectedElement: `${type} schema "datePublished"`,
      currentValue: datePublished,
      exampleFix:
        `Add a visible date on the page (e.g., "Published: ${datePublished}") or use a <time datetime="${datePublished}"> element.`,
    });
  }

  /**
   * Generate multiple date format representations for matching.
   */
  private generateDateFormats(isoDate: string): string[] {
    const formats: string[] = [isoDate];

    try {
      // Extract just the date portion (before T or timezone)
      const datePart = isoDate.split('T')[0];
      formats.push(datePart);

      const parts = datePart.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const monthNames = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'
        ];
        const shortMonthNames = [
          'jan', 'feb', 'mar', 'apr', 'may', 'jun',
          'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
        ];
        const monthIndex = parseInt(month, 10) - 1;
        const dayNum = parseInt(day, 10);

        if (monthIndex >= 0 && monthIndex < 12) {
          // "January 15, 2024"
          formats.push(`${monthNames[monthIndex]} ${dayNum}, ${year}`);
          // "Jan 15, 2024"
          formats.push(`${shortMonthNames[monthIndex]} ${dayNum}, ${year}`);
          // "15 January 2024"
          formats.push(`${dayNum} ${monthNames[monthIndex]} ${year}`);
          // "15 Jan 2024"
          formats.push(`${dayNum} ${shortMonthNames[monthIndex]} ${year}`);
          // "01/15/2024" and "15/01/2024"
          formats.push(`${month}/${day}/${year}`);
          formats.push(`${day}/${month}/${year}`);
        }
      }
    } catch {
      // If date parsing fails, just use the original
    }

    return formats;
  }

  // ---------------------------------------------------------------------------
  // Rule 288: ImageObject licensing — acquireLicensePage and license properties
  // should be present on ImageObject schemas for proper image attribution.
  // ---------------------------------------------------------------------------

  checkImageObjectLicensing(schemas: object[], issues: SchemaIssue[]): void {
    const items = this.collectAllItems(schemas);

    // Also find ImageObject nested within other items (e.g., Article.image)
    const imageObjects = this.findAllImageObjects(items);

    if (imageObjects.length === 0) return;

    for (const img of imageObjects) {
      const hasLicense = !!(img as any).license;
      const hasAcquireLicensePage = !!(img as any).acquireLicensePage;
      const imgUrl = (img as any).url || (img as any).contentUrl || (img as any)['@id'] || 'unknown';
      const imgIdentifier = typeof imgUrl === 'string' && imgUrl.length > 60
        ? imgUrl.substring(0, 60) + '...'
        : imgUrl;

      if (!hasLicense && !hasAcquireLicensePage) {
        issues.push({
          ruleId: 'rule-288',
          severity: 'low',
          title: 'ImageObject missing license and acquireLicensePage properties',
          description:
            `The ImageObject (${imgIdentifier}) lacks both "license" and "acquireLicensePage" properties. ` +
            'Adding these properties enables Google Image Search to display license information, ' +
            'increasing click-through rates and protecting image rights. ' +
            'This is especially important for original photography and illustrations.',
          affectedElement: `ImageObject: ${imgIdentifier}`,
          exampleFix:
            '"license": "https://creativecommons.org/licenses/by/4.0/", ' +
            '"acquireLicensePage": "https://example.com/image-licensing"',
        });
      } else if (!hasLicense) {
        issues.push({
          ruleId: 'rule-288-no-license',
          severity: 'low',
          title: 'ImageObject missing "license" property',
          description:
            `The ImageObject (${imgIdentifier}) has "acquireLicensePage" but no "license" property. ` +
            'The "license" property should contain a URL pointing to the license under which the image ' +
            'is published (e.g., Creative Commons URL or a custom license page).',
          affectedElement: `ImageObject: ${imgIdentifier}`,
          currentValue: `acquireLicensePage: ${(img as any).acquireLicensePage}`,
          exampleFix:
            '"license": "https://creativecommons.org/licenses/by/4.0/"',
        });
      } else if (!hasAcquireLicensePage) {
        issues.push({
          ruleId: 'rule-288-no-acquire',
          severity: 'low',
          title: 'ImageObject missing "acquireLicensePage" property',
          description:
            `The ImageObject (${imgIdentifier}) has "license" but no "acquireLicensePage" property. ` +
            'The "acquireLicensePage" property should link to a page where users can obtain or learn about ' +
            'licensing the image. Google uses this to show a "Licensable" badge in image search results.',
          affectedElement: `ImageObject: ${imgIdentifier}`,
          currentValue: `license: ${(img as any).license}`,
          exampleFix:
            '"acquireLicensePage": "https://example.com/contact-for-licensing"',
        });
      }
    }
  }

  /**
   * Recursively find all ImageObject schema items, including those nested
   * within other schema types (e.g., Article.image, Product.image).
   */
  private findAllImageObjects(items: any[]): any[] {
    const imageObjects: any[] = [];

    function traverse(obj: any): void {
      if (!obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        for (const item of obj) {
          traverse(item);
        }
        return;
      }

      if (obj['@type'] === 'ImageObject') {
        imageObjects.push(obj);
      }

      // Recurse into all object properties
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          traverse(value);
        }
      }
    }

    for (const item of items) {
      traverse(item);
    }

    return imageObjects;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Strip HTML tags and return visible text content.
   * Removes script, style, and noscript blocks entirely before stripping tags.
   */
  private stripHtmlTags(html: string): string {
    let text = html;
    // Remove script, style, noscript blocks
    text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
    // Remove all HTML tags
    text = text.replace(/<[^>]+>/g, ' ');
    // Decode common HTML entities
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, ' ');
    // Collapse whitespace
    text = text.replace(/\s+/g, ' ');
    return text.trim();
  }
}
