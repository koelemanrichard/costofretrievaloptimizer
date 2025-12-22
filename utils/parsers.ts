
import { TopicalMap, SEOPillars, BusinessInfo, ContentBrief, EnrichedTopic, FreshnessProfile, SemanticTriple, Project, ContextualBridgeLink, ContextualBridgeSection, BriefSection, TopicBlueprint, AttributeCategory, AttributeClass, VisualSemantics, FeaturedSnippetTarget, AuthorProfile, StylometryType, SiteInventoryItem, TransitionStatus, ActionType, SectionType } from '../types';
import { SupabaseClient } from '@supabase/supabase-js';

// Type aliases for improved readability in parsing functions
// These accept unknown data from external sources (DB, AI, user input)
type UnknownRecord = Record<string, unknown>;
type UnknownArray = unknown[];

/**
 * Converts any value to a safe string.
 * - Strings remain strings.
 * - Numbers become string representations.
 * - Objects/Arrays are JSON.stringified (prevents Error #31).
 * - Null/Undefined become empty strings.
 */
export const safeString = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return '';
        }
    }
    return String(value);
};

/**
 * Ensures a value is an array. Returns empty array if not.
 * Now enhanced to try parsing stringified JSON arrays (common AI artifact).
 */
export const safeArray = <T>(value: unknown): T[] => {
    if (Array.isArray(value)) return value;
    
    // Handle stringified JSON arrays (e.g. "['a', 'b']" returned by AI or DB)
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                // Parsing failed, fall through to return empty array
            }
        }
    }
    
    return [];
};

/**
 * Safely handles RPC responses that might be returned as `[T]` or `T`.
 * Returns T or throws if empty.
 */
export const normalizeRpcData = <T>(data: unknown): T => {
    if (!data) {
        throw new Error("Operation returned no data.");
    }
    if (Array.isArray(data)) {
        if (data.length === 0) throw new Error("Operation returned empty result.");
        return data[0];
    }
    return data;
};

/**
 * Parses raw JSON into a strictly typed SEOPillars object.
 * Ensures all fields are strings, preventing object-injection crashes.
 */
export const parsePillars = (json: any): SEOPillars => {
    const safeJson = json && typeof json === 'object' ? json : {};
    return {
        centralEntity: safeString(safeJson.centralEntity),
        sourceContext: safeString(safeJson.sourceContext),
        centralSearchIntent: safeString(safeJson.centralSearchIntent),
        // Holistic SEO
        primary_verb: safeJson.primary_verb ? safeString(safeJson.primary_verb) : undefined,
        auxiliary_verb: safeJson.auxiliary_verb ? safeString(safeJson.auxiliary_verb) : undefined,
    };
};

const parseAuthorProfile = (json: any): AuthorProfile | undefined => {
    if (!json || typeof json !== 'object') return undefined;
    
    const stylometry = safeString(json.stylometry);
    const validStylometry: StylometryType = 
        (['ACADEMIC_FORMAL', 'DIRECT_TECHNICAL', 'PERSUASIVE_SALES', 'INSTRUCTIONAL_CLEAR'].includes(stylometry)) 
        ? stylometry as StylometryType 
        : 'INSTRUCTIONAL_CLEAR';

    return {
        name: safeString(json.name),
        bio: safeString(json.bio),
        credentials: safeString(json.credentials),
        socialUrls: safeArray(json.socialUrls).map(safeString),
        stylometry: validStylometry,
        customStylometryRules: safeArray(json.customStylometryRules).map(safeString)
    };
};

/**
 * Parses raw JSON into a strictly typed BusinessInfo object (partial).
 * Prevents nested objects in string fields.
 */
