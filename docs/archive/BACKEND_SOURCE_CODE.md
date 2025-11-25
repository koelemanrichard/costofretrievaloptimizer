# Backend Source Code (Supabase Edge Functions)

This document contains the complete source code for every backend file (`.ts`, `.json`) in the Holistic SEO Workbench application, organized by function.

---
## Function: `_shared`
---
### File: `_shared/utils.ts`
---
```ts
// deno-lint-ignore-file no-explicit-any

// This file contains shared utility functions for Deno Edge Functions.
// It's intended to be copied or imported into other functions.

export function corsHeaders(origin = "*") {
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
  origin = "*",
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
```
---
### File: `_shared/crypto.ts`
---
```ts
// supabase/functions/_shared/crypto.ts
// deno-lint-ignore-file no-explicit-any
const Deno = (globalThis as any).Deno;

// Helper to get the encryption key from environment variables
async function getCryptoKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable not set.');
  }
  // The secret is Base64 encoded, so we need to decode it first.
  const keyData = atob(secret).split('').map(c => c.charCodeAt(0));
  const keyBuffer = new Uint8Array(keyData);
  
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypts a plaintext string
export async function encrypt(text: string): Promise<string | null> {
  if (!text) return null;
  try {
    const key = await getCryptoKey();
    const encoded = new TextEncoder().encode(text);
    // The IV must be unique for every encryption with the same key.
    // 12 bytes is the recommended size for AES-GCM.
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoded
    );
    
    // Combine IV and ciphertext for storage. We'll store it as a Base64 string.
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert the combined buffer to a Base64 string for easy storage in a text column.
    const combinedString = String.fromCharCode.apply(null, Array.from(combined));
    return btoa(combinedString);

  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Could not encrypt the data.');
  }
}

// Decrypts a Base64 encoded ciphertext string
export async function decrypt(encryptedText: string): Promise<string | null> {
  if (!encryptedText) return null;
  try {
    const key = await getCryptoKey();
    
    // Convert the Base64 string back to a Uint8Array
    const combinedString = atob(encryptedText);
    const combined = new Uint8Array(combinedString.length);
    for (let i = 0; i < combinedString.length; i++) {
        combined[i] = combinedString.charCodeAt(i);
    }
    
    // Extract the IV and ciphertext
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
    // It's safer to return null or throw an error than to return corrupted data.
    // Returning null is often easier for the calling function to handle gracefully.
    return null;
  }
}
```
---
## Function: `start-website-analysis`
---
### File: `start-website-analysis/index.ts`
---
```ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- START Inlined Utility Functions ---
// This code is normally in `_shared/utils.ts` but has been inlined
// to make this function a single, self-contained file for manual deployment.

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET, PUT, DELETE, PATCH",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

function getFunctionsBase(supabaseUrl: string): string {
    const envUrl = getEnvVar("PROJECT_URL");
    if(!supabaseUrl && envUrl) supabaseUrl = envUrl;
    return `${supabaseUrl}/functions/v1`;
}

function json(
  body: any,
  status = 200,
  origin = "*",
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
// --- END Inlined Utility Functions ---


const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  // This is a placeholder implementation.
  try {
    const { project_id } = await req.json();
    console.log(`Placeholder: Starting analysis for project_id: ${project_id}`);
    
    // Initialize Supabase client
    const supabaseClient = createClient(
        getEnvVar('PROJECT_URL')!,
        getEnvVar('SERVICE_ROLE_KEY')!
    );

    // Simulate starting the process
    await supabaseClient.from('projects').update({ status: 'queued', status_message: 'Analysis has been queued.' }).eq('id', project_id);
    
    // Asynchronously invoke the next step (sitemap-discovery)
    fetch(`${getFunctionsBase(getEnvVar('PROJECT_URL'))}/sitemap-discovery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getEnvVar('SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ project_id })
    }).catch(e => console.error(`Failed to invoke sitemap-discovery for project ${project_id}:`, e.message));

    return json({ ok: true, message: "Analysis started (placeholder).", data: { project_id } }, 202, origin);

  } catch (error) {
    console.error("Error in start-website-analysis:", error);
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
```
---
## Function: `sitemap-discovery`
---
### File: `sitemap-discovery/index.ts`
---
```ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from "https://esm.sh/linkedom@0.16.11";

// --- START Inlined Utility Functions ---
// This code is normally in `_shared/utils.ts` but has been inlined
// to make this function a single, self-contained file for manual deployment.

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET, PUT, DELETE, PATCH",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

function getFunctionsBase(supabaseUrl: string): string {
    const envUrl = getEnvVar("PROJECT_URL");
    if(!supabaseUrl && envUrl) supabaseUrl = envUrl;
    return `${supabaseUrl}/functions/v1`;
}

function json(
  body: any,
  status = 200,
  origin = "*",
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

async function fetchWithTimeout(resource: string, options: any = {}) {
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

async function discoverSitemapUrls(domain: string): Promise<string[]> {
    try {
        const response = await fetchWithTimeout(`https://${domain}/robots.txt`, { timeout: 5000 });
        if (response.ok) {
            const text = await response.text();
            const matches = text.match(/Sitemap:\s*(.*)/gi);
            if (matches) {
                return matches.map(s => s.split(': ')[1].trim());
            }
        }
    } catch (e) {
        console.warn(`Could not fetch or parse robots.txt for ${domain}`, e);
    }

    const commonPaths = ['/sitemap.xml', '/sitemap_index.xml'];
    for (const path of commonPaths) {
        try {
            const sitemapUrl = `https://${domain}${path}`;
            const response = await fetchWithTimeout(sitemapUrl, { method: 'HEAD', timeout: 3000 });
            if (response.ok) {
                return [sitemapUrl];
            }
        } catch (e) {
             console.warn(`Error checking common sitemap path: ${path} for ${domain}`, e);
        }
    }

    return [];
}

function parseSitemapXml(xmlText: string): { sitemapUrls: string[], pageUrls: string[] } {
    const sitemapUrls: string[] = [];
    const pageUrls: string[] = [];
    const { document } = new DOMParser().parseFromString(xmlText, "text/xml");

    const sitemapNodes = document.querySelectorAll("sitemap > loc");
    sitemapNodes.forEach((node: any) => {
        if (node.textContent) sitemapUrls.push(node.textContent);
    });

    const urlNodes = document.querySelectorAll("url > loc");
    urlNodes.forEach((node: any) => {
        if (node.textContent) pageUrls.push(node.textContent);
    });

    return { sitemapUrls, pageUrls };
}

// --- END Inlined Utility Functions ---

// --- Main Function Logic ---
const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }
  
  const { project_id, domain } = await req.json()
  // Initialize Supabase client without type generics to remove file dependencies
  const supabaseClient = createClient(
      getEnvVar('PROJECT_URL')!,
      getEnvVar('SERVICE_ROLE_KEY')!
  )

  try {
    if (!project_id || !domain) {
      return json({ ok: false, error: 'project_id and domain are required' }, 400, origin)
    }

    // 1. Update project status
    await supabaseClient.from('projects').update({ status: 'discovering_sitemap', status_message: 'Searching for sitemaps...' }).eq('id', project_id);

    // 2. Discover and process sitemaps
    const initialSitemapUrls = await discoverSitemapUrls(domain);
    if (initialSitemapUrls.length === 0) {
        await supabaseClient.from('projects').update({ status: 'error', status_message: `No sitemap found for ${domain}. Could not proceed.` }).eq('id', project_id);
        return json({ ok: false, error: `No sitemap found for ${domain}` }, 404, origin);
    }

    const allPageUrls = new Set<string>();
    const sitemapsToProcess = [...initialSitemapUrls];
    const processedSitemaps = new Set<string>();

    while (sitemapsToProcess.length > 0) {
        const currentSitemapUrl = sitemapsToProcess.pop();
        if (!currentSitemapUrl || processedSitemaps.has(currentSitemapUrl)) {
            continue;
        }

        processedSitemaps.add(currentSitemapUrl);
        
        try {
            const response = await fetchWithTimeout(currentSitemapUrl, { timeout: 10000 });
            if (!response.ok) {
                console.warn(`Failed to fetch sitemap: ${currentSitemapUrl}, status: ${response.status}`);
                continue;
            }
            const xmlText = await response.text();
            const { sitemapUrls: newSitemapUrls, pageUrls } = parseSitemapXml(xmlText);
            
            pageUrls.forEach(url => allPageUrls.add(url));
            
            newSitemapUrls.forEach(url => {
                if (!processedSitemaps.has(url)) {
                    sitemapsToProcess.push(url);
                }
            });
        } catch (error) {
            console.error(`Error processing sitemap ${currentSitemapUrl}:`, error.message);
        }
    }

    // 3. Sync pages with the database
    const pagesData = Array.from(allPageUrls).map(url => ({ url, project_id }));
    await supabaseClient.from('projects').update({ status_message: `Found ${pagesData.length} URLs. Syncing with database...` }).eq('id', project_id);
    
    const { data: syncResult, error: rpcError } = await supabaseClient.rpc('sync_sitemap_pages', {
        p_project_id: project_id,
        pages_data: pagesData
    });
    
    if (rpcError) throw rpcError;
    console.log(`Sync result for project ${project_id}:`, syncResult);

    // 4. Update status and trigger next worker
    await supabaseClient.from('projects').update({ status: 'crawling_pages', status_message: 'Sitemap processed. Queuing pages for crawling.' }).eq('id', project_id);
    
    // Asynchronously invoke the next function
    const functionsBase = getFunctionsBase(getEnvVar('PROJECT_URL'));
    fetch(`${functionsBase}/crawl-worker`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getEnvVar('SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ project_id })
    }).catch(e => console.error(`Failed to invoke crawl-worker for project ${project_id}:`, e.message));

    return json({ ok: true, message: `Discovered and synced ${pagesData.length} pages. Crawling initiated.` }, 202, origin);

  } catch (error) {
    console.error('Sitemap discovery worker error:', error);
    if (project_id) {
        await supabaseClient.from('projects').update({ status: 'error', status_message: `Sitemap discovery failed: ${error.message}` }).eq('id', project_id);
    }
    return json({ ok: false, error: error.message }, 500, origin);
  }
});
```
---
## Function: `crawl-worker`
---
### File: `crawl-worker/index.ts`
---
```ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- START Inlined Utility Functions ---
function corsHeaders(origin = "*") {
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
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

function getFunctionsBase(supabaseUrl: string): string {
    const envUrl = getEnvVar("PROJECT_URL");
    if(!supabaseUrl && envUrl) supabaseUrl = envUrl;
    return `${supabaseUrl}/functions/v1`;
}

function json(
  body: any,
  status = 200,
  origin = "*",
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
// --- END Inlined Utility Functions ---

const APIFY_API_BASE = 'https://api.apify.com/v2';
const WEBSITE_CRAWLER_ACTOR_ID = 'apify/website-content-crawler';

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }
  
  const { project_id } = await req.json()
  const supabaseClient = createClient(
      getEnvVar('PROJECT_URL')!,
      getEnvVar('SERVICE_ROLE_KEY')!
  )

  try {
    if (!project_id) {
      return json({ ok: false, error: 'project_id is required' }, 400, origin)
    }
    
    const { data: project, error: projectError } = await supabaseClient.from('projects').select('domain, apify_token').eq('id', project_id).single();
    if (projectError || !project) throw new Error(`Project not found: ${project_id}`);
    
    const apifyToken = project.apify_token || getEnvVar('APIFY_API_KEY');
    if (!apifyToken) throw new Error('Apify token is required to start a crawl.');

    // Get pages to crawl
    const { data: pages, error: pagesError } = await supabaseClient.from('pages').select('url').eq('project_id', project_id).eq('status', 'queued');
    if (pagesError) throw pagesError;

    if (!pages || pages.length === 0) {
        await supabaseClient.from('projects').update({ status: 'semantic_mapping', status_message: 'No new pages to crawl. Proceeding to analysis.' }).eq('id', project_id);
        // Trigger next worker directly
        await supabaseClient.functions.invoke('crawl-results-worker', { body: { project_id, from_empty_crawl: true } });
        return json({ ok: true, message: "No pages to crawl, skipping to next step." }, 202, origin);
    }

    const startUrls = pages.map(p => ({ url: p.url }));
    
    // Prepare Apify actor run
    const runInput = {
        startUrls,
        "crawlerType": "cheerio",
        "maxCrawlDepth": 0,
        "maxCrawlPages": startUrls.length,
        "proxyConfiguration": { "useApifyProxy": true },
        "customDataFunction": `async ({ request, body }) => {
            return {
                url: request.url,
                html: body
            };
        };`
    };

    const functionsBase = getFunctionsBase(getEnvVar('PROJECT_URL'));
    const webhookUrl = `${functionsBase}/apify-webhook-handler`;
    
    const startRunUrl = `${APIFY_API_BASE}/acts/${WEBSITE_CRAWLER_ACTOR_ID.replace('/', '~')}/runs?token=${apifyToken}&webhooks=[{"event_types":["ACTOR.RUN.SUCCEEDED","ACTOR.RUN.FAILED","ACTOR.RUN.TIMED_OUT"],"request_url":"${webhookUrl}"}]`;

    const startResponse = await fetch(startRunUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runInput)
    });

    if (!startResponse.ok) {
        const errorText = await startResponse.text();
        throw new Error(`Apify start run failed: ${errorText}`);
    }
    
    const { data: runDetails } = await startResponse.json();

    // Save crawl session
    const { error: sessionError } = await supabaseClient
        .from('crawl_sessions')
        .insert({
            id: runDetails.id,
            project_id,
            domain: project.domain,
            status: 'RUNNING',
            status_message: 'Crawl initiated on Apify.',
        });

    if (sessionError) {
        console.error("Failed to save crawl session:", sessionError);
        // Don't fail the whole request, but log it.
    }

    // Update project status
    await supabaseClient.from('projects').update({ status: 'crawling', status_message: `Crawling ${startUrls.length} pages... (Run ID: ${runDetails.id})` }).eq('id', project_id);
    
    return json({ ok: true, message: "Crawl started successfully.", data: { runId: runDetails.id } }, 202, origin);

  } catch (error) {
    console.error('Crawl worker error:', error.message);
    if(project_id) {
      await supabaseClient.from('projects').update({ status: 'error', status_message: `Crawl worker failed: ${error.message}` }).eq('id', project_id);
    }
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
```
---
## Function: `apify-webhook-handler`
---
### File: `apify-webhook-handler/index.ts`
---
```ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- START Inlined from _shared/utils.ts ---
function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const value = (globalThis as any).Deno.env.get(name);
  if (!value) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

function getFunctionsBase(supabaseUrl: string): string {
  return `${supabaseUrl}/functions/v1`;
}

function json(
  body: any,
  status = 200,
  origin = "*",
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
// --- END Inlined from _shared/utils.ts ---

;(globalThis as any).Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  try {
    const payload = await req.json();
    const { eventType, resource } = payload;
    const runId = resource?.id;
    const datasetId = resource?.defaultDatasetId;

    if (!eventType || !resource || !runId) {
        return json({ ok: false, error: 'Invalid Apify webhook payload. Missing eventType, resource, or resource.id' }, 400, origin);
    }

    const supabaseClient = createClient(
        getEnvVar('PROJECT_URL')!,
        getEnvVar('SERVICE_ROLE_KEY')!
    );

    const { data: session, error: sessionError } = await supabaseClient
      .from('crawl_sessions')
      .select('project_id')
      .eq('id', runId)
      .single();

    if (sessionError) {
      console.warn(`Webhook for run ID ${runId} received, but no matching session was found. It might have been processed already or is invalid. Error: ${sessionError.message}`);
      // Acknowledge the webhook to prevent Apify from retrying.
      return json({ ok: true, message: 'Webhook acknowledged but no matching session found.' }, 200, origin);
    }
    
    const projectId = session.project_id;
    const isSuccess = eventType === 'ACTOR.RUN.SUCCEEDED';
    const status = isSuccess ? 'processing_crawl_results' : 'error';
    const statusMessage = isSuccess 
        ? `Crawl complete. Found ${resource.output.itemsCount} pages. Processing results...` 
        : `Crawl failed with status: ${eventType}. Run ID: ${runId}`;

    // Update crawl session in discovery schema
    await supabaseClient
      .from('crawl_sessions')
      .update({ 
          status: resource.status, // Use status from resource for more detail (e.g., SUCCEEDED, FAILED)
          status_message: statusMessage,
          finished_at: new Date(resource.finishedAt).toISOString()
      })
      .eq('id', runId);
    
    // Update main project status
    await supabaseClient
      .from('projects')
      .update({ status, status_message: statusMessage })
      .eq('id', projectId);

    if (isSuccess) {
        // Trigger the next worker
        // Use invoke to handle async call more reliably inside edge function
        await supabaseClient.functions.invoke('crawl-results-worker', {
            body: { project_id: projectId, dataset_id: datasetId }
        })
    }

    return json({ ok: true, message: 'Webhook processed successfully.' }, 200, origin);

  } catch (error) {
    console.error('Apify webhook handler error:', error.message, error.stack);
    // Even if we fail, return 200 to prevent Apify retries for a hook that will likely fail again.
    // The error is logged for debugging.
    return json({ ok: false, error: `Internal Server Error: ${error.message}` }, 200, origin);
  }
});
```
---
## Function: `crawl-results-worker`
---
### File: `crawl-results-worker/index.ts`
---
```ts
// deno-lint-ignore-file no-explicit-any
// --- START Inlined from _shared/utils.ts ---
export function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET, PUT, DELETE, PATCH",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

