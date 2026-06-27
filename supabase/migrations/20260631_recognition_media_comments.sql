-- Shout-outs: attachments + comments. Safe to re-run.

alter table public.portal_recognition_posts
  add column if not exists media jsonb not null default '[]'::jsonb;

create table if not exists public.portal_recognition_comments (
  id              text primary key,
  recognition_id  text not null references public.portal_recognition_posts (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists portal_recognition_comments_recognition_id_idx
  on public.portal_recognition_comments (recognition_id, created_at);

alter table public.portal_recognition_comments enable row level security;

drop policy if exists "recognition_comments: read authenticated" on public.portal_recognition_comments;
create policy "recognition_comments: read authenticated"
  on public.portal_recognition_comments for select to authenticated
  using (auth.uid() is not null);

drop policy if exists "recognition_comments: insert authenticated" on public.portal_recognition_comments;
create policy "recognition_comments: insert authenticated"
  on public.portal_recognition_comments for insert to authenticated
  with check (user_id = auth.uid());

revoke all on public.portal_recognition_comments from anon;
grant select, insert on public.portal_recognition_comments to authenticated;

-- Non-givers may only update reacted_by (not media/message)
create or replace function public.guard_recognition_post_update()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $fn$
begin
  if public.is_hr_or_admin() or old.giver_id = auth.uid() then
    return new;
  end if;
  if old.message is distinct from new.message
    or old.giver_id is distinct from new.giver_id
    or old.receiver_id is distinct from new.receiver_id
    or old.tag is distinct from new.tag
    or old.created_at is distinct from new.created_at
    or old.media is distinct from new.media
  then
    raise exception 'Only reaction data can be updated on recognition posts';
  end if;
  return new;
end;
$fn$;

do $do$
begin
  if to_regclass('public.portal_recognition_comments') is not null then
    begin
      alter publication supabase_realtime add table public.portal_recognition_comments;
    exception when duplicate_object then null;
    end;
  end if;
end $do$;
