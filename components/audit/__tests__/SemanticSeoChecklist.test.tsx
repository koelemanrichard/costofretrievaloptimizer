import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SemanticSeoChecklist } from '../SemanticSeoChecklist';

describe('SemanticSeoChecklist', () => {
  test('renders all checklist phases', () => {
    render(<SemanticSeoChecklist />);
    expect(screen.getByText('Before Writing: Page Setup')).toBeInTheDocument();
    expect(screen.getByText('Writing: Every Sentence')).toBeInTheDocument();
    expect(screen.getByText('Writing: Every Section (H2/H3)')).toBeInTheDocument();
    expect(screen.getByText('Writing: Every Page')).toBeInTheDocument();
    expect(screen.getByText('Technical: Every Page')).toBeInTheDocument();
    expect(screen.getByText('LLM-Specific: Every Page')).toBeInTheDocument();
  });

  test('renders Semantic SEO Checklist title', () => {
    render(<SemanticSeoChecklist />);
    expect(screen.getByText('Semantic SEO Checklist')).toBeInTheDocument();
  });

  test('items are checkable', () => {
    render(<SemanticSeoChecklist />);
    // Setup phase is expanded by default
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();
  });

  test('calls onCheckChange when item toggled', () => {
    const onChange = vi.fn();
    render(<SemanticSeoChecklist onCheckChange={onChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenCalledWith(expect.any(String), true);
  });

  test('expands/collapses phases', () => {
    render(<SemanticSeoChecklist />);
    // Writing: Every Sentence should not show items initially (not expanded)
    expect(screen.queryByText('Clear S-P-O structure')).not.toBeInTheDocument();
    // Click to expand
    fireEvent.click(screen.getByText('Writing: Every Sentence'));
    expect(screen.getByText('Clear S-P-O structure')).toBeInTheDocument();
  });

  test('shows fluff words kill list when showKillList=true', () => {
    render(<SemanticSeoChecklist showKillList />);
    expect(screen.getByText('Fluff Words Kill List')).toBeInTheDocument();
    expect(screen.getByText('actually')).toBeInTheDocument();
    expect(screen.getByText('eigenlijk')).toBeInTheDocument();
    expect(screen.getByText('eigentlich')).toBeInTheDocument();
  });

  test('toggles fluff words kill list via button', () => {
    render(<SemanticSeoChecklist />);
    expect(screen.queryByText('Fluff Words Kill List')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Show Fluff Words'));
    expect(screen.getByText('Fluff Words Kill List')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Hide Fluff Words'));
    expect(screen.queryByText('Fluff Words Kill List')).not.toBeInTheDocument();
  });

  test('auto-checked items show "auto" badge when audit results provided', () => {
    const auditResults = {
      'CE_POSITION': { passed: true },
    };
    render(<SemanticSeoChecklist auditResults={auditResults} />);
    const autoBadges = screen.getAllByText('auto');
    expect(autoBadges.length).toBeGreaterThan(0);
  });

  test('auto-checked items are disabled', () => {
    const auditResults = {
      'CE_POSITION': { passed: true },
    };
    render(<SemanticSeoChecklist auditResults={auditResults} />);
    // Find the auto-checked checkbox (CE_POSITION maps to first item)
    const checkboxes = screen.getAllByRole('checkbox');
    const disabledCheckboxes = checkboxes.filter(cb => (cb as HTMLInputElement).disabled);
    expect(disabledCheckboxes.length).toBeGreaterThan(0);
  });
});
