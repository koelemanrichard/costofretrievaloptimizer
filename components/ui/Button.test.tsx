import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    await user.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Click Me</Button>);

    await user.click(screen.getByText('Click Me'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies disabled styling when disabled', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByText('Disabled Button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
    expect(button).toHaveClass('disabled:cursor-not-allowed');
  });

  it('renders primary variant by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByText('Primary');
    expect(button).toHaveClass('bg-blue-600');
    expect(button).toHaveClass('text-white');
  });

  it('renders secondary variant correctly', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByText('Secondary');
    expect(button).toHaveClass('bg-gray-600');
    expect(button).toHaveClass('text-gray-200');
  });

  it('renders medium size by default', () => {
    render(<Button>Medium</Button>);
    const button = screen.getByText('Medium');
    // Mobile-first responsive classes: px-4 base, sm:px-6 for larger screens
    expect(button).toHaveClass('px-4');
    expect(button).toHaveClass('py-2.5');
    expect(button).toHaveClass('min-h-[44px]');
  });

  it('renders small size correctly', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByText('Small');
    expect(button).toHaveClass('px-3');
    expect(button).toHaveClass('py-2');
    expect(button).toHaveClass('text-sm');
  });

  it('renders large size correctly', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByText('Large');
    // Mobile-first responsive classes: px-6 base, sm:px-8 for larger screens
    expect(button).toHaveClass('px-6');
    expect(button).toHaveClass('py-3');
    expect(button).toHaveClass('text-lg');
  });

  it('merges custom className with base classes', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByText('Custom');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('font-semibold');
    expect(button).toHaveClass('rounded-lg');
  });

  it('passes through HTML button attributes', () => {
    render(<Button type="submit" data-testid="submit-btn">Submit</Button>);
    const button = screen.getByTestId('submit-btn');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
