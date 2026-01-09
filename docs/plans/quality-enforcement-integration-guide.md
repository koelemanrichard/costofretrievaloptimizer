# Quality Enforcement System - Integration Guide

## Document Info

- **Created**: 2026-01-09
- **Status**: Complete
- **Related Plan**: `docs/plans/quality-enforcement-implementation-plan.md`

---

## Overview

This document describes how the Quality Enforcement UI components are integrated into the application. The system provides full visibility into the 113+ quality rules during and after content generation.

---

## Component Locations

### Core Quality Components

| Component | File Location | Purpose |
|-----------|--------------|---------|
| `QualityRulePanel` | `components/quality/QualityRulePanel.tsx` | Displays all 113+ rules with status |
| `LiveGenerationMonitor` | `components/quality/LiveGenerationMonitor.tsx` | Real-time progress during generation |
| `ArticleQualityReport` | `components/quality/ArticleQualityReport.tsx` | Post-generation quality report |
| `PortfolioAnalytics` | `components/quality/PortfolioAnalytics.tsx` | Historical analytics dashboard |
| `ContentGenerationModeSelector` | `components/settings/ContentGenerationModeSelector.tsx` | Mode selection in settings |

### Integration Components

| Component | File Location | Purpose |
|-----------|--------------|---------|
| `ContentGenerationWithQuality` | `components/ContentGenerationWithQuality.tsx` | Wrapper combining progress + quality UI |
| `QualityDemoPage` | `components/pages/QualityDemoPage.tsx` | Demo page for testing all components |

---

## Where Users See These Components

### 1. Quality Demo Page (Testing/Development)

**Access:** Click "Quality Demo" in the right-edge toolbar (checkmark icon)

**Shows:**
- Interactive demo of all quality components
- Mock data for testing
- Controls to adjust parameters (current pass, score, etc.)
- Integration code examples

### 2. Content Generation Progress

**Access:** When generating article content from a brief

**Components Shown:**
- `ContentGenerationProgress` - Original progress tracker
- `LiveGenerationMonitor` - Pass-by-pass timeline with deltas
- `QualityRulePanel` - Sidebar showing all rules (collapsible)

**View Tabs:**
- **Progress** - Generation progress with live monitor
- **Quality Rules** - Full rule panel with search/filters
- **Quality Report** - Shown when generation completes

### 3. Settings Panel

**Access:** Content generation settings (within brief modal)

**Component:** `ContentGenerationModeSelector`

**Shows:**
- Autonomous vs Supervised mode selection
- Advanced settings (regression alerts, pause on critical, max retries)
- Current configuration summary

### 4. Dashboard Analytics (Future)

**Planned Integration:** Add `PortfolioAnalytics` to the project dashboard as a new tab.

---

## Usage Examples

### Using ContentGenerationWithQuality

```tsx
import { ContentGenerationWithQuality } from './components/ContentGenerationWithQuality';

// In your content generation view:
<ContentGenerationWithQuality
  job={contentJob}
  sections={sections}
  progress={calculateProgress(contentJob)}
  currentPassName={PASS_NAMES[contentJob.current_pass]}
  onPause={handlePause}
  onResume={handleResume}
  onCancel={handleCancel}
  onRetry={handleRetry}
  violations={currentViolations}
  passDeltas={passDeltas}
  onApprove={handleApprove}
  onRequestFix={handleRequestFix}
  onEdit={handleEdit}
  onRegenerate={handleRegenerate}
/>
```

### Using Quality Components Individually

