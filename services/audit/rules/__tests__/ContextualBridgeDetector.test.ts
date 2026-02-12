import { describe, it, expect } from 'vitest';
import {
  ContextualBridgeDetector,
  BridgeContext,
} from '../ContextualBridgeDetector';

describe('ContextualBridgeDetector', () => {
  const detector = new ContextualBridgeDetector();

  // ---------------------------------------------------------------------------
  // Rule 154 — Bridge presence
  // ---------------------------------------------------------------------------

  it('detects missing bridges when no paragraph references related pages (rule 154)', () => {
    const input: BridgeContext = {
      text: 'This article is about cooking pasta.\n\nYou need water, salt, and pasta.\n\nBoil for 10 minutes.',
      currentTopic: 'cooking pasta',
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes' },
        { url: '/nutrition', topic: 'nutritional value of grains' },
      ],
    };

    const issues = detector.validate(input);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-154' })
    );
  });

  it('passes when bridge paragraphs reference related page topics (rule 154)', () => {
    const input: BridgeContext = {
      text:
        'This article is about cooking pasta.\n\n' +
        'Pair your pasta with great tomato sauce recipes for the best results.\n\n' +
        'Boil for 10 minutes and serve.',
      currentTopic: 'cooking pasta',
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes' },
      ],
    };

    const issues = detector.validate(input);
    expect(issues.find((i) => i.ruleId === 'rule-154')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 155 — Bridge relevance
  // ---------------------------------------------------------------------------

  it('detects irrelevant bridges that lack current topic keywords (rule 155)', () => {
    const input: BridgeContext = {
      text:
        'Advanced quantum physics experiments require precision.\n\n' +
        'Tomato sauce recipes are popular worldwide.\n\n' +
        'The laboratory equipment must be calibrated.',
      currentTopic: 'quantum physics experiments',
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes' },
      ],
    };

    const issues = detector.validate(input);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-155' })
    );
  });

  it('passes when bridge paragraph contains keywords from both pages (rule 155)', () => {
    const input: BridgeContext = {
      text:
        'Cooking pasta is an art form.\n\n' +
        'When cooking pasta, consider pairing it with authentic tomato sauce recipes for deeper flavor.\n\n' +
        'Serve immediately for the best texture.',
      currentTopic: 'cooking pasta',
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes' },
      ],
    };

    const issues = detector.validate(input);
    expect(issues.find((i) => i.ruleId === 'rule-155')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 156 — Bridge positioning
  // ---------------------------------------------------------------------------

  it('flags bridges placed in the final paragraph (rule 156)', () => {
    const input: BridgeContext = {
      text:
        'Cooking pasta requires skill and technique.\n\n' +
        'Use high-quality ingredients for the best results.\n\n' +
        'You should also check our tomato sauce recipes for pairing ideas.',
      currentTopic: 'cooking pasta',
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes' },
      ],
    };

    const issues = detector.validate(input);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-156' })
    );
  });

  it('passes when bridges are not in the final paragraph (rule 156)', () => {
    const input: BridgeContext = {
      text:
        'Cooking pasta requires skill and technique.\n\n' +
        'Consider trying different tomato sauce recipes to complement your pasta dishes.\n\n' +
        'The key to great pasta is timing and temperature control.',
      currentTopic: 'cooking pasta',
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes' },
      ],
    };

    const issues = detector.validate(input);
    expect(issues.find((i) => i.ruleId === 'rule-156')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 157 — Bridge diversity
  // ---------------------------------------------------------------------------

  it('flags duplicate anchor texts across bridges (rule 157)', () => {
    const input: BridgeContext = {
      text:
        'Cooking pasta is fundamental.\n\n' +
        'Tomato sauce recipes enhance the flavor of many dishes.\n\n' +
        'Italian bread baking traditions complement pasta dinners.',
      currentTopic: 'cooking pasta',
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes', anchorText: 'learn more' },
        { url: '/bread', topic: 'italian bread baking', anchorText: 'learn more' },
      ],
    };

    const issues = detector.validate(input);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-157' })
    );
  });

  it('flags copy-paste bridge paragraphs with high similarity (rule 157)', () => {
    const input: BridgeContext = {
      text:
        'Cooking pasta is an art.\n\n' +
        'For great pasta cooking results, explore tomato sauce recipes to elevate your dish.\n\n' +
        'For great pasta cooking results, explore bread baking techniques to elevate your dish.\n\n' +
        'Always use fresh ingredients.',
      currentTopic: 'cooking pasta',
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes' },
        { url: '/bread', topic: 'bread baking techniques' },
      ],
    };

    const issues = detector.validate(input);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-157' })
    );
  });

  // ---------------------------------------------------------------------------
  // Rule 158 — Bridge completeness
  // ---------------------------------------------------------------------------

  it('flags incomplete coverage when 5+ related pages but fewer than 3 bridges (rule 158)', () => {
    const input: BridgeContext = {
      text:
        'Cooking pasta is a skill.\n\n' +
        'Tomato sauce recipes pair well with pasta.\n\n' +
        'Timing is everything in the kitchen.',
      currentTopic: 'cooking pasta',
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes' },
        { url: '/bread', topic: 'sourdough bread' },
        { url: '/salads', topic: 'garden salad preparation' },
        { url: '/wine', topic: 'wine pairing guide' },
        { url: '/desserts', topic: 'tiramisu dessert recipe' },
      ],
    };

    const issues = detector.validate(input);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-158' })
    );
  });

  it('passes completeness when 3+ related pages have bridges (rule 158)', () => {
    const input: BridgeContext = {
      text:
        'Cooking pasta is a skill.\n\n' +
        'Pair your meal with tomato sauce recipes for authentic Italian flavor.\n\n' +
        'Serve with freshly baked sourdough bread from your own oven.\n\n' +
        'A crisp garden salad preparation complements heavier pasta dishes.\n\n' +
        'Finish with a classic dessert.',
      currentTopic: 'cooking pasta',
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes' },
        { url: '/bread', topic: 'sourdough bread' },
        { url: '/salads', topic: 'garden salad preparation' },
        { url: '/wine', topic: 'wine pairing guide' },
        { url: '/desserts', topic: 'tiramisu dessert recipe' },
      ],
    };

    const issues = detector.validate(input);
    expect(issues.find((i) => i.ruleId === 'rule-158')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Clean content — passes all rules
  // ---------------------------------------------------------------------------

  it('returns no issues for well-bridged content', () => {
    const input: BridgeContext = {
      text:
        'Cooking pasta is a fundamental Italian culinary skill.\n\n' +
        'The best pasta dishes combine cooking pasta techniques with flavorful tomato sauce recipes for a complete meal.\n\n' +
        'When cooking pasta for guests, consider pairing with freshly baked sourdough bread for an elevated dinner experience.\n\n' +
        'Mastering the art of cooking pasta takes patience, but the results are always rewarding.',
      currentTopic: 'cooking pasta',
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes', anchorText: 'tomato sauce recipes' },
        { url: '/bread', topic: 'sourdough bread', anchorText: 'freshly baked bread' },
      ],
    };

    const issues = detector.validate(input);
    expect(issues).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Edge case — no related pages
  // ---------------------------------------------------------------------------

  it('returns no issues when there are no related pages', () => {
    const input: BridgeContext = {
      text: 'This is a standalone article about cooking pasta.\n\nIt has no related pages.',
      currentTopic: 'cooking pasta',
      relatedPages: [],
    };

    const issues = detector.validate(input);
    expect(issues).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Edge case — custom paragraphs override
  // ---------------------------------------------------------------------------

  it('uses provided paragraphs array instead of splitting text', () => {
    const input: BridgeContext = {
      text: 'This text is ignored when paragraphs are provided.',
      currentTopic: 'cooking pasta',
      paragraphs: [
        'Cooking pasta requires patience.',
        'Tomato sauce recipes elevate any pasta dish.',
        'Serve while hot.',
      ],
      relatedPages: [
        { url: '/sauces', topic: 'tomato sauce recipes' },
      ],
    };

    const issues = detector.validate(input);
    // Bridge found in the paragraphs array, so no rule-154 issue
    expect(issues.find((i) => i.ruleId === 'rule-154')).toBeUndefined();
  });
});
