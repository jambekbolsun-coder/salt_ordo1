// @ts-check
import { randomBytes } from 'node:crypto';
import { rpc,upstream } from './supabase.mjs';
import { HttpError,text,phone,uuid,attribution } from './validation.mjs';
import { limit,hash } from './security.mjs';
import { encryptToken,decryptToken } from './whatsapp-crypto.mjs';
import { validConsent } from '../shared/measurement.mjs';

export const waStore=(operation,payload={},actor=null)=>rpc('salt_crm_whatsapp',{p_operation:operation,p_payload:payload,p_actor:actor});
const fail=(code,message,status=400)=>Object.assign(new HttpError(status,message),{code});
export function waConfig(){
 const appId=process.env.META_APP_ID||'',configId=process.env.META_WHATSAPP_CONFIG_ID||'',version=process.env.WHATSAPP_GRAPH_API_VERSION||'';
 const ready=/^\d{5,30}$/.test(appId)&&/^\d{5,30}$/.test(configId)&&/^v\d+\.\d+$/.test(version)&&!!process.env.META_APP_SECRET&&!!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN&&Buffer.from(process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY||'','base64').length===32;
 return {ready,appId:ready?appId:null,configId:ready?configId:null,version:ready?version:null};
}
/** @param {string} path @param {{token?:string,method?:string,body?:Record<string,string>}} [options] */
export async function graph(path,{token,method='GET',body}={}){
 if(!/^v\d+\.\d+$/.test(process.env.WHATSAPP_GRAPH_API_VERSION||''))throw fail('CONFIG_REQUIRED','Заполните настройки Meta в Vercel.',503);
 let response,data;
 try{
  response=await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION}/${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/x-www-form-urlencoded'},body:body?new URLSearchParams(body).toString():undefined,signal:AbortSignal.timeout(12000),cache:'no-store',redirect:'error'});
  data=await response.json();
 }catch{throw fail('META_UNAVAILABLE','Meta временно недоступна. Повторите проверку соединения.',503)}
 if(!response.ok||data?.error){const n=Number(data?.error?.code);throw fail(n===190?'TOKEN_REVOKED':n===100?'META_INVALID_REQUEST':'META_REQUEST_FAILED',n===190?'Доступ Meta истёк или отозван. Подключите номер повторно.':'Meta не завершила операцию. Проверьте конфигурацию и разрешения приложения.',response.status>=500?503:400)}
 return data;
}
async function finishSync(who,connection){
 const token=decryptToken(connection.token_box,`connection:${connection.waba_id}:${connection.phone_id}`);
 try{
  const p=await graph(`${connection.phone_id}?fields=id,is_on_biz_app,platform_type,display_phone_number`,{token});
  if(p.is_on_biz_app!==true||p.platform_type!=='CLOUD_API'||phone(p.display_phone_number)!==connection.display_phone)throw fail('COEXISTENCE_UNAVAILABLE','Meta не подтвердила Coexistence для действующего номера. Регистрация или перенос номера не выполнялись.');
  const subscription=await graph(`${connection.waba_id}/subscribed_apps`,{token,method:'POST'});
  if(subscription.success!==true)throw fail('SUBSCRIPTION_FAILED','Meta не подтвердила подписку webhook.');
  await waStore('check_save',{webhook_subscribed:true},who.user.id);
  for(const kind of ['smb_app_state_sync','history']){
   if(connection.sync?.[kind])continue;
   if(connection.sync?.[`${kind}_requested_at`])throw fail('SYNC_UNCERTAIN','Meta не подтвердила предыдущий запрос синхронизации. Проверьте его состояние в Meta; автоматический повтор остановлен во избежание повторной операции.');
   await waStore('check_save',{sync:{[`${kind}_requested_at`]:new Date().toISOString()}},who.user.id);
   let sync;
   try {sync=await graph(`${connection.phone_id}/smb_app_data`,{token,method:'POST',body:{messaging_product:'whatsapp',sync_type:kind}})}
   catch(e){if(e.code!=='META_UNAVAILABLE')await waStore('check_save',{sync:{[`${kind}_requested_at`]:null}},who.user.id);throw e}
   if(!sync.request_id)throw fail('SYNC_NOT_CONFIRMED','Meta не подтвердила запуск синхронизации. Проверьте соединение.');
   await waStore('check_save',{sync:{[kind]:text(sync.request_id,300)},state:'syncing'},who.user.id);
  }
  await waStore('check_save',{state:'connected'},who.user.id);
 }catch(e){await waStore('check_save',{state:'error',error_code:e.code||'CONNECTION_FAILED'},who.user.id);throw e}
 return waStore('status',{},who.user.id);
}
export async function whatsappAdmin(who,body,req,res,params){
 if(!['owner','admin'].includes(who.staff.role))throw new HttpError(403,'Недостаточно прав.');
 if(req.method==='GET'){
  if(params.get('view')==='messages')return waStore('messages',{client_id:uuid(params.get('id')),offset:Math.max(0,Math.floor(Number(params.get('offset'))||0))},who.user.id);
  return {...await waStore('status',{},who.user.id),config:who.staff.role==='owner'?waConfig():{ready:false}};
 }
 if(req.method!=='POST')throw new HttpError(405,'Метод запрещён.');
 if(who.staff.role!=='owner')throw new HttpError(403,'Подключение WhatsApp доступно только владельцу.');
 await limit(res,`wa-owner:${who.user.id}`,5,60);
 if(body.action==='retry')return waStore('retry',{},who.user.id);
 if(!waConfig().ready)throw fail('CONFIG_REQUIRED','Для подключения заполните переменные Meta и WhatsApp в Vercel.',503);
 if(body.action==='prepare'){
  const state=randomBytes(32).toString('base64url');
  await waStore('prepare',{state_hash:hash(state),session_hash:who.id},who.user.id);
  return {state,expires_at:Date.now()+600000};
 }
 if(body.action==='check'){
  const c=await waStore('connection');if(!c||c.state==='disconnected')throw fail('RECONNECT_REQUIRED','Подключите WhatsApp через Meta.');
  return finishSync(who,c);
 }
 const state=text(body.state,43,true);if(!/^[\w-]{43}$/.test(state))throw fail('INVALID_STATE','Сеанс подключения истёк. Начните заново.');
 const binding={state_hash:hash(state),session_hash:who.id};
 if(body.action==='exchange'){
  const code=text(body.code,4096,true);
  await waStore('claim',binding,who.user.id);
  // POST form keeps the one-time code and app secret out of URLs/access logs.
  const data=await graph('oauth/access_token',{method:'POST',body:{client_id:process.env.META_APP_ID,client_secret:process.env.META_APP_SECRET,code}});
  if(typeof data.access_token!=='string'||data.access_token.length<20)throw fail('INVALID_CODE','Meta не вернула доступ. Начните подключение заново.');
  await waStore('exchange_save',{...binding,token_box:encryptToken(data.access_token,`signup:${binding.state_hash}`)},who.user.id);
  return {ok:true};
 }
 if(body.action==='complete'){
  if(body.event!=='FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING')throw fail('COEXISTENCE_REQUIRED','Разрешён только Coexistence для существующего приложения WhatsApp Business.');
  const waba=text(body.waba_id,30,true);if(!/^\d{5,30}$/.test(waba))throw fail('INCOMPLETE_SIGNUP','Meta не вернула аккаунт. Повторите подключение.');
  const box=await waStore('pending',binding,who.user.id);if(!box)throw fail('INCOMPLETE_SIGNUP','Авторизация Meta ещё не завершена.');
  const token=decryptToken(box,`signup:${binding.state_hash}`);
  const account=await graph(`${waba}?fields=id,name`,{token});if(account.id!==waba)throw fail('ACCOUNT_MISMATCH','Не удалось подтвердить выбранный аккаунт.');
  const settings=await upstream('/rest/v1/site_settings?select=whatsapp&limit=1',{token:who.tokens.access_token});
  const expected=phone(settings?.[0]?.whatsapp);
  let after='',selected=null;
  for(let page=0;page<20;page++){
   const list=await graph(`${waba}/phone_numbers?fields=id,display_phone_number,verified_name,is_on_biz_app,platform_type&limit=100${after?'&after='+encodeURIComponent(after):''}`,{token});
   selected=(list.data||[]).find(p=>{try{return phone(p.display_phone_number)===expected}catch{return false}});
   if(selected||!list.paging?.cursors?.after||!list.paging?.next)break;
   after=list.paging.cursors.after;
  }
  if(!selected||!/^\d{5,30}$/.test(selected.id)||selected.is_on_biz_app!==true||selected.platform_type!=='CLOUD_API')throw fail('COEXISTENCE_UNAVAILABLE','Выберите действующий номер из настроек Salt Ordo в режиме Coexistence. Тестовый номер и перенос не поддерживаются.');
  if(body.phone_number_id&&body.phone_number_id!==selected.id)throw fail('PHONE_MISMATCH','Выбран другой номер. Подключение не сохранено.');
  await waStore('connect',{...binding,waba_id:waba,phone_id:selected.id,display_phone:expected,business_name:text(selected.verified_name||account.name,200,true),token_box:encryptToken(token,`connection:${waba}:${selected.id}`)},who.user.id);
  return finishSync(who,await waStore('connection'));
 }
 throw fail('INVALID_ACTION','Неизвестное действие.');
}
export async function whatsappClick(body){
 const c=validConsent(body.consent)?body.consent:null;
 // No cross-page/session/ad identifiers without marketing consent. Per-click reference still works.
 const a=attribution(body.attribution,c?.marketing===true);
 const raw=text(body.page,500)||'/',page=raw.startsWith('/')&&!raw.startsWith('//')?raw.split(/[?#]/)[0]:'/';
 return waStore('click',{code:'SO-'+randomBytes(6).toString('hex').toUpperCase(),page,product:text(body.product,200),category:text(body.category,200),attribution:a,session_id:c?.marketing&&c?.analytics?uuid(body.session_id,true):null});
}