export const parseBusinessInfo = (json: any): Partial<BusinessInfo> => {
     const safeJson = json && typeof json === 'object' ? json : {};
     // We create a new object to strip out any unknown/malformed keys if necessary,
     // or just pass through safe types.
     return {
         ...safeJson,
         domain: safeString(safeJson.domain),
         projectName: safeString(safeJson.projectName),
         seedKeyword: safeString(safeJson.seedKeyword),
         aiProvider: safeString(safeJson.aiProvider) as any,
         aiModel: safeString(safeJson.aiModel),
         
         // Holistic SEO
         uniqueDataAssets: safeJson.uniqueDataAssets ? safeString(safeJson.uniqueDataAssets) : undefined,
         authorName: safeJson.authorName ? safeString(safeJson.authorName) : undefined,
         authorBio: safeJson.authorBio ? safeString(safeJson.authorBio) : undefined,
         authorCredentials: safeJson.authorCredentials ? safeString(safeJson.authorCredentials) : undefined,
         socialProfileUrls: safeArray(safeJson.socialProfileUrls),
         
         // Structured Authorship
         authorProfile: parseAuthorProfile(safeJson.authorProfile),
     };
};

/**
 * Parses raw JSON into a strictly typed SemanticTriple array.
 */
export const parseEavs = (json: any): SemanticTriple[] => {
    const rawArray = safeArray(json); // Use safeArray to handle potential stringified inputs

    return rawArray.map((item: any) => {
        if (!item || typeof item !== 'object') return null;

        // DEFENSIVE: Skip malformed triples that lack required structure
        // These cause crashes in components like RequirementsRail
        if (!item.subject || typeof item.subject !== 'object') return null;
        if (!item.object || typeof item.object !== 'object') return null;

        // Also skip if the essential values are missing
        const subjectLabel = safeString(item.subject?.label);
        const objectValue = safeString(item.object?.value);
        if (!subjectLabel && !objectValue) return null; // Triple has no meaningful data

        return {
            subject: {
                label: subjectLabel,
                type: safeString(item.subject?.type)
            },
            predicate: {
                relation: safeString(item.predicate?.relation),
                type: safeString(item.predicate?.type),
                category: item.predicate?.category ? safeString(item.predicate?.category) as AttributeCategory : undefined,
                classification: item.predicate?.classification ? safeString(item.predicate?.classification) as AttributeClass : undefined,
            },
            object: {
                value: objectValue,
                type: safeString(item.object?.type),
                unit: item.object?.unit ? safeString(item.object?.unit) : undefined,
                truth_range: item.object?.truth_range ? safeString(item.object?.truth_range) : undefined,
            }
        } as SemanticTriple;
    }).filter((item): item is SemanticTriple => item !== null);
};

/**
 * Transforms a raw database row into a safe Project object.
 */
export const parseProject = (data: any): Project => {
    if (!data || typeof data !== 'object') {
        throw new Error("Invalid project data source");
    }
    return {
        id: safeString(data.id),
        project_name: safeString(data.project_name),
        domain: safeString(data.domain),
        created_at: safeString(data.created_at)
    };
};

/**
 * Transforms a raw database row into a safe TopicalMap object.
 * Applies parsers to JSON columns.
 */
export const parseTopicalMap = (data: any): TopicalMap => {
    if (!data || typeof data !== 'object') {
        throw new Error("Invalid map data source");
    }
    
    return {
        id: safeString(data.id),
        project_id: safeString(data.project_id),
        name: safeString(data.name),
        created_at: safeString(data.created_at),
        user_id: safeString(data.user_id || ''), 
        
        // Sanitized JSON fields
        business_info: parseBusinessInfo(data.business_info),
        pillars: parsePillars(data.pillars),
        eavs: parseEavs(data.eavs), 
        competitors: safeArray(data.competitors),
        
        // Parse the new analysis cache
        analysis_state: data.analysis_state && typeof data.analysis_state === 'object' ? data.analysis_state : {},
        
        // Default fields must be undefined to trigger data fetching in hooks
        topics: undefined,
        briefs: undefined
    } as TopicalMap;
};

/**
 * Parses a generic object into a TopicBlueprint, ensuring types.
 */
const parseBlueprint = (json: any): TopicBlueprint | undefined => {
    if (!json || typeof json !== 'object') return undefined;
    return {
        contextual_vector: safeString(json.contextual_vector),
        methodology: safeString(json.methodology),
        subordinate_hint: safeString(json.subordinate_hint),
        perspective: safeString(json.perspective),
        interlinking_strategy: safeString(json.interlinking_strategy),
        anchor_text: safeString(json.anchor_text),
        annotation_hint: safeString(json.annotation_hint),
        image_alt_text: json.image_alt_text ? safeString(json.image_alt_text) : undefined
    };
};

