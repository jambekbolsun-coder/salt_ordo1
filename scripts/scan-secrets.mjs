import { execFileSync } from 'node:child_process';
import { readFileSync,existsSync,readdirSync } from 'node:fs';
import { join } from 'node:path';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:128*1024*1024});
const rules=[
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
 ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/],
 ['supabase-secret',/\b(?:sb_secret_[A-Za-z0-9_-]{20,}|sbp_[a-f0-9]{35,})\b/],
 ['cloud-access-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
 ['database-password',/postgres(?:ql)?:\/\/[^\s:'"/]+:[^\s'"@${}<>]{8,}@/],
 ['secret-assignment',/(?:SALT_SESSION_KEY|SALT_GATEWAY_SECRET|SALT_META_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["']?[A-Za-z0-9+/_-]{32,}/],
];
const known=[];
// Optional local check against actual server secrets, without printing them.
if(existsSync('.env.local'))for(const line of readFileSync('.env.local','utf8').split(/\r?\n/)){const [name,...rest]=line.split('=');if(/SECRET|TOKEN|SESSION_KEY/.test(name)){const value=rest.join('=').trim().replace(/^["']|["']$/g,'');if(value.length>=20)known.push(value)}}
let checked=0;const findings=[];
function scan(content,path){
 checked++;
 for(const [rule,pattern] of rules)if(pattern.test(content))findings.push({path,rule});
 if(known.some(value=>content.includes(value)))findings.push({path,rule:'configured-server-secret'});
 for(const match of content.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g))try{const claims=JSON.parse(Buffer.from(match[0].split('.')[1],'base64url').toString());if(claims.role==='service_role')findings.push({path,rule:'service-role-jwt'})}catch{/* Non-JWT text. */}
}
for(const path of git('ls-files').trim().split('\n'))if(path&&existsSync(path)&&!path.endsWith('package-lock.json'))scan(readFileSync(path,'utf8'),path);
for(const line of git('rev-list','--objects','--all').trim().split('\n')){const space=line.indexOf(' ');if(space<0)continue;const oid=line.slice(0,space),path=line.slice(space+1);if(!/\.(?:[cm]?[jt]sx?|json|sql|md|ya?ml|toml|env|txt|sh|ps1)$|(?:^|\/)\.env/.test(path)||path.endsWith('package-lock.json'))continue;if(git('cat-file','-t',oid).trim()!=='blob')continue;scan(git('cat-file','-p',oid),`history:${oid.slice(0,8)}:${path}`)}
function walk(folder){for(const f of readdirSync(folder,{withFileTypes:true})){const p=join(folder,f.name);if(f.isDirectory())walk(p);else if(/\.(?:js|html|css|json)$/.test(p))scan(readFileSync(p,'utf8'),p)}}
if(existsSync('dist'))walk('dist');
console.log(JSON.stringify({checked,findings},null,2));if(findings.length)process.exitCode=1;
