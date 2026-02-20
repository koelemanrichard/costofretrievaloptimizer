import React, { useState } from 'react';
import { PipelineStep, GateDefinition, StepApproval } from '../../state/slices/pipelineSlice';
import StepSummaryCard from './StepSummaryCard';

// ──── Types ────

interface ApprovalGateProps {
  step: PipelineStep;
  gate: GateDefinition;
  approval?: StepApproval;
  autoApprove: boolean;
  summaryMetrics?: Array<{
    label: string;
    value: string | number;
    color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
  }>;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRevise: () => void;
  onToggleAutoApprove: (value: boolean) => void;
  children?: React.ReactNode;
}

// ──── Helpers ────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// ──── Sub-components ────

function CheckboxIcon({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AutoApproveToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="text-xs text-gray-400">Auto-approve</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
          checked ? 'bg-blue-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

// ──── Pending State ────

function PendingGate({
  gate,
  summaryMetrics,
  autoApprove,
  onApprove,
  onReject,
  onToggleAutoApprove,
  children,
}: Omit<ApprovalGateProps, 'step' | 'approval' | 'onRevise'>) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleSubmitRejection = () => {
    const trimmed = rejectionReason.trim();
    if (trimmed) {
      onReject(trimmed);
      setShowRejectInput(false);
      setRejectionReason('');
    }
  };

  return (
    <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-6">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="bg-amber-600 text-xs font-bold text-white px-2 py-0.5 rounded">
            REVIEW GATE
          </span>
          <span className="text-sm text-gray-300">
            Review required before proceeding to next step
          </span>
        </div>
        <AutoApproveToggle checked={autoApprove} onChange={onToggleAutoApprove} />
      </div>

      {/* Reviewer */}
      <p className="text-sm text-gray-400 mb-4">
        Reviewer: {gate.reviewer}
      </p>

      {/* Review items checklist */}
      {gate.reviewItems.length > 0 && (
        <div className="space-y-2 mb-4">
          {gate.reviewItems.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckboxIcon checked={false} />
              <span className="text-sm text-gray-300">{item}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary metrics card */}
      {summaryMetrics && summaryMetrics.length > 0 && (
        <div className="mb-4">
          <StepSummaryCard title="Step Output Summary" metrics={summaryMetrics} />
        </div>
      )}

      {/* Additional review content */}
      {children && <div className="mb-4">{children}</div>}

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-6">
        <button
          type="button"
          onClick={onApprove}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          Approve &amp; Continue
        </button>
        {!showRejectInput && (
          <button
            type="button"
            onClick={() => setShowRejectInput(true)}
            className="border border-gray-600 text-gray-300 hover:bg-gray-800 px-4 py-2 rounded-md transition-colors"
          >
            Request Changes
          </button>
        )}
      </div>

      {/* Rejection input */}
      {showRejectInput && (
        <div className="mt-4 space-y-3">
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Describe what needs to be changed..."
            rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmitRejection}
              disabled={!rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Submit Rejection
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRejectInput(false);
                setRejectionReason('');
              }}
              className="text-sm text-gray-400 hover:text-gray-300 px-3 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──── Approved State ────

function ApprovedGate({ approval, onProceed }: { approval: StepApproval; onProceed: () => void }) {
  const approvedText = [
    'Approved',
    approval.approvedBy ? ` by ${approval.approvedBy}` : '',
    approval.approvedAt ? ` \u2014 ${formatDate(approval.approvedAt)}` : '',
  ].join('');

  return (
    <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-green-600 text-xs font-bold text-white px-2 py-0.5 rounded">
          APPROVED
        </span>
        <span className="text-sm text-gray-300">{approvedText}</span>
      </div>
      <button
        type="button"
        onClick={onProceed}
        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
      >
        Proceed to Next Step
      </button>
    </div>
  );
}

// ──── Rejected State ────

function RejectedGate({ approval, onRevise }: { approval: StepApproval; onRevise: () => void }) {
  return (
    <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-red-600 text-xs font-bold text-white px-2 py-0.5 rounded">
          CHANGES REQUESTED
        </span>
      </div>

      {approval.rejectionReason && (
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-1">Reason:</p>
          <p className="text-sm text-gray-200 bg-gray-900/50 border border-gray-700 rounded-md px-3 py-2">
            {approval.rejectionReason}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onRevise}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
      >
        Revise &amp; Resubmit
      </button>
    </div>
  );
}

// ──── Main Component ────

const ApprovalGate: React.FC<ApprovalGateProps> = ({
  step,
  gate,
  approval,
  autoApprove,
  summaryMetrics,
  onApprove,
  onReject,
  onRevise,
  onToggleAutoApprove,
  children,
}) => {
  // Determine gate state
  const status = approval?.status ?? 'pending';

  if (status === 'approved' && approval) {
    return <ApprovedGate approval={approval} onProceed={onApprove} />;
  }

  if (status === 'rejected' && approval) {
    return <RejectedGate approval={approval} onRevise={onRevise} />;
  }

  // Default: pending
  return (
    <PendingGate
      gate={gate}
      summaryMetrics={summaryMetrics}
      autoApprove={autoApprove}
      onApprove={onApprove}
      onReject={onReject}
      onToggleAutoApprove={onToggleAutoApprove}
    >
      {children}
    </PendingGate>
  );
};

export default ApprovalGate;
