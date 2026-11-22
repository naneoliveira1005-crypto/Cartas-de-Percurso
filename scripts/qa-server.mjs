// Servidor local de QA. Nunca é usado no site publicado. Encaminha apenas contas TESTE.
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
const context=JSON.parse(await fs.readFile(process.env.E23_TEST_CREDENTIALS||path.resolve('../private-backup/e23-test-credentials.json'),'utf8'))[process.env.E23_QA_SESSION||'homologacao'];
const base='https://zpsjuxusydfbptjotyxo.supabase.co';
const key='sb_publishable_n7giA7FAUqRmj1zv2JF8og_VQbjrxa7';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const dir=path.resolve('dist');
http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/qa-api'||u.pathname==='/qa-files'){
  if(req.method!=='POST'){res.writeHead(405);res.end();return;}
  const buffers=[];let size=0;for await(const b of req){size+=b.length;if(size>27*1024*1024)throw Error('limit');buffers.push(b);}const bytes=Buffer.concat(buffers);
  if(!(req.headers['content-type']||'').includes('application/json'))throw Error('JSON only in QA');
  const data=JSON.parse(bytes.toString()),actor=context.actors[data.p_token||data.token];if(!actor)throw Error('unknown test role');
  if(u.pathname==='/qa-api'){data.p_token=actor.token;data.p_payload={...data.p_payload,session_id:context.session_id};}
  else{data.token=actor.token;data.session_id=context.session_id;}
  const response=await fetch(base+(u.pathname==='/qa-api'?'/rest/v1/rpc/e23_api':'/functions/v1/por-escrito-e23-files'),{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(data)});
  const responseBody=await response.text();res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(responseBody);return;
 }
 if(u.pathname==='/qa.html'){
  const profile=u.searchParams.get('profile')||'admin';if(!context.actors[profile])throw Error('unknown test role');
  let html=await fs.readFile(path.join(dir,'e23.html'),'utf8');
  html=html.replace('<script type="module"',`<script>window.POR_ESCRITO_QA=${JSON.stringify({profile})}</script><script type="module"`);
  res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(html);return;
 }
 const target=path.resolve(dir,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!target.startsWith(dir+path.sep))throw Error('path');
 const content=await fs.readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
 }catch{if(res.headersSent){res.end();return;}res.writeHead(404,{'Content-Type':'text/plain'});res.end('Indisponível no ambiente de QA.');}
}).listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('QA local iniciado; somente contas de homologação.'));
