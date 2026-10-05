import { request } from './crm.js';
let loading;
export function loadMetaSdk(config){
 if(window.FB){window.FB.init({appId:config.appId,version:config.version,cookie:false,xfbml:false,autoLogAppEvents:false});return Promise.resolve()}
 if(!loading)loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://connect.facebook.net/en_US/sdk.js';script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';
  const timeout=setTimeout(()=>{loading=null;script.remove();reject(new Error('Meta SDK не загрузился. Проверьте блокировщик и повторите.'))},15000);
  script.onload=()=>{clearTimeout(timeout);window.FB.init({appId:config.appId,version:config.version,cookie:false,xfbml:false,autoLogAppEvents:false});resolve()};
  script.onerror=()=>{clearTimeout(timeout);loading=null;script.remove();reject(new Error('Не удалось загрузить Meta SDK.'))};document.head.append(script);
 });return loading;
}
export function parseSignupEvent(event){
 if(!['https://www.facebook.com','https://web.facebook.com'].includes(event.origin)||!event.source||event.source===window)return null;
 try{const d=typeof event.data==='string'?JSON.parse(event.data):event.data;if(d?.type!=='WA_EMBEDDED_SIGNUP')return null;return d}catch{return null}
}
// Called synchronously in the user click handler, after SDK/state preparation.
export function startSignup(config,state,onStep,onDone,onError){
 let active=true,exchanged=false,finish=null,completing=false,timer;
 const clean=()=>{active=false;clearTimeout(timer);window.removeEventListener('message',message)};
 const fail=message=>{if(!active)return;clean();onError(message)};
 const complete=async()=>{
  if(!active||!exchanged||!finish||completing)return;completing=true;onStep('Подключение webhook');
  try{const result=await request('whatsapp',{action:'complete',state,event:finish.event,waba_id:finish.data?.waba_id,phone_number_id:finish.data?.phone_number_id});if(active){clean();onDone(result)}}catch(e){fail(e.message)}
 };
 const message=event=>{
  if(!active)return;const d=parseSignupEvent(event);if(!d)return;
  if(d.event==='FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'){finish=d;void complete()}
  else if(d.event==='CANCEL')fail('Подключение отменено. Номер не изменён.');
  else if(d.event==='ERROR')fail('Meta не завершила подключение. Проверьте поддержку Coexistence и настройки приложения.');
  else if(typeof d.event==='string'&&d.event.startsWith('FINISH'))fail('Meta вернула обычное подключение Cloud API. Разрешён только Coexistence; регистрация номера не выполнялась.');
 };
 window.addEventListener('message',message);timer=setTimeout(()=>fail('Окно Meta закрыто или время подключения истекло. Начните заново.'),600000);
 try{window.FB.login(response=>{
  if(!active)return;
  if(!response?.authResponse?.code){fail('Авторизация Meta отменена или завершена не полностью.');return}
  onStep('Выбор номера');
  // Transfer immediately. Code never enters React state, storage, cookies or URLs.
  const pending=request('whatsapp',{action:'exchange',state,code:response.authResponse.code});delete response.authResponse.code;
  pending.then(()=>{exchanged=true;void complete()}).catch(e=>fail(e.message));
 },{config_id:config.configId,response_type:'code',override_default_response_type:true,state,extras:{setup:{},featureType:'whatsapp_business_app_onboarding',sessionInfoVersion:'3'}})}catch{fail('Не удалось открыть Meta. Разрешите всплывающее окно и повторите.')}
 return clean;
}
