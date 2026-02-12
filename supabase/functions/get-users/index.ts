// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- START Inlined Utility Functions ---
const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://app.cutthecrap.net',
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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
// --- END Inlined Utility Functions ---

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  try {
    const supabaseAdmin = createClient(
        getEnvVar('PROJECT_URL'),
        getEnvVar('SERVICE_ROLE_KEY')
    );

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !callerUser) {
        return json({ error: 'Unauthorized' }, 401, origin);
    }

    // GET - List all users
    if (req.method === 'GET') {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const safeUsers = users.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          role: u.user_metadata?.role || 'user'
      }));

      return json({ users: safeUsers }, 200, origin);
    }

    // POST - Create new user
    if (req.method === 'POST') {
      const body = await req.json();
      const { email, password, role } = body;

      if (!email || !password) {
        return json({ error: 'Email and password are required' }, 400, origin);
      }

      const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: role || 'user' }
      });

      if (createError) throw createError;
      return json({ user: data.user, message: 'User created successfully' }, 201, origin);
    }

    // PUT - Update user
    if (req.method === 'PUT') {
      const body = await req.json();
      const { id, email, password, role } = body;

      if (!id) {
        return json({ error: 'User ID is required' }, 400, origin);
      }

      const updateData: any = {
        user_metadata: { role: role || 'user' }
      };

      if (email) updateData.email = email;
      if (password) updateData.password = password;

      const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);

      if (updateError) throw updateError;
      return json({ user: data.user, message: 'User updated successfully' }, 200, origin);
    }

    // DELETE - Delete user
    if (req.method === 'DELETE') {
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return json({ error: 'User ID is required' }, 400, origin);
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

      if (deleteError) throw deleteError;
      return json({ message: 'User deleted successfully' }, 200, origin);
    }

    return json({ error: 'Method not allowed' }, 405, origin);

  } catch (error) {
    console.error("Error in get-users:", error);
    return json({ ok: false, error: error.message }, 500, origin)
  }
})