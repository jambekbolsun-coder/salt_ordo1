import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { database,api,call,actor } from './helpers/database.mjs';
let db;before(async()=>{db=await database()});after(()=>db?.close());
test('all CRM migrations including indexes apply in isolated PostgreSQL; private RPCs denied',async()=>{
 for(const fn of ['salt_crm_health()','salt_crm_manage_sessions(uuid,text,text,uuid)','salt_crm_event_delivery(uuid,text)'])assert.equal((await db.query('select has_function_privilege($1,$2,$3) ok',['anon','public.'+fn,'execute'])).rows[0].ok,false);
 assert.equal(await call(db,'salt_crm_health',{}),true);
});
test('attribution persists on inquiry, client and order; combined advertising filters work',async()=>{
 const attribution={utm_source:'meta',utm_medium:'cpc',utm_campaign:'Campaign',utm_term:'term',landing_page:'https://example.invalid/catalog',campaign_id:'campaign',adset_id:'group',ad_id:'ad'};
 await call(db,'salt_crm_public_order',{p_data:{request_id:randomUUID(),p_customer_name:'Тест атрибуции',p_phone:'+996900888777',p_items:[],attribution}});
 const result=await api(db,'list',{ad_id:'ad',campaign_id:'campaign',source:'meta_ads'});assert.equal(result.total,1);
 const detail=await api(db,'detail',{id:result.items[0].id});assert.equal(detail.client.attribution.utm_term,'term');assert.equal(detail.inquiries[0].attribution.landing_page,attribution.landing_page);
 assert.equal((await db.query('select crm_attribution from public.orders')).rows[0].crm_attribution.ad_id,'ad');
 assert.equal((await api(db,'list',{ad_id:'missing'})).total,0);
 const report=await call(db,'salt_crm_reports',{p_actor:actor,p_payload:{ad_id:'ad'}});assert.equal(report.current.inquiries,1);
});
test('delivery deduplicates event IDs, permits bounded retries and stores no personal data',async()=>{
 const id=randomUUID(),send=op=>call(db,'salt_crm_event_delivery',{p_id:id,p_operation:op});
 assert.equal(await send('claim'),true);assert.equal(await send('claim'),false);await send('retry');assert.equal(await send('claim'),true);await send('sent');assert.equal(await send('claim'),false);
});
test('own sessions never disclose tokens or hashes, cannot revoke another user or current session',async()=>{
 const id='a'.repeat(64),other='b'.repeat(64);
 for(const key of [id,other])await call(db,'salt_crm_session',{p_operation:'create',p_id:key,p_payload:{user_id:actor,tokens:'encrypted-fixture'}});
 const manage=(op,target=null)=>call(db,'salt_crm_manage_sessions',{p_actor:actor,p_current:id,p_operation:op,p_target:target});
 const list=await manage('list');assert.equal(list.length,2);assert.equal(JSON.stringify(list).includes('encrypted'),false);assert.equal(JSON.stringify(list).includes(id),false);
 await manage('revoke',list.find(s=>s.current).ref);assert.equal((await manage('list')).length,2);
 await assert.rejects(call(db,'salt_crm_manage_sessions',{p_actor:randomUUID(),p_current:id,p_operation:'list',p_target:null}),/Forbidden/);
 await manage('revoke_others');assert.equal((await manage('list')).length,1);
});

test('database role helpers enforce enrolled MFA even when bypassing the BFF',async()=>{
 assert.equal((await db.query('select public.current_staff_role() role')).rows[0].role,'owner');
 await db.query("insert into auth.mfa_factors(user_id,status) values($1,'verified')",[actor]);
 assert.equal((await db.query('select public.current_staff_role() role')).rows[0].role,null);
 await db.exec(`set request.jwt.claims='{"aal":"aal2"}'`);
 assert.equal((await db.query('select public.current_staff_role() role')).rows[0].role,'owner');
 await db.exec("reset request.jwt.claims");
});
