// components/SchemaModal.tsx
// Enhanced Schema Modal with validation, entities, and export options

import React, { useState, useEffect, useId } from 'react';
import type {
  SchemaGenerationResult,
  EnhancedSchemaResult,
  SchemaValidationResult,
  ResolvedEntity,
  SchemaValidationError,
  SchemaValidationWarning
} from '../../types';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

// Tab definitions
type TabId = 'schema' | 'validation' | 'entities' | 'export';

interface Tab {
  id: TabId;
  label: string;
  badge?: number;
}

interface SchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SchemaGenerationResult | EnhancedSchemaResult | null;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

const SchemaModal: React.FC<SchemaModalProps> = ({
  isOpen,
  onClose,
  result,
  onRegenerate,
  isRegenerating = false
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('schema');
  const [copyButtonText, setCopyButtonText] = useState('Copy');

  // Check if result is enhanced schema
  const isEnhanced = result && 'validation' in result;
  const enhancedResult = isEnhanced ? result as EnhancedSchemaResult : null;
  const legacyResult = !isEnhanced ? result as SchemaGenerationResult : null;

  // Get schema string - handle both string and object formats
  const getSchemaString = (): string => {
    if (enhancedResult?.schemaString) {
      return enhancedResult.schemaString;
    }
    if (legacyResult?.schema) {
      // Handle case where schema is already an object (from AI response parsing)
      if (typeof legacyResult.schema === 'object') {
        return JSON.stringify(legacyResult.schema, null, 2);
      }
      return legacyResult.schema;
    }
    return '';
  };
  const schemaString = getSchemaString();

  useEffect(() => {
    if (isOpen) {
      setCopyButtonText('Copy');
      setActiveTab('schema');
    }
  }, [isOpen]);

  const tabIdPrefix = useId();

  // Build tabs based on available data
  const tabs: Tab[] = [
    { id: 'schema', label: 'Schema' }
  ];

  if (enhancedResult?.validation) {
    const errorCount = (enhancedResult.validation.syntaxErrors?.length || 0) +
      (enhancedResult.validation.schemaOrgErrors?.length || 0) +
      (enhancedResult.validation.contentParityErrors?.length || 0) +
      (enhancedResult.validation.eavConsistencyErrors?.length || 0) +
      (enhancedResult.validation.entityErrors?.length || 0);
    tabs.push({
      id: 'validation',
      label: 'Validation',
      badge: errorCount > 0 ? errorCount : undefined
    });
  }

  if (enhancedResult?.resolvedEntities?.length) {
    tabs.push({
      id: 'entities',
      label: 'Entities',
      badge: enhancedResult.resolvedEntities.length
    });
  }

  tabs.push({ id: 'export', label: 'Export' });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    }).catch(err => {
      console.error('Failed to copy schema: ', err);
      setCopyButtonText('Failed');
    });
  };

  // Syntax highlighting for JSON
  const formatJson = (json: string) => {
    if (!json) return '';

    const encoded = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return encoded.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        let cls = 'text-yellow-400'; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-purple-400'; // key
          } else {
            cls = 'text-green-400'; // string
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-blue-400'; // boolean
        } else if (/null/.test(match)) {
          cls = 'text-gray-500'; // null
        }
        return '<span class="' + cls + '">' + match + '</span>';
      }
    );
  };

  // Custom header with tabs
  const customHeader = (
    <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 z-10 flex-shrink-0 rounded-t-xl">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-xl font-bold text-white">Schema.org Markup (JSON-LD)</h2>
          {enhancedResult && (
            <p className="text-sm text-gray-400 mt-1">
              Page Type: <span className="text-cyan-400">{enhancedResult.pageType}</span>
              {enhancedResult.pageTypeOverridden && (
                <span className="text-yellow-500 ml-2">(overridden from {enhancedResult.detectedPageType})</span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs with ARIA */}
      <div className="flex space-x-1" role="tablist" aria-label="Schema sections">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`${tabIdPrefix}-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`${tabIdPrefix}-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center rounded-full ${
                tab.id === 'validation' ? 'bg-red-500' : 'bg-blue-500'
              } text-white`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // Modal footer
  const modalFooter = (
    <div className="flex justify-between w-full">
      <div>
        {onRegenerate && (
          <Button
            onClick={onRegenerate}
            variant="secondary"
            disabled={isRegenerating}
          >
            {isRegenerating ? 'Regenerating...' : 'Regenerate Schema'}
          </Button>
        )}
      </div>
      <Button onClick={onClose} variant="secondary">Close</Button>
    </div>
  );

  if (!isOpen || !result) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schema.org Markup (JSON-LD)"
      maxWidth="max-w-4xl"
      showHeader={false}
      customHeader={customHeader}
      footer={modalFooter}
    >
        <div
          role="tabpanel"
          id={`${tabIdPrefix}-panel-${activeTab}`}
          aria-labelledby={`${tabIdPrefix}-tab-${activeTab}`}
        >
          {/* Schema Tab */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              {/* Reasoning */}
              <Card className="p-3 bg-gray-900/50">
                <p className="text-sm text-cyan-300/90 italic">
                  <strong>AI Reasoning:</strong> {enhancedResult?.reasoning || legacyResult?.reasoning}
                </p>
              </Card>

              {/* Rich Result Eligibility */}
              {enhancedResult?.richResultTypes?.length ? (
                <Card className="p-3 bg-green-900/30 border border-green-700">
                  <p className="text-sm text-green-400">
                    <strong>Rich Result Eligible:</strong> {enhancedResult.richResultTypes.join(', ')}
                  </p>
                </Card>
              ) : null}

              {/* Validation Score Badge */}
              {enhancedResult?.validation && (
                <div className="flex items-center gap-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    enhancedResult.validation.overallScore >= 80
                      ? 'bg-green-600 text-white'
                      : enhancedResult.validation.overallScore >= 60
                        ? 'bg-yellow-600 text-white'
                        : 'bg-red-600 text-white'
                  }`}>
                    Validation Score: {enhancedResult.validation.overallScore}/100
                  </div>
                  {enhancedResult.validation.autoFixApplied && (
                    <span className="text-sm text-blue-400">
                      {enhancedResult.validation.autoFixChanges?.length || 0} auto-fixes applied
                    </span>
                  )}
                </div>
              )}

              {/* Schema JSON */}
              <div className="relative bg-gray-900 rounded-lg p-4 border border-gray-700">
                <Button
                  onClick={() => handleCopy(schemaString)}
                  variant="secondary"
                  className="absolute top-2 right-2 !py-1 !px-3 text-xs"
                >
                  {copyButtonText}
                </Button>
                <pre className="overflow-x-auto text-sm max-h-96 overflow-y-auto">
                  <code dangerouslySetInnerHTML={{ __html: formatJson(schemaString) }} />
                </pre>
              </div>
            </div>
          )}

          {/* Validation Tab */}
          {activeTab === 'validation' && enhancedResult?.validation && (
            <ValidationPanel validation={enhancedResult.validation} />
          )}

          {/* Entities Tab */}
          {activeTab === 'entities' && enhancedResult?.resolvedEntities && (
            <EntitiesPanel
              entities={enhancedResult.resolvedEntities}
              skipped={enhancedResult.entitiesSkipped}
            />
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <ExportPanel
              schemaString={schemaString}
              onCopy={handleCopy}
            />
          )}
        </div>
    </Modal>
  );
};

