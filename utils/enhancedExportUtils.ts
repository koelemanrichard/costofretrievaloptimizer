// utils/enhancedExportUtils.ts
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  EnrichedTopic, ContentBrief, SEOPillars, ValidationResult,
  SemanticTriple, BusinessInfo, BriefSection,
  FoundationPage, NAPData, NavigationStructure, BrandKit,
  PublicationPlanResult, PerformanceSnapshot
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

  // Check if content audit passed - if any check is failing, mark as amber
  if (brief.contentAudit) {
    const audit = brief.contentAudit;
    if (!audit.eavCheck?.isPassing || !audit.linkCheck?.isPassing) {
      return 'amber';
    }
  }

  return 'green';
};

const getRAGColor = (status: RAGStatus): string => {
  switch (status) {
    case 'green': return COLORS.statusGreen;
    case 'amber': return COLORS.statusAmber;
    case 'red': return COLORS.statusRed;
  }
};

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
  // NEW: Additional data for comprehensive export
  foundationPages?: FoundationPage[];
  napData?: NAPData;
  navigation?: NavigationStructure | null;
  brandKit?: BrandKit;
  // Publication Planning
  publicationPlan?: PublicationPlanResult | null;
  performanceSnapshots?: Map<string, PerformanceSnapshot>;
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

    // NEW: Additional worksheets for comprehensive export
    if (this.input.foundationPages?.length) {
      this.createFoundationPagesSheet();
    }
    if (this.input.napData) {
      this.createNapDataSheet();
    }
    if (this.input.navigation) {
      this.createNavigationSheet();
    }
    if (this.input.brandKit) {
      this.createBrandKitSheet();
    }
    if (this.input.publicationPlan) {
      this.createPublicationPlanSheet();
    }

    return this.workbook;
  }

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
      ['Completion Rate', `${Math.round((draftsGenerated / Math.max(topics.length, 1)) * 100)}%`]
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

    const ragData: [string, number, RAGStatus][] = [
      ['Complete (Brief + Draft + Audit ≥80%)', ragCounts.green, 'green'],
      ['In Progress (Brief but missing draft/low audit)', ragCounts.amber, 'amber'],
      ['Not Started (No brief)', ragCounts.red, 'red']
    ];

    ragData.forEach(([label, count, status]) => {
      const statusCell = sheet.getCell(`B${row}`);
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: getRAGColor(status) }
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
      coreRow.eachCell((cell) => {
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

    // Set specific widths
    sheet.getColumn(1).width = 45; // Topic Title
    sheet.getColumn(2).width = 30; // Slug
    sheet.getColumn(3).width = 10; // Type
    sheet.getColumn(4).width = 12; // Status
    sheet.getColumn(5).width = 12; // Has Brief
    sheet.getColumn(6).width = 12; // Has Draft
    sheet.getColumn(7).width = 60; // Description
    sheet.getColumn(8).width = 30; // Canonical Query
    sheet.getColumn(9).width = 25; // Parent
  }

  private truncate(text: string | undefined, maxLen: number): string {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  }

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

    // Get unique predicates (attributes)
    const uniquePredicates = [...new Set(eavs.map(e => e.predicate.relation))];

    // Get entities
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
    if (!compact) {
      sheet.getColumn(6).width = 40;
      sheet.getColumn(7).width = 30;
      sheet.getColumn(8).width = 40;
      sheet.getColumn(9).width = 40;
    }
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
      ['Domain', businessInfo?.domain || ''],
      ['Value Proposition', businessInfo?.valueProp || ''],
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

    // Add header row starting from row 3
    sheet.getCell('A3').value = '#';
    sheet.getCell('B3').value = 'Competitor URL';
    const headerRow = sheet.getRow(3);
    this.styleHeaderRow(headerRow);

    competitors.forEach((url, idx) => {
      const rowNum = idx + 4;
      sheet.getCell(`A${rowNum}`).value = idx + 1;
      sheet.getCell(`B${rowNum}`).value = url;

      if (idx % 2 === 0) {
        sheet.getCell(`A${rowNum}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.altRowBg }
        };
        sheet.getCell(`B${rowNum}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.altRowBg }
        };
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

      sheet.getCell(`A${row}`).value = 'Hub Topic';
      sheet.getCell(`B${row}`).value = 'Spoke Count';
      sheet.getCell(`C${row}`).value = 'Status';
      const headerRow = sheet.getRow(row);
      this.styleHeaderRow(headerRow);
      row++;

      metrics.metrics.hubSpoke.forEach((m) => {
        sheet.getCell(`A${row}`).value = m.hubTitle;
        sheet.getCell(`B${row}`).value = m.spokeCount;
        sheet.getCell(`C${row}`).value = m.status;

        // Status coloring
        const statusColor = m.status === 'OPTIMAL' ? COLORS.statusGreen
          : m.status === 'UNDER_SUPPORTED' ? COLORS.statusAmber
          : COLORS.statusRed;

        sheet.getCell(`C${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: statusColor }
        };
        row++;
      });
    }

    sheet.getColumn(1).width = 40;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 15;
  }

  private createFoundationPagesSheet(): void {
    const sheet = this.workbook.addWorksheet('Foundation Pages', {
      properties: { tabColor: { argb: 'FF9C27B0' } } // Purple
    });

    const pages = this.input.foundationPages || [];

    // Header
    sheet.mergeCells('A1:H1');
    sheet.getCell('A1').value = 'FOUNDATION PAGES';
    sheet.getCell('A1').font = { bold: true, size: 14 };

    // Column headers
    const headers = ['Page Type', 'Title', 'Slug', 'Meta Description', 'H1 Template', 'Schema Type', 'Status', 'Sections'];
    const headerRow = sheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Data
    pages.forEach(page => {
      sheet.addRow([
        page.page_type,
        page.title,
        page.slug,
        page.meta_description || '',
        page.h1_template || '',
        page.schema_type || '',
        page.status || 'draft',
        page.sections?.map(s => s.heading).join(', ') || ''
      ]);
    });

    // Column widths
    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 25;
    sheet.getColumn(4).width = 40;
    sheet.getColumn(5).width = 30;
    sheet.getColumn(6).width = 15;
    sheet.getColumn(7).width = 10;
    sheet.getColumn(8).width = 40;
  }

  private createNapDataSheet(): void {
    const sheet = this.workbook.addWorksheet('NAP Data', {
      properties: { tabColor: { argb: 'FF00BCD4' } } // Cyan
    });

    const nap = this.input.napData;
    if (!nap) return;

    // Header
    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = 'NAP (NAME, ADDRESS, PHONE) DATA';
    sheet.getCell('A1').font = { bold: true, size: 14 };

    let row = 3;

    // Primary location
    const primaryData = [
      ['Company Name', nap.company_name],
      ['Primary Address', nap.address],
      ['Phone', nap.phone],
      ['Email', nap.email],
      ['Founded Year', nap.founded_year || '']
    ];

    primaryData.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`B${row}`).value = value;
      row++;
    });

    // Additional locations
    if (nap.locations && nap.locations.length > 0) {
      row += 2;
      sheet.getCell(`A${row}`).value = 'Additional Locations';
      sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
      row++;

      const locHeaders = ['Location Name', 'Address', 'Phone', 'Email', 'Headquarters?'];
      const locHeaderRow = sheet.getRow(row);
      locHeaders.forEach((h, idx) => {
        locHeaderRow.getCell(idx + 1).value = h;
      });
      this.styleHeaderRow(locHeaderRow);
      row++;

      nap.locations.forEach(loc => {
        sheet.addRow([
          loc.name,
          loc.address,
          loc.phone,
          loc.email || '',
          loc.is_headquarters ? 'Yes' : 'No'
        ]);
      });
    }

    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 50;
  }

  private createNavigationSheet(): void {
    const sheet = this.workbook.addWorksheet('Navigation', {
      properties: { tabColor: { argb: 'FFFF9800' } } // Orange
    });

    const nav = this.input.navigation;
    if (!nav) return;

    // Header
    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = 'NAVIGATION STRUCTURE';
    sheet.getCell('A1').font = { bold: true, size: 14 };

    // Column headers
    const headers = ['Location', 'Section', 'Order', 'Text', 'Prominence', 'Target Type', 'Target ID/URL'];
    const headerRow = sheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Header navigation
    nav.header.primary_nav.forEach((link, idx) => {
      sheet.addRow([
        'Header',
        '',
        idx + 1,
        link.text,
        link.prominence || 'medium',
        link.target_topic_id ? 'Topic' : link.target_foundation_page_id ? 'Foundation Page' : 'External',
        link.target_topic_id || link.target_foundation_page_id || link.external_url || ''
      ]);
    });

    // CTA Button
    if (nav.header.cta_button) {
      sheet.addRow([
        'Header CTA',
        '',
        0,
        nav.header.cta_button.text,
        'high',
        'CTA',
        nav.header.cta_button.url || ''
      ]);
    }

    // Footer sections
    nav.footer.sections.forEach(section => {
      section.links.forEach((link, idx) => {
        sheet.addRow([
          'Footer',
          section.heading,
          idx + 1,
          link.text,
          link.prominence || 'low',
          link.target_topic_id ? 'Topic' : link.target_foundation_page_id ? 'Foundation Page' : 'External',
          link.target_topic_id || link.target_foundation_page_id || link.external_url || ''
        ]);
      });
    });

    // Legal links
    nav.footer.legal_links.forEach((link, idx) => {
      sheet.addRow([
        'Footer Legal',
        'Legal',
        idx + 1,
        link.text,
        'low',
        link.target_foundation_page_id ? 'Foundation Page' : 'External',
        link.target_foundation_page_id || link.external_url || ''
      ]);
    });

    // Column widths
    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 8;
    sheet.getColumn(4).width = 30;
    sheet.getColumn(5).width = 12;
    sheet.getColumn(6).width = 18;
    sheet.getColumn(7).width = 40;
  }

  private createBrandKitSheet(): void {
    const sheet = this.workbook.addWorksheet('Brand Kit', {
      properties: { tabColor: { argb: 'FFE91E63' } } // Pink
    });

    const brand = this.input.brandKit;
    if (!brand) return;

    // Header
    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = 'BRAND KIT';
    sheet.getCell('A1').font = { bold: true, size: 14 };

    let row = 3;

    // Colors section
    sheet.getCell(`A${row}`).value = 'Colors';
    sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    const colorData = [
      ['Primary Color', brand.colors?.primary || ''],
      ['Secondary Color', brand.colors?.secondary || ''],
      ['Text on Image', brand.colors?.textOnImage || ''],
      ['Overlay Gradient', brand.colors?.overlayGradient || '']
    ];

    colorData.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      // Add color preview
      if (value && value.startsWith('#')) {
        sheet.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF' + value.replace('#', '') }
        };
      }
      row++;
    });

    row++;
    // Fonts section
    sheet.getCell(`A${row}`).value = 'Typography';
    sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    const fontData = [
      ['Heading Font', brand.fonts?.heading || ''],
      ['Body Font', brand.fonts?.body || '']
    ];

    fontData.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      row++;
    });

    row++;
    // Logo section
    sheet.getCell(`A${row}`).value = 'Logo Settings';
    sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    const logoData = [
      ['Logo Placement', brand.logoPlacement || ''],
      ['Logo Opacity', brand.logoOpacity ? `${brand.logoOpacity}%` : '']
    ];

    logoData.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      row++;
    });

    row++;
    // Copyright section
    sheet.getCell(`A${row}`).value = 'Copyright';
    sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    const copyrightData = [
      ['Copyright Holder', brand.copyright?.holder || ''],
      ['License URL', brand.copyright?.licenseUrl || '']
    ];

    copyrightData.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      row++;
    });

    // Hero templates
    if (brand.heroTemplates && brand.heroTemplates.length > 0) {
      row += 2;
      sheet.getCell(`A${row}`).value = 'Hero Templates';
      sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
      row++;

      brand.heroTemplates.forEach(template => {
        sheet.getCell(`A${row}`).value = template.name;
        sheet.getCell(`B${row}`).value = template.description;
        row++;
      });
    }

    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 40;
  }

  private createPublicationPlanSheet(): void {
    const sheet = this.workbook.addWorksheet('Publication Plan', {
      properties: { tabColor: { argb: 'FF9C27B0' } } // Purple for planning
    });

    const { topics, briefs, publicationPlan, performanceSnapshots } = this.input;

    if (!publicationPlan) return;

    // Build plan lookup
    const planByTopic = new Map(publicationPlan.topics.map(p => [p.topic_id, p]));

    // Headers
    const headers = [
      'Topic Title',
      'Slug',
      'Type',
      'Phase',
      'Status',
      'Priority',
      'Score',
      'Planned Date',
      'Actual Date',
      'Days Variance',
      'Impressions',
      'Clicks',
      'CTR',
      'Avg Position',
      'Has Brief',
      'Has Draft',
      'Notes'
    ];

    const headerRow = sheet.addRow(headers);
    this.styleHeaderRow(headerRow);
    sheet.getRow(1).height = 25;

    // Set column widths
    sheet.getColumn(1).width = 30;  // Title
    sheet.getColumn(2).width = 25;  // Slug
    sheet.getColumn(3).width = 10;  // Type
    sheet.getColumn(4).width = 20;  // Phase
    sheet.getColumn(5).width = 15;  // Status
    sheet.getColumn(6).width = 12;  // Priority
    sheet.getColumn(7).width = 8;   // Score
    sheet.getColumn(8).width = 14;  // Planned Date
    sheet.getColumn(9).width = 14;  // Actual Date
    sheet.getColumn(10).width = 14; // Variance
    sheet.getColumn(11).width = 12; // Impressions
    sheet.getColumn(12).width = 10; // Clicks
    sheet.getColumn(13).width = 10; // CTR
    sheet.getColumn(14).width = 12; // Position
    sheet.getColumn(15).width = 10; // Has Brief
    sheet.getColumn(16).width = 10; // Has Draft
    sheet.getColumn(17).width = 30; // Notes

    // Phase labels
    const phaseLabels: Record<string, string> = {
      'phase_1_authority': 'P1: Authority',
      'phase_2_support': 'P2: Support',
      'phase_3_expansion': 'P3: Expansion',
      'phase_4_longtail': 'P4: Long-tail'
    };

    // Status labels
    const statusLabels: Record<string, string> = {
      'not_started': 'Not Started',
      'brief_ready': 'Brief Ready',
      'draft_in_progress': 'In Progress',
      'draft_ready': 'Draft Ready',
      'in_review': 'In Review',
      'scheduled': 'Scheduled',
      'published': 'Published',
      'needs_update': 'Needs Update'
    };

    // Sort topics by optimal_publication_date
    const sortedTopics = [...topics].sort((a, b) => {
      const planA = planByTopic.get(a.id);
      const planB = planByTopic.get(b.id);
      const dateA = planA?.optimal_publication_date || a.metadata?.publication_plan?.optimal_publication_date || '';
      const dateB = planB?.optimal_publication_date || b.metadata?.publication_plan?.optimal_publication_date || '';
      return dateA.localeCompare(dateB);
    });

    // Add data rows
    sortedTopics.forEach((topic, idx) => {
      const plan = planByTopic.get(topic.id) || topic.metadata?.publication_plan;
      const brief = briefs[topic.id];
      const snapshot = performanceSnapshots?.get(topic.id);

      const phase = plan?.phase || '';
      const status = plan?.status || topic.metadata?.publication_plan?.status || 'not_started';
      const priority = plan?.priority || '';
      const priorityScore = plan?.priority_score ?? '';
      const plannedDate = plan?.optimal_publication_date || '';
      const actualDate = topic.metadata?.publication_plan?.actual_publication_date || '';

      // Calculate variance
      let variance = '';
      if (plannedDate && actualDate) {
        const planned = new Date(plannedDate);
        const actual = new Date(actualDate);
        const diffDays = Math.round((actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
        variance = diffDays > 0 ? `+${diffDays}` : diffDays.toString();
      }

      const row = sheet.addRow([
        topic.title,
        topic.slug || '',
        topic.type,
        phaseLabels[phase] || phase,
        statusLabels[status] || status,
        priority,
        priorityScore,
        plannedDate,
        actualDate,
        variance,
        snapshot?.gsc_impressions ?? '',
        snapshot?.gsc_clicks ?? '',
        snapshot?.gsc_ctr ? `${(snapshot.gsc_ctr * 100).toFixed(2)}%` : '',
        snapshot?.gsc_position?.toFixed(1) ?? '',
        brief ? 'Yes' : 'No',
        brief?.articleDraft ? 'Yes' : 'No',
        topic.metadata?.publication_plan?.notes || ''
      ]);

      // Alternating row colors
      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.altRowBg }
          };
        });
      }

      // Phase-based coloring for phase column
      const phaseCell = row.getCell(4);
      if (phase === 'phase_1_authority') {
        phaseCell.font = { color: { argb: 'FFDC3545' } }; // Red
      } else if (phase === 'phase_2_support') {
        phaseCell.font = { color: { argb: 'FFFD7E14' } }; // Orange
      } else if (phase === 'phase_3_expansion') {
        phaseCell.font = { color: { argb: 'FFFFC107' } }; // Yellow
      } else if (phase === 'phase_4_longtail') {
        phaseCell.font = { color: { argb: 'FF17A2B8' } }; // Blue
      }

      // Priority-based coloring
      const priorityCell = row.getCell(6);
      if (priority === 'critical') {
        priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
      } else if (priority === 'high') {
        priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      }

      // Status-based coloring
      const statusCell = row.getCell(5);
      if (status === 'published') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
      } else if (status === 'needs_update') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
      }

      // Variance coloring (red if late)
      const varianceCell = row.getCell(10);
      if (variance && parseInt(variance) > 0) {
        varianceCell.font = { color: { argb: 'FFDC3545' } };
      } else if (variance && parseInt(variance) < 0) {
        varianceCell.font = { color: { argb: 'FF28A745' } };
      }
    });

    // Add summary section at top
    sheet.insertRow(1, []);
    sheet.insertRow(1, []);
    sheet.insertRow(1, []);
    sheet.insertRow(1, []);

    const summary = publicationPlan.summary;
    sheet.getCell('A1').value = 'Publication Plan Summary';
    sheet.getCell('A1').font = { bold: true, size: 14 };

    sheet.getCell('A2').value = `Total Duration: ${summary.total_duration_weeks} weeks`;
    sheet.getCell('C2').value = `Batch Launch: ${summary.batch_launch_date}`;
    sheet.getCell('E2').value = `Total Topics: ${topics.length}`;

    sheet.getCell('A3').value = `Phase 1: ${summary.phase_1_count}`;
    sheet.getCell('B3').value = `Phase 2: ${summary.phase_2_count}`;
    sheet.getCell('C3').value = `Phase 3: ${summary.phase_3_count}`;
    sheet.getCell('D3').value = `Phase 4: ${summary.phase_4_count}`;

    // Freeze panes (header + summary)
    sheet.views = [{ state: 'frozen', ySplit: 5 }];
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
}

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
        // Schema data would need to be stored on brief or fetched
        // Check if brief has jsonLdSchema property
        const briefAny = brief as unknown as Record<string, unknown>;
        if (briefAny.jsonLdSchema) {
          const topic = input.topics.find(t => t.id === topicId);
          const slug = safeString(topic?.slug || topicId).replace(/[^a-z0-9-]/gi, '-');
          schemasFolder?.file(`${slug}-schema.json`, JSON.stringify(briefAny.jsonLdSchema, null, 2));
        }
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
