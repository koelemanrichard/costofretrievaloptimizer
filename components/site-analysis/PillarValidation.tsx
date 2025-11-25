// components/site-analysis/PillarValidation.tsx
// Pillar discovery and validation component for V2 workflow
// Now with step-by-step wizard for CE/SC/CSI selection

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { SiteAnalysisProject, DiscoveredPillars, CandidateEntity, SourceContextOption } from '../../types';

type WizardStep = 'entity' | 'context' | 'intent' | 'review';

interface PillarValidationProps {
  project: SiteAnalysisProject;
  discoveredPillars: DiscoveredPillars | null;
  // New props for wizard flow
  entityCandidates?: CandidateEntity[];
  contextOptions?: SourceContextOption[];
  onFetchContextOptions?: (entity: string) => Promise<SourceContextOption[]>;
  onGenerateSearchIntent?: (entity: string, context: string) => Promise<string>;
  onValidate: (pillars: {
    centralEntity: string;
    centralEntityType?: string;
    sourceContext: string;
    sourceContextType?: string;
    centralSearchIntent: string;
  }) => void;
  onSkip: () => void;
  isProcessing: boolean;
}

export const PillarValidation: React.FC<PillarValidationProps> = ({
  project,
  discoveredPillars,
  entityCandidates = [],
  contextOptions: externalContextOptions = [],
  onFetchContextOptions,
  onGenerateSearchIntent,
  onValidate,
  onSkip,
  isProcessing,
}) => {
  // Wizard step state
  const [wizardStep, setWizardStep] = useState<WizardStep>('entity');
  const [isLoadingStep, setIsLoadingStep] = useState(false);

  // Form state
  const [centralEntity, setCentralEntity] = useState(
    project.centralEntity || discoveredPillars?.centralEntity.suggested || ''
  );
  const [centralEntityType, setCentralEntityType] = useState(
    project.centralEntityType || discoveredPillars?.centralEntity.type || ''
  );
  const [sourceContext, setSourceContext] = useState(
    project.sourceContext || discoveredPillars?.sourceContext.suggested || ''
  );
  const [sourceContextType, setSourceContextType] = useState(
    project.sourceContextType || discoveredPillars?.sourceContext.type || ''
  );
  const [centralSearchIntent, setCentralSearchIntent] = useState(
    project.centralSearchIntent || discoveredPillars?.centralSearchIntent.suggested || ''
  );

  // Local context options (can be fetched or passed in)
  const [localContextOptions, setLocalContextOptions] = useState<SourceContextOption[]>(externalContextOptions);

  // Custom input states
  const [useCustomEntity, setUseCustomEntity] = useState(false);
  const [useCustomContext, setUseCustomContext] = useState(false);

  // Determine if this is from a linked project (skip wizard, go directly to review)
  const isFromLinkedProject = project.pillarsSource === 'linked';

  // Update form when discovered pillars change
  useEffect(() => {
    if (discoveredPillars) {
      if (!centralEntity) setCentralEntity(discoveredPillars.centralEntity.suggested);
      if (!centralEntityType) setCentralEntityType(discoveredPillars.centralEntity.type);
      if (!sourceContext) setSourceContext(discoveredPillars.sourceContext.suggested);
      if (!sourceContextType) setSourceContextType(discoveredPillars.sourceContext.type);
      if (!centralSearchIntent) setCentralSearchIntent(discoveredPillars.centralSearchIntent.suggested);
    }
  }, [discoveredPillars]);

  // Update local context options when external ones change
  useEffect(() => {
    if (externalContextOptions.length > 0) {
      setLocalContextOptions(externalContextOptions);
    }
  }, [externalContextOptions]);

  // Skip wizard for linked projects
  useEffect(() => {
    if (isFromLinkedProject && project.centralEntity) {
      setWizardStep('review');
    }
  }, [isFromLinkedProject, project.centralEntity]);

  // Handle entity selection and proceed to context step
  const handleEntitySelect = async (entity: string) => {
    setCentralEntity(entity);
    setIsLoadingStep(true);

    // Fetch context options for this entity
    if (onFetchContextOptions) {
      try {
        const options = await onFetchContextOptions(entity);
        setLocalContextOptions(options);
        if (options.length > 0) {
          setSourceContext(options[0].context);
        }
      } catch (err) {
        console.error('Failed to fetch context options:', err);
      }
    }

    setIsLoadingStep(false);
    setWizardStep('context');
  };

  // Handle context selection and proceed to intent step
  const handleContextSelect = async (context: string, contextType?: string) => {
    setSourceContext(context);
    if (contextType) setSourceContextType(contextType);
    setIsLoadingStep(true);

    // Generate search intent
    if (onGenerateSearchIntent) {
      try {
        const intent = await onGenerateSearchIntent(centralEntity, context);
        setCentralSearchIntent(intent);
      } catch (err) {
        console.error('Failed to generate search intent:', err);
        setCentralSearchIntent(`Find information about ${centralEntity}`);
      }
    }

    setIsLoadingStep(false);
    setWizardStep('intent');
  };

  // Handle intent confirmation and proceed to review
  const handleIntentConfirm = () => {
    setWizardStep('review');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onValidate({
      centralEntity,
      centralEntityType,
      sourceContext,
      sourceContextType,
      centralSearchIntent,
    });
  };

  const entityTypes = [
    'Brand/Company',
    'Product',
    'Service',
    'Person',
    'Concept',
    'Technology',
    'Industry',
    'Other',
  ];

  const contextTypes = [
    'Industry',
    'Niche',
    'Market Segment',
    'Geographic',
    'Demographic',
    'Use Case',
    'Other',
  ];

  const renderConfidenceBadge = (confidence: number) => {
    const color = confidence >= 0.8 ? 'green' : confidence >= 0.6 ? 'yellow' : 'red';
    const colors = {
      green: 'bg-green-500/20 text-green-400',
      yellow: 'bg-yellow-500/20 text-yellow-400',
      red: 'bg-red-500/20 text-red-400',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${colors[color]}`}>
        {Math.round(confidence * 100)}% confidence
      </span>
    );
  };

  // Step indicator
  const renderStepIndicator = () => {
    const steps = [
      { key: 'entity', label: 'Entity' },
      { key: 'context', label: 'Context' },
      { key: 'intent', label: 'Intent' },
      { key: 'review', label: 'Review' },
    ];
    const currentIndex = steps.findIndex(s => s.key === wizardStep);

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                index < currentIndex
                  ? 'bg-green-500 text-white'
                  : index === currentIndex
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-700 text-gray-400'
              }`}>
                {index < currentIndex ? '✓' : index + 1}
              </div>
              <span className={`text-xs mt-1 ${
                index === currentIndex ? 'text-purple-400' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-2 ${
                index < currentIndex ? 'bg-green-500' : 'bg-gray-700'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Step 1: Entity Selection
  const renderEntityStep = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Select Central Entity (CE)</h3>
        <p className="text-sm text-gray-400 mb-6">
          The Central Entity is the main subject your site is about - the core concept all content should relate to.
        </p>

        {entityCandidates.length > 0 && !useCustomEntity ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-300 mb-3">AI-suggested candidates:</p>
            {entityCandidates.map((candidate, index) => (
              <button
                key={index}
                onClick={() => handleEntitySelect(candidate.entity)}
                disabled={isLoadingStep}
                className={`w-full p-4 rounded-lg border text-left transition-all ${
                  centralEntity === candidate.entity
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-purple-500/50 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{candidate.entity}</span>
                  {renderConfidenceBadge(candidate.score)}
                </div>
                {candidate.reasoning && (
                  <p className="text-sm text-gray-400 mt-2">{candidate.reasoning}</p>
                )}
              </button>
            ))}
            <button
              onClick={() => setUseCustomEntity(true)}
              className="w-full p-3 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
            >
              + Enter custom entity
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entity Name *
              </label>
              <input
                type="text"
                value={centralEntity}
                onChange={(e) => setCentralEntity(e.target.value)}
                placeholder="e.g., Acme Software, Coffee Brewing, John Smith"
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entity Type
              </label>
              <select
                value={centralEntityType}
                onChange={(e) => setCentralEntityType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">Select type...</option>
                {entityTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            {entityCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => setUseCustomEntity(false)}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                ← Back to AI suggestions
              </button>
            )}
            <Button
              onClick={() => handleEntitySelect(centralEntity)}
              disabled={!centralEntity || isLoadingStep}
              variant="primary"
              className="w-full"
            >
              {isLoadingStep ? 'Loading...' : 'Continue with this entity'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );

  // Step 2: Context Selection
  const renderContextStep = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">Select Source Context (SC)</h3>
          <span className="text-sm text-gray-400">for "{centralEntity}"</span>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          The Source Context defines your unique perspective, industry, or niche that differentiates your content.
        </p>

        {isLoadingStep ? (
          <div className="flex items-center justify-center py-8">
            <Loader />
            <span className="ml-3 text-gray-400">Generating context options...</span>
          </div>
        ) : localContextOptions.length > 0 && !useCustomContext ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-300 mb-3">AI-suggested contexts:</p>
            {localContextOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleContextSelect(option.context)}
                className={`w-full p-4 rounded-lg border text-left transition-all ${
                  sourceContext === option.context
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-purple-500/50 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{option.context}</span>
                  {renderConfidenceBadge(option.score)}
                </div>
                {option.reasoning && (
                  <p className="text-sm text-gray-400 mt-2">{option.reasoning}</p>
                )}
              </button>
            ))}
            <button
              onClick={() => setUseCustomContext(true)}
              className="w-full p-3 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
            >
              + Enter custom context
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Context *
              </label>
              <input
                type="text"
                value={sourceContext}
                onChange={(e) => setSourceContext(e.target.value)}
                placeholder="e.g., SaaS Industry, Home Brewing Enthusiasts, Legal Services"
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Context Type
              </label>
              <select
                value={sourceContextType}
                onChange={(e) => setSourceContextType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">Select type...</option>
                {contextTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            {localContextOptions.length > 0 && (
              <button
                type="button"
                onClick={() => setUseCustomContext(false)}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                ← Back to AI suggestions
              </button>
            )}
            <Button
              onClick={() => handleContextSelect(sourceContext, sourceContextType)}
              disabled={!sourceContext || isLoadingStep}
              variant="primary"
              className="w-full"
            >
              {isLoadingStep ? 'Loading...' : 'Continue with this context'}
            </Button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={() => setWizardStep('entity')}
            className="text-sm text-gray-400 hover:text-white"
          >
            ← Change entity
          </button>
        </div>
      </Card>
    </div>
  );

  // Step 3: Intent Review
  const renderIntentStep = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Central Search Intent (CSI)</h3>
        <p className="text-sm text-gray-400 mb-6">
          The primary search intent users have when looking for content about {centralEntity}.
        </p>

        {isLoadingStep ? (
          <div className="flex items-center justify-center py-8">
            <Loader />
            <span className="ml-3 text-gray-400">Generating search intent...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-500 mb-2">Generated intent:</p>
              <p className="text-lg text-white">{centralSearchIntent}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Edit if needed:
              </label>
              <input
                type="text"
                value={centralSearchIntent}
                onChange={(e) => setCentralSearchIntent(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <Button
              onClick={handleIntentConfirm}
              disabled={!centralSearchIntent}
              variant="primary"
              className="w-full"
            >
              Review & Confirm
            </Button>

            <button
              type="button"
              onClick={() => setWizardStep('context')}
              className="w-full text-sm text-gray-400 hover:text-white"
            >
              ← Change context
            </button>
          </div>
        )}
      </Card>
    </div>
  );

  // Step 4: Review (original validation form)
  const renderReviewStep = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Summary Card */}
      <Card className="p-6 bg-purple-500/10 border-purple-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">Review Your Semantic Pillars</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Central Entity</p>
            <p className="text-white font-medium">{centralEntity}</p>
            {centralEntityType && <p className="text-xs text-gray-400">{centralEntityType}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Source Context</p>
            <p className="text-white font-medium">{sourceContext}</p>
            {sourceContextType && <p className="text-xs text-gray-400">{sourceContextType}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Central Search Intent</p>
            <p className="text-white font-medium">{centralSearchIntent}</p>
          </div>
        </div>
      </Card>

      {/* Editable Fields */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Fine-tune if needed</h3>

        <div className="space-y-4">
          {/* Central Entity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Central Entity *
              </label>
              <input
                type="text"
                value={centralEntity}
                onChange={(e) => setCentralEntity(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entity Type
              </label>
              <select
                value={centralEntityType}
                onChange={(e) => setCentralEntityType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">Select type...</option>
                {entityTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Source Context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source Context *
              </label>
              <input
                type="text"
                value={sourceContext}
                onChange={(e) => setSourceContext(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Context Type
              </label>
              <select
                value={sourceContextType}
                onChange={(e) => setSourceContextType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">Select type...</option>
                {contextTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Central Search Intent */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Central Search Intent *
            </label>
            <input
              type="text"
              value={centralSearchIntent}
              onChange={(e) => setCentralSearchIntent(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              required
            />
          </div>
        </div>
      </Card>

      {/* Info Box */}
      <Card className="p-4 bg-blue-500/10 border-blue-500/30">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-blue-200">
              <strong>Why does this matter?</strong> These pillars form the semantic foundation
              for auditing your content. Pages will be scored on how well they align with
              and support your Central Entity within your Source Context.
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        {!isFromLinkedProject && (
          <Button
            type="button"
            onClick={() => setWizardStep('entity')}
            variant="secondary"
            disabled={isProcessing}
          >
            ← Start Over
          </Button>
        )}
        {isFromLinkedProject && (
          <Button
            type="button"
            onClick={onSkip}
            variant="secondary"
            disabled={isProcessing}
          >
            Skip Validation
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isProcessing || !centralEntity || !sourceContext || !centralSearchIntent}
        >
          {isProcessing ? 'Processing...' : 'Validate & Continue'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {isFromLinkedProject ? 'Validate Imported Pillars' : 'Define Semantic Pillars'}
            </h2>
            <p className="text-gray-400">
              {isFromLinkedProject
                ? 'Pillars imported from your linked topical map. Review and adjust if needed.'
                : 'Select or define the semantic foundation for analyzing your content.'}
            </p>
          </div>
          {project.pillarsSource && (
            <span className={`px-3 py-1 rounded-full text-xs ${
              project.pillarsSource === 'linked'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-purple-500/20 text-purple-400'
            }`}>
              {project.pillarsSource === 'linked' ? 'From Linked Project' : 'AI Discovered'}
            </span>
          )}
        </div>
      </Card>

      {/* Step Indicator (only show for wizard flow) */}
      {!isFromLinkedProject && renderStepIndicator()}

      {/* Render current step */}
      {wizardStep === 'entity' && renderEntityStep()}
      {wizardStep === 'context' && renderContextStep()}
      {wizardStep === 'intent' && renderIntentStep()}
      {wizardStep === 'review' && renderReviewStep()}
    </div>
  );
};

export default PillarValidation;
