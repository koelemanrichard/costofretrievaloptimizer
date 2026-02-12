import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExternalUrlInput } from '../ExternalUrlInput';

describe('ExternalUrlInput', () => {
  const defaultOnSubmit = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders URL input and submit button', () => {
    render(<ExternalUrlInput onSubmit={defaultOnSubmit} />);

    expect(screen.getByLabelText('URL to Audit')).toBeDefined();
    expect(screen.getByPlaceholderText('https://example.com/page')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Run Audit' })).toBeDefined();
  });

  it('validates URL on submit — invalid URL shows error', () => {
    render(<ExternalUrlInput onSubmit={defaultOnSubmit} />);

    const input = screen.getByLabelText('URL to Audit');
    fireEvent.change(input, { target: { value: 'not-a-url' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Run Audit' }));

    expect(screen.getByTestId('url-error')).toBeDefined();
    expect(screen.getByTestId('url-error').textContent).toBe(
      'Please enter a valid URL (http or https)',
    );
    expect(defaultOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with correct config for valid URL', () => {
    render(<ExternalUrlInput onSubmit={defaultOnSubmit} />);

    const input = screen.getByLabelText('URL to Audit');
    fireEvent.change(input, { target: { value: 'https://example.com/page' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Run Audit' }));

    expect(defaultOnSubmit).toHaveBeenCalledTimes(1);
    expect(defaultOnSubmit).toHaveBeenCalledWith({
      url: 'https://example.com/page',
      provider: 'jina',
      discoverRelated: false,
    });
  });

  it('provider selector changes work', () => {
    render(<ExternalUrlInput onSubmit={defaultOnSubmit} />);

    const select = screen.getByLabelText('Scraping Provider') as HTMLSelectElement;
    expect(select.value).toBe('jina');

    fireEvent.change(select, { target: { value: 'firecrawl' } });
    expect(select.value).toBe('firecrawl');

    // Submit with changed provider
    const input = screen.getByLabelText('URL to Audit');
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Run Audit' }));

    expect(defaultOnSubmit).toHaveBeenCalledWith({
      url: 'https://example.com',
      provider: 'firecrawl',
      discoverRelated: false,
    });
  });

  it('checkbox toggle works', () => {
    render(<ExternalUrlInput onSubmit={defaultOnSubmit} />);

    const checkbox = screen.getByLabelText('Discover related pages') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    // Submit with checkbox enabled
    const input = screen.getByLabelText('URL to Audit');
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Run Audit' }));

    expect(defaultOnSubmit).toHaveBeenCalledWith({
      url: 'https://example.com',
      provider: 'jina',
      discoverRelated: true,
    });
  });

  it('disabled state prevents interaction', () => {
    render(<ExternalUrlInput onSubmit={defaultOnSubmit} disabled />);

    const input = screen.getByLabelText('URL to Audit') as HTMLInputElement;
    const select = screen.getByLabelText('Scraping Provider') as HTMLSelectElement;
    const checkbox = screen.getByLabelText('Discover related pages') as HTMLInputElement;
    const button = screen.getByRole('button', { name: 'Run Audit' }) as HTMLButtonElement;

    expect(input.disabled).toBe(true);
    expect(select.disabled).toBe(true);
    expect(checkbox.disabled).toBe(true);
    expect(button.disabled).toBe(true);
  });

  it('loading state shows spinner text', () => {
    render(<ExternalUrlInput onSubmit={defaultOnSubmit} isLoading />);

    expect(screen.getByRole('button').textContent).toContain('Running Audit...');
    expect(screen.queryByText('Run Audit')).toBeNull();
  });

  it('clears error when URL becomes valid', () => {
    render(<ExternalUrlInput onSubmit={defaultOnSubmit} />);

    const input = screen.getByLabelText('URL to Audit');

    // Trigger error
    fireEvent.change(input, { target: { value: 'bad' } });
    fireEvent.submit(screen.getByRole('button'));
    expect(screen.getByTestId('url-error')).toBeDefined();

    // Fix URL - error should clear
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    expect(screen.queryByTestId('url-error')).toBeNull();
  });

  it('renders all four provider options', () => {
    render(<ExternalUrlInput onSubmit={defaultOnSubmit} />);

    const select = screen.getByLabelText('Scraping Provider');
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(4);

    const labels = Array.from(options).map((o) => o.textContent);
    expect(labels).toEqual([
      'Jina (Fast)',
      'Firecrawl (Thorough)',
      'Apify (Full crawl)',
      'Direct (fetch)',
    ]);
  });

  it('shows helper text for discover related checkbox', () => {
    render(<ExternalUrlInput onSubmit={defaultOnSubmit} />);

    expect(
      screen.getByText('Also audit linked pages from the same domain'),
    ).toBeDefined();
  });

  it('rejects ftp protocol URLs', () => {
    render(<ExternalUrlInput onSubmit={defaultOnSubmit} />);

    const input = screen.getByLabelText('URL to Audit');
    fireEvent.change(input, { target: { value: 'ftp://files.example.com' } });
    fireEvent.submit(screen.getByRole('button'));

    expect(screen.getByTestId('url-error')).toBeDefined();
    expect(defaultOnSubmit).not.toHaveBeenCalled();
  });
});