export function getEnvVar(name: string): string {
  const value = (globalThis as any).Deno.env.get(name);
  if (!value) {
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
  origin = "*",
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
// --- END Inlined from _shared/utils.ts ---

// --- Original function logic ---
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APIFY_API_BASE = 'https://api.apify.com/v2'

;(globalThis as any).Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "*";
  const { project_id, dataset_id, from_empty_crawl } = await req.json()
  const supabaseClient = createClient(
      getEnvVar('PROJECT_URL')!,
      getEnvVar('SERVICE_ROLE_KEY')!
  )
  try {
    if (!project_id) {
      return json({ ok: false, error: 'project_id is required' }, 400, origin)
    }

    if (from_empty_crawl) {
      await supabaseClient.from('projects').update({ status: 'semantic_mapping', status_message: 'Content analysis complete. Starting semantic mapping.' }).eq('id', project_id)
      await supabaseClient.functions.invoke('semantic-mapping-worker', { body: { project_id } });
      return json({ ok: true, message: "Skipping results processing due to empty crawl queue." }, 200, origin);
    }

    if (!dataset_id) {
      return json({ ok: false, error: 'dataset_id is required' }, 400, origin)
    }

    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('apify_token')
      .eq('id', project_id)
      .single()

    if (projectError || !project) throw new Error(`Project not found: ${project_id}`)

    const apifyToken = project.apify_token || getEnvVar('APIFY_API_KEY')
    if (!apifyToken) throw new Error('Apify token is required.')

    const resultsUrl = `${APIFY_API_BASE}/datasets/${dataset_id}/items?token=${apifyToken}&format=json`
    const resultsResponse = await fetch(resultsUrl)
    if (!resultsResponse.ok) throw new Error(`Failed to fetch Apify dataset: ${resultsResponse.statusText}`)
    
    const crawledPages = await resultsResponse.json()
    
    const analysisPromises = crawledPages.map(async (page: any) => {
      if (!page.url || !page.html) return null;

      const { data: analysisData, error: analysisError } = await supabaseClient.functions.invoke('content-analyzer', {
          body: { html: page.html }
      });

      if (analysisError) {
          console.error(`Failed to analyze content for ${page.url}:`, analysisError.message);
          return null;
      }

      return {
          project_id,
          url: page.url,
          status: 'crawled',
          content_layers: analysisData.contentLayers,
          word_count: analysisData.wordCount,
          last_crawled_at: new Date().toISOString()
      };
    });

    const pageUpdates = (await Promise.all(analysisPromises)).filter(Boolean);
    
    if (pageUpdates.length > 0) {
        const { error: rpcError } = await supabaseClient.rpc('update_crawled_pages', { page_updates: pageUpdates as any });
        if (rpcError) throw rpcError;
    }
    
    await supabaseClient.from('projects').update({ status: 'semantic_mapping', status_message: 'Content analysis complete. Starting semantic mapping.' }).eq('id', project_id)

    await supabaseClient.functions.invoke('semantic-mapping-worker', { body: { project_id } })

    return json({ ok: true, message: `Processed ${pageUpdates.length} pages.` }, 200, origin)
  } catch (error) {
    console.error('Crawl results worker error:', error)
    if(project_id) {
      await supabaseClient.from('projects').update({ status: 'error', status_message: `Processing crawl results failed: ${error.message}` }).eq('id', project_id);
    }
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
```
---
## Function: `content-analyzer`
---
### File: `content-analyzer/index.ts`
---
```ts
// deno-lint-ignore-file no-explicit-any
// --- START Inlined utility functions ---
function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET, PUT, DELETE, PATCH",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}
function json(
  body: any,
  status = 200,
  origin = "*",
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
// --- END Inlined utility functions ---

// --- Original function logic ---
import { parseHTML } from 'https://esm.sh/linkedom@0.16.11'

function extractJsonLd(document: any) {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const schemas = [];
    for (const script of scripts) {
        try {
            schemas.push(JSON.parse(script.textContent));
        } catch (e) {
            console.warn("Failed to parse JSON-LD script:", e);
        }
    }
    return schemas;
}

// FIX: Changed Deno.serve to (globalThis as any).Deno.serve to avoid potential linting errors where the Deno global is not recognized.
;(globalThis as any).Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  try {
    const { html } = await req.json()
    if (!html) {
        return json({ error: 'HTML content is required.' }, 400, origin)
    }

    const { document } = parseHTML(html)
    
    document.querySelectorAll('script, style, nav, footer, aside').forEach((el: any) => el.remove());
    
    const textContent = document.body?.textContent?.replace(/\s\s+/g, ' ').trim() || ''
    const wordCount = textContent.split(/\s+/).filter(Boolean).length

    const contentLayers = {
        title: document.querySelector('title')?.textContent || '',
        metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        h1: Array.from(document.querySelectorAll('h1')).map((h: any) => h.textContent.trim()),
        h2: Array.from(document.querySelectorAll('h2')).map((h: any) => h.textContent.trim()),
        jsonLd: extractJsonLd(document),
        rawText: textContent,
    }

    return json({ ok: true, contentLayers, wordCount }, 200, origin)
  } catch (error) {
    console.error('Content analyzer error:', error)
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
```
---
## Function: `semantic-mapping-worker`
---
### File: `semantic-mapping-worker/index.ts`
---
```ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt } from '../_shared/crypto.ts';

// --- START Inlined Utility Functions ---
function corsHeaders(origin = "*") {
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
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

function getFunctionsBase(supabaseUrl: string): string {
    const envUrl = getEnvVar("PROJECT_URL");
    if(!supabaseUrl && envUrl) supabaseUrl = envUrl;
    return `${supabaseUrl}/functions/v1`;
}

function json(
  body: any,
  status = 200,
  origin = "*",
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
// --- END Inlined Utility Functions ---

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }
  
  const { project_id } = await req.json()
  const supabaseClient = createClient(
      getEnvVar('PROJECT_URL')!,
      getEnvVar('SERVICE_ROLE_KEY')!
  )

  try {
    if (!project_id) {
      return json({ ok: false, error: 'project_id is required' }, 400, origin)
    }

    // --- SECURE KEY FETCHING & DECRYPTION ---
    const { data: project, error: projectError } = await supabaseClient.from('projects').select('user_id').eq('id', project_id).single();
    if (projectError || !project) throw new Error(`Project not found: ${project_id}`);
    
    const { data: settings, error: settingsError } = await supabaseClient.from('settings').select('*').eq('user_id', project.user_id).single();
    if (settingsError || !settings) throw new Error(`AI settings not found for the project's owner.`);

    const settingName = `${settings.ai_provider}_api_key_encrypted`; // e.g., 'openai_api_key_encrypted'
    const encryptedKey = (settings as Record<string, any>)[settingName];
    if (!encryptedKey) throw new Error(`API key for provider '${settings.ai_provider}' is not configured.`);
    
    const apiKey = await decrypt(encryptedKey);
    if (!apiKey) throw new Error(`Failed to decrypt API key for provider '${settings.ai_provider}'.`);
    // --- END SECURE KEY FETCHING & DECRYPTION ---

    console.log(`Placeholder: Starting semantic mapping for project ${project_id} using ${settings.ai_provider}.`);

    // Here you would fetch all pages and send to the selected AI provider using the decrypted API key for analysis.
    // For now, we'll just update the status and trigger the next worker.

    await supabaseClient.from('projects').update({ 
        status: 'gap_analysis', 
        status_message: 'Semantic mapping complete. Starting gap analysis.' 
    }).eq('id', project_id);
    
    fetch(`${getFunctionsBase(getEnvVar('PROJECT_URL'))}/gap-analysis-worker`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getEnvVar('SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id })
    }).catch(e => console.error(`Failed to invoke gap-analysis-worker for project ${project_id}:`, e.message));

    return json({ ok: true, message: "Semantic mapping complete (placeholder). Gap analysis initiated." }, 202, origin);

  } catch (error) {
    console.error('Semantic mapping worker error:', error.message);
    if(project_id) {
      await supabaseClient.from('projects').update({ status: 'error', status_message: `Semantic mapping failed: ${error.message}` }).eq('id', project_id);
    }
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
```
---
## Function: `gap-analysis-worker`
---
### File: `gap-analysis-worker/index.ts`
---
```ts
// deno-lint-ignore-file no-explicit-any

// This is a placeholder implementation for the gap-analysis-worker function.
// In a real scenario, this function would:
// 1. Fetch the semantic mapping results for the project.
// 2. Make AI calls to generate an "ideal" topical map based on the central entity.
// 3. Compare the ideal map with the current map to identify gaps.
// 4. Generate a final report and save it to the project's `analysis_result` column.
// 5. Update the project status to "complete".

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- START Inlined Utility Functions ---
function corsHeaders(origin = "*") {
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
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

function json(
  body: any,
  status = 200,
  origin = "*",
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
// --- END Inlined Utility Functions ---

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }
  
  const { project_id } = await req.json()
  const supabaseClient = createClient(
      getEnvVar('PROJECT_URL')!,
      getEnvVar('SERVICE_ROLE_KEY')!
  )

  try {
    if (!project_id) {
      return json({ ok: false, error: 'project_id is required' }, 400, origin)
    }

    console.log(`Placeholder: Starting gap analysis for project ${project_id}`);

    // Simulate analysis and report generation
    const placeholderReport = {
        summary: "The website has a strong foundation but is missing key informational content around advanced features and competitor comparisons.",
        content_gaps: [
            { topic: "Advanced Feature X Guide", reasoning: "No content exists to explain this core feature." },
            { topic: "Product vs. Competitor Y", reasoning: "Users are searching for comparisons but find no direct answer on the site." }
        ],
        content_to_keep: [ "Homepage", "About Us" ],
        content_to_improve: [ { page: "/blog/old-post", reason: "Outdated information and thin content." }]
    };

    // Update project with final results and status
    const { error } = await supabaseClient.from('projects').update({ 
        status: 'complete', 
        status_message: 'Analysis complete. Report is available.',
        analysis_result: placeholderReport
    }).eq('id', project_id);

    if (error) throw error;
    
    return json({ ok: true, message: "Gap analysis complete (placeholder).", report: placeholderReport }, 200, origin);

  } catch (error) {
    console.error('Gap analysis worker error:', error.message);
    if(project_id) {
      await supabaseClient.from('projects').update({ status: 'error', status_message: `Gap analysis failed: ${error.message}` }).eq('id', project_id);
    }
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
```
---
## Function: `get-settings`
---
### File: `get-settings/index.ts`
---
```ts
// supabase/functions/get-settings/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt } from '../_shared/crypto.ts';

// --- START Inlined Utility Functions ---
function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`FATAL: Environment variable ${name} is not set.`);
  }
  return value;
}

function json(
  body: any,
  status = 200,
  origin = "*",
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
// --- END Inlined Utility Functions ---
const Deno = (globalThis as any).Deno;

const keysToDecrypt = [
    'dataforseoLogin', 'dataforseoPassword', 'apifyToken',
    'infranodusApiKey', 'jinaApiKey', 'firecrawlApiKey',
    'apitemplateApiKey', 'geminiApiKey', 'openAiApiKey', 'anthropicApiKey',
    'perplexityApiKey', 'openRouterApiKey', 'neo4jUri',
    'neo4jUser', 'neo4jPassword'
];

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }
  
  try {
    const supabaseAuthClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('ANON_KEY'),
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      throw new Error(`Authentication failed: ${userError?.message || 'No user found.'}`);
    }

    const serviceRoleClient = createClient(getEnvVar('PROJECT_URL'), getEnvVar('SERVICE_ROLE_KEY'));
    
    const { data, error: selectError } = await serviceRoleClient
        .from('user_settings')
        .select('settings_data')
        .eq('user_id', user.id)
        .single();

    if (selectError) {
        // If no row is found, it's not an error, just return an empty object.
        if (selectError.code === 'PGRST116') {
            return json({}, 200, origin);
        }
        throw selectError;
    }

    if (!data || !data.settings_data) {
        return json({}, 200, origin);
    }

    const settings = data.settings_data as Record<string, any>;
    const decryptedSettings: Record<string, any> = { ...settings };

    for (const key of keysToDecrypt) {
        if (settings[key]) {
            try {
                const decryptedValue = await decrypt(settings[key]);
                // We send back the decrypted value for the user to edit.
                // It's in a password field on the client.
                decryptedSettings[key] = decryptedValue;
            } catch (e) {
                console.warn(`Could not decrypt key "${key}" for user ${user.id}. It may be corrupted or was saved before encryption was implemented. Sending empty string.`);
                decryptedSettings[key] = "";
            }
        }
    }
    
    return json(decryptedSettings, 200, origin);

  } catch (error) {
    console.error("[get-settings] Function crashed:", error);
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
```
---
## Function: `update-settings`
---
### File: `update-settings/index.ts`
---
```ts
// Implemented the update-settings Supabase Edge Function to securely handle saving user settings, including encryption of sensitive API keys.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encrypt } from '../_shared/crypto.ts';

// --- START Inlined Utility Functions ---
function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`FATAL: Environment variable ${name} is not set.`);
  }
  return value;
}

function json(
  body: any,
  status = 200,
  origin = "*",
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
// --- END Inlined Utility Functions ---

const Deno = (globalThis as any).Deno;

const keysToEncrypt = [
    'dataforseoLogin', 'dataforseoPassword', 'apifyToken',
    'infranodusApiKey', 'jinaApiKey', 'firecrawlApiKey',
    'apitemplateApiKey', 'geminiApiKey', 'openAiApiKey', 'anthropicApiKey',
    'perplexityApiKey', 'openRouterApiKey', 'neo4jUri',
    'neo4jUser', 'neo4jPassword'
];

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }
  
  try {
    const newSettings = await req.json();
    
    // 1. Authenticate user
    const supabaseAuthClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('ANON_KEY'),
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      throw new Error(`Authentication failed: ${userError?.message || 'No user found.'}`);
    }

    // 2. Encrypt sensitive fields
    const encryptedSettings = { ...newSettings };
    for (const key of keysToEncrypt) {
        // Only encrypt if a non-empty value is provided. This prevents encrypting empty strings on every save.
        if (newSettings[key]) {
            encryptedSettings[key] = await encrypt(newSettings[key]);
        }
    }
    
    // 3. Upsert settings into database
    const serviceRoleClient = createClient(getEnvVar('PROJECT_URL'), getEnvVar('SERVICE_ROLE_KEY'));
    
    const { error: upsertError } = await serviceRoleClient
      .from('user_settings')
      .upsert({
        user_id: user.id,
        settings_data: encryptedSettings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError);
      throw new Error(`Could not save settings: ${upsertError.message}`);
    }
    
    // 4. Return success response (without sensitive data)
    const safeSettings = { ...encryptedSettings };
    keysToEncrypt.forEach(key => {
        if(safeSettings[key]) {
            safeSettings[key] = '[ENCRYPTED]'; // Return a placeholder instead of the encrypted value
        }
    });
    
    return json({ ok: true, message: "Settings saved successfully.", settings: safeSettings }, 200, origin);

  } catch (error) {
    console.error("[update-settings] Function crashed:", error);
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
```
---
## Function: `migrate-schema`
---
### File: `migrate-schema/index.ts`
---
```ts
// supabase/functions/migrate-schema/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- START Inlined Utility Functions ---
function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`FATAL: Environment variable ${name} is not set.`);
  }
  return value;
}

