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
 *   marketplace     (rules 443-445)
 *   events          (rules 446-448)
 *   lead-generation (rules 449-451)
 *   real-estate     (rules 452-454)
 *   healthcare      (rules 455-457)
 *   hospitality     (rules 458-460)
 *   affiliate-review(rules 461-463)
 *   news-media      (rules 464-466)
 *   education       (rules 467-469)
 *   recruitment     (rules 470-472)
 *   directory       (rules 473-475)
 *   community       (rules 476-478)
 *   nonprofit       (rules 479-481)
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
  | 'marketplace'
  | 'events'
  | 'lead-generation'
  | 'real-estate'
  | 'healthcare'
  | 'hospitality'
  | 'affiliate-review'
  | 'news-media'
  | 'education'
  | 'recruitment'
  | 'directory'
  | 'community'
  | 'nonprofit'
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
      case 'marketplace':
        return this.validateMarketplace(input);
      case 'events':
        return this.validateEvents(input);
      case 'lead-generation':
        return this.validateLeadGeneration(input);
      case 'real-estate':
        return this.validateRealEstate(input);
      case 'healthcare':
        return this.validateHealthcare(input);
      case 'hospitality':
        return this.validateHospitality(input);
      case 'affiliate-review':
        return this.validateAffiliateReview(input);
      case 'news-media':
        return this.validateNewsMedia(input);
      case 'education':
        return this.validateEducation(input);
      case 'recruitment':
        return this.validateRecruitment(input);
      case 'directory':
        return this.validateDirectory(input);
      case 'community':
        return this.validateCommunity(input);
      case 'nonprofit':
        return this.validateNonprofit(input);
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
  // Marketplace (rules 443-445)
  // -----------------------------------------------------------------------

  private validateMarketplace(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 443: Product/Offer schema present
    if (!schemas.some(s => s === 'Product' || s === 'Offer')) {
      issues.push({
        ruleId: 'rule-443',
        severity: 'high',
        title: 'Missing Product or Offer schema',
        description: 'Marketplace pages should include Product or Offer schema for listing rich results.',
        exampleFix: 'Add JSON-LD with "@type": "Product" or "@type": "Offer" for each listing.',
      });
    }

    // Rule 444: Trust/safety signals
    if (!/\b(verified|trust|guarantee|buyer protection|secure payment|escrow|money.back)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-444',
        severity: 'medium',
        title: 'No trust or safety signals found',
        description: 'Marketplaces should display trust signals such as buyer protection, verified sellers, or guarantees.',
        exampleFix: 'Add trust badges, buyer protection notice, or verified seller indicators.',
      });
    }

    // Rule 445: Buyer/seller content separation
    const hasBuyerSection = /\b(buyer|customer|shopper|purchase)\b/i.test(html);
    const hasSellerSection = /\b(seller|vendor|merchant|supplier|sell on)\b/i.test(html);
    if (!hasBuyerSection || !hasSellerSection) {
      issues.push({
        ruleId: 'rule-445',
        severity: 'low',
        title: 'No buyer/seller content separation',
        description: 'Marketplace pages benefit from distinct buyer and seller sections or role-based content.',
        exampleFix: 'Add separate sections addressing buyers and sellers with role-specific content.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Events (rules 446-448)
  // -----------------------------------------------------------------------

  private validateEvents(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 446: Event schema present
    if (!schemas.some(s => s === 'Event')) {
      issues.push({
        ruleId: 'rule-446',
        severity: 'high',
        title: 'Missing Event schema',
        description: 'Event pages should include JSON-LD with "@type": "Event" for rich results in search.',
        exampleFix: 'Add JSON-LD with "@type": "Event" including name, startDate, location, and offers.',
      });
    }

    // Rule 447: Temporal urgency markers
    if (!/\b(limited|tickets? available|sold out|register now|early bird|deadline|ends? soon|last chance)\b/i.test(html) &&
        !/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/.test(html) &&
        !/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/i.test(html)) {
      issues.push({
        ruleId: 'rule-447',
        severity: 'medium',
        title: 'No temporal urgency markers',
        description: 'Event pages should include dates, availability status, or urgency signals (e.g., "limited tickets", "sold out").',
        exampleFix: 'Add event dates, ticket availability status, and urgency markers like "Early Bird pricing ends March 15".',
      });
    }

    // Rule 448: Venue/performer entities
    if (!/\b(venue|location|stadium|arena|theater|theatre|hall|center|centre|performer|artist|speaker|band|presenter|host)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-448',
        severity: 'medium',
        title: 'No venue or performer entities mentioned',
        description: 'Event pages should reference venue and/or performer entities for entity association.',
        exampleFix: 'Add venue name, address, and performer/speaker names with relevant details.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Lead Generation (rules 449-451)
  // -----------------------------------------------------------------------

  private validateLeadGeneration(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;

    // Rule 449: Form present on page
    const hasForm = /<form\b/i.test(html);
    const hasInputs = /<input\b/i.test(html);
    if (!hasForm && !hasInputs) {
      issues.push({
        ruleId: 'rule-449',
        severity: 'critical',
        title: 'No form or input elements found',
        description: 'Lead generation pages must include a form for capturing visitor information.',
        exampleFix: 'Add a lead capture form with name, email, and a clear submit button.',
      });
    }

    // Rule 450: Social proof near CTA
    const ctaPos = html.search(/\b(get started|sign up|download|request|submit|contact us|free trial|get quote)\b/i);
    const hasSocialProofNearCta = ctaPos > -1 && /\b(testimonial|review|case study|trusted by|clients|customers|companies)\b/i.test(
      html.slice(Math.max(0, ctaPos - 500), ctaPos + 500)
    );
    if (ctaPos > -1 && !hasSocialProofNearCta) {
      issues.push({
        ruleId: 'rule-450',
        severity: 'medium',
        title: 'No social proof near CTA',
        description: 'Lead generation pages benefit from testimonials, reviews, or trust signals near the call-to-action.',
        exampleFix: 'Add a testimonial quote, client logos, or "Trusted by X companies" near the form or CTA button.',
      });
    }

    // Rule 451: Clear value proposition in first 300 chars
    const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const first300 = textContent.slice(0, 300).toLowerCase();
    const hasValueProp = /\b(save|free|boost|increase|reduce|improve|transform|grow|unlock|discover|get|learn)\b/i.test(first300);
    if (!hasValueProp) {
      issues.push({
        ruleId: 'rule-451',
        severity: 'medium',
        title: 'No clear value proposition in first 300 characters',
        description: 'Lead generation pages should communicate a clear value proposition early to reduce bounce rate.',
        exampleFix: 'Lead with a benefit-driven headline such as "Save 40% on your monthly costs" or "Get your free audit".',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Real Estate (rules 452-454)
  // -----------------------------------------------------------------------

  private validateRealEstate(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 452: Property listing schema
    if (!schemas.some(s => s === 'RealEstateListing' || s === 'Product' || s === 'Residence' || s === 'Apartment' || s === 'House')) {
      issues.push({
        ruleId: 'rule-452',
        severity: 'high',
        title: 'Missing property listing schema',
        description: 'Real estate pages should include RealEstateListing, Product, or Residence schema for structured data.',
        exampleFix: 'Add JSON-LD with "@type": "RealEstateListing" or "@type": "Product" with property attributes.',
      });
    }

    // Rule 453: Location/neighborhood content
    if (!/\b(neighborhood|neighbourhood|area|district|community|location|nearby|walking distance|schools|parks|transit|commute)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-453',
        severity: 'medium',
        title: 'No location or neighborhood content',
        description: 'Real estate listings should include neighborhood information, nearby amenities, and location context.',
        exampleFix: 'Add a neighborhood section with nearby schools, parks, transit options, and community details.',
      });
    }

    // Rule 454: Price/size attributes
    const hasPrice = /(\$|€|£)\s*[\d,]+|\b(price|asking|listed at)\b/i.test(html);
    const hasSize = /\b(sq\s*ft|square\s*feet|sqm|square\s*met|bedroom|bathroom|bed|bath|acres?|hectares?)\b/i.test(html);
    if (!hasPrice || !hasSize) {
      const missing: string[] = [];
      if (!hasPrice) missing.push('price');
      if (!hasSize) missing.push('size/rooms');
      issues.push({
        ruleId: 'rule-454',
        severity: 'high',
        title: `Missing property attributes: ${missing.join(', ')}`,
        description: 'Real estate listings should clearly display price and property dimensions (size, bedrooms, bathrooms).',
        exampleFix: 'Add visible price, square footage, and bedroom/bathroom count.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Healthcare (rules 455-457)
  // -----------------------------------------------------------------------

  private validateHealthcare(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;

    // Rule 455: Medical disclaimer
    if (!/\b(not medical advice|not a substitute for|consult your doctor|consult your physician|consult a (healthcare|medical) professional|for informational purposes only|seek (professional|medical) advice)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-455',
        severity: 'critical',
        title: 'Missing medical disclaimer',
        description: 'Healthcare content must include a medical disclaimer stating it is not a substitute for professional medical advice.',
        exampleFix: 'Add a disclaimer: "This content is for informational purposes only and is not a substitute for professional medical advice. Consult your doctor."',
      });
    }

    // Rule 456: Author credentials
    if (!/\b(M\.?D\.?|Dr\.|physician|board.certified|medical director|clinical|R\.?N\.?|Pharm\.?D\.?|credentials|qualifications)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-456',
        severity: 'high',
        title: 'No author credentials found',
        description: 'Healthcare content should display author credentials (MD, Dr., board-certified) for E-E-A-T compliance.',
        exampleFix: 'Add author byline with medical credentials: "Reviewed by Dr. Jane Smith, MD, Board-Certified Cardiologist".',
      });
    }

    // Rule 457: Source citations
    if (!/\b(reference|citation|source|study|pubmed|doi:|PMID|journal|peer.reviewed|clinical trial|evidence.based)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-457',
        severity: 'high',
        title: 'No source citations found',
        description: 'Healthcare content should cite medical sources, studies, or peer-reviewed references for credibility.',
        exampleFix: 'Add a references section with links to PubMed, medical journals, or clinical studies.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Hospitality (rules 458-460)
  // -----------------------------------------------------------------------

  private validateHospitality(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 458: LodgingBusiness or Hotel schema
    if (!schemas.some(s => s === 'LodgingBusiness' || s === 'Hotel' || s === 'Resort' || s === 'Hostel' || s === 'BedAndBreakfast' || s === 'Motel')) {
      issues.push({
        ruleId: 'rule-458',
        severity: 'high',
        title: 'Missing LodgingBusiness or Hotel schema',
        description: 'Hospitality pages should include LodgingBusiness, Hotel, or related schema for rich results.',
        exampleFix: 'Add JSON-LD with "@type": "Hotel" including name, address, starRating, and amenityFeature.',
      });
    }

    // Rule 459: Booking/reservation CTA
    if (!/\b(book now|reserve|reservation|check availability|book a room|book your stay|availability)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-459',
        severity: 'high',
        title: 'No booking or reservation CTA',
        description: 'Hospitality pages should include a clear booking or reservation call-to-action.',
        exampleFix: 'Add a prominent "Book Now" or "Check Availability" button linked to the reservation system.',
      });
    }

    // Rule 460: Location schema with address
    if (!this.hasAddressInfo(html)) {
      issues.push({
        ruleId: 'rule-460',
        severity: 'medium',
        title: 'No location or address information',
        description: 'Hospitality pages should display the property address for local search visibility.',
        exampleFix: 'Add a visible address and include PostalAddress in the schema markup.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Affiliate/Review (rules 461-463)
  // -----------------------------------------------------------------------

  private validateAffiliateReview(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 461: Affiliate disclosure
    if (!/\b(affiliate|commission|sponsored|compensation|partner link|earn a commission|paid partnership|disclosure)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-461',
        severity: 'critical',
        title: 'Missing affiliate disclosure',
        description: 'Affiliate review pages must include a clear disclosure about affiliate relationships per FTC guidelines.',
        exampleFix: 'Add a disclosure: "This page contains affiliate links. We may earn a commission at no extra cost to you."',
      });
    }

    // Rule 462: Comparison methodology
    if (!/\b(criteria|scoring|methodology|how we (test|rate|rank|evaluate|review)|evaluation process|our process|testing method)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-462',
        severity: 'medium',
        title: 'No comparison methodology explained',
        description: 'Affiliate review pages should explain the evaluation criteria and scoring methodology for transparency.',
        exampleFix: 'Add a "How We Test" or "Our Methodology" section explaining review criteria and scoring.',
      });
    }

    // Rule 463: Product schema with review/rating
    const hasProductSchema = schemas.some(s => s === 'Product');
    const hasReviewSchema = schemas.some(s => s === 'Review' || s === 'AggregateRating');
    if (!hasProductSchema || !hasReviewSchema) {
      issues.push({
        ruleId: 'rule-463',
        severity: 'medium',
        title: 'Missing Product schema with Review or AggregateRating',
        description: 'Affiliate review pages should include Product schema with Review or AggregateRating for rich snippets.',
        exampleFix: 'Add Product JSON-LD with nested Review or AggregateRating schema for star ratings in search.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // News/Media (rules 464-466)
  // -----------------------------------------------------------------------

  private validateNewsMedia(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 464: NewsArticle schema
    if (!schemas.some(s => s === 'NewsArticle')) {
      issues.push({
        ruleId: 'rule-464',
        severity: 'high',
        title: 'Missing NewsArticle schema',
        description: 'News pages should include JSON-LD with "@type": "NewsArticle" for Google News and Top Stories eligibility.',
        exampleFix: 'Add JSON-LD with "@type": "NewsArticle" including headline, datePublished, author, and publisher.',
      });
    }

    // Rule 465: Publish date and author byline
    const hasDate = this.hasPublicationDate(html);
    const hasAuthor = this.hasAuthorInfo(html);
    if (!hasDate || !hasAuthor) {
      const missing: string[] = [];
      if (!hasDate) missing.push('publication date');
      if (!hasAuthor) missing.push('author byline');
      issues.push({
        ruleId: 'rule-465',
        severity: 'high',
        title: `Missing ${missing.join(' and ')}`,
        description: 'News articles must display a publication date and author byline for credibility and freshness signals.',
        exampleFix: 'Add a visible publish date and author name near the headline.',
      });
    }

    // Rule 466: Source citations
    if (!/\b(source|according to|cited|reported by|statement from|press release|official)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-466',
        severity: 'medium',
        title: 'No source citations in news content',
        description: 'News articles should cite sources and attribute claims to build trust and meet journalistic standards.',
        exampleFix: 'Add source attributions: "According to [Source]" or "A spokesperson said...".',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Education (rules 467-469)
  // -----------------------------------------------------------------------

  private validateEducation(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 467: Course schema
    if (!schemas.some(s => s === 'Course')) {
      issues.push({
        ruleId: 'rule-467',
        severity: 'high',
        title: 'Missing Course schema',
        description: 'Education pages should include JSON-LD with "@type": "Course" for rich results in search.',
        exampleFix: 'Add JSON-LD with "@type": "Course" including name, description, provider, and offers.',
      });
    }

    // Rule 468: Learning outcomes
    if (!/\b(you will learn|learning objectives?|outcomes?|by the end|what you('ll| will) (learn|gain|achieve)|skills? (you('ll| will))? (gain|develop|master))\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-468',
        severity: 'medium',
        title: 'No learning outcomes specified',
        description: 'Education pages should clearly state learning objectives or outcomes to set expectations.',
        exampleFix: 'Add a "What You Will Learn" section listing specific skills or knowledge outcomes.',
      });
    }

    // Rule 469: Curriculum structure
    if (!/\b(module|lesson|chapter|unit|syllabus|curriculum|week \d|session \d|part \d|section \d)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-469',
        severity: 'medium',
        title: 'No curriculum structure found',
        description: 'Education pages should present a structured curriculum with modules, lessons, or chapters.',
        exampleFix: 'Add a curriculum outline with numbered modules or lessons and their topics.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Recruitment (rules 470-472)
  // -----------------------------------------------------------------------

  private validateRecruitment(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 470: JobPosting schema
    if (!schemas.some(s => s === 'JobPosting')) {
      issues.push({
        ruleId: 'rule-470',
        severity: 'high',
        title: 'Missing JobPosting schema',
        description: 'Recruitment pages should include JSON-LD with "@type": "JobPosting" for Google Jobs eligibility.',
        exampleFix: 'Add JSON-LD with "@type": "JobPosting" including title, description, datePosted, hiringOrganization, and jobLocation.',
      });
    }

    // Rule 471: Salary transparency
    if (!/\b(salary|compensation|pay range|pay rate|wage|annual|per hour|per year|\$\s*[\d,]+\s*[-–]\s*\$\s*[\d,]+|€\s*[\d,]+|£\s*[\d,]+)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-471',
        severity: 'medium',
        title: 'No salary or compensation information',
        description: 'Job postings should include salary or compensation range for transparency and higher application rates.',
        exampleFix: 'Add salary range: "Salary: $80,000 - $120,000 per year" or include baseSalary in JobPosting schema.',
      });
    }

    // Rule 472: Application method
    if (!/\b(apply now|apply here|submit (your )?application|send (your )?resume|how to apply|application form)\b/i.test(html) &&
        !/<form\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-472',
        severity: 'high',
        title: 'No application method found',
        description: 'Job postings must include a clear application method (form, email, or application link).',
        exampleFix: 'Add an "Apply Now" button, application form, or instructions on how to apply.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Directory (rules 473-475)
  // -----------------------------------------------------------------------

  private validateDirectory(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 473: Listing completeness (name + contact info)
    const hasListingNames = /<h[2-4]\b/i.test(html);
    const hasContactInfo = this.hasPhoneInfo(html) || /\b(email|contact|website|phone)\b/i.test(html);
    if (!hasListingNames || !hasContactInfo) {
      issues.push({
        ruleId: 'rule-473',
        severity: 'high',
        title: 'Incomplete listing information',
        description: 'Directory listings should include name, address, and contact information for each entry.',
        exampleFix: 'Ensure each listing has a name heading, address, and phone/email/website link.',
      });
    }

    // Rule 474: Category taxonomy
    if (!/\b(categor|filter|sort by|browse by|tag|topic|industry|type)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-474',
        severity: 'medium',
        title: 'No category taxonomy or filtering',
        description: 'Directory pages should include category navigation, filters, or tags for discoverability.',
        exampleFix: 'Add category navigation, filter controls, or tag-based browsing for listings.',
      });
    }

    // Rule 475: LocalBusiness schema on listing pages
    if (!schemas.some(s => s === 'LocalBusiness' || s === 'Organization' || s === 'ItemList')) {
      issues.push({
        ruleId: 'rule-475',
        severity: 'medium',
        title: 'Missing LocalBusiness or ItemList schema',
        description: 'Directory pages should use LocalBusiness schema per listing or ItemList for the collection.',
        exampleFix: 'Add ItemList JSON-LD wrapping individual LocalBusiness or Organization entries.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Community (rules 476-478)
  // -----------------------------------------------------------------------

  private validateCommunity(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 476: DiscussionForumPosting schema
    if (!schemas.some(s => s === 'DiscussionForumPosting' || s === 'Question' || s === 'Answer' || s === 'Comment')) {
      issues.push({
        ruleId: 'rule-476',
        severity: 'medium',
        title: 'Missing DiscussionForumPosting schema',
        description: 'Community pages should include DiscussionForumPosting or Q&A schema for rich results.',
        exampleFix: 'Add JSON-LD with "@type": "DiscussionForumPosting" including author, dateCreated, and text.',
      });
    }

    // Rule 477: User contribution quality signals
    if (!/\b(upvote|downvote|vote|karma|reputation|verified|endorsed|helpful|best answer|accepted answer|likes?|points?)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-477',
        severity: 'low',
        title: 'No user contribution quality signals',
        description: 'Community pages benefit from quality signals like upvotes, reputation scores, or verified badges.',
        exampleFix: 'Add voting, reputation scores, or "verified contributor" badges to surface quality content.',
      });
    }

    // Rule 478: Moderation indicators
    if (!/\b(rules|guidelines|community guidelines|terms of (use|service)|report|flag|moderator|moderation|code of conduct)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-478',
        severity: 'low',
        title: 'No moderation indicators found',
        description: 'Community pages should reference rules, guidelines, or moderation policies for trust signals.',
        exampleFix: 'Add links to community guidelines, a "Report" button, or moderator identification.',
      });
    }

    return issues;
  }

  // -----------------------------------------------------------------------
  // Nonprofit (rules 479-481)
  // -----------------------------------------------------------------------

  private validateNonprofit(input: WebsiteTypeInput): WebsiteTypeIssue[] {
    const issues: WebsiteTypeIssue[] = [];
    const { html } = input;
    const schemas = input.schemaTypes ?? this.extractSchemaTypes(html);

    // Rule 479: NGO/NonprofitType schema
    if (!schemas.some(s => s === 'NGO' || s === 'NonprofitType' || s === 'Organization')) {
      issues.push({
        ruleId: 'rule-479',
        severity: 'medium',
        title: 'Missing NGO or Organization schema',
        description: 'Nonprofit pages should include NGO or Organization schema with nonprofit classification.',
        exampleFix: 'Add JSON-LD with "@type": "NGO" or "@type": "Organization" with nonprofitStatus.',
      });
    }

    // Rule 480: Impact reporting
    if (!/\b(impact|results|outcomes?|beneficiar|lives? (changed|saved|improved)|people (served|helped|reached)|donations? (used|allocated)|mission accomplished)\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-480',
        severity: 'medium',
        title: 'No impact reporting found',
        description: 'Nonprofit pages should include impact reports showing outcomes, beneficiaries served, or results achieved.',
        exampleFix: 'Add an impact section: "In 2025, we served 10,000 families and distributed 50,000 meals."',
      });
    }

    // Rule 481: Transparency
    if (!/\b(annual report|financials?|990|budget|transparency|audit(ed)?|accountability|tax.exempt|how (we|funds?) (use|spend|allocate))\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-481',
        severity: 'medium',
        title: 'No financial transparency information',
        description: 'Nonprofit pages should provide financial transparency through annual reports, Form 990, or budget breakdowns.',
        exampleFix: 'Add links to annual reports, Form 990, or a "How We Use Your Donations" section.',
      });
    }

    return issues;
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
