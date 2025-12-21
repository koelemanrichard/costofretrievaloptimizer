/**
 * Money Page 4 Pillars Scoring Calculator
 * Analyzes content briefs against the 4 Pillars framework:
 * - Verbalization
 * - Contextualization
 * - Monetization
 * - Visualization
 */

import type {
  ContentBrief,
  MoneyPagePillar,
  MoneyPagePillarScore,
  MoneyPagePillarsResult,
  PillarChecklistItem,
} from '../types';
import {
  PILLAR_CHECKLISTS,
  CRITICAL_ITEMS,
  DEFAULT_PILLARS_CONFIG,
  PILLAR_DESCRIPTIONS,
  getGradeFromScore,
  IMPROVEMENT_SUGGESTIONS,
} from '../config/moneyPagePillars';
import {
  getAllKeywords,
} from '../config/moneyPageKeywords';

// =============================================================================
// HELPER FUNCTIONS FOR SAFE TEXT ACCESS
// =============================================================================

/**
 * Safely get text from a potentially undefined string, lowercased
 */
function safeText(value: string | undefined | null): string {
  return (value || '').toLowerCase();
}

/**
 * Safely combine multiple text fields for searching
 */
function combineText(...values: (string | undefined | null)[]): string {
  return values.map(v => v || '').join(' ').toLowerCase();
}

// =============================================================================
// MAIN SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate the complete 4 Pillars analysis for a content brief
 */
export function calculateMoneyPagePillarsScore(brief: ContentBrief): MoneyPagePillarsResult {
  const pillars: MoneyPagePillarScore[] = [
    calculatePillarScore(brief, 'verbalization'),
    calculatePillarScore(brief, 'contextualization'),
    calculatePillarScore(brief, 'monetization'),
    calculatePillarScore(brief, 'visualization'),
  ];

  // Calculate weighted overall score
  const weights = DEFAULT_PILLARS_CONFIG.weights;
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  let weightedSum = 0;
  for (const pillar of pillars) {
    weightedSum += pillar.score * (weights[pillar.pillar] / totalWeight);
  }

  const overallScore = Math.round(weightedSum);
  const overallGrade = getGradeFromScore(overallScore);

  // Collect all critical missing items
  const missingCritical = pillars.flatMap(p => p.critical_missing);

  // Determine improvement priority (lowest scoring pillars first)
  const improvementPriority = [...pillars]
    .sort((a, b) => a.score - b.score)
    .map(p => p.pillar);

  // Generate recommendations
  const recommendations = generateRecommendations(pillars, missingCritical);

  return {
    overall_score: overallScore,
    overall_grade: overallGrade,
    pillars,
    missing_critical: missingCritical,
    improvement_priority: improvementPriority,
    recommendations,
  };
}

/**
 * Calculate score for a single pillar
 */
export function calculatePillarScore(
  brief: ContentBrief,
  pillar: MoneyPagePillar
): MoneyPagePillarScore {
  const checklistTemplate = PILLAR_CHECKLISTS[pillar];
  const checklist: PillarChecklistItem[] = [];
  let earnedPoints = 0;
  let maxPoints = 0;
  const criticalMissing: string[] = [];
  const suggestions: string[] = [];

  for (const item of checklistTemplate) {
    const checked = evaluateChecklistItem(brief, item.id, pillar);
    const checklistItem: PillarChecklistItem = {
      ...item,
      checked,
    };
    checklist.push(checklistItem);
    maxPoints += item.weight;

    if (checked) {
      earnedPoints += item.weight;
    } else {
      // Check if this is a critical item
      if (CRITICAL_ITEMS.includes(item.id)) {
        criticalMissing.push(item.label);
      }
      // Add suggestion if available
      if (IMPROVEMENT_SUGGESTIONS[item.id]) {
        suggestions.push(IMPROVEMENT_SUGGESTIONS[item.id]);
      }
    }
  }

  const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

  return {
    pillar,
    score,
    max_score: 100,
    checklist,
    suggestions: suggestions.slice(0, 3), // Top 3 suggestions
    critical_missing: criticalMissing,
  };
}

