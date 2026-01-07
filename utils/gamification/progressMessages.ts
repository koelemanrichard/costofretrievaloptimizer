/**
 * Progress Messages - The CutTheCrap Voice
 *
 * Personality-driven messages that are:
 * - Encouraging but not cheesy
 * - Playful but professional
 * - Informative and actionable
 */

// ============================================================================
// TYPES
// ============================================================================

export type MessageCategory =
  | 'wizard-stage'
  | 'action-feedback'
  | 'score-change'
  | 'achievement'
  | 'error'
  | 'empty-state';

export interface ProgressMessage {
  category: MessageCategory;
  key: string;
  message: string;
  tone: 'encouraging' | 'playful' | 'professional' | 'celebratory';
}

export interface EmptyStateConfig {
  emoji: string;
  headline: string;
  subline: string;
  cta: string;
}

// ============================================================================
// WIZARD STAGE MESSAGES
// ============================================================================

export const WIZARD_MESSAGES: Record<string, string[]> = {
  'business-info': [
    "Tell us who you are. No fluff needed.",
    "The foundation of everything. Let's get specific.",
    "Your business identity starts here."
  ],
  'entity-setup': [
    "Lock in your core identity. This is your Google DNA.",
    "What's the ONE thing you want to be known for?",
    "Define your entity. Make Google understand you."
  ],
  'pillar-creation': [
    "Define your expertise zones. What do you actually know?",
    "These pillars will structure your entire content strategy.",
    "Pick your battles. What topics will you own?"
  ],
  'eav-discovery': [
    "Time to teach Google about your entity. Every fact matters.",
    "E-A-Vs: The secret sauce of semantic SEO.",
    "Facts about your business that set you apart."
  ],
  'competitor-setup': [
    "Know thy enemy. Who are you up against?",
    "Add competitors to find your gaps and opportunities.",
    "Let's see what you're competing with."
  ],
  'map-generation': [
    "Building your semantic universe... ☕",
    "Analyzing entity relationships and generating topics...",
    "Creating your roadmap to topical authority...",
    "Mapping the semantic space. This is where it gets real."
  ],
  'map-complete': [
    "Boom. {topicCount} topics that make Google trust you.",
    "Your topical map is ready. Time to build authority.",
    "{topicCount} topics generated. Let's make them count.",
    "Map complete. {topicCount} opportunities to rank."
  ]
};

// ============================================================================
// ACTION FEEDBACK MESSAGES
// ============================================================================

export const ACTION_MESSAGES: Record<string, string[]> = {
  'eav-added': [
    "✅ Added. Your entity clarity just improved.",
    "✅ Another fact for Google's knowledge graph.",
    "✅ Entity definition strengthened.",
    "✅ Nice. Google knows you a little better now."
  ],
  'eav-expanded': [
    "🧠 {count} new E-A-Vs discovered. Your semantic depth is growing.",
    "🧠 AI found {count} more facts about your entity. Nice.",
    "🧠 +{count} E-A-Vs. Your knowledge graph is expanding."
  ],
  'brief-completed': [
    "📝 Brief ready. {completed} of {total} topics now publish-ready.",
    "📝 Another brief done. You're {percentage}% there.",
    "📝 Brief complete. Keep the momentum going."
  ],
  'brief-generated': [
    "✨ Brief generated with {sections} sections.",
    "✨ Your content blueprint is ready.",
    "✨ Brief created. Time to refine and polish."
  ],
  'competitor-added': [
    "🔍 Competitor added. Now tracking {count} competitors.",
    "🔍 More competitive intel incoming...",
    "🔍 Added. Let's see what they're ranking for."
  ],
  'gap-filled': [
    "🎯 Gap filled. One less advantage for competitors.",
    "🎯 You now cover '{topic}' — that's one less blind spot.",
    "🎯 Competitive gap closed. Nice move."
  ],
  'topic-added': [
    "📌 Topic added to your map. Coverage expanding.",
    "📌 New topic: '{title}'. Your semantic net grows.",
    "📌 Added. Your topical coverage just improved."
  ],
  'draft-saved': [
    "💾 Draft saved. {wordCount} words secured.",
    "💾 Progress saved. Keep building.",
    "💾 Saved. Your content is safe."
  ],
  'export-complete': [
    "📤 Exported! Go make Google happy.",
    "📤 Your content blueprint is ready for action.",
    "📤 Done. Time to publish and rank."
  ],
  'settings-saved': [
    "⚙️ Settings updated.",
    "⚙️ Preferences saved.",
    "⚙️ Got it. Settings applied."
  ]
};

