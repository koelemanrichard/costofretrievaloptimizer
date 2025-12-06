// services/ai/entityExtraction.ts
// AI-powered entity extraction from content for schema generation

import type {
  EntityCandidate,
  SchemaEntityType,
  ContentBrief,
  BusinessInfo,
  SemanticTriple
} from '../../types';
import { suggestEntityType } from '../wikidataService';

// Entity extraction prompt template
const ENTITY_EXTRACTION_PROMPT = `Analyze the following content and extract all named entities that should be included in structured data schema.

For each entity, identify:
1. The entity name (as it appears or should appear in schema)
2. The entity type (Person, Organization, Place, Thing, Event, CreativeWork)
3. The role of the entity (subject - main entity of content, author - content creator, publisher - publishing organization, mentioned - entities mentioned in content, about - topics the content is about)
4. Context for disambiguation (surrounding information that helps identify the entity)
5. How many times it's mentioned
6. Whether it's the main/central entity of the content

Focus on entities that:
- Have Wikipedia/Wikidata entries (real, notable entities)
- Are relevant for SEO and schema.org structured data
- Help establish E-E-A-T (authorship, expertise, authority)
- Support the semantic context of the content

CONTENT:
{{content}}

ADDITIONAL CONTEXT:
- Content Title: {{title}}
- Target Keyword: {{keyword}}
- Business Domain: {{domain}}
- Author: {{author}}
- Central Entity (from SEO pillars): {{centralEntity}}
- Source Context: {{sourceContext}}

Respond with a JSON array of entities:
{
  "entities": [
    {
      "name": "Entity Name",
      "type": "Person|Organization|Place|Thing|Event|CreativeWork",
      "role": "subject|author|publisher|mentioned|about",
      "context": "Brief context for disambiguation",
      "mentions": 3,
      "isMainEntity": true|false,
      "reasoning": "Why this entity is important for schema"
    }
  ]
}`;

interface EntityExtractionResult {
  entities: Array<{
    name: string;
    type: SchemaEntityType;
    role: 'subject' | 'author' | 'publisher' | 'mentioned' | 'about';
    context: string;
    mentions: number;
    isMainEntity: boolean;
    reasoning: string;
  }>;
}

/**
 * Extract entities from content using AI
 */
export async function extractEntitiesWithAI(
  content: string,
  title: string,
  keyword: string,
  businessInfo: BusinessInfo,
  centralEntity: string,
  sourceContext: string,
  aiService: (prompt: string) => Promise<string>
): Promise<EntityCandidate[]> {
  const prompt = ENTITY_EXTRACTION_PROMPT
    .replace('{{content}}', content.slice(0, 8000)) // Limit content length
    .replace('{{title}}', title)
    .replace('{{keyword}}', keyword || '')
    .replace('{{domain}}', businessInfo.domain || '')
    .replace('{{author}}', businessInfo.authorProfile?.name || businessInfo.authorName || 'Unknown')
    .replace('{{centralEntity}}', centralEntity)
    .replace('{{sourceContext}}', sourceContext);

  try {
    const response = await aiService(prompt);

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[EntityExtraction] No JSON found in response');
      return extractEntitiesFromContext(content, title, businessInfo, centralEntity);
    }

    const result: EntityExtractionResult = JSON.parse(jsonMatch[0]);

    return result.entities.map(entity => ({
      name: entity.name,
      type: entity.type,
      context: entity.context,
      mentions: entity.mentions,
      isMainEntity: entity.isMainEntity,
      role: entity.role
    }));
  } catch (error) {
    console.error('[EntityExtraction] AI extraction failed:', error);
    // Fallback to rule-based extraction
    return extractEntitiesFromContext(content, title, businessInfo, centralEntity);
  }
}

/**
 * Extract entities from brief metadata (no AI call required)
 */
