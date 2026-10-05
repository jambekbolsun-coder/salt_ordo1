import { createServer } from 'vite'
import handler from '../api/index.mjs'
import webhook from '../api/whatsapp/webhook.mjs'
process.env.NODE_ENV='development'
const vite=await createServer({plugins:[{name:'local-crm-api',configureServer(server){server.middlewares.use('/api/index',(req,res)=>handler(req,res));server.middlewares.use('/api/whatsapp/webhook',(req,res)=>webhook(req,res))}}]})
await vite.listen()
vite.printUrls()
