/**
 * PillarEditModal
 *
 * Modal for viewing and editing SEO Pillars (Central Entity, Source Context, Central Search Intent).
 * Shows current values and allows quick editing without going through the full wizard.
 */

import React, { useState, useEffect, useId } from 'react';
import { SEOPillars } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';

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
  const formId = useId();
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

  const handleSave = () => {
    const updatedPillars: SEOPillars = {
      centralEntity: centralEntity.trim(),
      sourceContext: sourceContext.trim(),
      centralSearchIntent: centralSearchIntent.trim(),
    };
    onSave(updatedPillars);
  };

  const isComplete = centralEntity.trim() && sourceContext.trim() && centralSearchIntent.trim();

  const customHeader = (
    <div className="flex-1">
      <h2 className="text-xl font-bold text-white">SEO Pillars</h2>
      <p className="text-sm text-gray-400 mt-1">Define your content strategy foundation</p>
    </div>
  );

  const footer = (
    <div className="flex justify-between items-center gap-4 w-full">
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
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SEO Pillars"
      description="Define the core SEO pillars for your content strategy"
      maxWidth="max-w-2xl"
      customHeader={customHeader}
      footer={footer}
    >
      <div className="space-y-6">
        {/* Info Card */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            SEO Pillars define your content strategy. They guide AI in generating relevant topics and briefs
            that align with your business goals and target audience.
          </p>
        </div>

        {/* Central Entity */}
        <div className="space-y-2">
          <label htmlFor={`${formId}-ce`} className="block">
            <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
              Central Entity (CE)
              {centralEntity && <span className="text-green-400 text-xs" aria-hidden="true">✓ Set</span>}
            </span>
            <span id={`${formId}-ce-hint`} className="text-xs text-gray-500 block mt-1">
              The main subject or topic that your content revolves around
            </span>
          </label>
          <Input
            id={`${formId}-ce`}
            aria-describedby={`${formId}-ce-hint`}
            value={centralEntity}
            onChange={(e) => setCentralEntity(e.target.value)}
            placeholder="e.g., Cybersecurity, E-commerce Platform, Digital Marketing"
            className="w-full"
          />
          {!centralEntity && (
            <p className="text-xs text-yellow-400" role="alert">Required for topic generation</p>
          )}
        </div>

        {/* Source Context */}
        <div className="space-y-2">
          <label htmlFor={`${formId}-sc`} className="block">
            <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
              Source Context (SC)
              {sourceContext && <span className="text-green-400 text-xs" aria-hidden="true">✓ Set</span>}
            </span>
            <span id={`${formId}-sc-hint`} className="text-xs text-gray-500 block mt-1">
              Your unique perspective, expertise, or angle on the central entity
            </span>
          </label>
          <Textarea
            id={`${formId}-sc`}
            aria-describedby={`${formId}-sc-hint`}
            value={sourceContext}
            onChange={(e) => setSourceContext(e.target.value)}
            placeholder="e.g., Enterprise security solutions for financial institutions, B2B SaaS platform for small businesses"
            rows={3}
            className="w-full"
          />
          {!sourceContext && (
            <p className="text-xs text-yellow-400" role="alert">Required for differentiated content</p>
          )}
        </div>

        {/* Central Search Intent */}
        <div className="space-y-2">
          <label htmlFor={`${formId}-csi`} className="block">
            <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
              Central Search Intent (CSI)
              {centralSearchIntent && <span className="text-green-400 text-xs" aria-hidden="true">✓ Set</span>}
            </span>
            <span id={`${formId}-csi-hint`} className="text-xs text-gray-500 block mt-1">
              The primary intent your target audience has when searching
            </span>
          </label>
          <Input
            id={`${formId}-csi`}
            aria-describedby={`${formId}-csi-hint`}
            value={centralSearchIntent}
            onChange={(e) => setCentralSearchIntent(e.target.value)}
            placeholder="e.g., Learn about, Compare solutions, Find providers"
            className="w-full"
          />
          {!centralSearchIntent && (
            <p className="text-xs text-yellow-400" role="alert">Required for intent-aligned content</p>
          )}
        </div>

        {/* Status Summary */}
        <div
          className={`p-4 rounded-lg ${isComplete ? 'bg-green-900/20 border border-green-700' : 'bg-yellow-900/20 border border-yellow-700'}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {isComplete ? (
              <>
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-300 font-medium">All pillars defined</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-yellow-300 font-medium">Complete all pillars to enable content generation</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PillarEditModal;
