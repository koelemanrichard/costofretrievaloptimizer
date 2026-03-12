import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import IntakeSummaryCard, { IntakeSummaryCardProps } from '../IntakeSummaryCard';

function makeFullProps(): IntakeSummaryCardProps {
  return {
    centralEntity: 'Acme Corp',
    services: ['Web Design', 'SEO Consulting'],
    websiteType: 'SaaS',
    language: 'en',
    contentNetwork: {
      totalPages: 42,
      corePages: ['/pricing', '/features'],
      authorPages: ['/blog/author/john'],
      orphanPages: [],
      hubSpokeClarity: 78,
      publishingFrequency: '2 per week',
    },
    technicalBaseline: {
      cms: 'WordPress',
      hasSchemaMarkup: true,
      hasCanonical: true,
    },
    conversionPath: {
      primaryAction: 'book demo',
      salesCycleLength: '1-2 weeks',
    },
  };
}

describe('IntakeSummaryCard', () => {
  it('renders with all data populated', () => {
    render(<IntakeSummaryCard {...makeFullProps()} />);
    expect(screen.getByTestId('intake-summary-card')).toBeDefined();
    expect(screen.getByText('Intake Summary')).toBeDefined();
  });

  it('shows Central Entity name', () => {
    render(<IntakeSummaryCard {...makeFullProps()} />);
    expect(screen.getByText('Acme Corp')).toBeDefined();
  });

  it('shows CMS name', () => {
    render(<IntakeSummaryCard {...makeFullProps()} />);
    expect(screen.getByText('WordPress')).toBeDefined();
  });

  it('shows page count', () => {
    render(<IntakeSummaryCard {...makeFullProps()} />);
    expect(screen.getByText('42')).toBeDefined();
  });

  it('shows amber warning when data is missing', () => {
    render(<IntakeSummaryCard />);
    // All sections should show warning icons (amber) since no data is provided
    const warningTexts = screen.getAllByText('Not configured');
    expect(warningTexts.length).toBeGreaterThan(0);
  });

  it('collapses and expands sections on click', () => {
    render(<IntakeSummaryCard {...makeFullProps()} />);
    const entityToggle = screen.getByTestId('section-toggle-entity');

    // Initially open
    expect(screen.getByTestId('section-content-entity')).toBeDefined();

    // Click to collapse
    fireEvent.click(entityToggle);
    expect(screen.queryByTestId('section-content-entity')).toBeNull();

    // Click to expand again
    fireEvent.click(entityToggle);
    expect(screen.getByTestId('section-content-entity')).toBeDefined();
  });

  it('shows services as comma-separated list', () => {
    render(<IntakeSummaryCard {...makeFullProps()} />);
    expect(screen.getByText('Web Design, SEO Consulting')).toBeDefined();
  });

  it('shows conversion path details', () => {
    render(<IntakeSummaryCard {...makeFullProps()} />);
    expect(screen.getByText('book demo')).toBeDefined();
    expect(screen.getByText('1-2 weeks')).toBeDefined();
  });
});
