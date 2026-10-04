-- Additive: no existing clients/orders are rewritten or removed.
alter table salt_crm.clients add column attribution jsonb not null default '{}';
alter table public.orders add column if not exists crm_attribution jsonb not null default '{}';
alter table salt_crm.sessions add column ref uuid not null default gen_random_uuid(), add column created_at timestamptz not null default now();
create unique index crm_sessions_ref on salt_crm.sessions(ref);
create index crm_sessions_user_expiry on salt_crm.sessions(user_id,expires_at);
create index crm_inquiry_attribution on salt_crm.inquiries using gin(attribution jsonb_path_ops);
create function salt_crm.capture_attribution() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.attribution - 'consent' <> '{}'::jsonb then
  update salt_crm.clients set attribution=new.attribution where id=new.client_id;
 end if;
 return new;
end $$;
create trigger crm_capture_attribution after insert on salt_crm.inquiries for each row execute function salt_crm.capture_attribution();
create function public.salt_crm_health() returns boolean language sql security invoker set search_path='' as $$select exists(select 1 from salt_crm.settings where id)$$;
create table salt_crm.event_delivery(id uuid primary key,state text not null default 'pending',attempts integer not null default 1,updated_at timestamptz not null default now());
alter table salt_crm.event_delivery enable row level security;
grant all on salt_crm.event_delivery to service_role;
create index crm_event_delivery_expiry on salt_crm.event_delivery(updated_at);
create function public.salt_crm_event_delivery(p_id uuid,p_operation text) returns boolean language plpgsql security invoker set search_path='' as $$
declare item salt_crm.event_delivery;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,17));
 if p_operation='claim' then
  select * into item from salt_crm.event_delivery where id=p_id for update;
  if found then
   if item.state='sent' or item.attempts>=3 or (item.state='pending' and item.updated_at>now()-interval '30 seconds') then return false; end if;
   update salt_crm.event_delivery set state='pending',attempts=attempts+1,updated_at=now() where id=p_id;
  else insert into salt_crm.event_delivery(id) values(p_id); end if;
  delete from salt_crm.event_delivery where id in(select id from salt_crm.event_delivery where updated_at<now()-interval '7 days' limit 50);
  return true;
 elsif p_operation in ('sent','retry') then update salt_crm.event_delivery set state=p_operation,updated_at=now() where id=p_id; return true;
 else raise exception 'Invalid operation' using errcode='22023'; end if;
end $$;
create function public.salt_crm_manage_sessions(p_actor uuid,p_current text,p_operation text,p_target uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.staff where user_id=p_actor and is_active) or not exists(select 1 from salt_crm.sessions where id=p_current and user_id=p_actor and expires_at>now()) then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_operation='list' then
  select coalesce(jsonb_agg(x),'[]') into result from(select ref,created_at,expires_at,id=p_current as current from salt_crm.sessions where user_id=p_actor and expires_at>now() order by created_at desc limit 100) x;
  return result;
 elsif p_operation in ('revoke','revoke_others') then
  delete from salt_crm.sessions where user_id=p_actor and id<>p_current and (p_operation='revoke_others' or ref=p_target);
  insert into salt_crm.audit(actor_id,action) select id,'sessions_revoked' from public.staff where user_id=p_actor;
  return jsonb_build_object('ok',true);
 else raise exception 'Invalid operation' using errcode='22023'; end if;
end $$;
create or replace function public.salt_crm_security_event(p_actor uuid,p_action text) returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_action not in ('login','logout','export_clients','export_reports','password_changed','mfa_verified','mfa_removed') then raise exception 'Invalid action' using errcode='22023'; end if;
 insert into salt_crm.audit(actor_id,action) select id,p_action from public.staff where user_id=p_actor and is_active;