/**
 * Transforms a raw database row into a safe EnrichedTopic object.
 * Extracts flattened properties from the 'metadata' JSONB column.
 */
export const sanitizeTopicFromDb = (dbTopic: any): EnrichedTopic => {
    // The parser needs to be robust enough to handle two scenarios:
    // 1. A raw DB row where metadata is nested in a JSONB column.
    // 2. An existing application object where metadata is already flattened (in-memory state).
    
    const metadata = dbTopic.metadata && typeof dbTopic.metadata === 'object' ? dbTopic.metadata : {};
    
    // We check the metadata object first (DB source of truth), then fallback to the root object (App state source of truth)
    // This prevents data loss when passing an object through the parser multiple times.
    
    return {
        id: safeString(dbTopic.id),
        map_id: safeString(dbTopic.map_id),
        parent_topic_id: dbTopic.parent_topic_id ? safeString(dbTopic.parent_topic_id) : null,
        display_parent_id: dbTopic.display_parent_id ? safeString(dbTopic.display_parent_id) : null,
        title: safeString(dbTopic.title),
        slug: safeString(dbTopic.slug),
        description: safeString(dbTopic.description),
        type: dbTopic.type === 'core' ? 'core' : (dbTopic.type === 'child' ? 'child' : 'outer'),
        freshness: (dbTopic.freshness as FreshnessProfile) || FreshnessProfile.STANDARD,
        
        // Holistic SEO Metadata Extraction
        topic_class: metadata.topic_class || dbTopic.topic_class || 'informational', 
        cluster_role: metadata.cluster_role || dbTopic.cluster_role,
        attribute_focus: metadata.attribute_focus || dbTopic.attribute_focus,
        canonical_query: (metadata.canonical_query || dbTopic.canonical_query) ? safeString(metadata.canonical_query || dbTopic.canonical_query) : undefined,
        decay_score: typeof metadata.decay_score === 'number' ? metadata.decay_score : (typeof dbTopic.decay_score === 'number' ? dbTopic.decay_score : undefined),
        
        // New Schema Gap Fill Fields - Prioritize metadata for source of truth
        query_network: safeArray(metadata.query_network || dbTopic.query_network),
        topical_border_note: (metadata.topical_border_note || dbTopic.topical_border_note) ? safeString(metadata.topical_border_note || dbTopic.topical_border_note) : undefined,
        planned_publication_date: (metadata.planned_publication_date || dbTopic.planned_publication_date) ? safeString(metadata.planned_publication_date || dbTopic.planned_publication_date) : undefined,
        url_slug_hint: (metadata.url_slug_hint || dbTopic.url_slug_hint) ? safeString(metadata.url_slug_hint || dbTopic.url_slug_hint) : undefined,
        query_type: (metadata.query_type || dbTopic.query_type) ? safeString(metadata.query_type || dbTopic.query_type) : undefined,

        // Blueprint extraction
        blueprint: parseBlueprint(metadata.blueprint),

        // Generic metadata container
        metadata: metadata,
    } as EnrichedTopic;
};

const parseVisualSemantics = (data: any): VisualSemantics[] => {
    const raw = safeArray(data);
    return raw.map((item: any) => ({
        type: (item.type === 'INFOGRAPHIC' || item.type === 'CHART' || item.type === 'PHOTO' || item.type === 'DIAGRAM') ? item.type : 'PHOTO',
        description: safeString(item.description),
        caption_data: safeString(item.caption_data),
        height_hint: item.height_hint ? safeString(item.height_hint) : undefined,
        width_hint: item.width_hint ? safeString(item.width_hint) : undefined
    }));
};

const parseFeaturedSnippetTarget = (data: any): FeaturedSnippetTarget | undefined => {
    if (!data || typeof data !== 'object') return undefined;
    return {
        question: safeString(data.question),
        answer_target_length: typeof data.answer_target_length === 'number' ? data.answer_target_length : 40,
        required_predicates: safeArray(data.required_predicates).map(safeString),
        target_type: (data.target_type === 'LIST' || data.target_type === 'TABLE') ? data.target_type : 'PARAGRAPH'
    };
};

