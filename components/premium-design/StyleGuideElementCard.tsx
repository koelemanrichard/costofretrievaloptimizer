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

  // Detect if element has light text (needs dark background to avoid white-on-white)
  const textColor = element.computedCss.color || '';
  const isLightText = (() => {
    const match = textColor.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      const [, r, g, b] = match;
      return (parseInt(r) + parseInt(g) + parseInt(b)) / 3 > 180;
    }
    if (textColor.startsWith('#')) {
      const hex = textColor.replace('#', '');
      if (hex.length >= 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (r + g + b) / 3 > 180;
      }
    }
    return false;
  })();

  // Use ancestorBackground for correct preview bg, fall back to light-text heuristic
  const bgColor = (() => {
    if (element.suggestedBackground) return element.suggestedBackground;
    if (element.ancestorBackground?.backgroundColor) {
      const bg = element.ancestorBackground.backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
        return bg;
      }
    }
    return isLightText ? '#1a1a2e' : '#ffffff';
  })();

  // Strip <script> tags and inline event handlers to prevent "Blocked script execution" errors
  const sanitizedHtml = element.selfContainedHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

  const iframeContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body { margin: 16px; background: ${bgColor}; font-family: system-ui, sans-serif; }
  * { max-width: 100%; box-sizing: border-box; }
  img { max-height: 120px; }
</style></head><body>${sanitizedHtml}</body></html>`;

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
          {element.aiRepaired && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 shrink-0">
              AI Repaired
            </span>
          )}
        </div>
        <span className="text-[10px] text-zinc-600 shrink-0">{element.pageRegion}</span>
      </div>

      {/* Preview: Original vs Rendered comparison */}
      <div className="border-t border-zinc-700/50" style={{ minHeight: 100 }}>
        <div className="flex" style={{ minHeight: 100 }}>
          {element.elementScreenshotBase64 ? (
            <>
              {/* Left: Original screenshot */}
              <div className="w-1/2 overflow-hidden border-r border-zinc-700/50 flex flex-col" style={{ maxHeight: 220 }}>
                <span className="text-[9px] text-zinc-500 uppercase tracking-wider px-2 pt-1">Original</span>
                <div className="flex-1 flex items-center justify-center bg-white p-1">
                  <img
                    src={`data:image/jpeg;base64,${element.elementScreenshotBase64}`}
                    alt={element.label}
                    className="max-w-full max-h-[200px] object-contain"
                  />
                </div>
              </div>
              {/* Right: Rendered iframe */}
              <div className="w-1/2 overflow-hidden flex flex-col" style={{ maxHeight: 220 }}>
                <span className="text-[9px] text-zinc-500 uppercase tracking-wider px-2 pt-1">Rendered</span>
                <div className="flex-1">
                  <iframe
                    ref={iframeRef}
                    srcDoc={iframeContent}
                    title={element.label}
                    className="w-full border-0"
                    style={{ height: 200 }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </>
          ) : (
            /* No screenshot: full-width iframe render */
            <div className="w-full overflow-hidden">
              <iframe
                ref={iframeRef}
                srcDoc={iframeContent}
                title={element.label}
                className="w-full border-0"
                style={{ height: 100 }}
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>

        {/* Collapsible HTML + CSS code */}
        <details className="border-t border-zinc-700/30">
          <summary className="text-[10px] text-zinc-500 uppercase tracking-wider px-2 py-1.5 cursor-pointer hover:text-zinc-400">
            HTML + CSS
          </summary>
          <div className="p-2 space-y-2">
            <pre className="text-[10px] text-zinc-400 bg-zinc-900/50 rounded p-2 overflow-auto max-h-[100px] whitespace-pre-wrap break-all">
              <code>{element.selfContainedHtml.substring(0, 500)}</code>
            </pre>
            <pre className="text-[10px] text-zinc-400 bg-zinc-900/50 rounded p-2 overflow-auto max-h-[80px]">
              <code>{Object.entries(element.computedCss).map(([k, v]) =>
                `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`
              ).join('\n')}</code>
            </pre>
            {element.hoverCss && Object.keys(element.hoverCss).length > 0 && (
              <div>
                <span className="text-[10px] text-purple-400">:hover</span>
                <pre className="text-[10px] text-zinc-400 bg-zinc-900/50 rounded p-1 mt-0.5 overflow-auto max-h-[40px]">
                  <code>{Object.entries(element.hoverCss).map(([k, v]) =>
                    `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`
                  ).join('\n')}</code>
                </pre>
              </div>
            )}
          </div>
        </details>

        {/* Visual issues from AI validation */}
        {element.visualIssues && element.visualIssues.length > 0 && (
          <div className="px-2 py-1.5 border-t border-zinc-700/30">
            <div className="flex flex-wrap gap-1">
              {element.visualIssues.map((issue, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  {issue}
                </span>
              ))}
            </div>
          </div>
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
