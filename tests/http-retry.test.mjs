import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRead } from '../src/lib/http.js';
test('safe reads honor Retry-After once; writes are not replayed; abort cancels retry',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('{}',{status:429,headers:{'Retry-After':'1'}})};
 try{
  assert.equal((await fetchRead('/test',{method:'POST'})).status,429);assert.equal(calls,1);
  calls=0;const start=Date.now();assert.equal((await fetchRead('/test')).status,429);assert.equal(calls,2);assert.ok(Date.now()-start>=1000);
  calls=0;const controller=new AbortController();controller.abort();await assert.rejects(fetchRead('/test',{signal:controller.signal}),e=>e.name==='AbortError');assert.equal(calls,1);
 }finally{globalThis.fetch=original}
});
