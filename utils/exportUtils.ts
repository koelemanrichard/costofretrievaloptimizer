
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { EnrichedTopic, ContentBrief, SEOPillars, ValidationResult, ContextualBridgeLink, BriefSection, BusinessInfo, FoundationPage, NAPData, NavigationStructure, BrandKit, SemanticTriple } from '../types';
import { safeString } from './parsers';

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

export const generateMasterExport = (input: ExportDataInput, format: 'csv' | 'xlsx', filename: string) => {
    const { topics, briefs, pillars, metrics } = input;

    const workbook = XLSX.utils.book_new();

    // === TAB 1: Topics Master View ===
    const topicRows = topics.map(topic => {
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

        return {
            'Topic Title': topic.title,
            'Slug': topic.slug,
            'Type': topic.type,
            'Section': topic.topic_class === 'monetization' || topic.type === 'core' ? 'Core' : 'Author',
            'Description': truncateForExcel(topic.description, 500),
            'Canonical Query': getMeta('canonical_query', 'canonical_query'),
            'Query Type': getMeta('query_type', 'query_type'),
            'Has Brief': brief ? 'Yes' : 'No',
            'Has Draft': brief?.articleDraft ? 'Yes' : 'No',
            'Hub-Spoke Ratio': topic.type === 'core' ? `1:${spokeCount}` : 'N/A',
            'Parent ID': topic.parent_topic_id || 'ROOT',
            'Topic ID': topic.id
        };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(topicRows), "Topics");

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

    // === TAB 6: Visual Semantics ===
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
            'Antonyms': eav.lexical?.antonyms?.join(', ') || ''
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(eavRows), "Semantic Triples");
    }

    // Trigger Download
    XLSX.writeFile(workbook, `${filename}.${format}`);
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
}

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
