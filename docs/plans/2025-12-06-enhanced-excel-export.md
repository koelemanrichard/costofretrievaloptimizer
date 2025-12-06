# Enhanced Excel Export Implementation Plan

## Overview

Create a professionally formatted Excel export with visual hierarchies, color coding, and RAG status indicators. The export will be presentation-ready for internal reviews, client presentations, and project handoffs.

## Current State

- **Library**: `xlsx` (SheetJS) - limited styling in open-source version
- **Location**: `utils/exportUtils.ts`
- **Format**: Basic data export with 8 tabs, no formatting
- **ZIP Export**: Already includes articles/, briefs/, and metadata

## Target State

- **Library**: `exceljs` (full styling support)
- **New Files**:
  - `utils/enhancedExportUtils.ts` - New styled export generator
  - `components/ExportSettingsModal.tsx` - Export configuration UI
- **Format**: Multi-sheet workbook with professional formatting

---

## Task 1: Install ExcelJS Library

**File**: `package.json`

**Actions**:
```bash
npm install exceljs
```

**Verification**: Import works in new utility file

---

## Task 2: Create Export Settings Modal Component

**File**: `components/ExportSettingsModal.tsx` (new)

**Purpose**: Let users configure export options before generating

**Interface**:
```typescript
interface ExportSettings {
  // Content inclusion
  includeBriefJsonFiles: boolean;      // Full brief data as JSON
  includeArticleDrafts: boolean;       // Markdown draft files
  includeSchemas: boolean;             // Generated JSON-LD schemas
  includeAuditResults: boolean;        // Audit scores and details

  // Display options
  compactBriefsView: boolean;          // Metadata only vs full
  includeEavMatrix: boolean;           // Semantic triples matrix

  // Export type
  exportFormat: 'xlsx' | 'zip';        // Excel only or full ZIP
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────┐
│ Export Settings                          X  │
├─────────────────────────────────────────────┤
│                                             │
│ CONTENT TO INCLUDE                          │
│ ☑ Include full brief JSON files             │
│ ☑ Include article drafts (Markdown)         │
│ ☐ Include generated schemas                 │
│ ☐ Include audit results                     │
│                                             │
│ DISPLAY OPTIONS                             │
│ ☐ Compact briefs view (metadata only)       │
│ ☑ Include EAV/Semantic triples matrix       │
│                                             │
│ EXPORT FORMAT                               │
│ ○ Excel Workbook (.xlsx)                    │
│ ● Full Package (.zip)                       │
│                                             │
│         [Cancel]  [Export]                  │
└─────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// components/ExportSettingsModal.tsx
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface ExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
  hasSchemas: boolean;
  hasAuditResults: boolean;
}

export const ExportSettingsModal: React.FC<ExportSettingsModalProps> = ({
  isOpen,
  onClose,
  onExport,
  hasSchemas,
  hasAuditResults
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    includeBriefJsonFiles: true,
    includeArticleDrafts: true,
    includeSchemas: false,
    includeAuditResults: false,
    compactBriefsView: false,
    includeEavMatrix: true,
    exportFormat: 'zip'
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <header className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Export Settings</h2>
        </header>

        <div className="p-4 space-y-6">
          {/* Content to Include */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              CONTENT TO INCLUDE
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.includeBriefJsonFiles}
                  onChange={(e) => setSettings(s => ({ ...s, includeBriefJsonFiles: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                Include full brief JSON files
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.includeArticleDrafts}
                  onChange={(e) => setSettings(s => ({ ...s, includeArticleDrafts: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                Include article drafts (Markdown)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.includeSchemas}
                  onChange={(e) => setSettings(s => ({ ...s, includeSchemas: e.target.checked }))}
                  disabled={!hasSchemas}
                  className="rounded border-gray-600 disabled:opacity-50"
                />
                Include generated schemas
                {!hasSchemas && <span className="text-gray-600">(none available)</span>}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.includeAuditResults}
                  onChange={(e) => setSettings(s => ({ ...s, includeAuditResults: e.target.checked }))}
                  disabled={!hasAuditResults}
                  className="rounded border-gray-600 disabled:opacity-50"
                />
                Include audit results
                {!hasAuditResults && <span className="text-gray-600">(none available)</span>}
              </label>
            </div>
          </div>

          {/* Display Options */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              DISPLAY OPTIONS
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.compactBriefsView}
                  onChange={(e) => setSettings(s => ({ ...s, compactBriefsView: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                Compact briefs view (metadata only)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.includeEavMatrix}
                  onChange={(e) => setSettings(s => ({ ...s, includeEavMatrix: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                Include EAV/Semantic triples matrix
              </label>
            </div>
          </div>

          {/* Export Format */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              EXPORT FORMAT
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="radio"
                  name="format"
                  checked={settings.exportFormat === 'xlsx'}
                  onChange={() => setSettings(s => ({ ...s, exportFormat: 'xlsx' }))}
                  className="border-gray-600"
                />
                Excel Workbook (.xlsx)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="radio"
                  name="format"
                  checked={settings.exportFormat === 'zip'}
                  onChange={() => setSettings(s => ({ ...s, exportFormat: 'zip' }))}
                  className="border-gray-600"
                />
                Full Package (.zip) - includes separate files for large content
              </label>
            </div>
          </div>
        </div>

        <footer className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onExport(settings)}>Export</Button>
        </footer>
      </Card>
    </div>
  );
};
```

