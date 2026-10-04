-- Check the caller's verified factors; never return factor secrets or arbitrary users.
create function salt_crm.mfa_satisfied() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal'='aal2',false) or not exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status::text='verified');
$$;
revoke all on function salt_crm.mfa_satisfied() from public,anon,authenticated;
create or replace function public.current_staff_role() returns public.staff_role language sql stable security definer set search_path='' as $$
 select s.role from public.staff s where s.user_id=auth.uid() and s.is_active and salt_crm.mfa_satisfied() limit 1;
$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff s where s.user_id=auth.uid() and s.is_active) and salt_crm.mfa_satisfied();
$$;
-- An AAL1 caller needs only their own staff identity to reach the MFA challenge.
alter policy staff_read_staff on public.staff using (user_id=(select auth.uid()) or public.is_staff());
