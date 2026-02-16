-- Deduplicate site_inventory rows that differ only by trailing slash.
-- Strategy: merge data into the non-trailing-slash version, delete the other.

-- Step 1: Update the non-slash row with any data it's missing from the slash row
UPDATE public.site_inventory AS keep
SET
  gsc_clicks       = COALESCE(keep.gsc_clicks, dup.gsc_clicks),
  gsc_impressions  = COALESCE(keep.gsc_impressions, dup.gsc_impressions),
  gsc_position     = COALESCE(keep.gsc_position, dup.gsc_position),
  gsc_top_queries  = COALESCE(keep.gsc_top_queries, dup.gsc_top_queries),
  index_status     = COALESCE(keep.index_status, dup.index_status),
  audit_score      = COALESCE(keep.audit_score, dup.audit_score),
  audit_snapshot_id = COALESCE(keep.audit_snapshot_id, dup.audit_snapshot_id),
  last_audited_at  = COALESCE(keep.last_audited_at, dup.last_audited_at),
  page_title       = COALESCE(keep.page_title, dup.page_title),
  page_h1          = COALESCE(keep.page_h1, dup.page_h1),
  meta_description = COALESCE(keep.meta_description, dup.meta_description),
  word_count       = COALESCE(keep.word_count, dup.word_count),
  dom_size         = COALESCE(keep.dom_size, dup.dom_size),
  updated_at       = NOW()
FROM public.site_inventory AS dup
WHERE keep.project_id = dup.project_id
  AND keep.url = RTRIM(dup.url, '/')
  AND dup.url LIKE '%/'
  AND LENGTH(dup.url) > 1
  AND keep.url != dup.url;

-- Step 2: If only the slash version exists, rename it to remove trailing slash
UPDATE public.site_inventory AS si
SET url = RTRIM(si.url, '/'),
    updated_at = NOW()
WHERE si.url LIKE '%/'
  AND LENGTH(si.url) > 1
  AND NOT EXISTS (
    SELECT 1 FROM public.site_inventory AS other
    WHERE other.project_id = si.project_id
      AND other.url = RTRIM(si.url, '/')
  );

-- Step 3: Delete the trailing-slash duplicates (non-slash version was kept in Step 1)
DELETE FROM public.site_inventory AS dup
WHERE dup.url LIKE '%/'
  AND LENGTH(dup.url) > 1
  AND EXISTS (
    SELECT 1 FROM public.site_inventory AS keep
    WHERE keep.project_id = dup.project_id
      AND keep.url = RTRIM(dup.url, '/')
  );

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
