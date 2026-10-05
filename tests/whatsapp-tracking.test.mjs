/* global localStorage, sessionStorage */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {trackedWhatsAppUrl} from '../src/lib/whatsapp-tracking.js';
import {saveConsent} from '../src/lib/consent.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
globalThis.localStorage=storage();globalThis.sessionStorage=storage();
globalThis.location={pathname:'/product/test',origin:'https://example.invalid',search:'?utm_source=meta&fbclid=synthetic'};
globalThis.window={location:globalThis.location,dispatchEvent:()=>{}};globalThis.document={referrer:'https://example.invalid/'};
test('functional tracking code preserves WhatsApp number/text without unconsented identifiers; failure falls back',async()=>{
 const requests=[];globalThis.fetch=async(_url,init)=>{requests.push(JSON.parse(init.body));return Response.json({code:'SO-AABBCCDDEEFF'})};
 const original='https://wa.me/996998992996?text=Hello';const first=await trackedWhatsAppUrl(original,{product:'Товар'}),url=new URL(first);
 assert.equal(url.pathname,'/996998992996');assert.equal(url.searchParams.get('text'),'Hello\n\nКод обращения: SO-AABBCCDDEEFF');assert.deepEqual(requests[0].attribution,{});assert.equal(requests[0].session_id,null);assert.equal(localStorage.getItem('salt-ordo-visitor-id'),null);
 assert.equal(await trackedWhatsAppUrl(first),first);assert.equal(requests.length,1);
 saveConsent(true,true);sessionStorage.setItem('salt-ordo-session-id','11111111-1111-4111-8111-111111111111');await trackedWhatsAppUrl(original);assert.equal(requests[1].attribution.fbclid,'synthetic');assert.ok(requests[1].session_id);
 saveConsent(false,false);await trackedWhatsAppUrl(original);assert.deepEqual(requests[2].attribution,{});assert.equal(requests[2].session_id,null);
 globalThis.fetch=async()=>{throw Error('offline')};assert.equal(await trackedWhatsAppUrl(original),original);
});
