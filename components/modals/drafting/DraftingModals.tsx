// components/modals/drafting/DraftingModals.tsx
// Auxiliary modals for DraftingModal: Re-run Passes, Version History

import React from 'react';
import { Button } from '../../ui/Button';
import { SmartLoader } from '../../ui/FunLoaders';
import type { DraftVersion, DatabaseJobInfo } from './DraftingContext';

// ============================================================================
// Re-run Passes Modal
// ============================================================================

interface RerunPassesModalProps {
  isOpen: boolean;
  databaseJobInfo: DatabaseJobInfo;
  selectedPasses: number[];
  setSelectedPasses: (passes: number[]) => void;
  isRerunning: boolean;
  onRerun: () => void;
  onClose: () => void;
}

const PASS_OPTIONS = [
  { num: 2, key: 'pass_2_headers', label: 'Pass 2: Header Optimization', desc: 'Optimize heading hierarchy' },
  { num: 3, key: 'pass_3_lists', label: 'Pass 3: Lists & Tables', desc: 'Convert content to structured data' },
  { num: 4, key: 'pass_4_discourse', label: 'Pass 4: Discourse Integration', desc: 'Improve transitions' },
  { num: 5, key: 'pass_5_microsemantics', label: 'Pass 5: Micro Semantics', desc: 'Linguistic optimization' },
  { num: 6, key: 'pass_6_visuals', label: 'Pass 6: Visual Semantics', desc: 'Add image placeholders' },
  { num: 7, key: 'pass_7_intro', label: 'Pass 7: Introduction Synthesis', desc: 'Rewrite introduction' },
  { num: 8, key: 'pass_8_polish', label: 'Pass 8: Final Polish', desc: 'Publication-ready refinement' },
  { num: 9, key: 'pass_9_audit', label: 'Pass 9: Final Audit', desc: 'Algorithmic content audit' },
  { num: 10, key: 'pass_10_schema', label: 'Pass 10: Schema Generation', desc: 'JSON-LD structured data' },
];

