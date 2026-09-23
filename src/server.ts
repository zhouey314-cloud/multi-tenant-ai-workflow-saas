import {createServer} from 'node:http';
import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {seed,login,visibleKnowledge,visibleTasks,visibleAudit,transition,createKnowledge,createTask} from './core.js';
const path=resolve(process.env.DEMO_DB??'data/live.json');
let db=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):seed();
function save(){writeFileSync(path+'.tmp',JSON.stringify(db,null,2));renameSync(path+'.tmp',path);}
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const browserApp=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const browserCore=readFileSync(new URL('./core.js',import.meta.url),'utf8');
createServer(async(req,res)=>{try{
 if(req.url==='/'&&req.method==='GET'){res.writeHead(302,{location:'/web/index.html'});res.end();return;}
 if(req.url==='/web/index.html'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);return;}
 if(req.url==='/web/app.js'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8'});res.end(browserApp);return;}
 if(req.url==='/src/core.js'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8'});res.end(browserCore);return;}
 if(!req.url?.startsWith('/api/')){res.writeHead(404);res.end();return;}
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>100000)throw Error('TOO_LARGE');}const input=raw?JSON.parse(raw):{};
 const a=login(String(req.headers['x-demo-user']??''),String(req.headers['x-demo-password']??''));if(!a)throw Error('DEMO_LOGIN_REQUIRED');
 let result:unknown;
 if(req.url==='/api/overview'&&req.method==='GET')result={actor:a,knowledge:visibleKnowledge(db,a),tasks:visibleTasks(db,a),audit:visibleAudit(db,a)};
 else if(req.url==='/api/knowledge'&&req.method==='POST'){result=createKnowledge(db,a,input);save();}
 else if(req.url==='/api/tasks'&&req.method==='POST'){result=createTask(db,a,input);save();}
 else if(req.url?.startsWith('/api/tasks/')&&req.method==='POST'){result=transition(db,a,req.url.split('/')[3],input.to);save();}
 else {res.writeHead(404);res.end();return;}
 res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(result));
 }catch(e){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({error:(e as Error).message}));}}).listen(8788,'127.0.0.1',()=>console.log('Synthetic demo http://localhost:8788'));
