
import { BusinessInfo, ResponseCode, ContentBrief, EnrichedTopic, SEOPillars, KnowledgeGraph, ContentIntegrityResult, SchemaGenerationResult, AuditRuleResult, BriefVisualSemantics, StreamingProgressCallback } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { dispatchToProvider } from './providerDispatcher';
import * as prompts from '../../config/prompts';
import { AIResponseSanitizer } from '../aiResponseSanitizer';
import { analyzeImageRequirements } from '../visualSemanticsService';
import { shouldApplyMonetizationEnhancement, getMonetizationValidationRules } from './briefOptimization';
import React from 'react';

/**
 * Validate monetization brief meets minimum requirements
 * Logs warnings if critical fields are missing (won't block generation)
 */
const validateMonetizationBrief = (
    brief: Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>,
    dispatch: React.Dispatch<any>
): void => {
    const rules = getMonetizationValidationRules();
    const warnings: string[] = [];

    for (const rule of rules) {
        const value = rule.field.includes('.')
            ? rule.field.split('.').reduce((obj: any, key) => obj?.[key], brief)
            : (brief as any)[rule.field];

        if (!rule.rule(value)) {
            warnings.push(rule.message);
        }
    }

    if (warnings.length > 0) {
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'BriefGeneration',
                message: `Monetization brief missing recommended fields: ${warnings.join('; ')}`,
                status: 'warning',
                timestamp: Date.now()
            }
        });
    }
};

// --- Algorithmic Audit Helpers ---

const checkSubjectivity = (text: string): AuditRuleResult => {
    const regex = /\b(I|my|we|our) (think|feel|believe|opinion|hope|guess)\b/i;
    const matches = text.match(regex);
    if (matches) {
        return { 
            ruleName: "No Opinion / Subjectivity",
            isPassing: false, 
            details: `Found subjective language ('${matches[0]}'). Use declarative facts.`,
            affectedTextSnippet: matches[0],
            remediation: "Rewrite using objective language. Remove 'I think' or 'We believe'."
        };
    }
    return { ruleName: "No Opinion / Subjectivity", isPassing: true, details: "Tone is objective." };
};

const checkPronounDensity = (text: string, topicTitle: string): AuditRuleResult => {
    const pronouns = (text.match(/\b(it|they|he|she|this|that)\b/gi) || []).length;
    const wordCount = text.split(/\s+/).length;
    const ratio = wordCount > 0 ? pronouns / wordCount : 0;
    
    if (ratio > 0.05) {
        return { 
            ruleName: "Explicit Naming (No Pronouns)",
            isPassing: false, 
            details: `High pronoun density (${(ratio*100).toFixed(1)}%). Use explicit naming ("${topicTitle}") more often.`,
            remediation: `Replace 'it', 'they', or 'this' with the specific entity name ("${topicTitle}") to improve NER tracking.`
        };
    }
    return { ruleName: "Explicit Naming (No Pronouns)", isPassing: true, details: "Explicit naming usage is good." };
};

const checkLinkPositioning = (text: string): AuditRuleResult => {
    const paragraphs = text.split('\n\n');
    let prematureLinks = 0;
    let affectedSnippet = '';
    
    paragraphs.forEach(p => {
        const linkMatch = p.match(/\[([^\]]+)\]\(([^)]+)\)/);
        // Check if link appears in the first 20 characters of the paragraph
        if (linkMatch && linkMatch.index !== undefined && linkMatch.index < 20) {
            // Exclude list items which naturally start with links sometimes
            if (!p.trim().startsWith('-') && !p.trim().startsWith('*')) {
                prematureLinks++;
                if(!affectedSnippet) affectedSnippet = p.substring(0, 50) + "...";
            }
        }
    });
    
    if (prematureLinks > 0) {
        return { 
            ruleName: "Link Positioning (Post-Definition)",
            isPassing: false, 
            details: `Found ${prematureLinks} paragraphs starting with links.`,
            affectedTextSnippet: affectedSnippet,
            remediation: "Move the internal link to the second or third sentence. Define the concept first before linking away."
        };
    }
    return { ruleName: "Link Positioning (Post-Definition)", isPassing: true, details: "Link positioning is correct." };
};

