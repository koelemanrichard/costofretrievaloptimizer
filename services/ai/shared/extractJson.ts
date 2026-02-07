// services/ai/shared/extractJson.ts

/**
 * Shared utility to extract content from AI responses.
 * Strips markdown code block wrappers and extracts content from JSON envelopes.
 *
 * Used by all AI provider services (Gemini, OpenAI, Anthropic, Perplexity).
 */
export const extractMarkdownFromResponse = (text: string): string => {
  if (!text) return text;

  // Strip markdown code block wrapper if present (```json ... ``` or ``` ... ```)
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3).trimEnd();
    }
  }

  // Try to parse as JSON and extract content
  try {
    const parsed = JSON.parse(cleaned);
    // Check common key names for polished content (order matters - most specific first)
    const content = parsed.polished_content || parsed.polished_article ||
                   parsed.polishedContent || parsed.polishedArticle ||
                   parsed.polishedDraft || parsed.content || parsed.article ||
                   parsed.markdown || parsed.text || parsed.draft;
    if (typeof content === 'string') {
      return content;
    }
  } catch {
    // Not valid JSON, return original text (which is the expected case)
  }

  return text;
};
