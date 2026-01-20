// components/contextualEditor/ContextMenu.tsx
/**
 * Floating context menu for quick actions on selected text.
 */

import React, { useEffect, useRef, useState } from 'react';
import { TextSelection, QuickAction, ContextAnalysis } from '../../types/contextualEditor';

interface ContextMenuProps {
  selection: TextSelection;
  analysis: ContextAnalysis | null;
  onQuickAction: (action: QuickAction) => void;
  onMoreOptions: () => void;
  onGenerateImage: () => void;
  onClose: () => void;
  isProcessing: boolean;
}

const QUICK_ACTIONS: { action: QuickAction; icon: string; label: string; tooltip: string }[] = [
  { action: 'fix_accuracy', icon: '✓', label: 'Fix', tooltip: 'Fix accuracy' },
  { action: 'fix_grammar', icon: 'Aa', label: 'Grammar', tooltip: 'Fix grammar' },
  { action: 'improve_flow', icon: '↝', label: 'Flow', tooltip: 'Improve flow' },
  { action: 'simplify', icon: '−', label: 'Simplify', tooltip: 'Simplify' },
  { action: 'seo_optimize', icon: '◎', label: 'SEO', tooltip: 'SEO optimize' },
];

export const ContextMenu: React.FC<ContextMenuProps> = ({
  selection,
  analysis,
  onQuickAction,
  onMoreOptions,
  onGenerateImage,
  onClose,
  isProcessing,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!selection?.rect) return;

    const rect = selection.rect;
    const menuHeight = 48;
    const padding = 8;

    let top = rect.top - menuHeight - padding;
    if (top < 10) {
      top = rect.bottom + padding;
    }

    let left = rect.left + (rect.width / 2);

    const viewportWidth = window.innerWidth;
    const menuWidth = 400;
    if (left - menuWidth / 2 < 10) {
      left = menuWidth / 2 + 10;
    } else if (left + menuWidth / 2 > viewportWidth - 10) {
      left = viewportWidth - menuWidth / 2 - 10;
    }

    setPosition({ top, left });
  }, [selection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const hasIssues = analysis && analysis.issues.length > 0;
  const topSuggestion = analysis?.suggestions[0];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-1 flex items-center gap-1"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {QUICK_ACTIONS.map(({ action, icon, label, tooltip }) => (
        <button
          key={action}
          onClick={() => onQuickAction(action)}
          disabled={isProcessing}
          className="px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
          title={tooltip}
        >
          <span className="mr-1">{icon}</span>
          {label}
        </button>
      ))}

      <div className="w-px h-6 bg-slate-600 mx-1" />

      <button
        onClick={onGenerateImage}
        disabled={isProcessing}
        className="px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
        title="Generate image from context"
      >
        🖼️ Image
      </button>

      <button
        onClick={onMoreOptions}
        disabled={isProcessing}
        className="px-2 py-1.5 text-xs font-medium text-blue-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
        title="More options"
      >
        More ▾
      </button>

      {hasIssues && topSuggestion && (
        <div className="ml-1 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-300">
          💡 {topSuggestion.action}
        </div>
      )}

      {isProcessing && (
        <div className="ml-2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
};
