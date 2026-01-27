import { GoogleGenAI, Type } from "@google/genai";
import { AnalyzedContent, DesignSystem, ContentType, LayoutConfig } from "../types";

// Standard "Ontruimingen" demo content
export const DEMO_CONTENT: AnalyzedContent = {
  contentType: 'landing-page',
  title: "Woningontruiming en Bezemschoon Opleveren",
  heroImageKeyword: "house moving boxes clean living room",
  summary: "Een professionele woningontruiming is vaak noodzakelijk na een overlijden, verhuizing naar een zorginstelling of bij een openbare verkoop. Wij zorgen voor een zorgeloze afhandeling, van het sorteren van inboedel tot het bezemschoon opleveren van de woning volgens de eisen van de verhuurder of makelaar.",
  keyTakeaways: [
    "Volledige ontzorging bij woningontruiming na overlijden of verhuizing.",
    "Milieuvriendelijke afvoer van restinboedel en recycling.",
    "Bezemschoon oplevergarantie voor woningbouw of makelaar.",
    "Spoedontruimingen mogelijk door heel Nederland."
  ],
  sections: [
    {
      heading: "Wat houdt een woningontruiming in?",
      content: "<p>Bij een woningontruiming komt meer kijken dan alleen het weghalen van meubels. Het proces omvat het zorgvuldig sorteren van de inboedel, waarbij <strong>waardevolle spullen</strong> apart worden gehouden voor de familie.</p> <ul><li>Bruikbare goederen doneren wij aan goede doelen.</li><li>Onbruikbare materialen worden milieuvriendelijk gerecycled.</li></ul> <p>Daarnaast verwijderen we vloerbedekking, gordijnrails en eventuele aanpassingen in de woning om deze terug te brengen in de originele staat.</p>"
    },
    {
      heading: "Werkwijze en Planning",
      content: "<p>Na uw aanvraag komen wij, indien gewenst, langs voor een vrijblijvende taxatie. We bespreken uw wensen en maken een duidelijk plan van aanpak.</p> <p>Op de afgesproken datum komt ons team langs met professioneel materiaal:</p> <ul><li>Verhuisliften</li><li>Containers voor afvoer</li><li>Gecertificeerd personeel</li></ul> <p>Wij werken efficiënt en respectvol, zodat de ontruiming vaak binnen één dag gerealiseerd is.</p>"
    }
  ],
  faq: [
    {
      question: "Hoe snel kunnen jullie beginnen?",
      answer: "In spoedgevallen kunnen wij vaak binnen 24 tot 48 uur starten met de ontruiming."
    }
  ],
  benefits: [
    { title: "Snel Beschikbaar", description: "Binnen 24 uur ter plaatse.", iconKeyword: "clock" },
    { title: "Milieuvriendelijk", description: "Wij recyclen 90% van de inboedel.", iconKeyword: "leaf" },
    { title: "Gediplomeerd", description: "Ervaren en betrouwbaar personeel.", iconKeyword: "medal" }
  ],
  process: [
     { title: "Opname", description: "Gratis taxatie op locatie." },
     { title: "Offerte", description: "Duidelijke prijsafspraak vooraf." },
     { title: "Uitvoering", description: "Professionele ontruiming." },
     { title: "Oplevering", description: "Bezemschoon volgens eisen." }
  ],
  testimonials: [
    { quote: "Geweldig geholpen in een moeilijke tijd. Alles was brandschoon.", author: "Fam. de Vries" }
  ],
  callToActionText: "Vraag nu een vrijblijvende offerte aan",
  designSystem: {
    primaryColor: "#0ea5e9",
    secondaryColor: "#0c4a6e",
    backgroundColor: "#f0f9ff",
    fontFamily: "sans",
    borderRadius: "large",
    mood: "Professional and Clean"
  },
  layoutConfig: {
    showHero: true,
    showTOC: true,
    tocPosition: 'right',
    showKeyTakeaways: true,
    showFAQ: true,
    showBenefits: true,
    showProcess: true,
    showTestimonials: true,
    ctaIntensity: 'medium'
  }
};

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please configure your environment.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Analyzes a URL or Brand Name to determine the design system.
 */
