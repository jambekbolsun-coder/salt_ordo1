import { test,before,after } from 'node:test';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import handler from '../api/index.mjs';
import { database } from './helpers/database.mjs';
import { transport } from './helpers/transport.mjs';
let db,server,network,base,cookie='';
const headers={Origin:'http://localhost:5173','X-Salt-Request':'1','Content-Type':'application/json'};
before(async()=>{db=await database();network=transport(db);server=createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`});
after(async()=>{network?.restore();await new Promise(resolve=>server?.close(resolve));await db?.close()});
const resetRate=()=>db.exec('truncate salt_crm.rate_limits');
async function request(route,body,query=''){return network.fetch(`${base}/api/index?route=${route}&${query}`,{method:body===undefined?'GET':'POST',headers:{...headers,Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)})}
async function login(){const response=await request('login',{email:'owner@example.invalid',password:'Isolated-test-2026!'});cookie=response.headers.get('set-cookie').split(';')[0];return response.json()}
test('actual HTTP handler: anonymous denial, CSRF, health, durable 10/s and Retry-After',async()=>{
 assert.equal((await request('clients')).status,401);
 assert.deepEqual(await (await request('health')).json(),{status:'ok'});
 const foreign=await network.fetch(`${base}/api/index?route=login`,{method:'POST',headers:{...headers,Origin:'https://foreign.invalid'},body:'{}'});assert.equal(foreign.status,403);
 await resetRate();const responses=await Promise.all(Array.from({length:11},()=>request('tracking-config')));
 assert.equal(responses.filter(r=>r.status===200).length,10);const limited=responses.find(r=>r.status===429);assert.equal(limited.headers.get('retry-after'),'1');
});
test('actual HTTP CRUD, combined filters, sale, export, archive and session logout',async()=>{
 await resetRate();await login();
 const input={full_name:'Синтетический HTTP',phone:'0900111222',source:'manual',region:'Ош',campaign:'Test',request_id:randomUUID()};
 const created=await (await request('create',input)).json();assert.ok(created.id);
 const duplicate=await (await request('create',{...input,phone:'+996900111222',request_id:randomUUID()})).json();assert.equal(duplicate.id,created.id);assert.equal(duplicate.duplicate,true);
 const detail=await (await request('client',undefined,`id=${created.id}`)).json();assert.equal(detail.inquiry_count,2);
 assert.equal((await request('update',{...detail.client,full_name:'Изменённый HTTP'})).status,200);
 assert.equal((await request('note',{id:created.id,body:'Синтетическая заметка'})).status,200);
 assert.equal((await request('sale',{id:created.id,amount:'1200.50',request_id:randomUUID()})).status,200);
 await resetRate();
 const list=await (await request('clients',undefined,'q=HTTP&region='+encodeURIComponent('Ош')+'&campaign=Test&sale=yes&sort=amount&limit=1')).json();assert.equal(list.total,1);assert.equal(list.items[0].sale_total,1200.5);
 const report=await (await request('reports')).json();assert.equal(report.current.revenue,1200.5);
 const exported=await request('export');assert.match(exported.headers.get('content-type'),/csv/);assert.match(await exported.text(),/Изменённый/);
 assert.equal((await request('archive',{id:created.id})).status,200);assert.equal((await (await request('clients')).json()).total,0);
 await request('logout',{});assert.equal((await request('clients')).status,401);
});
test('MFA with simulated Auth provider: wrong code denied, AAL1 blocks CRM and proxy, AAL2 succeeds, sessions rotate',async()=>{
 await resetRate();assert.equal((await login()).mfa.required,false);
 const enroll=await (await request('mfa',{operation:'enroll',password:'Isolated-test-2026!'})).json();assert.ok(enroll.id);
 const beforeCookie=cookie;
 const verified=await request('mfa',{operation:'verify',factor_id:enroll.id,code:'123456'});assert.equal(verified.status,200);cookie=verified.headers.get('set-cookie').split(';')[0];assert.notEqual(cookie,beforeCookie);
 await request('logout',{});await resetRate();assert.equal((await login()).mfa.required,true);
 for(const route of ['clients','reports','proxy','security','password']){const r=await request(route,route==='password'?{password:'Not-used-here!'}:undefined);assert.equal(r.status,403);assert.equal((await r.json()).code,'MFA_REQUIRED')}
 await resetRate();assert.equal((await request('mfa',{operation:'verify',factor_id:enroll.id,code:'000000'})).status,422);
 const confirmed=await request('mfa',{operation:'verify',factor_id:enroll.id,code:'123456'});assert.equal(confirmed.status,200);cookie=confirmed.headers.get('set-cookie').split(';')[0];assert.equal((await request('clients')).status,200);
 const sessions=await (await request('security')).json();assert.ok(sessions.length);assert.ok(!JSON.stringify(sessions).includes('tokens'));
});
