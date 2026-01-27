import { ProjectTemplate } from "../types";

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'auto',
    name: '✨ AI Auto-Detect',
    description: 'Laat de AI de stijl bepalen op basis van de tekstinhoud.',
    // Dummy design system, will be overwritten by AI
    designSystem: {
      primaryColor: '#000000',
      secondaryColor: '#000000',
      backgroundColor: '#ffffff',
      fontFamily: 'sans',
      borderRadius: 'small',
      mood: 'Auto'
    }
  },
  {
    id: 'ontruimingen',
    name: '🚛 Ontruimingen Expert',
    description: 'De standaard huisstijl: Vertrouwen, Blauw, Helder.',
    designSystem: {
      primaryColor: '#0ea5e9', // Sky 500
      secondaryColor: '#0c4a6e', // Sky 900
      backgroundColor: '#f0f9ff', // Sky 50
      fontFamily: 'sans',
      borderRadius: 'large',
      mood: 'Betrouwbaar & Professioneel'
    }
  },
  {
    id: 'corporate',
    name: '⚖️ Zakelijk / Juridisch',
    description: 'Serieuze uitstraling met donkere kleuren en schreefletters.',
    designSystem: {
      primaryColor: '#1e293b', // Slate 800
      secondaryColor: '#0f172a', // Slate 900
      backgroundColor: '#f8fafc', // Slate 50
      fontFamily: 'serif',
      borderRadius: 'small',
      mood: 'Corporate & Gezaghebbend'
    }
  },
  {
    id: 'warm',
    name: '🏡 Warm & Zorg',
    description: 'Zachte aardtinten voor zorginstellingen of makelaars.',
    designSystem: {
      primaryColor: '#d97706', // Amber 600
      secondaryColor: '#78350f', // Amber 900
      backgroundColor: '#fffbeb', // Amber 50
      fontFamily: 'sans',
      borderRadius: 'full',
      mood: 'Warm & Uitnodigend'
    }
  },
  {
    id: 'modern',
    name: '🚀 Tech & Modern',
    description: 'Strak, minimalistisch, zwart/wit met felle accenten.',
    designSystem: {
      primaryColor: '#6366f1', // Indigo 500
      secondaryColor: '#111827', // Gray 900
      backgroundColor: '#f3f4f6', // Gray 100
      fontFamily: 'mono',
      borderRadius: 'none',
      mood: 'Innovatief & Strak'
    }
  }
];