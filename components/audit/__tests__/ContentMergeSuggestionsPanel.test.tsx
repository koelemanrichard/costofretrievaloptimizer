import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContentMergeSuggestionsPanel } from '../ContentMergeSuggestionsPanel';
import type {
  ContentMergeSuggestion,
  CannibalizationRisk,
} from '../../../services/audit/types';

function makeSuggestion(
  overrides: Partial<ContentMergeSuggestion> = {}
): ContentMergeSuggestion {
  return {
    sourceUrl: 'https://example.com/page-a',
    targetUrl: 'https://example.com/page-b',
    overlapPercentage: 65,
    reason: 'Both pages cover the same primary topic with similar headings.',
    suggestedAction: 'merge',
    ...overrides,
  };
}

function makeRisk(
  overrides: Partial<CannibalizationRisk> = {}
): CannibalizationRisk {
  return {
    urls: ['https://example.com/page-1', 'https://example.com/page-2'],
    sharedEntity: 'content optimization',
    sharedKeywords: ['SEO', 'optimization', 'content strategy'],
    severity: 'high',
    recommendation: 'Consolidate these pages into a single authoritative article.',
    ...overrides,
  };
}

describe('ContentMergeSuggestionsPanel', () => {
  // === Merge Suggestions ===

  it('renders suggestions with source and target URLs', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[makeSuggestion()]}
        cannibalizationRisks={[]}
      />
    );
    expect(screen.getByText('https://example.com/page-a')).toBeDefined();
    expect(screen.getByText('https://example.com/page-b')).toBeDefined();
  });

  it('renders overlap percentage text and progress bar', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[makeSuggestion({ overlapPercentage: 72 })]}
        cannibalizationRisks={[]}
      />
    );
    expect(screen.getByText('72%')).toBeDefined();
    const bar = screen.getByTestId('overlap-bar');
    expect(bar.style.width).toBe('72%');
  });

  it('renders an arrow icon between source and target URLs', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[makeSuggestion()]}
        cannibalizationRisks={[]}
      />
    );
    expect(screen.getByTestId('arrow-icon')).toBeDefined();
  });

  it('renders reason text for each suggestion', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[makeSuggestion()]}
        cannibalizationRisks={[]}
      />
    );
    expect(
      screen.getByText('Both pages cover the same primary topic with similar headings.')
    ).toBeDefined();
  });

  it('shows correct action badge for "merge"', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[makeSuggestion({ suggestedAction: 'merge' })]}
        cannibalizationRisks={[]}
      />
    );
    const badge = screen.getByTestId('action-badge');
    expect(badge.textContent).toBe('merge');
    expect(badge.className).toContain('text-blue-400');
  });

  it('shows correct action badge for "differentiate"', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[makeSuggestion({ suggestedAction: 'differentiate' })]}
        cannibalizationRisks={[]}
      />
    );
    const badge = screen.getByTestId('action-badge');
    expect(badge.textContent).toBe('differentiate');
    expect(badge.className).toContain('text-green-400');
  });

  it('shows correct action badge for "redirect"', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[makeSuggestion({ suggestedAction: 'redirect' })]}
        cannibalizationRisks={[]}
      />
    );
    const badge = screen.getByTestId('action-badge');
    expect(badge.textContent).toBe('redirect');
    expect(badge.className).toContain('text-yellow-400');
  });

  it('shows empty state when no merge suggestions', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[]}
        cannibalizationRisks={[]}
      />
    );
    expect(screen.getByText('No merge suggestions')).toBeDefined();
  });

  // === Cannibalization Risks ===

  it('renders cannibalization risks with URLs', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[]}
        cannibalizationRisks={[makeRisk()]}
      />
    );
    expect(screen.getByText('https://example.com/page-1')).toBeDefined();
    expect(screen.getByText('https://example.com/page-2')).toBeDefined();
  });

  it('renders shared entity text', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[]}
        cannibalizationRisks={[makeRisk()]}
      />
    );
    expect(screen.getByText('content optimization')).toBeDefined();
  });

  it('renders shared keywords as tags', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[]}
        cannibalizationRisks={[makeRisk()]}
      />
    );
    const tags = screen.getAllByTestId('keyword-tag');
    expect(tags).toHaveLength(3);
    expect(tags[0].textContent).toBe('SEO');
    expect(tags[1].textContent).toBe('optimization');
    expect(tags[2].textContent).toBe('content strategy');
  });

  it('renders high severity badge with red styling', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[]}
        cannibalizationRisks={[makeRisk({ severity: 'high' })]}
      />
    );
    const badge = screen.getByTestId('severity-badge');
    expect(badge.textContent).toBe('high');
    expect(badge.className).toContain('text-red-400');
  });

  it('renders medium severity badge with yellow styling', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[]}
        cannibalizationRisks={[makeRisk({ severity: 'medium' })]}
      />
    );
    const badge = screen.getByTestId('severity-badge');
    expect(badge.textContent).toBe('medium');
    expect(badge.className).toContain('text-yellow-400');
  });

  it('renders low severity badge with gray styling', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[]}
        cannibalizationRisks={[makeRisk({ severity: 'low' })]}
      />
    );
    const badge = screen.getByTestId('severity-badge');
    expect(badge.textContent).toBe('low');
    expect(badge.className).toContain('text-gray-400');
  });

  it('renders recommendation text', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[]}
        cannibalizationRisks={[makeRisk()]}
      />
    );
    expect(
      screen.getByText('Consolidate these pages into a single authoritative article.')
    ).toBeDefined();
  });

  it('shows empty state when no cannibalization risks', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[]}
        cannibalizationRisks={[]}
      />
    );
    expect(screen.getByText('No cannibalization risks detected')).toBeDefined();
  });

  // === Both sections together ===

  it('renders both sections with data simultaneously', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[makeSuggestion()]}
        cannibalizationRisks={[makeRisk()]}
      />
    );
    expect(screen.getByTestId('merge-suggestions-heading')).toBeDefined();
    expect(screen.getByTestId('cannibalization-heading')).toBeDefined();
    expect(screen.getByTestId('merge-suggestion-card')).toBeDefined();
    expect(screen.getByTestId('cannibalization-risk-card')).toBeDefined();
  });

  it('renders multiple suggestions', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[
          makeSuggestion({ sourceUrl: 'https://example.com/a' }),
          makeSuggestion({ sourceUrl: 'https://example.com/b' }),
        ]}
        cannibalizationRisks={[]}
      />
    );
    const cards = screen.getAllByTestId('merge-suggestion-card');
    expect(cards).toHaveLength(2);
  });

  it('clamps overlap bar width to 100%', () => {
    render(
      <ContentMergeSuggestionsPanel
        suggestions={[makeSuggestion({ overlapPercentage: 120 })]}
        cannibalizationRisks={[]}
      />
    );
    const bar = screen.getByTestId('overlap-bar');
    expect(bar.style.width).toBe('100%');
  });
});
