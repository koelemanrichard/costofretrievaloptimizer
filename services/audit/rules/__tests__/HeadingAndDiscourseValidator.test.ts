import { describe, it, expect } from 'vitest';
import {
  HeadingAndDiscourseValidator,
  HeadingDiscourseInput,
} from '../HeadingAndDiscourseValidator';

describe('HeadingAndDiscourseValidator', () => {
  const validator = new HeadingAndDiscourseValidator();

  // ---- Rule 142: Heading keyword density ----

  describe('Rule 142 — Heading keyword density', () => {
    it('flags when a significant word appears more than twice across headings', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content about React.',
        headings: [
          { level: 2, text: 'React Fundamentals' },
          { level: 2, text: 'React Components Overview' },
          { level: 2, text: 'Advanced React Patterns' },
          { level: 2, text: 'React Testing Strategies' },
        ],
      };
      const issues = validator.validate(input);
      const rule142 = issues.find(i => i.ruleId === 'rule-142');
      expect(rule142).toBeDefined();
      expect(rule142!.severity).toBe('medium');
      expect(rule142!.description).toContain('react');
    });

    it('passes when no significant word exceeds 2 repetitions', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content about web development.',
        headings: [
          { level: 2, text: 'Understanding Components' },
          { level: 2, text: 'State Management Basics' },
          { level: 2, text: 'Routing and Navigation' },
          { level: 2, text: 'Testing Strategies' },
        ],
      };
      const issues = validator.validate(input);
      expect(issues.find(i => i.ruleId === 'rule-142')).toBeUndefined();
    });
  });

  // ---- Rule 143: Heading semantic progression ----

  describe('Rule 143 — Heading semantic progression', () => {
    it('flags when introduction heading is not near the start', () => {
      const input: HeadingDiscourseInput = {
        text: 'Some content.',
        headings: [
          { level: 2, text: 'Advanced Patterns' },
          { level: 2, text: 'Common Pitfalls' },
          { level: 2, text: 'Introduction to React' },
          { level: 2, text: 'Summary' },
        ],
      };
      const issues = validator.validate(input);
      const rule143 = issues.find(i => i.ruleId === 'rule-143');
      expect(rule143).toBeDefined();
      expect(rule143!.description).toContain('Introduction');
    });

    it('flags when conclusion heading is not near the end', () => {
      const input: HeadingDiscourseInput = {
        text: 'Some content.',
        headings: [
          { level: 2, text: 'Conclusion' },
          { level: 2, text: 'Setup Guide' },
          { level: 2, text: 'Configuration' },
          { level: 2, text: 'Deployment' },
        ],
      };
      const issues = validator.validate(input);
      const rule143 = issues.find(i => i.ruleId === 'rule-143');
      expect(rule143).toBeDefined();
      expect(rule143!.description).toContain('Conclusion');
    });

    it('passes when headings follow logical progression', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [
          { level: 2, text: 'Introduction to TypeScript' },
          { level: 2, text: 'Type System Basics' },
          { level: 2, text: 'Advanced Types' },
          { level: 2, text: 'Conclusion' },
        ],
      };
      const issues = validator.validate(input);
      expect(issues.find(i => i.ruleId === 'rule-143')).toBeUndefined();
    });
  });

  // ---- Rule 147: Heading parallelism ----

  describe('Rule 147 — Heading parallelism', () => {
    it('flags when sibling headings have mixed grammatical patterns', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [
          { level: 2, text: 'Install the Dependencies' },
          { level: 2, text: 'What is Configuration?' },
          { level: 2, text: 'Deployment Strategies' },
          { level: 2, text: 'How to Test Applications' },
          { level: 2, text: 'Why Use Containers?' },
        ],
      };
      const issues = validator.validate(input);
      const rule147 = issues.find(i => i.ruleId === 'rule-147');
      expect(rule147).toBeDefined();
      expect(rule147!.severity).toBe('medium');
    });

    it('passes when sibling headings use consistent patterns', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [
          { level: 2, text: 'Install the Framework' },
          { level: 2, text: 'Configure the Database' },
          { level: 2, text: 'Deploy the Application' },
        ],
      };
      const issues = validator.validate(input);
      expect(issues.find(i => i.ruleId === 'rule-147')).toBeUndefined();
    });
  });

  // ---- Rule 149: Heading uniqueness ----

  describe('Rule 149 — Heading uniqueness across sections', () => {
    it('flags near-duplicate headings at the same level', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [
          { level: 2, text: 'Benefits of React Hooks' },
          { level: 2, text: 'Benefits of React Hooks Usage' },
          { level: 2, text: 'Drawbacks to Consider' },
        ],
      };
      const issues = validator.validate(input);
      const rule149 = issues.find(i => i.ruleId === 'rule-149');
      expect(rule149).toBeDefined();
      expect(rule149!.severity).toBe('low');
    });

    it('passes when headings are sufficiently different', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [
          { level: 2, text: 'Performance Optimization Techniques' },
          { level: 2, text: 'Security Best Practices' },
          { level: 2, text: 'Deployment Strategies' },
        ],
      };
      const issues = validator.validate(input);
      expect(issues.find(i => i.ruleId === 'rule-149')).toBeUndefined();
    });
  });

  // ---- Rule 150: Section transitions ----

  describe('Rule 150 — Section transitions', () => {
    it('flags sections that lack transitional opening sentences', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [
          { level: 2, text: 'First Section' },
          { level: 2, text: 'Second Section' },
          { level: 2, text: 'Third Section' },
        ],
        sections: [
          'This article covers the basics of React development and its core principles.',
          'React components are the building blocks of any application. They encapsulate logic and UI.',
          'State management is handled through hooks. The useState hook is the most common approach.',
          'Performance tuning requires careful attention. Memoization helps avoid unnecessary re-renders.',
        ],
      };
      const issues = validator.validate(input);
      const rule150 = issues.find(i => i.ruleId === 'rule-150');
      expect(rule150).toBeDefined();
      expect(rule150!.severity).toBe('medium');
    });

    it('passes when sections have proper transitions', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [
          { level: 2, text: 'First' },
          { level: 2, text: 'Second' },
          { level: 2, text: 'Third' },
        ],
        sections: [
          'This article covers the basics of React development and its core principles.',
          'Building on the fundamentals, React components are the building blocks of any application.',
          'Moreover, state management is handled through hooks for cleaner code patterns.',
          'Turning to performance, careful optimization requires memoization and code splitting.',
        ],
      };
      const issues = validator.validate(input);
      expect(issues.find(i => i.ruleId === 'rule-150')).toBeUndefined();
    });
  });

  // ---- Rule 151: Topic sentence presence ----

  describe('Rule 151 — Topic sentence presence', () => {
    it('flags paragraphs starting with continuation words', () => {
      const input: HeadingDiscourseInput = {
        text: [
          'React is a popular JavaScript library for building user interfaces.',
          'Also, it provides a component-based architecture that promotes reusability.',
          'Additionally, the virtual DOM makes updates efficient and fast.',
          'Furthermore, hooks simplify state management in functional components.',
        ].join('\n\n'),
        headings: [],
      };
      const issues = validator.validate(input);
      const rule151 = issues.find(i => i.ruleId === 'rule-151');
      expect(rule151).toBeDefined();
      expect(rule151!.description).toContain('3 paragraph(s)');
    });

    it('passes when paragraphs start with proper topic sentences', () => {
      const input: HeadingDiscourseInput = {
        text: [
          'React is a popular JavaScript library for building user interfaces.',
          'Components form the backbone of React applications, encapsulating logic and rendering.',
          'State management provides the mechanism for handling dynamic data within components.',
          'Performance optimization requires careful attention to re-rendering patterns.',
        ].join('\n\n'),
        headings: [],
      };
      const issues = validator.validate(input);
      expect(issues.find(i => i.ruleId === 'rule-151')).toBeUndefined();
    });
  });

  // ---- Rule 152: Conclusion signals ----

  describe('Rule 152 — Conclusion signals', () => {
    it('flags when the final section lacks conclusion markers', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [
          { level: 2, text: 'Setup' },
          { level: 2, text: 'Implementation' },
          { level: 2, text: 'Advanced Tips' },
        ],
        sections: [
          'This article explains setup procedures.',
          'Implementation involves several steps.',
          'Here are some advanced tips for experienced developers to improve their workflow.',
        ],
      };
      const issues = validator.validate(input);
      const rule152 = issues.find(i => i.ruleId === 'rule-152');
      expect(rule152).toBeDefined();
      expect(rule152!.severity).toBe('low');
    });

    it('passes when the final section contains conclusion markers', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [
          { level: 2, text: 'Setup' },
          { level: 2, text: 'Implementation' },
          { level: 2, text: 'Wrap Up' },
        ],
        sections: [
          'This article explains setup procedures.',
          'Implementation involves several steps.',
          'In summary, following these steps will ensure a smooth setup and deployment process.',
        ],
      };
      const issues = validator.validate(input);
      expect(issues.find(i => i.ruleId === 'rule-152')).toBeUndefined();
    });

    it('passes when the last heading is conclusion-like even without markers in text', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [
          { level: 2, text: 'Setup' },
          { level: 2, text: 'Conclusion' },
        ],
        sections: [
          'This article explains setup procedures.',
          'React hooks have transformed the way developers build applications.',
        ],
      };
      const issues = validator.validate(input);
      expect(issues.find(i => i.ruleId === 'rule-152')).toBeUndefined();
    });
  });

  // ---- Rule 153: Introduction-conclusion alignment ----

  describe('Rule 153 — Introduction-conclusion alignment', () => {
    it('flags when conclusion does not revisit introduction themes', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [],
        sections: [
          'React hooks provide a powerful mechanism for state management and lifecycle control in functional components. The useState and useEffect hooks are the most commonly used.',
          'Middle section content about various implementation details.',
          'Databases require careful indexing strategies. SQL optimization and caching layers improve query throughput and reduce latency in production environments.',
        ],
      };
      const issues = validator.validate(input);
      const rule153 = issues.find(i => i.ruleId === 'rule-153');
      expect(rule153).toBeDefined();
      expect(rule153!.severity).toBe('low');
    });

    it('passes when conclusion revisits introduction themes', () => {
      const input: HeadingDiscourseInput = {
        text: 'Content.',
        headings: [],
        sections: [
          'React hooks provide a powerful mechanism for state management and lifecycle control in functional components.',
          'The useState hook manages local state while useEffect handles side effects.',
          'In conclusion, React hooks have simplified state management and lifecycle control, making functional components the preferred approach.',
        ],
      };
      const issues = validator.validate(input);
      expect(issues.find(i => i.ruleId === 'rule-153')).toBeUndefined();
    });
  });

  // ---- Comprehensive: well-structured content passes all rules ----

  describe('Comprehensive passing case', () => {
    it('returns no issues for well-structured content', () => {
      const input: HeadingDiscourseInput = {
        text: [
          'React development has evolved significantly in recent years, introducing hooks as a new paradigm.',
          'Components are the building blocks of any React application and encapsulate UI logic.',
          'State management through hooks provides a cleaner alternative to class-based patterns.',
          'In summary, React hooks have simplified development by providing state management and lifecycle control.',
        ].join('\n\n'),
        headings: [
          { level: 2, text: 'Overview of Modern React' },
          { level: 2, text: 'Understanding Components' },
          { level: 2, text: 'State Management with Hooks' },
          { level: 2, text: 'Summary' },
        ],
        sections: [
          'React development has evolved significantly in recent years, introducing hooks as a new paradigm.',
          'Building on the fundamentals, components are the building blocks of any React application and encapsulate UI logic.',
          'Moreover, state management through hooks provides a cleaner alternative to class-based patterns.',
          'In summary, React hooks have simplified development by providing state management and lifecycle control.',
        ],
      };
      const issues = validator.validate(input);

      // Should have no heading or discourse issues
      const ruleIds = ['rule-142', 'rule-143', 'rule-147', 'rule-149', 'rule-150', 'rule-151', 'rule-152', 'rule-153'];
      for (const ruleId of ruleIds) {
        expect(issues.find(i => i.ruleId === ruleId)).toBeUndefined();
      }
    });
  });

  // ---- Helper method tests ----

  describe('Helper methods', () => {
    it('calculates Jaccard similarity correctly', () => {
      // Identical strings => 1.0
      expect(validator.jaccardSimilarity('hello world', 'hello world')).toBe(1);

      // Completely different => 0
      expect(validator.jaccardSimilarity('hello world', 'foo bar')).toBe(0);

      // Partial overlap
      const sim = validator.jaccardSimilarity('benefits of react hooks', 'benefits of react hooks usage');
      expect(sim).toBeGreaterThan(0.7);
    });

    it('classifies heading patterns correctly', () => {
      expect(validator.classifyHeadingPattern('What is React?')).toBe('question');
      expect(validator.classifyHeadingPattern('How to Install React')).toBe('how-to');
      expect(validator.classifyHeadingPattern('Install the Framework')).toBe('verb-imperative');
      expect(validator.classifyHeadingPattern('Building Components')).toBe('gerund');
      expect(validator.classifyHeadingPattern('React Components')).toBe('noun-phrase');
    });

    it('extracts significant words excluding stop words', () => {
      const words = validator.extractSignificantWords('The Benefits of Using React Hooks');
      expect(words).toContain('benefits');
      expect(words).toContain('using');
      expect(words).toContain('react');
      expect(words).toContain('hooks');
      expect(words).not.toContain('the');
      expect(words).not.toContain('of');
    });
  });
});