const checkFirstSentencePrecision = (text: string): AuditRuleResult => {
    const lines = text.split('\n');
    let badSentences = 0;
    let sampleBadSentence = '';
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('##')) {
            // Find next non-empty line (the paragraph)
            let j = i + 1;
            while (j < lines.length && !lines[j].trim()) j++;
            
            if (j < lines.length) {
                const p = lines[j].trim();
                // Skip if it's a list or table
                if (p.startsWith('-') || p.startsWith('*') || p.startsWith('|')) continue;

                const firstSentence = p.split('.')[0];
                const words = firstSentence.split(/\s+/).length;
                
                // Check for definitive verbs
                const hasDefinitiveVerb = /\b(is|are|means|refers to|consists of|defines)\b/i.test(firstSentence);
                
                if (words > 35 || !hasDefinitiveVerb) {
                     badSentences++;
                     if (!sampleBadSentence) sampleBadSentence = firstSentence;
                }
            }
        }
    }
    
    if (badSentences > 0) {
        return { 
            ruleName: "First Sentence Precision",
            isPassing: false, 
            details: `Found ${badSentences} sections with weak first sentences (>35 words or missing definitive verb).`,
            affectedTextSnippet: sampleBadSentence,
            remediation: "Rewrite the first sentence to be a concise definition using verbs like 'is', 'are', or 'means'."
        };
    }
    return { ruleName: "First Sentence Precision", isPassing: true, details: "First sentences are precise." };
};

const checkQuestionProtection = (text: string): AuditRuleResult => {
    const lines = text.split('\n');
    let failedQuestions = 0;
    let sampleFailure = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Match headings that are questions
        if (line.match(/^(#{2,3})\s*(What|How|Why|When|Where|Who|Can|Does)\b.*\?$/i)) {
            // Find next non-empty content line
            let j = i + 1;
            while (j < lines.length && !lines[j].trim()) j++;

            if (j < lines.length) {
                const nextLine = lines[j].trim();
                const firstFiveWords = nextLine.split(/\s+/).slice(0, 5).join(' ').toLowerCase();
                // Definitive verbs expected in the start
                const hasDefinitiveStart = /\b(is|are|means|refers|consists|causes|allows)\b/.test(firstFiveWords);
                
                // "How to" often starts with "To [verb]" or "Start by"
                const hasProceduralStart = /\b(to|start|begin|use)\b/.test(firstFiveWords);

                if (!hasDefinitiveStart && !hasProceduralStart) {
                    failedQuestions++;
                    if (!sampleFailure) sampleFailure = `${line} -> ${nextLine.substring(0, 40)}...`;
                }
            }
        }
    }

    if (failedQuestions > 0) {
        return {
            ruleName: "Question Protection (Candidate Answer)",
            isPassing: false,
            details: `Found ${failedQuestions} questions where the immediate answer is delayed.`,
            affectedTextSnippet: sampleFailure,
            remediation: "Ensure the very first sentence after a question heading contains the direct answer or definition. Do not start with 'When looking at...'."
        };
    }
    return { ruleName: "Question Protection (Candidate Answer)", isPassing: true, details: "Questions are answered immediately." };
};

const checkListLogic = (text: string): AuditRuleResult => {
    const lines = text.split('\n');
    let weakLists = 0;
    let sampleFailure = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Detect start of a list
        if (line.match(/^(\-|\*|\d+\.)\s+/)) {
            // Check the previous non-empty line
            let j = i - 1;
            while (j >= 0 && !lines[j].trim()) j--;

            if (j >= 0) {
                const prevLine = lines[j].trim();
                // Check for colon or count
                const hasColon = prevLine.endsWith(':');
                const hasCount = /\b\d+\b/.test(prevLine) && /\b(steps|ways|factors|reasons|benefits|types|items)\b/i.test(prevLine);

                if (!hasColon && !hasCount && !prevLine.startsWith('#')) {
                    weakLists++;
                    if (!sampleFailure) sampleFailure = prevLine;
                }
            }
            // Skip the rest of this list to avoid counting every item
            while (i < lines.length && lines[i].trim().match(/^(\-|\*|\d+\.)\s+/)) i++;
        }
    }

    if (weakLists > 0) {
        return {
            ruleName: "List Logic Preamble",
            isPassing: false,
            details: `Found ${weakLists} lists without a definitive introductory sentence.`,
            affectedTextSnippet: sampleFailure,
            remediation: "Precede every list with a sentence ending in a colon ':' or stating the specific count (e.g., 'The 5 key factors are:')."
        };
    }
    return { ruleName: "List Logic Preamble", isPassing: true, details: "Lists have proper preambles." };
};

