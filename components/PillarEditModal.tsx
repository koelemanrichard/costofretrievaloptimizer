/**
 * PillarEditModal
 *
 * Modal for viewing and editing SEO Pillars (Central Entity, Source Context, Central Search Intent).
 * Shows current values and allows quick editing without going through the full wizard.
 */

import React, { useState, useEffect } from 'react';
import { SEOPillars } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';

interface PillarEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  pillars: SEOPillars | null | undefined;
  onSave: (pillars: SEOPillars) => void;
  isLoading?: boolean;
}

const PillarEditModal: React.FC<PillarEditModalProps> = ({
  isOpen,
  onClose,
  pillars,
  onSave,
  isLoading = false,
}) => {
  const [centralEntity, setCentralEntity] = useState('');
  const [sourceContext, setSourceContext] = useState('');
  const [centralSearchIntent, setCentralSearchIntent] = useState('');

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen && pillars) {
      setCentralEntity(pillars.centralEntity || '');
      setSourceContext(pillars.sourceContext || '');
      setCentralSearchIntent(pillars.centralSearchIntent || '');
    }
  }, [isOpen, pillars]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updatedPillars: SEOPillars = {
      centralEntity: centralEntity.trim(),
      sourceContext: sourceContext.trim(),
      centralSearchIntent: centralSearchIntent.trim(),
    };
    onSave(updatedPillars);
  };

  const isComplete = centralEntity.trim() && sourceContext.trim() && centralSearchIntent.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">SEO Pillars</h2>
            <p className="text-sm text-gray-400 mt-1">Define your content strategy foundation</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Info Card */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              SEO Pillars define your content strategy. They guide AI in generating relevant topics and briefs
              that align with your business goals and target audience.
            </p>
          </div>

          {/* Central Entity */}
          <div className="space-y-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                Central Entity (CE)
                {centralEntity && <span className="text-green-400 text-xs">✓ Set</span>}
              </span>
              <span className="text-xs text-gray-500 block mt-1">
                The main subject or topic that your content revolves around
              </span>
            </label>
            <Input
              value={centralEntity}
              onChange={(e) => setCentralEntity(e.target.value)}
              placeholder="e.g., Cybersecurity, E-commerce Platform, Digital Marketing"
              className="w-full"
            />
            {!centralEntity && (
              <p className="text-xs text-yellow-400">Required for topic generation</p>
            )}
          </div>

          {/* Source Context */}
          <div className="space-y-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                Source Context (SC)
                {sourceContext && <span className="text-green-400 text-xs">✓ Set</span>}
              </span>
              <span className="text-xs text-gray-500 block mt-1">
                Your unique perspective, expertise, or angle on the central entity
              </span>
            </label>
            <Textarea
              value={sourceContext}
              onChange={(e) => setSourceContext(e.target.value)}
              placeholder="e.g., Enterprise security solutions for financial institutions, B2B SaaS platform for small businesses"
              rows={3}
              className="w-full"
            />
            {!sourceContext && (
              <p className="text-xs text-yellow-400">Required for differentiated content</p>
            )}
          </div>

          {/* Central Search Intent */}
          <div className="space-y-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                Central Search Intent (CSI)
                {centralSearchIntent && <span className="text-green-400 text-xs">✓ Set</span>}
              </span>
              <span className="text-xs text-gray-500 block mt-1">
                The primary intent your target audience has when searching
              </span>
            </label>
            <Input
              value={centralSearchIntent}
              onChange={(e) => setCentralSearchIntent(e.target.value)}
              placeholder="e.g., Learn about, Compare solutions, Find providers"
              className="w-full"
            />
            {!centralSearchIntent && (
              <p className="text-xs text-yellow-400">Required for intent-aligned content</p>
            )}
          </div>

          {/* Status Summary */}
          <div className={`p-4 rounded-lg ${isComplete ? 'bg-green-900/20 border border-green-700' : 'bg-yellow-900/20 border border-yellow-700'}`}>
            <div className="flex items-center gap-2">
              {isComplete ? (
                <>
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-300 font-medium">All pillars defined</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-yellow-300 font-medium">Complete all pillars to enable content generation</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center gap-4">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !isComplete}
          >
            {isLoading ? 'Saving...' : 'Save Pillars'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PillarEditModal;
