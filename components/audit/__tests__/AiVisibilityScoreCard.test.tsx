import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AiVisibilityScoreCard } from '../AiVisibilityScoreCard';

describe('AiVisibilityScoreCard', () => {
  const defaultProps = {
    passageScore: 80,
    chunkingScore: 70,
    entityExplicitness: 60,
    answerCapsuleCompliance: 50,
  };

  it('renders all 4 dimension labels', () => {
    render(<AiVisibilityScoreCard {...defaultProps} />);
    expect(screen.getByText('Perfect Passage')).toBeDefined();
    expect(screen.getByText('Chunking Resistance')).toBeDefined();
    expect(screen.getByText('Entity Explicitness')).toBeDefined();
    expect(screen.getByText('Answer Capsules')).toBeDefined();
  });

  it('renders all 4 dimension scores', () => {
    render(<AiVisibilityScoreCard {...defaultProps} />);
    expect(screen.getByText('80')).toBeDefined();
    expect(screen.getByText('70')).toBeDefined();
    expect(screen.getByText('60')).toBeDefined();
    expect(screen.getByText('50')).toBeDefined();
  });

  it('renders weight percentages', () => {
    render(<AiVisibilityScoreCard {...defaultProps} />);
    expect(screen.getByText('30%')).toBeDefined();
    // Two 25% entries exist (chunking + entity explicitness)
    const twentyFivePercent = screen.getAllByText('25%');
    expect(twentyFivePercent).toHaveLength(2);
    expect(screen.getByText('20%')).toBeDefined();
  });

  it('computes weighted overall score correctly', () => {
    // 80*0.30 + 70*0.25 + 60*0.25 + 50*0.20 = 24 + 17.5 + 15 + 10 = 66.5 => 67
    render(<AiVisibilityScoreCard {...defaultProps} />);
    expect(screen.getByText('67')).toBeDefined();
  });

  it('shows warning message when overall score < 50', () => {
    const lowProps = {
      passageScore: 20,
      chunkingScore: 10,
      entityExplicitness: 15,
      answerCapsuleCompliance: 10,
    };
    // 20*0.30 + 10*0.25 + 15*0.25 + 10*0.20 = 6 + 2.5 + 3.75 + 2 = 14.25 => 14
    render(<AiVisibilityScoreCard {...lowProps} />);
    expect(screen.getByText('Content needs improvement for AI/LLM visibility')).toBeDefined();
  });

  it('does not show warning when overall score >= 50', () => {
    render(<AiVisibilityScoreCard {...defaultProps} />);
    expect(screen.queryByText('Content needs improvement for AI/LLM visibility')).toBeNull();
  });

  it('renders the AI Visibility Score heading', () => {
    render(<AiVisibilityScoreCard {...defaultProps} />);
    expect(screen.getByText('AI Visibility Score')).toBeDefined();
  });

  it('applies correct color classes for high scores', () => {
    const highProps = {
      passageScore: 90,
      chunkingScore: 85,
      entityExplicitness: 95,
      answerCapsuleCompliance: 80,
    };
    const { container } = render(<AiVisibilityScoreCard {...highProps} />);
    // Overall = 90*0.30 + 85*0.25 + 95*0.25 + 80*0.20 = 27 + 21.25 + 23.75 + 16 = 88
    // All scores >= 80 should use green
    const greenElements = container.querySelectorAll('.text-green-400');
    expect(greenElements.length).toBeGreaterThan(0);
  });
});