end $$;
revoke all on function salt_crm.capture_attribution() from public,anon,authenticated;
grant execute on function salt_crm.capture_attribution() to service_role;
revoke all on function public.salt_crm_health(),public.salt_crm_event_delivery(uuid,text),public.salt_crm_manage_sessions(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.salt_crm_health(),public.salt_crm_event_delivery(uuid,text),public.salt_crm_manage_sessions(uuid,text,text,uuid) to service_role;
create or replace function salt_crm.filtered(p jsonb) returns setof salt_crm.clients language sql stable security invoker set search_path='' as $$
 select c.* from salt_crm.clients c
 where (case when p->>'archived'='all' then true when p->>'archived'='yes' then c.archived_at is not null else c.archived_at is null end)
 and (coalesce(p->>'q','')='' or c.full_name ilike '%'||replace(replace(replace(p->>'q',E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_')||'%' or ((p->>'q') ~ '^[+0-9 () .-]+$' and c.phone like '%'||nullif(regexp_replace(p->>'q','[^0-9]','','g'),'')||'%'))
 and not exists(select 1 from jsonb_each_text(p) a where a.key in ('campaign_id','adset_id','ad_id','utm_source') and a.value<>'' and not exists(select 1 from salt_crm.inquiries i where i.client_id=c.id and i.attribution @> jsonb_build_object(a.key,a.value)))
 and (coalesce(p->>'source','')='' or c.source=p->>'source')
 and (coalesce(p->>'campaign','')='' or c.campaign=p->>'campaign')
 and (coalesce(p->>'region','')='' or c.region=p->>'region')
 and (coalesce(p->>'responsible_id','')='' or c.responsible_id=(p->>'responsible_id')::uuid)
 and (coalesce(p->>'outcome','')='' or c.outcome=p->>'outcome')
 and (coalesce(p->>'from','')='' or c.first_contact_at >= ((p->>'from')::date::timestamp at time zone 'Asia/Bishkek'))
 and (coalesce(p->>'to','')='' or c.first_contact_at < (((p->>'to')::date+1)::timestamp at time zone 'Asia/Bishkek'))
 and (coalesce(p->>'sale','')='' or (p->>'sale'='yes')=exists(select 1 from salt_crm.sales s where s.client_id=c.id and s.voided_at is null));
$$;

create or replace function public.salt_crm_public_order(p_data jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; v_request_id uuid:=(p_data->>'request_id')::uuid; interest text;
begin
 if v_request_id is null then raise exception 'Request id required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_request_id::text,5));
 select r.result into result from salt_crm.public_requests r where r.request_id=v_request_id;
 if found then return result; end if;
 select to_jsonb(x) into result from public.create_public_order(p_data->>'p_customer_name',p_data->>'p_phone',p_data->>'p_city',p_data->>'p_delivery_method',p_data->>'p_note',p_data->>'p_language',p_data->'p_items') x;
 update public.orders set crm_attribution=coalesce(p_data->'attribution','{}') where id=(result->>'order_id')::uuid;
 select string_agg(product_name,', ' order by product_name) into interest from public.order_items where order_id=(result->>'order_id')::uuid;
 insert into public.leads(source,customer_name,phone,email,message,product_name,crm_region,crm_attribution)
 values('checkout',p_data->>'p_customer_name',p_data->>'p_phone',nullif(p_data->>'email',''),concat(p_data->>'p_note',' · Заявка ',result->>'order_number'),left(interest,200),coalesce(p_data->>'p_city',''),coalesce(p_data->'attribution','{}')||jsonb_build_object('consent',p_data->'consent'));
 insert into salt_crm.public_requests(request_id,kind,result) values(v_request_id,'order',result);
 return result;
end $$;
revoke all on function public.salt_crm_public_order(jsonb) from public,anon,authenticated;
grant execute on function public.salt_crm_public_order(jsonb) to service_role;
-- Reports count inquiries and sales by their own timestamps, not client creation.
create or replace function salt_crm.period_report(p jsonb, p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security invoker set search_path='' as $$
 with clients as materialized (select * from salt_crm.filtered(p-'from'-'to')),
 inquiries as materialized (select i.*,c.region from salt_crm.inquiries i join clients c on c.id=i.client_id where i.occurred_at>=p_from and i.occurred_at<p_to),
 sales as materialized (select s.* from salt_crm.sales s join clients c on c.id=s.client_id where s.voided_at is null and s.sold_at>=p_from and s.sold_at<p_to)
 select jsonb_build_object(
  'total_clients',(select count(*) from clients),
  'new_clients',(select count(*) from clients where first_contact_at>=p_from and first_contact_at<p_to),
  'inquiries',(select count(*) from inquiries),
  'repeat_inquiries',(select count(*) from inquiries i where exists(select 1 from salt_crm.inquiries older where older.client_id=i.client_id and (older.occurred_at,older.id)<(i.occurred_at,i.id))),
  'meta_inquiries',(select count(*) from inquiries where source='meta_ads'),
  'website_inquiries',(select count(*) from inquiries where source='website'),
  'sales',(select count(*) from sales),'revenue',(select coalesce(sum(amount),0) from sales),'average_sale',(select coalesce(round(avg(amount),2),0) from sales),
  'timeline',(select coalesce(jsonb_agg(x order by x.period),'[]') from (select date_trunc(case when p->>'bucket' in ('week','month') then p->>'bucket' else 'day' end,occurred_at at time zone 'Asia/Bishkek')::date as period,count(*) as inquiries from inquiries group by 1) x),
  'sources',(select coalesce(jsonb_agg(x order by x.inquiries desc),'[]') from (select src.code,src.name,(select count(*) from inquiries i where i.source=src.code) as inquiries,(select count(*) from clients c where c.source=src.code and c.first_contact_at>=p_from and c.first_contact_at<p_to) as clients,(select count(*) from sales s where s.source=src.code) as sales,(select coalesce(sum(amount),0) from sales s where s.source=src.code) as revenue from salt_crm.sources src) x),
  'campaigns',(select coalesce(jsonb_agg(x),'[]') from(select coalesce(nullif(attribution->>'campaign_name',''),nullif(attribution->>'campaign_id',''),nullif(campaign,'')) as name,count(*) as inquiries from inquiries where coalesce(attribution->>'campaign_name',attribution->>'campaign_id',campaign,'')<>'' group by 1 order by 2 desc limit 100) x),
  'ads',(select coalesce(jsonb_agg(x),'[]') from(select coalesce(nullif(attribution->>'ad_name',''),nullif(attribution->>'ad_id','')) as name,count(*) as inquiries from inquiries where coalesce(attribution->>'ad_name',attribution->>'ad_id','')<>'' group by 1 order by 2 desc limit 100) x),
  'regions',(select coalesce(jsonb_agg(x),'[]') from (select coalesce(nullif(region,''),'Не указан') as name,count(*) as inquiries from inquiries group by 1 order by 2 desc limit 100) x),
  'interests',(select coalesce(jsonb_agg(x),'[]') from (select coalesce(nullif(interest,''),'Не указан') as name,count(*) as inquiries from inquiries group by 1 order by 2 desc limit 100) x)
 );
$$;

-- Bounded 500-row export batches; no repeated total count per batch.
create function public.salt_crm_export(p_payload jsonb,p_actor uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.staff where user_id=p_actor and is_active and role::text in ('owner','admin')) then raise exception 'Forbidden' using errcode='42501'; end if;
 return coalesce((
   select jsonb_agg(r) from (select item.*,coalesce((select sum(amount) from salt_crm.sales where client_id=item.id and voided_at is null),0) as sale_total,
    (select count(*) from salt_crm.inquiries where client_id=item.id) as inquiry_count,
    (select full_name from public.staff where id=item.responsible_id) as responsible_name
    from salt_crm.filtered(p_payload) item
    order by case when p_payload->>'sort'='amount' then coalesce((select sum(amount) from salt_crm.sales where client_id=item.id and voided_at is null),0) end desc nulls last,
     case when p_payload->>'sort'='oldest' then item.first_contact_at end asc nulls last,
     case when p_payload->>'sort'='activity' then item.last_contact_at end desc nulls last,item.first_contact_at desc,item.id
    limit 500 offset (greatest(1,coalesce((p_payload->>'page')::integer,1))-1)*500
   ) r), '[]'::jsonb);
end $$;
revoke all on function public.salt_crm_export(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.salt_crm_export(jsonb,uuid) to service_role;
