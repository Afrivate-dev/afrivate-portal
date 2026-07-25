-- Allow HR/admin to permanently remove leave requests (and cascaded comments).
drop policy if exists "leave: hr/admin delete" on public.portal_leave_requests;
create policy "leave: hr/admin delete"
  on public.portal_leave_requests
  for delete
  to authenticated
  using (public.is_hr_or_admin());
