// @ts-check
import { createHash } from 'node:crypto';
import { HttpError } from './validation.mjs';

const str=(v,n=250)=>typeof v==='string'?v.slice(0,n):'';
const arr=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
const id=v=>/^\d{5,30}$/.test(String(v||''))?String(v):'';
export const waPhone=v=>/^\+?[1-9]\d{7,14}$/.test(String(v||''))?'+'+String(v).replace(/^\+/,''):null;
const at=v=>{const n=Number(v);return Number.isFinite(n)&&n>946684800&&n<Date.now()/1000+86400?new Date(n*1000).toISOString():null};
export const stable=v=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(stable(x))):Object.fromEntries(Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>[k,JSON.parse(stable(v[k]))])):v??null);
export const digest=v=>createHash('sha256').update(typeof v==='string'?v:stable(v)).digest('hex');
function url(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.toString().slice(0,2000):''}catch{return ''}}
export function referral(value){
 const out={};
 for(const k of ['ctwa_clid','source_id','source_type','headline','body','media_type'])if(typeof value?.[k]==='string')out[k]=str(value[k],k==='body'?2000:500);
 for(const k of ['source_url','image_url','video_url','thumbnail_url'])if(value?.[k])out[k]=url(value[k]);
 return out;
}
function content(m){
 const type=str(m.type,50)||'unknown', media=m[type]||{};
 let text=str(m.text?.body,4096)||str(media.caption,4096), details={};
 if(['image','video','audio','document','sticker'].includes(type)){
  details={media_id:str(media.id),mime_type:str(media.mime_type,150),filename:str(media.filename),sha256:str(media.sha256,100)};
 }else if(type==='location'){
  if(Number.isFinite(media.latitude)&&Number.isFinite(media.longitude)&&Math.abs(media.latitude)<=90&&Math.abs(media.longitude)<=180)details={latitude:media.latitude,longitude:media.longitude,name:str(media.name),address:str(media.address,500)};
 }else if(type==='contacts'){
  details={contacts:arr(m.contacts).slice(0,20).map(c=>({name:str(c.name?.formatted_name,150),phones:arr(c.phones).slice(0,5).map(p=>({phone:str(p.phone,30),type:str(p.type,30)}))}))};
 }else if(type==='interactive'){
  const reply=media.button_reply||media.list_reply||media.nfm_reply||{};
  text=str(reply.title||reply.body,4096);details={reply_id:str(reply.id),description:str(reply.description,1000),response_json:str(reply.response_json,4000)};
 }else if(type==='button'){text=str(media.text,4096);details={payload:str(media.payload,1000)}}
 return {type,text,details};
}
/** Normalize untrusted Meta payload; never retain the full raw webhook. */
export function normalizeWebhook(payload){
 if(payload?.object!=='whatsapp_business_account'||!Array.isArray(payload.entry)||payload.entry.length>50)throw new HttpError(400,'Некорректный webhook.');
 const events=[];
 const add=e=>{events.push({...e,key:digest(e.kind==='message'?`${e.waba_id}:${e.phone_id}:message:${e.message_id}`:e)});if(events.length>1000)throw new HttpError(413,'Слишком много событий.')};
 for(const entry of payload.entry){
  const waba_id=id(entry?.id);if(!waba_id)throw new HttpError(400,'Некорректный аккаунт.');
  for(const change of arr(entry.changes)){
   const v=change?.value||{},field=str(change?.field,60),phone_id=id(v.metadata?.phone_number_id),base={waba_id,phone_id};
   if(field==='account_update'){add({...base,kind:'account',event:str(v.event,80),reason:str(v.disconnection_info?.reason,100)});continue}
   if(!phone_id)continue;
   const contacts=arr(v.contacts);
   const message=(m,history=false,thread='')=>{
    const outgoing=field==='smb_message_echoes'||!!m.to||(history&&waPhone(m.from)===waPhone(v.metadata?.display_phone_number));
    const phone=waPhone(outgoing?(m.to||thread):m.from), occurred_at=at(m.timestamp);
    if(!phone||!occurred_at){add({...base,kind:'error',code:'INVALID_MESSAGE',fingerprint:digest(m)});return}
    const message_id=str(m.id,300)||'hash:'+digest({waba_id,phone_id,m}),c=content(m),ref=referral(m.referral);
    add({...base,kind:'message',message_id,phone,wa_id:str(outgoing?(m.to||thread):m.from,30),full_name:str(contacts.find(x=>waPhone(x.wa_id)===phone)?.profile?.name,150),occurred_at,direction:outgoing?'out':'in',history,...c,referral:ref,context_id:str(m.context?.id,300),error_codes:arr(m.errors).map(x=>str(String(x.code),30)).slice(0,10)});
   };
   if(field==='messages'||field==='smb_message_echoes'){
    for(const m of arr(field==='smb_message_echoes'?v.message_echoes:v.messages))message(m);
    for(const s of arr(v.statuses))if(str(s.id,300)&&at(s.timestamp))add({...base,kind:'status',message_id:str(s.id,300),status:str(s.status,30),occurred_at:at(s.timestamp),error_codes:arr(s.errors).map(e=>str(String(e.code),30)).slice(0,10)});
   }else if(field==='history'){
    for(const h of arr(v.history)){
     for(const thread of arr(h.threads))for(const m of arr(thread.messages))message(m,true,thread.id);
     add({...base,kind:'history',phase:Number(h.metadata?.phase)||0,progress:Math.min(100,Math.max(0,Number(h.metadata?.progress)||0)),error_codes:arr(h.errors).map(e=>str(String(e.code),30)).slice(0,10)});
    }
    for(const m of arr(v.messages))message(m,true);
   }else if(field==='smb_app_state_sync'){
    for(const s of arr(v.state_sync))if(s.type==='contact'&&waPhone(s.contact?.phone_number))add({...base,kind:'contact',phone:waPhone(s.contact.phone_number),full_name:str(s.contact.full_name||s.contact.first_name,150),action:str(s.action,30),occurred_at:at(s.metadata?.timestamp)});
   }else add({...base,kind:'ignored',field});
   for(const e of arr(v.errors))add({...base,kind:'error',code:str(String(e.code),30)});
  }
 }
 return events;
}