/**
 * Transforms a raw database row (or any object) into a safe ContentBrief object.
 * Crucially, this sanitizes `keyTakeaways` and `outline` to prevent React Error #31.
 */
export const sanitizeBriefFromDb = (dbBrief: any): ContentBrief => {
    const sanitizeStringArray = (arr: any): string[] => {
        const raw = safeArray(arr); // Handle stringified arrays
        return raw.map((item: any) => {
             if (typeof item === 'string') return item;
             if (item === null || item === undefined) return '';
             // THE FIX for Error #31: If it's an object, stringify it. Never let an object pass as a string.
             if (typeof item === 'object') {
                 try { return JSON.stringify(item); } catch { return ''; }
             }
             return String(item);
        }).filter((s: string) => s !== '');
    };
    
    // Helper to safely parse JSON columns that might be returned as objects or strings by Supabase
    const safeJson = (val: any, fallback: any) => {
        if (!val) return fallback;
        if (typeof val === 'string') {
             try { return JSON.parse(val); } catch { return fallback; }
        }
        return val;
    }
    
    // Helper for contextualBridge which can be Array OR Object now
    const parseContextualBridge = (data: any): ContextualBridgeLink[] | ContextualBridgeSection => {
        if (!data) return [];
        if (Array.isArray(data)) {
            // Map array to include annotation_text_hint safety
            return data.map((link: any) => ({
                targetTopic: safeString(link.targetTopic),
                anchorText: safeString(link.anchorText),
                annotation_text_hint: link.annotation_text_hint ? safeString(link.annotation_text_hint) : undefined,
                reasoning: safeString(link.reasoning)
            })) as ContextualBridgeLink[];
        }
        if (typeof data === 'object' && data.type === 'section') {
            return {
                type: 'section',
                content: safeString(data.content),
                links: safeArray(data.links).map((link: any) => ({
                    targetTopic: safeString(link.targetTopic),
                    anchorText: safeString(link.anchorText),
                    annotation_text_hint: link.annotation_text_hint ? safeString(link.annotation_text_hint) : undefined,
                    reasoning: safeString(link.reasoning)
                }))
            } as ContextualBridgeSection;
        }
        return []; // Fallback to empty array
    };
    
    const parseStructuredOutline = (data: any): BriefSection[] => {
        const raw = safeArray(data); // Handle stringified arrays
        return raw.map((item: any, index: number) => ({
            // Core fields
            key: item.key || `section-${index}-${Date.now()}`,
            heading: safeString(item.heading),
            level: typeof item.level === 'number' ? item.level : 2,
            subordinate_text_hint: safeString(item.subordinate_text_hint),
            methodology_note: item.methodology_note ? safeString(item.methodology_note) : undefined,
            // Holistic SEO fields
            format_code: item.format_code || 'PROSE',
            attribute_category: item.attribute_category || 'COMMON',
            content_zone: item.content_zone || 'MAIN',
            required_phrases: Array.isArray(item.required_phrases) ? item.required_phrases : [],
            anchor_texts: Array.isArray(item.anchor_texts) ? item.anchor_texts.map((a: any) => ({
                phrase: safeString(a.phrase),
                target_topic_id: a.target_topic_id ? safeString(a.target_topic_id) : undefined
            })) : []
        }));
    };

    return {
        id: safeString(dbBrief.id),
        topic_id: safeString(dbBrief.topic_id),
        title: safeString(dbBrief.title),
        slug: '', // Not persisted in brief table currently, default to empty
        metaDescription: safeString(dbBrief.meta_description),
        keyTakeaways: sanitizeStringArray(dbBrief.key_takeaways),
        articleDraft: dbBrief.article_draft ? safeString(dbBrief.article_draft) : undefined,
        
        outline: safeString(dbBrief.outline), 
        serpAnalysis: safeJson(dbBrief.serp_analysis, { peopleAlsoAsk: [], competitorHeadings: [] }), 
        visuals: safeJson(dbBrief.visuals, { featuredImagePrompt: '', imageAltText: '' }),
        contextualVectors: parseEavs(dbBrief.contextual_vectors),
        
        // Holistic SEO - Enhanced Bridge Parsing
        contextualBridge: parseContextualBridge(dbBrief.contextual_bridge),
        
        // New Holistic SEO Fields
        perspectives: safeArray(dbBrief.perspectives),
        methodology_note: dbBrief.methodology_note ? safeString(dbBrief.methodology_note) : undefined,
        structured_outline: parseStructuredOutline(dbBrief.structured_outline),
        
        structural_template_hash: dbBrief.structural_template_hash ? safeString(dbBrief.structural_template_hash) : undefined,
        
        predicted_user_journey: dbBrief.predicted_user_journey ? safeString(dbBrief.predicted_user_journey) : undefined,
        
        contentAudit: safeJson(dbBrief.content_audit, undefined), // Parse persisted audit report

        // New Holistic SEO Fields
        query_type_format: dbBrief.query_type_format ? safeString(dbBrief.query_type_format) : undefined,
        featured_snippet_target: parseFeaturedSnippetTarget(dbBrief.featured_snippet_target),
        visual_semantics: parseVisualSemantics(dbBrief.visual_semantics),
        discourse_anchors: sanitizeStringArray(dbBrief.discourse_anchors),
    };
};

