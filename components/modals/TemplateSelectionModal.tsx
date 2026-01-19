/**
 * TemplateSelectionModal Component
 *
 * Allows users to view AI-recommended content templates with confidence scores,
 * understand the reasoning behind selections, view alternatives, and override
 * the selection if needed.
 *
 * Created: 2026-01-18 - Content Template Routing Phase 2 Task 9
 *
 * @module components/modals/TemplateSelectionModal
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TemplateName, TemplateConfig } from '../../types/contentTemplates';
import { getTemplateByName } from '../../config/contentTemplates';

interface TemplateSelectionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when a template is selected */
  onSelect: (templateName: TemplateName) => void;
  /** The AI-recommended template */
  selectedTemplate: TemplateConfig;
  /** Alternative templates with reasons */
  alternatives: Array<{ templateName: TemplateName; reason: string }>;
  /** AI reasoning for the selection */
  reasoning: string[];
  /** Confidence score (0-100) */
  confidence: number;
}

/**
 * Modal for displaying and selecting content templates
 * Shows AI recommendation, confidence, reasoning, and alternatives
 */
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
    // Don't call onClose() here - the parent flow advances to the next step
    // onClose is only for cancellation
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
                  <span className="text-cyan-400 mt-0.5">&#8226;</span>
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
