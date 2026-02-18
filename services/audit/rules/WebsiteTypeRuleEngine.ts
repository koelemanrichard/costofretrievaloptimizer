/**
 * WebsiteTypeRuleEngine
 *
 * Applies audit rules specific to the detected website type.
 * Each website type has a distinct set of expectations for schema markup,
 * content structure, and required elements.
 *
 * Website types supported:
 *   ecommerce      (rules 400-410)
 *   saas           (rules 411-420)
 *   b2b            (rules 421-425)
 *   blog           (rules 426-432)
 *   local-business (rules 433-437)
 *   other          (no type-specific rules)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebsiteType =
  | 'ecommerce'
  | 'saas'
  | 'b2b'
  | 'blog'
  | 'local-business'
  | 'other';

export interface WebsiteTypeInput {
  websiteType: WebsiteType;
  html: string;
  text?: string;
  url?: string;
  schemaTypes?: string[];
}

export interface WebsiteTypeIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class WebsiteTypeRuleEngine {
  validate(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    switch (input.websiteType) {
      case 'ecommerce':
        return this.validateEcommerce(input);
      case 'saas':
        return this.validateSaas(input);
      case 'b2b':
        return this.validateB2b(input);
      case 'blog':
        return this.validateBlog(input);
      case 'local-business':
        return this.validateLocalBusiness(input);
      case 'other':
      default:
        return [];
    }
  }

  // -----------------------------------------------------------------------
  // E-commerce (rules 400-410)
  // -----------------------------------------------------------------------

  private validateEcommerce(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 400: Product schema present
    if (!schemas.some((s) => s === 'Product')) {
      issues.push({
        ruleId: 'rule-400',
        severity: 'critical',
        title: 'Missing Product schema',
        description:
          'E-commerce pages should include JSON-LD with "@type": "Product" for rich results.',
        exampleFix:
          'Add a JSON-LD script block with "@type": "Product" including name, image, offers.',
      });
    }

    // Rule 401: Price info present
    if (!this.hasPriceInfo(html, schemas)) {
      issues.push({
        ruleId: 'rule-401',
        severity: 'high',
        title: 'No price information found',
        description:
          'Product pages should clearly display price information in the content or schema.',
        exampleFix:
          'Include visible price and/or Offer schema with price and priceCurrency.',
      });
    }

    // Rule 402: Availability stated
    if (!this.hasAvailability(html)) {
      issues.push({
        ruleId: 'rule-402',
        severity: 'medium',
        title: 'No availability information',
        description:
          'Product availability (in stock, out of stock, pre-order) should be clearly stated.',
        affectedElement: 'product availability',
        exampleFix:
          'Add availability text ("In Stock", "Out of Stock") or schema.org availability property.',
      });
    }

    // Rule 403: Product images exist
    if (!this.hasMultipleImages(html)) {
      issues.push({
        ruleId: 'rule-403',
        severity: 'medium',
        title: 'Insufficient product images',
        description:
          'Product pages benefit from multiple images showing different angles or use cases.',
        exampleFix:
          'Add at least 2 product images with descriptive alt text.',
      });
    }

    // Enhanced: E-commerce LIFT model and 4-pillar money page
    issues.push(...this.validateEcommerceLift(input));

    return issues;
  }

  // -----------------------------------------------------------------------
  // SaaS (rules 411-420)
  // -----------------------------------------------------------------------

  private validateSaas(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;

    // Rule 411: Feature comparison present
    if (!this.hasComparisonTable(html)) {
      issues.push({
        ruleId: 'rule-411',
        severity: 'medium',
        title: 'No feature comparison table',
        description:
          'SaaS pages benefit from comparison tables that differentiate tiers or competitors.',
        exampleFix:
          'Add a feature comparison table with clear headers and checkmarks or values.',
      });
    }

    // Rule 412: Pricing info present
    if (!this.hasPricingInfo(html)) {
      issues.push({
        ruleId: 'rule-412',
        severity: 'high',
        title: 'No pricing information found',
        description:
          'SaaS pages should include visible pricing or a clear link to a pricing page.',
        exampleFix:
          'Add pricing details, tiers, or a prominent "See Pricing" call-to-action.',
      });
    }

    // Rule 413: Documentation structure
    if (!this.hasDocumentationStructure(html)) {
      issues.push({
        ruleId: 'rule-413',
        severity: 'low',
        title: 'No documentation or code references',
        description:
          'SaaS products benefit from technical documentation signals (code blocks, API references).',
        exampleFix:
          'Include code samples, API endpoints, or links to developer documentation.',
      });
    }

    // Enhanced: SaaS hybrid category strategy
    issues.push(...this.validateSaasHybrid(input));

    return issues;
  }

  // -----------------------------------------------------------------------
  // B2B (rules 421-425)
  // -----------------------------------------------------------------------

  private validateB2b(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 421: Case study / testimonial present
    if (!this.hasCaseStudyOrTestimonial(html)) {
      issues.push({
        ruleId: 'rule-421',
        severity: 'medium',
        title: 'No case studies or testimonials found',
        description:
          'B2B pages should include social proof through case studies, testimonials, or reviews.',
        exampleFix:
          'Add a case study section, customer testimonials, or review quotes with attribution.',
      });
    }

    // Rule 422: Service page schema
    if (!schemas.some((s) => s === 'Service')) {
      issues.push({
        ruleId: 'rule-422',
        severity: 'medium',
        title: 'Missing Service schema',
        description:
          'B2B service pages should include JSON-LD with "@type": "Service" for better search representation.',
        exampleFix:
          'Add a JSON-LD script block with "@type": "Service" including name, description, provider.',
      });
    }

    // Enhanced: B2B augmentation rules
    issues.push(...this.validateB2bAugmentation(input));

    return issues;
  }

  // -----------------------------------------------------------------------
  // Blog (rules 426-432)
  // -----------------------------------------------------------------------

  private validateBlog(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 426: Article schema present
    const hasArticleSchema = schemas.some(
      (s) => s === 'Article' || s === 'BlogPosting' || s === 'NewsArticle',
    );
    if (!hasArticleSchema) {
      issues.push({
        ruleId: 'rule-426',
        severity: 'high',
        title: 'Missing Article schema',
        description:
          'Blog posts should include JSON-LD with "@type": "Article" or "BlogPosting" for rich results.',
        exampleFix:
          'Add a JSON-LD script with "@type": "Article" including headline, datePublished, author.',
      });
    }

    // Rule 427: Author info present
    if (!this.hasAuthorInfo(html)) {
      issues.push({
        ruleId: 'rule-427',
        severity: 'high',
        title: 'No author information found',
        description:
          'Blog posts should identify the author through a byline, author bio, or author schema.',
        exampleFix:
          'Add an author byline with name and link to author page or bio.',
      });
    }

    // Rule 428: Publication date present
    if (!this.hasPublicationDate(html)) {
      issues.push({
        ruleId: 'rule-428',
        severity: 'medium',
        title: 'No publication date found',
        description:
          'Blog posts should display a publication or last-updated date for freshness signals.',
        exampleFix:
          'Add a visible publication date and/or "datePublished" in schema markup.',
      });
    }

    // Rule 429: Category / tags present
    if (!this.hasCategoryOrTags(html)) {
      issues.push({
        ruleId: 'rule-429',
        severity: 'low',
        title: 'No category or tag elements found',
        description:
          'Blog posts benefit from category or tag markup for topical organization and internal linking.',
        exampleFix:
          'Add category links, tag elements, or breadcrumbs to place content in topical context.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Local Business (stub for future expansion)
  // -----------------------------------------------------------------------

  private validateLocalBusiness(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 433: LocalBusiness schema present
    const localBusinessTypes = [
      'LocalBusiness', 'Restaurant', 'Store', 'FoodEstablishment',
      'HealthAndBeautyBusiness', 'LegalService', 'FinancialService',
      'AutomotiveBusiness', 'MedicalBusiness', 'ProfessionalService',
      'HomeAndConstructionBusiness', 'SportsActivityLocation',
      'EntertainmentBusiness', 'DryCleaningOrLaundry', 'Dentist',
      'Physician', 'RealEstateAgent', 'TravelAgency', 'Electrician',
      'Plumber', 'RoofingContractor', 'LodgingBusiness', 'Bakery',
      'BarOrPub', 'CafeOrCoffeeShop',
    ];
    if (!schemas.some(s => localBusinessTypes.includes(s))) {
      issues.push({
        ruleId: 'rule-433',
        severity: 'critical',
        title: 'Missing LocalBusiness schema',
        description:
          'Local business pages should include JSON-LD with "@type": "LocalBusiness" (or a subtype like Restaurant, Store, etc.) for local search visibility.',
        exampleFix:
          'Add a JSON-LD script block with "@type": "LocalBusiness" including name, address, telephone, and openingHours.',
      });
    }

    // Rule 434: NAP consistency — Name, Address, Phone
    const hasName = /"name"\s*:/i.test(html) || /<h1\b/i.test(html);
    const hasAddress = this.hasAddressInfo(html);
    const hasPhone = this.hasPhoneInfo(html);
    const napMissing: string[] = [];
    if (!hasName) napMissing.push('Name');
    if (!hasAddress) napMissing.push('Address');
    if (!hasPhone) napMissing.push('Phone');
    if (napMissing.length > 0) {
      issues.push({
        ruleId: 'rule-434',
        severity: napMissing.length >= 2 ? 'high' : 'medium',
        title: 'Incomplete NAP information',
        description:
          `Missing NAP elements: ${napMissing.join(', ')}. Local businesses must display Name, Address, and Phone number consistently.`,
        affectedElement: napMissing.join(', '),
        exampleFix:
          'Add visible business name, full address, and phone number. Include them in LocalBusiness schema as well.',
      });
    }

    // Rule 435: Location signals — map embed, directions link, or <address> tag
    const hasMapEmbed = /maps\.google\.com|google\.com\/maps|goo\.gl\/maps/i.test(html);
    const hasDirectionsLink = /\b(directions?|get directions|how to get here|find us)\b/i.test(html);
    const hasAddressTag = /<address\b/i.test(html);
    if (!hasMapEmbed && !hasDirectionsLink && !hasAddressTag) {
      issues.push({
        ruleId: 'rule-435',
        severity: 'medium',
        title: 'No location signals found',
        description:
          'Local business pages should include location signals such as an embedded Google Map, a directions link, or an <address> HTML tag.',
        exampleFix:
          'Embed a Google Maps iframe, add a "Get Directions" link, or wrap your address in an <address> HTML tag.',
      });
    }

    // Rule 436: Service area — location-specific content or areaServed in schema
    const hasAreaServed = /"areaServed"\s*:/i.test(html);
    const hasLocationContent = /\b(serving|service area|we serve|available in|located in|our location)\b/i.test(html);
    if (!hasAreaServed && !hasLocationContent) {
      issues.push({
        ruleId: 'rule-436',
        severity: 'low',
        title: 'No service area information',
        description:
          'Local businesses should specify their service area through schema markup (areaServed) or location-specific content.',
        exampleFix:
          'Add "areaServed" to your LocalBusiness schema or include text like "Serving the Greater [City] area".',
      });
    }

    // Rule 437: Opening hours — in schema or visible pattern
    const hasOpeningHoursSchema = /"openingHours"\s*:|"openingHoursSpecification"\s*:/i.test(html);
    const hasHoursPattern = /\b(hours|open|closed|mon|tue|wed|thu|fri|sat|sun)\b.*\d{1,2}[:.]\d{2}/i.test(html);
    const hasHoursKeyword = /\b(opening hours|business hours|hours of operation|store hours)\b/i.test(html);
    if (!hasOpeningHoursSchema && !hasHoursPattern && !hasHoursKeyword) {
      issues.push({
        ruleId: 'rule-437',
        severity: 'medium',
        title: 'No opening hours found',
        description:
          'Local business pages should display opening hours visibly and/or in schema markup for local search and Google Business Profile alignment.',
        exampleFix:
          'Add "openingHours" or "openingHoursSpecification" to your LocalBusiness schema, and display hours visibly on the page.',
      });
    }

    return issues;
  }

  /** Check for address patterns in HTML. */
  private hasAddressInfo(html: string): boolean {
    const hasAddressTag = /<address\b/i.test(html);
    const hasAddressSchema = /"address"\s*:|"streetAddress"\s*:|"postalCode"\s*:/i.test(html);
    const hasAddressItemprop = /itemprop=["']address["']/i.test(html);
    const hasZipPattern = /\b\d{5}(-\d{4})?\b/.test(html); // US ZIP
    const hasPostcodePattern = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(html); // UK postcode
    return hasAddressTag || hasAddressSchema || hasAddressItemprop || hasZipPattern || hasPostcodePattern;
  }

  /** Check for phone number patterns in HTML. */
  private hasPhoneInfo(html: string): boolean {
    const hasPhoneSchema = /"telephone"\s*:/i.test(html);
    const hasPhoneLink = /href=["']tel:/i.test(html);
    const hasPhonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(html);
    const hasPhoneItemprop = /itemprop=["']telephone["']/i.test(html);
    return hasPhoneSchema || hasPhoneLink || hasPhonePattern || hasPhoneItemprop;
  }

  // -----------------------------------------------------------------------
  // Detection helpers
  // -----------------------------------------------------------------------

  /** Extract @type values from JSON-LD script blocks in HTML. */
  private extractSchemaTypes(html: string): string[] {
    const types: string[] = [];
    const scriptRegex =
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1]);
        this.collectTypes(json, types);
      } catch {
        // Ignore malformed JSON-LD
      }
    }
    return types;
  }

  private collectTypes(obj: unknown, types: string[]): void {
    if (Array.isArray(obj)) {
      for (const item of obj) this.collectTypes(item, types);
    } else if (obj && typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      if (typeof record['@type'] === 'string') {
        types.push(record['@type']);
      }
      if (Array.isArray(record['@type'])) {
        for (const t of record['@type']) {
          if (typeof t === 'string') types.push(t);
        }
      }
      if (record['@graph'] && Array.isArray(record['@graph'])) {
        for (const item of record['@graph']) this.collectTypes(item, types);
      }
    }
  }

  /** Check for price patterns in HTML or schema. */
  private hasPriceInfo(html: string, schemas: string[]): boolean {
    const hasPriceInSchema =
      /"price"\s*:/i.test(html) || schemas.includes('Offer');
    const hasPriceText =
      /(\$|€|£|USD|EUR|GBP)\s*\d+|\d+\.\d{2}\s*(USD|EUR|GBP)|\bprice\b/i.test(
        html,
      );
    return hasPriceInSchema || hasPriceText;
  }

  /** Check for availability patterns. */
  private hasAvailability(html: string): boolean {
    return /\b(in\s*stock|out\s*of\s*stock|available|unavailable|pre-?order|back\s*order|availability)\b/i.test(
      html,
    );
  }

  /** Check for multiple product images. */
  private hasMultipleImages(html: string): boolean {
    const imgMatches = html.match(/<img\b/gi);
    return (imgMatches?.length ?? 0) >= 2;
  }

  /** Check for comparison table. */
  private hasComparisonTable(html: string): boolean {
    const hasTable = /<table\b/i.test(html);
    const hasComparisonKeyword =
      /\b(comparison|compare|versus|vs\.?|features?|plan|tier)\b/i.test(html);
    return hasTable && hasComparisonKeyword;
  }

  /** Check for pricing patterns in SaaS context. */
  private hasPricingInfo(html: string): boolean {
    return /\b(pricing|price|plan|tier|monthly|annually|\/mo|\/month|\/year|free\s*trial|subscription)\b/i.test(
      html,
    );
  }

  /** Check for code blocks or API references. */
  private hasDocumentationStructure(html: string): boolean {
    const hasCodeBlock = /<code\b|<pre\b|```/i.test(html);
    const hasApiRef = /\b(API|endpoint|SDK|npm\s+install|import\s+\{)/i.test(
      html,
    );
    return hasCodeBlock || hasApiRef;
  }

  /** Check for case study or testimonial content. */
  private hasCaseStudyOrTestimonial(html: string): boolean {
    return /\b(case\s*study|testimonial|review|client\s*story|success\s*story|customer\s*said|we\s*helped)\b/i.test(
      html,
    );
  }

  /** Check for author identification. */
  private hasAuthorInfo(html: string): boolean {
    const authorMeta = /<meta[^>]+name=["']author["']/i.test(html);
    const authorClass = /class=["'][^"]*author[^"]*["']/i.test(html);
    const authorItemprop = /itemprop=["']author["']/i.test(html);
    const authorRel = /rel=["']author["']/i.test(html);
    const authorSchema = /"author"\s*:/i.test(html);
    const byline = /\b(by|written\s*by|author)\s*:?\s*[A-Z]/i.test(html);
    return (
      authorMeta ||
      authorClass ||
      authorItemprop ||
      authorRel ||
      authorSchema ||
      byline
    );
  }

  /** Check for publication date. */
  private hasPublicationDate(html: string): boolean {
    const dateSchema = /"datePublished"\s*:/i.test(html);
    const dateModified = /"dateModified"\s*:/i.test(html);
    const timeDatetime = /<time[^>]+datetime=/i.test(html);
    const dateClass = /class=["'][^"]*(?:date|published|posted)[^"]*["']/i.test(
      html,
    );
    const datePattern =
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i.test(
        html,
      );
    const isoDate = /\b\d{4}-\d{2}-\d{2}\b/.test(html);
    return (
      dateSchema ||
      dateModified ||
      timeDatetime ||
      dateClass ||
      datePattern ||
      isoDate
    );
  }

  /** Check for category or tag elements. */
  private hasCategoryOrTags(html: string): boolean {
    const categoryClass =
      /class=["'][^"]*(?:category|tag|topic|label|breadcrumb)[^"]*["']/i.test(
        html,
      );
    const categoryRel = /rel=["']tag["']/i.test(html);
    const categoryText =
      /\b(category|categories|tags?|filed\s*under|topics?)\s*:/i.test(html);
    return categoryClass || categoryRel || categoryText;
  }

  // -----------------------------------------------------------------------
  // Enhanced Rules: E-commerce LIFT, SaaS Hybrid, B2B Augmentation,
  // 4-Pillar Money Page, Homepage Validation (Findings #15, #97)
  // -----------------------------------------------------------------------

  /**
   * Validate e-commerce LIFT model (Logo, Index, Featured, Topic ordering).
   * Returns issues for e-commerce pages that don't follow content hierarchy.
   */
  validateEcommerceLift(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;

    // Rule 404: Product page should have breadcrumb (navigation index)
    if (!/<nav\b[^>]*breadcrumb/i.test(html) && !/"BreadcrumbList"/i.test(html)) {
      issues.push({
        ruleId: 'rule-404',
        severity: 'medium',
        title: 'E-commerce LIFT: Missing breadcrumb navigation',
        description: 'Product pages should include breadcrumb navigation (Index element of LIFT model) for category hierarchy.',
        exampleFix: 'Add BreadcrumbList schema and visible breadcrumb navigation above product content.',
      });
    }

    // Rule 405: Featured product info before reviews/related
    const productTitlePos = html.search(/<h1\b/i);
    const reviewSection = html.search(/\b(reviews?|ratings?|customer feedback)\b/i);
    if (productTitlePos > -1 && reviewSection > -1 && reviewSection < productTitlePos) {
      issues.push({
        ruleId: 'rule-405',
        severity: 'medium',
        title: 'E-commerce LIFT: Reviews appear before product info',
        description: 'Product details (Featured content) should appear before reviews and supplementary content per LIFT model.',
        exampleFix: 'Move product title, description, and price above the reviews section.',
      });
    }

    // Rule 406: Money page must have 4 pillars: Value Prop, Social Proof, Objection Handling, CTA
    const hasValueProp = /\b(benefit|advantage|why choose|what you get|features)\b/i.test(html);
    const hasSocialProof = /\b(testimonial|review|rating|case study|trusted by|customers say)\b/i.test(html);
    const hasObjectionHandling = /\b(FAQ|frequently asked|guarantee|refund|return policy|money back)\b/i.test(html);
    const hasCTA = /\b(buy now|add to cart|get started|sign up|subscribe|order now|shop now)\b/i.test(html);

    const pillarsPresent = [hasValueProp, hasSocialProof, hasObjectionHandling, hasCTA].filter(Boolean).length;
    if (pillarsPresent < 3) {
      const missing: string[] = [];
      if (!hasValueProp) missing.push('Value Proposition');
      if (!hasSocialProof) missing.push('Social Proof');
      if (!hasObjectionHandling) missing.push('Objection Handling (FAQ/Guarantee)');
      if (!hasCTA) missing.push('Call-to-Action');
      issues.push({
        ruleId: 'rule-406',
        severity: 'high',
        title: `Money page missing ${4 - pillarsPresent} of 4 pillars`,
        description: `Money pages need 4 pillars: Value Proposition, Social Proof, Objection Handling, and CTA. Missing: ${missing.join(', ')}.`,
        exampleFix: `Add sections for: ${missing.join(', ')}.`,
      });
    }

    return issues;
  }

  /**
   * Validate SaaS hybrid category strategy.
   * SaaS pages often need both informational and transactional elements.
   */
  validateSaasHybrid(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;

    // Rule 414: SaaS pages should blend informational + transactional content
    const hasEducational = /\b(how to|guide|tutorial|learn|understand|what is)\b/i.test(html);
    const hasTransactional = /\b(pricing|sign up|free trial|get started|demo|buy)\b/i.test(html);

    if (hasEducational && !hasTransactional) {
      issues.push({
        ruleId: 'rule-414',
        severity: 'medium',
        title: 'SaaS hybrid: Educational content without conversion path',
        description: 'SaaS educational pages should include conversion elements (CTA, pricing link, demo request) as a hybrid strategy.',
        exampleFix: 'Add a CTA section like "Ready to try [Product]? Start your free trial" or link to pricing.',
      });
    }

    // Rule 415: SaaS should have demo/trial path
    if (!/(free trial|demo|sandbox|playground|try (it|now)|test drive)/i.test(html)) {
      issues.push({
        ruleId: 'rule-415',
        severity: 'low',
        title: 'SaaS: No trial/demo path detected',
        description: 'SaaS pages benefit from a visible path to trial or demo.',
        exampleFix: 'Add a "Start Free Trial" or "Request Demo" button.',
      });
    }

    return issues;
  }

  /**
   * Validate B2B augmented content requirements.
   */
  validateB2bAugmentation(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;

    // Rule 423: B2B should have ROI/metrics
    if (!/\b(ROI|return on investment|\d+%\s+(increase|decrease|improvement|reduction)|metrics|KPI)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-423',
        severity: 'medium',
        title: 'B2B: No ROI or metrics found',
        description: 'B2B content should include quantifiable results, ROI data, or performance metrics for credibility.',
        exampleFix: 'Add specific metrics: "Our clients see a 40% increase in efficiency" or include a case study with numbers.',
      });
    }

    // Rule 424: B2B should have industry-specific trust signals
    if (!/\b(ISO|SOC\s*2|GDPR|HIPAA|certified|compliance|security|enterprise|SLA)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-424',
        severity: 'low',
        title: 'B2B: No compliance/trust signals',
        description: 'B2B pages benefit from trust signals like certifications, compliance badges, and security mentions.',
        exampleFix: 'Add compliance badges (SOC 2, ISO 27001) or security/privacy assurance text.',
      });
    }

    // Rule 425: B2B lead capture
    if (!/<form\b/i.test(html) && !/\b(contact us|request a quote|get in touch|schedule a call|book a meeting)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-425',
        severity: 'high',
        title: 'B2B: No lead capture mechanism',
        description: 'B2B pages should include a contact form, quote request, or meeting scheduler for lead generation.',
        exampleFix: 'Add a contact form, "Request a Quote" button, or Calendly-style meeting scheduler.',
      });
    }

    return issues;
  }

  /**
   * Validate homepage-specific requirements (Finding #97).
   * - Central Entity in first 100 words
   * - All pillars linked
   * - WebSite schema
   * - Minimum content depth
   */
  validateHomepage(input: WebsiteTypeInput & { centralEntity?: string; pillarUrls?: string[] }): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 438: WebSite schema on homepage
    if (!schemas.includes('WebSite')) {
      issues.push({
        ruleId: 'rule-438',
        severity: 'high',
        title: 'Homepage missing WebSite schema',
        description: 'The homepage should include "@type": "WebSite" schema with name, url, and potentialAction (SearchAction).',
        exampleFix: 'Add WebSite JSON-LD with name, url, and optional SearchAction for sitelinks search box.',
      });
    }

    // Rule 439: Central Entity in first 100 words
    if (input.centralEntity) {
      const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const first100Words = textContent.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
      if (!first100Words.includes(input.centralEntity.toLowerCase())) {
        issues.push({
          ruleId: 'rule-439',
          severity: 'high',
          title: 'Central Entity not in first 100 words',
          description: `The Central Entity "${input.centralEntity}" should appear within the first 100 words of the homepage for strong topical signaling.`,
          exampleFix: `Ensure "${input.centralEntity}" appears in the hero section or first paragraph.`,
        });
      }
    }

    // Rule 440: All pillars linked from homepage
    if (input.pillarUrls && input.pillarUrls.length > 0) {
      const linkedPillars = input.pillarUrls.filter(url =>
        html.includes(url) || html.includes(url.replace(/^https?:\/\/[^/]+/, ''))
      );
      const missingCount = input.pillarUrls.length - linkedPillars.length;
      if (missingCount > 0) {
        issues.push({
          ruleId: 'rule-440',
          severity: 'high',
          title: `Homepage missing links to ${missingCount} pillar page(s)`,
          description: 'The homepage should link to all pillar/hub pages to distribute PageRank and signal topical structure.',
          exampleFix: 'Add navigation or content links to all pillar pages from the homepage.',
        });
      }
    }

    // Rule 441: Homepage minimum content
    const textLength = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).length;
    if (textLength < 200) {
      issues.push({
        ruleId: 'rule-441',
        severity: 'medium',
        title: 'Homepage has insufficient content',
        description: `Homepage has approximately ${textLength} words. Aim for at least 200 words to establish topical context.`,
        exampleFix: 'Add introductory content about your Central Entity, value proposition, and key topics.',
      });
    }

    // Rule 442: Organization schema on homepage
    if (!schemas.some(s => s === 'Organization' || s === 'LocalBusiness' || s === 'Corporation')) {
      issues.push({
        ruleId: 'rule-442',
        severity: 'medium',
        title: 'Homepage missing Organization schema',
        description: 'The homepage should include Organization (or LocalBusiness) schema with logo, sameAs, and contactPoint.',
        exampleFix: 'Add "@type": "Organization" JSON-LD with name, logo, url, sameAs (social profiles), and contactPoint.',
      });
    }

    return issues;
  }
}