---

## Task 3: Create Enhanced Export Utility with ExcelJS

**File**: `utils/enhancedExportUtils.ts` (new)

**Purpose**: Generate professionally formatted Excel workbooks

### 3.1 Color Constants and Types

```typescript
// utils/enhancedExportUtils.ts
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  EnrichedTopic, ContentBrief, SEOPillars, ValidationResult,
  SemanticTriple, BusinessInfo, ContextualBridgeLink, BriefSection
} from '../types';
import { safeString } from './parsers';

// Color scheme constants
const COLORS = {
  // Headers
  headerBg: 'FF343A40',        // Dark gray
  headerText: 'FFFFFFFF',      // White

  // Topic types
  coreTopicBg: 'FF1E3A5F',     // Deep blue
  coreTopicText: 'FFFFFFFF',   // White
  outerTopicBg: 'FFE8F4FD',    // Light blue
  outerTopicText: 'FF1E3A5F',  // Dark blue

  // RAG Status
  statusGreen: 'FFD4EDDA',     // Success green
  statusAmber: 'FFFFF3CD',     // Warning yellow
  statusRed: 'FFF8D7DA',       // Alert red

  // Section dividers
  sectionDivider: 'FF6C757D',  // Medium gray

  // Alternating rows
  altRowBg: 'FFF8F9FA',        // Very light gray
};

// RAG status calculation
type RAGStatus = 'green' | 'amber' | 'red';

const calculateRAGStatus = (topic: EnrichedTopic, brief?: ContentBrief): RAGStatus => {
  if (!brief) return 'red';
  if (!brief.articleDraft) return 'amber';

  // Check audit score if available
  const auditScore = brief.contentAudit?.overallScore;
  if (auditScore !== undefined && auditScore < 80) return 'amber';

  return 'green';
};

const getRAGColor = (status: RAGStatus): string => {
  switch (status) {
    case 'green': return COLORS.statusGreen;
    case 'amber': return COLORS.statusAmber;
    case 'red': return COLORS.statusRed;
  }
};
```

### 3.2 Workbook Generator Class

