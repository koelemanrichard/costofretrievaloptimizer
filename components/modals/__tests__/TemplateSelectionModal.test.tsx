// components/modals/__tests__/TemplateSelectionModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TemplateSelectionModal from '../TemplateSelectionModal';
import { CONTENT_TEMPLATES } from '../../../config/contentTemplates';

describe('TemplateSelectionModal', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSelect: mockOnSelect,
    selectedTemplate: CONTENT_TEMPLATES.DEFINITIONAL,
    alternatives: [
      { templateName: 'COMPARISON' as const, reason: 'Commercial intent detected' },
      { templateName: 'PROCESS_HOWTO' as const, reason: 'Step-based content detected' },
    ],
    reasoning: [
      'Website type is INFORMATIONAL - primary template is DEFINITIONAL',
      'Informational intent aligns with DEFINITIONAL template',
    ],
    confidence: 85,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display selected template with confidence', () => {
    render(<TemplateSelectionModal {...defaultProps} />);

    // Template name appears in multiple places (card, reasoning, preview header)
    expect(screen.getAllByText(/DEFINITIONAL/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('should display AI reasoning', () => {
    render(<TemplateSelectionModal {...defaultProps} />);

    expect(screen.getByText(/Website type is INFORMATIONAL/)).toBeInTheDocument();
  });

  it('should display alternative templates', () => {
    render(<TemplateSelectionModal {...defaultProps} />);

    expect(screen.getByText(/COMPARISON/)).toBeInTheDocument();
    expect(screen.getByText(/PROCESS_HOWTO/)).toBeInTheDocument();
  });

  it('should call onSelect when template is confirmed', () => {
    render(<TemplateSelectionModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockOnSelect).toHaveBeenCalledWith('DEFINITIONAL');
  });

  it('should call onSelect with alternative when clicked', () => {
    render(<TemplateSelectionModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/COMPARISON/));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockOnSelect).toHaveBeenCalledWith('COMPARISON');
  });

  it('should call onClose when cancelled', () => {
    render(<TemplateSelectionModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });
});
