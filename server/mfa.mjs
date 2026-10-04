import { HttpError, text, uuid } from './validation.mjs';
import { upstream, rpc } from './supabase.mjs';
import { createSession, limit } from './security.mjs';
export function assurance(user, access) {
  let aal='aal1';
  // Called only AFTER Supabase has validated this exact access token with getUser.
  try{aal=JSON.parse(Buffer.from(access.split('.')[1],'base64url').toString()).aal}catch{/* Fail closed for enrolled factors. */}
  const factors=(user.factors||[]).filter(f=>f.factor_type==='totp'&&f.status==='verified').map(f=>({id:f.id,name:f.friendly_name||'Приложение-аутентификатор'}));
  return {required:factors.length>0&&aal!=='aal2',verified:aal==='aal2',factors};
}
export function requireAssurance(who) {
  if(who.mfa.required){const error=new HttpError(403,'Подтвердите вход одноразовым кодом.');error.code='MFA_REQUIRED';throw error}
}
async function verify(who, body) {
  const id=uuid(body.factor_id), code=text(body.code,6,true);
  if(!/^\d{6}$/.test(code))throw new HttpError(400,'Введите шестизначный код.');
  const user=await upstream('/auth/v1/user',{token:who.tokens.access_token});
  if(!(user.factors||[]).some(f=>f.id===id&&f.factor_type==='totp'))throw new HttpError(403,'Фактор не найден.');
  const challenge=await upstream(`/auth/v1/factors/${id}/challenge`,{method:'POST',token:who.tokens.access_token,body:{}});
  return upstream(`/auth/v1/factors/${id}/verify`,{method:'POST',token:who.tokens.access_token,body:{challenge_id:challenge.id,code}});
}
export async function mfaRequest(who, body, req, res) {
  if(req.method==='GET')return who.mfa;
  if(req.method!=='POST')throw new HttpError(405,'Метод запрещён.');
  await limit(res,`mfa:${who.user.id}`,5,60);
  if(body.operation==='verify'){
    const auth=await verify(who,body);
    const identity=await createSession(res,auth);
    await rpc('salt_crm_session',{p_operation:'delete',p_id:who.id,p_payload:{}});
    await rpc('salt_crm_security_event',{p_actor:who.user.id,p_action:'mfa_verified'});
    return identity;
  }
  requireAssurance(who);
  if(body.operation==='enroll'){
    if(who.mfa.factors.length)throw new HttpError(409,'MFA уже подключена.');
    const password=text(body.password,256,true);
    // Password reauthentication is required before showing a new enrollment secret.
    const check=await upstream('/auth/v1/token?grant_type=password',{method:'POST',body:{email:who.user.email,password}});
    if(check.user?.id!==who.user.id)throw new HttpError(403,'Подтвердите пароль.');
    await upstream('/auth/v1/logout?scope=local',{method:'POST',token:check.access_token}).catch(()=>{});
    const user=await upstream('/auth/v1/user',{token:who.tokens.access_token});
    for(const factor of user.factors||[])if(factor.factor_type==='totp'&&factor.status==='unverified')await upstream(`/auth/v1/factors/${factor.id}`,{method:'DELETE',token:who.tokens.access_token});
    const factor=await upstream('/auth/v1/factors',{method:'POST',token:who.tokens.access_token,body:{factor_type:'totp',friendly_name:'Salt Ordo',issuer:'Salt Ordo'}});
    return {id:factor.id,qr:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(factor.totp.qr_code)}`,secret:factor.totp.secret};
  }
  if(body.operation==='unenroll'){
    const auth=await verify(who,body);
    await upstream(`/auth/v1/factors/${uuid(body.factor_id)}`,{method:'DELETE',token:auth.access_token});
    await rpc('salt_crm_manage_sessions',{p_actor:who.user.id,p_current:who.id,p_operation:'revoke_others',p_target:null});
    const identity=await createSession(res,auth);
    await rpc('salt_crm_session',{p_operation:'delete',p_id:who.id,p_payload:{}});
    await rpc('salt_crm_security_event',{p_actor:who.user.id,p_action:'mfa_removed'});
    return identity;
  }
  throw new HttpError(400,'Неизвестное действие.');
}
export async function ownSessions(who, body, req, res) {
  if(req.method==='GET')return rpc('salt_crm_manage_sessions',{p_actor:who.user.id,p_current:who.id,p_operation:'list',p_target:null});
  if(req.method!=='POST'||!['revoke','revoke_others'].includes(body.operation))throw new HttpError(400,'Неизвестное действие.');
  await limit(res,`session-revoke:${who.user.id}`,5,60);
  return rpc('salt_crm_manage_sessions',{p_actor:who.user.id,p_current:who.id,p_operation:body.operation,p_target:uuid(body.id,true)});
}
