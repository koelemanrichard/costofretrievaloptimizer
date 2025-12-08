// components/__tests__/ContentGenerationSettingsPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContentGenerationSettingsPanel } from '../ContentGenerationSettingsPanel';
import { DEFAULT_CONTENT_GENERATION_SETTINGS, PRIORITY_PRESETS } from '../../types/contentGeneration';

describe('ContentGenerationSettingsPanel', () => {
  const defaultSettings = {
    ...DEFAULT_CONTENT_GENERATION_SETTINGS,
    id: 'test',
    userId: 'user-1',
    createdAt: '',
    updatedAt: ''
  };

  it('renders all priority sliders', () => {
    render(
      <ContentGenerationSettingsPanel
        settings={defaultSettings as any}
        onChange={() => {}}
        presets={PRIORITY_PRESETS}
      />
    );
    expect(screen.getByText('Human Readability')).toBeInTheDocument();
    expect(screen.getByText('Business & Conversion')).toBeInTheDocument();
    expect(screen.getByText('Machine Optimization')).toBeInTheDocument();
    expect(screen.getByText('Factual Density')).toBeInTheDocument();
  });

  it('renders preset buttons', () => {
    render(
      <ContentGenerationSettingsPanel
        settings={defaultSettings as any}
        onChange={() => {}}
        presets={PRIORITY_PRESETS}
      />
    );
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('Seo Focused')).toBeInTheDocument();
  });

  it('calls onChange when preset is selected', () => {
    const onChange = vi.fn();
    render(
      <ContentGenerationSettingsPanel
        settings={defaultSettings as any}
        onChange={onChange}
        presets={PRIORITY_PRESETS}
      />
    );
    fireEvent.click(screen.getByText('Seo Focused'));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].priorities).toEqual(PRIORITY_PRESETS.seo_focused);
  });

  it('renders tone and audience selects', () => {
    render(
      <ContentGenerationSettingsPanel
        settings={defaultSettings as any}
        onChange={() => {}}
        presets={PRIORITY_PRESETS}
      />
    );
    expect(screen.getByLabelText('Tone')).toBeInTheDocument();
    expect(screen.getByLabelText('Audience')).toBeInTheDocument();
  });
});