// =============================================================================
// CHECKLIST EVALUATION
// =============================================================================

/**
 * Evaluate a single checklist item against the brief
 */
function evaluateChecklistItem(
  brief: ContentBrief,
  itemId: string,
  pillar: MoneyPagePillar
): boolean {
  switch (itemId) {
    // Verbalization checks
    case 'v1': return hasBenefitFocusedHeadline(brief);
    case 'v2': return hasPowerWords(brief);
    case 'v3': return hasSubheadline(brief);
    case 'v4': return hasSocialProof(brief);
    case 'v5': return hasUrgencyTriggers(brief);
    case 'v6': return hasScarcityIndicators(brief);
    case 'v7': return hasRiskReversal(brief);
    case 'v8': return hasFeatureToBenefits(brief);
    case 'v9': return hasProblemAgitation(brief);
    case 'v10': return hasOutcomeVisualization(brief);

    // Contextualization checks
    case 'c1': return hasIndustryContext(brief);
    case 'c2': return hasProblemLandscape(brief);
    case 'c3': return hasTargetAudience(brief);
    case 'c4': return hasCompetitorDifferentiation(brief);
    case 'c5': return hasUniqueValueProp(brief);
    case 'c6': return hasUseCaseSpecificity(brief);
    case 'c7': return hasExpertPositioning(brief);
    case 'c8': return hasMethodologyExplanation(brief);
    case 'c9': return hasDataBackedClaims(brief);

    // Monetization checks
    case 'm1': return hasPrimaryCTAAboveFold(brief);
    case 'm2': return hasMultipleCTAPlacements(brief);
    case 'm3': return hasActionOrientedCTA(brief);
    case 'm4': return hasSecondaryCTA(brief);
    case 'm5': return hasClearPricing(brief);
    case 'm6': return hasROIJustification(brief);
    case 'm7': return hasPricingPsychology(brief);
    case 'm8': return hasLeadCaptureForm(brief);
    case 'm9': return hasContactInfo(brief);
    case 'm10': return hasClearCheckoutFlow(brief);

    // Visualization checks
    case 'vis1': return hasHeroImageWithEntity(brief);
    case 'vis2': return hasTrustBadges(brief);
    case 'vis3': return hasTestimonialsWithPhotos(brief);
    case 'vis4': return hasBeforeAfterVisuals(brief);
    case 'vis5': return hasLogoWall(brief);
    case 'vis6': return hasProductScreenshots(brief);
    case 'vis7': return hasDemoVideo(brief);
    case 'vis8': return hasComparisonTables(brief);
    case 'vis9': return hasConsistentBrandImagery(brief);
    case 'vis10': return hasProfessionalVisualQuality(brief);

    default:
      return false;
  }
}

// =============================================================================
// VERBALIZATION EVALUATORS
// =============================================================================

function hasBenefitFocusedHeadline(brief: ContentBrief): boolean {
  const title = safeText(brief.title);
  const benefitWords = getAllKeywords('benefit');
  const howToWords = getAllKeywords('howTo');
  return benefitWords.some(word => title.includes(word)) || howToWords.some(word => title.includes(word));
}

function hasPowerWords(brief: ContentBrief): boolean {
  const text = combineText(brief.title, brief.metaDescription, brief.outline);
  const powerWords = getAllKeywords('power');
  return powerWords.filter(word => text.includes(word)).length >= 2;
}

function hasSubheadline(brief: ContentBrief): boolean {
  const sections = brief.structured_outline || [];
  return sections.length > 0 && sections[0]?.heading !== brief.title;
}

function hasSocialProof(brief: ContentBrief): boolean {
  const text = combineText(brief.outline, brief.metaDescription);
  const socialProofIndicators = getAllKeywords('socialProof');
  return socialProofIndicators.some(indicator => text.includes(indicator));
}

