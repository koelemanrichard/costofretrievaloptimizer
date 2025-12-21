// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://shtqshmmsrmtquuhyupl.supabase.co';

export const handlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      user: { id: 'test-user-id', email: 'test@example.com' },
    });
  }),

  // Projects endpoint
  http.get(`${SUPABASE_URL}/rest/v1/projects`, () => {
    return HttpResponse.json([
      { id: 'project-1', project_name: 'Test Project', domain: 'example.com', user_id: 'test-user-id' },
    ]);
  }),

  // Topical maps endpoint
  http.get(`${SUPABASE_URL}/rest/v1/topical_maps`, () => {
    return HttpResponse.json([]);
  }),

  // Edge functions
  http.post(`${SUPABASE_URL}/functions/v1/get-settings`, () => {
    return HttpResponse.json({
      aiProvider: 'anthropic',
      aiModel: 'claude-3-sonnet',
    });
  }),

  http.post(`${SUPABASE_URL}/functions/v1/update-settings`, () => {
    return HttpResponse.json({ success: true });
  }),
];
