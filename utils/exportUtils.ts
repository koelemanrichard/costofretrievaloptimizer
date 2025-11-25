
import * as XLSX from 'xlsx';
import { EnrichedTopic, ContentBrief, SEOPillars, ValidationResult, ContextualBridgeLink, BriefSection } from '../types';
import { safeString } from './parsers';

interface ExportDataInput {
    topics: EnrichedTopic[];
    briefs: Record<string, ContentBrief>;
    pillars: SEOPillars | undefined;
    metrics?: ValidationResult | null;
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

export const generateMasterExport = (input: ExportDataInput, format: 'csv' | 'xlsx', filename: string) => {
    const { topics, briefs, pillars, metrics } = input;

    // Flatten data into "Master View" rows
    const rows = topics.map(topic => {
        const brief = briefs[topic.id];
        const blueprint = topic.blueprint;
        
        // Handle Contextual Bridge (Array vs Object legacy issue)
        const bridgeData = brief?.contextualBridge;
        let bridgeLinks: ContextualBridgeLink[] = [];
        if (Array.isArray(bridgeData)) {
            bridgeLinks = bridgeData;
        } else if (bridgeData && typeof bridgeData === 'object' && 'links' in bridgeData) {
            bridgeLinks = bridgeData.links;
        }

        // Calculate Hub-Spoke Ratio (naive calculation based on direct children)
        const spokeCount = topics.filter(t => t.parent_topic_id === topic.id).length;
        
        // Format Interlinking Strategy
        const formattedLinks = bridgeLinks.length > 0 
            ? bridgeLinks.map(l => `[${l.anchorText}] -> ${l.targetTopic} (Hint: ${l.annotation_text_hint || 'N/A'})`).join(' | ')
            : (blueprint?.interlinking_strategy || '');

        // Metadata Extraction - Defensive Check
        // Check both the root topic properties (where parsers might put them) and the nested metadata object
        const metadata = topic.metadata || {};
        
        const getMeta = (key: string, rootKey?: keyof EnrichedTopic) => {
            // Priority 1: Root property (if exists and is truthy)
            if (rootKey && (topic as any)[rootKey]) return (topic as any)[rootKey];
            // Priority 2: Nested metadata property
            if (metadata[key]) return metadata[key];
            return '';
        };

        return {
            // I. Foundational Components & Node Identification
            'Central Entity (CE)': pillars?.centralEntity || '',
            'Topical Map Section': topic.topic_class === 'monetization' || topic.type === 'core' ? 'Core Section (CS)' : 'Author Section (AS)',
            'Attribute (Subtopic)': getMeta('attribute_focus', 'attribute_focus'),
            'Target Query Network': (topic.query_network || metadata.query_network || []).join(', '),
            'Canonical Query (CQ)': getMeta('canonical_query', 'canonical_query'),
            'Query Type': getMeta('query_type', 'query_type'),

            // II. Content Structure
            'Macro Context / H1': topic.title,
            'Contextual Vector (Outline)': formatContextualVector(brief?.outline || '', brief?.structured_outline) || blueprint?.contextual_vector || '',
            'Contextual Hierarchy': calculateHierarchyDepth(brief?.structured_outline),
            'Article Methodology': brief?.methodology_note || blueprint?.methodology || '', 
            'Subordinate Text Hint': (brief?.structured_outline && brief.structured_outline.length > 0) 
                ? brief.structured_outline.map(s => `${s.heading}: ${s.subordinate_text_hint}`).join('\n')
                : (blueprint?.subordinate_hint || ''),
            'Image Alt Text': brief?.visuals?.imageAltText || `${topic.title} - ${pillars?.centralEntity || ''}`,
            'URL Hint': getMeta('url_slug_hint', 'url_slug_hint'),
            'Perspective Requirement': (brief?.perspectives && brief.perspectives.length > 0) ? brief.perspectives.join(', ') : (blueprint?.perspective || ''),
            
            // III. Interlinking
            'Interlinking Strategy': formattedLinks,
            'Anchor Text': bridgeLinks.length > 0 ? bridgeLinks.map(l => l.anchorText).join(', ') : (blueprint?.anchor_text || ''),
            'Annotation Text Hints': bridgeLinks.length > 0 ? bridgeLinks.map(l => l.annotation_text_hint || '').filter(Boolean).join(' | ') : (blueprint?.annotation_hint || ''),
            'Contextual Bridge Link': JSON.stringify(bridgeLinks), 

            // IV. Logistics & Metrics
            'Publication Date': getMeta('planned_publication_date', 'planned_publication_date'),
            'Hub-Spoke Ratio': topic.type === 'core' ? `1:${spokeCount}` : 'N/A',
            'Semantic Compliance Score': 'Pending Audit', 
            'Context Coherence Score': 'Pending Audit', 
            'Topical Borders Note': getMeta('topical_border_note', 'topical_border_note'),
            
            // Technical / System
            'Slug': topic.slug,
            'Topic ID': topic.id,
            'Parent ID': topic.parent_topic_id || 'ROOT'
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Master View");

    // Optional: Add a separate sheet for Metrics if available
    if (metrics && metrics.metrics) {
        const hubSpokeRows = metrics.metrics.hubSpoke.map(m => ({
            'Hub Topic': m.hubTitle,
            'Spoke Count': m.spokeCount,
            'Status': m.status
        }));
        const hubWorksheet = XLSX.utils.json_to_sheet(hubSpokeRows);
        XLSX.utils.book_append_sheet(workbook, hubWorksheet, "Hub-Spoke Metrics");
    }

    // Trigger Download
    XLSX.writeFile(workbook, `${filename}.${format}`);
};
