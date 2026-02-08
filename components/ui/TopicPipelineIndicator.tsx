import React from 'react';

interface TopicPipelineIndicatorProps {
  hasBrief: boolean;
  hasDraft: boolean;
  hasAudit: boolean;
  isPublished: boolean;
  size?: 'sm' | 'md';
}

const STAGES = [
  { key: 'brief', label: 'Brief', activeColor: 'bg-blue-500' },
  { key: 'draft', label: 'Draft', activeColor: 'bg-purple-500' },
  { key: 'audit', label: 'Audit', activeColor: 'bg-amber-500' },
  { key: 'published', label: 'Published', activeColor: 'bg-green-500' },
] as const;

export const TopicPipelineIndicator: React.FC<TopicPipelineIndicatorProps> = ({
  hasBrief,
  hasDraft,
  hasAudit,
  isPublished,
  size = 'sm',
}) => {
  const statuses = [hasBrief, hasDraft, hasAudit, isPublished];
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const lineWidth = size === 'sm' ? 'w-3' : 'w-4';

  const titleText = STAGES.map((stage, i) =>
    `${stage.label}: ${statuses[i] ? 'Done' : 'Pending'}`
  ).join(' | ');

  return (
    <div className="inline-flex items-center gap-0" title={titleText}>
      {STAGES.map((stage, i) => {
        const isDone = statuses[i];
        const nextDone = i < STAGES.length - 1 && statuses[i + 1];
        return (
          <React.Fragment key={stage.key}>
            <div className={`${dotSize} rounded-full ${isDone ? stage.activeColor : 'bg-gray-600'}`} />
            {i < STAGES.length - 1 && (
              <div className={`${lineWidth} h-0.5 ${isDone && nextDone ? stage.activeColor : 'bg-gray-600'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default TopicPipelineIndicator;
