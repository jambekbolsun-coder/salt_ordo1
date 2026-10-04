import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readFile, readdir } from 'node:fs/promises';
export const actor='11111111-1111-4111-8111-111111111111', staff='22222222-2222-4222-8222-222222222222';
export async function database({hardening=true}={}) {
  const db=new PGlite({extensions:{pg_trgm}});
  // Legacy schema contract only. CRM migrations themselves are executed unchanged.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema extensions;
    create function auth.role() returns text language sql as $$select 'service_role'::text$$;
    create function auth.uid() returns uuid language sql as $$select '${actor}'::uuid$$;
    create table auth.users(id uuid primary key);
    create table auth.mfa_factors(user_id uuid,status text);
    create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create type public.staff_role as enum ('owner','admin','manager','content');
    create table public.staff(id uuid primary key,user_id uuid references auth.users(id),full_name text,email text,role public.staff_role,is_active boolean);
    alter table public.staff enable row level security;
    create policy staff_read_staff on public.staff for select using(true);
    insert into auth.users values('${actor}');insert into public.staff values('${staff}','${actor}','Тестовый владелец','owner@example.invalid','owner',true);
    create table public.products(id uuid primary key,name_ru text,status text);
    create table public.leads(id uuid primary key default gen_random_uuid(),customer_name text,phone text,product_name text,message text,source text,email text,product_id uuid,created_at timestamptz default now());
    create table public.orders(id uuid primary key);create table public.order_items(order_id uuid,product_name text);
    create function public.create_public_order(text,text,text,text,text,text,jsonb) returns table(order_id uuid,order_number text,total_amount numeric,has_request_price boolean) language plpgsql as $$declare v_id uuid:=gen_random_uuid();begin insert into public.orders values(v_id);insert into public.order_items values(v_id,'Тестовый товар');return query select v_id,'TEST'::text,100::numeric,false;end$$;
    create function public.bootstrap_first_owner(text) returns void language sql as 'select';`);
  for(const signature of ['create_public_lead(text,text,text,text,text,uuid,uuid,uuid,uuid)','start_public_quiz(uuid,uuid,text)','save_public_quiz_answer(uuid,uuid,uuid,text,text)','complete_public_quiz(uuid,uuid,uuid,text[])','dismiss_public_quiz(uuid,uuid,uuid)','track_public_event(uuid,uuid,text,text,uuid,text,jsonb)'])await db.exec(`create function public.${signature} returns void language sql as 'select';`);
  const folder=new URL('../../supabase/migrations/',import.meta.url);
  const files=(await readdir(folder)).filter(f=>/^20261004.*\.sql$/.test(f)).sort();
  for(const file of files){if(!hardening&&file>='20261004093422')continue;await db.exec(await readFile(new URL(file,folder),'utf8'))}
  return db;
}
export async function call(db,name,payload){
  if(!/^salt_crm_[a-z_]+$/.test(name))throw new Error('RPC not allowed in fixture');
  const keys=Object.keys(payload);if(keys.some(k=>!/^p_[a-z_]+$/.test(k)))throw new Error('Invalid argument');
  const params=keys.map(k=>payload[k]!==null&&typeof payload[k]==='object'?JSON.stringify(payload[k]):payload[k]);
  return (await db.query(`select public.${name}(${keys.map((k,i)=>`${k} => $${i+1}`).join(',')}) as value`,params)).rows[0].value;
}
export const api=(db,operation,payload={})=>call(db,'salt_crm_api',{p_operation:operation,p_payload:payload,p_actor:actor});
export async function seed(db,count=10000){
  await db.query(`insert into salt_crm.clients(id,full_name,phone,region,source,campaign,interest,responsible_id,first_contact_at,last_contact_at)
    select md5('synthetic-'||n)::uuid,'Синтетический клиент '||lpad(n::text,5,'0'),'+996900'||lpad(n::text,6,'0'),case when n%2=0 then 'Бишкек' else 'Ош' end,
    case when n%3=0 then 'meta_ads' else 'website' end,'Кампания '||(n%10),'Категория '||(n%4),'${staff}',now()-(n%90)*interval '1 day',now()-(n%7)*interval '1 day' from generate_series(1,$1::integer) n`,[count]);
  await db.exec(`insert into salt_crm.inquiries(client_id,source,campaign,interest,occurred_at,attribution) select id,source,campaign,interest,first_contact_at,jsonb_build_object('campaign_id',campaign,'ad_id','ad-'||campaign) from salt_crm.clients;
    insert into salt_crm.inquiries(client_id,source,campaign,interest,occurred_at) select id,source,campaign,interest,last_contact_at from salt_crm.clients where region='Бишкек';
    insert into salt_crm.sales(client_id,amount,source,campaign,request_id,sold_at) select id,1500,source,campaign,gen_random_uuid(),last_contact_at from salt_crm.clients where campaign in ('Кампания 0','Кампания 5');analyze;`);
}
