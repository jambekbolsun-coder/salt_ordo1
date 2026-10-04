import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { database,seed,api,call,actor } from '../tests/helpers/database.mjs';
import { csv } from '../server/validation.mjs';
const db=await database();
try{
 await seed(db,10000);
 const measurements=[];
 async function measure(name,fn,runs=7){await fn();const times=[];for(let i=0;i<runs;i++){const start=performance.now();await fn();times.push(performance.now()-start)}times.sort((a,b)=>a-b);const row={operation:name,runs,median_ms:+times[Math.floor(runs/2)].toFixed(2),p95_ms:+times[Math.ceil(runs*.95)-1].toFixed(2)};measurements.push(row);console.log(JSON.stringify(row))}
 for(const [name,filter] of [['list',{}],['page_200',{page:200}],['name_search',{q:'клиент 099'}],['phone_search',{q:'900009999'}],['combined_filters',{region:'Бишкек',source:'meta_ads',campaign:'Кампания 0',responsible_id:'22222222-2222-4222-8222-222222222222',sale:'yes'}],['sort_amount',{sort:'amount'}],['sort_activity',{sort:'activity'}],['attribution_filter',{ad_id:'ad-Кампания 0'}]])await measure(name,()=>api(db,'list',filter));
 await measure('report_90_days',()=>call(db,'salt_crm_reports',{p_actor:actor,p_payload:{from:'2026-07-01',to:'2026-10-04'}}));
 await measure('export_10000_csv',async()=>{let count=0,bytes=0;for(let page=1;page<=20;page++){const r=await call(db,'salt_crm_export',{p_payload:{page},p_actor:actor});count+=r.length;bytes+=Buffer.byteLength(csv(r,[['full_name','ФИО'],['phone','Телефон'],['sale_total','Сумма']]));}assert.equal(count,10000);assert.ok(bytes>10000)},3);
 await measure('duplicate_phone',async()=>{const result=await api(db,'create',{full_name:'Синтетический повтор',phone:'0900009999',source:'manual',request_id:randomUUID()});assert.equal(result.duplicate,true)});
 const key=randomUUID();for(let n=0;n<10;n++)assert.equal((await call(db,'salt_crm_rate_limit',{p_key:key,p_limit:10,p_seconds:1})).allowed,true);
 const limit=await call(db,'salt_crm_rate_limit',{p_key:key,p_limit:10,p_seconds:1});assert.equal(limit.allowed,false);assert.equal(limit.retry_after,1);
 const report={recorded_at:new Date().toISOString(),engine:'PGlite isolated in-memory PostgreSQL; no network or production data',clients:10000,initial_inquiries:15000,sales:2000,rate_limit:'10 allowed; 11th rejected; retry_after=1',node:process.version,platform:process.platform,measurements};
 await writeFile(new URL('../docs/load-test.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}finally{await db.close()}
