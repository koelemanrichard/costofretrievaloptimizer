import React, { useState } from 'react';

// ──── Types ────

export interface IntakeSummaryCardProps {
  centralEntity?: string;
  services?: string[];
  websiteType?: string;
  language?: string;
  contentNetwork?: {
    totalPages: number;
    corePages: string[];
    authorPages: string[];
    orphanPages: string[];
    hubSpokeClarity: number;
    publishingFrequency: string;
  };
  technicalBaseline?: {
    cms: string | null;
    hasSchemaMarkup: boolean;
    hasCanonical: boolean;
  };
  conversionPath?: {
    primaryAction?: string;
    salesCycleLength?: string;
  };
}

// ──── Helpers ────

interface SectionDef {
  key: string;
  title: string;
  render: (props: IntakeSummaryCardProps) => React.ReactNode;
  hasData: (props: IntakeSummaryCardProps) => boolean;
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function DataRow({ label, value, missing }: { label: string; value?: string | null; missing?: boolean }) {
  const isMissing = missing ?? !value;
  return (
    <div className="flex items-start gap-2 text-sm py-0.5">
      {isMissing ? <WarningIcon /> : <CheckIcon />}
      <span className="text-gray-400">{label}:</span>
      <span className={isMissing ? 'text-amber-400 italic' : 'text-gray-200'}>
        {isMissing ? 'Not configured' : value}
      </span>
    </div>
  );
}

// ──── Section definitions ────

const SECTIONS: SectionDef[] = [
  {
    key: 'entity',
    title: '1. Entity & Business Discovery',
    hasData: (p) => !!(p.centralEntity || p.services?.length || p.language),
    render: (p) => (
      <div className="space-y-1">
        <DataRow label="Central Entity" value={p.centralEntity} />
        <DataRow
          label="Services"
          value={p.services?.length ? p.services.join(', ') : undefined}
          missing={!p.services?.length}
        />
        <DataRow label="Language" value={p.language} />
      </div>
    ),
  },
  {
    key: 'source-context',
    title: '2. Source Context & Monetization',
    hasData: (p) => !!(p.websiteType || p.conversionPath?.primaryAction),
    render: (p) => (
      <div className="space-y-1">
        <DataRow label="Website Type" value={p.websiteType} />
        <DataRow label="Conversion Goal" value={p.conversionPath?.primaryAction} />
        <DataRow label="Sales Cycle" value={p.conversionPath?.salesCycleLength} />
      </div>
    ),
  },
  {
    key: 'csi',
    title: '3. Central Search Intent',
    hasData: (p) => !!p.centralEntity,
    render: (p) => (
      <div className="space-y-1">
        <DataRow
          label="CSI Predicates"
          value={p.centralEntity ? 'Derived from pillars' : undefined}
          missing={!p.centralEntity}
        />
      </div>
    ),
  },
  {
    key: 'content-network',
    title: '4. Content Network Assessment',
    hasData: (p) => !!p.contentNetwork,
    render: (p) => {
      const cn = p.contentNetwork;
      if (!cn) {
        return <DataRow label="Content Network" value={undefined} />;
      }
      return (
        <div className="space-y-1">
          <DataRow label="Total Pages" value={String(cn.totalPages)} />
          <DataRow label="Core Pages" value={String(cn.corePages.length)} />
          <DataRow label="Author Pages" value={String(cn.authorPages.length)} />
          <DataRow
            label="Orphan Pages"
            value={cn.orphanPages.length > 0 ? `${cn.orphanPages.length} orphans` : '0'}
            missing={cn.orphanPages.length > 0}
          />
          <DataRow label="Hub-Spoke Clarity" value={`${cn.hubSpokeClarity}%`} />
          <DataRow label="Publishing Frequency" value={cn.publishingFrequency} />
        </div>
      );
    },
  },
  {
    key: 'technical',
    title: '5. Technical Baseline',
    hasData: (p) => !!p.technicalBaseline,
    render: (p) => {
      const tb = p.technicalBaseline;
      if (!tb) {
        return <DataRow label="Technical Baseline" value={undefined} />;
      }
      return (
        <div className="space-y-1">
          <DataRow label="CMS" value={tb.cms ?? undefined} missing={!tb.cms} />
          <DataRow
            label="Schema Markup"
            value={tb.hasSchemaMarkup ? 'Detected' : 'Missing'}
            missing={!tb.hasSchemaMarkup}
          />
          <DataRow
            label="Canonical Tags"
            value={tb.hasCanonical ? 'Present' : 'Missing'}
            missing={!tb.hasCanonical}
          />
        </div>
      );
    },
  },
];

// ──── Component ────

const IntakeSummaryCard: React.FC<IntakeSummaryCardProps> = (props) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    SECTIONS.forEach((s) => { initial[s.key] = true; });
    return initial;
  });

  const toggle = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg" data-testid="intake-summary-card">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-200">Intake Summary</h3>
      </div>

      <div className="divide-y divide-gray-700/50">
        {SECTIONS.map((section) => {
          const isOpen = openSections[section.key];
          const filled = section.hasData(props);
          return (
            <div key={section.key}>
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-700/30 transition-colors"
                onClick={() => toggle(section.key)}
                aria-expanded={isOpen}
                data-testid={`section-toggle-${section.key}`}
              >
                <div className="flex items-center gap-2">
                  {filled ? <CheckIcon /> : <WarningIcon />}
                  <span className="text-sm font-medium text-gray-300">{section.title}</span>
                </div>
                <ChevronIcon open={!!isOpen} />
              </button>

              {isOpen && (
                <div className="px-4 pb-3 pl-10" data-testid={`section-content-${section.key}`}>
                  {section.render(props)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntakeSummaryCard;
