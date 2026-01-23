# Content Template Routing Phase 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate template routing into the content generation UI flow, add template suggestions to brief editing, implement analytics tracking, and create A/B testing infrastructure.

**Architecture:** Phase 3 builds on the completed foundation (Phase 1-2). The UI integration adds a pre-generation template confirmation step, displays template metadata during generation, and tracks performance for analytics. A/B testing allows comparing template effectiveness.

**Tech Stack:** React 18, TypeScript, TailwindCSS, Supabase (database + edge functions), existing content generation pipeline

**Dependencies:** Phase 1-2 complete (templateRouter, depthAnalyzer, conflictResolver, UI modals, briefSync, SectionPromptBuilder integration, Pass 8 compliance)

---

## Task 18: Add Template Selection to Content Generation Flow

**Files:**
- Modify: `components/ProjectDashboardContainer.tsx` - Add template selection before generation
- Modify: `hooks/useContentGeneration.ts` - Pass template to orchestrator
- Modify: `services/ai/contentGeneration/orchestrator.ts` - Accept and apply template

**Step 1: Read the current generation trigger**

Read `components/ProjectDashboardContainer.tsx` and find the `onGenerateDraft` callback (around line 1605).

**Step 2: Add template selection state to ProjectDashboardContainer**

```typescript
// Add state for template selection modal
const [showTemplateConfirmModal, setShowTemplateConfirmModal] = useState(false);
const [pendingGenerationBrief, setPendingGenerationBrief] = useState<ContentBrief | null>(null);
const [selectedTemplateForGeneration, setSelectedTemplateForGeneration] = useState<TemplateName | null>(null);
```

**Step 3: Modify onGenerateDraft to show template confirmation**

```typescript
const onGenerateDraft = useCallback(async (brief: ContentBrief, overrideSettings?: { provider: string, model: string }) => {
  // If brief doesn't have a template selected, show modal first
  if (!brief.selectedTemplate) {
    setPendingGenerationBrief(brief);
    setShowTemplateConfirmModal(true);
    return;
  }

  // Proceed with generation using brief's template
  await executeGeneration(brief, overrideSettings);
}, [executeGeneration]);

const executeGeneration = useCallback(async (
  brief: ContentBrief,
  overrideSettings?: { provider: string, model: string }
) => {
  // Existing generation logic...
  // Pass brief.selectedTemplate to orchestrator
}, [/* deps */]);

const handleTemplateConfirmed = useCallback(async (templateName: TemplateName) => {
  if (!pendingGenerationBrief) return;

  // Update brief with selected template
  const updatedBrief = syncBriefWithTemplate(
    pendingGenerationBrief,
    templateName,
    90, // default confidence for user selection
    'moderate' // default depth
  );

  setShowTemplateConfirmModal(false);
  setPendingGenerationBrief(null);

  await executeGeneration(updatedBrief);
}, [pendingGenerationBrief, executeGeneration]);
```

**Step 4: Add TemplateSelectionModal to render**

```tsx
{showTemplateConfirmModal && pendingGenerationBrief && (
  <TemplateConfirmationFlow
    isOpen={showTemplateConfirmModal}
    onClose={() => {
      setShowTemplateConfirmModal(false);
      setPendingGenerationBrief(null);
    }}
    brief={pendingGenerationBrief}
    businessInfo={effectiveBusinessInfo}
    onConfirm={handleTemplateConfirmed}
  />
)}
```

**Step 5: Update useContentGeneration hook**

In `hooks/useContentGeneration.ts`, ensure the template is passed to the orchestrator:

```typescript
// In startGeneration or equivalent function
const startGeneration = useCallback(async (brief: ContentBrief) => {
  // Template is now in brief.selectedTemplate
  const template = brief.selectedTemplate
    ? getTemplateByName(brief.selectedTemplate)
    : undefined;

  // Pass to orchestrator initialization
  orchestrator.current = new ContentGenerationOrchestrator({
    brief,
    businessInfo,
    template, // NEW: pass template
    // ... other options
  });
}, [businessInfo]);
```

**Step 6: Update orchestrator to accept template**

In `services/ai/contentGeneration/orchestrator.ts`, add template to constructor options and store it:

```typescript
interface OrchestratorOptions {
  brief: ContentBrief;
  businessInfo: BusinessInfo;
  template?: TemplateConfig; // NEW
  // ... existing options
}

export class ContentGenerationOrchestrator {
  private template?: TemplateConfig;

  constructor(options: OrchestratorOptions) {
    this.template = options.template;
    // ... existing initialization
  }
}
```

