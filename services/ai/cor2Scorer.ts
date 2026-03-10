/**
 * CoR 2.0 Scorer
 *
 * Computes a 6-factor weighted LLM readiness score (0-5) from audit results.
 * Measures how well content is optimized for RAG retrieval, AI Overviews,
 * and Featured Snippets alongside traditional search.
 */

export interface Cor2Input {
  chunkingIssueCount: number;
  totalSections: number;
  fillerWordCount: number;
  totalWords: number;
  capsuleCompliantSections: number;
  totalH2Sections: number;
  pronounDensity: number; // 0-1
  hasQuestionH2s: boolean;
  hasSemanticHtml: boolean;
  hasProperNesting: boolean;
  hasArticleSchema: boolean;
  hasAuthorEntity: boolean;
  hasCanonical: boolean;
}

export interface Cor2Result {
  score: number; // 0-5
  interpretation: 'fully_optimized' | 'good_foundation' | 'significant_gaps' | 'not_optimized';
  factors: Record<string, { score: number; weight: number; label: string }>;
}

export function computeCor2Score(input: Cor2Input): Cor2Result {
  // Factor 1: Self-contained sections (20%)
  const chunkingRatio = input.totalSections > 0
    ? Math.max(0, 1 - (input.chunkingIssueCount / input.totalSections))
    : 0.5;
  const selfContained = chunkingRatio * 5;

  // Factor 2: Information density (20%)
  const fillerRatio = input.totalWords > 0
    ? input.fillerWordCount / input.totalWords
    : 0;
  const density = Math.max(0, 5 - (fillerRatio * 50));

  // Factor 3: Answer capsule compliance (15%)
  const capsuleRatio = input.totalH2Sections > 0
    ? input.capsuleCompliantSections / input.totalH2Sections
    : 0;
  const capsule = capsuleRatio * 5;

  // Factor 4: Entity explicitness (15%)
  const entityScore = input.pronounDensity <= 0.05 ? 5
    : input.pronounDensity <= 0.10 ? 3.5
    : input.pronounDensity <= 0.15 ? 2
    : 1;

  // Factor 5: Structural clarity (15%)
  let structurePoints = 0;
  if (input.hasQuestionH2s) structurePoints += 2;
  if (input.hasSemanticHtml) structurePoints += 1.5;
  if (input.hasProperNesting) structurePoints += 1.5;
  const structure = structurePoints;

  // Factor 6: Attribution integrity (15%)
  let attrPoints = 0;
  if (input.hasArticleSchema) attrPoints += 2;
  if (input.hasAuthorEntity) attrPoints += 1.5;
  if (input.hasCanonical) attrPoints += 1.5;
  const attribution = attrPoints;

  // Weighted total
  const score = Math.round((
    selfContained * 0.20 +
    density * 0.20 +
    capsule * 0.15 +
    entityScore * 0.15 +
    structure * 0.15 +
    attribution * 0.15
  ) * 10) / 10;

  const interpretation: Cor2Result['interpretation'] =
    score >= 4.5 ? 'fully_optimized'
    : score >= 3.5 ? 'good_foundation'
    : score >= 2.5 ? 'significant_gaps'
    : 'not_optimized';

  return {
    score,
    interpretation,
    factors: {
      selfContainedSections: { score: Math.round(selfContained * 10) / 10, weight: 0.20, label: 'Self-Contained Sections' },
      informationDensity: { score: Math.round(density * 10) / 10, weight: 0.20, label: 'Information Density' },
      answerCapsuleCompliance: { score: Math.round(capsule * 10) / 10, weight: 0.15, label: 'Answer Capsule Compliance' },
      entityExplicitness: { score: Math.round(entityScore * 10) / 10, weight: 0.15, label: 'Entity Explicitness' },
      structuralClarity: { score: Math.round(structure * 10) / 10, weight: 0.15, label: 'Structural Clarity' },
      attributionIntegrity: { score: Math.round(attribution * 10) / 10, weight: 0.15, label: 'Attribution Integrity' },
    },
  };
}

/**
 * Extract Cor2Input from a UnifiedAuditReport by inspecting phase results and findings.
 */
export function extractCor2InputFromReport(report: {
  phaseResults: Array<{
    phase: string;
    findings: Array<{ ruleId?: string; severity: string }>;
    score: number;
  }>;
}): Cor2Input {
  const allFindings = report.phaseResults.flatMap(pr => pr.findings);

  // Chunking issues: findings with ruleId starting with 'rule-chunk-'
  const chunkingIssueCount = allFindings.filter(f => f.ruleId?.startsWith('rule-chunk-')).length;

  // Total sections: estimate from content format phase or default
  const contentFormatPhase = report.phaseResults.find(pr => pr.phase === 'contentFormat');
  const totalSections = contentFormatPhase ? Math.max(5, contentFormatPhase.findings.length + 5) : 5;

  // Filler words: findings from information density phase with filler-related ruleIds
  const fillerFindings = allFindings.filter(f =>
    f.ruleId?.startsWith('rule-filler-') || f.ruleId?.startsWith('rule-vague-') || f.ruleId?.startsWith('rule-redundan')
  );
  const fillerWordCount = fillerFindings.length * 5; // estimate ~5 filler words per finding
  const totalWords = 500; // baseline estimate

  // Capsule compliance: sections without capsule-length issues
  const capsuleIssues = allFindings.filter(f => f.ruleId === 'rule-capsule-length').length;
  const totalH2Sections = Math.max(totalSections, capsuleIssues);
  const capsuleCompliantSections = Math.max(0, totalH2Sections - capsuleIssues);

  // Pronoun density: check for pronoun-related findings
  const pronounFindings = allFindings.filter(f =>
    f.ruleId?.startsWith('rule-pronoun-') || f.ruleId?.startsWith('rule-entity-explicit')
  );
  const pronounDensity = pronounFindings.length > 0
    ? Math.min(0.25, 0.05 + pronounFindings.length * 0.03)
    : 0.03;

  // Structural clarity checks
  const hasQuestionH2s = !allFindings.some(f => f.ruleId === 'rule-question-headings');
  const htmlTechPhase = report.phaseResults.find(pr => pr.phase === 'htmlTechnical');
  const hasSemanticHtml = htmlTechPhase ? htmlTechPhase.score >= 70 : false;
  const hasProperNesting = !allFindings.some(f =>
    f.ruleId?.startsWith('rule-heading-nesting') || f.ruleId?.startsWith('rule-nesting-')
  );

  // Attribution integrity checks
  const metaPhase = report.phaseResults.find(pr => pr.phase === 'metaStructuredData');
  const hasArticleSchema = !allFindings.some(f =>
    f.ruleId?.startsWith('rule-schema-article') || f.ruleId === 'rule-missing-schema'
  );
  const hasAuthorEntity = !allFindings.some(f =>
    f.ruleId?.startsWith('rule-author-') || f.ruleId === 'rule-missing-author'
  );
  const hasCanonical = !allFindings.some(f =>
    f.ruleId?.startsWith('rule-canonical-') || f.ruleId === 'rule-missing-canonical'
  );

  return {
    chunkingIssueCount,
    totalSections,
    fillerWordCount,
    totalWords,
    capsuleCompliantSections,
    totalH2Sections,
    pronounDensity,
    hasQuestionH2s,
    hasSemanticHtml,
    hasProperNesting,
    hasArticleSchema,
    hasAuthorEntity,
    hasCanonical,
  };
}
