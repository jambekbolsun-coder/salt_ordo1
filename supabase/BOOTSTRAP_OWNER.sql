-- ONE-TIME SETUP AFTER CREATING THE FIRST USER IN SUPABASE AUTH > USERS.
-- Replace both values, run once, then delete this local helper if desired.
insert into public.staff (user_id, email, full_name, role)
select id, email, 'Salt Ordo Owner', 'owner'::public.staff_role
from auth.users
where email = 'OWNER_EMAIL_HERE'
on conflict (user_id) do update set role = 'owner', is_active = true;
