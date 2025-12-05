import React from 'react';
import { TopicalMap } from '../../types';
import { Card } from '../ui/Card';

interface MergeMapSelectStepProps {
  availableMaps: TopicalMap[];
  selectedMapIds: string[];
  onMapsSelected: (mapIds: string[]) => void;
}

const MergeMapSelectStep: React.FC<MergeMapSelectStepProps> = ({
  availableMaps,
  selectedMapIds,
  onMapsSelected,
}) => {
  const toggleMap = (mapId: string) => {
    if (selectedMapIds.includes(mapId)) {
      onMapsSelected(selectedMapIds.filter(id => id !== mapId));
    } else {
      onMapsSelected([...selectedMapIds, mapId]);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-400">
        Select two or more topical maps to merge. The maps will be analyzed for similar topics
        and you&apos;ll be able to choose how to combine them.
      </p>

      {availableMaps.length < 2 ? (
        <div className="text-yellow-400 p-4 bg-yellow-900/20 rounded">
          You need at least 2 topical maps in this project to use the merge feature.
        </div>
      ) : (
        <div className="space-y-2">
          {availableMaps.map(map => {
            const isSelected = selectedMapIds.includes(map.id);
            const topicCount = map.topics?.length || 0;

            return (
              <Card
                key={map.id}
                className={`p-4 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'hover:bg-gray-700/50'
                }`}
                onClick={() => toggleMap(map.id)}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMap(map.id)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-white">{map.name}</p>
                    <p className="text-sm text-gray-400">
                      {topicCount} topics &bull; Created {new Date(map.created_at).toLocaleDateString()}
                    </p>
                    {map.pillars?.centralEntity && (
                      <p className="text-xs text-gray-500 mt-1">
                        CE: {map.pillars.centralEntity}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedMapIds.length > 0 && (
        <div className="mt-4 p-4 bg-gray-800 rounded">
          <p className="text-sm text-gray-400">
            Selected: <span className="text-white font-semibold">{selectedMapIds.length} maps</span>
          </p>
          {selectedMapIds.length < 2 && (
            <p className="text-sm text-yellow-400 mt-1">
              Select at least one more map to continue
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MergeMapSelectStep;
