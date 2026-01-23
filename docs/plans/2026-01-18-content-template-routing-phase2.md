# Content Template Routing Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the Content Template Routing system with UI modals for user interaction, brief synchronization, visual semantics integration, and template compliance scoring.

**Architecture:** Phase 2 builds on the foundation from Phase 1 (Tasks 1-8). UI modals allow users to review and override AI template/depth selections. Brief sync ensures the selected template becomes the single source of truth. SectionPromptBuilder integration applies template format codes during generation. Pass 8 audit validates template compliance.

**Tech Stack:** React 18, TypeScript, TailwindCSS, existing Modal component, useBriefEditor hook, SectionPromptBuilder, Pass 8 audit system

**Dependencies:** Phase 1 complete (templateRouter.ts, depthAnalyzer.ts, conflictResolver.ts, zoneValidator.ts, config/contentTemplates.ts, types/contentTemplates.ts)

---

## Task 9: Create TemplateSelectionModal Component

**Files:**
- Create: `components/modals/TemplateSelectionModal.tsx`
- Create: `components/modals/__tests__/TemplateSelectionModal.test.tsx`

**Step 1: Write the test**

```typescript
// components/modals/__tests__/TemplateSelectionModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
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

    expect(screen.getByText(/DEFINITIONAL/i)).toBeInTheDocument();
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run components/modals/__tests__/TemplateSelectionModal.test.tsx`
Expected: FAIL - module not found

**Step 3: Create directory if needed**

```bash
mkdir -p components/modals/__tests__
```

**Step 4: Write the implementation**

