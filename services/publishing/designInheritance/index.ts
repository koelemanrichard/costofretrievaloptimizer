/**
 * Design Inheritance Module
 *
 * Provides hierarchical design inheritance:
 * Project → Topical Map → Article
 *
 * @module services/publishing/designInheritance
 */

export {
  DesignInheritanceService,
  initDesignInheritanceService,
  getDesignInheritanceService,
} from './DesignInheritanceService';

export type {
  DesignInheritanceConfig,
  DesignProfileRow,
  ProjectDesignDefaultsRow,
  TopicalMapDesignRulesRow,
} from './DesignInheritanceService';
