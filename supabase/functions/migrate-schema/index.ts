
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