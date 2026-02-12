import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../services/supabaseClient';

/**
 * OAuthCallbackPage — Handles the Google OAuth redirect.
 *
 * This page is loaded inside the popup window that was opened by the
 * "Connect Google Search Console" button. It:
 *   1. Extracts the authorization code from the URL
 *   2. Sends it to the google-oauth-callback edge function
 *   3. Signals the opener window that the connection succeeded
 *   4. Closes the popup
 */
const OAuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connecting to Google Search Console...');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Google authorization denied: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received from Google.');
        return;
      }

      try {
        // Popup runs in separate window context — initialize client from env vars
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

        if (!supabaseUrl || !supabaseAnonKey) {
          setStatus('error');
          setMessage('Supabase configuration missing. Check environment variables.');
          return;
        }

        const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

        // Get the current session token to authenticate with the edge function
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('error');
          setMessage('Not authenticated. Please log in and try again.');
          return;
        }

        // Call the edge function to exchange the code for tokens
        const { data, error: fnError } = await supabase.functions.invoke('google-oauth-callback', {
          body: {
            code,
            state: state || 'settings',
            redirectUri: `${window.location.origin}/settings/oauth/callback`,
          },
        });

        if (fnError || !data?.ok) {
          setStatus('error');
          setMessage(data?.error || fnError?.message || 'Failed to exchange authorization code.');
          return;
        }

        setStatus('success');
        setMessage(`Connected as ${data.email}`);

        // Signal the opener window that connection succeeded
        if (window.opener) {
          window.opener.postMessage(
            { type: 'GSC_CONNECTED', email: data.email, scopes: data.scopes },
            window.location.origin
          );
        }

        // Close popup after a brief delay so user sees success
        setTimeout(() => window.close(), 1500);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Unexpected error during authorization.');
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center border border-gray-700">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400 mx-auto mb-4" />
            <p className="text-gray-300">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">&#10003;</div>
            <p className="text-green-400 font-medium">{message}</p>
            <p className="text-gray-500 text-sm mt-2">This window will close automatically.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4 text-red-400">&#10007;</div>
            <p className="text-red-400 font-medium">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