**Step 7: Commit**

```bash
git add components/ProjectDashboardContainer.tsx hooks/useContentGeneration.ts services/ai/contentGeneration/orchestrator.ts
git commit -m "feat(generation): add template selection before content generation"
```

---

## Task 19: Create TemplateConfirmationFlow Component

**Files:**
- Create: `components/generation/TemplateConfirmationFlow.tsx`
- Create: `components/generation/__tests__/TemplateConfirmationFlow.test.tsx`

**Step 1: Write the test**

```typescript
// components/generation/__tests__/TemplateConfirmationFlow.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TemplateConfirmationFlow from '../TemplateConfirmationFlow';
import { CONTENT_TEMPLATES } from '../../../config/contentTemplates';

describe('TemplateConfirmationFlow', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  const mockBrief = {
    title: 'Test Article',
    structured_outline: [
      { heading: 'What is Test?', level: 2 },
      { heading: 'Benefits', level: 2 },
    ],
  };

  const mockBusinessInfo = {
    websiteType: 'INFORMATIONAL',
    language: 'en',
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    brief: mockBrief as any,
    businessInfo: mockBusinessInfo as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show AI-recommended template', async () => {
    render(<TemplateConfirmationFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/AI Recommendation/i)).toBeInTheDocument();
    });
  });

  it('should show 3 steps: Template, Depth, Conflicts', () => {
    render(<TemplateConfirmationFlow {...defaultProps} />);

    expect(screen.getByText(/Template/i)).toBeInTheDocument();
    expect(screen.getByText(/Depth/i)).toBeInTheDocument();
  });

  it('should call onConfirm with selected template when confirmed', async () => {
    render(<TemplateConfirmationFlow {...defaultProps} />);

    // Wait for template selection to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm|next|continue/i })).toBeInTheDocument();
    });

    // Navigate through steps and confirm
    // (Test specific step interactions)
  });

  it('should call onClose when cancelled', () => {
    render(<TemplateConfirmationFlow {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run components/generation/__tests__/TemplateConfirmationFlow.test.tsx`
Expected: FAIL - module not found

**Step 3: Create directory**

```bash
mkdir -p components/generation/__tests__
```

**Step 4: Write the implementation**

