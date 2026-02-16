-- Add cross-page link graph columns to site_inventory
-- inbound_link_count: number of pages in the inventory that link TO this page
-- internal_link_targets: array of URLs this page links to (within the site)

ALTER TABLE public.site_inventory
  ADD COLUMN IF NOT EXISTS inbound_link_count int,
  ADD COLUMN IF NOT EXISTS internal_link_targets jsonb;
