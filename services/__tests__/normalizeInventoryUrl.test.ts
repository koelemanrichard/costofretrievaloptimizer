import { describe, it, expect } from 'vitest';
import { normalizeInventoryUrl } from '../migrationService';

describe('normalizeInventoryUrl', () => {
  it('strips trailing slashes', () => {
    expect(normalizeInventoryUrl('https://example.com/page/')).toBe('https://example.com/page');
  });

  it('preserves root path trailing slash', () => {
    expect(normalizeInventoryUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('forces HTTPS', () => {
    expect(normalizeInventoryUrl('http://example.com/page')).toBe('https://example.com/page');
  });

  it('strips www subdomain', () => {
    expect(normalizeInventoryUrl('https://www.example.com/page')).toBe('https://example.com/page');
  });

  it('normalizes http://www to https://non-www', () => {
    expect(normalizeInventoryUrl('http://www.example.nl/contact/')).toBe('https://example.nl/contact');
  });

  it('removes fragment identifiers', () => {
    expect(normalizeInventoryUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  it('removes tracking params (utm_source)', () => {
    expect(normalizeInventoryUrl('https://example.com/page?utm_source=google&key=val')).toBe('https://example.com/page?key=val');
  });

  it('removes fbclid param', () => {
    expect(normalizeInventoryUrl('https://example.com/page?fbclid=abc123')).toBe('https://example.com/page');
  });

  it('removes gclid param', () => {
    expect(normalizeInventoryUrl('https://example.com/page?gclid=abc123')).toBe('https://example.com/page');
  });

  it('removes multiple tracking params at once', () => {
    const url = 'https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=test&real=param';
    expect(normalizeInventoryUrl(url)).toBe('https://example.com/page?real=param');
  });

  it('removes default port 443', () => {
    expect(normalizeInventoryUrl('https://example.com:443/page')).toBe('https://example.com/page');
  });

  it('removes default port 80', () => {
    expect(normalizeInventoryUrl('http://example.com:80/page')).toBe('https://example.com/page');
  });

  it('deduplicates www vs non-www variants', () => {
    const url1 = normalizeInventoryUrl('http://www.domain.nl/contact/');
    const url2 = normalizeInventoryUrl('https://domain.nl/contact');
    expect(url1).toBe(url2);
  });

  it('handles deep paths with trailing slash', () => {
    expect(normalizeInventoryUrl('https://example.com/blog/2024/post/')).toBe('https://example.com/blog/2024/post');
  });

  it('preserves non-default port numbers', () => {
    expect(normalizeInventoryUrl('https://example.com:8080/page/')).toBe('https://example.com:8080/page');
  });

  it('returns invalid URLs unchanged', () => {
    expect(normalizeInventoryUrl('not-a-url')).toBe('not-a-url');
  });

  it('returns empty string unchanged', () => {
    expect(normalizeInventoryUrl('')).toBe('');
  });
});
