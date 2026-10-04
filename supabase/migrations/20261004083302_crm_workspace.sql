-- Additive migration. Private schema is deliberately absent from PostgREST exposure.
create schema if not exists salt_crm;
revoke all on schema salt_crm from public, anon, authenticated;
grant usage on schema salt_crm to service_role;

create table salt_crm.sources (
 code text primary key, name text not null, active boolean not null default true
);
insert into salt_crm.sources(code,name) values
 ('meta_ads','Meta Ads'),('website','Сайт'),('whatsapp','WhatsApp без рекламы'),
 ('instagram','Instagram'),('phone','Телефонный звонок'),('referral','Рекомендация'),
 ('offline','Офлайн'),('manual','Ручное добавление'),('other','Другое');
create table salt_crm.settings (
 id boolean primary key default true check(id), company_name text not null default 'Salt Ordo',
 currency text not null default 'KGS' check(currency='KGS'), timezone text not null default 'Asia/Bishkek' check(timezone='Asia/Bishkek'),
 retention_days integer not null default 730 check(retention_days between 30 and 3650),
 updated_at timestamptz not null default now()
);
insert into salt_crm.settings(id) values(true);
create table salt_crm.clients (
 id uuid primary key default gen_random_uuid(), full_name text not null check(length(full_name) between 1 and 150),
 phone text not null unique check(phone ~ '^[+][1-9][0-9]{7,14}$'), whatsapp text check(whatsapp ~ '^[+][1-9][0-9]{7,14}$'),
 region text not null default '', source text not null references salt_crm.sources(code), campaign text not null default '',
 interest text not null default '', responsible_id uuid references public.staff(id),
 outcome text not null default 'new' check(outcome in ('new','contacted','interested','sold','declined','no_response')),
 note text not null default '', first_contact_at timestamptz not null default now(), last_contact_at timestamptz not null default now(),
 archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);
create table salt_crm.inquiries (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references salt_crm.clients(id),
 source text not null references salt_crm.sources(code), campaign text not null default '', interest text not null default '',
 message text not null default '', attribution jsonb not null default '{}',
 external_provider text, external_id text, occurred_at timestamptz not null default now(),
 unique(external_provider,external_id)
);
create table salt_crm.notes (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references salt_crm.clients(id),
 body text not null check(length(body) between 1 and 4000), actor_id uuid references public.staff(id), created_at timestamptz not null default now()
);
create table salt_crm.sales (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references salt_crm.clients(id),
 inquiry_id uuid references salt_crm.inquiries(id), amount numeric(12,2) not null check(amount>0),
 source text not null references salt_crm.sources(code), campaign text not null default '',
 sold_at timestamptz not null default now(), voided_at timestamptz, actor_id uuid references public.staff(id),
 request_id uuid not null unique
);
create table salt_crm.audit (
 id bigint generated always as identity primary key, client_id uuid references salt_crm.clients(id),
 actor_id uuid references public.staff(id), action text not null, changes jsonb not null default '{}', created_at timestamptz not null default now()
);
create table salt_crm.import_issues (lead_id uuid primary key, reason text not null, created_at timestamptz not null default now());
create table salt_crm.sessions (id text primary key, user_id uuid not null references auth.users(id), tokens text not null, expires_at timestamptz not null default now()+interval '8 hours');
create index crm_sessions_expiry on salt_crm.sessions(expires_at);
create table salt_crm.rate_limits (key text primary key, hits timestamptz[] not null default '{}', updated_at timestamptz not null default now());
create index crm_rate_expiry on salt_crm.rate_limits(updated_at);
create index crm_clients_created on salt_crm.clients(first_contact_at desc,id);
create index crm_clients_activity on salt_crm.clients(last_contact_at desc,id);
create index crm_clients_source on salt_crm.clients(source,first_contact_at desc);
create index crm_clients_region on salt_crm.clients(region,first_contact_at desc);
create index crm_clients_campaign on salt_crm.clients(campaign,first_contact_at desc);
create index crm_clients_responsible on salt_crm.clients(responsible_id,first_contact_at desc);
create index crm_clients_outcome on salt_crm.clients(outcome,first_contact_at desc);
create index crm_clients_archive on salt_crm.clients(archived_at);
create index crm_inquiries_client on salt_crm.inquiries(client_id,occurred_at desc);
create index crm_inquiries_date_source on salt_crm.inquiries(occurred_at,source);
create index crm_sales_client on salt_crm.sales(client_id,sold_at desc) where voided_at is null;
create index crm_sales_date_source on salt_crm.sales(sold_at,source) where voided_at is null;
create index crm_sales_inquiry on salt_crm.sales(inquiry_id);
create index crm_notes_client on salt_crm.notes(client_id,created_at desc);
create index crm_audit_client on salt_crm.audit(client_id,created_at desc);

-- Defense in depth: no browser role has schema usage, table privileges or RLS policies.
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='salt_crm' loop
  execute format('alter table salt_crm.%I enable row level security',t);
 end loop;
