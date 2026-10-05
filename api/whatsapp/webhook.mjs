// @ts-check
import { HttpError } from '../../server/validation.mjs';
import { limit,ipKey } from '../../server/security.mjs';
import { equalSecret,validSignature } from '../../server/whatsapp-crypto.mjs';
import { normalizeWebhook } from '../../server/whatsapp-payload.mjs';
import { waStore } from '../../server/whatsapp.mjs';
import { reportError } from '../../server/monitoring.mjs';
export const config={api:{bodyParser:false}};
export const maxDuration=60;
/** @param {import('node:http').IncomingMessage & {body?:unknown}} req @returns {Promise<Buffer>} */
export async function rawBody(req){
 const max=1024*1024;
 if(Number(req.headers['content-length'])>max)throw new HttpError(413,'Payload too large');
 if(req.body!==undefined){if(!Buffer.isBuffer(req.body)&&typeof req.body!=='string')throw new HttpError(400,'Raw body required');const raw=Buffer.from(req.body);if(raw.length>max)throw new HttpError(413,'Payload too large');return raw}
 let length=0;const parts=[];for await(const part of req){const b=Buffer.from(part);length+=b.length;if(length>max)throw new HttpError(413,'Payload too large');parts.push(b)}return Buffer.concat(parts);
}
/** @param {import('node:http').IncomingMessage & {body?:unknown}} req @param {import('node:http').ServerResponse} res */
export default async function webhook(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(!['GET','POST'].includes(req.method))throw new HttpError(405,'Method not allowed');
  await limit(res,`wa-hook:${ipKey(req)}`,10,1);
  if(req.method==='GET'){
   const p=new URL(req.url,'https://local.invalid').searchParams;
   if(!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN)throw new HttpError(503,'Not configured');
   if(p.get('hub.mode')!=='subscribe'||!equalSecret(p.get('hub.verify_token'),process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN)||!/^\d{1,100}$/.test(p.get('hub.challenge')||''))throw new HttpError(403,'Verification failed');
   res.setHeader('Content-Type','text/plain');return res.end(p.get('hub.challenge'));
  }
  if(!process.env.META_APP_SECRET)throw new HttpError(503,'Not configured');
  const raw=await rawBody(req);
  const signature=req.headers['x-hub-signature-256'];
  if(typeof signature!=='string'||!validSignature(raw,signature,process.env.META_APP_SECRET))throw new HttpError(401,'Invalid signature');
  let data;try{data=JSON.parse(raw.toString('utf8'))}catch{throw new HttpError(400,'Invalid JSON')}
  const events=normalizeWebhook(data);
  let chunk=[],size=0;
  const processChunk=async()=>{if(!chunk.length)return;const keys=await waStore('enqueue',{events:chunk});const r=await waStore('process',{keys});if(r.failed)throw new HttpError(503,'Processing retry required');chunk=[];size=0};
  for(const event of events){const n=Buffer.byteLength(JSON.stringify(event));if(size+n>45000||chunk.length>=50)await processChunk();chunk.push(event);size+=n}
  await processChunk();res.setHeader('Content-Type','application/json');return res.end('{"ok":true}');
 }catch(e){const status=e instanceof HttpError?e.status:503;await reportError('whatsapp-webhook',status);res.statusCode=status;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:status===503?'Service unavailable':status===429?'Too many requests':'Webhook rejected'}))}
}
