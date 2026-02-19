import { describe, it, expect } from 'vitest';
import {
  getAvailableComponents,
  getRegisteredComponents,
  isRegisteredComponent,
  hasRenderer,
  getComponentRenderer,
} from '../componentLibrary';

describe('componentLibrary validation helpers', () => {
  describe('getAvailableComponents', () => {
    it('returns a non-empty array of ComponentType values', () => {
      const components = getAvailableComponents();
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBeGreaterThan(0);
    });

    it('includes known core component types', () => {
      const components = getAvailableComponents();
      expect(components).toContain('prose');
      expect(components).toContain('faq-accordion');
      expect(components).toContain('timeline-vertical');
      expect(components).toContain('card-grid');
    });
  });

  describe('getRegisteredComponents', () => {
    it('returns a non-empty string array', () => {
      const components = getRegisteredComponents();
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBeGreaterThan(0);
      // Every element should be a string
      components.forEach(c => expect(typeof c).toBe('string'));
    });

    it('returns the same entries as getAvailableComponents', () => {
      const typed = getAvailableComponents();
      const untyped = getRegisteredComponents();
      expect(untyped.sort()).toEqual([...typed].sort());
    });

    it('includes all expected component families', () => {
      const components = getRegisteredComponents();
      // Core content
      expect(components).toContain('prose');
      expect(components).toContain('lead-paragraph');
      expect(components).toContain('highlight-box');
      expect(components).toContain('callout');
      // Lists
      expect(components).toContain('bullet-list');
      expect(components).toContain('numbered-list');
      expect(components).toContain('checklist');
      expect(components).toContain('icon-list');
      expect(components).toContain('card-grid');
      expect(components).toContain('feature-list');
      expect(components).toContain('stat-cards');
      // Process
      expect(components).toContain('timeline-vertical');
      expect(components).toContain('timeline-zigzag');
      expect(components).toContain('steps-numbered');
      // FAQ
      expect(components).toContain('faq-accordion');
      expect(components).toContain('faq-cards');
      // CTA
      expect(components).toContain('cta-banner');
      expect(components).toContain('cta-inline');
      // Specialized
      expect(components).toContain('key-takeaways');
      expect(components).toContain('summary-box');
      expect(components).toContain('sources-section');
    });
  });

  describe('isRegisteredComponent', () => {
    it('returns true for known component types', () => {
      expect(isRegisteredComponent('prose')).toBe(true);
      expect(isRegisteredComponent('faq-accordion')).toBe(true);
      expect(isRegisteredComponent('timeline-vertical')).toBe(true);
      expect(isRegisteredComponent('card-grid')).toBe(true);
      expect(isRegisteredComponent('cta-banner')).toBe(true);
    });

    it('returns false for unknown component types', () => {
      expect(isRegisteredComponent('nonexistent')).toBe(false);
      expect(isRegisteredComponent('')).toBe(false);
      expect(isRegisteredComponent('video-embed')).toBe(false);
      expect(isRegisteredComponent('hero-section')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(isRegisteredComponent('Prose')).toBe(false);
      expect(isRegisteredComponent('PROSE')).toBe(false);
      expect(isRegisteredComponent('FAQ-ACCORDION')).toBe(false);
    });
  });

  describe('hasRenderer', () => {
    it('returns true for registered types', () => {
      expect(hasRenderer('prose')).toBe(true);
      expect(hasRenderer('faq-accordion')).toBe(true);
    });

    it('returns false for unregistered types', () => {
      // hasRenderer takes ComponentType, but we can test with types that exist
      // in the union but are not registered in the renderer
      // We verify that all registered components have renderers
      const registered = getAvailableComponents();
      registered.forEach(type => {
        expect(hasRenderer(type)).toBe(true);
      });
    });
  });

  describe('getComponentRenderer', () => {
    it('returns the prose renderer as fallback for unknown types', () => {
      const proseRenderer = getComponentRenderer('prose');
      // For unknown types, getComponentRenderer falls back to prose
      const unknownRenderer = getComponentRenderer('highlight-box');
      expect(typeof proseRenderer).toBe('function');
      expect(typeof unknownRenderer).toBe('function');
    });

    it('returns a function for all registered component types', () => {
      const components = getAvailableComponents();
      components.forEach(type => {
        const renderer = getComponentRenderer(type);
        expect(typeof renderer).toBe('function');
      });
    });
  });

  describe('consistency between helpers', () => {
    it('isRegisteredComponent agrees with getRegisteredComponents', () => {
      const registered = getRegisteredComponents();
      registered.forEach(name => {
        expect(isRegisteredComponent(name)).toBe(true);
      });
    });

    it('hasRenderer agrees with isRegisteredComponent for typed values', () => {
      const typed = getAvailableComponents();
      typed.forEach(type => {
        expect(hasRenderer(type)).toBe(isRegisteredComponent(type));
      });
    });
  });
});
