// =============================================================================
// StyleGuideElementCard — Per-element preview card with approval controls
// =============================================================================

import React, { useState, useRef, useEffect } from 'react';
import type { StyleGuideElement } from '../../types/styleGuide';

interface StyleGuideElementCardProps {
  element: StyleGuideElement;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onComment: (id: string, comment: string) => void;
  onRefine?: (id: string) => void;
  onReferenceImage?: (id: string, base64: string) => void;
  onReferenceUrl?: (id: string, url: string) => void;
}

export const StyleGuideElementCard: React.FC<StyleGuideElementCardProps> = ({
  element,
  onApprove,
  onReject,
  onComment,
  onRefine,
  onReferenceImage,
  onReferenceUrl,
}) => {
  const [showComment, setShowComment] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [commentText, setCommentText] = useState(element.userComment || '');
  const [refUrl, setRefUrl] = useState(element.referenceUrl || '');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isApproved = element.approvalStatus === 'approved';
  const isRejected = element.approvalStatus === 'rejected';

  // Build iframe content with white background
  const iframeContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body { margin: 16px; background: #fff; font-family: system-ui, sans-serif; }
  * { max-width: 100%; box-sizing: border-box; }
  img { max-height: 120px; }
</style></head><body>${element.selfContainedHtml}</body></html>`;

  // Auto-resize iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          const height = Math.min(200, Math.max(40, doc.body.scrollHeight + 20));
          iframe.style.height = `${height}px`;
        }
      } catch { /* cross-origin fallback */ }
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [element.selfContainedHtml]);

  const handleCommentSave = () => {
    onComment(element.id, commentText);
    setShowComment(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onReferenceImage) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      onReferenceImage(element.id, base64);
    };
    reader.readAsDataURL(file);
  };

  const borderColor = isApproved
    ? 'border-green-500/40'
    : isRejected
      ? 'border-red-500/40'
      : 'border-zinc-700';

  return (
    <div className={`rounded-lg border ${borderColor} bg-zinc-800/50 overflow-hidden transition-colors`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 shrink-0">
            {element.subcategory}
          </span>
          <span className="text-xs text-zinc-300 truncate" title={element.label}>
            {element.label}
          </span>
          {element.qualityScore !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
              element.qualityScore >= 70 ? 'bg-green-500/20 text-green-400' :
              element.qualityScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {element.qualityScore}%
            </span>
          )}
          {element.aiGenerated && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 shrink-0">
              AI Generated
            </span>
          )}
        </div>
        <span className="text-[10px] text-zinc-600 shrink-0">{element.pageRegion}</span>
      </div>

      {/* Preview: element screenshot (if available) or iframe */}
      <div className="bg-white overflow-hidden" style={{ maxHeight: 200 }}>
        {element.elementScreenshotBase64 ? (
          <img
            src={`data:image/jpeg;base64,${element.elementScreenshotBase64}`}
            alt={element.label}
            className="w-full max-h-[200px] object-contain bg-white"
          />
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={iframeContent}
            title={element.label}
            className="w-full border-0"
            style={{ height: 80 }}
            sandbox="allow-same-origin"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-zinc-700/50">
        <button
          onClick={() => onApprove(element.id)}
          className={`px-2 py-1 text-[11px] rounded transition-colors ${
            isApproved
              ? 'bg-green-600/20 text-green-400 border border-green-500/30'
              : 'bg-zinc-700/50 text-zinc-400 hover:bg-green-900/30 hover:text-green-400'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => onReject(element.id)}
          className={`px-2 py-1 text-[11px] rounded transition-colors ${
            isRejected
              ? 'bg-red-600/20 text-red-400 border border-red-500/30'
              : 'bg-zinc-700/50 text-zinc-400 hover:bg-red-900/30 hover:text-red-400'
          }`}
        >
          Reject
        </button>
        <button
          onClick={() => setShowComment(!showComment)}
          className={`px-2 py-1 text-[11px] rounded transition-colors ${
            element.userComment
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'bg-zinc-700/50 text-zinc-400 hover:text-blue-400'
          }`}
        >
          Comment
        </button>
        <button
          onClick={() => setShowReference(!showReference)}
          className="px-2 py-1 text-[11px] rounded bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Ref
        </button>
        {onRefine && (element.userComment || element.referenceImageBase64 || element.referenceUrl) && (
          <button
            onClick={() => onRefine(element.id)}
            className="px-2 py-1 text-[11px] rounded bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30 transition-colors ml-auto"
          >
            Refine with AI
          </button>
        )}
      </div>

      {/* Comment textarea */}
      {showComment && (
        <div className="px-3 py-2 border-t border-zinc-700/50 space-y-2">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="E.g., 'Make this button rounder' or 'Use a bolder font'"
            className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-blue-500"
            rows={2}
          />
          <div className="flex justify-end">
            <button
              onClick={handleCommentSave}
              className="px-2 py-1 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              Save Comment
            </button>
          </div>
        </div>
      )}

      {/* Reference section */}
      {showReference && (
        <div className="px-3 py-2 border-t border-zinc-700/50 space-y-2">
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Reference Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-zinc-700 file:text-zinc-300 hover:file:bg-zinc-600"
            />
            {element.referenceImageBase64 && (
              <p className="text-[10px] text-green-500 mt-1">Reference image attached</p>
            )}
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Reference URL</label>
            <input
              type="url"
              value={refUrl}
              onChange={(e) => setRefUrl(e.target.value)}
              onBlur={() => onReferenceUrl?.(element.id, refUrl)}
              placeholder="https://example.com/style-reference"
              className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleGuideElementCard;