export const extractBrandStyle = async (urlOrBrand: string): Promise<DesignSystem> => {
  const ai = getAiClient();
  const prompt = `
    You are a Lead UI/UX Designer.
    Analyze the brand identity for: "${urlOrBrand}".
    
    If it is a URL, infer the style from the brand's known online presence or industry standards.
    If it is a Brand Name, infer the style from the industry (e.g., 'Law Firm' = Serif/Navy, 'Toy Store' = Sans/Colorful).

    Determine:
    1. Primary Color (Hex)
    2. Secondary Color (Hex - dark contrast)
    3. Background Tint (Hex - very light version of primary or neutral)
    4. Font Family ('sans', 'serif', 'mono')
    5. Border Radius ('none', 'small', 'large', 'full')
    6. Mood (Short description)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          primaryColor: { type: Type.STRING },
          secondaryColor: { type: Type.STRING },
          backgroundColor: { type: Type.STRING },
          fontFamily: { type: Type.STRING, enum: ["sans", "serif", "mono"] },
          borderRadius: { type: Type.STRING, enum: ["none", "small", "large", "full"] },
          mood: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text || '{}') as DesignSystem;
};

/**
 * Structures content based on input and selected type.
 */
export const analyzeContent = async (
  rawText: string, 
  contentType: ContentType = 'auto',
  layoutConfig: LayoutConfig
): Promise<AnalyzedContent> => {
  const ai = getAiClient();
  const truncatedText = rawText.substring(0, 50000);

  const prompt = `
    You are an expert Web Developer and Content Strategist.
    
    TASK: Structure the input text into a optimized web layout.
    TARGET CONTENT TYPE: ${contentType} (If 'auto', detect the best fit).

    CONFIGURATION (Only include if true):
    - Include FAQ: ${layoutConfig.showFAQ}
    - Include Key Takeaways: ${layoutConfig.showKeyTakeaways}
    - Include Benefits List: ${layoutConfig.showBenefits}
    - Include Process Steps: ${layoutConfig.showProcess}
    - Include Testimonials (create plausible ones if missing): ${layoutConfig.showTestimonials}

    GUIDELINES:
    1. **Preserve HTML**: Keep <ul>, <table>, <strong>, headers inside the 'content' fields.
    2. **Structure**: 
       - If 'ecommerce': Focus on product specs, benefits, shipping.
       - If 'blog': Focus on readable sections, key takeaways.
       - If 'landing-page': Focus on benefits, trust signals, CTA.
    3. **Tone**: Match the tone to the detected content type.

    Input Content:
    "${truncatedText}" 
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          contentType: { type: Type.STRING, enum: ['landing-page', 'blog-post', 'ecommerce-product', 'support-article'] },
          title: { type: Type.STRING },
          heroImageKeyword: { type: Type.STRING },
          summary: { type: Type.STRING },
          
          keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                content: { type: Type.STRING }
              }
            }
          },
          faq: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING }
              }
            }
          },
          // New blocks
          benefits: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                iconKeyword: { type: Type.STRING }
              }
            }
          },
          process: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            }
          },
          testimonials: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                quote: { type: Type.STRING },
                author: { type: Type.STRING }
              }
            }
          },

          callToActionText: { type: Type.STRING },
          // Design system dummy
          designSystem: {
             type: Type.OBJECT,
             properties: {
                primaryColor: { type: Type.STRING },
                secondaryColor: { type: Type.STRING },
                backgroundColor: { type: Type.STRING },
                fontFamily: { type: Type.STRING },
                borderRadius: { type: Type.STRING },
                mood: { type: Type.STRING }
             }
          }
        }
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  
  // Sanitize and ensure defaults for arrays to prevent .map() crashes
  const sanitizedContent: AnalyzedContent = {
    contentType: parsed.contentType || 'landing-page',
    title: parsed.title || '',
    heroImageKeyword: parsed.heroImageKeyword || 'abstract',
    summary: parsed.summary || '',
    keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    faq: Array.isArray(parsed.faq) ? parsed.faq : [],
    benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
    process: Array.isArray(parsed.process) ? parsed.process : [],
    testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials : [],
    callToActionText: parsed.callToActionText || 'Learn More',
    designSystem: parsed.designSystem || {}, // This is overwritten by App.tsx logic anyway
    layoutConfig: layoutConfig
  };

  return sanitizedContent;
};