// ============================================================================
// SCORE CHANGE MESSAGES
// ============================================================================

export const SCORE_CHANGE_MESSAGES = {
  increase: {
    small: [ // 1-5 points
      "+{points} points. Every bit counts.",
      "Score bumped to {newScore}. Moving up.",
      "+{points}. Progress is progress."
    ],
    medium: [ // 6-15 points
      "📈 +{points}! That's a solid jump.",
      "📈 {newScore} now. You're making real progress.",
      "📈 Nice! +{points} points."
    ],
    large: [ // 16+ points
      "🚀 +{points} points! Major improvement.",
      "🚀 From {oldScore} to {newScore}. That's how it's done.",
      "🚀 Massive jump! +{points} points."
    ]
  },
  decrease: [
    "Score adjusted to {newScore}. Let's build it back up.",
    "{newScore} now. Room to improve.",
    "Dropped to {newScore}. Time to refocus."
  ],
  tierUp: [
    "🎉 LEVEL UP! You've reached '{tierName}' status!",
    "🏆 New tier unlocked: {tierName}. Keep climbing!",
    "⬆️ Tier upgrade! Welcome to {tierName}."
  ],
  tierDown: [
    "Dropped to '{tierName}'. You've got this — climb back up.",
    "Back to {tierName}. Let's get back on track."
  ]
};

// ============================================================================
// EMPTY STATE MESSAGES
// ============================================================================

export const EMPTY_STATE_MESSAGES: Record<string, EmptyStateConfig> = {
  'no-topics': {
    emoji: '🗺️',
    headline: "Your topical map is... empty.",
    subline: "Like a blank canvas. Or a sad fridge. Let's fix that.",
    cta: "Generate Your First Map"
  },
  'no-competitors': {
    emoji: '🔍',
    headline: "No competitors added yet.",
    subline: "Either you're truly unique, or we need some URLs to analyze.",
    cta: "Add Competitors"
  },
  'no-eavs': {
    emoji: '🧠',
    headline: "No E-A-Vs defined.",
    subline: "Google doesn't know who you are yet. Let's teach them.",
    cta: "Add Your First E-A-V"
  },
  'no-briefs': {
    emoji: '📝',
    headline: "No briefs created.",
    subline: "Topics without briefs are just ideas. Let's make them real.",
    cta: "Generate Briefs"
  },
  'no-projects': {
    emoji: '📁',
    headline: "No projects yet.",
    subline: "Your SEO empire starts with a single project.",
    cta: "Create Your First Project"
  },
  'no-pillars': {
    emoji: '🏛️',
    headline: "No pillars defined.",
    subline: "Pillars are the foundation. Can't build without them.",
    cta: "Define Your Pillars"
  },
  'no-drafts': {
    emoji: '✍️',
    headline: "No drafts yet.",
    subline: "Briefs are great. Drafts are better. Let's write.",
    cta: "Start Your First Draft"
  }
};

// ============================================================================
// MESSAGE HELPERS
// ============================================================================

/**
 * Pick a random message from an array
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Interpolate variables in a message
 * Replaces {varName} with the value from variables
 */
