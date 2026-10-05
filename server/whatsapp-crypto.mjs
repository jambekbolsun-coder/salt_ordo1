// @ts-check
import { createCipheriv,createDecipheriv,randomBytes,createHmac,timingSafeEqual } from 'node:crypto';
import { HttpError } from './validation.mjs';
function key(){const k=Buffer.from(process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY||'','base64');if(k.length!==32)throw new HttpError(503,'Ключ шифрования WhatsApp не настроен.');return k}
/** @param {string} token @param {string} context */
export function encryptToken(token,context){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);c.setAAD(Buffer.from(context));const ciphertext=Buffer.concat([c.update(token,'utf8'),c.final()]);return {version:1,iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}}
/** @param {{version:number,iv:string,tag:string,ciphertext:string}} box @param {string} context */
export function decryptToken(box,context){try{const c=createDecipheriv('aes-256-gcm',key(),Buffer.from(box.iv,'base64'));c.setAAD(Buffer.from(context));c.setAuthTag(Buffer.from(box.tag,'base64'));return Buffer.concat([c.update(Buffer.from(box.ciphertext,'base64')),c.final()]).toString('utf8')}catch{throw new HttpError(503,'Не удалось прочитать подключение WhatsApp. Обратитесь к владельцу.')}}
/** @param {string|null|undefined} a @param {string|null|undefined} b */
export function equalSecret(a,b){const aa=Buffer.from(a||''),bb=Buffer.from(b||'');return aa.length>0&&aa.length===bb.length&&timingSafeEqual(aa,bb)}
/** @param {Buffer} raw @param {string|undefined} signature @param {string|undefined} secret */
export function validSignature(raw,signature,secret){if(!secret||!/^sha256=[a-f0-9]{64}$/.test(signature||''))return false;return equalSecret(signature,'sha256='+createHmac('sha256',secret).update(raw).digest('hex'))}
