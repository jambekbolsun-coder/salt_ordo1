import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite()
const actor = '11111111-1111-4111-8111-111111111111'
const staff = '22222222-2222-4222-8222-222222222222'
async function api(operation, payload = {}) {
  return (await db.query('select public.salt_crm_api($1,$2::jsonb,$3::uuid) as value', [operation,JSON.stringify(payload),actor])).rows[0].value
}
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key);
  create table public.staff(id uuid primary key,user_id uuid references auth.users(id),full_name text, email text,role text,is_active boolean);
  create table public.leads(id uuid primary key default gen_random_uuid(),customer_name text,phone text,product_name text,message text,created_at timestamptz default now());
  insert into auth.users values('${actor}'); insert into public.staff values('${staff}','${actor}','Test owner','test@example.invalid','owner',true);`)
  await db.exec(await readFile(new URL('../supabase/migrations/20261004083302_crm_workspace.sql',import.meta.url),'utf8'))
  await db.exec(await readFile(new URL('../supabase/migrations/20261004083305_crm_reports.sql',import.meta.url),'utf8'))
  await db.exec("create function public.bootstrap_first_owner(text) returns void language sql as 'select';")
  await db.exec(await readFile(new URL('../supabase/migrations/20261004084244_crm_security_refinements.sql',import.meta.url),'utf8'))
})
after(()=>db.close())
test('normalization, duplicate inquiry, idempotency, audit and pagination', async () => {
  const data={full_name:'Тест Айжан',phone:'0555 111 222',source:'manual',region:'Бишкек',campaign:'Весна',outcome:'new',request_id:'33333333-3333-4333-8333-333333333333'}
  const first=await api('create',data)
  assert.equal(first.duplicate,false)
  assert.equal((await api('create',data)).replayed,true)
  const repeat=await api('create',{...data,phone:'+996555111222',request_id:'44444444-4444-4444-8444-444444444444'})
  assert.equal(repeat.id,first.id)
  assert.equal(repeat.duplicate,true)
  const list=await api('list',{q:'Айжан',region:'Бишкек',campaign:'Весна',source:'manual',limit:1,page:1})
  assert.equal(list.total,1); assert.equal(list.items[0].inquiry_count,2)
  assert.equal(list.items[0].phone,'+996555111222')
  assert.equal((await api('list',{q:"' OR 1=1 --"})).total,0)
  assert.equal((await api('list',{region:'Ош'})).total,0)
  const detail=await api('detail',{id:first.id})
  await assert.rejects(api('update',{...detail.client,version:0}),/Conflict/)
  await api('update',{...detail.client,full_name:'Айжан Обновлено'})
  await api('sale',{id:first.id,amount:'1500.50',request_id:'55555555-5555-4555-8555-555555555555'})
  await api('sale',{id:first.id,amount:'1500.50',request_id:'55555555-5555-4555-8555-555555555555'})
  assert.equal((await api('list',{sale:'yes'})).items[0].sale_total,1500.5)
  await api('note',{id:first.id,body:'Проверочная заметка'})
  assert.equal((await api('detail',{id:first.id})).notes.length,1)
  await api('archive',{id:first.id})
  assert.equal((await api('list')).total,0)
  assert.equal((await api('list',{archived:'yes'})).total,1)
  await api('restore',{id:first.id})
  assert.equal((await api('list')).total,1)
})
test('anonymous and inactive users cannot call CRM', async () => {
  await assert.rejects(db.query('select public.salt_crm_api($1,$2,$3)', ['list','{}','66666666-6666-4666-8666-666666666666']),/Forbidden/)
  await db.query('update public.staff set is_active=false where user_id=$1',[actor])
  await assert.rejects(api('list'),/Forbidden/)
  await db.query("update public.staff set is_active=true,role='manager' where user_id=$1",[actor])
  await assert.rejects(api('list'),/Forbidden/)
  await db.query("update public.staff set role='owner' where user_id=$1",[actor])
  await db.exec('set role anon')
  await assert.rejects(db.query("select public.salt_crm_api('list','{}',null)"),/permission denied/)
  await assert.rejects(db.query('select * from salt_crm.clients'),/permission denied/)
  await db.exec('reset role')
})
test('durable limiter allows ten requests and rejects eleventh', async () => {
  for(let i=0;i<10;i++) assert.equal((await db.query("select public.salt_crm_rate_limit('test',10,1) as r")).rows[0].r.allowed,true)
  const denied=(await db.query("select public.salt_crm_rate_limit('test',10,1) as r")).rows[0].r
  assert.equal(denied.allowed,false); assert.equal(denied.retry_after,1)
})
test('legacy leads atomically create CRM inquiry and preserve invalid leads', async () => {
  await db.query('insert into public.leads(customer_name,phone) values($1,$2)', ['Сайт','0700123456'])
  assert.equal((await api('list',{source:'website'})).total,1)
  await db.query('insert into public.leads(customer_name,phone) values($1,$2)', ['Без номера','wrong'])
  assert.equal((await db.query('select count(*)::int as n from salt_crm.import_issues')).rows[0].n,1)
})
test('reports include repeats and sales in event period, previous comparison and void exclusion', async()=>{
  const id=(await api('list',{q:'Айжан'})).items[0].id
  await db.query("update salt_crm.clients set first_contact_at='2026-09-01T06:00:00Z' where id=$1",[id])
  await db.query("update salt_crm.inquiries set occurred_at='2026-09-01T06:00:00Z' where client_id=$1",[id])
  await db.query("update salt_crm.sales set sold_at='2026-10-02T06:00:00Z' where client_id=$1",[id])
  await api('inquiry',{full_name:'Айжан',phone:'+996555111222',source:'manual',occurred_at:'2026-10-02T06:00:00Z',request_id:'77777777-7777-4777-8777-777777777777'})
  const query=()=>db.query('select public.salt_crm_reports($1,$2) as report',[JSON.stringify({from:'2026-10-01',to:'2026-10-03',source:'manual'}),actor])
  const r=(await query()).rows[0].report
  assert.equal(r.current.new_clients,0);assert.equal(r.current.inquiries,1);assert.equal(r.current.repeat_inquiries,1)
  assert.equal(r.current.sales,1);assert.equal(r.current.revenue,1500.5);assert.equal(r.current.average_sale,1500.5)
  assert.equal(r.previous.revenue,0);assert.equal(r.previous_from,'2026-09-28');assert.equal(r.current.sources.find(s=>s.code==='manual').revenue,1500.5)
  const sale=(await api('detail',{id})).sales[0]
  await api('void_sale',{id,sale_id:sale.id,reason:'Test cancellation'})
  assert.equal((await query()).rows[0].report.current.revenue,0)
  assert.equal((await api('detail',{id})).client.outcome,'interested')
})

test('checkout saves order and lead atomically and replays the same request once', async()=>{
  await db.exec(`alter table public.leads add column source text, add column email text;
    create table public.orders(id uuid primary key);
    create table public.order_items(order_id uuid, product_name text);
    create function public.create_public_order(text,text,text,text,text,text,jsonb)
    returns table(order_id uuid,order_number text,total_amount numeric,has_request_price boolean)
    language plpgsql as $$ declare v_id uuid:=gen_random_uuid(); begin
      insert into public.orders values(v_id);
      insert into public.order_items values(v_id,'Тестовый товар');
      return query select v_id,'TEST'::text,100::numeric,false;
    end $$;`)
  await db.exec(await readFile(new URL('../supabase/migrations/20261004085121_crm_atomic_checkout.sql',import.meta.url),'utf8'))
  const payload={request_id:'88888888-8888-4888-8888-888888888888',p_customer_name:'Заказ',p_phone:'+996700333444',p_city:'Ош',p_items:[]}
  const order=()=>db.query('select public.salt_crm_public_order($1) as r',[JSON.stringify(payload)])
  const first=(await order()).rows[0].r
  assert.deepEqual((await order()).rows[0].r,first)
  assert.equal((await db.query('select count(*)::int n from public.orders')).rows[0].n,1)
  assert.equal((await api('list',{q:'700333444'})).items[0].inquiry_count,1)
  await db.exec("alter table public.leads add constraint reject_test check(customer_name <> 'FAIL')")
  payload.request_id='99999999-9999-4999-8999-999999999999';payload.p_customer_name='FAIL'
  await assert.rejects(order(),/reject_test/)
  assert.equal((await db.query('select count(*)::int n from public.orders')).rows[0].n,1)
})

test('cutover closes direct writes and pause/resume preserves CRM records', async()=>{
  for(const signature of ['create_public_lead(text,text,text,text,text,uuid,uuid,uuid,uuid)','start_public_quiz(uuid,uuid,text)','save_public_quiz_answer(uuid,uuid,uuid,text,text)','complete_public_quiz(uuid,uuid,uuid,text[])','dismiss_public_quiz(uuid,uuid,uuid)','track_public_event(uuid,uuid,text,text,uuid,text,jsonb)'])
    await db.exec(`create function public.${signature} returns void language sql as 'select';`)
  const cutover=await readFile(new URL('../supabase/migrations/20261004090600_crm_public_api_cutover.sql',import.meta.url),'utf8')
  await db.exec(cutover)
  const permission=()=>db.query("select has_function_privilege('anon','public.start_public_quiz(uuid,uuid,text)','execute') as allowed")
  assert.equal((await permission()).rows[0].allowed,false)
  const before=(await api('list',{archived:'all'})).total
  await db.exec(await readFile(new URL('../supabase/rollback/crm_pause.sql',import.meta.url),'utf8'))
  assert.equal((await db.query('select count(*)::int n from salt_crm_preserved.clients')).rows[0].n,before)
  assert.equal((await permission()).rows[0].allowed,true)
  await db.exec(await readFile(new URL('../supabase/rollback/crm_resume.sql',import.meta.url),'utf8'))
  await db.exec(cutover)
  assert.equal((await api('list',{archived:'all'})).total,before)
  assert.equal((await permission()).rows[0].allowed,false)
})
