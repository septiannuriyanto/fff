-- Update check constraint for battery_documentation_reports
alter table public.battery_documentation_reports 
drop constraint if exists battery_documentation_reports_approval_status_check;

alter table public.battery_documentation_reports
add constraint battery_documentation_reports_approval_status_check
check (approval_status in ('pending', 'approved', 'rejected', 'resubmitted'));
