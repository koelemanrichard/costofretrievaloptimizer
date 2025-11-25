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