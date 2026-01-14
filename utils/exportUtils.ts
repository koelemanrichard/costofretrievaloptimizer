/**
 * @deprecated This module contains legacy export functions.
 * For new code, prefer using enhancedExportUtils.ts which provides:
 * - generateEnhancedExport() - comprehensive export with settings
 * - generateImageSitemap() - image sitemap generation
 * - downloadImageSitemap() - download image sitemap
 *
 * The functions here (generateMasterExport, generateFullZipExport) are maintained
 * for backward compatibility but will be removed in a future version.
 */

import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { EnrichedTopic, ContentBrief, SEOPillars, ValidationResult, ContextualBridgeLink, BriefSection, BusinessInfo, FoundationPage, NAPData, NavigationStructure, BrandKit, SemanticTriple, UnifiedAuditResult, MoneyPagePillarsResult, BriefVisualSemantics, QueryTemplate, ExpandedTemplateResult } from '../types';
import { safeString } from './parsers';
import { calculateSemanticComplianceMetrics, calculateAuthorityIndicators, EnhancedAuditMetrics } from '../services/reportGenerationService';
import { calculateMoneyPagePillarsScore, shouldAnalyze4Pillars } from './moneyPagePillarScore';
import { exportVisualSemanticsData } from '../services/visualSemanticsService';

interface ExportDataInput {
    topics: EnrichedTopic[];
    briefs: Record<string, ContentBrief>;
    pillars: SEOPillars | undefined;
    metrics?: ValidationResult | null;
    // NEW: Additional data for comprehensive export
    foundationPages?: FoundationPage[];
    napData?: NAPData;
    navigation?: NavigationStructure | null;
    brandKit?: BrandKit;
    eavs?: SemanticTriple[];
    // Enhanced metrics
    unifiedAuditResult?: UnifiedAuditResult | null;
    // Query templates (Local SEO)
    queryTemplates?: QueryTemplate[];
    expandedTemplateResults?: ExpandedTemplateResult[];
}

