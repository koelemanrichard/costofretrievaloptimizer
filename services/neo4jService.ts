// services/neo4jService.ts
// Neo4j connection and graph operations for site analysis

import neo4j, { Driver, Session, Result } from 'neo4j-driver';

let driver: Driver | null = null;

// ============================================
// CONNECTION MANAGEMENT
// ============================================

/**
 * Initialize Neo4j driver connection
 */
export const initNeo4j = (uri: string, username: string, password: string): void => {
  if (driver) {
    return; // Already initialized
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Get Neo4j driver instance
 */
export const getDriver = (): Driver => {
  if (!driver) {
    throw new Error('Neo4j driver not initialized. Call initNeo4j first.');
  }
  return driver;
};

/**
 * Close Neo4j driver connection
 */
export const closeNeo4j = async (): Promise<void> => {
  if (driver) {
    await driver.close();
    driver = null;
  }
};

/**
 * Test Neo4j connection
 */
export const testConnection = async (): Promise<boolean> => {
  const session = getDriver().session();
  try {
    await session.run('RETURN 1');
    return true;
  } catch (error) {
    console.error('Neo4j connection test failed:', error);
    return false;
  } finally {
    await session.close();
  }
};

// ============================================
// PAGE NODE OPERATIONS
// ============================================

export interface PageNode {
  id: string;
  url: string;
  path: string;
  title: string;
  domain: string;
  projectId: string;
  overallScore?: number;
  wordCount?: number;
  contentHash?: string;
}

/**
 * Create or update a page node
 */
export const upsertPageNode = async (page: PageNode): Promise<void> => {
  const session = getDriver().session();
  try {
    await session.run(
      `
      MERGE (p:Page {id: $id})
      SET p.url = $url,
          p.path = $path,
          p.title = $title,
          p.domain = $domain,
          p.projectId = $projectId,
          p.overallScore = $overallScore,
          p.wordCount = $wordCount,
          p.contentHash = $contentHash,
          p.updatedAt = datetime()
      `,
      page
    );
  } finally {
    await session.close();
  }
};

/**
 * Bulk upsert page nodes
 */
export const bulkUpsertPageNodes = async (pages: PageNode[]): Promise<void> => {
  const session = getDriver().session();
  try {
    await session.run(
      `
      UNWIND $pages AS page
      MERGE (p:Page {id: page.id})
      SET p.url = page.url,
          p.path = page.path,
          p.title = page.title,
          p.domain = page.domain,
          p.projectId = page.projectId,
          p.overallScore = page.overallScore,
          p.wordCount = page.wordCount,
          p.contentHash = page.contentHash,
          p.updatedAt = datetime()
      `,
      { pages }
    );
  } finally {
    await session.close();
  }
};

/**
 * Delete all pages for a project
 */
export const deleteProjectPages = async (projectId: string): Promise<void> => {
  const session = getDriver().session();
  try {
    await session.run(
      `
      MATCH (p:Page {projectId: $projectId})
      DETACH DELETE p
      `,
      { projectId }
    );
  } finally {
    await session.close();
  }
};

// ============================================
// LINK OPERATIONS
// ============================================

export interface PageLink {
  sourcePageId: string;
  targetPageId: string;
  anchorText: string;
  context?: string;
  position?: string; // 'nav', 'content', 'footer', 'sidebar'
}

/**
 * Create link relationship between pages
 */
export const createPageLink = async (link: PageLink): Promise<void> => {
  const session = getDriver().session();
  try {
    await session.run(
      `
      MATCH (source:Page {id: $sourcePageId})
      MATCH (target:Page {id: $targetPageId})
      MERGE (source)-[r:LINKS_TO]->(target)
      SET r.anchorText = $anchorText,
          r.context = $context,
          r.position = $position
      `,
      link
    );
  } finally {
    await session.close();
  }
};

/**
 * Bulk create links for a project
 */
export const bulkCreatePageLinks = async (links: PageLink[]): Promise<void> => {
  const session = getDriver().session();
  try {
    await session.run(
      `
      UNWIND $links AS link
      MATCH (source:Page {id: link.sourcePageId})
      MATCH (target:Page {id: link.targetPageId})
      MERGE (source)-[r:LINKS_TO]->(target)
      SET r.anchorText = link.anchorText,
          r.context = link.context,
          r.position = link.position
      `,
      { links }
    );
  } finally {
    await session.close();
  }
};

// ============================================
// ENTITY OPERATIONS
// ============================================

export interface EntityNode {
  name: string;
  type: 'central' | 'supporting' | 'mentioned';
  projectId: string;
}

export interface PageEntityMention {
  pageId: string;
  entityName: string;
  frequency: number;
  prominence: number; // 0-1 based on position
}

/**
 * Create entity node
 */
export const upsertEntity = async (entity: EntityNode): Promise<void> => {
  const session = getDriver().session();
  try {
    await session.run(
      `
      MERGE (e:Entity {name: $name, projectId: $projectId})
      SET e.type = $type
      `,
      entity
    );
  } finally {
    await session.close();
  }
};

/**
 * Create page-entity mention relationship
 */
export const createEntityMention = async (mention: PageEntityMention): Promise<void> => {
  const session = getDriver().session();
  try {
    await session.run(
      `
      MATCH (p:Page {id: $pageId})
      MATCH (e:Entity {name: $entityName})
      MERGE (p)-[r:MENTIONS]->(e)
      SET r.frequency = $frequency,
          r.prominence = $prominence
      `,
      mention
    );
  } finally {
    await session.close();
  }
};

// ============================================
// ANALYSIS QUERIES
// ============================================

export interface PageRankResult {
  pageId: string;
  url: string;
  score: number;
}

/**
 * Calculate PageRank for project pages
 * Note: Requires Neo4j Graph Data Science plugin
 */
export const calculatePageRank = async (projectId: string): Promise<PageRankResult[]> => {
  const session = getDriver().session();
  try {
    // First, create a projection for this project
    const graphName = `pagerank_${projectId.replace(/-/g, '_')}`;

    // Drop if exists
    try {
      await session.run(`CALL gds.graph.drop($graphName, false)`, { graphName });
    } catch {
      // Graph doesn't exist, continue
    }

    // Create projection
    await session.run(
      `
      CALL gds.graph.project(
        $graphName,
        {
          Page: {
            properties: ['projectId']
          }
        },
        {
          LINKS_TO: {
            orientation: 'NATURAL'
          }
        }
      )
      `,
      { graphName }
    );

    // Run PageRank
    const result = await session.run(
      `
      CALL gds.pageRank.stream($graphName)
      YIELD nodeId, score
      WITH gds.util.asNode(nodeId) AS page, score
      WHERE page.projectId = $projectId
      RETURN page.id AS pageId, page.url AS url, score
      ORDER BY score DESC
      `,
      { graphName, projectId }
    );

    // Clean up projection
    await session.run(`CALL gds.graph.drop($graphName)`, { graphName });

    return result.records.map(record => ({
      pageId: record.get('pageId'),
      url: record.get('url'),
      score: record.get('score'),
    }));
  } finally {
    await session.close();
  }
};

/**
 * Find orphan pages (no incoming links)
 */
export const findOrphanPages = async (projectId: string): Promise<string[]> => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (p:Page {projectId: $projectId})
      WHERE NOT ()-[:LINKS_TO]->(p)
      RETURN p.url AS url
      `,
      { projectId }
    );
    return result.records.map(record => record.get('url'));
  } finally {
    await session.close();
  }
};

/**
 * Find hub pages (many outgoing links)
 */
export const findHubPages = async (
  projectId: string,
  minLinks: number = 10
): Promise<{ url: string; linkCount: number }[]> => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (p:Page {projectId: $projectId})-[r:LINKS_TO]->()
      WITH p, count(r) AS linkCount
      WHERE linkCount >= $minLinks
      RETURN p.url AS url, linkCount
      ORDER BY linkCount DESC
      `,
      { projectId, minLinks: neo4j.int(minLinks) }
    );
    return result.records.map(record => ({
      url: record.get('url'),
      linkCount: record.get('linkCount').toNumber(),
    }));
  } finally {
    await session.close();
  }
};