/**
 * Transforms a raw database row into a safe SiteInventoryItem object.
 * Used by migration components for content auditing and transition workflows.
 */
export const sanitizeInventoryFromDb = (dbItem: any): SiteInventoryItem => {
    if (!dbItem || typeof dbItem !== 'object') {
        throw new Error("Invalid inventory data source");
    }

    // Validate status is a valid TransitionStatus
    const validStatuses: TransitionStatus[] = ['AUDIT_PENDING', 'GAP_ANALYSIS', 'ACTION_REQUIRED', 'IN_PROGRESS', 'OPTIMIZED'];
    const status = validStatuses.includes(dbItem.status) ? dbItem.status : 'AUDIT_PENDING';

    // Validate action is a valid ActionType
    const validActions: ActionType[] = ['KEEP', 'REWRITE', 'MERGE', 'REDIRECT_301', 'PRUNE_410', 'CANONICALIZE'];
    const action = dbItem.action && validActions.includes(dbItem.action) ? dbItem.action : undefined;

    return {
        id: safeString(dbItem.id),
        project_id: safeString(dbItem.project_id),
        url: safeString(dbItem.url),
        title: safeString(dbItem.title),
        http_status: typeof dbItem.http_status === 'number' ? dbItem.http_status : 200,
        content_hash: dbItem.content_hash ? safeString(dbItem.content_hash) : undefined,
        word_count: typeof dbItem.word_count === 'number' ? dbItem.word_count : undefined,
        link_count: typeof dbItem.link_count === 'number' ? dbItem.link_count : undefined,
        dom_size: typeof dbItem.dom_size === 'number' ? dbItem.dom_size : undefined,
        ttfb_ms: typeof dbItem.ttfb_ms === 'number' ? dbItem.ttfb_ms : undefined,
        cor_score: typeof dbItem.cor_score === 'number' ? dbItem.cor_score : undefined,
        gsc_clicks: typeof dbItem.gsc_clicks === 'number' ? dbItem.gsc_clicks : undefined,
        gsc_impressions: typeof dbItem.gsc_impressions === 'number' ? dbItem.gsc_impressions : undefined,
        gsc_position: typeof dbItem.gsc_position === 'number' ? dbItem.gsc_position : undefined,
        index_status: dbItem.index_status ? safeString(dbItem.index_status) : undefined,
        striking_distance_keywords: safeArray(dbItem.striking_distance_keywords),
        mapped_topic_id: dbItem.mapped_topic_id ? safeString(dbItem.mapped_topic_id) : null,
        section: dbItem.section || undefined,
        status: status,
        action: action,
        created_at: safeString(dbItem.created_at || new Date().toISOString()),
        updated_at: safeString(dbItem.updated_at || new Date().toISOString()),
    };
};

/**
 * Repairs malformed contextual_vectors in content_briefs.
 * Call this from browser console or add to a Health Check utility.
 *
 * Usage:
 *   import { repairBriefsInMap } from './utils/parsers';
 *   await repairBriefsInMap(supabase, mapId);
 */