// Helper to flatten structured outline into a readable vector string
const formatContextualVector = (outline: string, structured: BriefSection[] | undefined): string => {
    if (structured && structured.length > 0) {
        return structured.map(s => `${'#'.repeat(s.level)} ${s.heading}`).join(' > ');
    }
    // Fallback to parsing raw markdown outline if structured is missing
    if (outline) {
        return outline.split('\n')
            .filter(line => line.trim().startsWith('#'))
            .map(line => line.trim().replace(/^#+\s*/, ''))
            .join(' > ');
    }
    return '';
};

// Helper to calculate contextual hierarchy depth
const calculateHierarchyDepth = (structured: BriefSection[] | undefined): string => {
    if (!structured || structured.length === 0) return 'N/A';
    const depths = structured.map(s => s.level);
    const maxDepth = Math.max(...depths);
    return `H2-H${maxDepth}`;
};

// Truncate text for Excel cells (max ~32k chars)
const truncateForExcel = (text: string | undefined, maxLen: number = 30000): string => {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '... [TRUNCATED - see ZIP export for full content]';
};

/**
 * @deprecated Use generateEnhancedExport from enhancedExportUtils.ts instead.
 * This function is maintained for backward compatibility with CSV quick exports.
 */
export const generateMasterExport = (input: ExportDataInput, format: 'csv' | 'xlsx', filename: string) => {
    const { topics, briefs, pillars, metrics } = input;

    const workbook = XLSX.utils.book_new();

    // === TAB 1: Topics Master View (with hierarchy) ===
    // Build topic lookup map
    const topicMap = new Map(topics.map(t => [t.id, t]));

    // Sort topics hierarchically: core → outer → child, maintaining parent-child grouping
    const sortedTopics: EnrichedTopic[] = [];
    const coreTopics = topics.filter(t => t.type === 'core');
    const outerTopics = topics.filter(t => t.type === 'outer');
    const childTopics = topics.filter(t => t.type === 'child');

    coreTopics.forEach(core => {
        sortedTopics.push(core);
        // Find outer topics under this core
        const outersUnderCore = outerTopics.filter(o => o.parent_topic_id === core.id);
        outersUnderCore.forEach(outer => {
            sortedTopics.push(outer);
            // Find child topics under this outer
            const childrenUnderOuter = childTopics.filter(c => c.parent_topic_id === outer.id);
            childrenUnderOuter.forEach(child => {
                sortedTopics.push(child);
            });
        });
    });

    // Add orphaned outer topics (no parent or parent not found)
    outerTopics.filter(o => !o.parent_topic_id || !topicMap.has(o.parent_topic_id)).forEach(outer => {
        if (!sortedTopics.includes(outer)) {
            sortedTopics.push(outer);
            const childrenUnderOuter = childTopics.filter(c => c.parent_topic_id === outer.id);
            childrenUnderOuter.forEach(child => {
                if (!sortedTopics.includes(child)) sortedTopics.push(child);
            });
        }
    });

    // Add orphaned child topics
    childTopics.filter(c => !sortedTopics.includes(c)).forEach(child => {
        sortedTopics.push(child);
    });

    const topicRows = sortedTopics.map(topic => {
        const brief = briefs[topic.id];
        const blueprint = topic.blueprint;
        const bridgeData = brief?.contextualBridge;
        let bridgeLinks: ContextualBridgeLink[] = [];
        if (Array.isArray(bridgeData)) {
            bridgeLinks = bridgeData;
        } else if (bridgeData && typeof bridgeData === 'object' && 'links' in bridgeData) {
            bridgeLinks = bridgeData.links;
        }
        const spokeCount = topics.filter(t => t.parent_topic_id === topic.id).length;
        const metadata = topic.metadata || {};

        const getMeta = (key: string, rootKey?: keyof EnrichedTopic) => {
            if (rootKey && (topic as any)[rootKey]) return (topic as any)[rootKey];
            if (metadata[key]) return metadata[key];
            return '';
        };

        // Create hierarchical title with visual indentation
        let hierarchyPrefix = '';
        if (topic.type === 'outer') {
            hierarchyPrefix = '├─ ';
        } else if (topic.type === 'child') {
            hierarchyPrefix = '    └─ ';
        }

        // Get parent topic title
        const parentTopic = topic.parent_topic_id ? topicMap.get(topic.parent_topic_id) : null;
        const parentTitle = parentTopic ? parentTopic.title : (topic.type === 'core' ? 'ROOT' : '');

        return {
            'Topic Title': hierarchyPrefix + topic.title,
            'Slug': topic.slug,
            'Type': topic.type,
            'Status': brief?.articleDraft ? 'AMBER' : (brief ? 'AMBER' : 'RED'),
            'Has Brief': brief ? 'Yes' : 'No',
            'Has Draft': brief?.articleDraft ? 'Yes' : 'No',
            'Description': truncateForExcel(topic.description, 500),
            'Canonical Query': getMeta('canonical_query', 'canonical_query'),
            'Parent': parentTitle,
        };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(topicRows), "Topical Map");

    // === TAB 2: Content Briefs (truncated) ===
    const briefRows = topics.filter(t => briefs[t.id]).map(topic => {
        const brief = briefs[topic.id];
        return {
            'Topic': topic.title,
            'Meta Description': truncateForExcel(brief.metaDescription, 500),
            'Key Takeaways': truncateForExcel(brief.keyTakeaways?.join(' | '), 1000),
            'Outline': truncateForExcel(formatContextualVector(brief.outline || '', brief.structured_outline), 2000),
            'Methodology': truncateForExcel(brief.methodology_note, 500),
            'Perspectives': brief.perspectives?.join(', ') || '',
            'Featured Snippet Q': brief.featured_snippet_target?.question || '',
            'Discourse Anchors': truncateForExcel(brief.discourse_anchors?.join(' | '), 500)
        };
    });
    if (briefRows.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(briefRows), "Content Briefs");
    }

    // === TAB 3: Structured Outlines ===
    const outlineRows: any[] = [];
    topics.forEach(topic => {
        const brief = briefs[topic.id];
        if (brief?.structured_outline) {
            brief.structured_outline.forEach((section, idx) => {
                outlineRows.push({
                    'Topic': topic.title,
                    'Section Order': idx + 1,
                    'Heading': section.heading,
                    'Level': `H${section.level}`,
                    'Subordinate Hint': truncateForExcel(section.subordinate_text_hint, 500),
                    'Methodology': section.methodology_note || ''
                });
            });
        }
    });
    if (outlineRows.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(outlineRows), "Outlines");
    }

    // === TAB 4: Internal Linking ===
    const linkRows: any[] = [];
    topics.forEach(topic => {
        const brief = briefs[topic.id];
        const bridgeData = brief?.contextualBridge;
        let bridgeLinks: ContextualBridgeLink[] = [];
        if (Array.isArray(bridgeData)) {
            bridgeLinks = bridgeData;
        } else if (bridgeData && typeof bridgeData === 'object' && 'links' in bridgeData) {
            bridgeLinks = bridgeData.links;
        }
        bridgeLinks.forEach(link => {
            linkRows.push({
                'Source Topic': topic.title,
                'Target Topic': link.targetTopic,
                'Anchor Text': link.anchorText,
                'Context Hint': truncateForExcel(link.annotation_text_hint, 300)
            });
        });
    });
    if (linkRows.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(linkRows), "Internal Links");
    }

    // === TAB 5: SERP Analysis ===
    const serpRows: any[] = [];
    topics.forEach(topic => {
        const brief = briefs[topic.id];
        if (brief?.serpAnalysis) {
            const serp = brief.serpAnalysis;
            serpRows.push({
                'Topic': topic.title,
                'Avg Word Count': serp.avgWordCount || '',
                'Avg Headings': serp.avgHeadings || '',
                'Common Structure': truncateForExcel(serp.commonStructure, 500),
                'People Also Ask': truncateForExcel(serp.peopleAlsoAsk?.join(' | '), 500),
                'Content Gaps': truncateForExcel(serp.contentGaps?.join(' | '), 500)
            });
        }
    });
    if (serpRows.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(serpRows), "SERP Analysis");
    }

    // === TAB 6: Visual Semantics (Legacy) ===
    const visualRows: any[] = [];
    topics.forEach(topic => {
        const brief = briefs[topic.id];
        if (brief?.visual_semantics) {
            brief.visual_semantics.forEach(visual => {
                visualRows.push({
                    'Topic': topic.title,
                    'Type': visual.type,
                    'Description': truncateForExcel(visual.description, 300),
                    'Caption/Data': truncateForExcel(visual.caption_data, 200),
                    'Size Hint': `${visual.width_hint || '?'} x ${visual.height_hint || '?'}`
                });
            });
        }
    });
    if (visualRows.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(visualRows), "Visual Semantics");
    }

    // === TAB 6b: Enhanced Visual Semantics (Koray's "Pixels, Letters, Bytes" Framework) ===
    const enhancedVisualRows: any[] = [];
    topics.forEach(topic => {
        const brief = briefs[topic.id];
        if (brief?.enhanced_visual_semantics) {
            const exportData = exportVisualSemanticsData(brief.enhanced_visual_semantics);
            exportData.forEach(item => {
                enhancedVisualRows.push({
                    'Topic': topic.title,
                    'Image ID': item.image_id,
                    'Description': truncateForExcel(item.description, 300),
                    'Alt Text': truncateForExcel(item.alt_text, 200),
                    'File Name': item.file_name,
                    'Format': item.format,
                    'Max Width': item.max_width,
                    'Placement': truncateForExcel(item.placement, 200),
                    'Entity Connections': item.entities,
                    'Centerpiece Alignment': item.centerpiece_alignment ? `${item.centerpiece_alignment}%` : '',
                    'HTML Template': truncateForExcel(item.html_template, 500)
                });
            });
        }
    });
    if (enhancedVisualRows.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(enhancedVisualRows), "Visual Semantics Enhanced");
    }

    // === TAB 6c: Money Page 4 Pillars ===
    const pillarRows: any[] = [];
    topics.forEach(topic => {
        const brief = briefs[topic.id];
        // Only analyze monetization topics
        if (brief && shouldAnalyze4Pillars(topic.topic_class)) {
            const pillarsResult = calculateMoneyPagePillarsScore(brief);
            pillarRows.push({
                'Topic': topic.title,
                'Overall Score': pillarsResult.overall_score,
                'Grade': pillarsResult.overall_grade,
                'Verbalization': pillarsResult.pillars.find(p => p.pillar === 'verbalization')?.score || 0,
                'Contextualization': pillarsResult.pillars.find(p => p.pillar === 'contextualization')?.score || 0,
                'Monetization': pillarsResult.pillars.find(p => p.pillar === 'monetization')?.score || 0,
                'Visualization': pillarsResult.pillars.find(p => p.pillar === 'visualization')?.score || 0,
                'Missing Critical': truncateForExcel(pillarsResult.missing_critical.join(', '), 300),
                'Top Recommendations': truncateForExcel(pillarsResult.recommendations.slice(0, 3).join(' | '), 500)
            });
        }
    });
    if (pillarRows.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(pillarRows), "Money Page Pillars");
    }

    // === TAB 7: Hub-Spoke Metrics (if available) ===
    if (metrics && metrics.metrics) {
        const hubSpokeRows = metrics.metrics.hubSpoke.map(m => ({
            'Hub Topic': m.hubTitle,
            'Spoke Count': m.spokeCount,
            'Status': m.status
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hubSpokeRows), "Hub-Spoke Metrics");
    }

    // === TAB 8: Pillars & Strategy ===
    if (pillars) {
        const pillarRows = [{
            'Central Entity': pillars.centralEntity || '',
            'Source Context': truncateForExcel(pillars.sourceContext, 1000),
            'Central Search Intent': pillars.centralSearchIntent || '',
            'Primary Verb': pillars.primary_verb || '',
            'Auxiliary Verb': pillars.auxiliary_verb || ''
        }];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(pillarRows), "SEO Pillars");
    }

    // === TAB 9: Foundation Pages ===
    if (input.foundationPages && input.foundationPages.length > 0) {
        const foundationRows = input.foundationPages.map(page => ({
            'Page Type': page.page_type,
            'Title': page.title,
            'Slug': page.slug,
            'Meta Description': truncateForExcel(page.meta_description, 300),
            'H1 Template': page.h1_template || '',
            'Schema Type': page.schema_type || '',
            'Status': page.status || 'draft',
            'Sections': page.sections?.map(s => s.heading).join(', ') || ''
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(foundationRows), "Foundation Pages");
    }

    // === TAB 10: NAP Data ===
    if (input.napData) {
        const napRows = [{
            'Company Name': input.napData.company_name || '',
            'Primary Address': input.napData.address || '',
            'Phone': input.napData.phone || '',
            'Email': input.napData.email || '',
            'Founded Year': input.napData.founded_year || ''
        }];
        // Add additional locations if present
        if (input.napData.locations && input.napData.locations.length > 0) {
            input.napData.locations.forEach((loc, idx) => {
                napRows.push({
                    'Company Name': `Location ${idx + 1}: ${loc.name}`,
                    'Primary Address': loc.address,
                    'Phone': loc.phone,
                    'Email': loc.email || '',
                    'Founded Year': loc.is_headquarters ? '(Headquarters)' : ''
                });
            });
        }
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(napRows), "NAP Data");
    }

    // === TAB 11: Navigation Structure ===
    if (input.navigation) {
        const navRows: any[] = [];
        // Header links
        input.navigation.header.primary_nav.forEach((link, idx) => {
            navRows.push({
                'Location': 'Header',
                'Order': idx + 1,
                'Text': link.text,
                'Prominence': link.prominence || 'medium',
                'Target Type': link.target_topic_id ? 'Topic' : link.target_foundation_page_id ? 'Foundation Page' : 'External',
                'Target ID/URL': link.target_topic_id || link.target_foundation_page_id || link.external_url || '',
                'Section': ''
            });
        });
        // CTA button
        if (input.navigation.header.cta_button) {
            navRows.push({
                'Location': 'Header CTA',
                'Order': 0,
                'Text': input.navigation.header.cta_button.text,
                'Prominence': 'high',
                'Target Type': 'CTA',
                'Target ID/URL': input.navigation.header.cta_button.url || '',
                'Section': ''
            });
        }
        // Footer sections
        input.navigation.footer.sections.forEach((section, sIdx) => {
            section.links.forEach((link, idx) => {
                navRows.push({
                    'Location': 'Footer',
                    'Order': idx + 1,
                    'Text': link.text,
                    'Prominence': link.prominence || 'low',
                    'Target Type': link.target_topic_id ? 'Topic' : link.target_foundation_page_id ? 'Foundation Page' : 'External',
                    'Target ID/URL': link.target_topic_id || link.target_foundation_page_id || link.external_url || '',
                    'Section': section.heading
                });
            });
        });
        // Legal links
        input.navigation.footer.legal_links.forEach((link, idx) => {
            navRows.push({
                'Location': 'Footer Legal',
                'Order': idx + 1,
                'Text': link.text,
                'Prominence': 'low',
                'Target Type': link.target_foundation_page_id ? 'Foundation Page' : 'External',
                'Target ID/URL': link.target_foundation_page_id || link.external_url || '',
                'Section': 'Legal'
            });
        });
        if (navRows.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(navRows), "Navigation");
        }
    }

    // === TAB 12: Brand Kit ===
    if (input.brandKit) {
        const brandRows = [{
            'Primary Color': input.brandKit.colors?.primary || '',
            'Secondary Color': input.brandKit.colors?.secondary || '',
            'Text on Image Color': input.brandKit.colors?.textOnImage || '',
            'Heading Font': input.brandKit.fonts?.heading || '',
            'Body Font': input.brandKit.fonts?.body || '',
            'Logo Placement': input.brandKit.logoPlacement || '',
            'Logo Opacity': input.brandKit.logoOpacity || '',
            'Copyright Holder': input.brandKit.copyright?.holder || '',
            'License URL': input.brandKit.copyright?.licenseUrl || '',
            'Hero Templates': input.brandKit.heroTemplates?.map(t => t.name).join(', ') || ''
        }];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(brandRows), "Brand Kit");
    }

    // === TAB 13: Semantic Triples (EAVs) ===
    if (input.eavs && input.eavs.length > 0) {
        const eavRows = input.eavs.map(eav => ({
            'Subject': eav.subject?.label || '',
            'Subject Type': eav.subject?.type || '',
            'Predicate (Relation)': eav.predicate?.relation || '',
            'Category': eav.predicate?.category || '',
            'Classification': eav.predicate?.classification || '',
            'Object (Value)': String(eav.object?.value || ''),
            'Object Type': eav.object?.type || '',
            'Synonyms': eav.lexical?.synonyms?.join(', ') || '',
            'Antonyms': eav.lexical?.antonyms?.join(', ') || '',
            // KP Metadata
            'KP Eligible': eav.kpMetadata?.isKPEligible ? 'Yes' : 'No',
            'KP Consensus Score': eav.kpMetadata?.consensusScore ?? '',
            'Seeds Confirmed': eav.kpMetadata?.seedSourcesConfirmed?.join(', ') || '',
            'Seeds Required': eav.kpMetadata?.seedSourcesRequired?.join(', ') || '',
            'Generated Statement': eav.kpMetadata?.generatedStatement || ''
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(eavRows), "Semantic Triples");

        // === TAB 13b: KP-Eligible EAVs Summary ===
        const kpEavs = input.eavs.filter(e => e.kpMetadata?.isKPEligible);
        if (kpEavs.length > 0) {
            const kpRows = kpEavs.map(eav => ({
                'Statement': eav.kpMetadata?.generatedStatement || `${eav.subject?.label || ''} ${eav.predicate?.relation || ''}: ${eav.object?.value || ''}`,
                'Subject': eav.subject?.label || '',
                'Category': eav.predicate?.category || 'COMMON',
                'Consensus Score': eav.kpMetadata?.consensusScore ?? 0,
                'Seeds Confirmed': (eav.kpMetadata?.seedSourcesConfirmed?.length || 0),
                'Seeds Required': (eav.kpMetadata?.seedSourcesRequired?.length || 0),
                'Sources Confirmed': eav.kpMetadata?.seedSourcesConfirmed?.join(', ') || '',
                'Sources Required': eav.kpMetadata?.seedSourcesRequired?.join(', ') || ''
            }));
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(kpRows), "KP-Eligible EAVs");
        }
    }

    // === TAB 14: Enhanced Audit Metrics ===
    if (input.eavs && input.eavs.length > 0) {
        const semanticMetrics = calculateSemanticComplianceMetrics(input.eavs);
        const authorityMetrics = calculateAuthorityIndicators(input.eavs, topics.length);

        // Overview metrics
        const metricsOverviewRows = [{
            'Metric': 'Semantic Compliance Score',
            'Value': semanticMetrics.score,
            'Target': semanticMetrics.target,
            'Status': semanticMetrics.score >= semanticMetrics.target ? 'Target Met' : 'Below Target'
        }, {
            'Metric': 'EAV Coverage',
            'Value': semanticMetrics.eavCoverage,
            'Target': topics.length * 3, // 3 EAVs per topic target
            'Status': semanticMetrics.eavCoverage >= topics.length * 3 ? 'Good' : 'Needs Improvement'
        }, {
            'Metric': 'EAV Authority Score',
            'Value': authorityMetrics.eavAuthorityScore,
            'Target': 75,
            'Status': authorityMetrics.eavAuthorityScore >= 75 ? 'Strong' : 'Needs Improvement'
        }, {
            'Metric': 'Topical Depth Score',
            'Value': authorityMetrics.topicalDepthScore,
            'Target': 60,
            'Status': authorityMetrics.topicalDepthScore >= 60 ? 'Deep' : 'Shallow'
        }, {
            'Metric': 'UNIQUE EAVs',
            'Value': authorityMetrics.uniqueEavCount,
            'Target': Math.ceil(topics.length * 0.2), // 20% of topics
            'Status': authorityMetrics.uniqueEavCount > 0 ? 'Present' : 'Missing'
        }, {
            'Metric': 'ROOT EAVs',
            'Value': authorityMetrics.rootEavCount,
            'Target': Math.ceil(topics.length * 0.3),
            'Status': authorityMetrics.rootEavCount > 0 ? 'Present' : 'Missing'
        }, {
            'Metric': 'RARE EAVs',
            'Value': authorityMetrics.rareEavCount,
            'Target': Math.ceil(topics.length * 0.2),
            'Status': authorityMetrics.rareEavCount > 0 ? 'Present' : 'Missing'
        }, {
            'Metric': 'COMMON EAVs',
            'Value': authorityMetrics.commonEavCount,
            'Target': Math.ceil(topics.length * 0.3),
            'Status': authorityMetrics.commonEavCount > 0 ? 'Present' : 'Baseline'
        }];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(metricsOverviewRows), "Audit Metrics");

        // Category distribution
        const categoryRows = Object.entries(semanticMetrics.categoryDistribution).map(([category, count]) => ({
            'Category': category,
            'Count': count,
            'Percentage': input.eavs ? ((count / input.eavs.length) * 100).toFixed(1) + '%' : '0%',
            'Authority Weight': category === 'UNIQUE' ? 'Highest' : category === 'ROOT' ? 'High' : category === 'RARE' ? 'Medium' : 'Base'
        }));
        if (categoryRows.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categoryRows), "Category Distribution");
        }

        // Classification distribution
        const classificationRows = Object.entries(semanticMetrics.classificationDistribution).map(([classification, count]) => ({
            'Classification': classification,
            'Count': count,
            'Percentage': input.eavs ? ((count / input.eavs.length) * 100).toFixed(1) + '%' : '0%',
            'Description': getClassificationDescription(classification)
        }));
        if (classificationRows.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(classificationRows), "Classification Dist");
        }

        // Recommendations
        const recommendationRows = semanticMetrics.recommendations.map((rec, idx) => ({
            'Priority': idx + 1,
            'Recommendation': rec,
            'Category': 'Semantic Optimization'
        }));
        if (recommendationRows.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(recommendationRows), "Recommendations");
        }
    }

    // === TAB 15: Unified Audit Results ===
    if (input.unifiedAuditResult) {
        const auditResult = input.unifiedAuditResult;

        // Summary row
        const auditSummaryRows = [{
            'Overall Score': auditResult.overallScore,
            'Total Issues': auditResult.totalIssues,
            'Critical Issues': auditResult.criticalCount,
            'Warnings': auditResult.warningCount,
            'Suggestions': auditResult.suggestionCount,
            'Auto-Fixable': auditResult.autoFixableCount,
            'Run At': auditResult.runAt
        }];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(auditSummaryRows), "Audit Summary");

        // Category breakdown
        const categoryBreakdownRows = auditResult.categories.map(cat => ({
            'Category': cat.categoryName,
            'Score': cat.score,
            'Weight': cat.weight + '%',
            'Issues': cat.issueCount,
            'Auto-Fixable': cat.autoFixableCount
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categoryBreakdownRows), "Audit Categories");

        // All issues
        const allIssues = auditResult.categories.flatMap(cat =>
            cat.issues.map(issue => ({
                'Category': cat.categoryName,
                'Issue': issue.ruleName,
                'Severity': issue.severity,
                'Description': truncateForExcel(issue.message + (issue.details ? ` - ${issue.details}` : ''), 500),
                'Affected Items': issue.affectedItems?.slice(0, 5).join(', ') || '',
                'Auto-Fixable': issue.autoFixable ? 'Yes' : 'No',
                'Suggested Fix': truncateForExcel(issue.suggestedFix, 500)
            }))
        );
        if (allIssues.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(allIssues), "Audit Issues");
        }
    }

    // === TAB 16: Query Templates ===
    if (input.queryTemplates && input.queryTemplates.length > 0) {
        const templateRows = input.queryTemplates.map(template => ({
            'Template ID': template.id,
            'Name': template.name,
            'Pattern': template.pattern,
            'Category': template.category,
            'Search Intent': template.search_intent,
            'Placeholders': template.placeholders.map(p => p.name).join(', '),
            'Example Output': template.example_output || '',
            'Suggested Topic Class': template.suggested_topic_class || ''
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(templateRows), "Query Templates");
    }

    // === TAB 17: Expanded Template Results ===
    if (input.expandedTemplateResults && input.expandedTemplateResults.length > 0) {
        const expandedRows: any[] = [];
        input.expandedTemplateResults.forEach(result => {
            result.generated_queries.forEach((query, idx) => {
                expandedRows.push({
                    'Template': result.original_template.name,
                    'Generated Query': query,
                    'Variables': JSON.stringify(result.variable_combinations[idx] || {}),
                    'Generated Topic': result.generated_topics[idx]?.title || ''
                });
            });
        });
        if (expandedRows.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expandedRows), "Template Expansions");
        }
    }

    // Trigger Download
    XLSX.writeFile(workbook, `${filename}.${format}`);
};