```typescript
// components/modals/TemplateSelectionModal.tsx
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TemplateName, TemplateConfig } from '../../types/contentTemplates';
import { CONTENT_TEMPLATES, getTemplateByName } from '../../config/contentTemplates';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateName: TemplateName) => void;
  selectedTemplate: TemplateConfig;
  alternatives: Array<{ templateName: TemplateName; reason: string }>;
  reasoning: string[];
  confidence: number;
}

const TemplateSelectionModal: React.FC<TemplateSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedTemplate,
  alternatives,
  reasoning,
  confidence,
}) => {
  const [chosen, setChosen] = useState<TemplateName>(selectedTemplate.templateName);

  const handleConfirm = () => {
    onSelect(chosen);
    onClose();
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'text-green-400';
    if (conf >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={handleConfirm}>
        Confirm Selection
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Content Template"
      description="AI has analyzed your content and suggests the best template structure"
      maxWidth="max-w-2xl"
      footer={footer}
    >
      <div className="space-y-6">
        {/* AI Recommendation */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">AI Recommendation</h3>
            <span className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
              {confidence}% confidence
            </span>
          </div>

          {/* Selected template card */}
          <button
            onClick={() => setChosen(selectedTemplate.templateName)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
              chosen === selectedTemplate.templateName
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-gray-600 bg-gray-900/50 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-semibold">{selectedTemplate.templateName}</span>
                <span className="ml-2 text-gray-400 text-sm">{selectedTemplate.label}</span>
              </div>
              {chosen === selectedTemplate.templateName && (
                <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1">{selectedTemplate.description}</p>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                {selectedTemplate.minSections}-{selectedTemplate.maxSections} sections
              </span>
              <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                {selectedTemplate.stylometry.replace('_', ' ')}
              </span>
            </div>
          </button>

          {/* Reasoning */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Why this template?</h4>
            <ul className="space-y-1">
              {reasoning.map((reason, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Alternative Templates</h3>
            <div className="space-y-2">
              {alternatives.map((alt) => {
                const template = getTemplateByName(alt.templateName);
                if (!template) return null;

                return (
                  <button
                    key={alt.templateName}
                    onClick={() => setChosen(alt.templateName)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      chosen === alt.templateName
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">{alt.templateName}</span>
                        <span className="ml-2 text-gray-500 text-sm">{template.label}</span>
                      </div>
                      {chosen === alt.templateName && (
                        <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mt-1">{alt.reason}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Template Preview */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Template Structure: {chosen}
          </h3>
          <div className="bg-gray-900/50 rounded-lg p-3 max-h-48 overflow-y-auto">
            {getTemplateByName(chosen)?.sectionStructure.map((section, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 py-1 text-sm ${
                  section.required ? 'text-white' : 'text-gray-500'
                }`}
              >
                <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-mono">
                  {section.formatCode}
                </span>
                <span>{section.headingPattern}</span>
                {section.required && (
                  <span className="text-xs text-cyan-400">(required)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TemplateSelectionModal;
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run components/modals/__tests__/TemplateSelectionModal.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add components/modals/TemplateSelectionModal.tsx components/modals/__tests__/TemplateSelectionModal.test.tsx
git commit -m "feat(modal): add TemplateSelectionModal for AI template selection UI"
```

---

## Task 10: Create DepthSelectionModal Component

**Files:**
- Create: `components/modals/DepthSelectionModal.tsx`
- Create: `components/modals/__tests__/DepthSelectionModal.test.tsx`

**Step 1: Write the test**

```typescript
// components/modals/__tests__/DepthSelectionModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DepthSelectionModal from '../DepthSelectionModal';
import { DepthSuggestion } from '../../../types/contentTemplates';

describe('DepthSelectionModal', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  const mockSuggestion: DepthSuggestion = {
    recommended: 'high-quality',
    reasoning: [
      'Competitors average 2500 words',
      'High SERP difficulty detected',
      'Core topic requires comprehensive coverage',
    ],
    competitorBenchmark: {
      avgWordCount: 2500,
      avgSections: 8,
      topPerformerWordCount: 3200,
    },
    settings: {
      maxSections: 10,
      targetWordCount: { min: 2000, max: 3500 },
      sectionDepth: 'comprehensive',
    },
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSelect: mockOnSelect,
    suggestion: mockSuggestion,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display recommended depth mode', () => {
    render(<DepthSelectionModal {...defaultProps} />);

    expect(screen.getByText(/high-quality/i)).toBeInTheDocument();
  });

  it('should display competitor benchmark', () => {
    render(<DepthSelectionModal {...defaultProps} />);

    expect(screen.getByText(/2,500/)).toBeInTheDocument();
    expect(screen.getByText(/8 sections/i)).toBeInTheDocument();
  });

  it('should display all three depth options', () => {
    render(<DepthSelectionModal {...defaultProps} />);

    expect(screen.getByText(/High Quality/i)).toBeInTheDocument();
    expect(screen.getByText(/Moderate/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Publish/i)).toBeInTheDocument();
  });

  it('should call onSelect with chosen depth mode', () => {
    render(<DepthSelectionModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/Quick Publish/i));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockOnSelect).toHaveBeenCalledWith('quick-publish', undefined);
  });

  it('should display reasoning', () => {
    render(<DepthSelectionModal {...defaultProps} />);

    expect(screen.getByText(/Competitors average 2500 words/)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run components/modals/__tests__/DepthSelectionModal.test.tsx`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
// components/modals/DepthSelectionModal.tsx
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DepthMode, DepthSuggestion } from '../../types/contentTemplates';

interface DepthSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: DepthMode | 'custom', customSettings?: { maxSections: number; targetWordCount: { min: number; max: number } }) => void;
  suggestion: DepthSuggestion;
}

const DEPTH_OPTIONS: Array<{
  mode: DepthMode;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    mode: 'high-quality',
    label: 'High Quality',
    description: 'Comprehensive content for competitive rankings. Best for pillar pages and cornerstone content.',
    icon: '🏆',
  },
  {
    mode: 'moderate',
    label: 'Moderate',
    description: 'Balanced depth matching competitor average. Good for most content.',
    icon: '⚖️',
  },
  {
    mode: 'quick-publish',
    label: 'Quick Publish',
    description: 'Shorter content for fast publishing. Good for low-competition topics or supporting content.',
    icon: '⚡',
  },
];

const DepthSelectionModal: React.FC<DepthSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  suggestion,
}) => {
  const [chosen, setChosen] = useState<DepthMode>(suggestion.recommended);

  const handleConfirm = () => {
    onSelect(chosen, undefined);
    onClose();
  };

  const getSettingsForMode = (mode: DepthMode) => {
    const multipliers = {
      'high-quality': 1.3,
      'moderate': 1.0,
      'quick-publish': 0.6,
    };
    const base = suggestion.competitorBenchmark.avgWordCount;
    const mult = multipliers[mode];
    return {
      wordCount: { min: Math.round(base * mult * 0.8), max: Math.round(base * mult * 1.2) },
      sections: mode === 'high-quality' ? 10 : mode === 'moderate' ? 6 : 4,
    };
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={handleConfirm}>
        Confirm Selection
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Content Depth"
      description="Choose how comprehensive your content should be based on competitor analysis"
      maxWidth="max-w-2xl"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Competitor Benchmark */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Competitor Analysis</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {suggestion.competitorBenchmark.avgWordCount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Avg. Words</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {suggestion.competitorBenchmark.avgSections}
              </div>
              <div className="text-xs text-gray-400">Avg. Sections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {suggestion.competitorBenchmark.topPerformerWordCount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Top Performer</div>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">AI Analysis</h3>
          <ul className="space-y-1">
            {suggestion.reasoning.map((reason, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Depth Options */}
        <div className="space-y-3">
          {DEPTH_OPTIONS.map((option) => {
            const settings = getSettingsForMode(option.mode);
            const isRecommended = option.mode === suggestion.recommended;

            return (
              <button
                key={option.mode}
                onClick={() => setChosen(option.mode)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  chosen === option.mode
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{option.label}</span>
                        {isRecommended && (
                          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mt-0.5">{option.description}</p>
                    </div>
                  </div>
                  {chosen === option.mode && (
                    <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-500 ml-11">
                  <span>{settings.wordCount.min.toLocaleString()}-{settings.wordCount.max.toLocaleString()} words</span>
                  <span>Up to {settings.sections} sections</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default DepthSelectionModal;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run components/modals/__tests__/DepthSelectionModal.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/modals/DepthSelectionModal.tsx components/modals/__tests__/DepthSelectionModal.test.tsx
git commit -m "feat(modal): add DepthSelectionModal for content depth selection UI"
```

---

## Task 11: Create ConflictResolutionModal Component

**Files:**
- Create: `components/modals/ConflictResolutionModal.tsx`
- Create: `components/modals/__tests__/ConflictResolutionModal.test.tsx`

**Step 1: Write the test**

```typescript
// components/modals/__tests__/ConflictResolutionModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConflictResolutionModal from '../ConflictResolutionModal';
import { ConflictDetectionResult } from '../../../types/contentTemplates';

describe('ConflictResolutionModal', () => {
  const mockOnResolve = vi.fn();
  const mockOnClose = vi.fn();

  const mockDetection: ConflictDetectionResult = {
    hasConflicts: true,
    conflicts: [
      {
        field: 'formatCode',
        briefValue: 'PROSE',
        templateValue: 'FS',
        severity: 'critical',
        semanticSeoArgument: 'Featured Snippet format has 2-3x higher CTR for definitional queries.',
      },
      {
        field: 'formatCode',
        briefValue: 'PROSE',
        templateValue: 'LISTING',
        severity: 'moderate',
        semanticSeoArgument: 'List format has 47% higher Featured Snippet win rate.',
      },
    ],
    overallSeverity: 'critical',
    aiRecommendation: {
      action: 'use-template',
      reasoning: [
        'Critical conflicts detected - template format codes optimize for search visibility',
        'Featured Snippet format has higher CTR',
      ],
    },
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onResolve: mockOnResolve,
    detection: mockDetection,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display conflicts with severity', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByText(/critical/i)).toBeInTheDocument();
    expect(screen.getByText(/Featured Snippet/)).toBeInTheDocument();
  });

  it('should display AI recommendation', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByText(/Use Template/i)).toBeInTheDocument();
  });

  it('should display resolution options', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByText(/Use Template Values/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep Brief Values/i)).toBeInTheDocument();
  });

  it('should call onResolve with template choice', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/Use Template Values/i));
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(mockOnResolve).toHaveBeenCalledWith('template');
  });

  it('should call onResolve with brief choice', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/Keep Brief Values/i));
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(mockOnResolve).toHaveBeenCalledWith('brief');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run components/modals/__tests__/ConflictResolutionModal.test.tsx`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
// components/modals/ConflictResolutionModal.tsx
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConflictDetectionResult } from '../../types/contentTemplates';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (choice: 'template' | 'brief' | 'merge') => void;
  detection: ConflictDetectionResult;
}

const RESOLUTION_OPTIONS = [
  {
    choice: 'template' as const,
    label: 'Use Template Values',
    description: 'Apply recommended format codes from the template for optimal SEO',
    icon: '📋',
  },
  {
    choice: 'brief' as const,
    label: 'Keep Brief Values',
    description: 'Keep your current brief settings unchanged',
    icon: '📝',
  },
  {
    choice: 'merge' as const,
    label: 'Smart Merge',
    description: 'Use template for critical/moderate conflicts, keep brief for minor ones',
    icon: '🔀',
  },
];

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  onResolve,
  detection,
}) => {
  const [chosen, setChosen] = useState<'template' | 'brief' | 'merge'>(
    detection.aiRecommendation.action
  );

  const handleApply = () => {
    onResolve(chosen);
    onClose();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'moderate': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={handleApply}>
        Apply Resolution
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve Template Conflicts"
      description="Your brief has settings that differ from the recommended template"
      maxWidth="max-w-2xl"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Conflicts List */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Detected Conflicts ({detection.conflicts.length})
          </h3>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {detection.conflicts.map((conflict, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${getSeverityColor(conflict.severity)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{conflict.field}</span>
                  <span className="text-xs uppercase font-semibold">{conflict.severity}</span>
                </div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="bg-gray-800 px-2 py-0.5 rounded">{String(conflict.briefValue)}</span>
                  <span className="text-gray-500">→</span>
                  <span className="bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded">{String(conflict.templateValue)}</span>
                </div>
                <p className="text-xs text-gray-400">{conflict.semanticSeoArgument}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-cyan-400">
              AI Recommends: {detection.aiRecommendation.action === 'use-template' ? 'Use Template' : detection.aiRecommendation.action === 'use-brief' ? 'Keep Brief' : 'Smart Merge'}
            </span>
          </div>
          <ul className="space-y-1">
            {detection.aiRecommendation.reasoning.map((reason, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Resolution Options */}
        <div className="space-y-2">
          {RESOLUTION_OPTIONS.map((option) => (
            <button
              key={option.choice}
              onClick={() => setChosen(option.choice)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                chosen === option.choice
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{option.icon}</span>
                  <div>
                    <span className="text-white font-medium">{option.label}</span>
                    {detection.aiRecommendation.action === option.choice && (
                      <span className="ml-2 text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                    <p className="text-gray-400 text-sm mt-0.5">{option.description}</p>
                  </div>
                </div>
                {chosen === option.choice && (
                  <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default ConflictResolutionModal;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run components/modals/__tests__/ConflictResolutionModal.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/modals/ConflictResolutionModal.tsx components/modals/__tests__/ConflictResolutionModal.test.tsx
git commit -m "feat(modal): add ConflictResolutionModal for template/brief conflict resolution"
```

---

## Task 12: Brief Sync Mechanism - Add Template Fields to ContentBrief

**Files:**
- Modify: `types/content.ts` - Add template fields to ContentBrief interface
- Modify: `hooks/useBriefEditor.ts` - Add template update methods
- Create: `services/briefTemplateSync.ts` - Sync logic
- Test: `services/__tests__/briefTemplateSync.test.ts`

**Step 1: Add template fields to ContentBrief type**

In `types/content.ts`, add to the ContentBrief interface (around line 292):

```typescript
// Add after existing fields in ContentBrief interface
  /** Selected template name */
  selectedTemplate?: TemplateName;

  /** Template selection confidence from AI */
  templateConfidence?: number;

  /** User-selected depth mode */
  depthMode?: DepthMode;

  /** Resolved conflict choice */
  conflictResolution?: 'template' | 'brief' | 'merge';
```

**Step 2: Write the sync service test**

```typescript
// services/__tests__/briefTemplateSync.test.ts
import { describe, it, expect } from 'vitest';
import { syncBriefWithTemplate, applyTemplateFormatCodes } from '../briefTemplateSync';
import { CONTENT_TEMPLATES } from '../../config/contentTemplates';
import { ContentBrief } from '../../types/content';

describe('briefTemplateSync', () => {
  describe('syncBriefWithTemplate', () => {
    it('should add template fields to brief', () => {
      const brief: Partial<ContentBrief> = {
        title: 'Test Brief',
        structured_outline: [
          { heading: 'What is Test?', level: 2 },
          { heading: 'Benefits', level: 2 },
        ],
      };

      const result = syncBriefWithTemplate(
        brief as ContentBrief,
        'DEFINITIONAL',
        85,
        'high-quality'
      );

      expect(result.selectedTemplate).toBe('DEFINITIONAL');
      expect(result.templateConfidence).toBe(85);
      expect(result.depthMode).toBe('high-quality');
    });
  });

  describe('applyTemplateFormatCodes', () => {
    it('should apply format codes from template to matching sections', () => {
      const brief: Partial<ContentBrief> = {
        structured_outline: [
          { heading: 'What is Test Entity?', level: 2 },
          { heading: 'Key Features', level: 2 },
        ],
      };

      const result = applyTemplateFormatCodes(
        brief as ContentBrief,
        CONTENT_TEMPLATES.ECOMMERCE_PRODUCT
      );

      // First section should get FS format (overview)
      expect(result.structured_outline?.[0].format_code).toBeDefined();
    });

    it('should not override existing format codes when preserveExisting is true', () => {
      const brief: Partial<ContentBrief> = {
        structured_outline: [
          { heading: 'What is Test?', level: 2, format_code: 'PROSE' },
        ],
      };

      const result = applyTemplateFormatCodes(
        brief as ContentBrief,
        CONTENT_TEMPLATES.DEFINITIONAL,
        { preserveExisting: true }
      );

      expect(result.structured_outline?.[0].format_code).toBe('PROSE');
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run services/__tests__/briefTemplateSync.test.ts`
Expected: FAIL - module not found

**Step 4: Write the sync service implementation**

```typescript
// services/briefTemplateSync.ts
/**
 * Brief Template Sync Service
 *
 * Syncs template selection and settings back to the content brief,
 * ensuring the brief remains the single source of truth.
 */

import { ContentBrief, BriefSection } from '../types/content';
import { TemplateName, TemplateConfig, DepthMode } from '../types/contentTemplates';
import { getTemplateByName } from '../config/contentTemplates';

/**
 * Sync template selection to brief
 */
export function syncBriefWithTemplate(
  brief: ContentBrief,
  templateName: TemplateName,
  confidence: number,
  depthMode: DepthMode,
  conflictResolution?: 'template' | 'brief' | 'merge'
): ContentBrief {
  return {
    ...brief,
    selectedTemplate: templateName,
    templateConfidence: confidence,
    depthMode: depthMode,
    conflictResolution: conflictResolution,
  };
}

/**
 * Apply template format codes to brief sections
 */
export function applyTemplateFormatCodes(
  brief: ContentBrief,
  template: TemplateConfig,
  options?: { preserveExisting?: boolean }
): ContentBrief {
  const preserveExisting = options?.preserveExisting ?? false;

  if (!brief.structured_outline) {
    return brief;
  }

  const updatedOutline = brief.structured_outline.map((section) => {
    // Skip if preserving existing format codes
    if (preserveExisting && section.format_code) {
      return section;
    }

    // Find matching template section
    const matchingTemplate = findMatchingTemplateSection(
      section.heading || '',
      template.sectionStructure
    );

    if (matchingTemplate) {
      return {
        ...section,
        format_code: matchingTemplate.formatCode,
        attribute_category: matchingTemplate.attributeCategory,
        content_zone: matchingTemplate.contentZone,
      };
    }

    return section;
  });

  return {
    ...brief,
    structured_outline: updatedOutline,
  };
}

/**
 * Find matching template section by heading
 */
function findMatchingTemplateSection(
  heading: string,
  templateSections: TemplateConfig['sectionStructure']
) {
  const normalizedHeading = heading.toLowerCase().replace(/[^\w\s]/g, '');

  for (const templateSection of templateSections) {
    const pattern = templateSection.headingPattern
      .toLowerCase()
      .replace(/{[^}]+}/g, '') // Remove placeholders
      .replace(/[^\w\s]/g, '')
      .trim();

    // Check if heading contains key words from pattern
    const patternWords = pattern.split(/\s+/).filter(w => w.length > 3);
    const headingWords = normalizedHeading.split(/\s+/);

    const matchCount = patternWords.filter(pw =>
      headingWords.some(hw => hw.includes(pw) || pw.includes(hw))
    ).length;

    if (matchCount >= Math.min(2, patternWords.length)) {
      return templateSection;
    }
  }

  return null;
}

/**
 * Update brief with depth settings
 */
export function applyDepthSettings(
  brief: ContentBrief,
  depthMode: DepthMode,
  settings: { maxSections: number; targetWordCount: { min: number; max: number } }
): ContentBrief {
  return {
    ...brief,
    depthMode,
    suggestedLengthPreset: depthMode === 'high-quality' ? 'comprehensive'
      : depthMode === 'moderate' ? 'standard'
      : 'short',
    suggestedLengthReason: `Depth mode: ${depthMode} (${settings.targetWordCount.min}-${settings.targetWordCount.max} words target)`,
  };
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run services/__tests__/briefTemplateSync.test.ts`
Expected: PASS

**Step 6: Update useBriefEditor hook**

In `hooks/useBriefEditor.ts`, add method for template sync:

```typescript
// Add to the return object of useBriefEditor
const updateTemplateSelection = useCallback((
  templateName: TemplateName,
  confidence: number,
  depthMode: DepthMode
) => {
  setEditedBrief(prev => ({
    ...prev,
    selectedTemplate: templateName,
    templateConfidence: confidence,
    depthMode: depthMode,
  }));
}, []);
```

**Step 7: Commit**

```bash
git add types/content.ts services/briefTemplateSync.ts services/__tests__/briefTemplateSync.test.ts hooks/useBriefEditor.ts
git commit -m "feat(briefSync): add template sync service and brief type extensions"
```

---

## Task 13: Integrate Visual Semantics in SectionPromptBuilder

**Files:**
- Modify: `services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts`
- Test: `services/ai/contentGeneration/rulesEngine/prompts/__tests__/sectionPromptBuilder.test.ts`

**Step 1: Write the test**

```typescript
// services/ai/contentGeneration/rulesEngine/prompts/__tests__/sectionPromptBuilder.test.ts
import { describe, it, expect } from 'vitest';
import { SectionPromptBuilder } from '../sectionPromptBuilder';

describe('SectionPromptBuilder template integration', () => {
  it('should include format code constraints from template', () => {
    const context = {
      section: {
        heading: 'What is Test Entity?',
        format_code: 'FS',
      },
      brief: {
        title: 'Test Article',
        selectedTemplate: 'DEFINITIONAL',
      },
      businessInfo: {
        language: 'en',
      },
    };

    const prompt = SectionPromptBuilder.build(context as any);

    expect(prompt).toContain('Featured Snippet');
    expect(prompt).toContain('40-50 words');
  });

  it('should include visual semantics guidance when available', () => {
    const context = {
      section: {
        heading: 'Key Benefits',
        format_code: 'LISTING',
      },
      brief: {
        title: 'Test Article',
        enhanced_visual_semantics: {
          sectionImages: [
            {
              sectionKey: 'key-benefits',
              type: 'INFOGRAPHIC',
              description: 'Benefits comparison chart',
              altText: 'Infographic showing key benefits',
            },
          ],
        },
      },
      businessInfo: {
        language: 'en',
      },
    };

    const prompt = SectionPromptBuilder.build(context as any);

    expect(prompt).toContain('INFOGRAPHIC');
  });
});
```

**Step 2: Run test to verify current behavior**

Run: `npx vitest run services/ai/contentGeneration/rulesEngine/prompts/__tests__/sectionPromptBuilder.test.ts`

**Step 3: Modify SectionPromptBuilder to include template awareness**

In `sectionPromptBuilder.ts`, add after format code handling:

```typescript
// Add template-aware format guidance
private static buildTemplateFormatGuidance(section: BriefSection, brief: ContentBrief): string {
  const formatCode = section.format_code;
  if (!formatCode) return '';

  const constraints = BriefCodeParser.getFormatConstraints(formatCode);

  let guidance = `\n## FORMAT REQUIREMENTS (from template)\n`;
  guidance += `Format: ${formatCode}\n`;
  guidance += `${constraints}\n`;

  // Add visual semantics if available for this section
  if (brief.enhanced_visual_semantics?.sectionImages) {
    const sectionKey = section.key || section.heading?.toLowerCase().replace(/\s+/g, '-');
    const visualGuide = brief.enhanced_visual_semantics.sectionImages.find(
      v => v.sectionKey === sectionKey || section.heading?.toLowerCase().includes(v.sectionKey)
    );

    if (visualGuide) {
      guidance += `\n## VISUAL PLACEHOLDER\n`;
      guidance += `Type: ${visualGuide.type}\n`;
      guidance += `Description: ${visualGuide.description}\n`;
      guidance += `Alt text to include: ${visualGuide.altText}\n`;
      guidance += `Insert image placeholder: [IMAGE: ${visualGuide.description}]\n`;
    }
  }

  return guidance;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/ai/contentGeneration/rulesEngine/prompts/__tests__/sectionPromptBuilder.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts services/ai/contentGeneration/rulesEngine/prompts/__tests__/sectionPromptBuilder.test.ts
git commit -m "feat(promptBuilder): integrate template format codes and visual semantics"
```

---

## Task 14: Add Template Compliance Scoring to Pass 8

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.ts` - Add template compliance rules
- Modify: `services/ai/contentGeneration/passes/pass8Audit.ts` - Include template scoring
- Test: Existing audit tests

**Step 1: Add template compliance audit rules**

In `auditChecks.ts`, add new rules after existing ones:

```typescript
// Template Compliance Rules (25-27)

/**
 * Rule 25: Template Format Code Compliance
 * Checks if sections use the format codes specified by the template
 */
export function checkTemplateFormatCompliance(
  content: string,
  brief: ContentBrief,
  template?: TemplateConfig
): AuditRuleResult {
  if (!template || !brief.structured_outline) {
    return {
      ruleId: 25,
      ruleName: 'Template Format Compliance',
      passed: true,
      score: 100,
      message: 'No template specified - skipped',
      details: [],
    };
  }

  const issues: string[] = [];
  let compliantSections = 0;
  let totalSections = 0;

  for (const section of brief.structured_outline) {
    if (!section.format_code) continue;
    totalSections++;

    // Find expected format from template
    const templateSection = template.sectionStructure.find(ts => {
      const pattern = ts.headingPattern.toLowerCase().replace(/{[^}]+}/g, '');
      return section.heading?.toLowerCase().includes(pattern.trim().split(' ')[0]);
    });

    if (templateSection && section.format_code === templateSection.formatCode) {
      compliantSections++;
    } else if (templateSection) {
      issues.push(
        `Section "${section.heading}" uses ${section.format_code}, template recommends ${templateSection.formatCode}`
      );
    }
  }

  const score = totalSections > 0 ? Math.round((compliantSections / totalSections) * 100) : 100;

  return {
    ruleId: 25,
    ruleName: 'Template Format Compliance',
    passed: score >= 70,
    score,
    message: `${compliantSections}/${totalSections} sections match template format codes`,
    details: issues,
  };
}

/**
 * Rule 26: Template Section Coverage
 * Checks if all required template sections are present
 */
export function checkTemplateSectionCoverage(
  content: string,
  brief: ContentBrief,
  template?: TemplateConfig
): AuditRuleResult {
  if (!template || !brief.structured_outline) {
    return {
      ruleId: 26,
      ruleName: 'Template Section Coverage',
      passed: true,
      score: 100,
      message: 'No template specified - skipped',
      details: [],
    };
  }

  const requiredSections = template.sectionStructure.filter(s => s.required);
  const briefHeadings = brief.structured_outline.map(s => s.heading?.toLowerCase() || '');

  const missing: string[] = [];

  for (const required of requiredSections) {
    const pattern = required.headingPattern.toLowerCase().replace(/{[^}]+}/g, '');
    const found = briefHeadings.some(h =>
      pattern.split(' ').filter(w => w.length > 3).some(word => h.includes(word))
    );

    if (!found) {
      missing.push(required.headingPattern);
    }
  }

  const coverage = requiredSections.length > 0
    ? Math.round(((requiredSections.length - missing.length) / requiredSections.length) * 100)
    : 100;

  return {
    ruleId: 26,
    ruleName: 'Template Section Coverage',
    passed: missing.length === 0,
    score: coverage,
    message: missing.length === 0
      ? 'All required template sections present'
      : `Missing ${missing.length} required sections`,
    details: missing.map(m => `Missing: ${m}`),
  };
}

/**
 * Rule 27: Content Zone Balance
 * Checks MAIN vs SUPPLEMENTARY zone ratio
 */
export function checkContentZoneBalance(
  content: string,
  brief: ContentBrief
): AuditRuleResult {
  if (!brief.structured_outline) {
    return {
      ruleId: 27,
      ruleName: 'Content Zone Balance',
      passed: true,
      score: 100,
      message: 'No outline - skipped',
      details: [],
    };
  }

  const mainCount = brief.structured_outline.filter(
    s => s.content_zone === 'MAIN' || s.content_zone === ContentZone.MAIN
  ).length;

  const suppCount = brief.structured_outline.filter(
    s => s.content_zone === 'SUPPLEMENTARY' || s.content_zone === ContentZone.SUPPLEMENTARY
  ).length;

  const issues: string[] = [];
  let score = 100;

  if (mainCount < 3) {
    issues.push(`Only ${mainCount} MAIN sections (minimum 3 recommended)`);
    score -= 20;
  }

  if (suppCount > mainCount) {
    issues.push(`SUPPLEMENTARY (${suppCount}) exceeds MAIN (${mainCount})`);
    score -= 15;
  }

  return {
    ruleId: 27,
    ruleName: 'Content Zone Balance',
    passed: issues.length === 0,
    score: Math.max(0, score),
    message: `${mainCount} MAIN, ${suppCount} SUPPLEMENTARY sections`,
    details: issues,
  };
}
```

**Step 2: Update pass8Audit.ts to include template rules**

In `pass8Audit.ts`, add template compliance to the audit:

```typescript
// Add to existing audit checks array
import { checkTemplateFormatCompliance, checkTemplateSectionCoverage, checkContentZoneBalance } from './auditChecks';
import { getTemplateByName } from '../../../config/contentTemplates';

// In executePass8, add template-aware auditing:
const template = brief.selectedTemplate ? getTemplateByName(brief.selectedTemplate) : undefined;

// Add to algorithmic checks
const templateChecks = [
  checkTemplateFormatCompliance(draft, brief, template),
  checkTemplateSectionCoverage(draft, brief, template),
  checkContentZoneBalance(draft, brief),
];

// Merge with existing checks
const allChecks = [...existingChecks, ...templateChecks];
```

**Step 3: Run existing audit tests**

Run: `npx vitest run services/ai/contentGeneration/passes/`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/passes/auditChecks.ts services/ai/contentGeneration/passes/pass8Audit.ts
git commit -m "feat(audit): add template compliance scoring rules 25-27"
```

---

## Task 15-17: Website Type Template Testing

**Files:**
- Create: `config/__tests__/websiteTypeTemplates.test.ts`

**Step 1: Write comprehensive website type tests**

```typescript
// config/__tests__/websiteTypeTemplates.test.ts
import { describe, it, expect } from 'vitest';
import { WEBSITE_TYPE_TEMPLATE_MAP, CONTENT_TEMPLATES, getTemplateForWebsiteType } from '../contentTemplates';
import { selectTemplate } from '../../services/ai/contentGeneration/templateRouter';
import { WebsiteType } from '../../types';

const ALL_WEBSITE_TYPES: WebsiteType[] = [
  'ECOMMERCE', 'SAAS', 'SERVICE_B2B', 'INFORMATIONAL', 'AFFILIATE_REVIEW',
  'LEAD_GENERATION', 'REAL_ESTATE', 'MARKETPLACE', 'RECRUITMENT',
  'HEALTHCARE', 'EDUCATION', 'HOSPITALITY', 'EVENTS',
  'NEWS_MEDIA', 'DIRECTORY', 'COMMUNITY', 'NONPROFIT',
];

describe('Website Type Template Coverage', () => {
  describe('All 17 website types have template mappings', () => {
    it.each(ALL_WEBSITE_TYPES)('%s has a template mapping', (websiteType) => {
      const templateName = WEBSITE_TYPE_TEMPLATE_MAP[websiteType];
      expect(templateName).toBeDefined();
      expect(CONTENT_TEMPLATES[templateName]).toBeDefined();
    });
  });

  describe('Template selection produces valid results', () => {
    it.each(ALL_WEBSITE_TYPES)('%s returns valid template from selectTemplate', (websiteType) => {
      const result = selectTemplate({
        websiteType,
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
      });

      expect(result.template).toBeDefined();
      expect(result.template.templateName).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('Website type specific template appropriateness', () => {
    it('ECOMMERCE gets ECOMMERCE_PRODUCT template', () => {
      const template = getTemplateForWebsiteType('ECOMMERCE');
      expect(template.templateName).toBe('ECOMMERCE_PRODUCT');
    });

    it('HEALTHCARE gets HEALTHCARE_YMYL template', () => {
      const template = getTemplateForWebsiteType('HEALTHCARE');
      expect(template.templateName).toBe('HEALTHCARE_YMYL');
    });

    it('EDUCATION gets COURSE_EDUCATION template', () => {
      const template = getTemplateForWebsiteType('EDUCATION');
      expect(template.templateName).toBe('COURSE_EDUCATION');
    });

    it('NEWS_MEDIA gets NEWS_ARTICLE template', () => {
      const template = getTemplateForWebsiteType('NEWS_MEDIA');
      expect(template.templateName).toBe('NEWS_ARTICLE');
    });

    it('NONPROFIT gets IMPACT_NONPROFIT template', () => {
      const template = getTemplateForWebsiteType('NONPROFIT');
      expect(template.templateName).toBe('IMPACT_NONPROFIT');
    });

    it('REAL_ESTATE gets LOCATION_REALESTATE template', () => {
      const template = getTemplateForWebsiteType('REAL_ESTATE');
      expect(template.templateName).toBe('LOCATION_REALESTATE');
    });

    it('EVENTS gets EVENT_EXPERIENCE template', () => {
      const template = getTemplateForWebsiteType('EVENTS');
      expect(template.templateName).toBe('EVENT_EXPERIENCE');
    });

    it('AFFILIATE_REVIEW gets COMPARISON template', () => {
      const template = getTemplateForWebsiteType('AFFILIATE_REVIEW');
      expect(template.templateName).toBe('COMPARISON');
    });
  });

  describe('Query intent affects template selection', () => {
    it('Commercial intent with comparison hints selects COMPARISON', () => {
      const result = selectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'commercial',
        queryType: 'comparative',
        topicType: 'outer',
        topicClass: 'informational',
        briefHints: {
          hasComparisonSections: true,
          hasStepSections: false,
          hasSpecsSections: false,
        },
      });

      expect(result.template.templateName).toBe('COMPARISON');
    });

    it('Procedural query type selects PROCESS_HOWTO', () => {
      const result = selectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'procedural',
        topicType: 'outer',
        topicClass: 'informational',
        briefHints: {
          hasComparisonSections: false,
          hasStepSections: true,
          hasSpecsSections: false,
        },
      });

      expect(result.template.templateName).toBe('PROCESS_HOWTO');
    });
  });

  describe('Template section structure validity', () => {
    it.each(Object.entries(CONTENT_TEMPLATES))('%s has valid section structure', ([name, template]) => {
      expect(template.sectionStructure.length).toBeGreaterThan(0);
      expect(template.sectionStructure.length).toBeLessThanOrEqual(template.maxSections);

      // Check required sections exist
      const requiredCount = template.sectionStructure.filter(s => s.required).length;
      expect(requiredCount).toBeGreaterThanOrEqual(template.minSections);

      // Check all sections have valid format codes
      const validCodes = ['FS', 'PAA', 'LISTING', 'DEFINITIVE', 'TABLE', 'PROSE'];
      template.sectionStructure.forEach(section => {
        expect(validCodes).toContain(section.formatCode);
      });
    });
  });
});
```

**Step 2: Run the comprehensive tests**

Run: `npx vitest run config/__tests__/websiteTypeTemplates.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add config/__tests__/websiteTypeTemplates.test.ts
git commit -m "test: add comprehensive website type template coverage tests"
```

---

## Summary

This Phase 2 plan covers **9 tasks** (Tasks 9-17) that complete the Content Template Routing system:

1. **Task 9**: TemplateSelectionModal - UI for template selection with AI reasoning
2. **Task 10**: DepthSelectionModal - UI for content depth selection
3. **Task 11**: ConflictResolutionModal - UI for resolving template/brief conflicts
4. **Task 12**: Brief Sync - Service and types for syncing template to brief
5. **Task 13**: SectionPromptBuilder Integration - Apply template format codes in prompts
6. **Task 14**: Pass 8 Template Compliance - Audit rules for template compliance
7. **Tasks 15-17**: Website Type Testing - Comprehensive tests for all 17 website types

Each task follows TDD with:
- Write failing test first
- Run to verify failure
- Write minimal implementation
- Run to verify pass
- Commit

---

## Next Steps (Future Tasks)

After Phase 2, consider:
- **Task 18-20**: Integration with ContentGenerationProgress UI
- **Task 21**: Template suggestions in BriefEditModal
- **Task 22**: Template analytics and usage tracking
- **Task 23**: A/B testing infrastructure for template effectiveness