```typescript
export interface EnhancedExportInput {
  topics: EnrichedTopic[];
  briefs: Record<string, ContentBrief>;
  pillars?: SEOPillars;
  eavs?: SemanticTriple[];
  competitors?: string[];
  metrics?: ValidationResult | null;
  businessInfo?: Partial<BusinessInfo>;
  mapName?: string;
  projectName?: string;
}

export interface ExportSettings {
  includeBriefJsonFiles: boolean;
  includeArticleDrafts: boolean;
  includeSchemas: boolean;
  includeAuditResults: boolean;
  compactBriefsView: boolean;
  includeEavMatrix: boolean;
  exportFormat: 'xlsx' | 'zip';
}

export class EnhancedExportGenerator {
  private workbook: ExcelJS.Workbook;
  private input: EnhancedExportInput;
  private settings: ExportSettings;

  constructor(input: EnhancedExportInput, settings: ExportSettings) {
    this.workbook = new ExcelJS.Workbook();
    this.input = input;
    this.settings = settings;

    // Set workbook properties
    this.workbook.creator = 'Holistic SEO Topical Map Generator';
    this.workbook.created = new Date();
  }

  async generate(): Promise<ExcelJS.Workbook> {
    // Create sheets in order
    this.createExecutiveSummarySheet();
    this.createTopicalMapSheet();
    this.createContentBriefsSheet();
    this.createSeoPillarsSheet();

    if (this.settings.includeEavMatrix && this.input.eavs?.length) {
      this.createSemanticTriplesSheet();
    }

    this.createBusinessContextSheet();
    this.createCompetitorsSheet();

    if (this.settings.includeAuditResults && this.input.metrics) {
      this.createAuditResultsSheet();
    }

    return this.workbook;
  }

  // ... sheet creation methods below
}
```

### 3.3 Executive Summary Sheet

```typescript
private createExecutiveSummarySheet(): void {
  const sheet = this.workbook.addWorksheet('Executive Summary', {
    properties: { tabColor: { argb: 'FF4CAF50' } }
  });

  const { topics, briefs, pillars } = this.input;
  const coreTopics = topics.filter(t => t.type === 'core');
  const outerTopics = topics.filter(t => t.type === 'outer');
  const briefsGenerated = Object.keys(briefs).length;
  const draftsGenerated = Object.values(briefs).filter(b => b.articleDraft).length;

  // Title
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `${this.input.projectName || 'Topical Map'} - Export Summary`;
  titleCell.font = { bold: true, size: 18, color: { argb: 'FF1E3A5F' } };
  titleCell.alignment = { horizontal: 'center' };

  // Export date
  sheet.mergeCells('A2:F2');
  sheet.getCell('A2').value = `Exported: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
  sheet.getCell('A2').font = { italic: true, color: { argb: 'FF6C757D' } };
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  // Section: Completion Stats
  let row = 4;
  this.addSectionHeader(sheet, row, 'COMPLETION STATISTICS');
  row += 2;

  const stats = [
    ['Total Topics', topics.length],
    ['Core Topics', coreTopics.length],
    ['Outer Topics', outerTopics.length],
    ['Briefs Generated', `${briefsGenerated} / ${topics.length}`],
    ['Drafts Written', `${draftsGenerated} / ${topics.length}`],
    ['Completion Rate', `${Math.round((draftsGenerated / topics.length) * 100)}%`]
  ];

  stats.forEach(([label, value]) => {
    sheet.getCell(`B${row}`).value = label;
    sheet.getCell(`B${row}`).font = { bold: true };
    sheet.getCell(`C${row}`).value = value;
    row++;
  });

  // Section: Coverage Analysis
  row += 2;
  this.addSectionHeader(sheet, row, 'COVERAGE ANALYSIS');
  row += 2;

  // Calculate pillar coverage
  const pillarCoverage = pillars ? [
    ['Central Entity', pillars.centralEntity || 'Not defined'],
    ['Central Search Intent', pillars.centralSearchIntent || 'Not defined'],
    ['Primary Verb', pillars.primary_verb || 'Not defined'],
  ] : [['Pillars', 'Not defined']];

  pillarCoverage.forEach(([label, value]) => {
    sheet.getCell(`B${row}`).value = label;
    sheet.getCell(`B${row}`).font = { bold: true };
    sheet.getCell(`C${row}`).value = value;
    row++;
  });

  // Section: RAG Status Overview
  row += 2;
  this.addSectionHeader(sheet, row, 'TOPIC STATUS OVERVIEW');
  row += 2;

  const ragCounts = { green: 0, amber: 0, red: 0 };
  topics.forEach(topic => {
    const status = calculateRAGStatus(topic, briefs[topic.id]);
    ragCounts[status]++;
  });

  const ragData = [
    ['Complete (Brief + Draft + Audit ≥80%)', ragCounts.green, 'green'],
    ['In Progress (Brief but missing draft/low audit)', ragCounts.amber, 'amber'],
    ['Not Started (No brief)', ragCounts.red, 'red']
  ];

  ragData.forEach(([label, count, status]) => {
    const statusCell = sheet.getCell(`B${row}`);
    statusCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: getRAGColor(status as RAGStatus) }
    };
    sheet.getCell(`C${row}`).value = label;
    sheet.getCell(`D${row}`).value = count;
    row++;
  });

  // Set column widths
  sheet.getColumn('A').width = 5;
  sheet.getColumn('B').width = 20;
  sheet.getColumn('C').width = 45;
  sheet.getColumn('D').width = 15;
}

