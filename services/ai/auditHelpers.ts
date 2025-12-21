
import { AuditRuleResult, SemanticTriple } from '../../types';

export const checkSubjectivity = (text: string): AuditRuleResult => {
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

export const checkPronounDensity = (text: string, topicTitle: string): AuditRuleResult => {
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

export const checkLinkPositioning = (text: string): AuditRuleResult => {
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

export const checkFirstSentencePrecision = (text: string): AuditRuleResult => {
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

export const checkQuestionProtection = (text: string): AuditRuleResult => {
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

export const checkListLogic = (text: string): AuditRuleResult => {
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

export const checkSentenceDensity = (text: string): AuditRuleResult => {
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

/**
 * Semantic Distance Audit Rule (Task SD-04)
 * Checks if Entity and Attribute appear within close proximity in the text.
 */
export const checkSemanticProximity = (text: string, vectors: SemanticTriple[]): AuditRuleResult => {
    // Handle cases where text might be undefined or null safely
    if (!text) {
        return { ruleName: "Microsemantic Proximity", isPassing: false, details: "No draft text provided." };
    }

    if (!vectors || !Array.isArray(vectors) || vectors.length === 0) {
        return { ruleName: "Microsemantic Proximity", isPassing: true, details: "No EAV vectors to check." };
    }

    let violations = 0;
    let sampleViolation = '';

    // Explicitly type triple and use defensive checks
    vectors.forEach((triple: SemanticTriple) => {
        if (!triple?.subject?.label || !triple?.object?.value) return;

        const entity = String(triple.subject.label).toLowerCase();
        const val = String(triple.object.value);
        
        // Find sentences containing the Entity
        const sentences: string[] = text.match(/[^.!?]+[.!?]+/g) || [];
        const relevantSentences = sentences.filter(s => s && s.toLowerCase().includes(entity));
        
        let matched = false;
        // Check if Attribute keywords appear in matched sentences
        const valueWords = val.toLowerCase().split(/\s+/);
        
        for (const sentence of relevantSentences) {
            const sentenceLower = sentence.toLowerCase();
            const hasAttribute = valueWords.some(w => w && sentenceLower.includes(w));
            if (hasAttribute) {
                matched = true;
                break;
            }
        }

        // Only flag if Entity is mentioned but Attribute is never near it
        if (relevantSentences.length > 0 && !matched) {
             violations++;
             if (!sampleViolation) sampleViolation = `Entity "${triple.subject.label}" mentioned without "${val}" nearby.`;
        }
    });

    if (violations > 0) {
        return {
            ruleName: "Microsemantic Proximity",
            isPassing: false,
            details: `Found ${violations} EAVs where Entity and Attribute are too distant.`,
            affectedTextSnippet: sampleViolation,
            remediation: "Ensure that when the Entity is mentioned, its key Attribute/Value is stated within the same sentence or immediate context."
        };
    }
    
    return { ruleName: "Microsemantic Proximity", isPassing: true, details: "Entities and Attributes are closely coupled." };
};

/**
 * Featured Snippet Compliance Audit
 * Validates content structure for Featured Snippet eligibility
 * - Paragraph snippets: <50 words, <340 characters
 * - List snippets: 4-8 items
 * - Table snippets: 3-5 columns
 */
export const checkFeaturedSnippetCompliance = (text: string): AuditRuleResult => {
    const lines = text.split('\n');
    let issues = 0;
    let sampleIssue = '';

    // Check each section's first paragraph after heading for snippet compliance
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check paragraphs following H2/H3 question headings (prime snippet candidates)
        if (line.match(/^(#{2,3})\s+(What|How|Why|When|Where|Who|Which)\b.*\?$/i)) {
            // Find the first content paragraph
            let j = i + 1;
            while (j < lines.length && !lines[j].trim()) j++;

            if (j < lines.length) {
                const paragraph = lines[j].trim();

                // Skip if it's a list (lists are handled differently)
                if (paragraph.startsWith('-') || paragraph.startsWith('*') || paragraph.match(/^\d+\./)) {
                    continue;
                }

                // Get first sentence as potential snippet
                const firstSentence = paragraph.split('.')[0] + '.';
                const wordCount = firstSentence.split(/\s+/).length;
                const charCount = firstSentence.length;

                // Ideal Featured Snippet: <50 words, <340 chars
                if (wordCount > 50 || charCount > 340) {
                    issues++;
                    if (!sampleIssue) {
                        sampleIssue = `"${line}" answer: ${wordCount} words, ${charCount} chars`;
                    }
                }
            }
        }
    }

    if (issues > 0) {
        return {
            ruleName: "Featured Snippet Compliance",
            isPassing: false,
            details: `Found ${issues} question section(s) with answers exceeding Featured Snippet limits (50 words / 340 chars).`,
            affectedTextSnippet: sampleIssue,
            remediation: "Ensure the first sentence answering a question is concise (<50 words, <340 chars). Place elaboration in subsequent sentences."
        };
    }
    return { ruleName: "Featured Snippet Compliance", isPassing: true, details: "Question answers are snippet-optimized." };
};

/**
 * Modality Audit
 * Checks for hedging language (can, might, should, may) in factual statements
 * Modal verbs reduce semantic certainty and should be replaced with definitive statements
 */
export const checkModalityCompliance = (text: string): AuditRuleResult => {
    // Modality verbs that indicate uncertainty
    const modalityPattern = /\b(can|could|might|may|should|would|possibly|probably|perhaps|likely|seems?|appears?|tends? to)\b/gi;
    const matches = text.match(modalityPattern) || [];

    // Calculate modality density
    const wordCount = text.split(/\s+/).length;
    const modalityDensity = wordCount > 0 ? (matches.length / wordCount) * 100 : 0;

    // Find sentences with modality for sample
    let sampleSentence = '';
    const sentences: string[] = text.match(/[^.!?]+[.!?]+/g) || [];
    for (const sentence of sentences) {
        if (modalityPattern.test(sentence) && !sampleSentence) {
            sampleSentence = sentence.trim().substring(0, 80) + '...';
            break;
        }
    }

    // More than 2% modality density indicates excessive hedging
    if (modalityDensity > 2) {
        return {
            ruleName: "Modality Audit (No Hedging)",
            isPassing: false,
            details: `High modality density (${modalityDensity.toFixed(1)}%) with ${matches.length} hedging terms.`,
            affectedTextSnippet: sampleSentence,
            remediation: "Replace modal verbs (can, might, should) with definitive statements. 'X can cause Y' → 'X causes Y'."
        };
    }
    return { ruleName: "Modality Audit (No Hedging)", isPassing: true, details: "Statements are definitive." };
};

/**
 * IR Zone Validation
 * Ensures critical content appears in first 400 characters (Information Retrieval zone)
 * Search engines prioritize early content for ranking signals
 */
export const checkIRZoneContent = (text: string, keyTerms: string[]): AuditRuleResult => {
    if (!keyTerms || keyTerms.length === 0) {
        return { ruleName: "IR Zone Content", isPassing: true, details: "No key terms to validate." };
    }

    const irZone = text.substring(0, 400).toLowerCase();
    const foundTerms: string[] = [];
    const missingTerms: string[] = [];

    for (const term of keyTerms.slice(0, 5)) { // Check top 5 key terms
        if (irZone.includes(term.toLowerCase())) {
            foundTerms.push(term);
        } else {
            missingTerms.push(term);
        }
    }

    const coverage = (foundTerms.length / Math.min(keyTerms.length, 5)) * 100;

    if (coverage < 60) { // At least 60% of key terms should appear in IR zone
        return {
            ruleName: "IR Zone Content",
            isPassing: false,
            details: `Only ${coverage.toFixed(0)}% of key terms appear in first 400 characters.`,
            affectedTextSnippet: `Missing: ${missingTerms.slice(0, 3).join(', ')}`,
            remediation: "Ensure primary keywords and entity names appear within the first 400 characters of content."
        };
    }
    return { ruleName: "IR Zone Content", isPassing: true, details: `${foundTerms.length} key terms in IR zone.` };
};

/**
 * Discourse Integration Scoring
 * Measures key term repetition and thematic consistency across the document
 */
export const checkDiscourseIntegration = (text: string, primaryTopic: string): AuditRuleResult => {
    if (!primaryTopic) {
        return { ruleName: "Discourse Integration", isPassing: true, details: "No primary topic to validate." };
    }

    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
    const topicLower = primaryTopic.toLowerCase();

    let paragraphsWithTopic = 0;
    let firstMissingIndex = -1;

    for (let i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].toLowerCase().includes(topicLower)) {
            paragraphsWithTopic++;
        } else if (firstMissingIndex === -1) {
            firstMissingIndex = i;
        }
    }

    const topicCoverage = paragraphs.length > 0 ? (paragraphsWithTopic / paragraphs.length) * 100 : 0;

    // Topic should appear in at least 40% of paragraphs for good discourse integration
    if (topicCoverage < 40) {
        return {
            ruleName: "Discourse Integration",
            isPassing: false,
            details: `Topic "${primaryTopic}" appears in only ${topicCoverage.toFixed(0)}% of paragraphs.`,
            affectedTextSnippet: firstMissingIndex >= 0 ? `Paragraph ${firstMissingIndex + 1} lacks topic reference` : undefined,
            remediation: "Repeat the primary topic throughout the document. Each major paragraph should reference or relate back to the main topic."
        };
    }
    return { ruleName: "Discourse Integration", isPassing: true, details: `Topic appears in ${topicCoverage.toFixed(0)}% of paragraphs.` };
};

/**
 * EAV Declaration Density
 * Checks that content has sufficient fact density (semantic triples per paragraph)
 */
export const checkEAVDensity = (text: string, expectedEAVs: SemanticTriple[]): AuditRuleResult => {
    if (!expectedEAVs || expectedEAVs.length === 0) {
        return { ruleName: "EAV Declaration Density", isPassing: true, details: "No EAVs to validate." };
    }

    const textLower = text.toLowerCase();
    let matchedEAVs = 0;
    const unmatchedEAVs: string[] = [];

    for (const eav of expectedEAVs) {
        const subject = eav.subject?.label?.toLowerCase() || '';
        const predicate = eav.predicate?.relation?.toLowerCase() || '';
        const obj = String(eav.object?.value || '').toLowerCase();

        // Check if any part of the EAV is mentioned
        const hasSubject = subject && textLower.includes(subject);
        const hasPredicate = predicate && textLower.includes(predicate);
        const hasObject = obj && textLower.includes(obj);

        // EAV is "declared" if at least subject + object appear
        if (hasSubject && (hasObject || hasPredicate)) {
            matchedEAVs++;
        } else if (subject) {
            unmatchedEAVs.push(subject);
        }
    }

    const coverage = (matchedEAVs / expectedEAVs.length) * 100;

    if (coverage < 70) {
        return {
            ruleName: "EAV Declaration Density",
            isPassing: false,
            details: `Only ${coverage.toFixed(0)}% of expected EAVs are declared in content.`,
            affectedTextSnippet: unmatchedEAVs.length > 0 ? `Missing subjects: ${unmatchedEAVs.slice(0, 3).join(', ')}` : undefined,
            remediation: "Ensure content explicitly states the Entity-Attribute-Value relationships defined in the brief."
        };
    }
    return { ruleName: "EAV Declaration Density", isPassing: true, details: `${matchedEAVs}/${expectedEAVs.length} EAVs declared.` };
};

/**
 * Predicate Consistency Check
 * Ensures consistent verb usage when describing same attributes across a document
 */
export const checkPredicateConsistency = (text: string): AuditRuleResult => {
    // Common predicate pairs that should be consistent
    const predicatePairs = [
        ['is', 'are'],
        ['has', 'have'],
        ['includes', 'contains', 'comprises'],
        ['allows', 'enables', 'permits'],
        ['requires', 'needs', 'demands'],
        ['uses', 'utilizes', 'employs'],
        ['provides', 'offers', 'gives'],
        ['helps', 'assists', 'aids'],
    ];

    const sentences: string[] = text.match(/[^.!?]+[.!?]+/g) || [];
    let inconsistencies = 0;
    let sampleInconsistency = '';

    // Check each predicate group
    for (const predicateGroup of predicatePairs) {
        const counts = new Map<string, number>();

        for (const predicate of predicateGroup) {
            const pattern = new RegExp(`\\b${predicate}\\b`, 'gi');
            const matches = text.match(pattern) || [];
            if (matches.length > 0) {
                counts.set(predicate, matches.length);
            }
        }

        // If multiple predicates from same group are used, flag inconsistency
        if (counts.size > 2) {
            inconsistencies++;
            if (!sampleInconsistency) {
                const usedPredicates = Array.from(counts.keys());
                sampleInconsistency = `Mixed use: ${usedPredicates.join(', ')}`;
            }
        }
    }

    if (inconsistencies > 2) {
        return {
            ruleName: "Predicate Consistency",
            isPassing: false,
            details: `Found ${inconsistencies} predicate inconsistencies.`,
            affectedTextSnippet: sampleInconsistency,
            remediation: "Use consistent verbs throughout. Choose one predicate and stick with it (e.g., always 'includes' not sometimes 'contains')."
        };
    }
    return { ruleName: "Predicate Consistency", isPassing: true, details: "Predicate usage is consistent." };
};

/**
 * Information Density Score
 * Calculates facts-per-sentence ratio
 */
export const checkInformationDensity = (text: string): AuditRuleResult => {
    const sentences: string[] = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length === 0) {
        return { ruleName: "Information Density", isPassing: true, details: "No sentences to analyze." };
    }

    let lowDensitySentences = 0;
    let sampleLowDensity = '';

    for (const sentence of sentences) {
        const words = sentence.split(/\s+/);
        const wordCount = words.length;

        // Check for filler phrases
        const fillerPatterns = [
            /\b(basically|essentially|actually|really|very|quite|somewhat)\b/gi,
            /\b(in order to|as a matter of fact|at the end of the day)\b/gi,
            /\b(it is important to note that|it should be noted that)\b/gi,
            /\b(as mentioned (earlier|above|before))\b/gi,
        ];

        let fillerCount = 0;
        for (const pattern of fillerPatterns) {
            const matches = sentence.match(pattern);
            fillerCount += matches ? matches.length : 0;
        }

        // Count proper nouns / specific terms as "facts"
        const properNouns = (sentence.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || []).length;
        const numbers = (sentence.match(/\b\d+(\.\d+)?%?|[$€£]\d+/g) || []).length;

        const factDensity = (properNouns + numbers) / wordCount;

        // Low density if: many words + few facts + filler phrases
        if (wordCount > 20 && factDensity < 0.05 && fillerCount > 0) {
            lowDensitySentences++;
            if (!sampleLowDensity) {
                sampleLowDensity = sentence.trim().substring(0, 80) + '...';
            }
        }
    }

    const lowDensityRatio = (lowDensitySentences / sentences.length) * 100;

    if (lowDensityRatio > 20) {
        return {
            ruleName: "Information Density",
            isPassing: false,
            details: `${lowDensityRatio.toFixed(0)}% of sentences have low fact density.`,
            affectedTextSnippet: sampleLowDensity,
            remediation: "Remove filler phrases. Add specific facts, numbers, or proper nouns. Each sentence should convey unique information."
        };
    }
    return { ruleName: "Information Density", isPassing: true, details: "Content has good information density." };
};
