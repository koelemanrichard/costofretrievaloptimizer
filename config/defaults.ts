import { BusinessInfo } from '../types';
import { getDefaultModel, getFastModel } from './serviceRegistry';

// Helper to get env variable with fallback
const env = (key: string, fallback: string = ''): string =>
  import.meta.env[key] || fallback;

// AI model defaults — sourced from service registry, override via VITE_ env vars
export const AI_MODEL_DEFAULTS = {
  geminiModel: env('VITE_GEMINI_MODEL', getDefaultModel('gemini')),
  geminiFallbackModel: env('VITE_GEMINI_FALLBACK_MODEL', getFastModel('gemini')),
  anthropicModel: env('VITE_ANTHROPIC_MODEL', getDefaultModel('anthropic')),
};

export const defaultBusinessInfo: BusinessInfo = {
  domain: '',
  projectName: '',
  industry: '',
  model: '',
  websiteType: 'INFORMATIONAL', // Default website type
  valueProp: '',
  audience: '',
  expertise: 'Expert',
  seedKeyword: '',
  language: 'en',
  targetMarket: 'United States',

  // SECURITY NOTE: These VITE_ keys are user-provided API keys entered in Settings.
  // They are stored encrypted in Supabase user_settings and loaded client-side.
  // Server-side operations (edge functions) use Vault for key storage.
  // This is by design: the application acts as a client for user-owned API keys.
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
  aiModel: getDefaultModel('gemini'),
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
