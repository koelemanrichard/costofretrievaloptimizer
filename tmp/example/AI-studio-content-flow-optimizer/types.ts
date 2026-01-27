export interface Section {
  heading: string;
  content: string; // HTML or Markdown string
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Testimonial {
  quote: string;
  author: string;
}

export interface ProcessStep {
  title: string;
  description: string;
}

export interface Benefit {
  title: string;
  description: string;
  iconKeyword: string; // purely for mapping to an icon in frontend
}

export interface DesignSystem {
  primaryColor: string; // Hex code
  secondaryColor: string; // Hex code
  backgroundColor: string; // Hex code mostly for headers/accents
  fontFamily: 'sans' | 'serif' | 'mono';
  borderRadius: 'none' | 'small' | 'large' | 'full';
  mood: string; // description of the vibe
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  designSystem: DesignSystem;
}

export type ContentType = 'landing-page' | 'blog-post' | 'ecommerce-product' | 'support-article' | 'auto';

export interface LayoutConfig {
  showHero: boolean;
  showTOC: boolean;
  tocPosition: 'left' | 'right';
  showKeyTakeaways: boolean;
  showFAQ: boolean;
  showBenefits: boolean; // New
  showProcess: boolean; // New
  showTestimonials: boolean; // New
  ctaIntensity: 'none' | 'low' | 'medium' | 'high'; 
}

export interface AnalyzedContent {
  contentType: ContentType;
  title: string;
  heroImageKeyword: string;
  summary: string;
  keyTakeaways: string[];
  sections: Section[];
  faq: FaqItem[];
  benefits: Benefit[]; // New
  process: ProcessStep[]; // New
  testimonials: Testimonial[]; // New
  callToActionText: string;
  designSystem: DesignSystem;
  layoutConfig: LayoutConfig; 
}

export interface AppState {
  step: 'style-setup' | 'content-input' | 'analyzing' | 'view';
  designSystem: DesignSystem;
  layoutConfig: LayoutConfig; 
  data: AnalyzedContent | null;
  error: string | null;
}