export const repairBriefsInMap = async (
    supabase: SupabaseClient,
    mapId: string
): Promise<{ repaired: number; skipped: number; errors: string[] }> => {
    const results = { repaired: 0, skipped: 0, errors: [] as string[] };

    // 1. Get all topic IDs for this map
    const { data: topics, error: topicError } = await supabase
        .from('topics')
        .select('id, title')
        .eq('map_id', mapId);

    if (topicError) {
        results.errors.push(`Failed to load topics: ${topicError.message}`);
        return results;
    }

    if (!topics || topics.length === 0) {
        return results;
    }

    const topicIds = topics.map((t: any) => t.id);

    // 2. Get all briefs for these topics
    const { data: briefs, error: briefError } = await supabase
        .from('content_briefs')
        .select('id, topic_id, contextual_vectors')
        .in('topic_id', topicIds);

    if (briefError) {
        results.errors.push(`Failed to load briefs: ${briefError.message}`);
        return results;
    }

    if (!briefs || briefs.length === 0) {
        return results;
    }

    // 3. Check and repair each brief
    for (const brief of briefs) {
        const vectors = brief.contextual_vectors;

        // Skip if already null/empty - nothing to repair
        if (!vectors || (Array.isArray(vectors) && vectors.length === 0)) {
            results.skipped++;
            continue;
        }

        // Check if vectors need repair (missing subject/object structure)
        let needsRepair = false;
        const repairedVectors: SemanticTriple[] = [];

        const rawArray = Array.isArray(vectors) ? vectors : [];
        for (const item of rawArray) {
            if (!item || typeof item !== 'object') {
                needsRepair = true;
                continue; // Skip invalid items
            }

            // Check if structure is valid
            if (!item.subject || !item.object || !item.predicate) {
                needsRepair = true;
                continue; // Skip malformed items
            }

            // Check nested structure
            if (typeof item.subject !== 'object' || typeof item.object !== 'object') {
                needsRepair = true;
                // Try to repair
                repairedVectors.push({
                    subject: {
                        label: safeString(item.subject?.label || item.subject || ''),
                        type: safeString(item.subject?.type || '')
                    },
                    predicate: {
                        relation: safeString(item.predicate?.relation || item.predicate || ''),
                        type: safeString(item.predicate?.type || ''),
                        category: item.predicate?.category as AttributeCategory || undefined,
                        classification: item.predicate?.classification as AttributeClass || undefined
                    },
                    object: {
                        value: safeString(item.object?.value || item.object || ''),
                        type: safeString(item.object?.type || ''),
                        unit: item.object?.unit ? safeString(item.object.unit) : undefined,
                        truth_range: item.object?.truth_range ? safeString(item.object.truth_range) : undefined
                    }
                });
            } else {
                // Structure looks valid, keep it
                repairedVectors.push({
                    subject: {
                        label: safeString(item.subject.label || ''),
                        type: safeString(item.subject.type || '')
                    },
                    predicate: {
                        relation: safeString(item.predicate.relation || ''),
                        type: safeString(item.predicate.type || ''),
                        category: item.predicate.category as AttributeCategory || undefined,
                        classification: item.predicate.classification as AttributeClass || undefined
                    },
                    object: {
                        value: safeString(item.object.value || ''),
                        type: safeString(item.object.type || ''),
                        unit: item.object.unit ? safeString(item.object.unit) : undefined,
                        truth_range: item.object.truth_range ? safeString(item.object.truth_range) : undefined
                    }
                });
            }
        }

        if (needsRepair) {
            // Update the brief in database
            const { error: updateError } = await supabase
                .from('content_briefs')
                .update({ contextual_vectors: repairedVectors })
                .eq('id', brief.id);

            if (updateError) {
                results.errors.push(`Failed to repair brief ${brief.id}: ${updateError.message}`);
            } else {
                results.repaired++;
                console.log(`[RepairBriefs] Repaired brief for topic ${brief.topic_id}`);
            }
        } else {
            results.skipped++;
        }
    }

    console.log(`[RepairBriefs] Complete. Repaired: ${results.repaired}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);
    return results;
};
