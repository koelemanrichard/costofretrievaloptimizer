-- Fix analytics tables RLS policies for org-based multi-tenancy
-- These tables use the legacy projects.user_id = auth.uid() pattern.
-- Replace with has_project_access() which checks org membership + legacy ownership.

-- ============================================================================
-- ANALYTICS_PROPERTIES (has project_id directly)
-- ============================================================================

DROP POLICY IF EXISTS "analytics_properties_project_access" ON public.analytics_properties;

CREATE POLICY "analytics_properties_project_access"
  ON public.analytics_properties FOR ALL
  TO authenticated
  USING (has_project_access(project_id))
  WITH CHECK (has_project_access(project_id));

-- Service role bypass for edge functions (analytics-sync-worker)
CREATE POLICY "Service role full access to analytics_properties"
  ON public.analytics_properties FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- GSC_SEARCH_ANALYTICS (access through analytics_properties → projects)
-- ============================================================================

DROP POLICY IF EXISTS "gsc_data_project_access" ON public.gsc_search_analytics;

CREATE POLICY "gsc_data_project_access"
  ON public.gsc_search_analytics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.analytics_properties ap
      WHERE ap.id = gsc_search_analytics.property_id
        AND has_project_access(ap.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analytics_properties ap
      WHERE ap.id = gsc_search_analytics.property_id
        AND has_project_access(ap.project_id)
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to gsc_search_analytics"
  ON public.gsc_search_analytics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- GA4_TRAFFIC_DATA (access through analytics_properties → projects)
-- ============================================================================

DROP POLICY IF EXISTS "ga4_data_project_access" ON public.ga4_traffic_data;

CREATE POLICY "ga4_data_project_access"
  ON public.ga4_traffic_data FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.analytics_properties ap
      WHERE ap.id = ga4_traffic_data.property_id
        AND has_project_access(ap.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analytics_properties ap
      WHERE ap.id = ga4_traffic_data.property_id
        AND has_project_access(ap.project_id)
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to ga4_traffic_data"
  ON public.ga4_traffic_data FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ANALYTICS_SYNC_LOGS (access through analytics_properties → projects)
-- ============================================================================

DROP POLICY IF EXISTS "analytics_sync_logs_read_own" ON public.analytics_sync_logs;
DROP POLICY IF EXISTS "analytics_sync_logs_insert_own" ON public.analytics_sync_logs;

CREATE POLICY "analytics_sync_logs_project_access"
  ON public.analytics_sync_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.analytics_properties ap
      WHERE ap.id = analytics_sync_logs.property_id
        AND has_project_access(ap.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analytics_properties ap
      WHERE ap.id = analytics_sync_logs.property_id
        AND has_project_access(ap.project_id)
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to analytics_sync_logs"
  ON public.analytics_sync_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
