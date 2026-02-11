/**
 * send-quote - Supabase Edge Function
 *
 * Sends a quote email with PDF attachment to the client.
 *
 * Request body:
 * - quoteId: string - The quote UUID to send
 * - recipientEmail: string - Override email (optional, defaults to quote.client_email)
 * - personalMessage: string - Optional personal message to include
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

function getCorsHeaders(requestOrigin?: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

interface SendQuoteRequest {
  quoteId: string;
  recipientEmail?: string;
  personalMessage?: string;
}

interface QuoteLineItem {
  moduleId: string;
  moduleName: string;
  category: string;
  quantity: number;
  totalMin: number;
  totalMax: number;
}

interface Quote {
  id: string;
  client_name: string;
  client_email: string;
  client_company: string;
  client_domain: string;
  line_items: QuoteLineItem[];
  total_min: number;
  total_max: number;
  kpi_projections: Array<{
    metric: string;
    projectedMin: number;
    projectedMax: number;
    timeframeMonths: number;
  }>;
  valid_until: string;
  notes: string;
  status: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function generateQuoteHtml(quote: Quote, personalMessage?: string): string {
  const lineItemsHtml = quote.line_items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.moduleName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${formatCurrency(item.totalMin)} - ${formatCurrency(item.totalMax)}
        </td>
      </tr>
    `
    )
    .join('');

  const kpiHtml = quote.kpi_projections
    ?.slice(0, 5)
    .map(
      (kpi) => `
      <li style="margin-bottom: 8px;">
        <strong>${kpi.metric}:</strong> ${kpi.projectedMin} - ${kpi.projectedMax}
        (${kpi.timeframeMonths} months)
      </li>
    `
    )
    .join('') || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>SEO Quote for ${quote.client_company || quote.client_name}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #374151;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin-bottom: 5px;">Your SEO Quote</h1>
        <p style="color: #6b7280; margin: 0;">Prepared for ${quote.client_company || quote.client_name}</p>
      </div>

      ${personalMessage ? `
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; color: #374151;">${personalMessage}</p>
        </div>
      ` : ''}

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600;">Service</th>
              <th style="padding: 12px; text-align: right; font-weight: 600;">Price Range</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #1f2937; color: white;">
              <td style="padding: 16px; font-weight: 600;">Total Investment</td>
              <td style="padding: 16px; text-align: right; font-weight: 600; font-size: 18px;">
                ${formatCurrency(quote.total_min)} - ${formatCurrency(quote.total_max)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${kpiHtml ? `
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 12px;">Projected Outcomes</h2>
          <ul style="color: #374151; padding-left: 20px;">
            ${kpiHtml}
          </ul>
        </div>
      ` : ''}

      ${quote.notes ? `
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 12px;">Notes</h2>
          <p style="color: #374151;">${quote.notes}</p>
        </div>
      ` : ''}

      <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; color: #1e40af;">
          <strong>Quote Valid Until:</strong> ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '30 days from receipt'}
        </p>
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Reply to this email to accept or discuss this quote.
        </p>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { quoteId, recipientEmail, personalMessage }: SendQuoteRequest = await req.json();

    if (!quoteId) {
      return new Response(
        JSON.stringify({ error: 'quoteId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: 'Quote not found', details: quoteError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = recipientEmail || quote.client_email;
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'No recipient email provided and quote has no client_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate HTML content
    const htmlContent = generateQuoteHtml(quote as Quote, personalMessage);

    // Send email via Resend if API key is available
    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'SEO Quotes <quotes@yourdomain.com>',
          to: [email],
          subject: `Your SEO Quote - ${quote.client_company || quote.client_name}`,
          html: htmlContent,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error('Resend error:', errorData);
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: errorData }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('No RESEND_API_KEY set - email would be sent to:', email);
    }

    // Update quote status
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    if (updateError) {
      console.error('Failed to update quote status:', updateError);
    }

    // Log the activity
    await supabase.from('quote_activities').insert({
      quote_id: quoteId,
      activity_type: 'sent',
      details: { recipient: email, had_personal_message: !!personalMessage },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: resendApiKey ? 'Quote sent successfully' : 'Quote marked as sent (no email service configured)',
        sentTo: email,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-quote function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
