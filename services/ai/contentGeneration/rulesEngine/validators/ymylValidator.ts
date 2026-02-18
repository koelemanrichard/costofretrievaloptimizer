// services/ai/contentGeneration/rulesEngine/validators/ymylValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

type YMYLCategory = 'HEALTH' | 'FINANCE' | 'LEGAL' | 'SAFETY';

interface YMYLKeywords {
  HEALTH: string[];
  FINANCE: string[];
  LEGAL: string[];
  SAFETY: string[];
}

interface ConditionPatterns {
  conditions: RegExp[];
  badCitation: RegExp;
}

/**
 * Multilingual YMYL (Your Money or Your Life) keywords
 * These identify content that could impact health, finances, legal matters, or safety
 */
const MULTILINGUAL_YMYL_KEYWORDS: Record<string, YMYLKeywords> = {
  'English': {
    HEALTH: [
      'symptom', 'treatment', 'medication', 'disease', 'diagnosis',
      'medical', 'health', 'doctor', 'patient', 'therapy', 'drug',
      'dosage', 'side effect', 'prescription', 'surgery', 'hospital',
      'cancer', 'diabetes', 'heart disease', 'mental health', 'depression',
    ],
    FINANCE: [
      'investment', 'loan', 'mortgage', 'tax', 'insurance',
      'credit', 'debt', 'financial', 'bank', 'retirement',
      'stock', 'bond', 'portfolio', 'interest rate', 'pension',
      'savings', 'bankruptcy', 'cryptocurrency', 'trading',
    ],
    LEGAL: [
      'law', 'legal', 'lawsuit', 'attorney', 'court',
      'contract', 'liability', 'regulation', 'compliance',
      'rights', 'statute', 'litigation', 'lawyer', 'judge',
      'verdict', 'appeal', 'custody', 'divorce', 'criminal',
    ],
    SAFETY: [
      'safety', 'emergency', 'danger', 'warning', 'hazard',
      'risk', 'injury', 'accident', 'protection', 'recall',
      'toxic', 'poison', 'fire', 'flood', 'evacuation',
    ],
  },

  'Dutch': {
    HEALTH: [
      'symptoom', 'behandeling', 'medicatie', 'ziekte', 'diagnose',
      'medisch', 'gezondheid', 'arts', 'dokter', 'patiënt', 'therapie',
      'medicijn', 'dosering', 'bijwerking', 'recept', 'operatie', 'ziekenhuis',
      'kanker', 'diabetes', 'hartziekte', 'geestelijke gezondheid', 'depressie',
      'geneesmiddel', 'huisarts', 'specialist', 'zorg', 'herstel',
    ],
    FINANCE: [
      'investering', 'lening', 'hypotheek', 'belasting', 'verzekering',
      'krediet', 'schuld', 'financieel', 'bank', 'pensioen',
      'aandeel', 'obligatie', 'portefeuille', 'rente', 'sparen',
      'faillissement', 'cryptocurrency', 'beleggen', 'vermogen',
      'financiën', 'budget', 'inkomen', 'uitgaven', 'erfenis',
    ],
    LEGAL: [
      'wet', 'juridisch', 'rechtszaak', 'advocaat', 'rechtbank',
      'contract', 'aansprakelijkheid', 'regelgeving', 'naleving',
      'rechten', 'wetgeving', 'rechtspraak', 'rechter', 'vonnis',
      'hoger beroep', 'voogdij', 'echtscheiding', 'strafrecht',
      'notaris', 'testament', 'huurrecht', 'arbeidsrecht',
    ],
    SAFETY: [
      'veiligheid', 'noodgeval', 'gevaar', 'waarschuwing', 'risico',
      'letsel', 'ongeluk', 'bescherming', 'terugroepactie',
      'giftig', 'vergif', 'brand', 'overstroming', 'evacuatie',
      'alarm', 'eerste hulp', 'EHBO', 'gevaarlijk', 'voorzichtig',
    ],
  },

  'German': {
    HEALTH: [
      'symptom', 'behandlung', 'medikament', 'krankheit', 'diagnose',
      'medizinisch', 'gesundheit', 'arzt', 'patient', 'therapie',
      'medizin', 'dosierung', 'nebenwirkung', 'rezept', 'operation', 'krankenhaus',
      'krebs', 'diabetes', 'herzkrankheit', 'psychische gesundheit', 'depression',
      'heilmittel', 'hausarzt', 'facharzt', 'pflege', 'genesung',
    ],
    FINANCE: [
      'investition', 'darlehen', 'hypothek', 'steuer', 'versicherung',
      'kredit', 'schulden', 'finanziell', 'bank', 'rente',
      'aktie', 'anleihe', 'portfolio', 'zinssatz', 'sparen',
      'insolvenz', 'kryptowährung', 'anlegen', 'vermögen',
      'finanzen', 'budget', 'einkommen', 'ausgaben', 'erbschaft',
    ],
    LEGAL: [
      'gesetz', 'rechtlich', 'klage', 'anwalt', 'gericht',
      'vertrag', 'haftung', 'verordnung', 'compliance',
      'rechte', 'gesetzgebung', 'rechtsprechung', 'richter', 'urteil',
      'berufung', 'sorgerecht', 'scheidung', 'strafrecht',
      'notar', 'testament', 'mietrecht', 'arbeitsrecht',
    ],
    SAFETY: [
      'sicherheit', 'notfall', 'gefahr', 'warnung', 'risiko',
      'verletzung', 'unfall', 'schutz', 'rückruf',
      'giftig', 'gift', 'brand', 'überschwemmung', 'evakuierung',
      'alarm', 'erste hilfe', 'gefährlich', 'vorsicht',
    ],
  },

  'French': {
    HEALTH: [
      'symptôme', 'traitement', 'médicament', 'maladie', 'diagnostic',
      'médical', 'santé', 'médecin', 'patient', 'thérapie',
      'médicine', 'dosage', 'effet secondaire', 'ordonnance', 'chirurgie', 'hôpital',
      'cancer', 'diabète', 'maladie cardiaque', 'santé mentale', 'dépression',
      'remède', 'généraliste', 'spécialiste', 'soins', 'guérison',
    ],
    FINANCE: [
      'investissement', 'prêt', 'hypothèque', 'impôt', 'assurance',
      'crédit', 'dette', 'financier', 'banque', 'retraite',
      'action', 'obligation', 'portefeuille', 'taux d\'intérêt', 'épargne',
      'faillite', 'cryptomonnaie', 'placement', 'patrimoine',
      'finances', 'budget', 'revenu', 'dépenses', 'héritage',
    ],
    LEGAL: [
      'loi', 'juridique', 'procès', 'avocat', 'tribunal',
      'contrat', 'responsabilité', 'réglementation', 'conformité',
      'droits', 'législation', 'jurisprudence', 'juge', 'verdict',
      'appel', 'garde', 'divorce', 'droit pénal',
      'notaire', 'testament', 'droit du bail', 'droit du travail',
    ],
    SAFETY: [
      'sécurité', 'urgence', 'danger', 'avertissement', 'risque',
      'blessure', 'accident', 'protection', 'rappel',
      'toxique', 'poison', 'incendie', 'inondation', 'évacuation',
      'alarme', 'premiers secours', 'dangereux', 'prudence',
    ],
  },

  'Spanish': {
    HEALTH: [
      'síntoma', 'tratamiento', 'medicamento', 'enfermedad', 'diagnóstico',
      'médico', 'salud', 'doctor', 'paciente', 'terapia',
      'medicina', 'dosis', 'efecto secundario', 'receta', 'cirugía', 'hospital',
      'cáncer', 'diabetes', 'enfermedad cardíaca', 'salud mental', 'depresión',
      'remedio', 'generalista', 'especialista', 'cuidado', 'recuperación',
    ],
    FINANCE: [
      'inversión', 'préstamo', 'hipoteca', 'impuesto', 'seguro',
      'crédito', 'deuda', 'financiero', 'banco', 'jubilación',
      'acción', 'bono', 'cartera', 'tasa de interés', 'ahorro',
      'bancarrota', 'criptomoneda', 'colocación', 'patrimonio',
      'finanzas', 'presupuesto', 'ingreso', 'gastos', 'herencia',
    ],
    LEGAL: [
      'ley', 'legal', 'demanda', 'abogado', 'tribunal',
      'contrato', 'responsabilidad', 'regulación', 'cumplimiento',
      'derechos', 'legislación', 'jurisprudencia', 'juez', 'veredicto',
      'apelación', 'custodia', 'divorcio', 'derecho penal',
      'notario', 'testamento', 'derecho de arrendamiento', 'derecho laboral',
    ],
    SAFETY: [
      'seguridad', 'emergencia', 'peligro', 'advertencia', 'riesgo',
      'lesión', 'accidente', 'protección', 'retiro del mercado',
      'tóxico', 'veneno', 'incendio', 'inundación', 'evacuación',
      'alarma', 'primeros auxilios', 'peligroso', 'precaución',
    ],
  },

  'Italian': {
    HEALTH: [
      'sintomo', 'trattamento', 'farmaco', 'malattia', 'diagnosi',
      'medico', 'salute', 'dottore', 'paziente', 'terapia',
      'medicina', 'dosaggio', 'effetto collaterale', 'ricetta', 'chirurgia', 'ospedale',
      'cancro', 'diabete', 'malattia cardiaca', 'salute mentale', 'depressione',
      'rimedio', 'generalista', 'specialista', 'cura', 'guarigione',
    ],
    FINANCE: [
      'investimento', 'prestito', 'mutuo', 'tassa', 'assicurazione',
      'credito', 'debito', 'finanziario', 'banca', 'pensione',
      'azione', 'obbligazione', 'portafoglio', 'tasso di interesse', 'risparmio',
      'bancarotta', 'criptovaluta', 'collocamento', 'patrimonio',
      'finanze', 'budget', 'reddito', 'spese', 'eredità',
    ],
    LEGAL: [
      'legge', 'legale', 'causa', 'avvocato', 'tribunale',
      'contratto', 'responsabilità', 'regolamento', 'conformità',
      'diritti', 'legislazione', 'giurisprudenza', 'giudice', 'verdetto',
      'appello', 'custodia', 'divorzio', 'diritto penale',
      'notaio', 'testamento', 'diritto di locazione', 'diritto del lavoro',
    ],
    SAFETY: [
      'sicurezza', 'emergenza', 'pericolo', 'avvertimento', 'rischio',
      'lesione', 'incidente', 'protezione', 'richiamo',
      'tossico', 'veleno', 'incendio', 'alluvione', 'evacuazione',
      'allarme', 'pronto soccorso', 'pericoloso', 'cautela',
    ],
  },

  'Portuguese': {
    HEALTH: [
      'sintoma', 'tratamento', 'medicamento', 'doença', 'diagnóstico',
      'médico', 'saúde', 'doutor', 'paciente', 'terapia',
      'medicina', 'dosagem', 'efeito colateral', 'receita', 'cirurgia', 'hospital',
      'câncer', 'diabetes', 'doença cardíaca', 'saúde mental', 'depressão',
      'remédio', 'generalista', 'especialista', 'cuidado', 'recuperação',
    ],
    FINANCE: [
      'investimento', 'empréstimo', 'hipoteca', 'imposto', 'seguro',
      'crédito', 'dívida', 'financeiro', 'banco', 'aposentadoria',
      'ação', 'título', 'carteira', 'taxa de juros', 'poupança',
      'falência', 'criptomoeda', 'aplicação', 'patrimônio',
      'finanças', 'orçamento', 'renda', 'despesas', 'herança',
    ],
    LEGAL: [
      'lei', 'legal', 'processo', 'advogado', 'tribunal',
      'contrato', 'responsabilidade', 'regulamento', 'conformidade',
      'direitos', 'legislação', 'jurisprudência', 'juiz', 'veredicto',
      'apelação', 'custódia', 'divórcio', 'direito penal',
      'notário', 'testamento', 'direito de locação', 'direito do trabalho',
    ],
    SAFETY: [
      'segurança', 'emergência', 'perigo', 'aviso', 'risco',
      'lesão', 'acidente', 'proteção', 'recall',
      'tóxico', 'veneno', 'incêndio', 'inundação', 'evacuação',
      'alarme', 'primeiros socorros', 'perigoso', 'precaução',
    ],
  },

  'Polish': {
    HEALTH: [
      'objaw', 'leczenie', 'lek', 'choroba', 'diagnoza',
      'medyczny', 'zdrowie', 'lekarz', 'pacjent', 'terapia',
      'medycyna', 'dawkowanie', 'efekt uboczny', 'recepta', 'operacja', 'szpital',
      'rak', 'cukrzyca', 'choroba serca', 'zdrowie psychiczne', 'depresja',
      'środek', 'internista', 'specjalista', 'opieka', 'wyzdrowienie',
    ],
    FINANCE: [
      'inwestycja', 'pożyczka', 'hipoteka', 'podatek', 'ubezpieczenie',
      'kredyt', 'dług', 'finansowy', 'bank', 'emerytura',
      'akcja', 'obligacja', 'portfel', 'stopa procentowa', 'oszczędności',
      'upadłość', 'kryptowaluta', 'lokata', 'majątek',
      'finanse', 'budżet', 'dochód', 'wydatki', 'spadek',
    ],
    LEGAL: [
      'prawo', 'prawny', 'proces', 'adwokat', 'sąd',
      'umowa', 'odpowiedzialność', 'regulacja', 'zgodność',
      'prawa', 'ustawodawstwo', 'orzecznictwo', 'sędzia', 'wyrok',
      'apelacja', 'opieka', 'rozwód', 'prawo karne',
      'notariusz', 'testament', 'prawo najmu', 'prawo pracy',
    ],
    SAFETY: [
      'bezpieczeństwo', 'nagły wypadek', 'niebezpieczeństwo', 'ostrzeżenie', 'ryzyko',
      'uraz', 'wypadek', 'ochrona', 'wycofanie',
      'toksyczny', 'trucizna', 'pożar', 'powódź', 'ewakuacja',
      'alarm', 'pierwsza pomoc', 'niebezpieczny', 'ostrożność',
    ],
  },
};

