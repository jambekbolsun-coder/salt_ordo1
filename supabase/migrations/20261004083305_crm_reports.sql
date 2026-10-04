-- Reports count inquiries and sales by their own timestamps, not client creation.
create function salt_crm.period_report(p jsonb, p_from timestamptz, p_to timestamptz) returns jsonb
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
  'regions',(select coalesce(jsonb_agg(x),'[]') from (select coalesce(nullif(region,''),'Не указан') as name,count(*) as inquiries from inquiries group by 1 order by 2 desc limit 100) x),
  'interests',(select coalesce(jsonb_agg(x),'[]') from (select coalesce(nullif(interest,''),'Не указан') as name,count(*) as inquiries from inquiries group by 1 order by 2 desc limit 100) x)
 );
$$;
create function public.salt_crm_reports(p_payload jsonb,p_actor uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare d_from date:=coalesce((p_payload->>'from')::date,(now() at time zone 'Asia/Bishkek')::date-29);
 d_to date:=coalesce((p_payload->>'to')::date,(now() at time zone 'Asia/Bishkek')::date); start_at timestamptz; end_at timestamptz;
begin
 if not exists(select 1 from public.staff where user_id=p_actor and is_active and role::text in ('owner','admin')) then raise exception 'Forbidden' using errcode='42501'; end if;
 if d_to<d_from or d_to-d_from>3660 then raise exception 'Invalid period' using errcode='22023'; end if;
 start_at:=d_from::timestamp at time zone 'Asia/Bishkek'; end_at:=(d_to+1)::timestamp at time zone 'Asia/Bishkek';
 return jsonb_build_object('from',d_from,'to',d_to,'previous_from',d_from-(d_to-d_from+1),'previous_to',d_from-1,
  'current',salt_crm.period_report(p_payload,start_at,end_at),
  'previous',salt_crm.period_report(p_payload,start_at-(end_at-start_at),start_at));
end $$;
revoke all on function salt_crm.period_report(jsonb,timestamptz,timestamptz),public.salt_crm_reports(jsonb,uuid) from public,anon,authenticated;
grant execute on function salt_crm.period_report(jsonb,timestamptz,timestamptz),public.salt_crm_reports(jsonb,uuid) to service_role;

-- Only the scoped gateway key hash lives here; never the project master key.
create table salt_crm.gateway_keys(id boolean primary key default true check(id), digest text not null);
alter table salt_crm.gateway_keys enable row level security;
grant select on salt_crm.gateway_keys to service_role;
create function public.salt_crm_gateway_auth(p_digest text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from salt_crm.gateway_keys where digest=p_digest);
$$;
revoke all on function public.salt_crm_gateway_auth(text) from public,anon,authenticated;
grant execute on function public.salt_crm_gateway_auth(text) to service_role;
