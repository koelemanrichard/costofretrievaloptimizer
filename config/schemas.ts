
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
                format_code: { type: Type.STRING },
                attribute_category: { type: Type.STRING },
                content_zone: { type: Type.STRING },
                subordinate_text_hint: { type: Type.STRING },
                methodology_note: { type: Type.STRING },
                required_phrases: { type: Type.ARRAY, items: { type: Type.STRING } },
                anchor_texts: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            phrase: { type: Type.STRING },
                            target_topic_id: { type: Type.STRING }
                        }
                    }
                }
            },
            required: ["heading", "level"]
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
    visual_placement_map: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section_heading: { type: Type.STRING },
          entity_anchor: { type: Type.STRING },
          eav_reference: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              predicate: { type: Type.STRING },
              object: { type: Type.STRING },
            },
          },
          image_type: { type: Type.STRING },
          placement_rationale: { type: Type.STRING },
        },
      },
    },
    discourse_anchors: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["title", "slug", "metaDescription", "keyTakeaways", "outline", "structured_outline", "serpAnalysis", "visuals", "contextualVectors", "contextualBridge", "visual_semantics", "discourse_anchors"]
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
    serpAnalysis: {
        peopleAlsoAsk: [],
        competitorHeadings: [],
        avgWordCount: 1500,  // Default competitor word count estimate
        avgHeadings: 8,       // Default heading count estimate
        commonStructure: 'Introduction, Overview, Key Points, Details, FAQ, Conclusion',
        contentGaps: []
    },
    visuals: { featuredImagePrompt: '', imageAltText: '' },
    contextualVectors: [],
    contextualBridge: {
        type: 'section' as const,
        content: '',
        links: []
    },
    predicted_user_journey: '',
    // New Fields
    query_type_format: '',
    featured_snippet_target: undefined,
    visual_semantics: [],
    visual_placement_map: [],
    discourse_anchors: []
};
