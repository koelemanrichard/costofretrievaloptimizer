-- Product Catalog System Migration
-- Created: 2026-02-10
-- Purpose: Add tables for ecommerce product catalog, categories, products, and assignments.
-- Enables category page content generation grounded in real product data.

-- ============================================================================
-- PRODUCT CATALOGS TABLE (Container per topical map)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL DEFAULT 'Product Catalog',
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'csv_import', 'url_scrape')),
    source_url TEXT,

    -- Denormalized counts
    product_count INTEGER NOT NULL DEFAULT 0,
    category_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One catalog per map
    CONSTRAINT product_catalogs_map_unique UNIQUE (map_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_catalogs_map ON product_catalogs(map_id);
CREATE INDEX IF NOT EXISTS idx_product_catalogs_user ON product_catalogs(user_id);

-- ============================================================================
-- CATALOG CATEGORIES TABLE (Store categories linked to topics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES product_catalogs(id) ON DELETE CASCADE,
    parent_category_id UUID REFERENCES catalog_categories(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    store_url TEXT,
    image_url TEXT,

    -- Link to topical map topic
    linked_topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,

    -- Modifiers applicable to this category
    applicable_modifiers JSONB DEFAULT '[]',

    -- Denormalized count
    product_count INTEGER NOT NULL DEFAULT 0,

    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discontinued')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_catalog_categories_catalog ON catalog_categories(catalog_id);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_parent ON catalog_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_linked_topic ON catalog_categories(linked_topic_id);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_status ON catalog_categories(status);

-- ============================================================================
-- CATALOG PRODUCTS TABLE (Individual products)
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES product_catalogs(id) ON DELETE CASCADE,

    -- Required field (only required field for sketch mode)
    name TEXT NOT NULL,

    -- Optional fields
    sku TEXT,
    brand TEXT,
    short_description TEXT,

    -- Pricing
    price NUMERIC(10,2),
    currency TEXT DEFAULT 'USD',
    sale_price NUMERIC(10,2),

    -- URLs & images
    product_url TEXT,
    image_url TEXT,
    additional_images JSONB DEFAULT '[]',

    -- Availability
    availability TEXT DEFAULT 'InStock' CHECK (availability IN ('InStock', 'OutOfStock', 'PreOrder')),

    -- Flexible attributes (color, size, material, etc.)
    attributes JSONB DEFAULT '{}',

    -- Reviews
    rating_value NUMERIC(2,1),
    review_count INTEGER DEFAULT 0,

    -- Tags
    tags JSONB DEFAULT '[]',

    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discontinued')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_catalog_products_catalog ON catalog_products(catalog_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_sku ON catalog_products(sku);
CREATE INDEX IF NOT EXISTS idx_catalog_products_brand ON catalog_products(brand);
CREATE INDEX IF NOT EXISTS idx_catalog_products_status ON catalog_products(status);
CREATE INDEX IF NOT EXISTS idx_catalog_products_availability ON catalog_products(availability);

-- ============================================================================
-- PRODUCT CATEGORY ASSIGNMENTS TABLE (Many-to-many join)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_category_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES catalog_categories(id) ON DELETE CASCADE,

    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,

    CONSTRAINT product_category_unique UNIQUE (product_id, category_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pca_product ON product_category_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_pca_category ON product_category_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_pca_primary ON product_category_assignments(is_primary) WHERE is_primary = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE product_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_category_assignments ENABLE ROW LEVEL SECURITY;

-- Product Catalogs policies
DROP POLICY IF EXISTS "Users can view own catalogs" ON product_catalogs;
CREATE POLICY "Users can view own catalogs"
ON product_catalogs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own catalogs" ON product_catalogs;
CREATE POLICY "Users can insert own catalogs"
ON product_catalogs FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own catalogs" ON product_catalogs;
CREATE POLICY "Users can update own catalogs"
ON product_catalogs FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own catalogs" ON product_catalogs;
CREATE POLICY "Users can delete own catalogs"
ON product_catalogs FOR DELETE
USING (auth.uid() = user_id);

-- Catalog Categories policies (via catalog ownership)
DROP POLICY IF EXISTS "Users can view own categories" ON catalog_categories;
CREATE POLICY "Users can view own categories"
ON catalog_categories FOR SELECT
USING (EXISTS (
    SELECT 1 FROM product_catalogs WHERE product_catalogs.id = catalog_categories.catalog_id AND product_catalogs.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert own categories" ON catalog_categories;
CREATE POLICY "Users can insert own categories"
ON catalog_categories FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM product_catalogs WHERE product_catalogs.id = catalog_categories.catalog_id AND product_catalogs.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update own categories" ON catalog_categories;
CREATE POLICY "Users can update own categories"
ON catalog_categories FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM product_catalogs WHERE product_catalogs.id = catalog_categories.catalog_id AND product_catalogs.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete own categories" ON catalog_categories;
CREATE POLICY "Users can delete own categories"
ON catalog_categories FOR DELETE
USING (EXISTS (
    SELECT 1 FROM product_catalogs WHERE product_catalogs.id = catalog_categories.catalog_id AND product_catalogs.user_id = auth.uid()
));

-- Catalog Products policies (via catalog ownership)
DROP POLICY IF EXISTS "Users can view own products" ON catalog_products;
CREATE POLICY "Users can view own products"
ON catalog_products FOR SELECT
USING (EXISTS (
    SELECT 1 FROM product_catalogs WHERE product_catalogs.id = catalog_products.catalog_id AND product_catalogs.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert own products" ON catalog_products;
CREATE POLICY "Users can insert own products"
ON catalog_products FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM product_catalogs WHERE product_catalogs.id = catalog_products.catalog_id AND product_catalogs.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update own products" ON catalog_products;
CREATE POLICY "Users can update own products"
ON catalog_products FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM product_catalogs WHERE product_catalogs.id = catalog_products.catalog_id AND product_catalogs.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete own products" ON catalog_products;
CREATE POLICY "Users can delete own products"
ON catalog_products FOR DELETE
USING (EXISTS (
    SELECT 1 FROM product_catalogs WHERE product_catalogs.id = catalog_products.catalog_id AND product_catalogs.user_id = auth.uid()
));

-- Product Category Assignments policies (via product catalog ownership)
DROP POLICY IF EXISTS "Users can view own assignments" ON product_category_assignments;
CREATE POLICY "Users can view own assignments"
ON product_category_assignments FOR SELECT
USING (EXISTS (
    SELECT 1 FROM catalog_products
    JOIN product_catalogs ON product_catalogs.id = catalog_products.catalog_id
    WHERE catalog_products.id = product_category_assignments.product_id
    AND product_catalogs.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert own assignments" ON product_category_assignments;
CREATE POLICY "Users can insert own assignments"
ON product_category_assignments FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM catalog_products
    JOIN product_catalogs ON product_catalogs.id = catalog_products.catalog_id
    WHERE catalog_products.id = product_category_assignments.product_id
    AND product_catalogs.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update own assignments" ON product_category_assignments;
CREATE POLICY "Users can update own assignments"
ON product_category_assignments FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM catalog_products
    JOIN product_catalogs ON product_catalogs.id = catalog_products.catalog_id
    WHERE catalog_products.id = product_category_assignments.product_id
    AND product_catalogs.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete own assignments" ON product_category_assignments;
CREATE POLICY "Users can delete own assignments"
ON product_category_assignments FOR DELETE
USING (EXISTS (
    SELECT 1 FROM catalog_products
    JOIN product_catalogs ON product_catalogs.id = catalog_products.catalog_id
    WHERE catalog_products.id = product_category_assignments.product_id
    AND product_catalogs.user_id = auth.uid()
));

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_catalogs_updated_at ON product_catalogs;
CREATE TRIGGER product_catalogs_updated_at
    BEFORE UPDATE ON product_catalogs
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

DROP TRIGGER IF EXISTS catalog_categories_updated_at ON catalog_categories;
CREATE TRIGGER catalog_categories_updated_at
    BEFORE UPDATE ON catalog_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

DROP TRIGGER IF EXISTS catalog_products_updated_at ON catalog_products;
CREATE TRIGGER catalog_products_updated_at
    BEFORE UPDATE ON catalog_products
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE product_catalogs IS 'Product catalog container per topical map for ecommerce category page generation';
COMMENT ON TABLE catalog_categories IS 'Store categories that link to topical map topics for category page content';
COMMENT ON TABLE catalog_products IS 'Individual products with flexible attributes for content grounding';
COMMENT ON TABLE product_category_assignments IS 'Many-to-many relationship between products and categories';

COMMENT ON COLUMN catalog_products.attributes IS 'Flexible key-value attributes (color, size, material, etc.) stored as JSONB';
COMMENT ON COLUMN catalog_categories.linked_topic_id IS 'Links this store category to a topic in the topical map';
COMMENT ON COLUMN catalog_categories.applicable_modifiers IS 'Semantic modifiers applicable to this category (season, material, etc.)';
