import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversion,measurementConfig } from '../server/measurement.mjs';
import { CONSENT_VERSION,EVENTS,safePath,validConsent } from '../shared/measurement.mjs';
import { assurance,requireAssurance } from '../server/mfa.mjs';
import { errorRecord } from '../server/monitoring.mjs';
const choice={version:CONSENT_VERSION,date:new Date().toISOString(),analytics:false,marketing:true};
test('conversion consent, dedup ID and event mapping; no Purchase or customer metadata',()=>{
 const body={consent:choice,event:'lead_submit',event_id:'11111111-1111-4111-8111-111111111111',path:'/catalog?phone=private',name:'Private',phone:'Private',metadata:{email:'Private'}};
 const event=conversion(body,{headers:{'user-agent':'Test'},socket:{remoteAddress:'127.0.0.1'}});
 assert.equal(event.event_id,body.event_id);assert.equal(event.event_name,'Lead');assert.ok(!JSON.stringify(event).includes('Private'));assert.ok(!event.event_source_url.includes('?'));
 assert.equal(conversion({...body,consent:{...choice,marketing:false}},{headers:{}}),null);
 assert.equal(conversion({...body,consent:{...choice,version:'old'}},{headers:{}}),null);
 assert.throws(()=>conversion({...body,event:'Purchase'},{headers:{}}));assert.ok(!Object.values(EVENTS).flat().includes('Purchase'));
 assert.equal(measurementConfig().ga4,null);assert.equal(measurementConfig().meta,null);
 assert.equal(safePath('/admin/clients/secret'),'/');assert.equal(validConsent({...choice,date:'2099-01-01'}),false);
});
test('MFA is optional without verified factors and mandatory with verified factors and AAL1',()=>{
 const token=aal=>`x.${Buffer.from(JSON.stringify({aal})).toString('base64url')}.signature`;
 assert.equal(assurance({factors:[]},token('aal1')).required,false);
 const user={factors:[{id:'factor',factor_type:'totp',status:'verified'}]};
 const first=assurance(user,token('aal1'));assert.equal(first.required,true);assert.throws(()=>requireAssurance({mfa:first}),e=>e.code==='MFA_REQUIRED');
 assert.equal(assurance(user,token('aal2')).required,false);assert.equal(assurance(user,'invalid').required,true);
 assert.equal(assurance({factors:[{factor_type:'totp',status:'unverified'}]},token('aal1')).required,false);
});
test('monitoring whitelists route and fields; no raw errors or identifiers',()=>{
 const record=errorRecord('/clients?phone=private',503);
 assert.equal(record.route,'other');assert.deepEqual(Object.keys(record).sort(),['at','event','level','request_id','route','status']);assert.ok(!JSON.stringify(record).includes('private'));
});