function hasUrgencyTriggers(brief: ContentBrief): boolean {
  const text = combineText(brief.outline, brief.cta);
  const urgencyWords = getAllKeywords('urgency');
  return urgencyWords.some(word => text.includes(word));
}

function hasScarcityIndicators(brief: ContentBrief): boolean {
  const text = combineText(brief.outline, brief.cta);
  const scarcityWords = getAllKeywords('scarcity');
  return scarcityWords.some(word => text.includes(word));
}

function hasRiskReversal(brief: ContentBrief): boolean {
  const text = combineText(brief.outline, brief.cta);
  const riskReversalIndicators = getAllKeywords('riskReversal');
  return riskReversalIndicators.some(indicator => text.includes(indicator));
}

function hasFeatureToBenefits(brief: ContentBrief): boolean {
  const sections = brief.structured_outline || [];
  // Check for benefit-related headings in all supported languages
  const benefitWords = getAllKeywords('benefit');
  const benefitHeadingWords = ['benefit', 'advantage', 'why', 'voordeel', 'voordelen', 'waarom', 'vorteil', 'vorteile', 'warum', 'avantage', 'pourquoi', 'ventaja', 'por qué', 'vantaggio', 'perché'];
  const benefitSections = sections.filter(s => {
    const heading = safeText(s?.heading);
    return benefitHeadingWords.some(word => heading.includes(word)) ||
           benefitWords.some(word => heading.includes(word));
  });
  return benefitSections.length > 0;
}

function hasProblemAgitation(brief: ContentBrief): boolean {
  const sections = brief.structured_outline || [];
  // Check for problem-related headings in all supported languages
  const problemHeadingWords = ['problem', 'challenge', 'struggle', 'pain', 'issue', 'probleem', 'uitdaging', 'pijn', 'problem', 'herausforderung', 'schmerz', 'problème', 'défi', 'problema', 'desafío', 'sfida'];
  const problemSections = sections.filter(s => {
    const heading = safeText(s?.heading);
    return problemHeadingWords.some(word => heading.includes(word));
  });
  const text = safeText(brief.outline);
  return problemSections.length > 0 || problemHeadingWords.some(word => text.includes(word));
}

function hasOutcomeVisualization(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const outcomeIndicators = getAllKeywords('outcome');
  return outcomeIndicators.some(indicator => text.includes(indicator));
}

// =============================================================================
// CONTEXTUALIZATION EVALUATORS
// =============================================================================

function hasIndustryContext(brief: ContentBrief): boolean {
  const sections = brief.structured_outline || [];
  const industryWords = getAllKeywords('industry');
  const industryHeadingWords = ['industry', 'market', 'overview', 'sector', 'industrie', 'markt', 'overzicht', 'branche', 'marché', 'aperçu', 'mercado', 'visión', 'mercato', 'panoramica'];
  return sections.some(s => {
    const heading = safeText(s?.heading);
    return industryHeadingWords.some(word => heading.includes(word));
  }) || industryWords.some(word => safeText(brief.outline).includes(word));
}

function hasProblemLandscape(brief: ContentBrief): boolean {
  return hasProblemAgitation(brief);
}

function hasTargetAudience(brief: ContentBrief): boolean {
  const text = combineText(brief.outline, brief.metaDescription);
  const audienceIndicators = getAllKeywords('targetAudience');
  return audienceIndicators.some(indicator => text.includes(indicator));
}

function hasCompetitorDifferentiation(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const diffIndicators = getAllKeywords('differentiation');
  return diffIndicators.some(indicator => text.includes(indicator));
}

