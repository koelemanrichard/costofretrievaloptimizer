-- Add structural_analysis column to site_analysis_pages
-- Stores rich HTML structural analysis: heading tree, content regions,
-- entity prominence, schema markup, DOM metrics.
-- Computed by the html-structure-analyzer edge function.

ALTER TABLE site_analysis_pages
ADD COLUMN IF NOT EXISTS structural_analysis JSONB DEFAULT NULL;

COMMENT ON COLUMN site_analysis_pages.structural_analysis IS
  'Rich HTML structural analysis: heading tree, content regions, entity prominence, schema markup. Computed by html-structure-analyzer edge function.';

-- Index for queries that check if structural analysis exists
CREATE INDEX IF NOT EXISTS idx_site_analysis_pages_has_structural
  ON site_analysis_pages ((structural_analysis IS NOT NULL));
