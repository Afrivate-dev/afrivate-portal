-- AfriVate portal — add multi-assignee support to portal_tasks
-- Run in Supabase Dashboard → SQL Editor → New query
-- Run AFTER the original migration (20260518120000_portal_data_tables.sql)

-- Add assignee_ids as a jsonb array; backfill from the existing assignee_id column
alter table public.portal_tasks
  add column if not exists assignee_ids jsonb not null default '[]'::jsonb;

-- Backfill: if a row already has assignee_id set, seed assignee_ids from it
update public.portal_tasks
set assignee_ids = jsonb_build_array(assignee_id::text)
where assignee_id is not null
  and assignee_ids = '[]'::jsonb;
