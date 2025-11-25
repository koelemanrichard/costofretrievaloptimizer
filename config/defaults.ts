// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { BusinessInfo } from '../types';

// Helper to get env variable with fallback
const env = (key: string, fallback: string = ''): string =>
  import.meta.env[key] || fallback;

export const defaultBusinessInfo: BusinessInfo = {
  domain: '',
  projectName: '',
  industry: '',
  model: '',
  valueProp: '',
  audience: '',
  expertise: 'Expert',
  seedKeyword: '',
  language: 'en',
  targetMarket: 'United States',

  // Service Credentials (from environment variables)
  dataforseoLogin: env('VITE_DATAFORSEO_LOGIN'),
  dataforseoPassword: env('VITE_DATAFORSEO_PASSWORD'),
  apifyToken: env('VITE_APIFY_TOKEN'),
  infranodusApiKey: env('VITE_INFRANODUS_API_KEY'),
  jinaApiKey: env('VITE_JINA_API_KEY'),
  firecrawlApiKey: env('VITE_FIRECRAWL_API_KEY'),
  apitemplateApiKey: env('VITE_APITEMPLATE_API_KEY'),

  // AI Provider Credentials (from environment variables)
  aiProvider: 'gemini',
  aiModel: 'gemini-3-pro',
  geminiApiKey: env('VITE_GEMINI_API_KEY'),
  openAiApiKey: env('VITE_OPENAI_API_KEY'),
  anthropicApiKey: env('VITE_ANTHROPIC_API_KEY'),
  perplexityApiKey: env('VITE_PERPLEXITY_API_KEY'),
  openRouterApiKey: env('VITE_OPENROUTER_API_KEY'),

  // Backend / Infra (from environment variables)
  supabaseUrl: env('VITE_SUPABASE_URL'),
  supabaseAnonKey: env('VITE_SUPABASE_ANON_KEY'),
  neo4jUri: env('VITE_NEO4J_URI'),
  neo4jUser: env('VITE_NEO4J_USER'),
  neo4jPassword: env('VITE_NEO4J_PASSWORD'),
};
