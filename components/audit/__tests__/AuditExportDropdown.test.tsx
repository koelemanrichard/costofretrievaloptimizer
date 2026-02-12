import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditExportDropdown } from '../AuditExportDropdown';
import { AuditReportExporter } from '../../../services/audit/AuditReportExporter';
import type {
  UnifiedAuditReport,
  AuditPhaseResult,
  AuditFinding,
} from '../../../services/audit/types';

// ---- Test helpers ----

function makeFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: 'f-1',
    phase: 'strategicFoundation',
    ruleId: 'sf-001',
    severity: 'medium',
    title: 'Test finding',
    description: 'A test finding description.',
    whyItMatters: 'For testing purposes.',
    autoFixAvailable: false,
    estimatedImpact: 'medium',
    category: 'strategy',
    ...overrides,
  };
}

function makePhaseResult(overrides: Partial<AuditPhaseResult> = {}): AuditPhaseResult {
  return {
    phase: 'strategicFoundation',
    score: 72,
    weight: 10,
    passedChecks: 7,
    totalChecks: 10,
    findings: [makeFinding()],
    summary: 'Good foundation.',
    ...overrides,
  };
}

function makeReport(overrides: Partial<UnifiedAuditReport> = {}): UnifiedAuditReport {
  return {
    id: 'report-1',
    projectId: 'proj-1',
    auditType: 'internal',
    overallScore: 68,
    phaseResults: [makePhaseResult()],
    contentMergeSuggestions: [],
    missingKnowledgeGraphTopics: [],
    cannibalizationRisks: [],
    language: 'en',
    version: 1,
    createdAt: '2026-02-12T10:00:00Z',
    auditDurationMs: 4523,
    prerequisitesMet: {
      businessInfo: true,
      pillars: true,
      eavs: false,
    },
    ...overrides,
  };
}

// ---- Spies ----

let spyExportCsv: ReturnType<typeof vi.spyOn>;
let spyExportHtml: ReturnType<typeof vi.spyOn>;
let spyExportJson: ReturnType<typeof vi.spyOn>;

describe('AuditExportDropdown', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Spy on prototype methods
    spyExportCsv = vi
      .spyOn(AuditReportExporter.prototype, 'exportCsv')
      .mockReturnValue('csv-content');
    spyExportHtml = vi
      .spyOn(AuditReportExporter.prototype, 'exportHtml')
      .mockReturnValue('<html>html-content</html>');
    spyExportJson = vi
      .spyOn(AuditReportExporter.prototype, 'exportJson')
      .mockReturnValue('{"json":"content"}');

    // Mock URL.createObjectURL / revokeObjectURL
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    URL.createObjectURL = mockCreateObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL as unknown as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('renders the export button', () => {
    render(<AuditExportDropdown report={makeReport()} />);
    const button = screen.getByTestId('export-button');
    expect(button).toBeDefined();
    expect(button.textContent).toContain('Export');
  });

  it('does not show dropdown menu initially', () => {
    render(<AuditExportDropdown report={makeReport()} />);
    expect(screen.queryByTestId('export-menu')).toBeNull();
  });

  it('shows dropdown menu on button click', () => {
    render(<AuditExportDropdown report={makeReport()} />);
    fireEvent.click(screen.getByTestId('export-button'));
    expect(screen.getByTestId('export-menu')).toBeDefined();
  });

  it('has CSV, HTML, and JSON options', () => {
    render(<AuditExportDropdown report={makeReport()} />);
    fireEvent.click(screen.getByTestId('export-button'));

    expect(screen.getByTestId('export-option-csv')).toBeDefined();
    expect(screen.getByTestId('export-option-html')).toBeDefined();
    expect(screen.getByTestId('export-option-json')).toBeDefined();

    expect(screen.getByTestId('export-option-csv').textContent).toBe('CSV');
    expect(screen.getByTestId('export-option-html').textContent).toBe('HTML');
    expect(screen.getByTestId('export-option-json').textContent).toBe('JSON');
  });

  it('calls exporter.exportCsv on CSV option click', () => {
    render(<AuditExportDropdown report={makeReport()} />);
    fireEvent.click(screen.getByTestId('export-button'));
    fireEvent.click(screen.getByTestId('export-option-csv'));

    expect(spyExportCsv).toHaveBeenCalledOnce();
  });

  it('calls exporter.exportHtml on HTML option click', () => {
    render(<AuditExportDropdown report={makeReport()} />);
    fireEvent.click(screen.getByTestId('export-button'));
    fireEvent.click(screen.getByTestId('export-option-html'));

    expect(spyExportHtml).toHaveBeenCalledOnce();
  });

  it('calls exporter.exportJson on JSON option click', () => {
    render(<AuditExportDropdown report={makeReport()} />);
    fireEvent.click(screen.getByTestId('export-button'));
    fireEvent.click(screen.getByTestId('export-option-json'));

    expect(spyExportJson).toHaveBeenCalledOnce();
  });

  it('creates a downloadable blob on export', () => {
    render(<AuditExportDropdown report={makeReport()} />);
    fireEvent.click(screen.getByTestId('export-button'));
    fireEvent.click(screen.getByTestId('export-option-csv'));

    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    const blobArg = mockCreateObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('closes dropdown after selecting an option', () => {
    render(<AuditExportDropdown report={makeReport()} />);
    fireEvent.click(screen.getByTestId('export-button'));
    expect(screen.getByTestId('export-menu')).toBeDefined();

    fireEvent.click(screen.getByTestId('export-option-csv'));
    expect(screen.queryByTestId('export-menu')).toBeNull();
  });

  it('closes dropdown on outside click', () => {
    render(
      <div>
        <div data-testid="outside-area">Outside</div>
        <AuditExportDropdown report={makeReport()} />
      </div>
    );

    // Open dropdown
    fireEvent.click(screen.getByTestId('export-button'));
    expect(screen.getByTestId('export-menu')).toBeDefined();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside-area'));
    expect(screen.queryByTestId('export-menu')).toBeNull();
  });

  it('toggles dropdown closed when clicking button while open', () => {
    render(<AuditExportDropdown report={makeReport()} />);
    const button = screen.getByTestId('export-button');

    // Open
    fireEvent.click(button);
    expect(screen.getByTestId('export-menu')).toBeDefined();

    // Close by toggling
    fireEvent.click(button);
    expect(screen.queryByTestId('export-menu')).toBeNull();
  });
});
