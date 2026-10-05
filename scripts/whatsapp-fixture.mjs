// Local isolated test only. No production override or unsigned webhook bypass exists.
import {createHmac} from 'node:crypto';
import {payload,message} from '../tests/helpers/whatsapp.mjs';
const body=JSON.stringify(payload([message('fixture-'+Date.now())]));
const response=await fetch('http://localhost:5173/api/whatsapp/webhook',{method:'POST',headers:{'Content-Type':'application/json','X-Hub-Signature-256':'sha256='+createHmac('sha256','isolated-whatsapp-fixture-only').update(body).digest('hex')},body});
if(!response.ok)throw Error(`Local fixture failed: HTTP ${response.status}. Start npm run dev:isolated first.`);
console.log('Signed synthetic webhook processed by local isolated CRM. No production request was made.');
