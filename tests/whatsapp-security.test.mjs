import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomBytes,createHmac,randomUUID} from 'node:crypto';
import webhook from '../api/whatsapp/webhook.mjs';
import handler from '../api/index.mjs';
import {encryptToken,decryptToken,validSignature} from '../server/whatsapp-crypto.mjs';
import {normalizeWebhook,waPhone} from '../server/whatsapp-payload.mjs';
import {database,actor,staff} from './helpers/database.mjs';
import {transport} from './helpers/transport.mjs';
import {wa,message,payload,connection} from './helpers/whatsapp.mjs';
let db,network,server,base,cookie,metaFailure='',phoneMode='',calls=[];
const csrf={Origin:'http://localhost:5173','X-Salt-Request':'1','Content-Type':'application/json'};
before(async()=>{
 db=await database();network=transport(db);await connection(db);
 Object.assign(process.env,{META_APP_ID:'123456789',META_WHATSAPP_CONFIG_ID:'987654321',WHATSAPP_GRAPH_API_VERSION:'v26.0',META_APP_SECRET:randomBytes(32).toString('hex'),WHATSAPP_WEBHOOK_VERIFY_TOKEN:randomBytes(32).toString('hex'),WHATSAPP_TOKEN_ENCRYPTION_KEY:randomBytes(32).toString('base64')});
 const fixture=globalThis.fetch;
 globalThis.fetch=async(input,init={})=>{
  const u=new URL(String(input));
  if(u.hostname==='graph.facebook.com'){
   calls.push({path:u.pathname,method:init.method,body:new URLSearchParams(init.body),authorization:new Headers(init.headers).get('authorization')});
   assert.equal(u.searchParams.has('access_token'),false);assert.equal(u.searchParams.has('client_secret'),false);assert.equal(u.searchParams.has('code'),false);
   if(metaFailure)return Response.json({error:{code:metaFailure==='revoked'?190:100}},{status:400});
   const phone={id:'987654321',display_phone_number:'+996998992996',verified_name:'Изолированный номер',is_on_biz_app:true,platform_type:'CLOUD_API'};
   if(phoneMode==='ordinary')phone.is_on_biz_app=false;
   if(phoneMode==='other')phone.display_phone_number='+15551234567';
   if(u.pathname.endsWith('/oauth/access_token'))return Response.json({access_token:'synthetic-access-token-not-valid-in-meta'});
   if(u.pathname.endsWith('/phone_numbers'))return Response.json({data:[phone]});
   if(u.pathname.endsWith('/subscribed_apps'))return Response.json({success:true});
   if(u.pathname.endsWith('/smb_app_data'))return Response.json({request_id:'synthetic-sync-'+calls.length});
   if(u.pathname.endsWith('/123456789'))return Response.json({id:'123456789',name:'Изолированный аккаунт'});
   if(u.pathname.endsWith('/987654321'))return Response.json(phone);
   throw Error('Unexpected Graph operation');
  }
  if(u.pathname==='/rest/v1/site_settings')return Response.json([{whatsapp:'+996998992996'}]);
  if(u.pathname==='/rest/v1/staff'){const role=(await db.query('select role from public.staff where id=$1',[staff])).rows[0].role;return Response.json([{id:staff,user_id:actor,role,is_active:true}])}
  return fixture(input,init);
 };
 server=createServer((req,res)=>req.url.startsWith('/api/whatsapp/webhook')?webhook(req,res):handler(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
 const login=await request('login',{email:'owner@example.invalid',password:'Isolated-test-2026!'});cookie=login.headers.get('set-cookie').split(';')[0];
});
after(async()=>{network?.restore();await new Promise(r=>server?.close(r));await db?.close()});
const reset=()=>db.exec('truncate salt_crm.rate_limits');
function request(route,body,query=''){return network.fetch(`${base}/api/index?route=${route}&${query}`,{method:body===undefined?'GET':'POST',headers:{...csrf,Cookie:cookie||''},body:body===undefined?undefined:JSON.stringify(body)})}
function signed(body,signature){const raw=typeof body==='string'?body:JSON.stringify(body);return network.fetch(base+'/api/whatsapp/webhook',{method:'POST',headers:{'Content-Type':'application/json','X-Hub-Signature-256':signature||'sha256='+createHmac('sha256',process.env.META_APP_SECRET).update(raw).digest('hex')},body:raw})}
test('AES-GCM authenticated encryption hides token, rejects tampering and wrong binding/key',()=>{
 const box=encryptToken('synthetic-token','binding');assert.equal(decryptToken(box,'binding'),'synthetic-token');assert.ok(!JSON.stringify(box).includes('synthetic-token'));assert.throws(()=>decryptToken(box,'other'));
 assert.throws(()=>decryptToken({...box,ciphertext:Buffer.from('modified').toString('base64')},'binding'));
});
test('international phone normalization, stable missing-ID hash, malformed/media/unknown payload validation',()=>{
 assert.equal(waPhone('996900111222'),'+996900111222');assert.equal(waPhone('+996900111222'),'+996900111222');assert.equal(waPhone('0900111222'),null);
 const p=payload([message(undefined,{id:undefined,type:'video',video:{id:'fixture',caption:'Видео'}})]);assert.deepEqual(normalizeWebhook(p),normalizeWebhook(JSON.parse(JSON.stringify(p))));assert.equal(normalizeWebhook(p)[0].text,'Синтетическое сообщение');
 assert.throws(()=>normalizeWebhook({object:'other'}));assert.equal(validSignature(Buffer.from('a'),'sha256=x',process.env.META_APP_SECRET),false);
});
test('GET webhook challenge requires constant-time token check and subscribe mode',async()=>{
 await reset();const query=new URLSearchParams({'hub.mode':'subscribe','hub.verify_token':process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,'hub.challenge':'123456'});
 const ok=await network.fetch(base+'/api/whatsapp/webhook?'+query);assert.equal(ok.status,200);assert.equal(await ok.text(),'123456');assert.equal(ok.headers.get('cache-control'),'no-store');
 query.set('hub.verify_token','wrong');assert.equal((await network.fetch(base+'/api/whatsapp/webhook?'+query)).status,403);
});
test('POST validates exact raw-body HMAC, rejects bad signature/oversize, deduplicates, returns 429',async()=>{
 await reset();const p=payload([message('http')]);assert.equal((await signed(p,'sha256='+'0'.repeat(64))).status,401);assert.equal((await signed(p)).status,200);assert.equal((await signed(p)).status,200);
 assert.equal((await db.query("select count(*) n from salt_crm.whatsapp_messages where message_id='http'")).rows[0].n,1);
 assert.equal((await signed('x'.repeat(1024*1024+1))).status,413);
 await reset();let limited;for(let i=0;i<11;i++)limited=await signed(payload([]));assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'1');
});
test('owner check, CSRF and state reject untrusted integration setup',async()=>{
 await reset();await db.query("update public.staff set role='admin' where id=$1",[staff]);assert.equal((await request('whatsapp',{action:'prepare'})).status,403);await db.query("update public.staff set role='owner' where id=$1",[staff]);
 const foreign=await network.fetch(base+'/api/index?route=whatsapp',{method:'POST',headers:{...csrf,Origin:'https://evil.invalid',Cookie:cookie},body:JSON.stringify({action:'prepare'})});assert.equal(foreign.status,403);
 assert.equal((await request('whatsapp',{action:'exchange',state:'A'.repeat(43),code:'bad'})).status,403);
});
test('full Coexistence completion: code exchanged on server, verified real configured number, subscribe and sync without register',async()=>{
 await reset();calls=[];const prepared=await (await request('whatsapp',{action:'prepare'})).json();assert.ok(prepared.state);
 assert.equal((await request('whatsapp',{action:'exchange',state:prepared.state,code:'synthetic-once'})).status,200);
 const completed=await request('whatsapp',{action:'complete',state:prepared.state,event:'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',waba_id:'123456789'});const d=await completed.json();assert.equal(completed.status,200,JSON.stringify(d));assert.equal(d.state,'connected');assert.equal(d.token_box,undefined);
 assert.equal(calls.find(c=>c.path.endsWith('/oauth/access_token')).method,'POST');assert.equal(calls.filter(c=>c.path.endsWith('/smb_app_data')).length,2);assert.ok(calls.every(c=>!/(register|deregister|migrate)/.test(c.path)));
 const stored=await wa(db,'connection',{},null);assert.equal(decryptToken(stored.token_box,'connection:123456789:987654321'),'synthetic-access-token-not-valid-in-meta');
 await reset();calls=[];assert.equal((await request('whatsapp',{action:'check'})).status,200);assert.equal(calls.filter(c=>c.path.endsWith('/smb_app_data')).length,0);
});
test('ordinary Cloud API/test or unrelated phone cannot replace configured Business App number',async()=>{
 for(const mode of ['ordinary','other']){
  await reset();phoneMode=mode;
  const {state}=await (await request('whatsapp',{action:'prepare'})).json();
  assert.equal((await request('whatsapp',{action:'exchange',state,code:'synthetic-code'})).status,200);
  const r=await request('whatsapp',{action:'complete',state,event:'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',waba_id:'123456789'});assert.equal(r.status,400);assert.equal((await r.json()).code,'COEXISTENCE_UNAVAILABLE');
  assert.equal((await wa(db,'connection',{},null)).display_phone,'+996998992996');
 }
 phoneMode='';
});
test('revoked token surfaces safe reconnect error; click attribution refuses unconsented persistent IDs',async()=>{
 await reset();metaFailure='revoked';const bad=await request('whatsapp',{action:'check'});assert.equal(bad.status,400);assert.equal((await wa(db,'status')).error_code,'TOKEN_REVOKED');metaFailure='';
 const click=await (await request('whatsapp-click',{page:'/product/test?email=private',attribution:{fbclid:'not-consented'},session_id:randomUUID()})).json();assert.match(click.code,/^SO-[A-F0-9]{12}$/);
 const stored=(await db.query('select * from salt_crm.whatsapp_clicks where code=$1',[click.code])).rows[0];assert.deepEqual(stored.attribution,{});assert.equal(stored.session_id,null);assert.equal(stored.page,'/product/test');
});
