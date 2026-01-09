/**
 * QualityDemoPage Component
 *
 * Demo page showcasing all quality enforcement components.
 * Allows testing and previewing components with mock data.
 *
 * Access via: /quality-demo
 *
 * @module components/pages
 */

import React, { useState } from 'react';
import {
  QualityRulePanel,
  LiveGenerationMonitor,
  ArticleQualityReport,
  PortfolioAnalytics,
} from '../quality';
import {
  ContentGenerationModeSelector,
  DEFAULT_GENERATION_SETTINGS,
  ContentGenerationSettings as ModeSettings,
} from '../settings';
import type { PassDelta } from '../../services/ai/contentGeneration/tracking';
import type { ValidationViolation } from '../../types';

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_VIOLATIONS: ValidationViolation[] = [
  { rule: 'G1', text: 'Article word count (1,234) is below target (1,500)', position: 0, severity: 'warning', suggestion: 'Add more content to reach target word count' },
  { rule: 'C2', text: 'UNIQUE EAVs not found in first 300 words', position: 0, severity: 'error', suggestion: 'Move unique semantic triples to introduction' },
  { rule: 'D5', text: 'Discourse chaining broken between sections 3 and 4', position: 450, severity: 'warning', suggestion: 'Add transitional bridge sentence' },
  { rule: 'K4', text: 'List in section 2 has 9 items (exceeds max 7)', position: 320, severity: 'info', suggestion: 'Split into two lists or reduce items' },
];

const MOCK_PASS_DELTAS: PassDelta[] = [
  { passNumber: 1, rulesFixed: ['E1', 'E2', 'E3'], rulesRegressed: [], rulesUnchanged: [], netChange: 3, recommendation: 'accept' },
  { passNumber: 2, rulesFixed: ['F1', 'F2'], rulesRegressed: ['E3'], rulesUnchanged: [], netChange: 1, recommendation: 'accept' },
  { passNumber: 3, rulesFixed: ['B1', 'B2', 'B3'], rulesRegressed: [], rulesUnchanged: [], netChange: 3, recommendation: 'accept' },
  { passNumber: 4, rulesFixed: ['K1', 'K2', 'L1'], rulesRegressed: ['F1'], rulesUnchanged: [], netChange: 2, recommendation: 'review' },
  { passNumber: 5, rulesFixed: ['D1', 'D2', 'D3', 'D4'], rulesRegressed: [], rulesUnchanged: [], netChange: 4, recommendation: 'accept' },
];

const MOCK_SYSTEMIC_CHECKS = [
  { checkId: 'S1', name: 'Output Language', status: 'pass' as const, value: 'English', expected: 'English' },
  { checkId: 'S2', name: 'Regional Spelling', status: 'pass' as const, value: 'US English', expected: 'US English' },
  { checkId: 'S3', name: 'Pillar Alignment', status: 'warning' as const, value: '68%', expected: '70%+', details: 'Slightly below threshold' },
  { checkId: 'S4', name: 'Readability Level', status: 'pass' as const, value: 'Grade 8', expected: 'Grade 6-10' },
];

// =============================================================================
// Component
// =============================================================================

type DemoSection = 'rules' | 'monitor' | 'report' | 'analytics' | 'settings';

