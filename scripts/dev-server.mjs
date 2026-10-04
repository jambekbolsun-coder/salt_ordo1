import { createServer } from 'vite'
import handler from '../api/index.mjs'
process.env.NODE_ENV='development'
const vite=await createServer({plugins:[{name:'local-crm-api',configureServer(server){server.middlewares.use('/api/index',(req,res)=>handler(req,res))}}]})
await vite.listen()
vite.printUrls()
