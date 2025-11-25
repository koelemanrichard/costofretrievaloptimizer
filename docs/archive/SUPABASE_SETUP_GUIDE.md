
-- Supabase Setup Guide

This guide provides all the necessary SQL commands to set up your Supabase database for the Holistic SEO Workbench application. Run these commands in the Supabase SQL Editor.

**IMPORTANT:** This script is designed to be idempotent, meaning you can run it multiple times without causing errors. It will drop and recreate functions and policies and safely add missing columns to ensure your setup is always up-to-date.

---

### 1. Enable Required Extensions

Ensure the `pgsodium` extension is enabled for secure encryption of API keys.

```sql
-- Enable pgsodium for secret management
create extension if not exists "pgsodium" with schema "pgsodium";

-- Enable uuid-ossp for uuid generation
create extension if not exists "uuid-ossp" with schema "extensions";
```

---

### 2. Utility Functions (RPCs)

These functions are called from the frontend application to perform specific database operations.

```sql
-- Drop the function if it exists to handle parameter changes
DROP FUNCTION IF EXISTS public.check_table_exists(text, text);

-- Function to check if a table exists in a given schema
CREATE OR REPLACE FUNCTION public.check_table_exists(schema_name text, table_name_to_check text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = schema_name
    AND table_name = table_name_to_check
  );
END;
$$;


-- Drop the function if it exists to handle return type changes
DROP FUNCTION IF EXISTS public.create_new_project(jsonb);

-- Function to create a new project and associate it with the current user
CREATE OR REPLACE FUNCTION public.create_new_project(p_project_data jsonb)
RETURNS projects
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_project projects;
BEGIN
  INSERT INTO public.projects (user_id, project_name, domain)
  VALUES (
    auth.uid(),
    p_project_data->>'project_name',
    p_project_data->>'domain'
  )
  RETURNING * INTO new_project;
  
  RETURN new_project;
END;
$$;


-- Drop the function if it exists to handle return type changes
DROP FUNCTION IF EXISTS public.create_new_map(uuid, text);

-- Function to create a new topical map within a project
CREATE OR REPLACE FUNCTION public.create_new_map(p_project_id uuid, p_map_name text)
RETURNS topical_maps
LANGUAGE plpgsql
AS $$
DECLARE
  new_map topical_maps;
BEGIN
  INSERT INTO public.topical_maps (project_id, name, user_id)
  VALUES (p_project_id, p_map_name, auth.uid())
  RETURNING * INTO new_map;
  
  RETURN new_map;
END;
$$;

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.delete_topical_map(uuid);

-- Function to securely delete a topical map and all its related data
CREATE OR REPLACE FUNCTION public.delete_topical_map(p_map_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- The user_id check ensures only the owner can delete it,
    -- enforced by the RLS policy on the topical_maps table.
    DELETE FROM public.topical_maps WHERE id = p_map_id;
END;
$$;

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.delete_project(uuid);

-- Function to securely delete a project and all its related data
CREATE OR REPLACE FUNCTION public.delete_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- The user_id check ensures only the owner can delete it,
    -- enforced by the RLS policy on the projects table.
    DELETE FROM public.projects WHERE id = p_project_id;
END;
$$;

```

---

### 3. Database Tables & Data Migration

Create the tables and perform a safe data migration to add `user_id` to existing records.

```sql
-- Table to store user-specific settings and encrypted API keys
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    settings_data jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

-- Table for user projects
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_name text NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table for topical maps associated with projects
CREATE TABLE IF NOT EXISTS public.topical_maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    business_info jsonb,
    pillars jsonb,
    eavs jsonb,
    competitors text[],
    analysis_state jsonb
);

-- Table for individual topics within a map
CREATE TABLE IF NOT EXISTS public.topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    map_id uuid NOT NULL,
    parent_topic_id uuid,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    "type" text CHECK (type IN ('core', 'outer')) NOT NULL,
    freshness text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Table for content briefs associated with topics
CREATE TABLE IF NOT EXISTS public.content_briefs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    topic_id uuid NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    meta_description text,
    key_takeaways jsonb,
    article_draft text,
    outline text,
    serp_analysis jsonb,
    visuals jsonb,
    contextual_vectors jsonb,
    contextual_bridge jsonb,
    content_audit jsonb
);

-- --- SAFE DATA MIGRATION SCRIPT ---

-- Step 1: Add user_id columns as nullable if they don't exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.topical_maps ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.content_briefs ADD COLUMN IF NOT EXISTS user_id uuid;

-- Step 2: Backfill user_id for child tables from their parents
-- This must be run in order of dependency.

-- Backfill topical_maps from projects
UPDATE public.topical_maps tm
SET user_id = p.user_id
FROM public.projects p
WHERE tm.project_id = p.id AND tm.user_id IS NULL;

-- Backfill topics from topical_maps
UPDATE public.topics t
SET user_id = tm.user_id
FROM public.topical_maps tm
WHERE t.map_id = tm.id AND t.user_id IS NULL;

-- Backfill content_briefs from topics
UPDATE public.content_briefs cb
SET user_id = t.user_id
FROM public.topics t
WHERE cb.topic_id = t.id AND cb.user_id IS NULL;


-- Step 3: Now that data is populated, enforce NOT NULL constraints
ALTER TABLE public.projects ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.topical_maps ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.topics ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.content_briefs ALTER COLUMN user_id SET NOT NULL;


-- Step 4: Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Projects FK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_user_id_fkey' AND conrelid = 'public.projects'::regclass) THEN
        ALTER TABLE public.projects ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    -- Topical Maps FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topical_maps_project_id_fkey' AND conrelid = 'public.topical_maps'::regclass) THEN
        ALTER TABLE public.topical_maps ADD CONSTRAINT topical_maps_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topical_maps_user_id_fkey' AND conrelid = 'public.topical_maps'::regclass) THEN
        ALTER TABLE public.topical_maps ADD CONSTRAINT topical_maps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    -- Topics FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topics_map_id_fkey' AND conrelid = 'public.topics'::regclass) THEN
        ALTER TABLE public.topics ADD CONSTRAINT topics_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.topical_maps(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topics_parent_topic_id_fkey' AND conrelid = 'public.topics'::regclass) THEN
        ALTER TABLE public.topics ADD CONSTRAINT topics_parent_topic_id_fkey FOREIGN KEY (parent_topic_id) REFERENCES public.topics(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topics_user_id_fkey' AND conrelid = 'public.topics'::regclass) THEN
        ALTER TABLE public.topics ADD CONSTRAINT topics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    -- Content Briefs FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_briefs_topic_id_fkey' AND conrelid = 'public.content_briefs'::regclass) THEN
        ALTER TABLE public.content_briefs ADD CONSTRAINT content_briefs_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_briefs_user_id_fkey' AND conrelid = 'public.content_briefs'::regclass) THEN
        ALTER TABLE public.content_briefs ADD CONSTRAINT content_briefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END
$$;