```typescript
// components/generation/TemplateConfirmationFlow.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import { TemplateSelectionModal } from '../modals/TemplateSelectionModal';
import { DepthSelectionModal } from '../modals/DepthSelectionModal';
import { ConflictResolutionModal } from '../modals/ConflictResolutionModal';
import { selectTemplate } from '../../services/ai/contentGeneration/templateRouter';
import { analyzeAndSuggestDepth } from '../../services/ai/contentGeneration/depthAnalyzer';
import { detectConflicts } from '../../services/ai/contentGeneration/conflictResolver';
import { getTemplateByName } from '../../config/contentTemplates';
import { ContentBrief, BusinessInfo } from '../../types';
import { TemplateName, TemplateSelectionResult, DepthSuggestion, ConflictDetectionResult } from '../../types/contentTemplates';

interface TemplateConfirmationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (templateName: TemplateName) => void;
  brief: ContentBrief;
  businessInfo: BusinessInfo;
}

type FlowStep = 'loading' | 'template' | 'depth' | 'conflicts' | 'ready';

const TemplateConfirmationFlow: React.FC<TemplateConfirmationFlowProps> = ({
  isOpen,
  onClose,
  onConfirm,
  brief,
  businessInfo,
}) => {
  const [step, setStep] = useState<FlowStep>('loading');
  const [templateResult, setTemplateResult] = useState<TemplateSelectionResult | null>(null);
  const [depthSuggestion, setDepthSuggestion] = useState<DepthSuggestion | null>(null);
  const [conflictResult, setConflictResult] = useState<ConflictDetectionResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateName | null>(null);
  const [selectedDepth, setSelectedDepth] = useState<'high-quality' | 'moderate' | 'quick-publish'>('moderate');

  // Run AI analysis on mount
  useEffect(() => {
    if (!isOpen) return;

    const analyze = async () => {
      setStep('loading');

      // 1. Get template recommendation
      const templateInput = {
        websiteType: businessInfo.websiteType || 'INFORMATIONAL',
        queryIntent: brief.search_intent || 'informational',
        queryType: brief.query_type || 'definitional',
        topicType: (brief.topic_type || 'core') as 'core' | 'outer' | 'child',
        topicClass: brief.topic_class || 'informational',
      };

      const result = selectTemplate(templateInput);
      setTemplateResult(result);
      setSelectedTemplate(result.template.templateName);

      // 2. Get depth suggestion
      const depthInput = {
        competitorAnalysis: brief.competitorMetrics || { avgWordCount: 1500, avgSections: 6 },
        serpDifficulty: brief.serp_difficulty || 50,
        topicType: brief.topic_type || 'core',
        existingAuthority: businessInfo.authorityScore || 30,
        queryIntent: brief.search_intent || 'informational',
      };

      const depth = analyzeAndSuggestDepth(depthInput);
      setDepthSuggestion(depth);
      setSelectedDepth(depth.recommended);

      // 3. Check for conflicts
      const template = getTemplateByName(result.template.templateName);
      if (template) {
        const conflicts = detectConflicts(brief, template);
        setConflictResult(conflicts);
      }

      setStep('template');
    };

    analyze();
  }, [isOpen, brief, businessInfo]);

  const handleTemplateSelect = (templateName: TemplateName) => {
    setSelectedTemplate(templateName);

    // Re-check conflicts with new template
    const template = getTemplateByName(templateName);
    if (template) {
      const conflicts = detectConflicts(brief, template);
      setConflictResult(conflicts);
    }

    setStep('depth');
  };

  const handleDepthSelect = (depth: 'high-quality' | 'moderate' | 'quick-publish') => {
    setSelectedDepth(depth);

    // If conflicts exist, show conflict resolution
    if (conflictResult?.hasConflicts) {
      setStep('conflicts');
    } else {
      setStep('ready');
    }
  };

  const handleConflictResolve = (choice: 'template' | 'brief' | 'merge') => {
    // Apply conflict resolution (could update brief here)
    setStep('ready');
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onConfirm(selectedTemplate);
    }
  };

  // Render based on current step
  if (step === 'loading') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Preparing Content Generation">
        <div className="flex flex-col items-center justify-center py-12">
          <SmartLoader context="analyzing" size="lg" />
          <p className="mt-4 text-gray-400">Analyzing your content brief...</p>
        </div>
      </Modal>
    );
  }

  if (step === 'template' && templateResult) {
    return (
      <TemplateSelectionModal
        isOpen={isOpen}
        onClose={onClose}
        onSelect={handleTemplateSelect}
        selectedTemplate={templateResult.template}
        alternatives={templateResult.alternatives}
        reasoning={templateResult.reasoning}
        confidence={templateResult.confidence}
      />
    );
  }

  if (step === 'depth' && depthSuggestion) {
    return (
      <DepthSelectionModal
        isOpen={isOpen}
        onClose={onClose}
        onSelect={handleDepthSelect}
        suggestion={depthSuggestion}
      />
    );
  }

  if (step === 'conflicts' && conflictResult) {
    return (
      <ConflictResolutionModal
        isOpen={isOpen}
        onClose={onClose}
        onResolve={handleConflictResolve}
        detection={conflictResult}
      />
    );
  }

  // Ready step - final confirmation
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ready to Generate"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Start Generation</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Configuration Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Template:</span>
              <span className="text-white font-medium">{selectedTemplate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Depth:</span>
              <span className="text-white font-medium capitalize">{selectedDepth.replace('-', ' ')}</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Click "Start Generation" to begin the 10-pass content generation process.
        </p>
      </div>
    </Modal>
  );
};

export default TemplateConfirmationFlow;
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run components/generation/__tests__/TemplateConfirmationFlow.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add components/generation/TemplateConfirmationFlow.tsx components/generation/__tests__/TemplateConfirmationFlow.test.tsx
git commit -m "feat(generation): add TemplateConfirmationFlow multi-step wizard"
```

---

## Task 20: Add Template Badge to ContentGenerationProgress

**Files:**
- Modify: `components/ContentGenerationProgress.tsx` - Add template display

**Step 1: Read current ContentGenerationProgress structure**

Read `components/ContentGenerationProgress.tsx` to understand the layout.

**Step 2: Add template badge to header section**

Find the header/top section (around line 260-283) and add:

```tsx
// Add after job status display
{job?.brief?.selectedTemplate && (
  <div className="flex items-center gap-2 mt-2">
    <span className="text-xs text-gray-500">Template:</span>
    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full font-medium">
      {job.brief.selectedTemplate}
    </span>
    {job.brief.templateConfidence && (
      <span className="text-xs text-gray-500">
        ({job.brief.templateConfidence}% match)
      </span>
    )}
  </div>
)}
```

**Step 3: Add template compliance to completion display**

Find the completion/audit score section (around line 425-431) and add:

