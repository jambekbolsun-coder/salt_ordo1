/* global localStorage, window */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveConsent } from '../src/lib/consent.js';
import { measure,revokeProviders } from '../src/lib/measurement.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
const scripts=[],requests=[];
globalThis.localStorage=storage();globalThis.sessionStorage=storage();
globalThis.window={location:{pathname:'/catalog',origin:'https://example.invalid',hostname:'example.invalid',search:''},dispatchEvent:()=>{}};
globalThis.document={referrer:'',cookie:'',getElementById:id=>scripts.find(s=>s.id===id),createElement:()=>({}),head:{append:s=>scripts.push(s)}};
globalThis.fetch=async(url,init)=>{requests.push({url,init});return new Response(JSON.stringify(url.includes('tracking-config')?{ga4:'G-TESTONLY',meta:'1234567890'}:{accepted:true}),{status:200})};
test('browser providers remain blocked before consent, separate categories, shared IDs and withdrawal',async()=>{
 await measure('page_view');assert.equal(scripts.length,0);assert.equal(requests.length,0);
 saveConsent(true,false);await measure('page_view',{path:'/catalog?private=secret'});
 assert.equal(scripts.length,1);assert.equal(scripts[0].id,'salt-ga4');assert.equal(requests.filter(r=>r.url.includes('telemetry')).length,0);
 assert.ok(!JSON.stringify(window.dataLayer).includes('secret'));
 saveConsent(false,true);revokeProviders();const gaEvents=window.dataLayer.filter(a=>a[0]==='event').length;
 const id='11111111-1111-4111-8111-111111111111';await measure('lead_submit',{eventId:id,metadata:{email:'secret'}});
 assert.equal(window.dataLayer.filter(a=>a[0]==='event').length,gaEvents);
 const pixel=window.fbq.queue.find(a=>a[1]==='Lead');assert.equal(pixel[3].eventID,id);
 const payload=JSON.parse(requests.find(r=>r.url.includes('telemetry')).init.body);assert.equal(payload.event_id,id);assert.ok(!JSON.stringify(payload).includes('secret'));
 saveConsent(false,false);revokeProviders();const before=requests.length;await measure('page_view');assert.equal(requests.length,before);assert.equal(window.fbq.queue.at(-1)[1],'revoke');
 assert.equal(localStorage.getItem('salt-ordo-visitor-id'),null);
});
