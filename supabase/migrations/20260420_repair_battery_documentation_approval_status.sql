-- Repair approval status drift for battery documentation reports.
-- This is safe to run on environments where the original table/function
-- already exists but the status constraint/default no longer match the app.

update public.battery_documentation_reports
set approval_status = 'pending'
where approval_status is null
   or approval_status not in ('pending', 'approved', 'rejected', 'resubmitted');

alter table public.battery_documentation_reports
  alter column approval_status set default 'pending';

alter table public.battery_documentation_reports
  drop constraint if exists battery_documentation_reports_approval_status_check;

alter table public.battery_documentation_reports
  add constraint battery_documentation_reports_approval_status_check
  check (approval_status in ('pending', 'approved', 'rejected', 'resubmitted'));
