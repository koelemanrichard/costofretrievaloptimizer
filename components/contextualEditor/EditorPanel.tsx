// components/contextualEditor/EditorPanel.tsx
/**
 * Expanded side panel for full editing capabilities.
 */

import React from 'react';
import {
  TextSelection,
  ContextAnalysis,
  RewriteResult,
  ImagePromptResult,
  QuickAction,
  PanelTab,
} from '../../types/contextualEditor';
import { BusinessInfo } from '../../types';
import { QuickInstructionInput } from './QuickInstructionInput';

interface EditorPanelProps {
  selection: TextSelection;
  analysis: ContextAnalysis | null;
  rewriteResult: RewriteResult | null;
  imagePromptResult: ImagePromptResult | null;
  activeTab: PanelTab;
  isProcessing: boolean;
  businessInfo: BusinessInfo;
  customInstruction: string;
  onInstructionChange: (instruction: string) => void;
  onTabChange: (tab: PanelTab) => void;
  onQuickAction: (action: QuickAction, customInstruction?: string) => void;
  onAcceptRewrite: () => void;
  onRejectRewrite: () => void;
  onRetryRewrite: () => void;
  onClose: () => void;
}

const TAB_CONFIG: { id: PanelTab; label: string }[] = [
  { id: 'corrections', label: 'Corrections' },
  { id: 'rewrites', label: 'Rewrites' },
  { id: 'seo', label: 'SEO' },
  { id: 'custom', label: 'Custom' },
];

const TAB_ACTIONS: Record<PanelTab, { action: QuickAction; label: string }[]> = {
  corrections: [
    { action: 'fix_accuracy', label: 'Fix inaccuracies' },
    { action: 'remove_service', label: 'Remove unverified service' },
    { action: 'fix_grammar', label: 'Fix grammar/spelling' },
  ],
  rewrites: [
    { action: 'improve_flow', label: 'Improve readability' },
    { action: 'simplify', label: 'Simplify text' },
    { action: 'expand_detail', label: 'Add more detail' },
  ],
  seo: [
    { action: 'seo_optimize', label: 'Full SEO optimization' },
  ],
  custom: [],
};

export const EditorPanel: React.FC<EditorPanelProps> = ({
  selection,
  analysis,
  rewriteResult,
  imagePromptResult,
  activeTab,
  isProcessing,
  businessInfo,
  customInstruction,
  onInstructionChange,
  onTabChange,
  onQuickAction,
  onAcceptRewrite,
  onRejectRewrite,
  onRetryRewrite,
  onClose,
}) => {
  const handleCustomSubmit = () => {
    if (customInstruction.trim()) {
      onQuickAction('custom', customInstruction);
    }
  };

  return (
    <div
      data-contextual-editor="panel"
      className="fixed right-0 top-0 h-full w-96 bg-slate-800 border-l border-slate-600 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-600 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Edit Content</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Selection preview */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <div className="text-xs text-slate-400 mb-1">Selected text:</div>
        <div className="text-sm text-slate-200 max-h-20 overflow-y-auto">
          "{selection.text.slice(0, 200)}{selection.text.length > 200 ? '...' : ''}"
        </div>
      </div>

      {/* AI Analysis suggestions */}
      {analysis && analysis.issues.length > 0 && (
        <div className="p-4 border-b border-slate-700 bg-amber-500/5">
          <div className="text-xs font-medium text-amber-400 mb-2">AI detected issues:</div>
          <div className="space-y-1">
            {analysis.issues.slice(0, 3).map((issue, i) => (
              <div key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className={`flex-shrink-0 ${
                  issue.severity === 'error' ? 'text-red-400' :
                  issue.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                }`}>
                  {issue.severity === 'error' ? '!' : issue.severity === 'warning' ? '!' : '*'}
                </span>
                <span>{issue.description}</span>
              </div>
            ))}
          </div>
          {analysis.suggestions.length > 0 && (
            <button
              onClick={() => onQuickAction(analysis.suggestions[0].action as QuickAction, customInstruction || undefined)}
              disabled={isProcessing}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium disabled:opacity-50"
            >
              Apply suggestion: {analysis.suggestions[0].description}
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab !== 'custom' ? (
          <div className="space-y-4">
            {/* Action buttons */}
            <div className="space-y-2">
              {TAB_ACTIONS[activeTab].map(({ action, label }) => (
                <button
                  key={action}
                  onClick={() => onQuickAction(action, customInstruction || undefined)}
                  disabled={isProcessing}
                  className="w-full px-4 py-2 text-left text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Quick instruction input */}
            <QuickInstructionInput
              businessInfo={businessInfo}
              instruction={customInstruction}
              onInstructionChange={onInstructionChange}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={customInstruction}
              onChange={(e) => onInstructionChange(e.target.value)}
              placeholder="Describe how you want the text changed..."
              className="w-full h-32 bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded p-2 resize-none focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customInstruction.trim() || isProcessing}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
            >
              Apply Custom Edit
            </button>
          </div>
        )}

        {/* Rewrite result */}
        {rewriteResult && (
          <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-600">
            <div className="text-xs text-slate-400 mb-2">AI Suggestion:</div>
            <div className="text-sm text-slate-200 mb-3 whitespace-pre-wrap">
              {rewriteResult.rewrittenText}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                Score: {rewriteResult.complianceScore}%
              </span>
              {rewriteResult.wordCountDelta !== 0 && (
                <span>
                  {rewriteResult.wordCountDelta > 0 ? '+' : ''}{rewriteResult.wordCountDelta} words
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onAcceptRewrite}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded transition-colors"
              >
                Accept
              </button>
              <button
                onClick={onRejectRewrite}
                className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded transition-colors"
              >
                Reject
              </button>
              <button
                onClick={onRetryRewrite}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-white">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        </div>
      )}
    </div>
  );
};
