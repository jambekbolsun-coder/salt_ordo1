import { randomBytes,randomUUID } from 'node:crypto';
import { actor,staff,call } from './database.mjs';
export function transport(db){
 const original=globalThis.fetch, factors=[],tokens=new Map();
 Object.assign(process.env,{NODE_ENV:'development',SALT_SUPABASE_URL:'http://salt-test.invalid',SALT_SUPABASE_PUBLISHABLE_KEY:'isolated-test-only',SALT_GATEWAY_SECRET:'isolated-test-only',SALT_SESSION_KEY:randomBytes(32).toString('base64'),SALT_APP_ORIGIN:'http://localhost:5173'});
 for(const name of ['VERCEL','SALT_META_ACCESS_TOKEN','SALT_META_PIXEL_ID','SALT_GA4_MEASUREMENT_ID','SALT_MONITORING_WEBHOOK_URL'])delete process.env[name];
 const user=()=>({id:actor,email:'owner@example.invalid',factors:structuredClone(factors)});
 const auth=(aal='aal1')=>{const access=`fixture.${Buffer.from(JSON.stringify({aal,nonce:randomUUID()})).toString('base64url')}.fixture`;tokens.set(access,aal);return {access_token:access,refresh_token:access,expires_in:3600,user:user()}};
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 async function fixture(input,init={}){
  const url=new URL(String(input));
  if(url.hostname!=='salt-test.invalid')throw new Error('External network is disabled in the isolated fixture');
  const body=init.body?JSON.parse(init.body):{}, headers=new Headers(init.headers),token=headers.get('authorization')?.replace('Bearer ','');
  try{
   if(url.pathname==='/functions/v1/crm-gateway')return json(await call(db,body.rpc,body.payload));
   if(url.pathname==='/auth/v1/token'){
    if(url.searchParams.get('grant_type')==='refresh_token'&&tokens.has(body.refresh_token))return json(auth(tokens.get(body.refresh_token)));
    return body.email==='owner@example.invalid'&&body.password==='Isolated-test-2026!'?json(auth()):json({error:'invalid_credentials'},401);
   }
   if(url.pathname.startsWith('/auth/')){
    if(!tokens.has(token))return json({error:'unauthorized'},401);
    if(url.pathname==='/auth/v1/user')return json(user());
    if(url.pathname==='/auth/v1/logout'){tokens.delete(token);return json({})}
    if(url.pathname==='/auth/v1/factors'){const id=randomUUID();factors.push({id,factor_type:'totp',status:'unverified'});return json({id,totp:{qr_code:'<svg xmlns="http://www.w3.org/2000/svg"/>',secret:'TEST-FIXTURE-NOT-A-REAL-TOTP-SECRET'}})}
    const id=url.pathname.split('/')[4],factor=factors.find(f=>f.id===id);
    if(!factor)return json({},404);
    if(url.pathname.endsWith('/challenge'))return json({id:'fixture-challenge'});
    if(url.pathname.endsWith('/verify')){if(body.code!=='123456')return json({},422);factor.status='verified';return json(auth('aal2'))}
    if(init.method==='DELETE'){factors.splice(factors.indexOf(factor),1);return json({})}
   }
   if(url.pathname==='/rest/v1/staff')return json([{id:staff,user_id:actor,email:'owner@example.invalid',full_name:'Тестовый владелец',role:'owner',is_active:true}]);
   if(url.pathname.startsWith('/rest/v1/'))return json([]);
   return json({},404);
  }catch(error){return json({code:error.code||'XX000'},400)}
 }
 globalThis.fetch=fixture;
 return {fetch:original,restore:()=>{globalThis.fetch=original},factors};
}
