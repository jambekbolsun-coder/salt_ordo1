// Test-only process. Never imported by the application, build or Vercel function.
import { createServer } from 'vite';
import { database,seed } from '../tests/helpers/database.mjs';
import { transport } from '../tests/helpers/transport.mjs';
import handler from '../api/index.mjs';
import webhook from '../api/whatsapp/webhook.mjs';
import { connection,deliver,payload,message } from '../tests/helpers/whatsapp.mjs';
const db=await database();await seed(db,10000);transport(db);
for(const key of ['META_APP_ID','META_WHATSAPP_CONFIG_ID','WHATSAPP_TOKEN_ENCRYPTION_KEY','WHATSAPP_GRAPH_API_VERSION'])delete process.env[key];
process.env.META_APP_SECRET='isolated-whatsapp-fixture-only';
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN='isolated-whatsapp-fixture-only';
await connection(db);await deliver(db,payload([message('isolated-incoming',{from:'996900000001',referral:{source_type:'ad',source_id:'1234567'},text:{body:'Синтетическое сообщение для проверки интерфейса'}})]));await deliver(db,payload([message('isolated-echo',{from:'996998992996',to:'996900000001',text:{body:'Синтетический ответ с телефона'}})],'smb_message_echoes'));
const vite=await createServer({envDir:false,define:{'import.meta.env.VITE_SALT_SUPABASE_URL':JSON.stringify('http://localhost:5173'),'import.meta.env.VITE_SALT_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('isolated-test-only')},plugins:[{name:'isolated-crm',configureServer(server){
 server.middlewares.use('/api/index',(req,res)=>handler(req,res));
 server.middlewares.use('/api/whatsapp/webhook',(req,res)=>webhook(req,res));
 server.middlewares.use('/rest/v1',(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end('[]')});
}}]});
await vite.listen();vite.printUrls();console.log('ISOLATED PGLITE: 10000 synthetic clients; owner@example.invalid / Isolated-test-2026!; external server requests blocked');
process.on('SIGINT',async()=>{await vite.close();await db.close();process.exit(0)});