export function extractEntitiesFromBrief(
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  centralEntity: string,
  sourceContext: string
): EntityCandidate[] {
  const candidates: EntityCandidate[] = [];

  // 1. Main entity from central entity
  if (centralEntity) {
    candidates.push({
      name: centralEntity,
      type: suggestEntityType(centralEntity, sourceContext),
      context: sourceContext,
      mentions: 10, // High importance
      isMainEntity: true,
      role: 'subject'
    });
  }

  // 2. Author entity
  const authorName = businessInfo.authorProfile?.name || businessInfo.authorName;
  if (authorName) {
    candidates.push({
      name: authorName,
      type: 'Person',
      context: businessInfo.authorProfile?.bio || businessInfo.authorBio || '',
      mentions: 1,
      isMainEntity: false,
      role: 'author'
    });
  }

  // 3. Publisher/Organization entity
  if (businessInfo.projectName) {
    candidates.push({
      name: businessInfo.projectName,
      type: 'Organization',
      context: `${businessInfo.industry || ''} ${businessInfo.valueProp || ''}`,
      mentions: 1,
      isMainEntity: false,
      role: 'publisher'
    });
  }

  // 4. Entities from EAVs (semantic triples)
  // Extract unique subjects from contextualVectors
  if (brief.contextualVectors?.length) {
    const seenSubjects = new Set<string>();

    for (const triple of brief.contextualVectors) {
      const subjectLabel = triple.subject?.label;
      if (subjectLabel && !seenSubjects.has(subjectLabel.toLowerCase())) {
        seenSubjects.add(subjectLabel.toLowerCase());

        candidates.push({
          name: subjectLabel,
          type: suggestEntityType(subjectLabel, triple.predicate?.relation || ''),
          context: `${triple.predicate?.relation || ''}: ${triple.object?.value || ''}`,
          mentions: 1,
          isMainEntity: subjectLabel.toLowerCase() === centralEntity?.toLowerCase(),
          role: 'about'
        });
      }
    }
  }

  // 5. Entities from keywords
  if (brief.keyTakeaways?.length) {
    for (const takeaway of brief.keyTakeaways) {
      // Extract proper nouns (capitalized words that aren't at start of sentence)
      const properNouns = takeaway.match(/(?<=\s)[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*/g);
      if (properNouns) {
        for (const noun of properNouns) {
          if (!candidates.find(c => c.name.toLowerCase() === noun.toLowerCase())) {
            candidates.push({
              name: noun,
              type: suggestEntityType(noun, takeaway),
              context: takeaway,
              mentions: 1,
              isMainEntity: false,
              role: 'mentioned'
            });
          }
        }
      }
    }
  }

  return candidates;
}

/**
 * Rule-based entity extraction (fallback when AI is unavailable)
 */
export function extractEntitiesFromContext(
  content: string,
  title: string,
  businessInfo: BusinessInfo,
  centralEntity: string
): EntityCandidate[] {
  const candidates: EntityCandidate[] = [];
  const seenNames = new Set<string>();

  // Helper to add candidate if not seen
  const addCandidate = (
    name: string,
    type: SchemaEntityType,
    context: string,
    role: 'subject' | 'author' | 'publisher' | 'mentioned' | 'about',
    isMain: boolean = false
  ) => {
    const normalizedName = name.trim().toLowerCase();
    if (normalizedName && !seenNames.has(normalizedName) && name.length > 2) {
      seenNames.add(normalizedName);
      candidates.push({
        name: name.trim(),
        type,
        context,
        mentions: countOccurrences(content, name),
        isMainEntity: isMain,
        role
      });
    }
  };

  // 1. Central entity
  if (centralEntity) {
    addCandidate(centralEntity, suggestEntityType(centralEntity, content.slice(0, 500)), content.slice(0, 200), 'subject', true);
  }

  // 2. Author
  const authorName = businessInfo.authorProfile?.name || businessInfo.authorName;
  if (authorName) {
    addCandidate(authorName, 'Person', businessInfo.authorProfile?.bio || '', 'author');
  }

  // 3. Organization
  if (businessInfo.projectName) {
    addCandidate(businessInfo.projectName, 'Organization', businessInfo.valueProp || '', 'publisher');
  }

  // 4. Extract proper nouns from title
  const titleNouns = title.match(/[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*/g);
  if (titleNouns) {
    for (const noun of titleNouns) {
      if (noun.length > 3 && !isCommonWord(noun)) {
        addCandidate(noun, suggestEntityType(noun, title), title, 'about');
      }
    }
  }

  // 5. Extract proper nouns from content (limited scan)
  const contentSample = content.slice(0, 3000);
  const contentNouns = contentSample.match(/[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2}/g);
  if (contentNouns) {
    // Count occurrences and sort by frequency
    const nounCounts = new Map<string, number>();
    for (const noun of contentNouns) {
      if (noun.length > 3 && !isCommonWord(noun)) {
        nounCounts.set(noun, (nounCounts.get(noun) || 0) + 1);
      }
    }

    // Add top 10 most frequent nouns
    const sortedNouns = [...nounCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [noun] of sortedNouns) {
      addCandidate(noun, suggestEntityType(noun, contentSample), contentSample.slice(0, 200), 'mentioned');
    }
  }

  return candidates;
}

/**
 * Prioritize and filter entity candidates
 */
export function prioritizeEntities(
  candidates: EntityCandidate[],
  maxEntities: number = 10
): EntityCandidate[] {
  // Score each candidate
  const scored = candidates.map(candidate => {
    let score = 0;

    // Main entity gets highest priority
    if (candidate.isMainEntity) score += 100;

    // Role priority
    switch (candidate.role) {
      case 'subject': score += 50; break;
      case 'author': score += 40; break;
      case 'publisher': score += 35; break;
      case 'about': score += 20; break;
      case 'mentioned': score += 10; break;
    }

    // Mentions boost
    score += Math.min(candidate.mentions * 2, 20);

    // Longer context is better for disambiguation
    score += Math.min(candidate.context.length / 50, 10);

    return { candidate, score };
  });

  // Sort by score and take top N
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxEntities).map(s => s.candidate);
}

/**
 * Get context snippet around an entity mention
 */
export function getEntityContext(
  content: string,
  entityName: string,
  contextLength: number = 150
): string {
  const index = content.toLowerCase().indexOf(entityName.toLowerCase());
  if (index === -1) return '';

  const start = Math.max(0, index - contextLength / 2);
  const end = Math.min(content.length, index + entityName.length + contextLength / 2);

  return content.slice(start, end).replace(/\s+/g, ' ').trim();
}

/**
 * Count occurrences of a term in content
 */
function countOccurrences(content: string, term: string): number {
  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return (content.match(regex) || []).length;
}

/**
 * Check if a word is common and should be excluded
 */
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'were', 'will',
    'what', 'when', 'where', 'which', 'while', 'with', 'this', 'that', 'these',
    'those', 'then', 'than', 'they', 'their', 'there', 'from', 'into', 'onto',
    'about', 'after', 'before', 'between', 'through', 'during', 'without',
    'again', 'further', 'once', 'here', 'most', 'other', 'some', 'such',
    'only', 'same', 'also', 'back', 'being', 'could', 'first', 'just',
    'like', 'make', 'made', 'many', 'more', 'much', 'must', 'over', 'said',
    'should', 'still', 'take', 'time', 'very', 'well', 'would', 'year',
    'Today', 'Introduction', 'Conclusion', 'Summary', 'Overview', 'Guide',
    'Tips', 'Best', 'Top', 'How', 'Why', 'What', 'When', 'Where', 'Which',
    'New', 'Now', 'Next', 'Here', 'There', 'This', 'That', 'Each', 'Every'
  ]);

  return commonWords.has(word) || commonWords.has(word.toLowerCase());
}

/**
 * Merge duplicate entities with different cases/variations
 */
export function mergeEntityVariations(
  candidates: EntityCandidate[]
): EntityCandidate[] {
  const merged = new Map<string, EntityCandidate>();

  for (const candidate of candidates) {
    const key = candidate.name.toLowerCase();

    if (merged.has(key)) {
      const existing = merged.get(key)!;
      // Merge: keep the one with more mentions, combine context
      if (candidate.mentions > existing.mentions) {
        merged.set(key, {
          ...candidate,
          context: `${candidate.context} | ${existing.context}`.slice(0, 300),
          mentions: candidate.mentions + existing.mentions,
          isMainEntity: candidate.isMainEntity || existing.isMainEntity
        });
      } else {
        existing.mentions += candidate.mentions;
        existing.isMainEntity = existing.isMainEntity || candidate.isMainEntity;
        existing.context = `${existing.context} | ${candidate.context}`.slice(0, 300);
      }
    } else {
      merged.set(key, { ...candidate });
    }
  }

  return [...merged.values()];
}