private addSectionHeader(sheet: ExcelJS.Worksheet, row: number, title: string): void {
  sheet.mergeCells(`B${row}:D${row}`);
  const cell = sheet.getCell(`B${row}`);
  cell.value = title;
  cell.font = { bold: true, size: 12, color: { argb: COLORS.headerText } };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.sectionDivider }
  };
}
```

### 3.4 Topical Map Sheet (Grouped Hierarchy)

```typescript
private createTopicalMapSheet(): void {
  const sheet = this.workbook.addWorksheet('Topical Map', {
    properties: { tabColor: { argb: 'FF2196F3' } }
  });

  const { topics, briefs } = this.input;
  const coreTopics = topics.filter(t => t.type === 'core');

  // Headers
  const headers = [
    'Topic Title', 'Slug', 'Type', 'Status', 'Has Brief',
    'Has Draft', 'Description', 'Canonical Query', 'Parent'
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    cell.alignment = { horizontal: 'center' };
  });

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Add topics grouped by core topic
  coreTopics.forEach(coreTopic => {
    const outerTopics = topics.filter(t => t.parent_topic_id === coreTopic.id);
    const ragStatus = calculateRAGStatus(coreTopic, briefs[coreTopic.id]);

    // Core topic row (styled as group header)
    const coreRow = sheet.addRow([
      coreTopic.title,
      coreTopic.slug,
      'CORE',
      ragStatus.toUpperCase(),
      briefs[coreTopic.id] ? 'Yes' : 'No',
      briefs[coreTopic.id]?.articleDraft ? 'Yes' : 'No',
      this.truncate(coreTopic.description, 200),
      coreTopic.metadata?.canonical_query || coreTopic.canonical_query || '',
      'ROOT'
    ]);

    // Style core topic row
    coreRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: COLORS.coreTopicText } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.coreTopicBg }
      };
    });

    // Status cell gets RAG color
    const statusCell = coreRow.getCell(4);
    statusCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: getRAGColor(ragStatus) }
    };
    statusCell.font = { bold: true, color: { argb: 'FF000000' } };

    // Outer topics (indented under core)
    outerTopics.forEach((outerTopic, idx) => {
      const outerRagStatus = calculateRAGStatus(outerTopic, briefs[outerTopic.id]);

      const outerRow = sheet.addRow([
        `    └─ ${outerTopic.title}`, // Visual indentation
        outerTopic.slug,
        'Outer',
        outerRagStatus.toUpperCase(),
        briefs[outerTopic.id] ? 'Yes' : 'No',
        briefs[outerTopic.id]?.articleDraft ? 'Yes' : 'No',
        this.truncate(outerTopic.description, 200),
        outerTopic.metadata?.canonical_query || outerTopic.canonical_query || '',
        coreTopic.title
      ]);

      // Style outer topic row
      outerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: idx % 2 === 0 ? COLORS.outerTopicBg : COLORS.altRowBg }
        };
      });

      // Status cell gets RAG color
      const outerStatusCell = outerRow.getCell(4);
      outerStatusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: getRAGColor(outerRagStatus) }
      };
    });

    // Add empty row between core topic groups
    sheet.addRow([]);
  });

  // Auto-fit columns
  sheet.columns.forEach(column => {
    column.width = Math.min(column.width || 15, 50);
  });

  // Specific widths
  sheet.getColumn(1).width = 45; // Topic Title
  sheet.getColumn(7).width = 60; // Description
}