export const QualityDemoPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DemoSection>('rules');
  const [modeSettings, setModeSettings] = useState<ModeSettings>(DEFAULT_GENERATION_SETTINGS);

  // Monitor state
  const [currentPass, setCurrentPass] = useState(6);
  const [isGenerating, setIsGenerating] = useState(true);

  // Report state
  const [overallScore, setOverallScore] = useState(78);

  const sections: { key: DemoSection; label: string }[] = [
    { key: 'rules', label: 'Quality Rule Panel' },
    { key: 'monitor', label: 'Live Generation Monitor' },
    { key: 'report', label: 'Article Quality Report' },
    { key: 'analytics', label: 'Portfolio Analytics' },
    { key: 'settings', label: 'Mode Selector' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Quality Enforcement Demo</h1>
          <p className="text-gray-400">
            Preview and test all quality enforcement components with mock data.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-700 pb-4">
          {sections.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Demo Content */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          {/* Quality Rule Panel Demo */}
          {activeSection === 'rules' && (
            <div>
              <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <h3 className="text-sm font-medium text-blue-300 mb-2">About Quality Rule Panel</h3>
                <p className="text-xs text-gray-400">
                  Displays all 113+ quality rules organized by category. Shows which rules are passing,
                  failing, or not yet checked. Click on rules to see details.
                </p>
              </div>
              <QualityRulePanel
                violations={MOCK_VIOLATIONS}
                onRuleClick={(ruleId) => alert(`Clicked rule: ${ruleId}`)}
              />
            </div>
          )}

          {/* Live Generation Monitor Demo */}
          {activeSection === 'monitor' && (
            <div>
              <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <h3 className="text-sm font-medium text-blue-300 mb-2">About Live Generation Monitor</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Shows real-time progress during content generation. Displays pass-by-pass timeline
                  with deltas showing rules fixed and regressed.
                </p>
                <div className="flex items-center gap-4">
                  <label className="text-xs text-gray-400">
                    Current Pass:
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(parseInt(e.target.value))}
                      className="ml-2 w-32"
                    />
                    <span className="ml-2">{currentPass}</span>
                  </label>
                  <button
                    onClick={() => setIsGenerating(!isGenerating)}
                    className={`px-3 py-1 rounded text-xs ${
                      isGenerating ? 'bg-yellow-600' : 'bg-green-600'
                    }`}
                  >
                    {isGenerating ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
              <LiveGenerationMonitor
                jobId="demo-job-12345678"
                currentPass={currentPass}
                totalPasses={10}
                passDeltas={MOCK_PASS_DELTAS.slice(0, Math.min(currentPass - 1, 5))}
                isGenerating={isGenerating}
                onPauseGeneration={() => setIsGenerating(false)}
                onResumeGeneration={() => setIsGenerating(true)}
              />
            </div>
          )}

          {/* Article Quality Report Demo */}
          {activeSection === 'report' && (
            <div>
              <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <h3 className="text-sm font-medium text-blue-300 mb-2">About Article Quality Report</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Shown after content generation completes. Displays overall score, category breakdown,
                  systemic checks, and actionable issues.
                </p>
                <div className="flex items-center gap-4">
                  <label className="text-xs text-gray-400">
                    Overall Score:
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={overallScore}
                      onChange={(e) => setOverallScore(parseInt(e.target.value))}
                      className="ml-2 w-32"
                    />
                    <span className="ml-2">{overallScore}%</span>
                  </label>
                </div>
              </div>
              <ArticleQualityReport
                jobId="demo-job-12345678"
                violations={MOCK_VIOLATIONS}
                passDeltas={MOCK_PASS_DELTAS}
                overallScore={overallScore}
                systemicChecks={MOCK_SYSTEMIC_CHECKS}
                onApprove={() => alert('Article approved!')}
                onRequestFix={(ruleIds) => alert(`Requesting fix for: ${ruleIds.join(', ')}`)}
                onEdit={() => alert('Opening editor...')}
                onRegenerate={() => alert('Regenerating article...')}
              />
            </div>
          )}

          {/* Portfolio Analytics Demo */}
          {activeSection === 'analytics' && (
            <div>
              <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <h3 className="text-sm font-medium text-blue-300 mb-2">About Portfolio Analytics</h3>
                <p className="text-xs text-gray-400">
                  Historical analytics dashboard showing compliance trends, rule performance,
                  and conflict patterns across all generated content.
                </p>
              </div>
              <PortfolioAnalytics
                userId="demo-user"
                dateRange={{
                  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  end: new Date(),
                }}
                onDateRangeChange={(range) => console.log('Date range changed:', range)}
                onExport={(format) => alert(`Exporting as ${format}...`)}
              />
            </div>
          )}

          {/* Content Generation Mode Selector Demo */}
          {activeSection === 'settings' && (
            <div>
              <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <h3 className="text-sm font-medium text-blue-300 mb-2">About Mode Selector</h3>
                <p className="text-xs text-gray-400">
                  Allows users to choose between Autonomous (AI decides) and Supervised (user approves)
                  modes, plus configure advanced quality enforcement settings.
                </p>
              </div>
              <ContentGenerationModeSelector
                settings={modeSettings}
                onChange={setModeSettings}
              />
              <div className="mt-6 p-4 bg-gray-900 rounded-lg">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Current Settings (JSON)</h4>
                <pre className="text-xs text-gray-500 overflow-x-auto">
                  {JSON.stringify(modeSettings, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Integration Guide */}
        <div className="mt-8 p-6 bg-gray-800/50 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Integration Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-blue-300 mb-2">Where Components Appear</h3>
              <ul className="space-y-2 text-gray-400">
                <li><code className="text-xs bg-gray-700 px-1 rounded">QualityRulePanel</code> - Sidebar during content generation</li>
                <li><code className="text-xs bg-gray-700 px-1 rounded">LiveGenerationMonitor</code> - Progress view during generation</li>
                <li><code className="text-xs bg-gray-700 px-1 rounded">ArticleQualityReport</code> - After generation completes</li>
                <li><code className="text-xs bg-gray-700 px-1 rounded">PortfolioAnalytics</code> - Dashboard analytics tab</li>
                <li><code className="text-xs bg-gray-700 px-1 rounded">ContentGenerationModeSelector</code> - Settings panel</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-300 mb-2">Usage</h3>
              <pre className="text-xs bg-gray-900 p-3 rounded overflow-x-auto">
{`// Use ContentGenerationWithQuality wrapper
import { ContentGenerationWithQuality }
  from './ContentGenerationWithQuality';

<ContentGenerationWithQuality
  job={job}
  sections={sections}
  progress={progress}
  currentPassName={passName}
  onPause={handlePause}
  onResume={handleResume}
  onCancel={handleCancel}
  onApprove={handleApprove}
  violations={violations}
/>`}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Quality Enforcement System - Phase 3 Components</p>
          <p className="text-xs mt-1">336 tests passing | Build verified</p>
        </div>
      </div>
    </div>
  );
};

export default QualityDemoPage;
