// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Inlined Utils for stability ---
const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

function corsHeaders(requestOrigin?: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    // console.warn(`Environment variable ${name} is not set.`);
  }
  return value || "";
}

function json(body: any, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

// --- Inlined Crypto Logic (from _shared/crypto.ts) ---
async function getCryptoKey(): Promise<CryptoKey> {
  const secret = getEnvVar('ENCRYPTION_SECRET');
  if (!secret) {
    // Fallback or error - for scraping we might not strictly need this if key is passed in body
    // But we need it to decrypt user settings.
    // Throwing here might crash the function if secret is missing, so we handle gracefully.
    return null as any; 
  }
  const keyData = atob(secret).split('').map(c => c.charCodeAt(0));
  const keyBuffer = new Uint8Array(keyData);
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
}

async function decrypt(encryptedText: string): Promise<string | null> {
  if (!encryptedText) return null;
  try {
    const key = await getCryptoKey();
    if (!key) return null; // Cannot decrypt without secret
    
    const combinedString = atob(encryptedText);
    const combined = new Uint8Array(combinedString.length);
    for (let i = 0; i < combinedString.length; i++) {
        combined[i] = combinedString.charCodeAt(i);
    }
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}
// --- End Crypto ---

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  try {
    const { url, project_id, apiKey: providedKey } = await req.json();

    if (!url) {
      return json({ ok: false, error: "URL is required" }, 400, origin);
    }

    // 1. Determine API Key to use
    let firecrawlKey = providedKey; // Use key from client if provided (defaults)

    // If not provided, try to fetch from DB (User Settings)
    if (!firecrawlKey && project_id) {
        try {
            const supabaseAdmin = createClient(
                getEnvVar('PROJECT_URL'),
                getEnvVar('SERVICE_ROLE_KEY')
            );

            const { data: project } = await supabaseAdmin
                .from('projects')
                .select('user_id')
                .eq('id', project_id)
                .single();
            
            if (project?.user_id) {
                const { data: settings } = await supabaseAdmin
                    .from('user_settings')
                    .select('settings_data')
                    .eq('user_id', project.user_id)
                    .single();
                
                if (settings?.settings_data?.firecrawlApiKey) {
                    const decrypted = await decrypt(settings.settings_data.firecrawlApiKey);
                    if (decrypted) firecrawlKey = decrypted;
                }
            }
        } catch (dbError) {
            console.warn("Failed to fetch settings from DB:", dbError);
        }
    }

    // Final Fallback: System Env
    if (!firecrawlKey) {
        firecrawlKey = getEnvVar('FIRECRAWL_API_KEY');
    }

    if (!firecrawlKey) {
        return json({ ok: false, error: "Firecrawl API Key not found. Please check your Settings." }, 400, origin);
    }

    // 2. Call Firecrawl API
    // Note: Firecrawl recently updated their API schema, ensuring compatibility with v0/scrape
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: url,
            pageOptions: {
                onlyMainContent: true,
                includeHtml: false,
                removeTags: ['script', 'style', 'nav', 'footer', 'aside', 'header']
            }
        })
    });

    if (!firecrawlResponse.ok) {
        const errText = await firecrawlResponse.text();
        console.error("Firecrawl API Error Body:", errText);
        return json({ ok: false, error: `Firecrawl API Error: ${firecrawlResponse.status}. ${errText}` }, 500, origin);
    }

    const firecrawlData = await firecrawlResponse.json();
    
    if (!firecrawlData.success) {
         return json({ ok: false, error: `Firecrawl failed: ${firecrawlData.error || 'Unknown error'}` }, 500, origin);
    }

    // 3. Return Data
    return json({
        ok: true,
        markdown: firecrawlData.data.markdown,
        metadata: firecrawlData.data.metadata
    }, 200, origin);

  } catch (error) {
    console.error("Firecrawl Scraper Fatal Error:", error);
    return json({ ok: false, error: error.message }, 500, origin);
  }
});