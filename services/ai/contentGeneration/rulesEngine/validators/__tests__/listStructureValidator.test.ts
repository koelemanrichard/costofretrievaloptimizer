// services/ai/contentGeneration/rulesEngine/validators/__tests__/listStructureValidator.test.ts
import { ListStructureValidator } from '../listStructureValidator';

describe('ListStructureValidator', () => {
  describe('extractLists', () => {
    it('should extract unordered lists from HTML', () => {
      const content = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
      const lists = ListStructureValidator.extractLists(content);
      expect(lists.length).toBe(1);
      expect(lists[0].items.length).toBe(3);
    });

    it('should extract ordered lists from HTML', () => {
      const content = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
      const lists = ListStructureValidator.extractLists(content);
      expect(lists.length).toBe(1);
      expect(lists[0].type).toBe('ordered');
    });

    it('should extract markdown lists', () => {
      const content = '- Item A\n- Item B\n- Item C\n- Item D';
      const lists = ListStructureValidator.extractLists(content);
      expect(lists.length).toBe(1);
      expect(lists[0].items.length).toBe(4);
    });

    it('should extract multiple lists from content', () => {
      const content = '<ul><li>One</li><li>Two</li><li>Three</li></ul><p>Some text</p><ol><li>A</li><li>B</li><li>C</li></ol>';
      const lists = ListStructureValidator.extractLists(content);
      expect(lists.length).toBe(2);
      expect(lists[0].type).toBe('unordered');
      expect(lists[1].type).toBe('ordered');
    });

    it('should extract markdown ordered lists', () => {
      const content = '1. First item\n2. Second item\n3. Third item';
      const lists = ListStructureValidator.extractLists(content);
      expect(lists.length).toBe(1);
      expect(lists[0].type).toBe('ordered');
      expect(lists[0].items.length).toBe(3);
    });

    it('should handle nested HTML in list items', () => {
      const content = '<ul><li><strong>Bold</strong> item</li><li>Normal item</li><li>Another <em>italic</em> item</li></ul>';
      const lists = ListStructureValidator.extractLists(content);
      expect(lists.length).toBe(1);
      expect(lists[0].items[0]).toBe('Bold item');
      expect(lists[0].items[2]).toBe('Another italic item');
    });
  });

  describe('validateItemCount (K4)', () => {
    it('should pass for lists with 3-7 items', () => {
      const content = '<ul><li>One</li><li>Two</li><li>Three</li><li>Four</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      const k4Violations = violations.filter(v => v.rule === 'K4_LIST_ITEM_COUNT');
      expect(k4Violations.length).toBe(0);
    });

    it('should pass for lists with exactly 3 items', () => {
      const content = '<ul><li>One</li><li>Two</li><li>Three</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      const k4Violations = violations.filter(v => v.rule === 'K4_LIST_ITEM_COUNT');
      expect(k4Violations.length).toBe(0);
    });

    it('should pass for lists with exactly 7 items', () => {
      const content = '<ul><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li><li>6</li><li>7</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      const k4Violations = violations.filter(v => v.rule === 'K4_LIST_ITEM_COUNT');
      expect(k4Violations.length).toBe(0);
    });

    it('should fail for lists with less than 3 items', () => {
      const content = '<ul><li>One</li><li>Two</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'K4_LIST_ITEM_COUNT')).toBe(true);
    });

    it('should fail for lists with only 1 item', () => {
      const content = '<ul><li>Only one</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      const k4Violations = violations.filter(v => v.rule === 'K4_LIST_ITEM_COUNT');
      expect(k4Violations.length).toBe(1);
      expect(k4Violations[0].text).toContain('1 items');
    });

    it('should fail for lists with more than 7 items', () => {
      const content = '<ul><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li><li>6</li><li>7</li><li>8</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'K4_LIST_ITEM_COUNT')).toBe(true);
    });

    it('should report correct item count in violation message', () => {
      const content = '<ul><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li><li>6</li><li>7</li><li>8</li><li>9</li><li>10</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      const k4Violations = violations.filter(v => v.rule === 'K4_LIST_ITEM_COUNT');
      expect(k4Violations[0].text).toContain('10 items');
    });
  });

  describe('validateParallelStructure (K5)', () => {
    it('should pass for parallel structure (all start with verbs)', () => {
      const content = '<ul><li>Install the software</li><li>Configure the settings</li><li>Run the application</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      const k5Violations = violations.filter(v => v.rule === 'K5_PARALLEL_STRUCTURE');
      expect(k5Violations.length).toBe(0);
    });

    it('should pass for parallel structure (all gerunds)', () => {
      const content = '<ul><li>Installing dependencies</li><li>Running tests</li><li>Building output</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      const k5Violations = violations.filter(v => v.rule === 'K5_PARALLEL_STRUCTURE');
      expect(k5Violations.length).toBe(0);
    });

    it('should pass for parallel structure (all noun phrases)', () => {
      const content = '<ul><li>The configuration file</li><li>The database schema</li><li>The API endpoints</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      const k5Violations = violations.filter(v => v.rule === 'K5_PARALLEL_STRUCTURE');
      expect(k5Violations.length).toBe(0);
    });

    it('should fail for non-parallel structure', () => {
      const content = '<ul><li>Installing software</li><li>To configure settings</li><li>Application running</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'K5_PARALLEL_STRUCTURE')).toBe(true);
    });

    it('should fail when list items mix imperatives and gerunds', () => {
      const content = '<ul><li>Install the app</li><li>Running the tests</li><li>Configure the database</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'K5_PARALLEL_STRUCTURE')).toBe(true);
    });

    it('should skip parallel structure check for lists with fewer than 3 items', () => {
      const content = '<ul><li>Installing</li><li>To run</li></ul>';
      const violations = ListStructureValidator.validate(content, {} as any);
      const k5Violations = violations.filter(v => v.rule === 'K5_PARALLEL_STRUCTURE');
      // Should not have K5 violations (only K4 for item count)
      expect(k5Violations.length).toBe(0);
    });
  });

  describe('checkParallelStructure', () => {
    it('should identify imperative pattern', () => {
      const items = ['Install the app', 'Configure settings', 'Run tests'];
      const result = ListStructureValidator.checkParallelStructure(items);
      expect(result.isParallel).toBe(true);
      expect(result.dominantPattern).toBe('imperative');
    });

    it('should identify gerund pattern', () => {
      const items = ['Installing apps', 'Configuring settings', 'Running tests'];
      const result = ListStructureValidator.checkParallelStructure(items);
      expect(result.isParallel).toBe(true);
      expect(result.dominantPattern).toBe('gerund');
    });

    it('should identify noun phrase pattern', () => {
      const items = ['The first option', 'The second choice', 'The third alternative'];
      const result = ListStructureValidator.checkParallelStructure(items);
      expect(result.isParallel).toBe(true);
      expect(result.dominantPattern).toBe('noun-phrase');
    });

    it('should report violations when patterns do not match', () => {
      const items = ['Install the app', 'Running tests', 'Configure database'];
      const result = ListStructureValidator.checkParallelStructure(items);
      expect(result.isParallel).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should handle single item lists gracefully', () => {
      const items = ['Just one item'];
      const result = ListStructureValidator.checkParallelStructure(items);
      expect(result.isParallel).toBe(true);
    });

    it('should handle empty lists gracefully', () => {
      const items: string[] = [];
      const result = ListStructureValidator.checkParallelStructure(items);
      expect(result.isParallel).toBe(true);
    });
  });

  describe('integration with markdown content', () => {
    it('should validate markdown unordered lists', () => {
      const content = '- First\n- Second';
      const violations = ListStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'K4_LIST_ITEM_COUNT')).toBe(true);
    });

    it('should validate markdown ordered lists', () => {
      const content = '1. Install software\n2. Configure settings\n3. Run application\n4. Test results';
      const violations = ListStructureValidator.validate(content, {} as any);
      const k4Violations = violations.filter(v => v.rule === 'K4_LIST_ITEM_COUNT');
      expect(k4Violations.length).toBe(0);
    });
  });
});