private truncate(text: string | undefined, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}
```

### 3.5 Semantic Triples Matrix Sheet

```typescript
private createSemanticTriplesSheet(): void {
  const sheet = this.workbook.addWorksheet('Semantic Triples', {
    properties: { tabColor: { argb: 'FF9C27B0' } }
  });

  const { eavs } = this.input;
  if (!eavs || eavs.length === 0) return;

  // Group EAVs by subject (entity)
  const groupedByEntity: Record<string, SemanticTriple[]> = {};
  eavs.forEach(eav => {
    const entity = eav.subject.label;
    if (!groupedByEntity[entity]) {
      groupedByEntity[entity] = [];
    }
    groupedByEntity[entity].push(eav);
  });

  // Try to create a matrix view
  // Get unique predicates (attributes)
  const uniquePredicates = [...new Set(eavs.map(e => e.predicate.relation))];

  // If we have reasonable dimensions, create matrix
  const entities = Object.keys(groupedByEntity);

  if (entities.length <= 50 && uniquePredicates.length <= 20) {
    // Matrix view is feasible
    this.createEavMatrix(sheet, groupedByEntity, uniquePredicates);
  } else {
    // Fall back to grouped list view
    this.createEavGroupedList(sheet, groupedByEntity);
  }
}

private createEavMatrix(
  sheet: ExcelJS.Worksheet,
  grouped: Record<string, SemanticTriple[]>,
  predicates: string[]
): void {
  // Header row: Entity | Predicate1 | Predicate2 | ...
  const headers = ['Entity', ...predicates];
  const headerRow = sheet.addRow(headers);

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    cell.alignment = { horizontal: 'center', textRotation: 45 };
  });

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];

  // Data rows
  Object.entries(grouped).forEach(([entity, triples], idx) => {
    const rowData: (string | number)[] = [entity];

    predicates.forEach(pred => {
      const match = triples.find(t => t.predicate.relation === pred);
      rowData.push(match ? String(match.object.value) : '');
    });

    const row = sheet.addRow(rowData);

    // Alternate row coloring
    if (idx % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.altRowBg }
        };
      });
    }

    // Entity column bold
    row.getCell(1).font = { bold: true };
  });

  // Column widths
  sheet.getColumn(1).width = 30;
  for (let i = 2; i <= predicates.length + 1; i++) {
    sheet.getColumn(i).width = 20;
  }
}

private createEavGroupedList(
  sheet: ExcelJS.Worksheet,
  grouped: Record<string, SemanticTriple[]>
): void {
  // Fallback: grouped list view
  const headers = ['Entity', 'Attribute', 'Value', 'Type', 'Category', 'Classification'];
  const headerRow = sheet.addRow(headers);

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  Object.entries(grouped).forEach(([entity, triples]) => {
    // Entity header row
    const entityRow = sheet.addRow([entity, '', '', '', '', '']);
    entityRow.getCell(1).font = { bold: true };
    entityRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.outerTopicBg }
      };
    });

    // Triple rows
    triples.forEach(triple => {
      sheet.addRow([
        '',
        triple.predicate.relation,
        String(triple.object.value),
        triple.object.type,
        triple.predicate.category || '',
        triple.predicate.classification || ''
      ]);
    });

    // Spacer
    sheet.addRow([]);
  });

  // Column widths
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 25;
  sheet.getColumn(3).width = 35;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 20;
  sheet.getColumn(6).width = 20;
}
```

### 3.6 Remaining Sheets (Content Briefs, Pillars, Business Context, Competitors, Audit)

```typescript
private createContentBriefsSheet(): void {
  const sheet = this.workbook.addWorksheet('Content Briefs', {
    properties: { tabColor: { argb: 'FFFF9800' } }
  });

  const { topics, briefs } = this.input;
  const compact = this.settings.compactBriefsView;

  const headers = compact
    ? ['Topic', 'Meta Description', 'Status', 'Key Takeaways', 'Outline Vector']
    : ['Topic', 'Meta Description', 'Status', 'Key Takeaways', 'Outline Vector',
       'Methodology', 'Perspectives', 'Featured Snippet Q', 'Discourse Anchors'];

  const headerRow = sheet.addRow(headers);
  this.styleHeaderRow(headerRow);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  topics.filter(t => briefs[t.id]).forEach((topic, idx) => {
    const brief = briefs[topic.id];
    const ragStatus = calculateRAGStatus(topic, brief);

    const rowData = compact ? [
      topic.title,
      this.truncate(brief.metaDescription, 300),
      ragStatus.toUpperCase(),
      this.truncate(brief.keyTakeaways?.join(' | '), 500),
      this.formatOutlineVector(brief.outline, brief.structured_outline)
    ] : [
      topic.title,
      this.truncate(brief.metaDescription, 300),
      ragStatus.toUpperCase(),
      this.truncate(brief.keyTakeaways?.join(' | '), 500),
      this.formatOutlineVector(brief.outline, brief.structured_outline),
      this.truncate(brief.methodology_note, 300),
      brief.perspectives?.join(', ') || '',
      brief.featured_snippet_target?.question || '',
      this.truncate(brief.discourse_anchors?.join(' | '), 300)
    ];

    const row = sheet.addRow(rowData);

    // Status cell RAG coloring
    row.getCell(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: getRAGColor(ragStatus) }
    };

    // Alternate row background
    if (idx % 2 === 0) {
      row.eachCell((cell, colNum) => {
        if (colNum !== 3) { // Don't override status color
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.altRowBg }
          };
        }
      });
    }
  });

  // Set column widths
  sheet.getColumn(1).width = 35;
  sheet.getColumn(2).width = 50;
  sheet.getColumn(3).width = 12;
  sheet.getColumn(4).width = 40;
  sheet.getColumn(5).width = 50;
}

