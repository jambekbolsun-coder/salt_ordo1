create function public.salt_crm_public_lead(p_data jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_product text;
begin
 if nullif(p_data->>'product_id','') is not null then
  select name_ru into v_product from public.products where id=(p_data->>'product_id')::uuid and status='published';
  if not found then raise exception 'Invalid product' using errcode='22023'; end if;
 end if;
 insert into public.leads(source,customer_name,phone,email,message,product_id,product_name,crm_attribution)
 values(p_data->>'source',p_data->>'p_customer_name',salt_crm.normalize_phone(p_data->>'p_phone'),nullif(p_data->>'email',''),p_data->>'message',nullif(p_data->>'product_id','')::uuid,v_product,coalesce(p_data->'attribution','{}')||jsonb_build_object('consent',p_data->'consent')) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.salt_crm_public_lead(jsonb) from public,anon,authenticated;
grant execute on function public.salt_crm_public_lead(jsonb) to service_role;
-- Existing public APIs remain available during rollout. Revoke their browser
-- grants with the separately documented cutover only after the new deployment
-- is verified; this avoids breaking a live checkout during deployment.
grant execute on function public.create_public_order(text,text,text,text,text,text,jsonb),public.start_public_quiz(uuid,uuid,text),public.save_public_quiz_answer(uuid,uuid,uuid,text,text),public.complete_public_quiz(uuid,uuid,uuid,text[]),public.dismiss_public_quiz(uuid,uuid,uuid),public.track_public_event(uuid,uuid,text,text,uuid,text,jsonb) to service_role;

-- Protect existing staff administration, including callers bypassing the UI.
create function salt_crm.guard_staff() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select auth.role())='service_role' then return new; end if;
 if not exists(select 1 from public.staff where user_id=(select auth.uid()) and is_active and role::text='owner') then raise exception 'Only owner can change staff' using errcode='42501'; end if;
 if old.role::text='owner' and (new.role<>old.role or not new.is_active or new.user_id<>old.user_id) then raise exception 'Owner access cannot be removed' using errcode='42501'; end if;
 if new.user_id<>old.user_id or new.email<>old.email then raise exception 'Identity cannot be changed' using errcode='42501'; end if;
 return new;
end $$;
create trigger salt_crm_staff_guard before update on public.staff for each row execute function salt_crm.guard_staff();
revoke all on function salt_crm.guard_staff() from public,anon,authenticated;