function json(
  body: any,
  status = 200,
  origin = "*",
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
// --- END Inlined Utility Functions ---

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  try {
    const supabaseAuthClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('ANON_KEY'),
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      throw new Error(`Authentication failed: ${userError?.message || 'No user found.'}`);
    }
    const userId = user.id;

    const serviceRoleClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('SERVICE_ROLE_KEY')
    );

    // Fetch the user's settings row, selecting all columns including legacy ones
    const { data: settingsRow, error: selectError } = await serviceRoleClient
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (selectError) {
        if (selectError.code === 'PGRST116') {
            return json({ message: "No settings found for user. Nothing to migrate." }, 200, origin);
        }
        throw selectError;
    }

    const updates: Record<string, any> = {};
    let migrationNeeded = false;

    // Mapping of old (potentially misspelled) columns to new, correct columns
    const columnMigrationMap: Record<string, string> = {
        'openai_api_key_encrypted': 'open_ai_api_key_encrypted',
        'openrouter_api_key_encrypted': 'open_router_api_key_encrypted'
    };

    for (const oldCol in columnMigrationMap) {
        const newCol = columnMigrationMap[oldCol];
        if (settingsRow[oldCol] && !settingsRow[newCol]) {
            updates[newCol] = settingsRow[oldCol];
            migrationNeeded = true;
        }
    }

    if (migrationNeeded) {
        const { error: updateError } = await serviceRoleClient
            .from('settings')
            .update(updates)
            .eq('user_id', userId);

        if (updateError) throw updateError;
        
        return json({ message: `Migration successful. Found and copied data for ${Object.keys(updates).length} column(s). Your settings are now up-to-date.` }, 200, origin);
    } else {
        return json({ message: 'No migration needed. Your settings table is already up to date.' }, 200, origin);
    }
  } catch (error) {
    console.error("Error in migrate-schema:", error);
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
```
---
## Function: `health-check`
---
### File: `health-check/index.ts`
---
```ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encrypt, decrypt } from '../_shared/crypto.ts';