function hasUniqueValueProp(brief: ContentBrief): boolean {
  const text = combineText(brief.metaDescription, brief.outline);
  // Unique value prop uses a mix of power words and differentiation words
  const uvpIndicators = ['unique', 'only', 'first', 'proprietary', 'exclusive', 'patented', 'innovative', 'different', 'uniek', 'enige', 'eerste', 'eigendom', 'exclusief', 'gepatenteerd', 'innovatief', 'einzigartig', 'einzige', 'erste', 'proprietär', 'exklusiv', 'patentiert', 'innovativ', 'unique', 'seul', 'premier', 'propriétaire', 'exclusif', 'breveté', 'innovant', 'único', 'solo', 'primero', 'propietario', 'exclusivo', 'patentado', 'innovador', 'unico', 'solo', 'primo', 'proprietario', 'esclusivo', 'brevettato', 'innovativo'];
  return uvpIndicators.some(indicator => text.includes(indicator));
}

function hasUseCaseSpecificity(brief: ContentBrief): boolean {
  const sections = brief.structured_outline || [];
  const useCaseHeadingWords = ['use case', 'example', 'scenario', 'application', 'toepassing', 'voorbeeld', 'scenario', 'anwendung', 'beispiel', 'szenario', 'cas d\'utilisation', 'exemple', 'scénario', 'application', 'caso de uso', 'ejemplo', 'escenario', 'aplicación', 'caso d\'uso', 'esempio', 'scenario', 'applicazione'];
  return sections.some(s => {
    const heading = safeText(s?.heading);
    return useCaseHeadingWords.some(word => heading.includes(word));
  });
}

function hasExpertPositioning(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const expertIndicators = ['expert', 'specialist', 'years', 'experience', 'certified', 'award', 'recognized', 'leader', 'deskundige', 'specialist', 'jaar', 'ervaring', 'gecertificeerd', 'prijs', 'erkend', 'leider', 'experte', 'spezialist', 'jahre', 'erfahrung', 'zertifiziert', 'auszeichnung', 'anerkannt', 'führend', 'expert', 'spécialiste', 'années', 'expérience', 'certifié', 'prix', 'reconnu', 'leader', 'experto', 'especialista', 'años', 'experiencia', 'certificado', 'premio', 'reconocido', 'líder', 'esperto', 'specialista', 'anni', 'esperienza', 'certificato', 'premio', 'riconosciuto', 'leader'];
  return expertIndicators.some(indicator => text.includes(indicator));
}

function hasMethodologyExplanation(brief: ContentBrief): boolean {
  const sections = brief.structured_outline || [];
  const methodologyWords = getAllKeywords('methodology');
  const methodHeadingWords = ['how', 'method', 'process', 'approach', 'hoe', 'methode', 'proces', 'aanpak', 'wie', 'methode', 'prozess', 'ansatz', 'comment', 'méthode', 'processus', 'approche', 'cómo', 'método', 'proceso', 'enfoque', 'come', 'metodo', 'processo', 'approccio'];
  return sections.some(s => {
    const heading = safeText(s?.heading);
    return methodHeadingWords.some(word => heading.includes(word)) ||
           methodologyWords.some(word => heading.includes(word));
  });
}

function hasDataBackedClaims(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const dataIndicators = getAllKeywords('dataBacked');
  return dataIndicators.some(indicator => text.includes(indicator));
}

// =============================================================================
// MONETIZATION EVALUATORS
// =============================================================================

function hasPrimaryCTAAboveFold(brief: ContentBrief): boolean {
  return !!brief.cta && brief.cta.length > 0;
}

function hasMultipleCTAPlacements(brief: ContentBrief): boolean {
  const sections = brief.structured_outline || [];
  const ctaWords = getAllKeywords('cta');
  const ctaSections = sections.filter(s => {
    const heading = safeText(s?.heading);
    return ctaWords.some(word => heading.includes(word));
  });
  return ctaSections.length >= 2 || !!brief.cta;
}

function hasActionOrientedCTA(brief: ContentBrief): boolean {
  if (!brief.cta) return false;
  const actionWords = getAllKeywords('cta');
  return actionWords.some(word => safeText(brief.cta).includes(word));
}

