import React from 'react';

export interface AuditScoreRingProps {
  score: number;          // 0-100
  previousScore?: number; // For showing delta
  size?: number;          // Default 120px
  strokeWidth?: number;   // Default 8
  label?: string;         // Optional label below score
}

const getScoreColor = (score: number) => {
  if (score >= 80) return { stroke: '#22c55e', text: 'text-green-500' };
  if (score >= 60) return { stroke: '#eab308', text: 'text-yellow-500' };
  if (score >= 40) return { stroke: '#f97316', text: 'text-orange-500' };
  return { stroke: '#ef4444', text: 'text-red-500' };
};

export const AuditScoreRing: React.FC<AuditScoreRingProps> = ({
  score,
  previousScore,
  size = 120,
  strokeWidth = 8,
  label,
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;
  const { stroke, text: textColor } = getScoreColor(clampedScore);

  const delta = previousScore !== undefined ? clampedScore - previousScore : null;

  return (
    <div
      className="flex flex-col items-center gap-1"
      role="figure"
      aria-label={`Audit score: ${Math.round(clampedScore)} out of 100${label ? `, ${label}` : ''}`}
    >
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} data-testid="audit-score-ring-svg">
          {/* Background ring */}
          <circle
            className="text-gray-700"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress ring */}
          <circle
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${textColor}`} data-testid="audit-score-value">
            {Math.round(clampedScore)}
          </span>
          {delta !== null && (
            <span
              className={`text-xs font-medium ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}
              data-testid="audit-score-delta"
            >
              {delta >= 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
      </div>
      {label && (
        <span className="text-sm text-gray-400" data-testid="audit-score-label">
          {label}
        </span>
      )}
    </div>
  );
};

export default AuditScoreRing;
