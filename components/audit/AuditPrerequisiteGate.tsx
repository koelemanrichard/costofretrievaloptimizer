import React from 'react';

export interface AuditPrerequisiteGateProps {
  prerequisites: {
    businessInfo: boolean;
    pillars: boolean;
    eavs: boolean;
  };
  isExternalUrl?: boolean;
  onProceedAnyway?: () => void;
  onNavigateToSetup?: (step: 'businessInfo' | 'pillars' | 'eavs') => void;
}

interface ChecklistItem {
  key: 'businessInfo' | 'pillars' | 'eavs';
  label: string;
  met: boolean;
}

export const AuditPrerequisiteGate: React.FC<AuditPrerequisiteGateProps> = ({
  prerequisites,
  isExternalUrl = false,
  onProceedAnyway,
  onNavigateToSetup,
}) => {
  const allMet =
    prerequisites.businessInfo && prerequisites.pillars && prerequisites.eavs;

  if (allMet) {
    return null;
  }

  const items: ChecklistItem[] = [
    { key: 'businessInfo', label: 'Business Information', met: prerequisites.businessInfo },
    { key: 'pillars', label: 'SEO Pillars', met: prerequisites.pillars },
    { key: 'eavs', label: 'EAV Triples (Semantic Triples)', met: prerequisites.eavs },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="prerequisite-gate-overlay"
    >
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in">
        {/* Header */}
        <h2 className="text-xl font-semibold text-orange-400 mb-2">
          Setup Required
        </h2>
        <p className="text-sm text-gray-400 mb-5">
          Complete the following steps to get the most accurate audit results.
        </p>

        {/* Checklist */}
        <ul className="space-y-3 mb-6" data-testid="prerequisite-checklist">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3">
              {/* Status icon */}
              {item.met ? (
                <svg
                  className="w-5 h-5 text-green-500 flex-shrink-0"
                  data-testid={`check-icon-${item.key}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  data-testid={`x-icon-${item.key}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}

              {/* Label */}
              <span
                className={`flex-1 text-sm ${item.met ? 'text-gray-300' : 'text-gray-200'}`}
              >
                {item.label}
              </span>

              {/* Set Up button for unmet prerequisites */}
              {!item.met && (
                <button
                  type="button"
                  onClick={() => onNavigateToSetup?.(item.key)}
                  className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
                  data-testid={`setup-btn-${item.key}`}
                >
                  Set Up
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* Bottom: Proceed Anyway for external URLs */}
        {isExternalUrl && (
          <div className="border-t border-gray-700 pt-4" data-testid="proceed-anyway-section">
            <button
              type="button"
              onClick={onProceedAnyway}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition-colors"
              data-testid="proceed-anyway-btn"
            >
              Proceed Anyway
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              External URLs can be audited without project setup, but results will be less specific.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditPrerequisiteGate;
