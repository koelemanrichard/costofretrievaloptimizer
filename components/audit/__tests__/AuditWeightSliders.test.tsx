import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditWeightSliders } from '../AuditWeightSliders';
import { DEFAULT_AUDIT_WEIGHTS } from '../../../services/audit/types';

const SCORED_PHASES = [
  'strategicFoundation',
  'eavSystem',
  'microSemantics',
  'informationDensity',
  'contextualFlow',
  'internalLinking',
  'semanticDistance',
  'contentFormat',
  'htmlTechnical',
  'metaStructuredData',
  'costOfRetrieval',
  'urlArchitecture',
  'crossPageConsistency',
];

const PHASE_DISPLAY_NAMES: Record<string, string> = {
  strategicFoundation: 'Strategic Foundation',
  eavSystem: 'EAV System',
  microSemantics: 'Micro-Semantics',
  informationDensity: 'Information Density',
  contextualFlow: 'Contextual Flow',
  internalLinking: 'Internal Linking',
  semanticDistance: 'Semantic Distance',
  contentFormat: 'Content Format',
  htmlTechnical: 'HTML Technical',
  metaStructuredData: 'Meta & Structured Data',
  costOfRetrieval: 'Cost of Retrieval',
  urlArchitecture: 'URL Architecture',
  crossPageConsistency: 'Cross-Page Consistency',
};

describe('AuditWeightSliders', () => {
  const defaultOnChange = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 13 phase sliders', () => {
    render(
      <AuditWeightSliders weights={DEFAULT_AUDIT_WEIGHTS} onChange={defaultOnChange} />,
    );

    for (const phase of SCORED_PHASES) {
      expect(screen.getByTestId(`slider-row-${phase}`)).toBeDefined();
      expect(screen.getByTestId(`slider-${phase}`)).toBeDefined();
    }

    // Verify exactly 13 slider rows
    const sliderRows = SCORED_PHASES.map((p) => screen.getByTestId(`slider-row-${p}`));
    expect(sliderRows).toHaveLength(13);
  });

  it('shows current weight values for each phase', () => {
    render(
      <AuditWeightSliders weights={DEFAULT_AUDIT_WEIGHTS} onChange={defaultOnChange} />,
    );

    for (const phase of SCORED_PHASES) {
      const valueEl = screen.getByTestId(`value-${phase}`);
      expect(valueEl.textContent).toBe(`${DEFAULT_AUDIT_WEIGHTS[phase]}%`);
    }
  });

  it('shows correct phase display names', () => {
    render(
      <AuditWeightSliders weights={DEFAULT_AUDIT_WEIGHTS} onChange={defaultOnChange} />,
    );

    for (const phase of SCORED_PHASES) {
      const label = screen.getByLabelText(PHASE_DISPLAY_NAMES[phase]);
      expect(label).toBeDefined();
    }
  });

  it('calls onChange when a slider changes', () => {
    const onChange = vi.fn();
    render(
      <AuditWeightSliders weights={DEFAULT_AUDIT_WEIGHTS} onChange={onChange} />,
    );

    const slider = screen.getByTestId('slider-strategicFoundation') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '20' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const newWeights = onChange.mock.calls[0][0];
    expect(newWeights.strategicFoundation).toBe(20);
    // Other weights unchanged
    expect(newWeights.eavSystem).toBe(DEFAULT_AUDIT_WEIGHTS.eavSystem);
    expect(newWeights.microSemantics).toBe(DEFAULT_AUDIT_WEIGHTS.microSemantics);
  });

  it('reset button restores default weights', () => {
    const onChange = vi.fn();
    const customWeights = { ...DEFAULT_AUDIT_WEIGHTS, strategicFoundation: 50, eavSystem: 0 };

    render(
      <AuditWeightSliders weights={customWeights} onChange={onChange} />,
    );

    const resetButton = screen.getByTestId('reset-weights-button');
    fireEvent.click(resetButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    const restoredWeights = onChange.mock.calls[0][0];
    expect(restoredWeights).toEqual(DEFAULT_AUDIT_WEIGHTS);
  });

  it('total display shows correct sum when weights equal 100', () => {
    render(
      <AuditWeightSliders weights={DEFAULT_AUDIT_WEIGHTS} onChange={defaultOnChange} />,
    );

    const totalValue = screen.getByTestId('total-value');
    expect(totalValue.textContent).toBe('Total: 100%');
    expect(totalValue.className).toContain('text-green-400');
  });

  it('total display shows correct sum when weights do not equal 100', () => {
    const badWeights = { ...DEFAULT_AUDIT_WEIGHTS, strategicFoundation: 50 };
    // Total becomes 100 - 10 + 50 = 140

    render(
      <AuditWeightSliders weights={badWeights} onChange={defaultOnChange} />,
    );

    const totalValue = screen.getByTestId('total-value');
    expect(totalValue.textContent).toBe('Total: 140%');
    expect(totalValue.className).toContain('text-red-400');
  });

  it('shows warning when total is not 100', () => {
    const badWeights = { ...DEFAULT_AUDIT_WEIGHTS, strategicFoundation: 50 };

    render(
      <AuditWeightSliders weights={badWeights} onChange={defaultOnChange} />,
    );

    const warning = screen.getByTestId('total-warning');
    expect(warning).toBeDefined();
    expect(warning.textContent).toContain('must sum to 100%');
    expect(warning.textContent).toContain('140%');
  });

  it('does not show warning when total is exactly 100', () => {
    render(
      <AuditWeightSliders weights={DEFAULT_AUDIT_WEIGHTS} onChange={defaultOnChange} />,
    );

    expect(screen.queryByTestId('total-warning')).toBeNull();
  });

  it('disabled state applies to all sliders and reset button', () => {
    render(
      <AuditWeightSliders
        weights={DEFAULT_AUDIT_WEIGHTS}
        onChange={defaultOnChange}
        disabled={true}
      />,
    );

    for (const phase of SCORED_PHASES) {
      const slider = screen.getByTestId(`slider-${phase}`) as HTMLInputElement;
      expect(slider.disabled).toBe(true);
    }

    const resetButton = screen.getByTestId('reset-weights-button') as HTMLButtonElement;
    expect(resetButton.disabled).toBe(true);
  });

  it('sliders are not disabled by default', () => {
    render(
      <AuditWeightSliders weights={DEFAULT_AUDIT_WEIGHTS} onChange={defaultOnChange} />,
    );

    for (const phase of SCORED_PHASES) {
      const slider = screen.getByTestId(`slider-${phase}`) as HTMLInputElement;
      expect(slider.disabled).toBe(false);
    }

    const resetButton = screen.getByTestId('reset-weights-button') as HTMLButtonElement;
    expect(resetButton.disabled).toBe(false);
  });

  it('slider range is 0-50 with step 1', () => {
    render(
      <AuditWeightSliders weights={DEFAULT_AUDIT_WEIGHTS} onChange={defaultOnChange} />,
    );

    const slider = screen.getByTestId('slider-strategicFoundation') as HTMLInputElement;
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('50');
    expect(slider.step).toBe('1');
  });

  it('handles missing weight keys gracefully with 0 default', () => {
    const sparseWeights: Record<string, number> = { strategicFoundation: 10 };

    render(
      <AuditWeightSliders weights={sparseWeights} onChange={defaultOnChange} />,
    );

    // strategicFoundation should show 10
    expect(screen.getByTestId('value-strategicFoundation').textContent).toBe('10%');
    // All others should show 0
    expect(screen.getByTestId('value-eavSystem').textContent).toBe('0%');
    expect(screen.getByTestId('value-microSemantics').textContent).toBe('0%');
  });
});