function hasSecondaryCTA(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  // Secondary CTAs in all supported languages
  const secondaryCTAIndicators = ['learn more', 'read more', 'see how', 'discover', 'explore', 'meer leren', 'lees meer', 'bekijk hoe', 'ontdek', 'verken', 'mehr erfahren', 'mehr lesen', 'sehen wie', 'entdecken', 'erkunden', 'en savoir plus', 'lire plus', 'voir comment', 'découvrir', 'explorer', 'saber más', 'leer más', 'ver cómo', 'descubrir', 'explorar', 'saperne di più', 'leggi di più', 'scopri come', 'scoprire', 'esplorare'];
  return secondaryCTAIndicators.some(indicator => text.includes(indicator));
}

function hasClearPricing(brief: ContentBrief): boolean {
  const sections = brief.structured_outline || [];
  const text = safeText(brief.outline);
  const pricingWords = getAllKeywords('pricing');
  const pricingHeadingWords = ['pricing', 'cost', 'price', 'prijs', 'prijzen', 'kosten', 'tarief', 'preis', 'preise', 'kosten', 'prix', 'tarif', 'coût', 'precio', 'costo', 'tarifa', 'prezzo', 'costo', 'tariffa'];
  return sections.some(s => {
    const heading = safeText(s?.heading);
    return pricingHeadingWords.some(word => heading.includes(word));
  }) || pricingWords.some(word => text.includes(word)) || text.includes('$') || text.includes('€') || text.includes('£');
}

function hasROIJustification(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const roiIndicators = getAllKeywords('roi');
  return roiIndicators.some(indicator => text.includes(indicator));
}

function hasPricingPsychology(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const pricingWords = getAllKeywords('pricing');
  // Also check for specific pricing psychology patterns
  const pricingPsychology = ['plan', 'tier', 'package', 'bundle', 'starting at', 'from', 'compare', 'pakket', 'vanaf', 'vergelijk', 'paket', 'ab', 'vergleichen', 'forfait', 'à partir de', 'comparer', 'paquete', 'desde', 'comparar', 'pacchetto', 'a partire da', 'confrontare'];
  return pricingWords.some(word => text.includes(word)) || pricingPsychology.some(indicator => text.includes(indicator));
}

function hasLeadCaptureForm(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const leadCaptureWords = getAllKeywords('leadCapture');
  return leadCaptureWords.some(word => text.includes(word));
}

function hasContactInfo(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const contactWords = getAllKeywords('contact');
  return contactWords.some(word => text.includes(word));
}

function hasClearCheckoutFlow(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const checkoutWords = getAllKeywords('checkout');
  return checkoutWords.some(word => text.includes(word));
}

// =============================================================================
// VISUALIZATION EVALUATORS
// =============================================================================

function hasHeroImageWithEntity(brief: ContentBrief): boolean {
  return !!brief.visuals?.featuredImagePrompt && brief.visuals.featuredImagePrompt.length > 20;
}

function hasTrustBadges(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const trustBadgeWords = getAllKeywords('trustBadges');
  return trustBadgeWords.some(word => text.includes(word));
}

function hasTestimonialsWithPhotos(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const socialProofWords = getAllKeywords('socialProof');
  // Also check for quote-related words in all languages
  const quoteWords = ['testimonial', 'review', 'said', 'quote', 'testimonial', 'beoordeling', 'zei', 'citaat', 'testimonial', 'bewertung', 'sagte', 'zitat', 'témoignage', 'avis', 'dit', 'citation', 'testimonio', 'reseña', 'dijo', 'cita', 'testimonianza', 'recensione', 'disse', 'citazione'];
  return socialProofWords.some(word => text.includes(word)) || quoteWords.some(word => text.includes(word));
}