// Helper function for classification descriptions
const getClassificationDescription = (classification: string): string => {
    const descriptions: Record<string, string> = {
        'TYPE': 'Defines what something is',
        'COMPONENT': 'Parts or elements of something',
        'BENEFIT': 'Advantages or positive outcomes',
        'RISK': 'Potential dangers or negatives',
        'PROCESS': 'How something works or is done',
        'SPECIFICATION': 'Technical details or measurements',
        'UNCLASSIFIED': 'Not yet categorized'
    };
    return descriptions[classification] || 'Unknown classification';
};

/**
 * Full Export ZIP - Contains all data in structured format
 */
interface FullExportInput {
    topics: EnrichedTopic[];
    briefs: Record<string, ContentBrief>;
    pillars: SEOPillars | undefined;
    metrics?: ValidationResult | null;
    businessInfo?: Partial<BusinessInfo>;
    mapName?: string;
    // NEW: Additional data for comprehensive export
    foundationPages?: FoundationPage[];
    napData?: NAPData;
    navigation?: NavigationStructure | null;
    brandKit?: BrandKit;
    eavs?: SemanticTriple[];
    // Enhanced metrics
    unifiedAuditResult?: UnifiedAuditResult | null;
    // Query templates (Local SEO)
    queryTemplates?: QueryTemplate[];
    expandedTemplateResults?: ExpandedTemplateResult[];
}