export const RerunPassesModal: React.FC<RerunPassesModalProps> = ({
  isOpen,
  databaseJobInfo,
  selectedPasses,
  setSelectedPasses,
  isRerunning,
  onRerun,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-2">Re-run Optimization Passes</h2>
        <p className="text-sm text-gray-400 mb-4">Select which passes to re-run. All selected passes and any passes after the lowest selected will be re-processed.</p>
        <div className="space-y-2 mb-6">
          {PASS_OPTIONS.map(({ num, key, label, desc }) => {
            const status = databaseJobInfo.passesStatus?.[key] || 'pending';
            const isSelected = selectedPasses.includes(num);
            return (
              <label key={num} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-teal-900/40 border border-teal-600' : 'bg-gray-700/40 border border-gray-600 hover:bg-gray-700/60'}`}>
                <input type="checkbox" checked={isSelected} onChange={(e) => { if (e.target.checked) setSelectedPasses([...selectedPasses, num].sort((a, b) => a - b)); else setSelectedPasses(selectedPasses.filter(p => p !== num)); }} className="mt-1 w-4 h-4 rounded border-gray-500 text-teal-600 focus:ring-teal-500 bg-gray-700" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isSelected ? 'text-teal-200' : 'text-gray-200'}`}>{label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${status === 'completed' ? 'bg-green-900/50 text-green-300' : status === 'in_progress' ? 'bg-amber-900/50 text-amber-300' : 'bg-gray-800/50 text-gray-500'}`}>{status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </label>
            );
          })}
        </div>
        {selectedPasses.length > 0 && (
          <div className="mb-4 p-3 bg-teal-900/30 border border-teal-700 rounded text-sm text-teal-200">
            Will re-run: Pass {Math.min(...selectedPasses)} through Pass 9<br />
            <span className="text-xs text-teal-300/70">Current editor content will be used as the starting point.</span>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { onClose(); setSelectedPasses([]); }}>Cancel</Button>
          <Button onClick={onRerun} disabled={selectedPasses.length === 0 || isRerunning} className="bg-teal-600 hover:bg-teal-700">
            {isRerunning ? <SmartLoader context="generating" size="sm" showText={false} /> : `Re-run ${selectedPasses.length} Pass${selectedPasses.length !== 1 ? 'es' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Version History Modal
// ============================================================================

interface VersionHistoryModalProps {
  isOpen: boolean;
  draftContent: string;
  draftHistory: DraftVersion[];
  isRestoringVersion: boolean;
  onRestoreVersion: (version: DraftVersion) => void;
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  draftContent,
  draftHistory,
  isRestoringVersion,
  onRestoreVersion,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Draft Version History</h2>
            <p className="text-sm text-gray-400 mt-1">Current draft and {draftHistory.length} previous version{draftHistory.length !== 1 ? 's' : ''}.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="overflow-y-auto flex-grow space-y-3">
          <div className="bg-teal-900/30 rounded-lg p-4 border-2 border-teal-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-bold text-teal-400">Current Draft</span>
              <span className="text-xs text-teal-300 px-2 py-0.5 bg-teal-800 rounded">{(draftContent?.length || 0).toLocaleString()} chars</span>
              <span className="text-xs text-teal-400 px-2 py-0.5 bg-teal-900 rounded">Active in Editor</span>
            </div>
            <div className="text-sm text-gray-300 bg-gray-800 rounded p-2 max-h-24 overflow-hidden relative">
              <div className="line-clamp-3">{(draftContent || '').substring(0, 500)}...</div>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-800 to-transparent" />
            </div>
          </div>
          {draftHistory.length > 0 && (
            <div className="flex items-center gap-2 py-2"><div className="flex-grow h-px bg-gray-600" /><span className="text-xs text-gray-500 uppercase tracking-wider">Previous Versions</span><div className="flex-grow h-px bg-gray-600" /></div>
          )}
          {draftHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No previous versions yet. Version history is created automatically when you save changes.</p>
          ) : draftHistory.map((version) => {
            const savedDate = new Date(version.saved_at);
            const diffMs = Date.now() - savedDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            const relativeTime = diffDays > 0 ? `${diffDays}d ago` : diffHours > 0 ? `${diffHours}h ago` : diffMins > 0 ? `${diffMins}m ago` : 'just now';
            const sizeDiff = version.char_count - (draftContent?.length || 0);
            const sizeDiffText = sizeDiff > 0 ? `+${sizeDiff.toLocaleString()}` : sizeDiff.toLocaleString();
            return (
              <div key={`${version.version}-${version.saved_at}`} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-teal-500 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white">v{version.version}</span>
                    <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-600 rounded">{version.char_count.toLocaleString()} chars</span>
                    {sizeDiff !== 0 && <span className={`text-xs px-2 py-0.5 rounded ${sizeDiff > 0 ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'}`}>{sizeDiffText} vs current</span>}
                  </div>
                  <div className="text-right"><span className="text-xs text-gray-400 block">{relativeTime}</span><span className="text-xs text-gray-500">{savedDate.toLocaleString()}</span></div>
                </div>
                <div className="text-sm text-gray-300 bg-gray-800 rounded p-2 mb-3 max-h-24 overflow-hidden relative">
                  <div className="line-clamp-3">{version.content.substring(0, 500)}...</div>
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-800 to-transparent" />
                </div>
                <Button onClick={() => onRestoreVersion(version)} disabled={isRestoringVersion} className="w-full !py-2 text-sm bg-teal-600 hover:bg-teal-700">
                  {isRestoringVersion ? <SmartLoader context="loading" size="sm" showText={false} /> : 'Restore This Version'}
                </Button>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
          <p className="text-xs text-gray-500">Tip: Previous versions show content BEFORE each save.</p>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default { RerunPassesModal, VersionHistoryModal };