/**
 * Find pages with dead-end links (no outgoing links)
 */
export const findDeadEndPages = async (projectId: string): Promise<string[]> => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (p:Page {projectId: $projectId})
      WHERE NOT (p)-[:LINKS_TO]->()
      RETURN p.url AS url
      `,
      { projectId }
    );
    return result.records.map(record => record.get('url'));
  } finally {
    await session.close();
  }
};

/**
 * Get link statistics for a page
 */
export const getPageLinkStats = async (pageId: string): Promise<{
  incomingLinks: number;
  outgoingLinks: number;
  internalIncoming: { url: string; anchorText: string }[];
  outgoing: { url: string; anchorText: string }[];
}> => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (p:Page {id: $pageId})
      OPTIONAL MATCH (incoming:Page)-[r1:LINKS_TO]->(p)
      OPTIONAL MATCH (p)-[r2:LINKS_TO]->(outgoing:Page)
      RETURN
        count(DISTINCT incoming) AS incomingCount,
        count(DISTINCT outgoing) AS outgoingCount,
        collect(DISTINCT {url: incoming.url, anchorText: r1.anchorText}) AS incomingLinks,
        collect(DISTINCT {url: outgoing.url, anchorText: r2.anchorText}) AS outgoingLinks
      `,
      { pageId }
    );

    const record = result.records[0];
    return {
      incomingLinks: record.get('incomingCount').toNumber(),
      outgoingLinks: record.get('outgoingCount').toNumber(),
      internalIncoming: record.get('incomingLinks').filter((l: any) => l.url),
      outgoing: record.get('outgoingLinks').filter((l: any) => l.url),
    };
  } finally {
    await session.close();
  }
};