```tsx
// Add template compliance score alongside audit score
{job?.audit_results?.templateCompliance && (
  <div className="mt-2 text-sm">
    <span className="text-gray-400">Template Compliance: </span>
    <span className={`font-medium ${
      job.audit_results.templateCompliance >= 80 ? 'text-green-400' :
      job.audit_results.templateCompliance >= 60 ? 'text-yellow-400' :
      'text-orange-400'
    }`}>
      {job.audit_results.templateCompliance}%
    </span>
  </div>
)}
```

**Step 4: Add template-specific activity messages**

In the PASS_ACTIVITY_MESSAGES constant (around line 37), add template-aware variants:

```typescript
// Extend activity messages for template context
const getTemplateAwareMessage = (pass: number, templateName?: TemplateName): string => {
  const baseMessages = PASS_ACTIVITY_MESSAGES[pass] || ['Processing...'];
  const randomBase = baseMessages[Math.floor(Math.random() * baseMessages.length)];

  if (!templateName) return randomBase;

  // Template-specific additions
  const templateHints: Partial<Record<TemplateName, Record<number, string>>> = {
    'DEFINITIONAL': {
      1: 'Structuring for Featured Snippet optimization...',
      3: 'Adding semantic lists for definition clarity...',
    },
    'ECOMMERCE_PRODUCT': {
      1: 'Building product overview sections...',
      3: 'Creating specification tables...',
    },
    'COMPARISON': {
      1: 'Setting up comparison framework...',
      3: 'Building comparison tables and criteria...',
    },
    // ... add more
  };

  return templateHints[templateName]?.[pass] || randomBase;
};
```

**Step 5: Commit**

```bash
git add components/ContentGenerationProgress.tsx
git commit -m "feat(progress): add template badge and compliance display"
```

---

## Task 21: Add Template Tab to BriefEditModal

**Files:**
- Modify: `components/brief/BriefEditModal.tsx` - Add Templates tab

**Step 1: Read current BriefEditModal structure**

Read `components/brief/BriefEditModal.tsx` to understand the tab system.

**Step 2: Add 'templates' to TabType**

```typescript
type TabType = 'sections' | 'templates' | 'meta' | 'strategy' | 'regenerate';
```

**Step 3: Add Templates tab button**

Find the tab buttons section and add:

```tsx
<button
  onClick={() => setActiveTab('templates')}
  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
    activeTab === 'templates'
      ? 'bg-gray-800 text-white border-b-2 border-cyan-500'
      : 'text-gray-400 hover:text-white'
  }`}
>
  Templates
</button>
```

**Step 4: Add Templates tab content**

Add the templates panel in the tab content switch:

```tsx
{activeTab === 'templates' && (
  <TemplateSelectionPanel
    brief={editedBrief}
    businessInfo={businessInfo}
    onTemplateSelect={(templateName) => {
      setEditedBrief(prev => ({
        ...prev,
        selectedTemplate: templateName,
      }));
    }}
  />
)}
```

**Step 5: Create TemplateSelectionPanel component**

```typescript
// components/brief/TemplateSelectionPanel.tsx
import React, { useMemo } from 'react';
import { ContentBrief, BusinessInfo } from '../../types';
import { selectTemplate } from '../../services/ai/contentGeneration/templateRouter';
import { CONTENT_TEMPLATES, getTemplateByName } from '../../config/contentTemplates';
import { TemplateName } from '../../types/contentTemplates';

interface TemplateSelectionPanelProps {
  brief: ContentBrief;
  businessInfo: BusinessInfo;
  onTemplateSelect: (templateName: TemplateName) => void;
}

