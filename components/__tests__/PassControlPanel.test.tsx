// components/__tests__/PassControlPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PassControlPanel } from '../PassControlPanel';
import { DEFAULT_CONTENT_GENERATION_SETTINGS } from '../../types/contentGeneration';

describe('PassControlPanel', () => {
  const defaultPasses = DEFAULT_CONTENT_GENERATION_SETTINGS.passes;

  it('renders all pass toggles', () => {
    render(
      <PassControlPanel
        passes={defaultPasses}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Header Optimization')).toBeInTheDocument();
    expect(screen.getByText('Lists & Tables')).toBeInTheDocument();
    expect(screen.getByText('Final Audit')).toBeInTheDocument();
  });

  it('calls onChange when toggle is clicked', () => {
    const onChange = vi.fn();
    render(
      <PassControlPanel
        passes={defaultPasses}
        onChange={onChange}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Click first checkbox
    expect(onChange).toHaveBeenCalled();
  });

  it('disables save version checkbox when pass is disabled', () => {
    const disabledPasses = {
      ...defaultPasses,
      pass_2_headers: { enabled: false, storeVersion: true }
    };
    render(
      <PassControlPanel
        passes={disabledPasses}
        onChange={() => {}}
      />
    );
    // Find the save version checkbox for pass_2_headers (second checkbox in its row)
    const allCheckboxes = screen.getAllByRole('checkbox');
    // First checkbox is "Enabled" for pass_2_headers, second is "Save Version" for pass_2_headers
    expect(allCheckboxes[1]).toBeDisabled();
  });

  it('renders section title and all pass names', () => {
    render(
      <PassControlPanel
        passes={defaultPasses}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Refinement Passes')).toBeInTheDocument();
    expect(screen.getByText('Visual Semantics')).toBeInTheDocument();
    expect(screen.getByText('Introduction Synthesis')).toBeInTheDocument();
  });

  it('disables all controls when disabled prop is true', () => {
    render(
      <PassControlPanel
        passes={defaultPasses}
        onChange={() => {}}
        disabled={true}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeDisabled();
    });
  });

  it('updates passes correctly when enabled checkbox is toggled', () => {
    const onChange = vi.fn();
    render(
      <PassControlPanel
        passes={defaultPasses}
        onChange={onChange}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Toggle first "Enabled" checkbox

    expect(onChange).toHaveBeenCalledWith({
      ...defaultPasses,
      pass_2_headers: {
        ...defaultPasses.pass_2_headers,
        enabled: !defaultPasses.pass_2_headers.enabled
      }
    });
  });

  it('updates passes correctly when store version checkbox is toggled', () => {
    const onChange = vi.fn();
    render(
      <PassControlPanel
        passes={defaultPasses}
        onChange={onChange}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Toggle first "Save Version" checkbox

    expect(onChange).toHaveBeenCalledWith({
      ...defaultPasses,
      pass_2_headers: {
        ...defaultPasses.pass_2_headers,
        storeVersion: !defaultPasses.pass_2_headers.storeVersion
      }
    });
  });
});