private formatOutlineVector(outline?: string, structured?: BriefSection[]): string {
  if (structured && structured.length > 0) {
    return structured.map(s => `H${s.level}: ${s.heading}`).join(' → ');
  }
  if (outline) {
    return outline.split('\n')
      .filter(line => line.trim().startsWith('#'))
      .map(line => line.trim().replace(/^#+\s*/, ''))
      .join(' → ');
  }
  return '';
}

private createSeoPillarsSheet(): void {
  const sheet = this.workbook.addWorksheet('SEO Pillars', {
    properties: { tabColor: { argb: 'FF4CAF50' } }
  });

  const { pillars } = this.input;
  if (!pillars) {
    sheet.addRow(['No pillars defined']);
    return;
  }

  // Title
  sheet.mergeCells('A1:B1');
  sheet.getCell('A1').value = 'SEO PILLARS & STRATEGY';
  sheet.getCell('A1').font = { bold: true, size: 14 };

  const pillarData = [
    ['Central Entity', pillars.centralEntity || ''],
    ['Source Context', pillars.sourceContext || ''],
    ['Central Search Intent', pillars.centralSearchIntent || ''],
    ['Primary Verb', pillars.primary_verb || ''],
    ['Auxiliary Verb', pillars.auxiliary_verb || ''],
  ];

  let row = 3;
  pillarData.forEach(([label, value]) => {
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`A${row}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.outerTopicBg }
    };
    sheet.getCell(`B${row}`).value = value;
    row++;
  });

  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 60;
}

private createBusinessContextSheet(): void {
  const sheet = this.workbook.addWorksheet('Business Context', {
    properties: { tabColor: { argb: 'FF607D8B' } }
  });

  const { businessInfo } = this.input;

  sheet.mergeCells('A1:B1');
  sheet.getCell('A1').value = 'BUSINESS CONTEXT';
  sheet.getCell('A1').font = { bold: true, size: 14 };

  const contextData = [
    ['Industry', businessInfo?.industry || ''],
    ['Target Market', businessInfo?.targetMarket || ''],
    ['Language', businessInfo?.language || ''],
    ['Seed Keyword', businessInfo?.seedKeyword || ''],
    ['Website URL', businessInfo?.websiteUrl || ''],
    ['Business Description', businessInfo?.businessDescription || ''],
  ];

  let row = 3;
  contextData.forEach(([label, value]) => {
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = this.truncate(String(value), 500);
    row++;
  });

  sheet.getColumn(1).width = 20;
  sheet.getColumn(2).width = 60;
}

private createCompetitorsSheet(): void {
  const sheet = this.workbook.addWorksheet('Competitors', {
    properties: { tabColor: { argb: 'FFE91E63' } }
  });

  const { competitors } = this.input;

  sheet.mergeCells('A1:B1');
  sheet.getCell('A1').value = 'COMPETITOR ANALYSIS';
  sheet.getCell('A1').font = { bold: true, size: 14 };

  if (!competitors || competitors.length === 0) {
    sheet.getCell('A3').value = 'No competitors defined';
    return;
  }

  const headerRow = sheet.addRow(['#', 'Competitor URL']);
  this.styleHeaderRow(headerRow);

  competitors.forEach((url, idx) => {
    const row = sheet.addRow([idx + 1, url]);
    if (idx % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.altRowBg }
        };
      });
    }
  });

  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 60;
}

private createAuditResultsSheet(): void {
  const sheet = this.workbook.addWorksheet('Audit Results', {
    properties: { tabColor: { argb: 'FFF44336' } }
  });

  const { metrics } = this.input;
  if (!metrics) {
    sheet.addRow(['No audit results available']);
    return;
  }

  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = 'MAP VALIDATION & AUDIT RESULTS';
  sheet.getCell('A1').font = { bold: true, size: 14 };

  // Hub-Spoke metrics
  if (metrics.metrics?.hubSpoke) {
    let row = 3;
    sheet.getCell(`A${row}`).value = 'Hub-Spoke Metrics';
    sheet.getCell(`A${row}`).font = { bold: true };
    row++;

    const headerRow = sheet.addRow(['Hub Topic', 'Spoke Count', 'Status']);
    this.styleHeaderRow(headerRow);

    metrics.metrics.hubSpoke.forEach((m, idx) => {
      const dataRow = sheet.addRow([m.hubTitle, m.spokeCount, m.status]);

      // Status coloring
      const statusColor = m.status === 'healthy' ? COLORS.statusGreen
        : m.status === 'thin' ? COLORS.statusAmber
        : COLORS.statusRed;

      dataRow.getCell(3).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: statusColor }
      };
    });
  }

  sheet.getColumn(1).width = 40;
  sheet.getColumn(2).width = 15;
  sheet.getColumn(3).width = 15;
}

private styleHeaderRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    cell.alignment = { horizontal: 'center' };
  });
}
```

---

## Task 4: Create ZIP Export with Enhanced Workbook

**File**: `utils/enhancedExportUtils.ts` (continued)

```typescript
export const generateEnhancedExport = async (
  input: EnhancedExportInput,
  settings: ExportSettings,
  filename: string
): Promise<void> => {
  const generator = new EnhancedExportGenerator(input, settings);
  const workbook = await generator.generate();

  if (settings.exportFormat === 'xlsx') {
    // Direct XLSX download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    downloadBlob(blob, `${filename}.xlsx`);
  } else {
    // ZIP with workbook + separate files
    const zip = new JSZip();

    // Add workbook
    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    zip.file(`${filename}.xlsx`, xlsxBuffer);

    // Add article drafts
    if (settings.includeArticleDrafts) {
      const articlesFolder = zip.folder('articles');
      Object.entries(input.briefs).forEach(([topicId, brief]) => {
        if (brief.articleDraft) {
          const topic = input.topics.find(t => t.id === topicId);
          const slug = safeString(topic?.slug || topicId).replace(/[^a-z0-9-]/gi, '-');
          const content = `# ${brief.title}\n\n> ${brief.metaDescription}\n\n---\n\n${brief.articleDraft}`;
          articlesFolder?.file(`${slug}.md`, content);
        }
      });
    }

    // Add brief JSONs
    if (settings.includeBriefJsonFiles) {
      const briefsFolder = zip.folder('briefs');
      Object.entries(input.briefs).forEach(([topicId, brief]) => {
        const topic = input.topics.find(t => t.id === topicId);
        const slug = safeString(topic?.slug || topicId).replace(/[^a-z0-9-]/gi, '-');
        briefsFolder?.file(`${slug}-brief.json`, JSON.stringify(brief, null, 2));
      });
    }

    // Add schemas (if available and requested)
    if (settings.includeSchemas) {
      const schemasFolder = zip.folder('schemas');
      Object.entries(input.briefs).forEach(([topicId, brief]) => {
        // Note: Schema would need to be stored on brief or fetched
        // Placeholder for when schema data is available
      });
    }

    // Add metadata
    const metadata = {
      exportDate: new Date().toISOString(),
      projectName: input.projectName,
      mapName: input.mapName,
      stats: {
        totalTopics: input.topics.length,
        coreTopics: input.topics.filter(t => t.type === 'core').length,
        outerTopics: input.topics.filter(t => t.type === 'outer').length,
        briefsGenerated: Object.keys(input.briefs).length,
        draftsGenerated: Object.values(input.briefs).filter(b => b.articleDraft).length
      }
    };
    zip.file('export-metadata.json', JSON.stringify(metadata, null, 2));

    // Generate and download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${filename}.zip`);
  }
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
```

---

## Task 5: Update Dashboard Export Handler

**File**: `components/ProjectDashboardContainer.tsx`

**Location**: Around line 1620 (handleExportData function)

**Changes**:
1. Import new modal and export function
2. Add state for export settings modal
3. Update handler to show modal first

```typescript
// Add imports
import { ExportSettingsModal, ExportSettings } from './ExportSettingsModal';
import { generateEnhancedExport, EnhancedExportInput } from '../utils/enhancedExportUtils';

