// supabase/functions/send-invitation/index.ts
// Edge function for sending invitation emails
//
// Accepts invitation_id, sends personalized email to invitee
// Uses Resend API for email delivery (configure RESEND_API_KEY in secrets)
//
// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Utility Functions ---
const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://app.cutthecrap.net',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
];

function corsHeaders(requestOrigin?: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const ENV_PREFERRED: Record<string, string> = {
  'PROJECT_URL': 'SUPABASE_URL',
  'ANON_KEY': 'SUPABASE_ANON_KEY',
  'SERVICE_ROLE_KEY': 'SUPABASE_SERVICE_ROLE_KEY',
};
function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const preferred = ENV_PREFERRED[name];
  const value = preferred
    ? (Deno.env.get(preferred) || Deno.env.get(name))
    : Deno.env.get(name);
  if (!value) {
    throw new Error(`FATAL: Environment variable ${name} is not set.`);
  }
  return value;
}

function getOptionalEnvVar(name: string): string | undefined {
  const Deno = (globalThis as any).Deno;
  return Deno.env.get(name);
}

function json(body: any, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

// Email templates
function getOrganizationInviteHtml(params: {
  inviterName: string;
  organizationName: string;
  role: string;
  message?: string;
  acceptUrl: string;
  expiresAt: string;
}): string {
  const { inviterName, organizationName, role, message, acceptUrl, expiresAt } = params;
  const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi there,
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.
    </p>

    ${message ? `
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
      <p style="margin: 0; font-style: italic; color: #555;">
        "${message}"
      </p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      This invitation will expire on <strong>${expiresDate}</strong>.
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 12px; color: #999;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
  `.trim();
}

function getProjectInviteHtml(params: {
  inviterName: string;
  projectName: string;
  organizationName: string;
  role: string;
  message?: string;
  acceptUrl: string;
  expiresAt: string;
}): string {
  const { inviterName, projectName, organizationName, role, message, acceptUrl, expiresAt } = params;
  const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to collaborate on ${projectName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Collaboration Invite</h1>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi there,
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${inviterName}</strong> has invited you to collaborate on the project <strong>"${projectName}"</strong> (part of ${organizationName}) as a <strong>${role}</strong>.
    </p>

    ${message ? `
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #11998e;">
      <p style="margin: 0; font-style: italic; color: #555;">
        "${message}"
      </p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      This invitation will expire on <strong>${expiresDate}</strong>.
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 12px; color: #999;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
  `.trim();
}

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    const body = await req.json();
    const { invitation_id } = body;

    if (!invitation_id) {
      return json({ ok: false, error: 'Missing invitation_id parameter' }, 400, origin);
    }

    // 1. Authenticate user
    const supabaseAuthClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('ANON_KEY'),
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      return json({ ok: false, error: `Authentication failed: ${userError?.message || 'No user found.'}` }, 401, origin);
    }

    // 2. Create service role client for privileged operations
    const serviceClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('SERVICE_ROLE_KEY')
    );

    // 3. Get invitation details
    const { data: invitation, error: inviteError } = await serviceClient
      .from('invitations')
      .select(`
        id,
        type,
        organization_id,
        project_id,
        email,
        role,
        token,
        invited_by,
        message,
        expires_at,
        accepted_at,
        declined_at
      `)
      .eq('id', invitation_id)
      .single();

    if (inviteError || !invitation) {
      console.error('[send-invitation] Fetch error:', inviteError);
      return json({ ok: false, error: 'Invitation not found' }, 404, origin);
    }

    // Verify caller is the inviter or an admin
    if (invitation.invited_by !== user.id) {
      // Check if user is admin of the org/project
      if (invitation.type === 'organization') {
        const { data: membership } = await serviceClient
          .from('organization_members')
          .select('role')
          .eq('organization_id', invitation.organization_id)
          .eq('user_id', user.id)
          .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          return json({ ok: false, error: 'Not authorized to send this invitation' }, 403, origin);
        }
      } else {
        const { data: membership } = await serviceClient
          .from('project_members')
          .select('role')
          .eq('project_id', invitation.project_id)
          .eq('user_id', user.id)
          .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          return json({ ok: false, error: 'Not authorized to send this invitation' }, 403, origin);
        }
      }
    }

    // Check if already accepted/declined
    if (invitation.accepted_at) {
      return json({ ok: false, error: 'Invitation already accepted' }, 400, origin);
    }
    if (invitation.declined_at) {
      return json({ ok: false, error: 'Invitation was declined' }, 400, origin);
    }

    // 4. Get inviter info
    const { data: inviterProfile } = await serviceClient
      .from('user_settings')
      .select('display_name')
      .eq('user_id', invitation.invited_by)
      .single();

    const inviterName = inviterProfile?.display_name || user.email?.split('@')[0] || 'A team member';

    // 5. Get org/project names
    let organizationName = 'Organization';
    let projectName = '';

    if (invitation.type === 'organization' && invitation.organization_id) {
      const { data: org } = await serviceClient
        .from('organizations')
        .select('name')
        .eq('id', invitation.organization_id)
        .single();
      organizationName = org?.name || 'Organization';
    } else if (invitation.type === 'project' && invitation.project_id) {
      const { data: project } = await serviceClient
        .from('projects')
        .select('project_name, organization_id, organizations!inner(name)')
        .eq('id', invitation.project_id)
        .single();
      projectName = project?.project_name || 'Project';
      organizationName = (project as any)?.organizations?.name || 'Organization';
    }

    // 6. Build accept URL
    const appUrl = getOptionalEnvVar('APP_URL') || 'https://app.example.com';
    const acceptUrl = `${appUrl}/accept-invitation?token=${invitation.token}`;

    // 7. Prepare email content
    let subject = '';
    let htmlContent = '';

    if (invitation.type === 'organization') {
      subject = `You're invited to join ${organizationName}`;
      htmlContent = getOrganizationInviteHtml({
        inviterName,
        organizationName,
        role: invitation.role,
        message: invitation.message,
        acceptUrl,
        expiresAt: invitation.expires_at,
      });
    } else {
      subject = `You're invited to collaborate on ${projectName}`;
      htmlContent = getProjectInviteHtml({
        inviterName,
        projectName,
        organizationName,
        role: invitation.role,
        message: invitation.message,
        acceptUrl,
        expiresAt: invitation.expires_at,
      });
    }

    // 8. Send email via Resend
    const resendApiKey = getOptionalEnvVar('RESEND_API_KEY');
    const fromEmail = getOptionalEnvVar('FROM_EMAIL') || 'noreply@example.com';
    const fromName = getOptionalEnvVar('FROM_NAME') || 'Holistic SEO Platform';

    if (!resendApiKey) {
      // Log but don't fail - useful for development
      console.log('[send-invitation] No RESEND_API_KEY configured, skipping email send');
      console.log('[send-invitation] Would send to:', invitation.email);
      console.log('[send-invitation] Subject:', subject);
      console.log('[send-invitation] Accept URL:', acceptUrl);

      return json({
        ok: true,
        message: 'Invitation created (email skipped - no RESEND_API_KEY)',
        acceptUrl: acceptUrl, // Return for testing
      }, 200, origin);
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [invitation.email],
        subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[send-invitation] Resend API error:', errorText);
      return json({ ok: false, error: 'Failed to send invitation email' }, 500, origin);
    }

    const emailResult = await emailResponse.json();

    // 9. Log audit event
    await serviceClient.rpc('log_audit_event', {
      p_org_id: invitation.organization_id || null,
      p_action: 'invitation.sent',
      p_target_type: invitation.type,
      p_target_id: invitation.id,
      p_new_value: {
        email: invitation.email,
        role: invitation.role,
        email_id: emailResult.id,
      },
    });

    return json({
      ok: true,
      message: `Invitation email sent to ${invitation.email}`,
      email_id: emailResult.id,
    }, 200, origin);

  } catch (error) {
    console.error('[send-invitation] Function error:', error);
    return json({ ok: false, error: error.message || 'Internal server error' }, 500, origin);
  }
});