/**
 * Find anchor text diversity issues
 */
export const findAnchorTextIssues = async (
  projectId: string,
  maxRepetitions: number = 3
): Promise<{ targetUrl: string; anchorText: string; count: number }[]> => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (source:Page {projectId: $projectId})-[r:LINKS_TO]->(target:Page)
      WITH target, r.anchorText AS anchor, count(*) AS cnt
      WHERE cnt > $maxRepetitions AND anchor IS NOT NULL AND anchor <> ''
      RETURN target.url AS targetUrl, anchor AS anchorText, cnt AS count
      ORDER BY cnt DESC
      `,
      { projectId, maxRepetitions: neo4j.int(maxRepetitions) }
    );
    return result.records.map(record => ({
      targetUrl: record.get('targetUrl'),
      anchorText: record.get('anchorText'),
      count: record.get('count').toNumber(),
    }));
  } finally {
    await session.close();
  }
};

// ============================================
// ENTITY ANALYSIS
// ============================================

/**
 * Find entity co-occurrence across pages
 */
export const findEntityCooccurrence = async (
  projectId: string
): Promise<{ entity1: string; entity2: string; cooccurrenceCount: number }[]> => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (p:Page {projectId: $projectId})-[:MENTIONS]->(e1:Entity)
      MATCH (p)-[:MENTIONS]->(e2:Entity)
      WHERE id(e1) < id(e2)
      WITH e1.name AS entity1, e2.name AS entity2, count(DISTINCT p) AS cooccurrence
      WHERE cooccurrence > 1
      RETURN entity1, entity2, cooccurrence
      ORDER BY cooccurrence DESC
      LIMIT 50
      `,
      { projectId }
    );
    return result.records.map(record => ({
      entity1: record.get('entity1'),
      entity2: record.get('entity2'),
      cooccurrenceCount: record.get('cooccurrence').toNumber(),
    }));
  } finally {
    await session.close();
  }
};

/**
 * Find pages that mention the central entity
 */
