import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WebsiteTypeSelector } from '../WebsiteTypeSelector';

describe('WebsiteTypeSelector', () => {
  it('renders the label', () => {
    render(
      <WebsiteTypeSelector value="blog" onChange={vi.fn()} />
    );
    expect(screen.getByText('Website Type')).toBeDefined();
  });

  it('renders all 6 options', () => {
    render(
      <WebsiteTypeSelector value="blog" onChange={vi.fn()} />
    );
    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(6);

    const optionValues = Array.from(options).map((o) => o.value);
    expect(optionValues).toEqual([
      'ecommerce',
      'saas',
      'b2b',
      'blog',
      'local-business',
      'other',
    ]);
  });

  it('has the current value selected', () => {
    render(
      <WebsiteTypeSelector value="saas" onChange={vi.fn()} />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('saas');
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(
      <WebsiteTypeSelector value="blog" onChange={onChange} />
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'ecommerce' } });
    expect(onChange).toHaveBeenCalledWith('ecommerce');
  });

  it('disables the select when disabled prop is true', () => {
    render(
      <WebsiteTypeSelector value="blog" onChange={vi.fn()} disabled />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });

  it('renders the helper text', () => {
    render(
      <WebsiteTypeSelector value="blog" onChange={vi.fn()} />
    );
    expect(
      screen.getByText('Website type determines which industry-specific rules apply.')
    ).toBeDefined();
  });
});