function hasBeforeAfterVisuals(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  // Before/after in all supported languages
  const beforeWords = ['before', 'voor', 'vorher', 'avant', 'antes', 'prima'];
  const afterWords = ['after', 'na', 'nachher', 'après', 'después', 'dopo'];
  return beforeWords.some(b => text.includes(b)) && afterWords.some(a => text.includes(a));
}

function hasLogoWall(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const socialProofWords = getAllKeywords('socialProof');
  // Also check for partner/client words
  const partnerWords = ['client', 'partner', 'trusted by', 'used by', 'klant', 'partner', 'vertrouwd door', 'gebruikt door', 'kunde', 'partner', 'vertraut von', 'verwendet von', 'client', 'partenaire', 'confiance par', 'utilisé par', 'cliente', 'socio', 'confiado por', 'usado por', 'cliente', 'partner', 'fidato da', 'usato da'];
  return socialProofWords.some(word => text.includes(word)) || partnerWords.some(word => text.includes(word));
}

function hasProductScreenshots(brief: ContentBrief): boolean {
  const visualSemantics = brief.visual_semantics || [];
  const visualWords = getAllKeywords('visualization');
  return visualSemantics.some(v => v.type === 'DIAGRAM' || visualWords.some(word => safeText(v?.description).includes(word)));
}

function hasDemoVideo(brief: ContentBrief): boolean {
  const text = safeText(brief.outline);
  const visualWords = getAllKeywords('visualization');
  return visualWords.some(word => text.includes(word));
}

function hasComparisonTables(brief: ContentBrief): boolean {
  const sections = brief.structured_outline || [];
  const comparisonWords = ['comparison', 'vs', 'versus', 'vergelijking', 'versus', 'vergleich', 'versus', 'comparaison', 'versus', 'comparación', 'versus', 'confronto', 'versus'];
  return sections.some(s =>
    s?.format_code === 'TABLE' ||
    comparisonWords.some(word => safeText(s?.heading).includes(word))
  );
}

function hasConsistentBrandImagery(brief: ContentBrief): boolean {
  // Check if visual semantics exist and are defined
  return (brief.visual_semantics?.length || 0) > 0;
}

function hasProfessionalVisualQuality(brief: ContentBrief): boolean {
  // Check for visual specifications
  return hasHeroImageWithEntity(brief) && !!brief.visuals?.imageAltText;
}

// =============================================================================
// RECOMMENDATIONS
// =============================================================================

function generateRecommendations(
  pillars: MoneyPagePillarScore[],
  criticalMissing: string[]
): string[] {
  const recommendations: string[] = [];

  // Critical items first
  if (criticalMissing.length > 0) {
    recommendations.push(`Address critical missing elements: ${criticalMissing.slice(0, 3).join(', ')}`);
  }

  // Lowest scoring pillar
  const lowestPillar = pillars.reduce((prev, curr) =>
    prev.score < curr.score ? prev : curr
  );

  if (lowestPillar.score < 60) {
    const description = PILLAR_DESCRIPTIONS[lowestPillar.pillar];
    recommendations.push(`Focus on ${description.title}: ${description.description}`);
  }

  // Add top suggestions from each pillar
  for (const pillar of pillars) {
    if (pillar.suggestions.length > 0 && pillar.score < 80) {
      recommendations.push(pillar.suggestions[0]);
    }
  }

  return recommendations.slice(0, 5);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a topic should use 4 Pillars analysis (monetization topics only)
 */
export function shouldAnalyze4Pillars(topicClass?: string): boolean {
  return topicClass === 'monetization';
}

/**
 * Get a quick summary of pillar scores for display
 */
export function getPillarSummary(result: MoneyPagePillarsResult): string {
  const summaries = result.pillars.map(p => {
    const emoji = p.score >= 80 ? '✅' : p.score >= 60 ? '⚠️' : '❌';
    return `${PILLAR_DESCRIPTIONS[p.pillar].icon} ${p.score}%`;
  });
  return `${result.overall_grade} (${result.overall_score}%) | ${summaries.join(' | ')}`;
}