```tsx
import {
  QualityRulePanel,
  LiveGenerationMonitor,
  ArticleQualityReport,
  PortfolioAnalytics,
} from './components/quality';

// Quality Rule Panel
<QualityRulePanel
  violations={violations}
  onRuleClick={(ruleId) => showRuleDetails(ruleId)}
/>

// Live Generation Monitor
<LiveGenerationMonitor
  jobId={job.id}
  currentPass={job.current_pass}
  totalPasses={10}
  passDeltas={passDeltas}
  isGenerating={job.status === 'in_progress'}
  onPauseGeneration={onPause}
  onResumeGeneration={onResume}
/>

// Article Quality Report
<ArticleQualityReport
  jobId={job.id}
  violations={violations}
  passDeltas={passDeltas}
  overallScore={job.final_audit_score || 0}
  systemicChecks={systemicChecks}
  onApprove={handleApprove}
  onRequestFix={handleRequestFix}
  onEdit={handleEdit}
  onRegenerate={handleRegenerate}
/>

// Portfolio Analytics
<PortfolioAnalytics
  userId={user.id}
  dateRange={{ start: thirtyDaysAgo, end: today }}
  onDateRangeChange={setDateRange}
  onExport={handleExport}
/>
```

### Using Mode Selector in Settings

```tsx
import {
  ContentGenerationModeSelector,
  DEFAULT_GENERATION_SETTINGS,
} from './components/settings';

const [modeSettings, setModeSettings] = useState(DEFAULT_GENERATION_SETTINGS);

<ContentGenerationModeSelector
  settings={modeSettings}
  onChange={setModeSettings}
/>
```

---

## Data Flow

### Violations

Violations come from:
1. **During generation:** Real-time validation in passes
2. **After generation:** `job.audit_details.algorithmicResults`

Convert audit results to violations:
```tsx
const violations = job.audit_details?.algorithmicResults
  ?.filter(r => !r.passed)
  ?.map(r => ({
    rule: r.ruleId,
    text: r.message,
    position: 0,
    suggestion: r.details || '',
    severity: r.severity || 'warning',
  })) || [];
```

### Pass Deltas

Pass deltas track rule changes between passes:
```tsx
interface PassDelta {
  passNumber: number;
  rulesFixed: string[];
  rulesRegressed: string[];
  rulesUnchanged: string[];
  netChange: number;
  recommendation: 'accept' | 'revert' | 'review';
}
```

Generated by `RuleSnapshotService` during content generation.

---

## Navigation

### AppStep Enum

New value added: `AppStep.QUALITY_DEMO`

**Files Updated:**
- `types.ts`
- `types/core.ts`
- `App.tsx`

### Accessing Quality Demo

1. **Edge Toolbar:** Click checkmark icon "Quality Demo"
2. **Direct:** Set `dispatch({ type: 'SET_STEP', payload: AppStep.QUALITY_DEMO })`

---

## Testing

### Automated Tests

- 336 tests for validators and tracking modules
- Run: `npx vitest run services/ai/contentGeneration/rulesEngine services/ai/contentGeneration/tracking`

### Manual Testing

1. Start dev server: `npm run dev`
2. Log in to the application
3. Click "Quality Demo" in the right toolbar
4. Test each component tab:
   - Quality Rule Panel: Verify rule display, filtering, search
   - Live Generation Monitor: Adjust current pass slider
   - Article Quality Report: Adjust score slider, click actions
   - Portfolio Analytics: Test date range presets, export buttons
   - Mode Selector: Toggle modes, adjust settings

---

## Files Created/Modified

### New Files

```
components/quality/ArticleQualityReport.tsx
components/quality/PortfolioAnalytics.tsx
components/settings/ContentGenerationModeSelector.tsx
components/settings/index.ts
components/ContentGenerationWithQuality.tsx
components/pages/QualityDemoPage.tsx
docs/plans/quality-enforcement-integration-guide.md (this file)
```

### Modified Files

```
components/quality/index.ts - Added exports
components/ContentGenerationSettingsPanel.tsx - Added mode selector integration
types.ts - Added AppStep.QUALITY_DEMO
types/core.ts - Added AppStep.QUALITY_DEMO
App.tsx - Added QualityDemoPage route and toolbar item
```

---

## Future Enhancements

1. **Dashboard Integration:** Add PortfolioAnalytics as a dashboard tab
2. **Brief Modal Integration:** Show QualityRulePanel in content brief modal
3. **Real-time Subscriptions:** Connect to Supabase Realtime for live rule updates
4. **Export Reports:** PDF/CSV export of quality reports
5. **Training Links:** Connect improvement areas to help documentation

---

*Document Version: 1.0*