export function interpolateMessage(
  message: string,
  variables?: Record<string, string | number>
): string {
  if (!variables) return message;

  return message.replace(/\{(\w+)\}/g, (_, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

/**
 * Get a wizard stage message
 */
export function getWizardMessage(
  stage: string,
  variables?: Record<string, string | number>
): string {
  const messages = WIZARD_MESSAGES[stage];
  if (!messages || messages.length === 0) {
    return `Step: ${stage}`;
  }
  return interpolateMessage(pickRandom(messages), variables);
}

/**
 * Get an action feedback message
 */
export function getActionMessage(
  action: string,
  variables?: Record<string, string | number>
): string {
  const messages = ACTION_MESSAGES[action];
  if (!messages || messages.length === 0) {
    return `Action: ${action}`;
  }
  return interpolateMessage(pickRandom(messages), variables);
}

/**
 * Get a score change message
 */
export function getScoreChangeMessage(
  oldScore: number,
  newScore: number,
  oldTier?: string,
  newTier?: string
): string {
  const diff = newScore - oldScore;

  // Tier change
  if (newTier && oldTier && newTier !== oldTier) {
    if (newScore > oldScore) {
      return interpolateMessage(pickRandom(SCORE_CHANGE_MESSAGES.tierUp), {
        tierName: newTier
      });
    } else {
      return interpolateMessage(pickRandom(SCORE_CHANGE_MESSAGES.tierDown), {
        tierName: newTier
      });
    }
  }

  // Score increase
  if (diff > 0) {
    let messages: string[];
    if (diff >= 16) {
      messages = SCORE_CHANGE_MESSAGES.increase.large;
    } else if (diff >= 6) {
      messages = SCORE_CHANGE_MESSAGES.increase.medium;
    } else {
      messages = SCORE_CHANGE_MESSAGES.increase.small;
    }
    return interpolateMessage(pickRandom(messages), {
      points: diff,
      oldScore,
      newScore
    });
  }

  // Score decrease
  if (diff < 0) {
    return interpolateMessage(pickRandom(SCORE_CHANGE_MESSAGES.decrease), {
      points: Math.abs(diff),
      oldScore,
      newScore
    });
  }

  return `Score: ${newScore}`;
}

/**
 * Get an empty state configuration
 */
export function getEmptyStateMessage(key: string): EmptyStateConfig {
  return EMPTY_STATE_MESSAGES[key] || {
    emoji: '📭',
    headline: 'Nothing here yet.',
    subline: "Let's add something.",
    cta: 'Get Started'
  };
}

/**
 * Get a progress message (generic)
 */
export function getProgressMessage(
  category: MessageCategory,
  key: string,
  variables?: Record<string, string | number>
): string {
  switch (category) {
    case 'wizard-stage':
      return getWizardMessage(key, variables);
    case 'action-feedback':
      return getActionMessage(key, variables);
    default:
      return key;
  }
}

// ============================================================================
// CONTEXTUAL TOOLTIPS
// ============================================================================

export interface TooltipContent {
  title: string;
  content: string;
  learnMore?: string;
}

export const CONTEXTUAL_TOOLTIPS: Record<string, TooltipContent> = {
  'topic-count': {
    title: 'Why this many topics?',
    content: "{count} topics isn't random. This covers the semantic space Google expects for '{entity}'. Fewer = gaps in authority. More = diminishing returns."
  },
  'eav-triple': {
    title: 'What is an E-A-V?',
    content: "Entity-Attribute-Value triples tell Google facts about your business. More triples = clearer understanding = higher trust. Think of them as entries in Google's knowledge graph."
  },
  'supporting-topic': {
    title: 'Why supporting topics?',
    content: "Supporting topics prove you understand the full context. Google rewards comprehensive expertise, not keyword stuffing. These connect your core topics semantically."
  },
  'competitor-gap': {
    title: 'Why does this gap matter?',
    content: "Your competitors rank for this topic. If you don't cover it, Google may see them as more authoritative in this area."
  },
  'search-intent': {
    title: 'What is search intent?',
    content: "Search intent = what the user actually wants. Informational (learn), commercial (compare), transactional (buy). Matching intent = higher rankings."
  },
  'semantic-score': {
    title: 'How is this calculated?',
    content: "Your Semantic Authority Score combines 5 factors: Entity Clarity (25%), Topical Coverage (25%), Intent Alignment (20%), Competitive Parity (15%), and Content Readiness (15%)."
  },
  'tier-1': {
    title: 'Why start with Tier 1?',
    content: "Tier 1 topics are directly tied to revenue and have the highest intent alignment. Foundation first, expansion second."
  },
  'tier-2': {
    title: 'What are Authority Builders?',
    content: "Tier 2 topics build the semantic context that makes Google trust your core content. They answer related questions and create internal linking opportunities."
  },
  'tier-3': {
    title: 'What are Dominance Plays?',
    content: "Tier 3 topics are for comprehensive coverage. Long-tail opportunities and content your competitors don't have."
  }
};

/**
 * Get tooltip content with interpolated variables
 */
export function getTooltipContent(
  key: string,
  variables?: Record<string, string | number>
): TooltipContent | null {
  const tooltip = CONTEXTUAL_TOOLTIPS[key];
  if (!tooltip) return null;

  return {
    ...tooltip,
    content: interpolateMessage(tooltip.content, variables)
  };
}