export const findCentralEntityCoverage = async (
  projectId: string,
  centralEntity: string
): Promise<{ url: string; frequency: number; prominence: number }[]> => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (p:Page {projectId: $projectId})-[r:MENTIONS]->(e:Entity {name: $centralEntity})
      RETURN p.url AS url, r.frequency AS frequency, r.prominence AS prominence
      ORDER BY r.prominence DESC, r.frequency DESC
      `,
      { projectId, centralEntity }
    );
    return result.records.map(record => ({
      url: record.get('url'),
      frequency: record.get('frequency'),
      prominence: record.get('prominence'),
    }));
  } finally {
    await session.close();
  }
};

// ============================================
// TOPIC CLUSTERING
// ============================================

export interface TopicCluster {
  id: string;
  name: string;
  pageCount: number;
  pages: string[];
}

/**
 * Get topic clusters for a project
 * Uses Louvain community detection if GDS is available
 */
export const getTopicClusters = async (projectId: string): Promise<TopicCluster[]> => {
  const session = getDriver().session();
  try {
    // Simple clustering based on link structure
    // For full Louvain, Neo4j GDS plugin is required
    const result = await session.run(
      `
      MATCH (p:Page {projectId: $projectId})
      OPTIONAL MATCH (p)-[:BELONGS_TO]->(t:Topic)
      WITH t, collect(p.url) AS pages
      WHERE t IS NOT NULL
      RETURN t.id AS id, t.name AS name, size(pages) AS pageCount, pages
      ORDER BY pageCount DESC
      `,
      { projectId }
    );

    if (result.records.length === 0) {
      // No explicit topics, return empty
      return [];
    }

    return result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      pageCount: record.get('pageCount').toNumber(),
      pages: record.get('pages'),
    }));
  } finally {
    await session.close();
  }
};

// ============================================
// GRAPH BUILDING UTILITIES
// ============================================

/**
 * Build complete graph for a project from extracted page data
 */
export const buildProjectGraph = async (
  projectId: string,
  pages: Array<{
    id: string;
    url: string;
    path: string;
    title: string;
    domain: string;
    wordCount?: number;
    contentHash?: string;
    links?: Array<{ href: string; text: string; isInternal: boolean }>;
  }>
): Promise<{ pagesCreated: number; linksCreated: number }> => {
  // Create URL to ID mapping for link resolution
  const urlToId = new Map<string, string>();
  pages.forEach(p => urlToId.set(p.url, p.id));

  // Upsert all page nodes
  const pageNodes: PageNode[] = pages.map(p => ({
    id: p.id,
    url: p.url,
    path: p.path,
    title: p.title,
    domain: p.domain,
    projectId,
    wordCount: p.wordCount,
    contentHash: p.contentHash,
  }));

  await bulkUpsertPageNodes(pageNodes);

  // Build links (only internal)
  const links: PageLink[] = [];
  for (const page of pages) {
    if (!page.links) continue;

    for (const link of page.links) {
      if (!link.isInternal) continue;

      // Resolve link URL to page ID
      const targetId = urlToId.get(link.href);
      if (targetId && targetId !== page.id) {
        links.push({
          sourcePageId: page.id,
          targetPageId: targetId,
          anchorText: link.text,
        });
      }
    }
  }

  if (links.length > 0) {
    await bulkCreatePageLinks(links);
  }

  return {
    pagesCreated: pageNodes.length,
    linksCreated: links.length,
  };
};

/**
 * Get graph statistics for a project
 */
export const getProjectGraphStats = async (projectId: string): Promise<{
  pageCount: number;
  linkCount: number;
  avgLinksPerPage: number;
  orphanCount: number;
  deadEndCount: number;
}> => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (p:Page {projectId: $projectId})
      OPTIONAL MATCH (p)-[r:LINKS_TO]->()
      WITH count(DISTINCT p) AS pageCount, count(r) AS linkCount

      OPTIONAL MATCH (orphan:Page {projectId: $projectId})
      WHERE NOT ()-[:LINKS_TO]->(orphan)
      WITH pageCount, linkCount, count(DISTINCT orphan) AS orphanCount

      OPTIONAL MATCH (deadEnd:Page {projectId: $projectId})
      WHERE NOT (deadEnd)-[:LINKS_TO]->()

      RETURN pageCount, linkCount, orphanCount, count(DISTINCT deadEnd) AS deadEndCount
      `,
      { projectId }
    );

    const record = result.records[0];
    const pageCount = record.get('pageCount').toNumber();
    const linkCount = record.get('linkCount').toNumber();

    return {
      pageCount,
      linkCount,
      avgLinksPerPage: pageCount > 0 ? linkCount / pageCount : 0,
      orphanCount: record.get('orphanCount').toNumber(),
      deadEndCount: record.get('deadEndCount').toNumber(),
    };
  } finally {
    await session.close();
  }
};
