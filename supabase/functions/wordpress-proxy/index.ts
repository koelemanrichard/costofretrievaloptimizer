/**
 * WordPress Proxy Edge Function
 *
 * Proxies requests to WordPress REST API to avoid CORS issues.
 * Handles authentication using stored credentials from wordpress_connections table.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Decrypt credential using the same algorithm as frontend
async function decryptCredential(ciphertext: string, userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Decode from base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  // Derive key from user ID (same as frontend)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId.padEnd(32, '0').substring(0, 32)),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('cutthecrap-wp-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return decoder.decode(decrypted);
}

interface ProxyRequest {
  connection_id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;  // e.g., '/wp-json/wp/v2/posts'
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { connection_id, method, endpoint, body, params }: ProxyRequest = await req.json();

    if (!connection_id || !method || !endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: connection_id, method, endpoint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to fetch connection (bypasses RLS for this lookup)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // First verify the user owns this connection using their JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the connection (with encrypted credentials)
    const { data: connection, error: connError } = await supabaseAdmin
      .from('wordpress_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('user_id', user.id)  // Ensure user owns this connection
      .single();

    if (connError || !connection) {
      console.error('[WP Proxy] Connection not found:', connError);
      return new Response(
        JSON.stringify({ error: "Connection not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt the password
    let password: string;
    try {
      password = await decryptCredential(connection.api_password_encrypted, user.id);
    } catch (decryptError) {
      console.error('[WP Proxy] Failed to decrypt credentials:', decryptError);
      return new Response(
        JSON.stringify({ error: "Failed to decrypt credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the WordPress URL
    let wpUrl = `${connection.site_url}${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      wpUrl += `?${searchParams.toString()}`;
    }

    // Create Basic Auth header
    const basicAuth = btoa(`${connection.api_username}:${password}`);

    // Make the request to WordPress
    console.log(`[WP Proxy] ${method} ${wpUrl}`);

    const wpResponse = await fetch(wpUrl, {
      method,
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Get response body
    const responseText = await wpResponse.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    // Return the WordPress response
    return new Response(
      JSON.stringify({
        success: wpResponse.ok,
        status: wpResponse.status,
        data: responseData,
      }),
      {
        status: 200,  // Always return 200 from proxy, include WP status in body
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error('[WP Proxy] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