// --- START Inlined Utility Functions ---
function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value || "";
}

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function json(
  body: any,
  status = 200,
  origin = "*",
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
// --- END Inlined Utility Functions ---


const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const serviceRoleKey = getEnvVar("SERVICE_ROLE_KEY");
    const projectUrl = getEnvVar("PROJECT_URL");

    // 1. Check for presence of secrets
    const serviceRoleKeyIsSet = !!serviceRoleKey;
    const projectUrlIsSet = !!projectUrl;
    
    // 2. Attempt to use secrets to validate permissions
    let permissionError = null;
    let permissionsOk = false;
    if (serviceRoleKeyIsSet && projectUrlIsSet) {
        try {
            const permissionCheckClient = createClient(projectUrl, serviceRoleKey);
            const { error } = await permissionCheckClient.from('projects').select('id', { count: 'exact', head: true });

            if (error) {
                permissionError = `Database query failed with service role key: ${error.message}`;
            } else {
                permissionsOk = true;
            }
        } catch (e) {
            permissionError = `Client initialization or query failed catastrophically: ${e.message}`;
        }
    }

    // 3. Check Database Schema
    let schemaOk = false;
    let schemaErrorMsg = null;
    if (permissionsOk) {
        try {
            const schemaCheckClient = createClient(projectUrl, serviceRoleKey);
            const { data, error } = await schemaCheckClient.rpc('check_table_exists', { schema_name: 'public', table_name: 'projects' });

            if (error) {
                schemaErrorMsg = error.message;
            } else if (data === true) {
                schemaOk = true;
            } else {
                schemaErrorMsg = "The 'projects' table was not found. The database schema has not been initialized correctly.";
            }
        } catch (e) {
            schemaErrorMsg = e.message;
        }
    } else {
      schemaErrorMsg = "Skipped schema check because permissions check failed.";
    }

    // 4. Check Encryption Functionality
    let encryptionOk = false;
    let encryptionErrorMsg = null;
    if (permissionsOk && schemaOk) {
        try {
            const secret = getEnvVar("ENCRYPTION_SECRET");
            if (!secret) {
                throw new Error("The ENCRYPTION_SECRET is not set for your Edge Functions. This is required for saving API keys.");
            }
            if (atob(secret).length < 32) {
                 throw new Error("The decoded ENCRYPTION_SECRET is too short. It must be at least 32 bytes long.");
            }

            // Perform a round-trip test to validate the key and functions
            const testString = "health_check_test_string";
            const encrypted = await encrypt(testString);
            if (!encrypted) {
                throw new Error("Encryption function returned null. This may be an issue with the crypto key generation.");
            }

            const decrypted = await decrypt(encrypted);
            if (decrypted !== testString) {
                throw new Error(`Decryption failed. The decrypted text did not match the original.`);
            }

            encryptionOk = true;

        } catch (e) {
            encryptionErrorMsg = `Encryption test failed: ${e.message}`;
        }
    } else {
        encryptionErrorMsg = "Skipped encryption check because previous checks failed.";
    }


    return json({
      ok: true,
      message: "Health check complete.",
      secrets: {
          serviceRoleKeyIsSet,
          projectUrlIsSet,
      },
      permissions: {
          permissionsOk,
          permissionError
      },
      schema: {
          schemaOk,
          schemaError: schemaErrorMsg
      },
      encryption: {
          encryptionOk,
          encryptionError: encryptionErrorMsg
      }
    }, 200, origin);

  } catch (error) {
    console.error("Health check failed catastrophically:", error);
    return json({ 
        ok: false, 
        error: error.message,
    }, 500, origin);
  }
});
```
```

Please respond with **"continue"** to receive the final part, **Part 4 of 4: `SUPPORTING_DOCUMENTATION.md`**.