// ============================================================================
// VALIDATION PANEL
// ============================================================================

const ValidationPanel: React.FC<{ validation: SchemaValidationResult }> = ({ validation }) => {
  const allErrors: Array<SchemaValidationError & { categoryLabel: string }> = [
    ...validation.syntaxErrors.map(e => ({ ...e, categoryLabel: 'Syntax' })),
    ...validation.schemaOrgErrors.map(e => ({ ...e, categoryLabel: 'Schema.org' })),
    ...validation.contentParityErrors.map(e => ({ ...e, categoryLabel: 'Content Parity' })),
    ...validation.eavConsistencyErrors.map(e => ({ ...e, categoryLabel: 'EAV Consistency' })),
    ...validation.entityErrors.map(e => ({ ...e, categoryLabel: 'Entity' }))
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Overall Score"
          value={validation.overallScore}
          suffix="/100"
          color={validation.overallScore >= 80 ? 'green' : validation.overallScore >= 60 ? 'yellow' : 'red'}
        />
        <StatCard label="Errors" value={allErrors.filter(e => e.severity === 'error').length} color="red" />
        <StatCard label="Warnings" value={allErrors.filter(e => e.severity === 'warning').length} color="yellow" />
        <StatCard label="Auto-fixable" value={allErrors.filter(e => e.autoFixable).length} color="blue" />
      </div>

      {/* Auto-fix Info */}
      {validation.autoFixApplied && validation.autoFixChanges?.length > 0 && (
        <Card className="p-4 bg-blue-900/30 border border-blue-700">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">
            Auto-fixes Applied ({validation.autoFixIterations} iteration{validation.autoFixIterations !== 1 ? 's' : ''})
          </h4>
          <ul className="text-sm text-gray-300 space-y-1">
            {validation.autoFixChanges.map((change, i) => (
              <li key={i} className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                {change}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Errors List */}
      {allErrors.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Issues</h4>
          {allErrors.map((error, index) => (
            <ValidationErrorCard key={index} error={error} />
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center">
          <span className="text-4xl mb-2 block">✅</span>
          <p className="text-green-400 font-medium">No validation errors found!</p>
        </Card>
      )}

      {/* Warnings */}
      {validation.warnings?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Best Practices</h4>
          {validation.warnings.map((warning, index) => (
            <ValidationWarningCard key={index} warning={warning} />
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; suffix?: string; color: 'green' | 'yellow' | 'red' | 'blue' }> = ({
  label, value, suffix = '', color
}) => {
  const colorClasses = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    blue: 'text-blue-400'
  };

  return (
    <Card className="p-4 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>
        {value}{suffix}
      </p>
    </Card>
  );
};

const ValidationErrorCard: React.FC<{ error: SchemaValidationError & { categoryLabel: string } }> = ({ error }) => (
  <Card className={`p-3 ${error.severity === 'error' ? 'border-red-500/50 bg-red-900/20' : 'border-yellow-500/50 bg-yellow-900/20'}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded ${error.severity === 'error' ? 'bg-red-600' : 'bg-yellow-600'} text-white`}>
            {error.severity.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">{error.categoryLabel}</span>
          {error.autoFixable && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white">Auto-fixable</span>
          )}
        </div>
        <p className="text-sm text-gray-200">{error.message}</p>
        <p className="text-xs text-gray-500 mt-1">Path: {error.path}</p>
        {error.suggestion && (
          <p className="text-xs text-blue-400 mt-1">Suggestion: {error.suggestion}</p>
        )}
      </div>
    </div>
  </Card>
);

const ValidationWarningCard: React.FC<{ warning: SchemaValidationWarning }> = ({ warning }) => (
  <Card className="p-3 border-gray-600 bg-gray-800/50">
    <p className="text-sm text-gray-300">{warning.message}</p>
    <p className="text-xs text-gray-500 mt-1">Path: {warning.path}</p>
    <p className="text-xs text-cyan-400 mt-1">{warning.recommendation}</p>
  </Card>
);

// ============================================================================
// ENTITIES PANEL
// ============================================================================

const EntitiesPanel: React.FC<{
  entities: ResolvedEntity[];
  skipped?: string[];
}> = ({ entities, skipped }) => (
  <div className="space-y-4">
    <p className="text-sm text-gray-400">
      {entities.length} entities resolved from external knowledge bases
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {entities.map((entity, index) => (
        <EntityCard key={index} entity={entity} />
      ))}
    </div>

    {skipped && skipped.length > 0 && (
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-500 mb-2">Skipped Entities ({skipped.length})</h4>
        <p className="text-sm text-gray-500">
          {skipped.join(', ')}
        </p>
      </div>
    )}
  </div>
);

const EntityCard: React.FC<{ entity: ResolvedEntity }> = ({ entity }) => {
  const typeColors: Record<string, string> = {
    Person: 'bg-purple-600',
    Organization: 'bg-blue-600',
    Place: 'bg-green-600',
    Thing: 'bg-gray-600',
    Event: 'bg-orange-600',
    CreativeWork: 'bg-pink-600'
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h5 className="font-medium text-white">{entity.name}</h5>
          <span className={`text-xs px-2 py-0.5 rounded ${typeColors[entity.type] || 'bg-gray-600'} text-white`}>
            {entity.type}
          </span>
        </div>
        <div className="text-right">
          <span className={`text-sm font-medium ${
            entity.confidenceScore >= 0.8 ? 'text-green-400' :
            entity.confidenceScore >= 0.5 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {Math.round(entity.confidenceScore * 100)}%
          </span>
          <p className="text-xs text-gray-500">confidence</p>
        </div>
      </div>

      {entity.description && (
        <p className="text-sm text-gray-400 mb-2">{entity.description}</p>
      )}

      {entity.wikidataId && (
        <a
          href={`https://www.wikidata.org/wiki/${entity.wikidataId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:underline block"
        >
          Wikidata: {entity.wikidataId}
        </a>
      )}

      {entity.wikipediaUrl && (
        <a
          href={entity.wikipediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:underline block"
        >
          Wikipedia Article
        </a>
      )}

      {entity.sameAs && entity.sameAs.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">sameAs URLs ({entity.sameAs.length})</p>
          <div className="flex flex-wrap gap-1">
            {entity.sameAs.slice(0, 3).map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300 hover:bg-gray-600 truncate max-w-32"
                title={url}
              >
                {new URL(url).hostname}
              </a>
            ))}
            {entity.sameAs.length > 3 && (
              <span className="text-xs text-gray-500">+{entity.sameAs.length - 3} more</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

// ============================================================================
// EXPORT PANEL
// ============================================================================

const ExportPanel: React.FC<{
  schemaString: string;
  onCopy: (text: string) => void;
}> = ({ schemaString, onCopy }) => {
  const scriptTag = `<script type="application/ld+json">
${schemaString}
</script>`;

  return (
    <div className="space-y-6">
      {/* JSON-LD Script Tag */}
      <div>
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          HTML Script Tag
        </h4>
        <p className="text-sm text-gray-500 mb-2">
          Copy this script tag and paste it in your page's &lt;head&gt; section.
        </p>
        <div className="relative bg-gray-900 rounded-lg p-4 border border-gray-700">
          <Button
            onClick={() => onCopy(scriptTag)}
            variant="secondary"
            className="absolute top-2 right-2 !py-1 !px-3 text-xs"
          >
            Copy Script Tag
          </Button>
          <pre className="overflow-x-auto text-sm text-green-400">
            <code>{scriptTag}</code>
          </pre>
        </div>
      </div>

      {/* Raw JSON */}
      <div>
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Raw JSON
        </h4>
        <p className="text-sm text-gray-500 mb-2">
          Copy the raw JSON-LD data.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => onCopy(schemaString)} variant="secondary">
            Copy Raw JSON
          </Button>
          <Button
            onClick={() => {
              const minified = JSON.stringify(JSON.parse(schemaString));
              onCopy(minified);
            }}
            variant="secondary"
          >
            Copy Minified
          </Button>
        </div>
      </div>

      {/* Download */}
      <div>
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Download
        </h4>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              const blob = new Blob([schemaString], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'schema.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            variant="secondary"
          >
            Download .json
          </Button>
        </div>
      </div>

      {/* Validation Link */}
      <div>
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Validate Externally
        </h4>
        <p className="text-sm text-gray-500 mb-2">
          Test your schema with Google's Rich Results Test or Schema.org validator.
        </p>
        <div className="flex gap-2">
          <a
            href="https://search.google.com/test/rich-results"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary">Google Rich Results Test</Button>
          </a>
          <a
            href="https://validator.schema.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary">Schema.org Validator</Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default SchemaModal;
