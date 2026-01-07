-- ============================================================================
-- Gamification: Score History Table
-- ============================================================================
-- Tracks semantic authority score snapshots over time for:
-- - Progress visualization
-- - Trend analysis
-- - Achievement tracking
-- ============================================================================

-- Create score_history table
CREATE TABLE IF NOT EXISTS score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Overall score
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    tier_id TEXT NOT NULL, -- e.g., 'just-starting', 'absolute-unit'

    -- Sub-scores (stored for historical analysis)
    entity_clarity_score INTEGER NOT NULL CHECK (entity_clarity_score >= 0 AND entity_clarity_score <= 100),
    topical_coverage_score INTEGER NOT NULL CHECK (topical_coverage_score >= 0 AND topical_coverage_score <= 100),
    intent_alignment_score INTEGER NOT NULL CHECK (intent_alignment_score >= 0 AND intent_alignment_score <= 100),
    competitive_parity_score INTEGER NOT NULL CHECK (competitive_parity_score >= 0 AND competitive_parity_score <= 100),
    content_readiness_score INTEGER NOT NULL CHECK (content_readiness_score >= 0 AND content_readiness_score <= 100),

    -- Metadata at time of snapshot
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Example metadata:
    -- {
    --   "eavCount": 15,
    --   "topicCount": 42,
    --   "pillarCount": 5,
    --   "briefCount": 20,
    --   "competitorCount": 3
    -- }

    -- What triggered this snapshot
    trigger TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'auto', 'eav_added', 'topic_added', 'brief_completed', etc.

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries by map
CREATE INDEX IF NOT EXISTS idx_score_history_map_id ON score_history(map_id);

-- Index for efficient queries by user
CREATE INDEX IF NOT EXISTS idx_score_history_user_id ON score_history(user_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_score_history_created_at ON score_history(created_at DESC);

-- Composite index for common query pattern (map + time)
CREATE INDEX IF NOT EXISTS idx_score_history_map_created ON score_history(map_id, created_at DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own score history
CREATE POLICY "Users can view own score history"
    ON score_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own score history
CREATE POLICY "Users can insert own score history"
    ON score_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own score history (for cleanup)
CREATE POLICY "Users can delete own score history"
    ON score_history
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get latest score for a map
CREATE OR REPLACE FUNCTION get_latest_score(p_map_id UUID)
RETURNS TABLE (
    overall_score INTEGER,
    tier_id TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sh.overall_score,
        sh.tier_id,
        sh.created_at
    FROM score_history sh
    WHERE sh.map_id = p_map_id
    ORDER BY sh.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get score trend for a map (last N entries)
CREATE OR REPLACE FUNCTION get_score_trend(p_map_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    overall_score INTEGER,
    tier_id TEXT,
    trigger TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sh.overall_score,
        sh.tier_id,
        sh.trigger,
        sh.created_at
    FROM score_history sh
    WHERE sh.map_id = p_map_id
    ORDER BY sh.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate score delta (current vs previous)
CREATE OR REPLACE FUNCTION get_score_delta(p_map_id UUID)
RETURNS TABLE (
    current_score INTEGER,
    previous_score INTEGER,
    delta INTEGER,
    current_tier TEXT,
    previous_tier TEXT,
    tier_changed BOOLEAN
) AS $$
DECLARE
    v_current RECORD;
    v_previous RECORD;
BEGIN
    -- Get current score
    SELECT sh.overall_score, sh.tier_id INTO v_current
    FROM score_history sh
    WHERE sh.map_id = p_map_id
    ORDER BY sh.created_at DESC
    LIMIT 1;

    -- Get previous score
    SELECT sh.overall_score, sh.tier_id INTO v_previous
    FROM score_history sh
    WHERE sh.map_id = p_map_id
    ORDER BY sh.created_at DESC
    LIMIT 1 OFFSET 1;

    -- Return results
    RETURN QUERY
    SELECT
        COALESCE(v_current.overall_score, 0)::INTEGER,
        COALESCE(v_previous.overall_score, 0)::INTEGER,
        (COALESCE(v_current.overall_score, 0) - COALESCE(v_previous.overall_score, 0))::INTEGER,
        COALESCE(v_current.tier_id, 'just-starting')::TEXT,
        COALESCE(v_previous.tier_id, 'just-starting')::TEXT,
        (v_current.tier_id IS DISTINCT FROM v_previous.tier_id)::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Achievements Table (for future use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    map_id UUID REFERENCES topical_maps(id) ON DELETE CASCADE, -- NULL for user-level achievements

    achievement_type TEXT NOT NULL, -- e.g., 'first_map', 'tier_up', 'perfect_score', etc.
    achievement_data JSONB DEFAULT '{}'::jsonb, -- Additional context

    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user achievements
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);

-- Index for map achievements
CREATE INDEX IF NOT EXISTS idx_achievements_map_id ON achievements(map_id);

-- Unique constraint to prevent duplicate achievements
CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_unique
    ON achievements(user_id, map_id, achievement_type)
    WHERE map_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_unique_user_only
    ON achievements(user_id, achievement_type)
    WHERE map_id IS NULL;

-- RLS for achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
    ON achievements
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
    ON achievements
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE score_history IS 'Tracks semantic authority score snapshots over time for progress visualization';
COMMENT ON COLUMN score_history.tier_id IS 'Score tier identifier (just-starting, building-momentum, getting-serious, looking-sharp, almost-elite, absolute-unit)';
COMMENT ON COLUMN score_history.trigger IS 'What action triggered this score snapshot (manual, auto, eav_added, topic_added, brief_completed)';
COMMENT ON TABLE achievements IS 'Stores unlocked achievements for gamification features';
