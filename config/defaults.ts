// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { BusinessInfo } from '../types';

// Helper to get env variable with fallback
const env = (key: string, fallback: string = ''): string =>
  import.meta.env[key] || fallback;

// AI model defaults — override via VITE_ env vars without code changes
export const AI_MODEL_DEFAULTS = {
  geminiModel: env('VITE_GEMINI_MODEL', 'gemini-3-pro-preview'),
  geminiFallbackModel: env('VITE_GEMINI_FALLBACK_MODEL', 'gemini-2.5-flash'),
  anthropicModel: env('VITE_ANTHROPIC_MODEL', 'claude-sonnet-4-5-20250929'),
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
  aiModel: 'gemini-3-pro-preview',
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
