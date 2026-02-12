import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { UnifiedAuditReport } from '../../services/audit/types';
import { AuditReportExporter } from '../../services/audit/AuditReportExporter';

export interface AuditExportDropdownProps {
  report: UnifiedAuditReport;
}

type ExportFormat = 'csv' | 'html' | 'json';

interface ExportOption {
  format: ExportFormat;
  label: string;
  mimeType: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { format: 'csv', label: 'CSV', mimeType: 'text/csv' },
  { format: 'html', label: 'HTML', mimeType: 'text/html' },
  { format: 'json', label: 'JSON', mimeType: 'application/json' },
];

function buildFileName(projectId: string, format: ExportFormat): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `audit-${projectId}-${date}.${format}`;
}

export const AuditExportDropdown: React.FC<AuditExportDropdownProps> = ({
  report,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exporterRef = useRef(new AuditReportExporter());

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExport = useCallback(
    (option: ExportOption) => {
      const exporter = exporterRef.current;

      let content: string;
      switch (option.format) {
        case 'csv':
          content = exporter.exportCsv(report);
          break;
        case 'html':
          content = exporter.exportHtml(report);
          break;
        case 'json':
          content = exporter.exportJson(report);
          break;
      }

      const blob = new Blob([content], { type: option.mimeType });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = buildFileName(report.projectId, option.format);
      document.body.appendChild(anchor);
      anchor.click();

      // Clean up
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setIsOpen(false);
    },
    [report]
  );

  return (
    <div className="relative inline-block" ref={dropdownRef} data-testid="export-dropdown">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-gray-200 text-sm font-medium hover:bg-gray-600 transition-colors border border-gray-600"
        data-testid="export-button"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Export
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-40 rounded-lg bg-gray-800 border border-gray-700 shadow-lg z-50 overflow-hidden"
          data-testid="export-menu"
        >
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option.format}
              type="button"
              onClick={() => handleExport(option)}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              data-testid={`export-option-${option.format}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditExportDropdown;
