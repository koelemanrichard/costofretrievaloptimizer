

// deno-lint-ignore-file no-explicit-any

// This file contains shared utility functions for Deno Edge Functions.
// It's intended to be copied or imported into other functions.

const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://app.cutthecrap.net',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

export function corsHeaders(requestOrigin?: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0]; // Default to production origin
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

export function getEnvVar(name: string): string {
  const value = (globalThis as any).Deno.env.get(name);
  if (!value) {
    // Use console.warn instead of throwing an error to allow for optional env vars
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

export function getSupabaseUrl(req: Request): string {
  // Prefer the environment variable for consistency in backend functions.
  const envUrl = getEnvVar("PROJECT_URL");
  if (envUrl) return envUrl;
  
  // Fallback for client-side headers if needed, though env var is better.
  const headerUrl = req.headers.get("x-supabase-api-base");
  if (headerUrl) return headerUrl;

  // Last resort, try to parse from host (less reliable)
  const host = req.headers.get("host") ?? "";
  const m = host.match(/^([a-z0-9]{20})\./i);
  if (m && m[1]) {
    return `https://${m[1].toLowerCase()}.supabase.co`;
  }

  throw new Error(
    "Missing PROJECT_URL. It should be set as a secret for the function.",
  );
}

export function getFunctionsBase(supabaseUrl: string): string {
  return `${supabaseUrl}/functions/v1`;
}

export function json(
  body: any,
  status = 200,
  origin?: string | null,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
      ...headers,
    },
  });
}

export async function fetchWithTimeout(resource: string | URL, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}