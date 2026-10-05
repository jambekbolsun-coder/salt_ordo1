-- Additive, repeatable extension of the existing Salt Ordo CRM. No business records are backfilled.
create table if not exists salt_crm.whatsapp_connection (
 id boolean primary key default true check(id), waba_id text not null, phone_id text not null,
 display_phone text not null, business_name text not null, token_box jsonb not null,
 state text not null default 'syncing', connected_by uuid references public.staff(id), connected_at timestamptz not null default now(),
 last_webhook_at timestamptz,last_message_at timestamptz,last_checked_at timestamptz,
 webhook_subscribed boolean not null default false, sync jsonb not null default '{}', error_code text,
 updated_at timestamptz not null default now()
);
create table if not exists salt_crm.whatsapp_signup (
 state_hash text primary key, actor uuid not null references auth.users(id), session_hash text not null,
 expires_at timestamptz not null default now()+interval '10 minutes', claimed boolean not null default false, token_box jsonb
);
create index if not exists wa_signup_expiry on salt_crm.whatsapp_signup(expires_at);
create table if not exists salt_crm.whatsapp_clicks (
 code text primary key check(code ~ '^SO-[A-F0-9]{12}$'), page text not null,product text not null default '',category text not null default '',
 attribution jsonb not null default '{}', session_id uuid, created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days',
 claimed_phone text
);
create index if not exists wa_click_expiry on salt_crm.whatsapp_clicks(expires_at);
create table if not exists salt_crm.whatsapp_events (
 key text primary key, waba_id text not null, phone_id text not null, kind text not null,
 payload jsonb, state text not null default 'pending' check(state in ('pending','done','failed','ignored')),
 attempts integer not null default 0, error_code text, created_at timestamptz not null default now(), processed_at timestamptz
);
create index if not exists wa_events_pending on salt_crm.whatsapp_events(created_at) where state in ('pending','failed');
create table if not exists salt_crm.whatsapp_messages (
 id uuid primary key default gen_random_uuid(), message_id text not null unique,
 event_key text not null references salt_crm.whatsapp_events(key), client_id uuid references salt_crm.clients(id), inquiry_id uuid references salt_crm.inquiries(id),
 waba_id text not null,phone_id text not null,phone text not null,wa_id text not null,
 direction text not null check(direction in ('in','out')), type text not null, body text not null default '', details jsonb not null default '{}',
 referral jsonb not null default '{}', attribution jsonb not null default '{}', source text not null references salt_crm.sources(code),
 tracking_code text, history boolean not null default false, occurred_at timestamptz not null,
 delivery_status text, status_at timestamptz, error_codes jsonb not null default '[]',created_at timestamptz not null default now()
);
create index if not exists wa_message_client_time on salt_crm.whatsapp_messages(client_id,occurred_at desc,id);
create index if not exists wa_message_phone on salt_crm.whatsapp_messages(phone,occurred_at desc);
create index if not exists wa_message_source on salt_crm.whatsapp_messages(source,occurred_at desc);
create index if not exists wa_message_ad on salt_crm.whatsapp_messages((attribution->>'ad_id'),occurred_at desc);
create index if not exists wa_message_tracking on salt_crm.whatsapp_messages(tracking_code) where tracking_code is not null;
create index if not exists wa_message_inquiry on salt_crm.whatsapp_messages(inquiry_id);
create index if not exists wa_message_event on salt_crm.whatsapp_messages(event_key);
create table if not exists salt_crm.whatsapp_statuses (
 message_id text primary key,status text not null,occurred_at timestamptz not null,error_codes jsonb not null default '[]'
);
-- Short-lived contacts sync, not a parallel client database. Does not create CRM inquiries.
create table if not exists salt_crm.whatsapp_contact_names (
 phone text primary key,full_name text not null,updated_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['whatsapp_connection','whatsapp_signup','whatsapp_clicks','whatsapp_events','whatsapp_messages','whatsapp_statuses','whatsapp_contact_names'] loop
  execute format('alter table salt_crm.%I enable row level security',t);
  execute format('revoke all on salt_crm.%I from public,anon,authenticated',t);
  execute format('grant all on salt_crm.%I to service_role',t);
 end loop;
end $$;
create or replace function salt_crm.whatsapp_process(p_keys text[] default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare e salt_crm.whatsapp_events; d jsonb; result jsonb; cid uuid; iid uuid; src text; attrs jsonb; v_code text; clean text; click salt_crm.whatsapp_clicks; failed integer:=0; processed integer:=0; status_row salt_crm.whatsapp_statuses;
begin
 for e in select * from salt_crm.whatsapp_events where state in ('pending','failed') and attempts<20 and (p_keys is null or key=any(p_keys)) order by created_at,key limit 100 for update skip locked loop
  begin
   d:=e.payload;
   if not exists(select 1 from salt_crm.whatsapp_connection where waba_id=e.waba_id and (phone_id=e.phone_id or e.kind='account') and state<>'disconnected') then
    update salt_crm.whatsapp_events set state='ignored',payload=null,processed_at=now() where key=e.key; continue;
   end if;
   if e.kind='message' then

    perform pg_advisory_xact_lock(hashtextextended(d->>'phone',1));
    if exists(select 1 from salt_crm.whatsapp_messages where message_id=d->>'message_id') then
     update salt_crm.whatsapp_events set state='done',payload=null,processed_at=now() where key=e.key; continue;
    end if;
    cid:=null;iid:=null;attrs:='{}';src:='whatsapp';clean:=coalesce(d->>'text','');v_code:=null;
    select id into cid from salt_crm.clients where phone=d->>'phone';
    -- Ads referral is authoritative only when Meta identifies an advertisement, not an organic post.
    if d->'referral'->>'source_type'='ad' and coalesce(d->'referral'->>'source_id','')<>'' then
     src:='meta_ads';attrs:=jsonb_build_object('ad_id',d->'referral'->>'source_id','ctwa_clid',d->'referral'->>'ctwa_clid');
    end if;
    v_code:=substring(clean from 'SO-[A-F0-9]{12}');
    if v_code is not null and d->>'direction'='in' and not coalesce((d->>'history')::boolean,false) then
     select * into click from salt_crm.whatsapp_clicks where whatsapp_clicks.code=v_code and expires_at>now() and (claimed_phone is null or claimed_phone=d->>'phone') for update;
     if found then
      update salt_crm.whatsapp_clicks set claimed_phone=d->>'phone' where whatsapp_clicks.code=v_code;
      if src<>'meta_ads' then src:='website';attrs:=click.attribution||jsonb_build_object('landing_page',click.page,'product',click.product,'category',click.category);end if;
      clean:=regexp_replace(regexp_replace(clean,'(Код обращения: *|Reference: *)?'||v_code,'','g'),'^[[:space:]]+|[[:space:]]+$','','g');
     else v_code:=null;end if;
    else v_code:=null;end if;
    if d->>'direction'='in' and not coalesce((d->>'history')::boolean,false) then
     result:=salt_crm.record_inquiry(jsonb_build_object('full_name',coalesce(nullif(d->>'full_name',''),(select full_name from salt_crm.whatsapp_contact_names where phone=d->>'phone'),d->>'phone'),
      'phone',d->>'phone','whatsapp',d->>'phone','source',src,'campaign',coalesce(attrs->>'campaign_name',attrs->>'utm_campaign',''),'interest',coalesce(attrs->>'product',''),
      'note',clean,'attribution',attrs,'occurred_at',d->>'occurred_at'),'whatsapp',d->>'message_id');
     cid:=(result->>'id')::uuid;iid:=(result->>'inquiry_id')::uuid;
     update salt_crm.clients set whatsapp=coalesce(whatsapp,d->>'phone') where id=cid;
     update salt_crm.whatsapp_messages set client_id=cid where phone=d->>'phone' and client_id is null;
     insert into salt_crm.audit(client_id,action,changes) values(cid,'whatsapp_received',jsonb_build_object('source',src));
    end if;
    select * into status_row from salt_crm.whatsapp_statuses where message_id=d->>'message_id';
    insert into salt_crm.whatsapp_messages(message_id,event_key,client_id,inquiry_id,waba_id,phone_id,phone,wa_id,direction,type,body,details,referral,attribution,source,tracking_code,history,occurred_at,delivery_status,status_at,error_codes)
    values(d->>'message_id',e.key,cid,iid,e.waba_id,e.phone_id,d->>'phone',d->>'wa_id',d->>'direction',d->>'type',clean,coalesce(d->'details','{}'),coalesce(d->'referral','{}'),attrs,src,v_code,coalesce((d->>'history')::boolean,false),(d->>'occurred_at')::timestamptz,status_row.status,status_row.occurred_at,coalesce(d->'error_codes','[]')) on conflict(message_id) do nothing;
    update salt_crm.whatsapp_connection set last_message_at=greatest(last_message_at,(d->>'occurred_at')::timestamptz) where id and not coalesce((d->>'history')::boolean,false);
   elsif e.kind='status' then
    if d->>'status' in ('sent','delivered','read','failed','deleted') then
     insert into salt_crm.whatsapp_statuses(message_id,status,occurred_at,error_codes) values(d->>'message_id',d->>'status',(d->>'occurred_at')::timestamptz,coalesce(d->'error_codes','[]'))
     on conflict(message_id) do update set status=excluded.status,occurred_at=excluded.occurred_at,error_codes=excluded.error_codes
     where excluded.occurred_at>=whatsapp_statuses.occurred_at and not (whatsapp_statuses.status='read' and excluded.status in ('sent','delivered'));
     update salt_crm.whatsapp_messages m set delivery_status=s.status,status_at=s.occurred_at,error_codes=s.error_codes from salt_crm.whatsapp_statuses s where m.message_id=s.message_id and s.message_id=d->>'message_id';
    end if;
   elsif e.kind='contact' then
    if d->>'action'='add' and coalesce(d->>'full_name','')<>'' then
     insert into salt_crm.whatsapp_contact_names(phone,full_name) values(d->>'phone',d->>'full_name') on conflict(phone) do update set full_name=excluded.full_name,updated_at=now();
    elsif d->>'action'='remove' then delete from salt_crm.whatsapp_contact_names where phone=d->>'phone'; end if;
   elsif e.kind='account' then
    if d->>'event' in ('PARTNER_REMOVED','ACCOUNT_OFFBOARDED') then update salt_crm.whatsapp_connection set state='disconnected',token_box='{}',error_code=d->>'event',webhook_subscribed=false,updated_at=now() where id;
    elsif d->>'event'='ACCOUNT_RECONNECTED' then update salt_crm.whatsapp_connection set state='error',error_code='RECONNECT_REQUIRED',updated_at=now() where id;end if;
   elsif e.kind='history' then
    update salt_crm.whatsapp_connection set sync=sync||jsonb_build_object('history_progress',d->'progress','history_phase',d->'phase','history_result',case when (d->'error_codes') ? '2593109' then 'declined' when (d->>'progress')::integer=100 then 'complete' else 'receiving' end),updated_at=now() where id;
   elsif e.kind='error' then update salt_crm.whatsapp_connection set error_code=left('META_'||coalesce(d->>'code','UNKNOWN'),100),updated_at=now() where id;
   end if;
   update salt_crm.whatsapp_events set state=case when e.kind='ignored' then 'ignored' else 'done' end,payload=null,attempts=attempts+1,error_code=null,processed_at=now() where key=e.key;
   processed:=processed+1;
  exception when others then
   update salt_crm.whatsapp_events set state='failed',attempts=attempts+1,error_code='DB_'||SQLSTATE,processed_at=now() where key=e.key;
   failed:=failed+1;
  end;
 end loop;
 return jsonb_build_object('processed',processed,'failed',failed);
end $$;
create or replace function public.salt_crm_whatsapp(p_operation text,p_payload jsonb default '{}',p_actor uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare staff_actor public.staff; c salt_crm.whatsapp_connection; s salt_crm.whatsapp_signup; result jsonb; e jsonb; keys text[]:='{}';
begin
 if p_operation in ('status','prepare','claim','exchange_save','pending','connect','check_save','retry','messages','summaries') then
  select * into staff_actor from public.staff where user_id=p_actor and is_active and role::text in ('owner','admin');
  if not found or (p_operation not in ('status','messages','summaries') and staff_actor.role::text<>'owner') then raise exception 'Forbidden' using errcode='42501';end if;
 end if;
 if p_operation='status' then
  select * into c from salt_crm.whatsapp_connection where id;
  result:=case when c.id is null then jsonb_build_object('state','disconnected') else (to_jsonb(c)-'token_box'-'connected_by'-'id')||jsonb_build_object('connected_by',(select full_name from public.staff where id=c.connected_by)) end;
  if staff_actor.role::text<>'owner' then result:=result-'waba_id'-'phone_id'-'sync';else
   result:=result||jsonb_build_object('errors',coalesce((select jsonb_agg(x) from(select error_code,processed_at from salt_crm.whatsapp_events where state='failed' order by processed_at desc limit 10)x),'[]'),'retry_count',(select count(*) from salt_crm.whatsapp_events where state in ('failed','pending')));
  end if;return result;
 elsif p_operation='prepare' then
  delete from salt_crm.whatsapp_signup where expires_at<now() or actor=p_actor;
  insert into salt_crm.whatsapp_signup(state_hash,actor,session_hash) values(p_payload->>'state_hash',p_actor,p_payload->>'session_hash');return jsonb_build_object('ok',true);
 elsif p_operation in ('claim','exchange_save','pending') then
  select * into s from salt_crm.whatsapp_signup where state_hash=p_payload->>'state_hash' and actor=p_actor and session_hash=p_payload->>'session_hash' and expires_at>now() for update;
  if not found then raise exception 'Invalid state' using errcode='42501';end if;
  if p_operation='claim' then
   if s.claimed then raise exception 'Code already used' using errcode='22023';end if;
   update salt_crm.whatsapp_signup set claimed=true where state_hash=s.state_hash;return jsonb_build_object('ok',true);
  elsif p_operation='exchange_save' then update salt_crm.whatsapp_signup set token_box=p_payload->'token_box' where state_hash=s.state_hash and claimed;return jsonb_build_object('ok',true);
  else return s.token_box;end if;
 elsif p_operation='connect' then
  perform 1 from salt_crm.whatsapp_signup where state_hash=p_payload->>'state_hash' and actor=p_actor and session_hash=p_payload->>'session_hash' and expires_at>now() and token_box is not null for update;
  if not found then raise exception 'Invalid state' using errcode='42501';end if;
  insert into salt_crm.whatsapp_connection(id,waba_id,phone_id,display_phone,business_name,token_box,connected_by)
  values(true,p_payload->>'waba_id',p_payload->>'phone_id',p_payload->>'display_phone',p_payload->>'business_name',p_payload->'token_box',staff_actor.id)
  on conflict(id) do update set waba_id=excluded.waba_id,phone_id=excluded.phone_id,display_phone=excluded.display_phone,business_name=excluded.business_name,token_box=excluded.token_box,connected_by=excluded.connected_by,connected_at=now(),state='syncing',error_code=null,webhook_subscribed=false,sync=case when whatsapp_connection.phone_id=excluded.phone_id and whatsapp_connection.state<>'disconnected' then whatsapp_connection.sync else '{}'::jsonb end,updated_at=now();
  delete from salt_crm.whatsapp_signup where state_hash=p_payload->>'state_hash';
  insert into salt_crm.audit(actor_id,action) values(staff_actor.id,'whatsapp_connected');return jsonb_build_object('ok',true);
 elsif p_operation='connection' then return (select to_jsonb(t) from salt_crm.whatsapp_connection t where id);
 elsif p_operation='check_save' then
  update salt_crm.whatsapp_connection set state=coalesce(p_payload->>'state',state),error_code=p_payload->>'error_code',webhook_subscribed=coalesce((p_payload->>'webhook_subscribed')::boolean,webhook_subscribed),sync=sync||coalesce(p_payload->'sync','{}'),last_checked_at=now(),updated_at=now() where id;
  return jsonb_build_object('ok',true);
 elsif p_operation='click' then
  insert into salt_crm.whatsapp_clicks(code,page,product,category,attribution,session_id) values(p_payload->>'code',p_payload->>'page',coalesce(p_payload->>'product',''),coalesce(p_payload->>'category',''),coalesce(p_payload->'attribution','{}'),nullif(p_payload->>'session_id','')::uuid);
  delete from salt_crm.whatsapp_clicks where code in(select code from salt_crm.whatsapp_clicks where expires_at<now() limit 100);
  return jsonb_build_object('code',p_payload->>'code');
 elsif p_operation='enqueue' then
  delete from salt_crm.whatsapp_contact_names where phone in(select phone from salt_crm.whatsapp_contact_names where updated_at<now()-interval '7 days' limit 100);
  delete from salt_crm.whatsapp_signup where expires_at<now();
  for e in select value from jsonb_array_elements(p_payload->'events') loop
   if exists(select 1 from salt_crm.whatsapp_connection where waba_id=e->>'waba_id' and (phone_id=e->>'phone_id' or e->>'kind'='account') and state<>'disconnected') then
    insert into salt_crm.whatsapp_events(key,waba_id,phone_id,kind,payload) values(e->>'key',e->>'waba_id',e->>'phone_id',e->>'kind',e) on conflict(key) do nothing;
    keys:=array_append(keys,e->>'key');
    update salt_crm.whatsapp_connection set last_webhook_at=now() where id;
   end if;
  end loop;return to_jsonb(keys);
 elsif p_operation='process' then return salt_crm.whatsapp_process(array(select jsonb_array_elements_text(p_payload->'keys')));
 elsif p_operation='retry' then return salt_crm.whatsapp_process(null);
 elsif p_operation='messages' then
  return jsonb_build_object('items',coalesce((select jsonb_agg((to_jsonb(x)-'event_key'-'waba_id'-'phone_id') - case when staff_actor.role::text='owner' then '{}'::text[] else array['message_id','wa_id'] end order by x.occurred_at desc,x.id) from (select m.* from salt_crm.whatsapp_messages m where client_id=(p_payload->>'client_id')::uuid order by occurred_at desc,id limit 50 offset greatest(0,least(1000000,coalesce((p_payload->>'offset')::integer,0))))x),'[]'),
   'first',(select (to_jsonb(m)-'event_key'-'waba_id'-'phone_id') - case when staff_actor.role::text='owner' then '{}'::text[] else array['message_id','wa_id'] end from salt_crm.whatsapp_messages m where client_id=(p_payload->>'client_id')::uuid and direction='in' order by occurred_at,id limit 1));
 elsif p_operation='summaries' then
  return coalesce((select jsonb_object_agg(x.client_id,to_jsonb(x)-'client_id') from(select distinct on(m.client_id) m.client_id,m.body,m.type,m.occurred_at,m.direction,coalesce(i.source,m.source) source,coalesce(i.attribution,m.attribution) attribution,i.occurred_at last_incoming_at from salt_crm.whatsapp_messages m left join lateral(select source,attribution,occurred_at from salt_crm.whatsapp_messages i where i.client_id=m.client_id and direction='in' and not history order by occurred_at desc,id limit 1)i on true where m.client_id in(select value::uuid from jsonb_array_elements_text(p_payload->'ids')) order by m.client_id,m.occurred_at desc,m.id)x),'{}');
 else raise exception 'Invalid operation' using errcode='22023';end if;
end $$;
revoke all on function salt_crm.whatsapp_process(text[]), public.salt_crm_whatsapp(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function salt_crm.whatsapp_process(text[]), public.salt_crm_whatsapp(text,jsonb,uuid) to service_role;
create or replace function salt_crm.filtered(p jsonb) returns setof salt_crm.clients language sql stable security invoker set search_path='' as $$
 select c.* from salt_crm.clients c
 where (case when p->>'archived'='all' then true when p->>'archived'='yes' then c.archived_at is not null else c.archived_at is null end)
 and (coalesce(p->>'q','')='' or c.full_name ilike '%'||replace(replace(replace(p->>'q',E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_')||'%' or ((p->>'q') ~ '^[+0-9 () .-]+$' and c.phone like '%'||nullif(regexp_replace(p->>'q','[^0-9]','','g'),'')||'%'))
 and not exists(select 1 from jsonb_each_text(p) a where a.key in ('campaign_id','adset_id','ad_id','utm_source') and a.value<>'' and not exists(select 1 from salt_crm.inquiries i where i.client_id=c.id and i.attribution @> jsonb_build_object(a.key,a.value)))
 and (coalesce(p->>'wa_source','')='' or exists(select 1 from salt_crm.whatsapp_messages wm where wm.client_id=c.id and wm.inquiry_id is not null and (p->>'wa_source'='all' or wm.source=p->>'wa_source')))
and (coalesce(p->>'source','')='' or c.source=p->>'source')
 and (coalesce(p->>'campaign','')='' or c.campaign=p->>'campaign')
 and (coalesce(p->>'region','')='' or c.region=p->>'region')
 and (coalesce(p->>'responsible_id','')='' or c.responsible_id=(p->>'responsible_id')::uuid)
 and (coalesce(p->>'outcome','')='' or c.outcome=p->>'outcome')
 and (coalesce(p->>'from','')='' or c.first_contact_at >= ((p->>'from')::date::timestamp at time zone 'Asia/Bishkek'))
 and (coalesce(p->>'to','')='' or c.first_contact_at < (((p->>'to')::date+1)::timestamp at time zone 'Asia/Bishkek'))
 and (coalesce(p->>'sale','')='' or (p->>'sale'='yes')=exists(select 1 from salt_crm.sales s where s.client_id=c.id and s.voided_at is null));
$$;
create or replace function salt_crm.period_report(p jsonb, p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security invoker set search_path='' as $$
 with clients as materialized (select * from salt_crm.filtered(p-'from'-'to')),
 inquiries as materialized (select i.*,c.region from salt_crm.inquiries i join clients c on c.id=i.client_id where i.occurred_at>=p_from and i.occurred_at<p_to),
 sales as materialized (select s.* from salt_crm.sales s join clients c on c.id=s.client_id where s.voided_at is null and s.sold_at>=p_from and s.sold_at<p_to)
 select jsonb_build_object(
  'wa_inquiries',(select count(*) from inquiries where external_provider='whatsapp'),
 'wa_clients',(select count(distinct client_id) from inquiries where external_provider='whatsapp'),
 'wa_repeat_inquiries',(select count(*) from inquiries i where external_provider='whatsapp' and exists(select 1 from salt_crm.inquiries old where old.client_id=i.client_id and (old.occurred_at,old.id)<(i.occurred_at,i.id))),
 'wa_organic',(select count(*) from inquiries where external_provider='whatsapp' and source='whatsapp'),
 'wa_ads',(select count(*) from inquiries where external_provider='whatsapp' and source='meta_ads'),
 'wa_website',(select count(*) from inquiries where external_provider='whatsapp' and source='website'),
 'wa_inquiry_conversion',coalesce((select round(100.0*count(*) filter(where exists(select 1 from salt_crm.sales s where s.inquiry_id=i.id and s.voided_at is null))/nullif(count(*),0),2) from inquiries i where external_provider='whatsapp'),0),
 'wa_client_conversion',coalesce((select round(100.0*count(distinct i.client_id) filter(where exists(select 1 from sales s where s.client_id=i.client_id))/nullif(count(distinct i.client_id),0),2) from inquiries i where external_provider='whatsapp'),0),
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

-- Preserve existing CRM operations; optionally attribute a sale to an explicit inquiry.
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
  if nullif(p_payload->>'inquiry_id','') is not null and not exists(select 1 from salt_crm.inquiries where id=(p_payload->>'inquiry_id')::uuid and client_id=c.id) then raise exception 'Invalid inquiry' using errcode='22023';end if;
  insert into salt_crm.sales(client_id,inquiry_id,amount,source,campaign,actor_id,request_id) values(c.id,nullif(p_payload->>'inquiry_id','')::uuid,(p_payload->>'amount')::numeric,coalesce((select source from salt_crm.inquiries where id=nullif(p_payload->>'inquiry_id','')::uuid),c.source),coalesce((select campaign from salt_crm.inquiries where id=nullif(p_payload->>'inquiry_id','')::uuid),c.campaign),actor.id,(p_payload->>'request_id')::uuid) on conflict(request_id) do nothing returning id into v_id;
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