/**
 * @deprecated Use generateEnhancedExport from enhancedExportUtils.ts instead.
 * This function is maintained for backward compatibility only.
 */
export const generateFullZipExport = async (input: FullExportInput, filename: string) => {
    const { topics, briefs, pillars, metrics, businessInfo, mapName } = input;
    const zip = new JSZip();

    // 1. Add Master Export as XLSX
    const masterRows = topics.map(topic => {
        const brief = briefs[topic.id];
        const blueprint = topic.blueprint;
        const bridgeData = brief?.contextualBridge;
        let bridgeLinks: ContextualBridgeLink[] = [];
        if (Array.isArray(bridgeData)) {
            bridgeLinks = bridgeData;
        } else if (bridgeData && typeof bridgeData === 'object' && 'links' in bridgeData) {
            bridgeLinks = bridgeData.links;
        }
        const spokeCount = topics.filter(t => t.parent_topic_id === topic.id).length;
        const metadata = topic.metadata || {};

        return {
            'Topic Title': topic.title,
            'Slug': topic.slug,
            'Type': topic.type,
            'Description': topic.description,
            'Canonical Query': metadata.canonical_query || '',
            'Query Type': metadata.query_type || '',
            'Has Brief': brief ? 'Yes' : 'No',
            'Has Draft': brief?.articleDraft ? 'Yes' : 'No',
            'Meta Description': brief?.metaDescription || '',
            'Outline': formatContextualVector(brief?.outline || '', brief?.structured_outline) || '',
            'Hub-Spoke Ratio': topic.type === 'core' ? `1:${spokeCount}` : 'N/A',
            'Parent ID': topic.parent_topic_id || 'ROOT'
        };
    });

    const masterWorksheet = XLSX.utils.json_to_sheet(masterRows);
    const masterWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(masterWorkbook, masterWorksheet, "Topics");
    const xlsxBuffer = XLSX.write(masterWorkbook, { type: 'array', bookType: 'xlsx' });
    zip.file('topics-master.xlsx', xlsxBuffer);

    // 2. Create folders and add content
    const articlesFolder = zip.folder('articles');
    const briefsFolder = zip.folder('briefs');

    // 3. Add article drafts as Markdown files
    Object.entries(briefs).forEach(([topicId, brief]) => {
        const topic = topics.find(t => t.id === topicId);
        const safeSlug = safeString(topic?.slug || topicId).replace(/[^a-z0-9-]/gi, '-');

        if (brief.articleDraft) {
            const mdContent = [
                `# ${safeString(brief.title)}`,
                '',
                `> **Meta Description:** ${safeString(brief.metaDescription)}`,
                '',
                '---',
                '',
                safeString(brief.articleDraft)
            ].join('\n');
            articlesFolder?.file(`${safeSlug}.md`, mdContent);
        }

        // Add brief as JSON
        const briefData = {
            title: brief.title,
            metaDescription: brief.metaDescription,
            slug: brief.slug,
            keyTakeaways: brief.keyTakeaways,
            outline: brief.outline,
            structured_outline: brief.structured_outline,
            perspectives: brief.perspectives,
            methodology_note: brief.methodology_note,
            featured_snippet_target: brief.featured_snippet_target,
            discourse_anchors: brief.discourse_anchors,
            contextualBridge: brief.contextualBridge,
            visual_semantics: brief.visual_semantics,
            serpAnalysis: brief.serpAnalysis
        };
        briefsFolder?.file(`${safeSlug}-brief.json`, JSON.stringify(briefData, null, 2));
    });

    // 4. Add project metadata
    const projectMeta = {
        exportDate: new Date().toISOString(),
        mapName: mapName || 'Topical Map',
        pillars: pillars,
        businessContext: {
            industry: businessInfo?.industry,
            targetMarket: businessInfo?.targetMarket,
            language: businessInfo?.language,
            seedKeyword: businessInfo?.seedKeyword
        },
        stats: {
            totalTopics: topics.length,
            coreTopics: topics.filter(t => t.type === 'core').length,
            outerTopics: topics.filter(t => t.type === 'outer').length,
            childTopics: topics.filter(t => t.type === 'child').length,
            briefsGenerated: Object.keys(briefs).length,
            draftsGenerated: Object.values(briefs).filter(b => b.articleDraft).length
        }
    };
    zip.file('project-metadata.json', JSON.stringify(projectMeta, null, 2));

    // 5. Add validation metrics if available
    if (metrics) {
        zip.file('validation-report.json', JSON.stringify(metrics, null, 2));
    }

    // 6. Add Foundation Pages
    if (input.foundationPages && input.foundationPages.length > 0) {
        const foundationFolder = zip.folder('foundation-pages');
        input.foundationPages.forEach(page => {
            const safeSlug = safeString(page.slug || page.page_type).replace(/[^a-z0-9-]/gi, '-');
            foundationFolder?.file(`${safeSlug}.json`, JSON.stringify({
                page_type: page.page_type,
                title: page.title,
                slug: page.slug,
                meta_description: page.meta_description,
                h1_template: page.h1_template,
                schema_type: page.schema_type,
                sections: page.sections,
                nap_data: page.nap_data,
                status: page.status
            }, null, 2));
        });
    }

    // 7. Add NAP Data
    if (input.napData) {
        zip.file('nap-data.json', JSON.stringify(input.napData, null, 2));
    }

    // 7b. Add Entity Identity (KP Strategy)
    if (businessInfo?.entityIdentity) {
        zip.file('entity-identity.json', JSON.stringify({
            legalName: businessInfo.entityIdentity.legalName,
            foundedYear: businessInfo.entityIdentity.foundedYear,
            headquartersLocation: businessInfo.entityIdentity.headquartersLocation,
            founderOrCEO: businessInfo.entityIdentity.founderOrCEO,
            founderCredential: businessInfo.entityIdentity.founderCredential,
            primaryAttribute: businessInfo.entityIdentity.primaryAttribute,
            secondaryAttributes: businessInfo.entityIdentity.secondaryAttributes,
            existingSeedSources: businessInfo.entityIdentity.existingSeedSources,
            brandSearchDemand: businessInfo.entityIdentity.brandSearchDemand
        }, null, 2));

        // Add KP Strategy Summary
        const kpSummary = {
            entityIdentityComplete: !!(
                businessInfo.entityIdentity.legalName &&
                businessInfo.entityIdentity.founderOrCEO &&
                businessInfo.entityIdentity.primaryAttribute
            ),
            seedSourcesStatus: {
                wikipedia: businessInfo.entityIdentity.existingSeedSources?.wikipedia ? 'claimed' : 'missing',
                wikidata: businessInfo.entityIdentity.existingSeedSources?.wikidata ? 'claimed' : 'missing',
                crunchbase: businessInfo.entityIdentity.existingSeedSources?.crunchbase ? 'claimed' : 'missing',
                linkedinCompany: businessInfo.entityIdentity.existingSeedSources?.linkedinCompany ? 'claimed' : 'missing',
                googleBusinessProfile: businessInfo.entityIdentity.existingSeedSources?.googleBusinessProfile ? 'claimed' : 'missing'
            },
            kpEligibleEavsCount: input.eavs?.filter(e => e.kpMetadata?.isKPEligible).length || 0
        };
        zip.file('kp-strategy-summary.json', JSON.stringify(kpSummary, null, 2));
    }

    // 8. Add Navigation Structure
    if (input.navigation) {
        zip.file('navigation.json', JSON.stringify({
            header: {
                logo_alt_text: input.navigation.header.logo_alt_text,
                primary_nav: input.navigation.header.primary_nav,
                cta_button: input.navigation.header.cta_button
            },
            footer: {
                sections: input.navigation.footer.sections,
                legal_links: input.navigation.footer.legal_links,
                nap_display: input.navigation.footer.nap_display,
                copyright_text: input.navigation.footer.copyright_text
            },
            settings: {
                max_header_links: input.navigation.max_header_links,
                max_footer_links: input.navigation.max_footer_links,
                dynamic_by_section: input.navigation.dynamic_by_section,
                sticky: input.navigation.sticky
            }
        }, null, 2));
    }

    // 9. Add Brand Kit
    if (input.brandKit) {
        zip.file('brand-kit.json', JSON.stringify(input.brandKit, null, 2));
    }

    // 10. Add Semantic Triples (EAVs)
    if (input.eavs && input.eavs.length > 0) {
        zip.file('semantic-triples.json', JSON.stringify(input.eavs, null, 2));
    }

    // 11. Add Enhanced Audit Metrics
    if (input.eavs && input.eavs.length > 0) {
        const semanticMetrics = calculateSemanticComplianceMetrics(input.eavs);
        const authorityMetrics = calculateAuthorityIndicators(input.eavs, topics.length);

        const enhancedMetrics = {
            generatedAt: new Date().toISOString(),
            semanticCompliance: {
                score: semanticMetrics.score,
                target: semanticMetrics.target,
                eavCoverage: semanticMetrics.eavCoverage,
                categoryDistribution: semanticMetrics.categoryDistribution,
                classificationDistribution: semanticMetrics.classificationDistribution,
                recommendations: semanticMetrics.recommendations
            },
            authorityIndicators: {
                eavAuthorityScore: authorityMetrics.eavAuthorityScore,
                uniqueEavCount: authorityMetrics.uniqueEavCount,
                rootEavCount: authorityMetrics.rootEavCount,
                rareEavCount: authorityMetrics.rareEavCount,
                commonEavCount: authorityMetrics.commonEavCount,
                topicalDepthScore: authorityMetrics.topicalDepthScore
            },
            summary: {
                totalTopics: topics.length,
                totalEavs: input.eavs.length,
                eavsPerTopic: topics.length > 0 ? (input.eavs.length / topics.length).toFixed(1) : '0',
                complianceStatus: semanticMetrics.score >= semanticMetrics.target ? 'Target Met' : 'Below Target'
            }
        };
        zip.file('enhanced-audit-metrics.json', JSON.stringify(enhancedMetrics, null, 2));
    }

    // 12. Add Unified Audit Results
    if (input.unifiedAuditResult) {
        zip.file('unified-audit-result.json', JSON.stringify(input.unifiedAuditResult, null, 2));
    }

    // 13. Add Enhanced Visual Semantics (Koray's "Pixels, Letters, Bytes" Framework)
    const visualSemanticsFolder = zip.folder('visual-semantics');
    topics.forEach(topic => {
        const brief = briefs[topic.id];
        if (brief?.enhanced_visual_semantics) {
            const safeSlug = safeString(topic.slug || topic.id).replace(/[^a-z0-9-]/gi, '-');
            visualSemanticsFolder?.file(`${safeSlug}-visual-specs.json`, JSON.stringify({
                topic_title: topic.title,
                topic_slug: topic.slug,
                visual_semantics: brief.enhanced_visual_semantics,
                export_data: exportVisualSemanticsData(brief.enhanced_visual_semantics)
            }, null, 2));
        }
    });

    // 14. Add Money Page 4 Pillars Analysis
    const monetizationTopics = topics.filter(t => shouldAnalyze4Pillars(t.topic_class) && briefs[t.id]);
    if (monetizationTopics.length > 0) {
        const pillarAnalysis = monetizationTopics.map(topic => {
            const brief = briefs[topic.id];
            const pillarsResult = calculateMoneyPagePillarsScore(brief);
            return {
                topic_title: topic.title,
                topic_slug: topic.slug,
                topic_class: topic.topic_class,
                pillars_analysis: pillarsResult
            };
        });
        zip.file('money-page-pillars.json', JSON.stringify({
            generatedAt: new Date().toISOString(),
            totalMonetizationTopics: monetizationTopics.length,
            averageScore: pillarAnalysis.reduce((sum, p) => sum + p.pillars_analysis.overall_score, 0) / pillarAnalysis.length,
            topics: pillarAnalysis
        }, null, 2));
    }

    // 15. Add Query Templates
    if (input.queryTemplates && input.queryTemplates.length > 0) {
        zip.file('query-templates.json', JSON.stringify({
            templates: input.queryTemplates,
            totalTemplates: input.queryTemplates.length
        }, null, 2));
    }

    // 16. Add Expanded Template Results
    if (input.expandedTemplateResults && input.expandedTemplateResults.length > 0) {
        zip.file('template-expansions.json', JSON.stringify({
            generatedAt: new Date().toISOString(),
            expansions: input.expandedTemplateResults,
            totalGeneratedQueries: input.expandedTemplateResults.reduce(
                (sum, r) => sum + r.generated_queries.length, 0
            )
        }, null, 2));
    }

    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
