-- ===========================================
-- HELP DOCUMENTATION SYSTEM
-- Migration: 20251214000000_help_documentation.sql
-- ===========================================

-- ===========================================
-- HELP CATEGORIES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.help_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for sorting
CREATE INDEX IF NOT EXISTS idx_help_categories_sort ON public.help_categories(sort_order);

-- ===========================================
-- HELP ARTICLES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.help_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  parent_article_id UUID REFERENCES public.help_articles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  feature_keys TEXT[] DEFAULT '{}',
  search_keywords TEXT[],
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  search_vector tsvector,
  UNIQUE(category_id, slug)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON public.help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_status ON public.help_articles(status);
CREATE INDEX IF NOT EXISTS idx_help_articles_sort ON public.help_articles(sort_order);
CREATE INDEX IF NOT EXISTS idx_help_articles_feature_keys ON public.help_articles USING GIN(feature_keys);

-- ===========================================
-- VERSION HISTORY TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.help_article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_help_article_versions_article ON public.help_article_versions(article_id);

-- ===========================================
-- SCREENSHOTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.help_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'help-screenshots',
  filename TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  caption TEXT,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_screenshots_article ON public.help_screenshots(article_id);

-- ===========================================
-- FULL-TEXT SEARCH TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION help_articles_search_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.search_keywords, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS help_articles_search_update ON public.help_articles;
CREATE TRIGGER help_articles_search_update
  BEFORE INSERT OR UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION help_articles_search_trigger();

CREATE INDEX IF NOT EXISTS idx_help_articles_search ON public.help_articles USING GIN(search_vector);

-- ===========================================
-- AUTO-VERSION ON UPDATE TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION create_help_article_version()
RETURNS TRIGGER AS $$
DECLARE v_version_number INTEGER;
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
    FROM public.help_article_versions WHERE article_id = OLD.id;

    INSERT INTO public.help_article_versions (article_id, title, content, version_number, created_by)
    VALUES (OLD.id, OLD.title, OLD.content, v_version_number, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS help_articles_version_trigger ON public.help_articles;
CREATE TRIGGER help_articles_version_trigger
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION create_help_article_version();

-- ===========================================
-- SEARCH FUNCTION
-- ===========================================
CREATE OR REPLACE FUNCTION search_help_articles(search_query TEXT, result_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  category_id UUID,
  title TEXT,
  summary TEXT,
  slug TEXT,
  category_slug TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.category_id,
    a.title,
    a.summary,
    a.slug,
    c.slug as category_slug,
    ts_rank(a.search_vector, websearch_to_tsquery('english', search_query)) as rank
  FROM public.help_articles a
  JOIN public.help_categories c ON a.category_id = c.id
  WHERE a.status = 'published'
    AND c.is_published = true
    AND a.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_screenshots ENABLE ROW LEVEL SECURITY;

-- Public read for published content (anyone can view help)
DROP POLICY IF EXISTS "Anyone can view published categories" ON public.help_categories;
CREATE POLICY "Anyone can view published categories"
  ON public.help_categories FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Anyone can view published articles" ON public.help_articles;
CREATE POLICY "Anyone can view published articles"
  ON public.help_articles FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Anyone can view screenshots of published articles" ON public.help_screenshots;
CREATE POLICY "Anyone can view screenshots of published articles"
  ON public.help_screenshots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.help_articles
    WHERE id = help_screenshots.article_id AND status = 'published'
  ));

-- Authenticated users can view version history of published articles
DROP POLICY IF EXISTS "Authenticated users can view versions" ON public.help_article_versions;
CREATE POLICY "Authenticated users can view versions"
  ON public.help_article_versions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.help_articles
    WHERE id = help_article_versions.article_id AND status = 'published'
  ));

-- Admin write policies (using service role or specific admin check)
-- These will be handled via Edge Function with service role key

-- ===========================================
-- UPDATED_AT TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION update_help_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS help_categories_updated_at ON public.help_categories;
CREATE TRIGGER help_categories_updated_at
  BEFORE UPDATE ON public.help_categories
  FOR EACH ROW EXECUTE FUNCTION update_help_updated_at();

DROP TRIGGER IF EXISTS help_articles_updated_at ON public.help_articles;
CREATE TRIGGER help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION update_help_updated_at();

DROP TRIGGER IF EXISTS help_screenshots_updated_at ON public.help_screenshots;
CREATE TRIGGER help_screenshots_updated_at
  BEFORE UPDATE ON public.help_screenshots
  FOR EACH ROW EXECUTE FUNCTION update_help_updated_at();

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Get article with category info
CREATE OR REPLACE FUNCTION get_help_article_by_slug(
  p_category_slug TEXT,
  p_article_slug TEXT
)
RETURNS TABLE (
  id UUID,
  category_id UUID,
  category_name TEXT,
  category_slug TEXT,
  title TEXT,
  slug TEXT,
  summary TEXT,
  content TEXT,
  feature_keys TEXT[],
  published_at TIMESTAMPTZ,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.category_id,
    c.name as category_name,
    c.slug as category_slug,
    a.title,
    a.slug,
    a.summary,
    a.content,
    a.feature_keys,
    a.published_at,
    a.metadata
  FROM public.help_articles a
  JOIN public.help_categories c ON a.category_id = c.id
  WHERE c.slug = p_category_slug
    AND a.slug = p_article_slug
    AND a.status = 'published'
    AND c.is_published = true;
END;
$$ LANGUAGE plpgsql;

-- Get article by feature key
CREATE OR REPLACE FUNCTION get_help_article_by_feature_key(p_feature_key TEXT)
RETURNS TABLE (
  id UUID,
  category_slug TEXT,
  article_slug TEXT,
  title TEXT,
  summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    c.slug as category_slug,
    a.slug as article_slug,
    a.title,
    a.summary
  FROM public.help_articles a
  JOIN public.help_categories c ON a.category_id = c.id
  WHERE p_feature_key = ANY(a.feature_keys)
    AND a.status = 'published'
    AND c.is_published = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get related articles (same category or shared feature keys)
CREATE OR REPLACE FUNCTION get_related_help_articles(
  p_article_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  category_slug TEXT,
  article_slug TEXT,
  title TEXT,
  summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH current_article AS (
    SELECT category_id, feature_keys FROM public.help_articles WHERE id = p_article_id
  )
  SELECT DISTINCT
    a.id,
    c.slug as category_slug,
    a.slug as article_slug,
    a.title,
    a.summary
  FROM public.help_articles a
  JOIN public.help_categories c ON a.category_id = c.id
  CROSS JOIN current_article ca
  WHERE a.id != p_article_id
    AND a.status = 'published'
    AND c.is_published = true
    AND (
      a.category_id = ca.category_id
      OR a.feature_keys && ca.feature_keys
    )
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