const checkSentenceDensity = (text: string): AuditRuleResult => {
    // Split by sentence delimiters roughly
    const sentences: string[] = text.match(/[^.!?]+[.!?]+/g) || [];
    let longSentences = 0;
    let sampleFailure = '';

    sentences.forEach(s => {
        const wordCount = s.split(/\s+/).length;
        // Check for overly complex sentences (compound clauses)
        const conjunctions = (s.match(/\b(and|but|or|however|although)\b/gi) || []).length;
        
        if (wordCount > 35 && conjunctions > 2) {
            longSentences++;
            if (!sampleFailure) sampleFailure = s.trim();
        }
    });

    if (longSentences > 0) {
        return {
            ruleName: "Linguistic Density (One Fact Per Sentence)",
            isPassing: false,
            details: `Found ${longSentences} overly complex sentences (long dependency tree).`,
            affectedTextSnippet: sampleFailure,
            remediation: "Split complex sentences. Adhere to 'One Fact Per Sentence'. Avoid multiple conjunctions."
        };
    }
    return { ruleName: "Linguistic Density (One Fact Per Sentence)", isPassing: true, details: "Sentence density is optimal." };
};

// --- Exported Services ---

export const suggestResponseCode = (
    businessInfo: BusinessInfo, topicTitle: string, dispatch: React.Dispatch<any>
): Promise<{ responseCode: ResponseCode; reasoning: string }> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.suggestResponseCode(businessInfo, topicTitle, dispatch),
        openai: () => openAiService.suggestResponseCode(businessInfo, topicTitle, dispatch),
        anthropic: () => anthropicService.suggestResponseCode(businessInfo, topicTitle, dispatch),
        perplexity: () => perplexityService.suggestResponseCode(businessInfo, topicTitle, dispatch),
        openrouter: () => openRouterService.suggestResponseCode(businessInfo, topicTitle, dispatch),
    });
};

/**
 * Enrich a brief with enhanced visual semantics analysis
 * This applies Koray's "Pixels, Letters, and Bytes" framework
 */
export const enrichBriefWithVisualSemantics = (
    brief: Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>,
    topic: EnrichedTopic
): Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'> => {
    try {
        // Determine search intent from topic metadata
        const searchIntent: string = (typeof topic.metadata?.search_intent === 'string' ? topic.metadata.search_intent : null) ||
            (topic.topic_class === 'monetization' ? 'transactional' : 'informational');

        // Generate enhanced visual semantics
        const enhancedVisualSemantics = analyzeImageRequirements(
            brief as ContentBrief,
            searchIntent
        );

        return {
            ...brief,
            enhanced_visual_semantics: enhancedVisualSemantics,
        };
    } catch (error) {
        console.warn('[briefGeneration] Failed to enrich visual semantics:', error);
        return brief;
    }
};

export const generateContentBrief = async (
    businessInfo: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, knowledgeGraph: KnowledgeGraph, responseCode: ResponseCode, dispatch: React.Dispatch<any>
): Promise<Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>> => {
    const brief = await dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch),
        openai: () => openAiService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch),
        anthropic: () => anthropicService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch),
        perplexity: () => perplexityService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch),
        openrouter: () => openRouterService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch),
    });

    // Validate monetization briefs meet minimum requirements
    if (shouldApplyMonetizationEnhancement(topic.topic_class)) {
        validateMonetizationBrief(brief, dispatch);
    }

    // Enrich with enhanced visual semantics
    return enrichBriefWithVisualSemantics(brief, topic);
};