/**
 * Multilingual condition/exception patterns for Safe Answer Protocol
 */
const MULTILINGUAL_CONDITION_PATTERNS: Record<string, ConditionPatterns> = {
  'English': {
    conditions: [
      /\b(?:however|unless|depending on|except|although|but)\b/i,
      /\b(?:in (?:some|certain) cases?|under (?:certain|specific) conditions?)\b/i,
      /\b(?:consult|speak with|see)\s+(?:a|your)?\s*(?:doctor|physician|professional|advisor|lawyer|attorney)\b/i,
    ],
    badCitation: /^According to\s+/i,
  },

  'Dutch': {
    conditions: [
      /\b(?:echter|tenzij|afhankelijk van|behalve|hoewel|maar)\b/i,
      /\b(?:in (?:sommige|bepaalde) gevallen|onder (?:bepaalde|specifieke) omstandigheden)\b/i,
      /\b(?:raadpleeg|overleg met|neem contact op met)\s+(?:een|uw)?\s*(?:arts|dokter|professional|adviseur|advocaat)\b/i,
    ],
    badCitation: /^Volgens\s+/i,
  },

  'German': {
    conditions: [
      /\b(?:jedoch|es sei denn|abhängig von|außer|obwohl|aber)\b/i,
      /\b(?:in (?:manchen|bestimmten) Fällen|unter (?:bestimmten|spezifischen) Bedingungen)\b/i,
      /\b(?:konsultieren Sie|sprechen Sie mit|wenden Sie sich an)\s+(?:einen|Ihren)?\s*(?:Arzt|Doktor|Fachmann|Berater|Anwalt)\b/i,
    ],
    badCitation: /^(?:Laut|Gemäß)\s+/i,
  },

  'French': {
    conditions: [
      /\b(?:cependant|sauf si|selon|excepté|bien que|mais)\b/i,
      /\b(?:dans (?:certains|quelques) cas|sous (?:certaines|des) conditions)\b/i,
      /\b(?:consultez|parlez avec|voyez)\s+(?:un|votre)?\s*(?:médecin|docteur|professionnel|conseiller|avocat)\b/i,
    ],
    badCitation: /^(?:Selon|D'après)\s+/i,
  },

  'Spanish': {
    conditions: [
      /\b(?:sin embargo|a menos que|dependiendo de|excepto|aunque|pero)\b/i,
      /\b(?:en (?:algunos|ciertos) casos|bajo (?:ciertas|específicas) condiciones)\b/i,
      /\b(?:consulte|hable con|vea a)\s+(?:un|su)?\s*(?:médico|doctor|profesional|asesor|abogado)\b/i,
    ],
    badCitation: /^(?:Según|De acuerdo con)\s+/i,
  },

  'Italian': {
    conditions: [
      /\b(?:tuttavia|a meno che|a seconda di|tranne|sebbene|ma)\b/i,
      /\b(?:in (?:alcuni|certi) casi|sotto (?:certe|specifiche) condizioni)\b/i,
      /\b(?:consulti|parli con|veda)\s+(?:un|il suo)?\s*(?:medico|dottore|professionista|consulente|avvocato)\b/i,
    ],
    badCitation: /^(?:Secondo|In base a)\s+/i,
  },

  'Portuguese': {
    conditions: [
      /\b(?:no entanto|a menos que|dependendo de|exceto|embora|mas)\b/i,
      /\b(?:em (?:alguns|certos) casos|sob (?:certas|específicas) condições)\b/i,
      /\b(?:consulte|fale com|veja)\s+(?:um|seu)?\s*(?:médico|doutor|profissional|consultor|advogado)\b/i,
    ],
    badCitation: /^(?:Segundo|De acordo com)\s+/i,
  },

  'Polish': {
    conditions: [
      /\b(?:jednak|chyba że|w zależności od|z wyjątkiem|chociaż|ale)\b/i,
      /\b(?:w (?:niektórych|pewnych) przypadkach|pod (?:pewnymi|określonymi) warunkami)\b/i,
      /\b(?:skonsultuj się|porozmawiaj z|zobacz)\s+(?:z)?\s*(?:lekarzem|doktorem|specjalistą|doradcą|prawnikiem)\b/i,
    ],
    badCitation: /^(?:Według|Zgodnie z)\s+/i,
  },
};

/**
 * Get YMYL keywords for a specific language
 */
function getYMYLKeywords(language?: string): YMYLKeywords {
  const langName = getLanguageName(language);
  return MULTILINGUAL_YMYL_KEYWORDS[langName] || MULTILINGUAL_YMYL_KEYWORDS['English'];
}

/**
 * Get condition patterns for a specific language
 */
function getConditionPatterns(language?: string): ConditionPatterns {
  const langName = getLanguageName(language);
  return MULTILINGUAL_CONDITION_PATTERNS[langName] || MULTILINGUAL_CONDITION_PATTERNS['English'];
}

export class YMYLValidator {
  /**
   * Detect if content is YMYL (Your Money or Your Life)
   * Uses multilingual keyword detection based on language setting
   */
  static detectYMYL(content: string, language?: string): { isYMYL: boolean; category?: YMYLCategory } {
    const lowerContent = content.toLowerCase();
    const keywords = getYMYLKeywords(language);

    for (const [category, categoryKeywords] of Object.entries(keywords)) {
      const matchCount = categoryKeywords.filter(kw => lowerContent.includes(kw.toLowerCase())).length;
      if (matchCount >= 2) {
        return { isYMYL: true, category: category as YMYLCategory };
      }
    }

    return { isYMYL: false };
  }

  /**
   * Validate YMYL content follows full 4-step Safe Answer Protocol:
   * 1. Direct Answer — factual statement
   * 2. Conditions/Exceptions — caveats, nuances
   * 3. Multiple Perspectives — alternative viewpoints
   * 4. Professional Citation — authoritative source reference
   *
   * Uses language-specific patterns for each step.
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    if (!context.isYMYL) return violations;

    const language = context.language || context.businessInfo?.language;
    const patterns = getConditionPatterns(language);
    const sentences = splitSentences(content);

    if (sentences.length === 0) return violations;

    // Step 1: Direct Answer — first sentence should be factual, not hedging
    const firstSentence = sentences[0]?.trim() || '';
    const hedgingStart = /^(it depends|there is no simple|the answer (varies|depends)|this is (complex|complicated))/i;
    if (hedgingStart.test(firstSentence)) {
      violations.push({
        rule: 'YMYL_DIRECT_ANSWER',
        text: firstSentence.substring(0, 80),
        position: 0,
        suggestion: 'YMYL Step 1: Start with a direct, factual answer before adding conditions. Lead with the most common/accepted answer.',
        severity: 'error',
      });
    }

    // Step 2: Conditions/Exceptions
    const hasCondition = patterns.conditions.some(pattern => pattern.test(content));
    if (!hasCondition) {
      violations.push({
        rule: 'YMYL_CONDITIONS',
        text: content.substring(0, 100) + '...',
        position: 0,
        suggestion: 'YMYL Step 2: Add conditions/exceptions (however, unless, depending on, in certain cases) to acknowledge nuance.',
        severity: 'warning',
      });
    }

    // Step 3: Multiple Perspectives
    const perspectivePatterns = [
      /\b(some (experts?|studies|researchers?|professionals?)|others? (argue|suggest|recommend|believe))\b/i,
      /\b(alternative(ly)?|on the other hand|conversely|in contrast)\b/i,
      /\b(one (approach|view|perspective)|another (approach|view|perspective))\b/i,
      // Dutch
      /\b(sommige (experts?|studies|onderzoekers?)|anderen (beweren|suggereren|aanbevelen))\b/i,
      // German
      /\b(einige (Experten|Studien|Forscher)|andere (argumentieren|vorschlagen|empfehlen))\b/i,
      // French
      /\b(certains (experts?|études|chercheurs?)|d'autres (suggèrent|recommandent|pensent))\b/i,
      // Spanish
      /\b(algunos (expertos?|estudios|investigadores?)|otros (argumentan|sugieren|recomiendan))\b/i,
    ];
    const hasPerspectives = perspectivePatterns.some(p => p.test(content));
    if (!hasPerspectives && sentences.length >= 4) {
      violations.push({
        rule: 'YMYL_PERSPECTIVES',
        text: content.substring(0, 100) + '...',
        position: 0,
        suggestion: 'YMYL Step 3: Include multiple perspectives where applicable (some experts suggest, alternatively, on the other hand).',
        severity: 'info',
      });
    }

    // Step 4: Professional Citation
    const citationPatterns = [
      /\b(according to|as (stated|reported|published) (by|in)|per|source:)\b/i,
      /\b(study|research|report|data) (by|from|published)\b/i,
      /\b(consult|speak with|see)\s+(a|your)?\s*(doctor|physician|professional|advisor|lawyer|attorney|accountant|financial advisor)\b/i,
      // Dutch
      /\b(volgens|zoals (vermeld|gerapporteerd) (door|in))\b/i,
      /\b(raadpleeg|neem contact op met)\s+(een|uw)?\s*(arts|professional|adviseur|advocaat)\b/i,
      // German
      /\b(laut|gemäß|wie (berichtet|veröffentlicht) (von|in))\b/i,
      /\b(konsultieren Sie|wenden Sie sich an)\s+(einen|Ihren)?\s*(Arzt|Fachmann|Berater|Anwalt)\b/i,
      // French
      /\b(selon|d'après|comme (rapporté|publié) (par|dans))\b/i,
      /\b(consultez)\s+(un|votre)?\s*(médecin|professionnel|conseiller|avocat)\b/i,
      // Spanish
      /\b(según|de acuerdo con|como (informado|publicado) (por|en))\b/i,
      /\b(consulte)\s+(un|su)?\s*(médico|profesional|asesor|abogado)\b/i,
    ];
    const hasCitation = citationPatterns.some(p => p.test(content));
    if (!hasCitation) {
      violations.push({
        rule: 'YMYL_CITATION',
        text: content.substring(0, 100) + '...',
        position: 0,
        suggestion: 'YMYL Step 4: Add professional citation or recommendation to consult a qualified professional.',
        severity: 'warning',
      });
    }

    // Check for citation placement (fact first, then source)
    sentences.forEach(sentence => {
      if (patterns.badCitation.test(sentence.trim())) {
        violations.push({
          rule: 'YMYL_CITATION_ORDER',
          text: sentence,
          position: content.indexOf(sentence),
          suggestion: 'State the fact first, then the source. Restructure to lead with the fact.',
          severity: 'warning',
        });
      }
    });

    return violations;
  }
}
