
import { Type } from "@google/genai";

// Native Schema Definition for Content Brief
export const CONTENT_BRIEF_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    slug: { type: Type.STRING },
    metaDescription: { type: Type.STRING },
    keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
    outline: { type: Type.STRING },
    structured_outline: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                heading: { type: Type.STRING },
                level: { type: Type.NUMBER },
                subordinate_text_hint: { type: Type.STRING },
                methodology_note: { type: Type.STRING }
            }
        }
    },
    perspectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    methodology_note: { type: Type.STRING },
    serpAnalysis: {
      type: Type.OBJECT,
      properties: {
        peopleAlsoAsk: { type: Type.ARRAY, items: { type: Type.STRING } },
        competitorHeadings: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              headings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    level: { type: Type.NUMBER },
                    text: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    },
    visuals: {
      type: Type.OBJECT,
      properties: {
        featuredImagePrompt: { type: Type.STRING },
        imageAltText: { type: Type.STRING }
      }
    },
    contextualVectors: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                subject: { type: Type.OBJECT, properties: { label: {type: Type.STRING}, type: {type: Type.STRING} } },
                predicate: { type: Type.OBJECT, properties: { relation: {type: Type.STRING}, type: {type: Type.STRING}, category: {type: Type.STRING}, classification: {type: Type.STRING} } },
                object: { type: Type.OBJECT, properties: { value: {type: Type.STRING}, type: {type: Type.STRING}, unit: {type: Type.STRING}, truth_range: {type: Type.STRING} } }
            }
        }
    },
    contextualBridge: {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING }, // 'section'
            content: { type: Type.STRING },
            links: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        targetTopic: { type: Type.STRING },
                        anchorText: { type: Type.STRING },
                        annotation_text_hint: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    }
                }
            }
        }
    },
    predicted_user_journey: { type: Type.STRING },
    // New Holistic SEO Fields
    query_type_format: { type: Type.STRING },
    featured_snippet_target: {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING },
            answer_target_length: { type: Type.NUMBER },
            required_predicates: { type: Type.ARRAY, items: { type: Type.STRING } },
            target_type: { type: Type.STRING }
        }
    },
    visual_semantics: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                caption_data: { type: Type.STRING },
                height_hint: { type: Type.STRING },
                width_hint: { type: Type.STRING }
            }
        }
    },
    discourse_anchors: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["title", "slug", "metaDescription", "keyTakeaways", "outline", "serpAnalysis", "visuals", "contextualVectors", "contextualBridge", "visual_semantics", "discourse_anchors"]
};

export const CONTENT_BRIEF_FALLBACK = {
    title: '',
    slug: '',
    metaDescription: '',
    keyTakeaways: [],
    outline: '',
    structured_outline: [],
    perspectives: [],
    methodology_note: '',
    serpAnalysis: { peopleAlsoAsk: [], competitorHeadings: [] },
    visuals: { featuredImagePrompt: '', imageAltText: '' },
    contextualVectors: [],
    contextualBridge: { type: 'section' as const, content: '', links: [] },
    predicted_user_journey: '',
    // New Fields
    query_type_format: '',
    featured_snippet_target: undefined,
    visual_semantics: [],
    discourse_anchors: []
};
