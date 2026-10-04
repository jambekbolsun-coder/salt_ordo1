create or replace function public.salt_crm_rate_limit(p_key text,p_limit integer,p_seconds integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare times timestamptz[]; n timestamptz:=clock_timestamp(); retry integer;
begin
 if p_limit not between 1 and 1000 or p_seconds not between 1 and 3600 or length(p_key)>180 then raise exception 'Invalid limit' using errcode='22023'; end if;
 insert into salt_crm.rate_limits(key) values(p_key) on conflict do nothing;
 select hits into times from salt_crm.rate_limits where key=p_key for update;
 n:=clock_timestamp();
 select coalesce(array_agg(h order by h),'{}') into times from unnest(times) h where h>n-make_interval(secs=>p_seconds);
 if cardinality(times)>=p_limit then
  retry:=greatest(1,ceil(extract(epoch from times[1]+make_interval(secs=>p_seconds)-n))::integer);
  return jsonb_build_object('allowed',false,'retry_after',retry);
 end if;
 update salt_crm.rate_limits set hits=array_append(times,n),updated_at=n where key=p_key;
 -- Bounded opportunistic expiry, containing only non-identifying keyed hashes.
 delete from salt_crm.rate_limits where key in (select key from salt_crm.rate_limits where updated_at<n-interval '2 hours' limit 50);
 return jsonb_build_object('allowed',true);
end $$;

create or replace function public.salt_crm_api(p_operation text,p_payload jsonb,p_actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare actor public.staff; c salt_crm.clients; before_row jsonb; result jsonb; v_id uuid;
begin
 select * into actor from public.staff where user_id=p_actor and is_active;
 if not found or actor.role::text not in ('owner','admin') then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_operation='options' then
  return jsonb_build_object('sources',(select jsonb_agg(s order by s.name) from salt_crm.sources s),
   'staff',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'full_name',full_name)),'[]') from public.staff where is_active),
   'regions',(select coalesce(jsonb_agg(x.region),'[]') from (select distinct region from salt_crm.clients where region<>'' order by region limit 200) x),
   'campaigns',(select coalesce(jsonb_agg(x.campaign),'[]') from (select distinct campaign from salt_crm.clients where campaign<>'' order by campaign limit 200) x),
   'settings',(select to_jsonb(s) from salt_crm.settings s), 'import_issues',(select count(*) from salt_crm.import_issues));
 elsif p_operation='list' then
  return jsonb_build_object('total',(select count(*) from salt_crm.filtered(p_payload)), 'items',coalesce((
   select jsonb_agg(r) from (select item.*,coalesce((select sum(amount) from salt_crm.sales where client_id=item.id and voided_at is null),0) as sale_total,
    (select count(*) from salt_crm.inquiries where client_id=item.id) as inquiry_count,
    (select full_name from public.staff where id=item.responsible_id) as responsible_name
    from salt_crm.filtered(p_payload) item
    order by case when p_payload->>'sort'='amount' then coalesce((select sum(amount) from salt_crm.sales where client_id=item.id and voided_at is null),0) end desc nulls last,
     case when p_payload->>'sort'='oldest' then item.first_contact_at end asc nulls last,
     case when p_payload->>'sort'='activity' then item.last_contact_at end desc nulls last,item.first_contact_at desc,item.id
    limit least(100,greatest(1,coalesce((p_payload->>'limit')::integer,25))) offset (greatest(1,coalesce((p_payload->>'page')::integer,1))-1)*least(100,greatest(1,coalesce((p_payload->>'limit')::integer,25)))
   ) r),'[]'));
 elsif p_operation='create' or p_operation='inquiry' then
  if not exists(select 1 from salt_crm.sources where code=p_payload->>'source' and active) then raise exception 'Inactive source' using errcode='22023'; end if;
  if nullif(p_payload->>'responsible_id','') is not null and not exists(select 1 from public.staff where id=(p_payload->>'responsible_id')::uuid and is_active) then raise exception 'Invalid staff' using errcode='22023'; end if;
  result:=salt_crm.record_inquiry(p_payload,'manual',p_payload->>'request_id');
  if coalesce((result->>'replayed')::boolean,false) then return result; end if;
  insert into salt_crm.audit(client_id,actor_id,action,changes) values((result->>'id')::uuid,actor.id,'inquiry_added',jsonb_build_object('duplicate',result->'duplicate'));
  return result;
 elsif p_operation='settings' then
  if actor.role::text<>'owner' then raise exception 'Forbidden' using errcode='42501'; end if;
  update salt_crm.settings set retention_days=(p_payload->>'retention_days')::integer,updated_at=now();
  insert into salt_crm.audit(actor_id,action,changes) values(actor.id,'settings_changed',jsonb_build_object('retention_days',p_payload->'retention_days'));
  return jsonb_build_object('ok',true);
 elsif p_operation='source' then
  if actor.role::text<>'owner' then raise exception 'Forbidden' using errcode='42501'; end if;
  update salt_crm.sources set active=(p_payload->>'active')::boolean where code=p_payload->>'code' and code not in ('website','manual','other');
  insert into salt_crm.audit(actor_id,action,changes) values(actor.id,'source_changed',p_payload);
  return jsonb_build_object('ok',true);
 end if;
 select * into c from salt_crm.clients where id=(p_payload->>'id')::uuid for update;
 if not found then raise exception 'Not found' using errcode='P0002'; end if;
 if p_operation='detail' then
  return jsonb_build_object('client',to_jsonb(c),
   'inquiries',coalesce((select jsonb_agg(x) from (select * from salt_crm.inquiries where client_id=c.id order by occurred_at desc limit 50 offset greatest(0,coalesce((p_payload->>'offset')::integer,0))) x),'[]'),
   'inquiry_count',(select count(*) from salt_crm.inquiries where client_id=c.id),
   'notes',coalesce((select jsonb_agg(x) from (select n.*,s.full_name as actor_name from salt_crm.notes n left join public.staff s on s.id=n.actor_id where client_id=c.id order by n.created_at desc limit 50 offset greatest(0,coalesce((p_payload->>'offset')::integer,0))) x),'[]'),
   'sales',coalesce((select jsonb_agg(x) from (select * from salt_crm.sales where client_id=c.id order by sold_at desc limit 50 offset greatest(0,coalesce((p_payload->>'offset')::integer,0))) x),'[]'),
   'audit',coalesce((select jsonb_agg(x) from (select a.*,s.full_name as actor_name from salt_crm.audit a left join public.staff s on s.id=a.actor_id where client_id=c.id order by a.created_at desc limit 50 offset greatest(0,coalesce((p_payload->>'offset')::integer,0))) x),'[]'));
 elsif p_operation='update' then
  if c.version<>(p_payload->>'version')::integer then raise exception 'Conflict' using errcode='40001'; end if;
  if nullif(p_payload->>'responsible_id','') is not null and not exists(select 1 from public.staff where id=(p_payload->>'responsible_id')::uuid and is_active) then raise exception 'Invalid staff' using errcode='22023'; end if;
  before_row:=to_jsonb(c);
  update salt_crm.clients set full_name=p_payload->>'full_name',phone=salt_crm.normalize_phone(p_payload->>'phone'),whatsapp=salt_crm.normalize_phone(p_payload->>'whatsapp'),region=p_payload->>'region',source=p_payload->>'source',campaign=p_payload->>'campaign',interest=p_payload->>'interest',responsible_id=nullif(p_payload->>'responsible_id','')::uuid,outcome=p_payload->>'outcome',note=p_payload->>'note',version=version+1,updated_at=now() where id=c.id returning * into c;
  select coalesce(jsonb_object_agg(n.key,jsonb_build_object('before',o.value,'after',n.value)),'{}') into result from jsonb_each(to_jsonb(c)) n join jsonb_each(before_row) o using(key) where n.value is distinct from o.value;
 elsif p_operation='archive' or p_operation='restore' then
  update salt_crm.clients set archived_at=case when p_operation='archive' then now() else null end,updated_at=now(),version=version+1 where id=c.id;
 elsif p_operation='note' then
  insert into salt_crm.notes(client_id,body,actor_id) values(c.id,p_payload->>'body',actor.id);
  update salt_crm.clients set updated_at=now(),version=version+1 where id=c.id;
 elsif p_operation='sale' then
  if c.archived_at is not null then raise exception 'Archived' using errcode='22023'; end if;
  insert into salt_crm.sales(client_id,amount,source,campaign,actor_id,request_id) values(c.id,(p_payload->>'amount')::numeric,c.source,c.campaign,actor.id,(p_payload->>'request_id')::uuid) on conflict(request_id) do nothing returning id into v_id;
  if v_id is null then return jsonb_build_object('ok',true,'replayed',true); end if;
  update salt_crm.clients set outcome='sold',updated_at=now(),version=version+1 where id=c.id;
  result:=jsonb_build_object('amount',p_payload->>'amount','sale_id',v_id);
 elsif p_operation='void_sale' then
  update salt_crm.sales set voided_at=now() where id=(p_payload->>'sale_id')::uuid and client_id=c.id and voided_at is null returning id into v_id;
  if v_id is null then raise exception 'Not found' using errcode='P0002'; end if;
  update salt_crm.clients set outcome=case when outcome='sold' and not exists(select 1 from salt_crm.sales s where s.client_id=c.id and s.voided_at is null) then 'interested' else outcome end,updated_at=now(),version=version+1 where id=c.id;
  result:=jsonb_build_object('sale_id',v_id,'reason',p_payload->>'reason');
 else raise exception 'Unknown operation' using errcode='22023'; end if;
 insert into salt_crm.audit(client_id,actor_id,action,changes) values(c.id,actor.id,p_operation,coalesce(result,'{}'));
 return jsonb_build_object('ok',true,'id',c.id);
end $$;


revoke execute on function public.bootstrap_first_owner(text) from public,anon,authenticated;
create function public.salt_crm_security_event(p_actor uuid,p_action text) returns void language plpgsql security invoker set search_path='' as $$
declare actor_id uuid;
begin
 select id into actor_id from public.staff where user_id=p_actor and is_active;
 if actor_id is null or p_action not in ('login','logout','export_clients','export_reports','password_changed') then raise exception 'Forbidden' using errcode='42501'; end if;
 insert into salt_crm.audit(actor_id,action) values(actor_id,p_action);
end $$;
revoke all on function public.salt_crm_security_event(uuid,text) from public,anon,authenticated;
grant execute on function public.salt_crm_security_event(uuid,text) to service_role;

