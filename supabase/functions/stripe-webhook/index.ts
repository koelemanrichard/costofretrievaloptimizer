// supabase/functions/stripe-webhook/index.ts
// Edge function for handling Stripe subscription webhooks
//
// Events handled:
//   - checkout.session.completed - New subscription created
//   - customer.subscription.created - Subscription created (backup)
//   - customer.subscription.updated - Subscription changed (upgrade/downgrade)
//   - customer.subscription.deleted - Subscription canceled
//   - invoice.paid - Successful payment
//   - invoice.payment_failed - Failed payment
//
// IMPORTANT: Configure STRIPE_WEBHOOK_SECRET in secrets
//
// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Utility Functions ---
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

// Simple HMAC-SHA256 signature verification for Stripe webhooks
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Parse the signature header
    const parts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts.t;
    const expectedSig = parts.v1;

    if (!timestamp || !expectedSig) {
      console.error('[stripe-webhook] Missing timestamp or signature');
      return false;
    }

    // Check timestamp (reject if too old - 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const eventTime = parseInt(timestamp, 10);
    if (Math.abs(now - eventTime) > 300) {
      console.error('[stripe-webhook] Timestamp too old');
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computedSig = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSig === expectedSig;
  } catch (error) {
    console.error('[stripe-webhook] Signature verification error:', error);
    return false;
  }
}

// Map Stripe product/price IDs to module IDs
function getModuleFromPrice(priceId: string): string | null {
  // This should be configured based on your Stripe products
  const priceToModule: Record<string, string> = {
    // Monthly prices
    'price_content_generation_monthly': 'content_generation',
    'price_advanced_seo_monthly': 'advanced_seo',
    'price_corpus_audit_monthly': 'corpus_audit',
    'price_enterprise_monthly': 'enterprise',
    // Yearly prices
    'price_content_generation_yearly': 'content_generation',
    'price_advanced_seo_yearly': 'advanced_seo',
    'price_corpus_audit_yearly': 'corpus_audit',
    'price_enterprise_yearly': 'enterprise',
  };

  return priceToModule[priceId] || null;
}

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const webhookSecret = getOptionalEnvVar('STRIPE_WEBHOOK_SECRET');
    const signature = req.headers.get('stripe-signature');
    const rawBody = await req.text();

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = await verifyStripeSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error('[stripe-webhook] Invalid signature');
        return new Response('Invalid signature', { status: 401 });
      }
    } else if (webhookSecret && !signature) {
      console.error('[stripe-webhook] Missing signature header');
      return new Response('Missing signature', { status: 401 });
    } else {
      console.warn('[stripe-webhook] No webhook secret configured - signature not verified');
    }

    const event = JSON.parse(rawBody);
    console.log('[stripe-webhook] Received event:', event.type, event.id);

    // Create service role client
    const serviceClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('SERVICE_ROLE_KEY')
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Get the organization ID from metadata
        const organizationId = session.metadata?.organization_id;
        if (!organizationId) {
          console.error('[stripe-webhook] No organization_id in session metadata');
          return new Response('Missing organization_id', { status: 400 });
        }

        // Get subscription details
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (subscriptionId) {
          // Update organization with Stripe customer ID if not set
          await serviceClient
            .from('organizations')
            .update({ stripe_customer_id: customerId })
            .eq('id', organizationId)
            .is('stripe_customer_id', null);

          console.log('[stripe-webhook] Checkout completed for org:', organizationId);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find organization by Stripe customer ID
        const { data: org } = await serviceClient
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!org) {
          // Try to find from subscription metadata
          const orgId = subscription.metadata?.organization_id;
          if (!orgId) {
            console.error('[stripe-webhook] Cannot find organization for customer:', customerId);
            return new Response('Organization not found', { status: 404 });
          }

          // Update the org with the customer ID
          await serviceClient
            .from('organizations')
            .update({ stripe_customer_id: customerId })
            .eq('id', orgId);
        }

        const organizationId = org?.id || subscription.metadata?.organization_id;

        // Process each subscription item
        for (const item of subscription.items.data) {
          const priceId = item.price.id;
          const moduleId = getModuleFromPrice(priceId);

          if (!moduleId) {
            console.warn('[stripe-webhook] Unknown price ID:', priceId);
            continue;
          }

          // Map Stripe status to our status
          let status = 'active';
          if (subscription.status === 'past_due') status = 'past_due';
          if (subscription.status === 'canceled') status = 'canceled';
          if (subscription.status === 'trialing') status = 'trialing';
          if (subscription.status === 'unpaid') status = 'past_due';

          // Upsert the subscription record
          const { error: upsertError } = await serviceClient
            .from('organization_subscriptions')
            .upsert({
              organization_id: organizationId,
              module_id: moduleId,
              status,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, {
              onConflict: 'organization_id,module_id',
            });

          if (upsertError) {
            console.error('[stripe-webhook] Upsert error:', upsertError);
          } else {
            console.log('[stripe-webhook] Updated subscription:', organizationId, moduleId, status);
          }
        }

        // Log audit event (p_target_id is UUID, Stripe IDs are strings - pass in p_new_value instead)
        await serviceClient.rpc('log_audit_event', {
          p_org_id: organizationId,
          p_action: event.type === 'customer.subscription.created' ? 'subscription.created' : 'subscription.updated',
          p_target_type: 'subscription',
          p_new_value: {
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            items: subscription.items.data.map((i: any) => i.price.id),
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find organization by Stripe customer ID
        const { data: org } = await serviceClient
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!org) {
          console.error('[stripe-webhook] Cannot find organization for customer:', customerId);
          return new Response('Organization not found', { status: 404 });
        }

        // Mark all subscriptions with this Stripe subscription ID as canceled
        const { error: updateError } = await serviceClient
          .from('organization_subscriptions')
          .update({ status: 'canceled' })
          .eq('organization_id', org.id)
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('[stripe-webhook] Update error:', updateError);
        } else {
          console.log('[stripe-webhook] Canceled subscription for org:', org.id);
        }

        // Log audit event (p_target_id is UUID, Stripe IDs are strings - pass in p_new_value instead)
        await serviceClient.rpc('log_audit_event', {
          p_org_id: org.id,
          p_action: 'subscription.canceled',
          p_target_type: 'subscription',
          p_new_value: {
            stripe_subscription_id: subscription.id,
          },
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Find organization
        const { data: org } = await serviceClient
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org) {
          // Reactivate any past_due subscriptions
          await serviceClient
            .from('organization_subscriptions')
            .update({ status: 'active' })
            .eq('organization_id', org.id)
            .eq('status', 'past_due');

          console.log('[stripe-webhook] Invoice paid for org:', org.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Find organization
        const { data: org } = await serviceClient
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org) {
          // Mark subscriptions as past_due
          await serviceClient
            .from('organization_subscriptions')
            .update({ status: 'past_due' })
            .eq('organization_id', org.id)
            .eq('stripe_subscription_id', invoice.subscription);

          console.log('[stripe-webhook] Payment failed for org:', org.id);

          // Log audit event (p_target_id is UUID, Stripe IDs are strings - pass in p_new_value instead)
          await serviceClient.rpc('log_audit_event', {
            p_org_id: org.id,
            p_action: 'payment.failed',
            p_target_type: 'invoice',
            p_new_value: {
              stripe_invoice_id: invoice.id,
            },
          });
        }
        break;
      }

      default:
        console.log('[stripe-webhook] Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[stripe-webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