const TemplateSelectionPanel: React.FC<TemplateSelectionPanelProps> = ({
  brief,
  businessInfo,
  onTemplateSelect,
}) => {
  const recommendation = useMemo(() => {
    return selectTemplate({
      websiteType: businessInfo.websiteType || 'INFORMATIONAL',
      queryIntent: brief.search_intent || 'informational',
      queryType: brief.query_type || 'definitional',
      topicType: (brief.topic_type || 'core') as 'core' | 'outer' | 'child',
      topicClass: brief.topic_class || 'informational',
    });
  }, [brief, businessInfo]);

  const currentTemplate = brief.selectedTemplate
    ? getTemplateByName(brief.selectedTemplate)
    : null;

  return (
    <div className="space-y-6">
      {/* Current Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Current Template</h3>
        {currentTemplate ? (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-semibold">{currentTemplate.templateName}</span>
                <span className="ml-2 text-gray-400 text-sm">{currentTemplate.label}</span>
              </div>
              {brief.templateConfidence && (
                <span className="text-sm text-cyan-400">{brief.templateConfidence}% match</span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-2">{currentTemplate.description}</p>
          </div>
        ) : (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-gray-500">No template selected</p>
          </div>
        )}
      </div>

      {/* AI Recommendation */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">AI Recommendation</h3>
        <button
          onClick={() => onTemplateSelect(recommendation.template.templateName)}
          className={`w-full text-left p-4 rounded-lg border transition-colors ${
            brief.selectedTemplate === recommendation.template.templateName
              ? 'border-cyan-500 bg-cyan-500/10'
              : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">{recommendation.template.templateName}</span>
            <span className="text-sm text-cyan-400">{recommendation.confidence}% confidence</span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{recommendation.template.description}</p>
          <ul className="mt-2 space-y-1">
            {recommendation.reasoning.slice(0, 2).map((reason, i) => (
              <li key={i} className="text-xs text-gray-500">• {reason}</li>
            ))}
          </ul>
        </button>
      </div>

      {/* All Templates */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">All Templates</h3>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {Object.values(CONTENT_TEMPLATES).map((template) => (
            <button
              key={template.templateName}
              onClick={() => onTemplateSelect(template.templateName)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                brief.selectedTemplate === template.templateName
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
              }`}
            >
              <span className="text-white text-sm font-medium">{template.templateName}</span>
              <p className="text-gray-500 text-xs mt-1 line-clamp-2">{template.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplateSelectionPanel;
```

**Step 6: Commit**

```bash
git add components/brief/BriefEditModal.tsx components/brief/TemplateSelectionPanel.tsx
git commit -m "feat(brief): add Templates tab to BriefEditModal"
```

---

## Task 22: Create Template Analytics Database Schema

**Files:**
- Create: `supabase/migrations/20260118000000_template_analytics.sql`
- Create: `services/templateAnalyticsService.ts`
- Create: `services/__tests__/templateAnalyticsService.test.ts`

**Step 1: Create the migration**

```sql
-- supabase/migrations/20260118000000_template_analytics.sql

-- Add template fields to content_generation_jobs
ALTER TABLE content_generation_jobs
ADD COLUMN IF NOT EXISTS selected_template VARCHAR(50),
ADD COLUMN IF NOT EXISTS template_confidence INTEGER,
ADD COLUMN IF NOT EXISTS depth_mode VARCHAR(20),
ADD COLUMN IF NOT EXISTS template_compliance_score INTEGER;

-- Create template analytics table
CREATE TABLE IF NOT EXISTS content_template_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
    brief_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Template selection data
    selected_template VARCHAR(50) NOT NULL,
    template_confidence INTEGER,
    ai_recommended_template VARCHAR(50),
    user_overrode_recommendation BOOLEAN DEFAULT FALSE,

    -- Generation metrics
    generation_time_ms INTEGER,
    total_passes_completed INTEGER,
    final_audit_score INTEGER,
    template_compliance_score INTEGER,

    -- Content metrics
    final_word_count INTEGER,
    final_section_count INTEGER,
    target_word_count_min INTEGER,
    target_word_count_max INTEGER,

    -- Depth settings
    depth_mode VARCHAR(20),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Performance tracking (can be updated later)
    post_publish_views INTEGER,
    post_publish_engagement DECIMAL(5,2)
);

-- Index for analytics queries
CREATE INDEX idx_template_analytics_template ON content_template_analytics(selected_template);
CREATE INDEX idx_template_analytics_user ON content_template_analytics(user_id);
CREATE INDEX idx_template_analytics_created ON content_template_analytics(created_at);

-- Enable RLS
ALTER TABLE content_template_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see their own analytics
CREATE POLICY "Users can view own template analytics"
ON content_template_analytics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own template analytics"
ON content_template_analytics FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Step 2: Write the analytics service test**

```typescript
// services/__tests__/templateAnalyticsService.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  trackTemplateSelection,
  trackGenerationComplete,
  getTemplatePerformanceStats
} from '../templateAnalyticsService';

// Mock Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    })),
  },
}));

describe('templateAnalyticsService', () => {
  describe('trackTemplateSelection', () => {
    it('should record template selection with metadata', async () => {
      const result = await trackTemplateSelection({
        jobId: 'job-123',
        briefId: 'brief-456',
        selectedTemplate: 'DEFINITIONAL',
        templateConfidence: 85,
        aiRecommendedTemplate: 'DEFINITIONAL',
        userOverrodeRecommendation: false,
        depthMode: 'moderate',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('trackGenerationComplete', () => {
    it('should update analytics with generation results', async () => {
      const result = await trackGenerationComplete({
        jobId: 'job-123',
        generationTimeMs: 45000,
        totalPassesCompleted: 10,
        finalAuditScore: 87,
        templateComplianceScore: 92,
        finalWordCount: 2500,
        finalSectionCount: 8,
      });

      expect(result.success).toBe(true);
    });
  });
});
```

**Step 3: Write the analytics service**

```typescript
// services/templateAnalyticsService.ts
import { supabase } from '../lib/supabaseClient';
import { TemplateName, DepthMode } from '../types/contentTemplates';

interface TemplateSelectionData {
  jobId: string;
  briefId?: string;
  selectedTemplate: TemplateName;
  templateConfidence?: number;
  aiRecommendedTemplate?: TemplateName;
  userOverrodeRecommendation?: boolean;
  depthMode?: DepthMode;
  targetWordCount?: { min: number; max: number };
}

interface GenerationCompleteData {
  jobId: string;
  generationTimeMs: number;
  totalPassesCompleted: number;
  finalAuditScore: number;
  templateComplianceScore?: number;
  finalWordCount: number;
  finalSectionCount: number;
}

/**
 * Track template selection at start of generation
 */
export async function trackTemplateSelection(data: TemplateSelectionData) {
  try {
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('content_template_analytics')
      .insert({
        job_id: data.jobId,
        brief_id: data.briefId,
        user_id: user?.user?.id,
        selected_template: data.selectedTemplate,
        template_confidence: data.templateConfidence,
        ai_recommended_template: data.aiRecommendedTemplate,
        user_overrode_recommendation: data.userOverrodeRecommendation,
        depth_mode: data.depthMode,
        target_word_count_min: data.targetWordCount?.min,
        target_word_count_max: data.targetWordCount?.max,
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('[TemplateAnalytics] Failed to track selection:', error);
    return { success: false, error };
  }
}

/**
 * Update analytics when generation completes
 */
export async function trackGenerationComplete(data: GenerationCompleteData) {
  try {
    const { error } = await supabase
      .from('content_template_analytics')
      .update({
        generation_time_ms: data.generationTimeMs,
        total_passes_completed: data.totalPassesCompleted,
        final_audit_score: data.finalAuditScore,
        template_compliance_score: data.templateComplianceScore,
        final_word_count: data.finalWordCount,
        final_section_count: data.finalSectionCount,
        completed_at: new Date().toISOString(),
      })
      .eq('job_id', data.jobId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('[TemplateAnalytics] Failed to track completion:', error);
    return { success: false, error };
  }
}

/**
 * Get performance statistics for templates
 */
export async function getTemplatePerformanceStats(
  templateName?: TemplateName,
  dateRange?: { start: Date; end: Date }
) {
  try {
    let query = supabase
      .from('content_template_analytics')
      .select('*')
      .not('completed_at', 'is', null);

    if (templateName) {
      query = query.eq('selected_template', templateName);
    }

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Aggregate stats
    const stats = (data || []).reduce((acc, row) => {
      const template = row.selected_template;
      if (!acc[template]) {
        acc[template] = {
          count: 0,
          avgAuditScore: 0,
          avgComplianceScore: 0,
          avgGenerationTime: 0,
          avgWordCount: 0,
          overrideRate: 0,
        };
      }
      acc[template].count++;
      acc[template].avgAuditScore += row.final_audit_score || 0;
      acc[template].avgComplianceScore += row.template_compliance_score || 0;
      acc[template].avgGenerationTime += row.generation_time_ms || 0;
      acc[template].avgWordCount += row.final_word_count || 0;
      acc[template].overrideRate += row.user_overrode_recommendation ? 1 : 0;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    for (const template of Object.keys(stats)) {
      const s = stats[template];
      s.avgAuditScore = Math.round(s.avgAuditScore / s.count);
      s.avgComplianceScore = Math.round(s.avgComplianceScore / s.count);
      s.avgGenerationTime = Math.round(s.avgGenerationTime / s.count);
      s.avgWordCount = Math.round(s.avgWordCount / s.count);
      s.overrideRate = Math.round((s.overrideRate / s.count) * 100);
    }

    return { success: true, stats };
  } catch (error) {
    console.error('[TemplateAnalytics] Failed to get stats:', error);
    return { success: false, error, stats: {} };
  }
}
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260118000000_template_analytics.sql services/templateAnalyticsService.ts services/__tests__/templateAnalyticsService.test.ts
git commit -m "feat(analytics): add template analytics database and service"
```

---

## Task 23: Create A/B Testing Infrastructure

**Files:**
- Create: `services/templateABTestService.ts`
- Create: `services/__tests__/templateABTestService.test.ts`
- Create: `supabase/migrations/20260118000001_template_ab_tests.sql`

**Step 1: Create A/B test migration**

```sql
-- supabase/migrations/20260118000001_template_ab_tests.sql

CREATE TABLE IF NOT EXISTS template_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Test variants
    control_template VARCHAR(50) NOT NULL,
    variant_template VARCHAR(50) NOT NULL,

    -- Configuration
    traffic_split DECIMAL(3,2) DEFAULT 0.50, -- 0.50 = 50/50 split
    is_active BOOLEAN DEFAULT TRUE,

    -- Targeting
    website_types VARCHAR(50)[], -- null = all types
    min_authority_score INTEGER,

    -- Duration
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,

    -- Results (updated periodically)
    control_count INTEGER DEFAULT 0,
    variant_count INTEGER DEFAULT 0,
    control_avg_audit_score DECIMAL(5,2),
    variant_avg_audit_score DECIMAL(5,2),
    statistical_significance DECIMAL(5,4),

    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track individual test assignments
CREATE TABLE IF NOT EXISTS template_ab_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES template_ab_tests(id) ON DELETE CASCADE,
    job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),

    assigned_variant VARCHAR(20) NOT NULL, -- 'control' or 'variant'
    assigned_template VARCHAR(50) NOT NULL,

    -- Outcome metrics (updated after generation)
    audit_score INTEGER,
    template_compliance_score INTEGER,
    generation_time_ms INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_ab_assignments_test ON template_ab_assignments(test_id);
CREATE INDEX idx_ab_assignments_job ON template_ab_assignments(job_id);

-- Enable RLS
ALTER TABLE template_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_ab_assignments ENABLE ROW LEVEL SECURITY;

-- Only admins can manage tests
CREATE POLICY "Admins can manage AB tests"
ON template_ab_tests FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');

-- Users see their own assignments
CREATE POLICY "Users can view own AB assignments"
ON template_ab_assignments FOR SELECT
USING (auth.uid() = user_id);
```

**Step 2: Write the A/B test service**

```typescript
// services/templateABTestService.ts
import { supabase } from '../lib/supabaseClient';
import { TemplateName } from '../types/contentTemplates';
import { WebsiteType } from '../types';

interface ABTest {
  id: string;
  name: string;
  controlTemplate: TemplateName;
  variantTemplate: TemplateName;
  trafficSplit: number;
  isActive: boolean;
  websiteTypes?: WebsiteType[];
  minAuthorityScore?: number;
}

interface ABAssignment {
  testId: string;
  variant: 'control' | 'variant';
  template: TemplateName;
}

/**
 * Get active A/B test for given context
 */
export async function getActiveABTest(
  websiteType: WebsiteType,
  authorityScore?: number
): Promise<ABTest | null> {
  try {
    const { data, error } = await supabase
      .from('template_ab_tests')
      .select('*')
      .eq('is_active', true)
      .or(`website_types.is.null,website_types.cs.{${websiteType}}`)
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .limit(1)
      .single();

    if (error || !data) return null;

    // Check authority score requirement
    if (data.min_authority_score && authorityScore && authorityScore < data.min_authority_score) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      controlTemplate: data.control_template as TemplateName,
      variantTemplate: data.variant_template as TemplateName,
      trafficSplit: data.traffic_split,
      isActive: data.is_active,
      websiteTypes: data.website_types,
      minAuthorityScore: data.min_authority_score,
    };
  } catch (error) {
    console.error('[ABTest] Failed to get active test:', error);
    return null;
  }
}

/**
 * Assign user to A/B test variant
 */
export async function assignToABTest(
  test: ABTest,
  jobId: string
): Promise<ABAssignment> {
  // Deterministic assignment based on job ID hash
  const hash = hashCode(jobId);
  const normalizedHash = Math.abs(hash) / 2147483647; // Normalize to 0-1
  const isVariant = normalizedHash > test.trafficSplit;

  const assignment: ABAssignment = {
    testId: test.id,
    variant: isVariant ? 'variant' : 'control',
    template: isVariant ? test.variantTemplate : test.controlTemplate,
  };

  // Record assignment
  try {
    const { data: user } = await supabase.auth.getUser();

    await supabase
      .from('template_ab_assignments')
      .insert({
        test_id: test.id,
        job_id: jobId,
        user_id: user?.user?.id,
        assigned_variant: assignment.variant,
        assigned_template: assignment.template,
      });
  } catch (error) {
    console.error('[ABTest] Failed to record assignment:', error);
  }

  return assignment;
}

/**
 * Update A/B assignment with outcome
 */
export async function recordABOutcome(
  jobId: string,
  auditScore: number,
  templateComplianceScore: number,
  generationTimeMs: number
): Promise<void> {
  try {
    await supabase
      .from('template_ab_assignments')
      .update({
        audit_score: auditScore,
        template_compliance_score: templateComplianceScore,
        generation_time_ms: generationTimeMs,
        completed_at: new Date().toISOString(),
      })
      .eq('job_id', jobId);
  } catch (error) {
    console.error('[ABTest] Failed to record outcome:', error);
  }
}

/**
 * Get A/B test results
 */
export async function getABTestResults(testId: string) {
  try {
    const { data, error } = await supabase
      .from('template_ab_assignments')
      .select('*')
      .eq('test_id', testId)
      .not('completed_at', 'is', null);

    if (error) throw error;

    const control = (data || []).filter(d => d.assigned_variant === 'control');
    const variant = (data || []).filter(d => d.assigned_variant === 'variant');

    const avgScore = (arr: any[]) =>
      arr.length > 0
        ? arr.reduce((sum, d) => sum + (d.audit_score || 0), 0) / arr.length
        : 0;

    return {
      control: {
        count: control.length,
        avgAuditScore: Math.round(avgScore(control)),
      },
      variant: {
        count: variant.length,
        avgAuditScore: Math.round(avgScore(variant)),
      },
      // Basic significance calculation (would need proper stats lib)
      sampleSize: control.length + variant.length,
    };
  } catch (error) {
    console.error('[ABTest] Failed to get results:', error);
    return null;
  }
}

// Simple hash function
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}
```

**Step 3: Write A/B test service tests**

```typescript
// services/__tests__/templateABTestService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { assignToABTest, getABTestResults } from '../templateABTestService';

describe('templateABTestService', () => {
  describe('assignToABTest', () => {
    it('should assign deterministically based on job ID', () => {
      const test = {
        id: 'test-1',
        name: 'Test',
        controlTemplate: 'DEFINITIONAL' as const,
        variantTemplate: 'COMPARISON' as const,
        trafficSplit: 0.5,
        isActive: true,
      };

      // Same job ID should always get same assignment
      const assignment1 = assignToABTest(test, 'job-123');
      const assignment2 = assignToABTest(test, 'job-123');

      expect(assignment1.variant).toBe(assignment2.variant);
      expect(assignment1.template).toBe(assignment2.template);
    });

    it('should split traffic approximately by trafficSplit', async () => {
      const test = {
        id: 'test-1',
        name: 'Test',
        controlTemplate: 'DEFINITIONAL' as const,
        variantTemplate: 'COMPARISON' as const,
        trafficSplit: 0.5,
        isActive: true,
      };

      let controlCount = 0;
      let variantCount = 0;

      for (let i = 0; i < 100; i++) {
        const assignment = await assignToABTest(test, `job-${i}-${Math.random()}`);
        if (assignment.variant === 'control') controlCount++;
        else variantCount++;
      }

      // Should be roughly 50/50 (allow some variance)
      expect(controlCount).toBeGreaterThan(30);
      expect(variantCount).toBeGreaterThan(30);
    });
  });
});
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260118000001_template_ab_tests.sql services/templateABTestService.ts services/__tests__/templateABTestService.test.ts
git commit -m "feat(ab-testing): add A/B testing infrastructure for templates"
```

---

## Summary

This Phase 3 plan covers **6 tasks** (Tasks 18-23):

1. **Task 18**: Add template selection to content generation flow
2. **Task 19**: Create TemplateConfirmationFlow multi-step wizard
3. **Task 20**: Add template badge to ContentGenerationProgress
4. **Task 21**: Add Templates tab to BriefEditModal
5. **Task 22**: Create template analytics database and service
6. **Task 23**: Create A/B testing infrastructure

Each task follows TDD with:
- Write failing test first
- Run to verify failure
- Write implementation
- Run to verify pass
- Commit

---

## Database Migrations Required

1. `20260118000000_template_analytics.sql` - Template analytics table
2. `20260118000001_template_ab_tests.sql` - A/B testing tables

Run migrations with: `supabase db push`

---

## Next Steps (Future Tasks)

After Phase 3, consider:
- **Task 24**: Template performance dashboard
- **Task 25**: Auto-template selection based on historical performance
- **Task 26**: Template recommendations based on competitor analysis
- **Task 27**: Template versioning and rollback
