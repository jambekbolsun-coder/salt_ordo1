// Test-only process. Never imported by the application, build or Vercel function.
import { createServer } from 'vite';
import { database,seed } from '../tests/helpers/database.mjs';
import { transport } from '../tests/helpers/transport.mjs';
import handler from '../api/index.mjs';
const db=await database();await seed(db,10000);transport(db);
const vite=await createServer({envDir:false,define:{'import.meta.env.VITE_SALT_SUPABASE_URL':JSON.stringify('http://localhost:5173'),'import.meta.env.VITE_SALT_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('isolated-test-only')},plugins:[{name:'isolated-crm',configureServer(server){
 server.middlewares.use('/api/index',(req,res)=>handler(req,res));
 server.middlewares.use('/rest/v1',(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end('[]')});
}}]});
await vite.listen();vite.printUrls();console.log('ISOLATED PGLITE: 10000 synthetic clients; owner@example.invalid / Isolated-test-2026!; external server requests blocked');
process.on('SIGINT',async()=>{await vite.close();await db.close();process.exit(0)});
