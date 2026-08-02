-- Persist the actor and exact time of the latest transition to Done.
alter table public.portal_tasks
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid;

-- Preserve completion details for existing completed tasks where activity is available.
with latest_completion as (
  select
    task.id,
    completion.completed_at,
    completion.completed_by
  from public.portal_tasks as task
  cross join lateral (
    select
      (entry ->> 'at')::timestamptz as completed_at,
      case
        when entry ->> 'by' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (entry ->> 'by')::uuid
        else null
      end as completed_by
    from jsonb_array_elements(task.activity) as entry
    where entry ->> 'message' = 'Status → Done'
    order by (entry ->> 'at')::timestamptz desc
    limit 1
  ) as completion
  where task.status = 'done'
    and task.completed_at is null
)
update public.portal_tasks as task
set
  completed_at = latest_completion.completed_at,
  completed_by = latest_completion.completed_by
from latest_completion
where task.id = latest_completion.id;

comment on column public.portal_tasks.completed_at is
  'Exact time this task most recently transitioned to Done.';
comment on column public.portal_tasks.completed_by is
  'User who most recently transitioned this task to Done.';
