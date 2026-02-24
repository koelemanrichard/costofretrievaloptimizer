import React from 'react';
import type { DialogueAnswer as DialogueAnswerType } from '../../types/dialogue';

// ──── Types ────

interface DialogueAnswerProps {
  answer: DialogueAnswerType;
}

// ──── Helpers ────

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026';
}

function buildExtractedSummary(answer: DialogueAnswerType): string {
  const parts: string[] = [];
  const data = answer.extractedData;

  if (data.newTriples && data.newTriples.length > 0) {
    parts.push(`+${data.newTriples.length} EAV${data.newTriples.length > 1 ? 's' : ''}`);
  }

  if (data.updatedFields) {
    const fields = Object.keys(data.updatedFields);
    if (fields.includes('centralEntity')) {
      parts.push('Updated CE');
    }
    if (fields.includes('sourceContext')) {
      parts.push('Updated SC');
    }
    if (fields.includes('centralSearchIntent')) {
      parts.push('Updated CSI');
    }
    // Count remaining updated fields not already listed
    const knownKeys = ['centralEntity', 'sourceContext', 'centralSearchIntent'];
    const otherCount = fields.filter((f) => !knownKeys.includes(f)).length;
    if (otherCount > 0) {
      parts.push(`+${otherCount} field${otherCount > 1 ? 's' : ''}`);
    }
  }

  if (data.topicDecisions) {
    const count = Object.keys(data.topicDecisions).length;
    if (count > 0) {
      parts.push(`${count} topic decision${count > 1 ? 's' : ''}`);
    }
  }

  return parts.join(' \u00B7 ');
}

// ──── Main Component ────

const DialogueAnswer: React.FC<DialogueAnswerProps> = ({ answer }) => {
  const summary = buildExtractedSummary(answer);

  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-emerald-900/10 border-l-2 border-emerald-600/40 rounded-r-lg">
      {/* Question text (truncated) */}
      <span className="text-sm text-gray-300 truncate min-w-0 flex-shrink">
        {truncate(answer.question, 60)}
      </span>

      {/* Arrow separator */}
      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>

      {/* Answer text (truncated) */}
      <span className="text-sm text-gray-200 truncate min-w-0 flex-1">
        {truncate(answer.answer, 80)}
      </span>

      {/* Extracted data summary */}
      {summary && (
        <span className="text-xs text-emerald-400 whitespace-nowrap flex-shrink-0">
          {summary}
        </span>
      )}

      {/* Checkmark icon */}
      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
};

export default DialogueAnswer;