end $$;
grant all on all tables in schema salt_crm to service_role;
grant usage,select on all sequences in schema salt_crm to service_role;

create function salt_crm.normalize_phone(p_value text) returns text
language plpgsql immutable set search_path='' as $$
declare d text:=regexp_replace(coalesce(p_value,''),'[[:space:]().+-]','','g');
begin
 if d ~ '^00' then d:=substr(d,3); end if;
 if d ~ '^0[0-9]{9}$' then d:='996'||substr(d,2);
 elsif d ~ '^[0-9]{9}$' then d:='996'||d; end if;
 if d !~ '^[1-9][0-9]{7,14}$' then return null; end if;
 return '+'||d;
end $$;

create function public.salt_crm_rate_limit(p_key text,p_limit integer,p_seconds integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare times timestamptz[]; n timestamptz:=clock_timestamp(); retry integer;
begin
 if p_limit not between 1 and 1000 or p_seconds not between 1 and 3600 or length(p_key)>180 then raise exception 'Invalid limit' using errcode='22023'; end if;
 insert into salt_crm.rate_limits(key) values(p_key) on conflict do nothing;
 select coalesce(array_agg(h order by h),'{}') into times from unnest((select hits from salt_crm.rate_limits where key=p_key for update)) h where h>n-make_interval(secs=>p_seconds);
 if cardinality(times)>=p_limit then
  retry:=greatest(1,ceil(extract(epoch from times[1]+make_interval(secs=>p_seconds)-n))::integer);
  return jsonb_build_object('allowed',false,'retry_after',retry);
 end if;
 update salt_crm.rate_limits set hits=array_append(times,n),updated_at=n where key=p_key;
 -- Bounded opportunistic expiry, containing only non-identifying keyed hashes.
 delete from salt_crm.rate_limits where key in (select key from salt_crm.rate_limits where updated_at<n-interval '2 hours' limit 50);
 return jsonb_build_object('allowed',true);
end $$;

create function public.salt_crm_session(p_operation text,p_id text,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_id !~ '^[a-f0-9]{64}$' then raise exception 'Invalid session' using errcode='22023'; end if;
 if p_operation='create' then
  insert into salt_crm.sessions(id,user_id,tokens) values(p_id,(p_payload->>'user_id')::uuid,p_payload->>'tokens');
  delete from salt_crm.sessions where expires_at<now();
 elsif p_operation='get' then
  select jsonb_build_object('tokens',s.tokens) into result from salt_crm.sessions s where id=p_id and expires_at>now();
 elsif p_operation='rotate' then update salt_crm.sessions set tokens=p_payload->>'tokens' where id=p_id and expires_at>now();
 elsif p_operation='delete' then delete from salt_crm.sessions where id=p_id;
 else raise exception 'Unknown operation' using errcode='22023'; end if;
 return result;
end $$;

create function salt_crm.record_inquiry(p_data jsonb,p_provider text default null,p_external text default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare c salt_crm.clients; v_phone text:=salt_crm.normalize_phone(p_data->>'phone'); v_id uuid; v_duplicate boolean; existing_id uuid;
begin
 if v_phone is null then raise exception 'Invalid phone' using errcode='22023'; end if;
 if p_external is not null then
  perform pg_advisory_xact_lock(hashtextextended(p_provider||':'||p_external,0));
  select client_id into existing_id from salt_crm.inquiries where external_provider=p_provider and external_id=p_external;
  if existing_id is not null then return jsonb_build_object('id',existing_id,'duplicate',true,'replayed',true); end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(v_phone,1));
 select * into c from salt_crm.clients where phone=v_phone for update;
 v_duplicate:=found;
 if not v_duplicate then
  insert into salt_crm.clients(full_name,phone,whatsapp,region,source,campaign,interest,responsible_id,outcome,note,first_contact_at,last_contact_at)
  values(left(p_data->>'full_name',150),v_phone,salt_crm.normalize_phone(p_data->>'whatsapp'),coalesce(p_data->>'region',''),coalesce(p_data->>'source','website'),coalesce(p_data->>'campaign',''),coalesce(p_data->>'interest',''),nullif(p_data->>'responsible_id','')::uuid,coalesce(p_data->>'outcome','new'),coalesce(p_data->>'note',''),coalesce((p_data->>'occurred_at')::timestamptz,now()),coalesce((p_data->>'occurred_at')::timestamptz,now())) returning * into c;
 else
  update salt_crm.clients set last_contact_at=greatest(last_contact_at,coalesce((p_data->>'occurred_at')::timestamptz,now())),first_contact_at=least(first_contact_at,coalesce((p_data->>'occurred_at')::timestamptz,now())),updated_at=now(),version=version+1 where id=c.id;
 end if;
 insert into salt_crm.inquiries(client_id,source,campaign,interest,message,attribution,external_provider,external_id,occurred_at)
 values(c.id,coalesce(p_data->>'source','website'),coalesce(p_data->>'campaign',''),coalesce(p_data->>'interest',''),left(coalesce(p_data->>'note',''),4000),coalesce(p_data->'attribution','{}'),p_provider,p_external,coalesce((p_data->>'occurred_at')::timestamptz,now())) returning id into v_id;
 return jsonb_build_object('id',c.id,'inquiry_id',v_id,'duplicate',v_duplicate,'archived',c.archived_at is not null);
end $$;

-- Leads keep their existing contract; CRM receives every saved lead atomically.
alter table public.leads add column if not exists crm_attribution jsonb not null default '{}';
alter table public.leads add column if not exists crm_region text not null default '';
create function salt_crm.capture_lead() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if salt_crm.normalize_phone(new.phone) is null then
  insert into salt_crm.import_issues(lead_id,reason) values(new.id,'invalid_phone') on conflict do nothing;
  return new;
 end if;
 perform salt_crm.record_inquiry(jsonb_build_object('full_name',new.customer_name,'phone',new.phone,'region',new.crm_region,
  'source',case when lower(coalesce(new.crm_attribution->>'utm_source','')) in ('facebook','fb','instagram','ig','meta') and lower(coalesce(new.crm_attribution->>'utm_medium','')) in ('paid','paid_social','cpc','ppc') then 'meta_ads' else 'website' end,
  'campaign',coalesce(new.crm_attribution->>'utm_campaign',''),'interest',coalesce(new.product_name,''),'note',coalesce(new.message,''),'attribution',new.crm_attribution,'occurred_at',new.created_at), 'website_lead',new.id::text);
 return new;
end $$;
create trigger salt_crm_lead_capture after insert on public.leads for each row execute function salt_crm.capture_lead();
-- Backfill uses deterministic external IDs and does not alter existing lead data.
do $$ declare l public.leads; begin
 for l in select * from public.leads order by created_at,id loop
  if salt_crm.normalize_phone(l.phone) is null then
   insert into salt_crm.import_issues(lead_id,reason) values(l.id,'invalid_phone') on conflict do nothing;
  else
   perform salt_crm.record_inquiry(jsonb_build_object('full_name',l.customer_name,'phone',l.phone,'source','website','interest',coalesce(l.product_name,''),'note',coalesce(l.message,''),'occurred_at',l.created_at),'website_lead',l.id::text);
  end if;
 end loop;
end $$;

create function salt_crm.filtered(p jsonb) returns setof salt_crm.clients language sql stable security invoker set search_path='' as $$
 select c.* from salt_crm.clients c
 where (case when p->>'archived'='all' then true when p->>'archived'='yes' then c.archived_at is not null else c.archived_at is null end)
 and (coalesce(p->>'q','')='' or c.full_name ilike '%'||replace(replace(replace(p->>'q',E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_')||'%' or ((p->>'q') ~ '^[+0-9 () .-]+$' and c.phone like '%'||nullif(regexp_replace(p->>'q','[^0-9]','','g'),'')||'%'))
 and (coalesce(p->>'source','')='' or c.source=p->>'source')
 and (coalesce(p->>'campaign','')='' or c.campaign=p->>'campaign')
 and (coalesce(p->>'region','')='' or c.region=p->>'region')
 and (coalesce(p->>'responsible_id','')='' or c.responsible_id=(p->>'responsible_id')::uuid)
 and (coalesce(p->>'outcome','')='' or c.outcome=p->>'outcome')
 and (coalesce(p->>'from','')='' or c.first_contact_at >= ((p->>'from')::date::timestamp at time zone 'Asia/Bishkek'))
 and (coalesce(p->>'to','')='' or c.first_contact_at < (((p->>'to')::date+1)::timestamp at time zone 'Asia/Bishkek'))
 and (coalesce(p->>'sale','')='' or (p->>'sale'='yes')=exists(select 1 from salt_crm.sales s where s.client_id=c.id and s.voided_at is null));
$$;

create function public.salt_crm_api(p_operation text,p_payload jsonb,p_actor uuid) returns jsonb
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
  result:=jsonb_build_object('sale_id',v_id,'reason',p_payload->>'reason');
 else raise exception 'Unknown operation' using errcode='22023'; end if;
 insert into salt_crm.audit(client_id,actor_id,action,changes) values(c.id,actor.id,p_operation,coalesce(result,'{}'));
 return jsonb_build_object('ok',true,'id',c.id);
end $$;

revoke all on all functions in schema salt_crm from public,anon,authenticated;
grant execute on all functions in schema salt_crm to service_role;
revoke all on function public.salt_crm_api(text,jsonb,uuid),public.salt_crm_session(text,text,jsonb),public.salt_crm_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.salt_crm_api(text,jsonb,uuid),public.salt_crm_session(text,text,jsonb),public.salt_crm_rate_limit(text,integer,integer) to service_role;
