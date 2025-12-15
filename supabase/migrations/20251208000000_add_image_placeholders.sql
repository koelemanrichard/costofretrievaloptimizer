-- Add image placeholders column to content_generation_jobs
-- This migration adds support for tracking image generation placeholders
-- that are created during Pass 4 (Visual Semantics) of content generation

ALTER TABLE content_generation_jobs
ADD COLUMN IF NOT EXISTS image_placeholders JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN content_generation_jobs.image_placeholders IS 'Array of ImagePlaceholder objects for image generation tracking. Each placeholder contains id, type, position, description, altTextSuggestion, status, generatedUrl, userUploadUrl, specs, and metadata.';

-- Create index for querying jobs with pending image placeholders
CREATE INDEX IF NOT EXISTS idx_content_generation_jobs_image_placeholders
ON content_generation_jobs
USING gin (image_placeholders);
