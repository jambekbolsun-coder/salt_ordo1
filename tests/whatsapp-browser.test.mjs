/* global window */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSignupEvent,startSignup} from '../src/lib/whatsapp-signup.js';
const listeners=new Map();let loginCallback,loginOptions,requests=[];
globalThis.window={addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n),FB:{login:(cb,opts)=>{loginCallback=cb;loginOptions=opts}}};
globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);requests.push(b);return Response.json(b.action==='exchange'?{ok:true}:{state:'connected'})};
const event=(name='FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',origin='https://www.facebook.com')=>({origin,source:{},data:{type:'WA_EMBEDDED_SIGNUP',event:name,data:{waba_id:'123456789'}}});
test('SDK events reject foreign origins/self; successful signup handles event before OAuth code and clears listener',async()=>{
 assert.equal(parseSignupEvent(event(undefined,'https://facebook.com.evil.invalid')),null);assert.equal(parseSignupEvent({...event(),source:window}),null);
 requests=[];let done;const completion=new Promise(r=>{done=r});startSignup({configId:'12345'},'test-state',()=>{},done,e=>assert.fail(e));
 assert.equal(loginOptions.extras.featureType,'whatsapp_business_app_onboarding');assert.equal(loginOptions.extras.sessionInfoVersion,'3');assert.equal(loginOptions.response_type,'code');
 listeners.get('message')(event());const response={authResponse:{code:'one-time-synthetic'}};loginCallback(response);assert.equal(response.authResponse.code,undefined);assert.equal((await completion).state,'connected');assert.equal(requests[0].action,'exchange');assert.equal(requests[1].action,'complete');assert.equal(listeners.has('message'),false);
});
test('ordinary Cloud API finish, cancellation, Meta error and incomplete OAuth stop setup',()=>{
 for(const name of ['FINISH','CANCEL','ERROR']){let error='';startSignup({configId:'12345'},'s',()=>{},()=>assert.fail(),e=>{error=e});listeners.get('message')(event(name));assert.ok(error);assert.equal(listeners.has('message'),false)}
 let error='';startSignup({configId:'12345'},'s',()=>{},()=>assert.fail(),e=>{error=e});loginCallback({});assert.ok(error);
 const stop=startSignup({configId:'12345'},'s',()=>{},()=>assert.fail(),()=>assert.fail());stop();assert.equal(listeners.has('message'),false);
});