// Add state (inside component)
const [showExportSettings, setShowExportSettings] = useState(false);

// Update handler
const handleExportData = (format: 'csv' | 'xlsx' | 'zip') => {
  if (format === 'csv') {
    // Keep simple CSV export for quick exports
    generateMasterExport(exportInput, 'csv', exportFilename);
  } else {
    // Show settings modal for xlsx/zip
    setShowExportSettings(true);
  }
};

const handleEnhancedExport = async (settings: ExportSettings) => {
  setShowExportSettings(false);

  const input: EnhancedExportInput = {
    topics: allTopics,
    briefs: activeMap?.briefs || {},
    pillars: activeMap?.pillars,
    eavs: activeMap?.eavs,
    competitors: activeMap?.competitors,
    metrics: state.validationResult,
    businessInfo: effectiveBusinessInfo,
    mapName: activeMap?.name,
    projectName: activeProject?.name
  };

  const filename = `${activeProject?.name || 'project'}_${activeMap?.name || 'map'}_${new Date().toISOString().split('T')[0]}`;

  await generateEnhancedExport(input, settings, filename);
};

// Add modal to JSX
<ExportSettingsModal
  isOpen={showExportSettings}
  onClose={() => setShowExportSettings(false)}
  onExport={handleEnhancedExport}
  hasSchemas={false} // Update when schema storage is added
  hasAuditResults={!!state.validationResult}
