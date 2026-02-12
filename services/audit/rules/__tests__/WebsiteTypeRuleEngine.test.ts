import { describe, it, expect } from 'vitest';
import {
  WebsiteTypeRuleEngine,
  type WebsiteTypeInput,
} from '../WebsiteTypeRuleEngine';

describe('WebsiteTypeRuleEngine', () => {
  const engine = new WebsiteTypeRuleEngine();

  // -----------------------------------------------------------------------
  // E-commerce (rules 400-403)
  // -----------------------------------------------------------------------

  describe('ecommerce', () => {
    it('flags missing Product schema (rule 400)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'ecommerce',
        html: '<html><body><h1>Cool Widget</h1><img src="a.jpg"><img src="b.jpg"><p>$29.99 - In Stock</p></body></html>',
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-400' }),
      );
    });

    it('passes when Product schema is present', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'ecommerce',
        html: `<html><body>
          <script type="application/ld+json">{"@type":"Product","name":"Widget","offers":{"@type":"Offer","price":"29.99","priceCurrency":"USD","availability":"InStock"}}</script>
          <h1>Widget</h1><p>$29.99 - In Stock</p>
          <img src="a.jpg"><img src="b.jpg">
        </body></html>`,
      };
      const issues = engine.validate(input);
      expect(issues.find((i) => i.ruleId === 'rule-400')).toBeUndefined();
    });

    it('flags missing price info (rule 401)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'ecommerce',
        html: '<html><body><h1>Widget</h1><p>Great product</p><img src="a.jpg"><img src="b.jpg"></body></html>',
        schemaTypes: ['Product'],
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-401' }),
      );
    });

    it('flags missing availability (rule 402)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'ecommerce',
        html: '<html><body><h1>Widget</h1><p>$29.99</p><img src="a.jpg"><img src="b.jpg"></body></html>',
        schemaTypes: ['Product'],
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-402' }),
      );
    });

    it('flags insufficient product images (rule 403)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'ecommerce',
        html: '<html><body><h1>Widget</h1><p>$29.99 - In Stock</p><img src="a.jpg"></body></html>',
        schemaTypes: ['Product'],
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-403' }),
      );
    });

    it('proper ecommerce page passes clean', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'ecommerce',
        html: `<html><body>
          <script type="application/ld+json">{"@type":"Product","name":"Widget","offers":{"@type":"Offer","price":"29.99","priceCurrency":"USD","availability":"InStock"}}</script>
          <h1>Widget Pro</h1>
          <p>Only $29.99 - In Stock and ready to ship.</p>
          <img src="front.jpg" alt="Widget front view">
          <img src="back.jpg" alt="Widget back view">
          <img src="detail.jpg" alt="Widget detail">
        </body></html>`,
      };
      const issues = engine.validate(input);
      expect(issues.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // SaaS (rules 411-413)
  // -----------------------------------------------------------------------

  describe('saas', () => {
    it('flags missing comparison table (rule 411)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'saas',
        html: '<html><body><h1>Our App</h1><p>pricing starts at $9/mo</p><code>npm install our-app</code></body></html>',
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-411' }),
      );
    });

    it('flags missing pricing (rule 412)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'saas',
        html: '<html><body><h1>Our App</h1><p>Great features</p><table><tr><th>Feature</th></tr></table></body></html>',
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-412' }),
      );
    });

    it('flags missing documentation structure (rule 413)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'saas',
        html: '<html><body><h1>Our App</h1><p>pricing $9/mo</p><table><tr><th>Feature comparison</th></tr></table></body></html>',
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-413' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // B2B (rules 421-422)
  // -----------------------------------------------------------------------

  describe('b2b', () => {
    it('flags missing case study / testimonial (rule 421)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'b2b',
        html: '<html><body><h1>Enterprise Solutions</h1><p>We offer great services.</p></body></html>',
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-421' }),
      );
    });

    it('passes when testimonial text present', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'b2b',
        html: `<html><body>
          <script type="application/ld+json">{"@type":"Service","name":"Consulting"}</script>
          <h1>Consulting</h1><p>Read our case study on how we helped Acme Corp.</p>
        </body></html>`,
      };
      const issues = engine.validate(input);
      expect(issues.find((i) => i.ruleId === 'rule-421')).toBeUndefined();
    });

    it('flags missing Service schema (rule 422)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'b2b',
        html: '<html><body><h1>Services</h1><p>Our testimonial section is great.</p></body></html>',
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-422' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Blog (rules 426-429)
  // -----------------------------------------------------------------------

  describe('blog', () => {
    it('flags missing Article schema (rule 426)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'blog',
        html: '<html><body><h1>My Blog Post</h1><p>By John, January 15, 2025</p><span class="category">Tech</span></body></html>',
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-426' }),
      );
    });

    it('flags missing author info (rule 427)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'blog',
        html: `<html><body>
          <script type="application/ld+json">{"@type":"Article","headline":"Post"}</script>
          <h1>Post</h1><p>January 15, 2025</p><span class="category">Tech</span>
        </body></html>`,
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-427' }),
      );
    });

    it('flags missing publication date (rule 428)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'blog',
        html: `<html><body>
          <script type="application/ld+json">{"@type":"BlogPosting","headline":"Post"}</script>
          <h1>Post</h1><p class="author">By John</p><span class="category">Tech</span>
        </body></html>`,
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-428' }),
      );
    });

    it('flags missing category / tags (rule 429)', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'blog',
        html: `<html><body>
          <script type="application/ld+json">{"@type":"Article","headline":"Post","datePublished":"2025-01-15"}</script>
          <h1>Post</h1><p class="author">By Jane Smith</p>
        </body></html>`,
      };
      const issues = engine.validate(input);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-429' }),
      );
    });

    it('well-formed blog post passes clean', () => {
      const input: WebsiteTypeInput = {
        websiteType: 'blog',
        html: `<html><body>
          <script type="application/ld+json">{"@type":"Article","headline":"How to X","datePublished":"2025-01-15","author":{"@type":"Person","name":"Jane"}}</script>
          <h1>How to X</h1>
          <p class="author">By Jane Smith</p>
          <time datetime="2025-01-15">January 15, 2025</time>
          <span class="category">Technology</span>
          <p>Content goes here.</p>
        </body></html>`,
      };
      const issues = engine.validate(input);
      expect(issues.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Other / local-business
  // -----------------------------------------------------------------------

  it('"other" type returns no issues', () => {
    const input: WebsiteTypeInput = {
      websiteType: 'other',
      html: '<html><body><p>Hello world</p></body></html>',
    };
    const issues = engine.validate(input);
    expect(issues.length).toBe(0);
  });

  it('"local-business" type returns no issues (stub)', () => {
    const input: WebsiteTypeInput = {
      websiteType: 'local-business',
      html: '<html><body><p>Local shop</p></body></html>',
    };
    const issues = engine.validate(input);
    expect(issues.length).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Schema extraction from HTML
  // -----------------------------------------------------------------------

  it('extracts schema types from @graph arrays in JSON-LD', () => {
    const input: WebsiteTypeInput = {
      websiteType: 'ecommerce',
      html: `<html><body>
        <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Product","name":"X"},{"@type":"Offer","price":"10"}]}</script>
        <p>$10 - In Stock</p>
        <img src="a.jpg"><img src="b.jpg">
      </body></html>`,
    };
    const issues = engine.validate(input);
    // Product schema is found via @graph, so rule-400 should NOT fire
    expect(issues.find((i) => i.ruleId === 'rule-400')).toBeUndefined();
  });
});
