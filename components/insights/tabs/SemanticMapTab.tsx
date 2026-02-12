// components/insights/tabs/SemanticMapTab.tsx
// Semantic Distance Matrix - visualizes entity relationships from EAVs

import React, { useState, useMemo } from 'react';
import { Card } from '../../ui/Card';
import { SemanticDistanceMatrix, MatrixItem, MatrixCell } from '../../visualization/SemanticDistanceMatrix';
import { useAppState } from '../../../state/appState';
import type { AggregatedInsights, InsightActionType } from '../../../types/insights';

interface SemanticMapTabProps {
  insights: AggregatedInsights;
  mapId: string;
  onRefresh: () => void;
  onAction?: (actionType: InsightActionType, payload?: Record<string, any>) => Promise<void>;
  actionLoading?: string | null;
}

export const SemanticMapTab: React.FC<SemanticMapTabProps> = ({
  insights,
  mapId,
}) => {
  const { state } = useAppState();
  const activeMap = state.topicalMaps.find(m => m.id === mapId);
  const safeEavs = activeMap?.eavs || [];

  const [selectedMatrixCell, setSelectedMatrixCell] = useState<{
    cell: MatrixCell;
    rowItem: MatrixItem;
    colItem: MatrixItem;
  } | null>(null);

  // Prepare matrix items from EAV subjects
  const matrixItems = useMemo<MatrixItem[]>(() => {
    const uniqueSubjects = new Map<string, MatrixItem>();
    for (const eav of safeEavs) {
      const id = eav.subject.id || eav.subject.label;
      if (!uniqueSubjects.has(id)) {
        uniqueSubjects.set(id, {
          id,
          label: eav.subject.label,
          type: 'eav',
        });
      }
    }
    return Array.from(uniqueSubjects.values()).slice(0, 25);
  }, [safeEavs]);

  if (matrixItems.length < 2) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Not Enough Data</h3>
        <p className="text-gray-400 mb-6">Add more EAVs to your topical map to see semantic distance analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Semantic Map Summary */}
      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Semantic Distance Matrix</h3>
            <p className="text-sm text-gray-400">
              Validate content architecture - see which topics are too similar or too different
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-400">Entities:</span>{' '}
              <span className="text-purple-400 font-medium">{matrixItems.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Comparisons:</span>{' '}
              <span className="text-indigo-400 font-medium">
                {(matrixItems.length * (matrixItems.length - 1)) / 2}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Matrix */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            <SemanticDistanceMatrix
              items={matrixItems}
              onCellClick={(cell, rowItem, colItem) => {
                setSelectedMatrixCell({ cell, rowItem, colItem });
              }}
              title="Entity Semantic Relationships"
              maxItems={25}
              cellSize={36}
            />
          </Card>
        </div>

        {/* Details Panel */}
        <div className="space-y-4">
          {selectedMatrixCell ? (
            <Card className="p-4">
              <h4 className="font-semibold text-white mb-3">Relationship Details</h4>
              <div className="space-y-3 text-sm">
                <div className="bg-gray-800 rounded p-2">
                  <div className="text-gray-400 text-xs">Entity A</div>
                  <div className="text-white font-medium">{selectedMatrixCell.rowItem.label}</div>
                </div>
                <div className="text-center text-gray-500">
                  <svg className="w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <div className="text-gray-400 text-xs">Entity B</div>
                  <div className="text-white font-medium">{selectedMatrixCell.colItem.label}</div>
                </div>

                <div className="border-t border-gray-700 pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Distance:</span>
                    <span className={`font-medium ${
                      selectedMatrixCell.cell.distance < 0.3 ? 'text-green-400' :
                      selectedMatrixCell.cell.distance < 0.7 ? 'text-blue-400' : 'text-red-400'
                    }`}>
                      {selectedMatrixCell.cell.distance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Should Link:</span>
                    <span className={selectedMatrixCell.cell.shouldLink ? 'text-green-400' : 'text-gray-500'}>
                      {selectedMatrixCell.cell.shouldLink ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded p-2 mt-2">
                  <div className="text-gray-400 text-xs mb-1">Recommendation</div>
                  <div className="text-gray-300 text-xs">
                    {selectedMatrixCell.cell.recommendation}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4 text-center text-gray-400">
              <p>Click a cell to see relationship details</p>
            </Card>
          )}

          {/* Interpretation Guide */}
          <Card className="p-4">
            <h4 className="font-semibold text-white mb-3">Interpretation Guide</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">0.0 - 0.2 (Green)</span>
                  <p className="text-gray-400">Cannibalization risk - topics too similar, consider merging</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">0.3 - 0.5 (Blue)</span>
                  <p className="text-gray-400">Ideal for contextual linking - strongly related</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">0.5 - 0.7 (Yellow)</span>
                  <p className="text-gray-400">Good for supporting links - moderately related</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">0.7 - 0.85 (Orange)</span>
                  <p className="text-gray-400">Link sparingly - loosely related</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">0.85 - 1.0 (Red)</span>
                  <p className="text-gray-400">Avoid linking - topics too different</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
