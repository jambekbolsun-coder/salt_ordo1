import { call,actor } from './database.mjs';
import { normalizeWebhook } from '../../server/whatsapp-payload.mjs';
export const wa=(db,op,payload={},user=actor)=>call(db,'salt_crm_whatsapp',{p_operation:op,p_payload:payload,p_actor:user});
export const message=(id='wamid.synthetic',extra={})=>({from:'996900555111',id,timestamp:String(Math.floor(Date.now()/1000)),type:'text',text:{body:'Синтетическое сообщение'},...extra});
export const payload=(messages,field='messages',extra={})=>({object:'whatsapp_business_account',entry:[{id:'123456789',changes:[{field,value:{metadata:{phone_number_id:'987654321',display_phone_number:'996998992996'},contacts:[{wa_id:'996900555111',profile:{name:'Синтетический WhatsApp'}}],[field==='smb_message_echoes'?'message_echoes':'messages']:messages,...extra}}]}]});
export async function connection(db){await db.exec(`insert into salt_crm.whatsapp_connection(waba_id,phone_id,display_phone,business_name,token_box,state) values('123456789','987654321','+996998992996','Изолированный тест','{}','connected') on conflict(id) do nothing`)}
export async function deliver(db,data){const keys=await wa(db,'enqueue',{events:normalizeWebhook(data)},null);return wa(db,'process',{keys},null)}
