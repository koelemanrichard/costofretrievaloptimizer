-- Per-page aggregated GSC metrics with date-range filtering
-- Returns: total clicks, impressions, avg position, CTR, top queries, click trend sparkline data

CREATE OR REPLACE FUNCTION public.get_gsc_page_metrics(
  p_property_id uuid,
  p_start_date date DEFAULT (CURRENT_DATE - interval '90 days')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  page text,
  total_clicks bigint,
  total_impressions bigint,
  avg_position numeric,
  avg_ctr numeric,
  top_queries jsonb,
  click_trend jsonb,
  first_seen date,
  last_seen date
) AS $$
BEGIN
  RETURN QUERY
  WITH page_stats AS (
    SELECT
      gsa.page AS page_url,
      SUM(gsa.clicks)::bigint AS total_clicks,
      SUM(gsa.impressions)::bigint AS total_impressions,
      ROUND(AVG(gsa.position)::numeric, 1) AS avg_position,
      CASE
        WHEN SUM(gsa.impressions) > 0
        THEN ROUND((SUM(gsa.clicks)::numeric / SUM(gsa.impressions)::numeric), 4)
        ELSE 0
      END AS avg_ctr,
      MIN(gsa.date) AS first_seen,
      MAX(gsa.date) AS last_seen
    FROM gsc_search_analytics gsa
    WHERE gsa.property_id = p_property_id
      AND gsa.date BETWEEN p_start_date AND p_end_date
    GROUP BY gsa.page
  ),
  ranked_queries AS (
    SELECT
      gsa.page AS page_url,
      gsa.query,
      SUM(gsa.clicks) AS query_clicks,
      SUM(gsa.impressions) AS query_impressions,
      ROUND(AVG(gsa.position)::numeric, 1) AS query_position,
      ROW_NUMBER() OVER (PARTITION BY gsa.page ORDER BY SUM(gsa.clicks) DESC) AS rn
    FROM gsc_search_analytics gsa
    WHERE gsa.property_id = p_property_id
      AND gsa.date BETWEEN p_start_date AND p_end_date
    GROUP BY gsa.page, gsa.query
  ),
  top_queries_per_page AS (
    SELECT
      rq.page_url,
      jsonb_agg(
        jsonb_build_object(
          'query', rq.query,
          'clicks', rq.query_clicks,
          'impressions', rq.query_impressions,
          'position', rq.query_position
        )
        ORDER BY rq.query_clicks DESC
      ) AS top_queries
    FROM ranked_queries rq
    WHERE rq.rn <= 10
    GROUP BY rq.page_url
  ),
  daily_clicks AS (
    SELECT
      gsa.page AS page_url,
      gsa.date AS click_date,
      SUM(gsa.clicks) AS day_clicks
    FROM gsc_search_analytics gsa
    WHERE gsa.property_id = p_property_id
      AND gsa.date BETWEEN p_start_date AND p_end_date
    GROUP BY gsa.page, gsa.date
  ),
  click_trends AS (
    SELECT
      dc.page_url,
      jsonb_agg(
        jsonb_build_object('date', dc.click_date, 'clicks', dc.day_clicks)
        ORDER BY dc.click_date
      ) AS click_trend
    FROM daily_clicks dc
    GROUP BY dc.page_url
  )
  SELECT
    ps.page_url,
    ps.total_clicks,
    ps.total_impressions,
    ps.avg_position,
    ps.avg_ctr,
    COALESCE(tq.top_queries, '[]'::jsonb),
    COALESCE(ct.click_trend, '[]'::jsonb),
    ps.first_seen,
    ps.last_seen
  FROM page_stats ps
  LEFT JOIN top_queries_per_page tq ON tq.page_url = ps.page_url
  LEFT JOIN click_trends ct ON ct.page_url = ps.page_url
  ORDER BY ps.total_clicks DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_gsc_page_metrics(uuid, date, date) TO authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