/>
```

---

## Task 6: Update WorkbenchPanel Export Dropdown

**File**: `components/dashboard/WorkbenchPanel.tsx`

**Location**: Lines 51-82 (Export dropdown)

**Changes**: Update to use new enhanced export flow

```typescript
// Current dropdown items - update labels
<button onClick={() => onExportData('csv')}>
  Quick Export (CSV)
</button>
<button onClick={() => onExportData('xlsx')}>
  Enhanced Export (Excel) ← Opens settings modal
</button>
<button onClick={() => onExportData('zip')}>
  Full Package (ZIP) ← Opens settings modal
</button>
```

---

## Verification Steps

After implementation, verify:

1. **Install Check**: `npm list exceljs` shows installed
2. **Modal Opens**: Click "Enhanced Export" shows settings modal
3. **Excel Styling**: Generated XLSX has:
   - Color-coded headers
   - RAG status indicators
   - Grouped topic hierarchy
   - Freeze panes on headers
4. **ZIP Contents**: Full package includes:
   - Styled XLSX workbook
   - articles/ folder with .md files
   - briefs/ folder with .json files
   - export-metadata.json
5. **EAV Matrix**: Semantic triples display as matrix when feasible

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add exceljs dependency |
| `components/ExportSettingsModal.tsx` | Create | Export configuration UI |
| `utils/enhancedExportUtils.ts` | Create | ExcelJS workbook generator |
| `components/ProjectDashboardContainer.tsx` | Modify | Integrate new export flow |
| `components/dashboard/WorkbenchPanel.tsx` | Modify | Update export dropdown labels |
