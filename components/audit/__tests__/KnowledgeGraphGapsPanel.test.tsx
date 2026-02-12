import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KnowledgeGraphGapsPanel } from '../KnowledgeGraphGapsPanel';

const SAMPLE_TOPICS = [
  'Entity Salience',
  'Knowledge Panel Optimization',
  'Structured Data Markup',
  'Topical Authority Signals',
];

describe('KnowledgeGraphGapsPanel', () => {
  it('renders all missing topics', () => {
    render(<KnowledgeGraphGapsPanel missingTopics={SAMPLE_TOPICS} />);
    const topicCards = screen.getAllByTestId('topic-card');
    expect(topicCards).toHaveLength(4);
  });

  it('shows count badge with correct number', () => {
    render(<KnowledgeGraphGapsPanel missingTopics={SAMPLE_TOPICS} />);
    const badge = screen.getByTestId('topic-count-badge');
    expect(badge.textContent).toBe('4');
  });

  it('calls onAddTopic when clicking add button', () => {
    const onAddTopic = vi.fn();
    render(
      <KnowledgeGraphGapsPanel
        missingTopics={SAMPLE_TOPICS}
        onAddTopic={onAddTopic}
      />
    );
    const addButtons = screen.getAllByTestId('add-topic-button');
    fireEvent.click(addButtons[0]);
    expect(onAddTopic).toHaveBeenCalledOnce();
    expect(onAddTopic).toHaveBeenCalledWith('Entity Salience');
  });

  it('shows empty state when no topics are provided', () => {
    render(<KnowledgeGraphGapsPanel missingTopics={[]} />);
    const message = screen.getByTestId('empty-state-message');
    expect(message.textContent).toBe(
      'No knowledge graph gaps detected — your coverage is comprehensive.'
    );
  });

  it('renders topic names correctly', () => {
    render(<KnowledgeGraphGapsPanel missingTopics={SAMPLE_TOPICS} />);
    const topicNames = screen.getAllByTestId('topic-name');
    expect(topicNames[0].textContent).toBe('Entity Salience');
    expect(topicNames[1].textContent).toBe('Knowledge Panel Optimization');
    expect(topicNames[2].textContent).toBe('Structured Data Markup');
    expect(topicNames[3].textContent).toBe('Topical Authority Signals');
  });

  it('shows count badge as 0 in empty state', () => {
    render(<KnowledgeGraphGapsPanel missingTopics={[]} />);
    const badge = screen.getByTestId('topic-count-badge');
    expect(badge.textContent).toBe('0');
  });

  it('does not render add buttons when onAddTopic is not provided', () => {
    render(<KnowledgeGraphGapsPanel missingTopics={SAMPLE_TOPICS} />);
    const addButtons = screen.queryAllByTestId('add-topic-button');
    expect(addButtons).toHaveLength(0);
  });

  it('renders the section heading', () => {
    render(<KnowledgeGraphGapsPanel missingTopics={SAMPLE_TOPICS} />);
    expect(screen.getByText('Missing Knowledge Graph Topics')).toBeDefined();
  });

  it('has correct aria-label on add buttons', () => {
    const onAddTopic = vi.fn();
    render(
      <KnowledgeGraphGapsPanel
        missingTopics={['Entity Salience']}
        onAddTopic={onAddTopic}
      />
    );
    const button = screen.getByTestId('add-topic-button');
    expect(button.getAttribute('aria-label')).toBe(
      'Add Entity Salience to content plan'
    );
  });
});
