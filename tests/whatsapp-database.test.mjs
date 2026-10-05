import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {database,api,call,actor} from './helpers/database.mjs';
import {wa,message,payload,connection,deliver} from './helpers/whatsapp.mjs';
import {normalizeWebhook} from '../server/whatsapp-payload.mjs';
let db,cid;before(async()=>{db=await database();await connection(db)});after(()=>db?.close());
test('new incoming message creates existing CRM client/inquiry atomically, no legacy lead',async()=>{
 assert.equal((await deliver(db,payload([message('new')]))).failed,0);
 const list=await api(db,'list',{});assert.equal(list.total,1);cid=list.items[0].id;
 const d=await api(db,'detail',{id:cid});assert.equal(d.client.phone,'+996900555111');assert.equal(d.client.source,'whatsapp');assert.equal(d.inquiry_count,1);assert.equal(d.inquiries[0].external_provider,'whatsapp');
 assert.equal((await db.query('select count(*) n from public.leads')).rows[0].n,0);
});
test('replayed and concurrently enqueued webhooks create one message/inquiry; normalized phone reuses client',async()=>{
 const event=payload([message('parallel')]);
 await Promise.all(Array.from({length:8},()=>deliver(db,event)));
 assert.equal((await api(db,'detail',{id:cid})).inquiry_count,2);
 assert.equal((await api(db,'list',{})).total,1);
 assert.equal((await db.query("select count(*) n from salt_crm.whatsapp_messages where message_id='parallel'")).rows[0].n,1);
});
test('official ad referral wins, website code is stripped, first source remains unchanged',async()=>{
 await wa(db,'click',{code:'SO-AABBCCDDEEFF',page:'/product/test',product:'Тестовый товар',attribution:{utm_campaign:'Синтетическая кампания'}},null);
 await deliver(db,payload([message('web',{text:{body:'Хочу товар\nКод обращения: SO-AABBCCDDEEFF'}})]));
 await deliver(db,payload([message('ad',{text:{body:'Код обращения: SO-AABBCCDDEEFF'},referral:{source_type:'ad',source_id:'12345',ctwa_clid:'synthetic-click',headline:'Тест'}})]));
 const d=await api(db,'detail',{id:cid}),web=d.inquiries.find(i=>i.external_id==='web'),ad=d.inquiries.find(i=>i.external_id==='ad');
 assert.equal(web.source,'website');assert.equal(web.message,'Хочу товар');assert.equal(web.attribution.landing_page,'/product/test');assert.equal(ad.source,'meta_ads');assert.equal(ad.attribution.ad_id,'12345');assert.equal(d.client.source,'whatsapp');
 assert.equal((await api(db,'list',{wa_source:'website',q:'555111'})).total,1);
 await deliver(db,payload([message('other-phone',{from:'996900555222',text:{body:'SO-AABBCCDDEEFF'}})]));
 assert.equal((await db.query("select source from salt_crm.whatsapp_messages where message_id='other-phone'")).rows[0].source,'whatsapp');
});
test('echoes and historical messages appear without inflating new inquiry counts, media/unknown types survive',async()=>{
 const before=(await api(db,'detail',{id:cid})).inquiry_count;
 await deliver(db,payload([message('echo',{from:'996998992996',to:'996900555111',type:'image',image:{id:'media-fixture',caption:'Фото',mime_type:'image/jpeg'},text:undefined})],'smb_message_echoes'));
 await deliver(db,payload([],'history',{history:[{metadata:{phase:0,progress:100},threads:[{id:'996900555111',messages:[message('history',{timestamp:'1700000000'}),message('history-out',{from:'996998992996',timestamp:'1700000001'})]}]}]}));
 assert.equal((await api(db,'detail',{id:cid})).inquiry_count,before);
 const msgs=await wa(db,'messages',{client_id:cid});assert.equal(msgs.items.find(m=>m.message_id==='echo').direction,'out');assert.equal(msgs.items.find(m=>m.message_id==='echo').details.media_id,'media-fixture');assert.equal(msgs.items.find(m=>m.message_id==='history-out').direction,'out');
 await deliver(db,payload([message('future',{type:'future_type',text:undefined})]));assert.equal((await api(db,'detail',{id:cid})).inquiry_count,before+1);
});
test('statuses work before message and never downgrade read; contacts do not create clients',async()=>{
 await deliver(db,payload([],'messages',{statuses:[{id:'status-first',status:'read',timestamp:'1750000000'}]}));
 await deliver(db,payload([message('status-first')]));
 await deliver(db,payload([],'messages',{statuses:[{id:'status-first',status:'delivered',timestamp:'1760000000'}]}));
 assert.equal((await db.query("select delivery_status from salt_crm.whatsapp_messages where message_id='status-first'")).rows[0].delivery_status,'read');
 const count=(await api(db,'list',{})).total;
 await deliver(db,payload([],'smb_app_state_sync',{state_sync:[{type:'contact',action:'add',contact:{phone_number:'996900777555',full_name:'Изолированный контакт'}}]}));assert.equal((await api(db,'list',{})).total,count);
});
test('first-contact attribution on a new ad client, sale linkage and honest conversion reports',async()=>{
 await deliver(db,payload([message('ad-new',{from:'996900123123',referral:{source_type:'ad',source_id:'67890'}})]));
 const client=(await api(db,'list',{q:'123123'})).items[0],d=await api(db,'detail',{id:client.id});assert.equal(d.client.source,'meta_ads');assert.equal(d.client.attribution.ad_id,'67890');
 await api(db,'sale',{id:client.id,amount:500,request_id:randomUUID(),inquiry_id:d.inquiries[0].id});
 await assert.rejects(api(db,'sale',{id:cid,amount:1,request_id:randomUUID(),inquiry_id:d.inquiries[0].id}),/Invalid inquiry/);
 const r=await call(db,'salt_crm_reports',{p_actor:actor,p_payload:{}});assert.ok(r.current.wa_inquiries>0);assert.ok(r.current.wa_inquiry_conversion>0);assert.equal(r.current.ads.find(a=>a.name==='67890').inquiries,1);
});
test('private token tables/RPC deny browser roles, admin cannot connect or see technical IDs',async()=>{
 const admin=randomUUID();await db.query("insert into auth.users values($1);",[admin]);await db.query("insert into public.staff(id,user_id,full_name,role,is_active) values($1,$2,'Тестовый администратор','admin',true)",[randomUUID(),admin]);
 await assert.rejects(wa(db,'prepare',{state_hash:'test',session_hash:'test'},admin),/Forbidden/);
 const messages=await wa(db,'messages',{client_id:cid},admin);assert.equal(messages.items[0].message_id,undefined);assert.equal(messages.items[0].waba_id,undefined);
 const s=await wa(db,'status',{},admin);assert.equal(s.token_box,undefined);assert.equal(s.waba_id,undefined);
 for(const role of ['anon','authenticated']){
  assert.equal((await db.query("select has_function_privilege($1,'public.salt_crm_whatsapp(text,jsonb,uuid)','execute') ok",[role])).rows[0].ok,false);
  assert.equal((await db.query("select has_table_privilege($1,'salt_crm.whatsapp_connection','select') ok",[role])).rows[0].ok,false);
 }
});
test('state is session/owner-bound, expiring, single-use; failed processing is retryable',async()=>{
 await wa(db,'prepare',{state_hash:'hash-state',session_hash:'session'});
 await assert.rejects(wa(db,'claim',{state_hash:'hash-state',session_hash:'wrong'}),/Invalid state/);
 await wa(db,'claim',{state_hash:'hash-state',session_hash:'session'});
 await assert.rejects(wa(db,'claim',{state_hash:'hash-state',session_hash:'session'}),/already used/);
 await db.exec("update salt_crm.whatsapp_signup set expires_at=now()-interval '1 second'");await assert.rejects(wa(db,'pending',{state_hash:'hash-state',session_hash:'session'}),/Invalid state/);
 const events=normalizeWebhook(payload([message('retry')])) ;events[0].phone='bad';const keys=await wa(db,'enqueue',{events},null);assert.equal((await wa(db,'process',{keys},null)).failed,1);
 await db.query("update salt_crm.whatsapp_events set payload=jsonb_set(payload,'{phone}','\"+996900555111\"') where key=$1",[keys[0]]);assert.equal((await wa(db,'retry')).failed,0);
});
test('migration repeat is non-destructive; account disconnection clears encrypted credentials',async()=>{
 const before=(await api(db,'list',{})).total;
 await db.exec(await readFile(new URL('../supabase/migrations/20261005134208_whatsapp_coexistence.sql',import.meta.url),'utf8'));assert.equal((await api(db,'list',{})).total,before);
 await deliver(db,payload([],'account_update',{event:'PARTNER_REMOVED'}));const c=await wa(db,'connection',{},null);assert.equal(c.state,'disconnected');assert.deepEqual(c.token_box,{});
});
