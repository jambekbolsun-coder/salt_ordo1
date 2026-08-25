-- One-time, race-safe owner bootstrap for a fresh installation.
create or replace function public.bootstrap_first_owner(p_full_name text)
returns public.staff
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_staff public.staff;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  perform pg_advisory_xact_lock(hashtext('salt-ordo-first-owner'));
  if exists(select 1 from public.staff) then raise exception 'Owner already configured'; end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then raise exception 'Email is required'; end if;

  insert into public.staff(user_id, email, full_name, role, created_by)
  values (
    v_user_id,
    v_email,
    coalesce(nullif(left(btrim(p_full_name), 100), ''), 'Владелец Salt Ordo'),
    'owner',
    v_user_id
  )
  returning * into v_staff;

  return v_staff;
end;
$$;

revoke execute on function public.bootstrap_first_owner(text) from public, anon;
grant execute on function public.bootstrap_first_owner(text) to authenticated;
