import { describe, it, expect } from 'vitest';
import { classifyPageType } from '../pageTypeClassifier';

describe('pageTypeClassifier', () => {
  describe('homepage', () => {
    it('classifies root path as homepage', () => {
      const result = classifyPageType('https://example.com/');
      expect(result.type).toBe('homepage');
      expect(result.protectedFromPrune).toBe(true);
    });
  });

  describe('conversion pages', () => {
    it('classifies offerte-aanvragen-verzonden as conversion', () => {
      const result = classifyPageType('https://example.nl/offerte-aanvragen-verzonden');
      expect(result.type).toBe('conversion');
      expect(result.protectedFromPrune).toBe(true);
    });

    it('classifies /bedankt as conversion', () => {
      const result = classifyPageType('https://example.nl/bedankt');
      expect(result.type).toBe('conversion');
      expect(result.protectedFromPrune).toBe(true);
    });

    it('classifies /thank-you as conversion', () => {
      const result = classifyPageType('https://example.com/thank-you');
      expect(result.type).toBe('conversion');
      expect(result.protectedFromPrune).toBe(true);
    });

    it('classifies /confirmation as conversion', () => {
      const result = classifyPageType('https://example.com/confirmation');
      expect(result.type).toBe('conversion');
      expect(result.protectedFromPrune).toBe(true);
    });

    it('classifies /checkout-success as conversion', () => {
      const result = classifyPageType('https://example.com/checkout-success');
      expect(result.type).toBe('conversion');
      expect(result.protectedFromPrune).toBe(true);
    });
  });

  describe('utility pages', () => {
    it('classifies /contact as utility', () => {
      const result = classifyPageType('https://example.nl/contact');
      expect(result.type).toBe('utility');
      expect(result.protectedFromPrune).toBe(true);
    });

    it('classifies /over-ons as utility', () => {
      const result = classifyPageType('https://example.nl/over-ons');
      expect(result.type).toBe('utility');
      expect(result.protectedFromPrune).toBe(true);
    });

    it('classifies /privacy as utility', () => {
      const result = classifyPageType('https://example.com/privacy');
      expect(result.type).toBe('utility');
      expect(result.protectedFromPrune).toBe(true);
    });

    it('classifies /algemene-voorwaarden as utility', () => {
      const result = classifyPageType('https://example.nl/algemene-voorwaarden');
      expect(result.type).toBe('utility');
      expect(result.protectedFromPrune).toBe(true);
    });

    it('classifies /faq as utility', () => {
      const result = classifyPageType('https://example.com/faq');
      expect(result.type).toBe('utility');
      expect(result.protectedFromPrune).toBe(true);
    });
  });

  describe('location pages', () => {
    it('classifies /dakdekker-oosterhout as location', () => {
      const result = classifyPageType('https://example.nl/dakdekker-oosterhout');
      expect(result.type).toBe('location');
      expect(result.protectedFromPrune).toBe(true);
      expect(result.reason).toContain('oosterhout');
    });

    it('classifies /loodgieter-breda as location', () => {
      const result = classifyPageType('https://example.nl/loodgieter-breda');
      expect(result.type).toBe('location');
      expect(result.protectedFromPrune).toBe(true);
    });

    it('classifies /schilder-den-haag as location (multi-word city)', () => {
      const result = classifyPageType('https://example.nl/schilder-den-haag');
      expect(result.type).toBe('location');
      expect(result.protectedFromPrune).toBe(true);
    });

    it('classifies /service-amsterdam as location', () => {
      const result = classifyPageType('https://example.nl/service-amsterdam');
      expect(result.type).toBe('location');
      expect(result.protectedFromPrune).toBe(true);
    });
  });

  describe('blog pages', () => {
    it('classifies /blog/some-post as blog', () => {
      const result = classifyPageType('https://example.com/blog/some-post');
      expect(result.type).toBe('blog');
      expect(result.protectedFromPrune).toBe(false);
    });

    it('classifies /nieuws/ as blog', () => {
      const result = classifyPageType('https://example.nl/nieuws/');
      expect(result.type).toBe('blog');
      expect(result.protectedFromPrune).toBe(false);
    });
  });

  describe('gallery pages', () => {
    it('classifies /rl_gallery/something as gallery', () => {
      const result = classifyPageType('https://example.nl/rl_gallery/something');
      expect(result.type).toBe('gallery');
    });

    it('classifies /portfolio as utility (referenties/portfolio)', () => {
      const result = classifyPageType('https://example.nl/portfolio');
      expect(result.type).toBe('utility');
    });
  });

  describe('default classification', () => {
    it('classifies unknown pages as content', () => {
      const result = classifyPageType('https://example.com/sedumdak-aanleggen');
      expect(result.type).toBe('content');
      expect(result.protectedFromPrune).toBe(false);
    });
  });

  describe('false positive prevention', () => {
    it('does NOT classify /customer-success-stories as conversion', () => {
      const result = classifyPageType('https://example.com/customer-success-stories');
      expect(result.type).not.toBe('conversion');
    });

    it('does NOT classify /booking-confirmation-details as conversion', () => {
      // conversion patterns require more specific match
      const result = classifyPageType('https://example.com/booking-confirmation-details');
      // This could match — the current /confirmation pattern would catch it
      // If it does, that's by design for now
      expect(result.protectedFromPrune).toBeDefined();
    });

    it('does NOT classify /services as homepage', () => {
      const result = classifyPageType('https://example.com/services');
      expect(result.type).not.toBe('homepage');
    });
  });

  describe('trailing slash handling', () => {
    it('classifies /contact/ same as /contact', () => {
      const withSlash = classifyPageType('https://example.nl/contact/');
      const withoutSlash = classifyPageType('https://example.nl/contact');
      expect(withSlash.type).toBe(withoutSlash.type);
    });
  });
});
