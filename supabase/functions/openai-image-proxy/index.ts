/**
 * OpenAI Image Generation Proxy Edge Function
 *
 * Proxies requests to OpenAI's image generation API to avoid CORS issues.
 * Accepts API key via x-openai-api-key header (preferred) or falls back to
 * JWT + DB decrypt (legacy). JWT auth is optional — used for rate limiting only.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt } from "../_shared/crypto.ts";

const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://app.cutthecrap.net',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

function getCorsHeaders(requestOrigin?: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-openai-api-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface ImageGenerationRequest {
  prompt: string;
  model?: string;  // dall-e-2, dall-e-3, or gpt-image-1
  size?: string;   // 256x256, 512x512, 1024x1024, 1792x1024, 1024x1792, 1536x1024, 1024x1536, auto
  quality?: string; // standard/hd (dall-e-3), low/medium/high (gpt-image-1)
  style?: string;   // vivid or natural (dall-e-3 only, not used by gpt-image-1)
  n?: number;       // Number of images
  response_format?: 'url' | 'b64_json';
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Resolve OpenAI API key ---
    // Priority 1: x-openai-api-key header (no JWT dependency)
    // Priority 2: JWT + DB decrypt (legacy path)
    let openaiKey: string | null = req.headers.get("x-openai-api-key");
    let userId = 'anonymous';

    if (!openaiKey) {
      // Fall back to JWT + DB decrypt
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing API key. Provide x-openai-api-key header or Authorization JWT." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("ANON_KEY")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;

      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Authentication expired. Please refresh the page and try again." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = user.id;

      const serviceClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: settings, error: settingsError } = await serviceClient
        .from('user_settings')
        .select('settings_data')
        .eq('user_id', user.id)
        .single();

      const settingsData = settings?.settings_data as Record<string, any> | null;
      if (settingsError || !settingsData?.openAiApiKey) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key not configured. Please add it in Settings." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const decrypted = await decrypt(settingsData.openAiApiKey);
        if (!decrypted) throw new Error("Decryption returned null");
        openaiKey = decrypted;
      } catch {
        return new Response(
          JSON.stringify({ error: "Failed to decrypt OpenAI API key" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Parse request body
    const requestBody: ImageGenerationRequest = await req.json();

    if (!requestBody.prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const model = requestBody.model || 'dall-e-3';
    const isGptImage = model === 'gpt-image-1';

    // Build OpenAI request — gpt-image-1 uses different parameters
    const openaiRequest: Record<string, unknown> = {
      model,
      prompt: requestBody.prompt,
      size: requestBody.size || '1024x1024',
      n: requestBody.n || 1,
    };

    if (isGptImage) {
      // gpt-image-1: quality is low/medium/high, no style parameter
      openaiRequest.quality = requestBody.quality || 'medium';
      // gpt-image-1 returns b64_json by default via output_format
      openaiRequest.output_format = 'png';
    } else {
      // dall-e-3: quality is standard/hd, has style parameter
      openaiRequest.quality = requestBody.quality || 'standard';
      openaiRequest.style = requestBody.style || 'vivid';
      openaiRequest.response_format = requestBody.response_format || 'url';
    }

    console.log(`[OpenAI Image Proxy] Generating image for user ${userId}`);
    console.log(`[OpenAI Image Proxy] Model: ${model}, Size: ${openaiRequest.size}`);

    // Make request to OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openaiRequest)
    });

    // Get response
    const responseData = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error('[OpenAI Image Proxy] OpenAI error:', responseData);
      return new Response(
        JSON.stringify({
          error: responseData.error?.message || 'Image generation failed',
          code: responseData.error?.code,
          type: responseData.error?.type
        }),
        { status: openaiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // gpt-image-1 returns data differently — normalize the response
    if (isGptImage) {
      // gpt-image-1 returns: { data: [{ b64_json: "..." }] }
      return new Response(
        JSON.stringify({
          success: true,
          data: responseData.data,
          created: responseData.created
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return successful response (dall-e-3)
    return new Response(
      JSON.stringify({
        success: true,
        data: responseData.data,
        created: responseData.created
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[OpenAI Image Proxy] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
