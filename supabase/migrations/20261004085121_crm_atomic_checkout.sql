create table salt_crm.public_requests(request_id uuid primary key,kind text not null,result jsonb not null,created_at timestamptz not null default now());
alter table salt_crm.public_requests enable row level security;
grant all on salt_crm.public_requests to service_role;
create index crm_public_requests_date on salt_crm.public_requests(created_at);
create function public.salt_crm_public_order(p_data jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; v_request_id uuid:=(p_data->>'request_id')::uuid; interest text;
begin
 if v_request_id is null then raise exception 'Request id required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_request_id::text,5));
 select r.result into result from salt_crm.public_requests r where r.request_id=v_request_id;
 if found then return result; end if;
 select to_jsonb(x) into result from public.create_public_order(p_data->>'p_customer_name',p_data->>'p_phone',p_data->>'p_city',p_data->>'p_delivery_method',p_data->>'p_note',p_data->>'p_language',p_data->'p_items') x;
 select string_agg(product_name,', ' order by product_name) into interest from public.order_items where order_id=(result->>'order_id')::uuid;
 insert into public.leads(source,customer_name,phone,email,message,product_name,crm_region,crm_attribution)
 values('checkout',p_data->>'p_customer_name',p_data->>'p_phone',nullif(p_data->>'email',''),concat(p_data->>'p_note',' · Заявка ',result->>'order_number'),left(interest,200),coalesce(p_data->>'p_city',''),coalesce(p_data->'attribution','{}')||jsonb_build_object('consent',p_data->'consent'));
 insert into salt_crm.public_requests(request_id,kind,result) values(v_request_id,'order',result);
 return result;
end $$;
revoke all on function public.salt_crm_public_order(jsonb) from public,anon,authenticated;
grant execute on function public.salt_crm_public_order(jsonb) to service_role;
