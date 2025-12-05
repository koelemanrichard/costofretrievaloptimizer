import React, { useEffect } from 'react';
import { TopicalMap, ContextConflict, BusinessInfo, SEOPillars } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';

interface MergeContextStepProps {
  sourceMaps: TopicalMap[];
  contextConflicts: ContextConflict[];
  resolvedContext: {
    businessInfo: Partial<BusinessInfo>;
    pillars: SEOPillars | null;
  };
  isAnalyzing: boolean;
  onResolveConflict: (field: string, resolution: ContextConflict['resolution'], customValue?: any) => void;
  onAnalyze: () => void;
}

const BUSINESS_FIELDS = ['industry', 'audience', 'expertise', 'valueProp', 'targetMarket', 'language'] as const;
const PILLAR_FIELDS = ['centralEntity', 'sourceContext', 'centralSearchIntent'] as const;

const MergeContextStep: React.FC<MergeContextStepProps> = ({
  sourceMaps,
  contextConflicts,
  resolvedContext,
  isAnalyzing,
  onResolveConflict,
  onAnalyze,
}) => {
  // Auto-analyze on mount if no conflicts detected yet
  useEffect(() => {
    if (contextConflicts.length === 0 && !isAnalyzing) {
      onAnalyze();
    }
  }, []);

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader />
        <p className="text-gray-400 mt-4">Analyzing business context and pillars...</p>
      </div>
    );
  }

  const renderConflict = (conflict: ContextConflict) => {
    const isPillarField = PILLAR_FIELDS.includes(conflict.field as any);

    return (
      <Card key={conflict.field} className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold text-white capitalize">
              {conflict.field.replace(/([A-Z])/g, ' $1').trim()}
            </p>
            <span className={`text-xs px-2 py-1 rounded ${
              isPillarField ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'
            }`}>
              {isPillarField ? 'SEO Pillar' : 'Business Context'}
            </span>
          </div>
        </div>

        {/* Values from each map */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {conflict.values.map((v, idx) => (
            <div
              key={v.mapId}
              className={`p-3 rounded cursor-pointer transition-colors ${
                conflict.resolution === (idx === 0 ? 'mapA' : 'mapB')
                  ? 'bg-blue-900/50 border border-blue-500'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              onClick={() => onResolveConflict(conflict.field, idx === 0 ? 'mapA' : 'mapB')}
            >
              <p className="text-xs text-gray-500 mb-1">{v.mapName}</p>
              <p className="text-white">{String(v.value) || '(empty)'}</p>
            </div>
          ))}
        </div>

        {/* AI Suggestion */}
        {conflict.aiSuggestion && (
          <div
            className={`p-3 rounded cursor-pointer transition-colors ${
              conflict.resolution === 'ai'
                ? 'bg-green-900/50 border border-green-500'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
            onClick={() => onResolveConflict(conflict.field, 'ai')}
          >
            <p className="text-xs text-green-400 mb-1">AI Suggestion</p>
            <p className="text-white">{String(conflict.aiSuggestion.value)}</p>
            <p className="text-xs text-gray-400 mt-1">{conflict.aiSuggestion.reasoning}</p>
          </div>
        )}

        {/* Custom value */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Or enter custom value..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            value={conflict.resolution === 'custom' ? conflict.customValue || '' : ''}
            onChange={(e) => onResolveConflict(conflict.field, 'custom', e.target.value)}
          />
        </div>
      </Card>
    );
  };

  // Group conflicts by type
  const pillarConflicts = contextConflicts.filter(c => PILLAR_FIELDS.includes(c.field as any));
  const businessConflicts = contextConflicts.filter(c => !PILLAR_FIELDS.includes(c.field as any));
  const alignedFields = [...BUSINESS_FIELDS, ...PILLAR_FIELDS].filter(
    f => !contextConflicts.find(c => c.field === f)
  );

  return (
    <div className="space-y-6">
      {/* Aligned fields (collapsed) */}
      {alignedFields.length > 0 && (
        <div className="p-4 bg-gray-800/50 rounded">
          <p className="text-green-400 text-sm mb-2">&check; {alignedFields.length} fields are already aligned</p>
          <div className="flex flex-wrap gap-2">
            {alignedFields.map(field => (
              <span key={field} className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SEO Pillar conflicts */}
      {pillarConflicts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">SEO Pillars</h3>
          <div className="space-y-3">
            {pillarConflicts.map(renderConflict)}
          </div>
        </div>
      )}

      {/* Business context conflicts */}
      {businessConflicts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Business Context</h3>
          <div className="space-y-3">
            {businessConflicts.map(renderConflict)}
          </div>
        </div>
      )}

      {contextConflicts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-green-400 text-lg">All context fields are aligned!</p>
          <p className="text-gray-400 mt-2">No conflicts detected between selected maps.</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onAnalyze}>
          Re-analyze
        </Button>
      </div>
    </div>
  );
};

export default MergeContextStep;
