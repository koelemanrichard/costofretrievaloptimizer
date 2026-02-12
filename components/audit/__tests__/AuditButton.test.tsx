import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditButton } from '../AuditButton';

describe('AuditButton', () => {
  const defaultUrl = 'https://example.com/page';

  it('renders icon variant by default', () => {
    render(<AuditButton url={defaultUrl} />);
    const button = screen.getByRole('button');
    // Should have the SVG icon
    expect(button.querySelector('svg')).toBeInTheDocument();
    // Should NOT have text
    expect(button).not.toHaveTextContent('Audit');
  });

  it('renders text in icon-text variant', () => {
    render(<AuditButton url={defaultUrl} variant="icon-text" />);
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument();
    expect(button).toHaveTextContent('Audit');
  });

  it('renders text-only in text variant', () => {
    render(<AuditButton url={defaultUrl} variant="text" />);
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).not.toBeInTheDocument();
    expect(button).toHaveTextContent('Audit');
  });

  it('calls onClick with url on click', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<AuditButton url={defaultUrl} onClick={handleClick} />);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(defaultUrl);
  });

  it('applies custom className', () => {
    render(<AuditButton url={defaultUrl} className="my-custom-class" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('my-custom-class');
  });
});
