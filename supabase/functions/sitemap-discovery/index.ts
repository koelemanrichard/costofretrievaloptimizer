// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from "https://esm.sh/linkedom@0.16.11";

// --- START Inlined Utility Functions ---
// This code is normally in `_shared/utils.ts` but has been inlined
// to make this function a single, self-contained file for manual deployment.

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
  origin?: string | null,
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
  const origin = req.headers.get("origin");
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