export const generateArticleDraft = (
    brief: ContentBrief, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<string> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateArticleDraft(brief, businessInfo, dispatch),
        openai: () => openAiService.generateArticleDraft(brief, businessInfo, dispatch),
        anthropic: () => anthropicService.generateArticleDraft(brief, businessInfo, dispatch),
        perplexity: () => perplexityService.generateArticleDraft(brief, businessInfo, dispatch),
        openrouter: () => openRouterService.generateArticleDraft(brief, businessInfo, dispatch),
    });
};

export const polishDraft = async (
    draft: string,
    brief: ContentBrief,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>,
    onProgress?: StreamingProgressCallback
): Promise<string> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.polishDraft(draft, brief, businessInfo, dispatch),
        openai: () => openAiService.polishDraft(draft, brief, businessInfo, dispatch),
        anthropic: () => anthropicService.polishDraft(draft, brief, businessInfo, dispatch, onProgress),
        perplexity: () => perplexityService.polishDraft(draft, brief, businessInfo, dispatch),
        openrouter: () => openRouterService.polishDraft(draft, brief, businessInfo, dispatch),
    });
};

// Deprecated alias for backward compatibility during refactor
export const finalizeDraft = polishDraft;

export const auditContentIntegrity = async (
    brief: ContentBrief,
    draft: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>,
    onProgress?: StreamingProgressCallback
): Promise<ContentIntegrityResult> => {
    // 1. Run AI Audit (Semantic & Contextual Checks)
    const aiResult = await dispatchToProvider(businessInfo, {
        gemini: () => geminiService.auditContentIntegrity(brief, draft, businessInfo, dispatch),
        openai: () => openAiService.auditContentIntegrity(brief, draft, businessInfo, dispatch),
        anthropic: () => anthropicService.auditContentIntegrity(brief, draft, businessInfo, dispatch, onProgress),
        perplexity: () => perplexityService.auditContentIntegrity(brief, draft, businessInfo, dispatch),
        openrouter: () => openRouterService.auditContentIntegrity(brief, draft, businessInfo, dispatch),
    });

    // 2. Run Algorithmic Checks (Pattern Matching)
    // These checks are deterministic and enforce the "Cost of Retrieval" rules strictly.
    const subj = checkSubjectivity(draft);
    const pronouns = checkPronounDensity(draft, brief.title);
    const links = checkLinkPositioning(draft);
    const sentences = checkFirstSentencePrecision(draft);
    const questions = checkQuestionProtection(draft);
    const lists = checkListLogic(draft);
    const density = checkSentenceDensity(draft);

    // 3. Merge Results
    // We convert the simple AI result objects into rich AuditRuleResult objects where possible
    const enrichedAiRules = aiResult.frameworkRules.map(r => ({
        ruleName: r.ruleName,
        isPassing: r.isPassing,
        details: r.details,
        remediation: r.isPassing ? undefined : "Review the AI feedback and adjust context manually."
    }));

    const algorithmicRules = [
        subj,
        pronouns,
        links,
        sentences,
        questions,
        lists,
        density
    ];

    return {
        ...aiResult,
        draftText: draft, // Pass through the original text to enable Auto-Fix
        frameworkRules: [...enrichedAiRules, ...algorithmicRules]
    };
};

export const refineDraftSection = (
    originalText: string,
    violationType: string,
    instruction: string,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<string> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.refineDraftSection(originalText, violationType, instruction, businessInfo, dispatch),
        openai: () => openAiService.refineDraftSection(originalText, violationType, instruction, businessInfo, dispatch),
        anthropic: () => anthropicService.refineDraftSection(originalText, violationType, instruction, businessInfo, dispatch),
        perplexity: () => perplexityService.refineDraftSection(originalText, violationType, instruction, businessInfo, dispatch),
        openrouter: () => openRouterService.refineDraftSection(originalText, violationType, instruction, businessInfo, dispatch),
    });
};

export const generateSchema = (
    brief: ContentBrief, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<SchemaGenerationResult> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateSchema(brief, businessInfo, dispatch),
        openai: () => openAiService.generateSchema(brief, businessInfo, dispatch),
        anthropic: () => anthropicService.generateSchema(brief, businessInfo, dispatch),
        perplexity: () => perplexityService.generateSchema(brief, businessInfo, dispatch),
        openrouter: () => openRouterService.generateSchema(brief, businessInfo, dispatch),
    });
};
