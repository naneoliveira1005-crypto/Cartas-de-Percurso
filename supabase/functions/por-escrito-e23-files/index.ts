import {inspectFile,MAX_BYTES} from './validation.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return response({error:'METODO_INVALIDO'},405);
 if(Number(req.headers.get('Content-Length')||0)>MAX_BYTES+65536)return response({error:'TAMANHO_INVALIDO'},413);
 const url=Deno.env.get('SUPABASE_URL')!;
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const serverHeaders={apikey:secret,Authorization:'Bearer '+secret};
 try{
  let token:string;let session_id:string;
  async function rpc(action:string,payload:Record<string,unknown>){
   const r=await fetch(url+'/rest/v1/rpc/e23_api',{method:'POST',headers:{apikey:'sb_publishable_n7giA7FAUqRmj1zv2JF8og_VQbjrxa7','Content-Type':'application/json'},body:JSON.stringify({p_token:token,p_action:action,p_payload:{session_id,...payload}})});
   if(!r.ok)throw Error('ACESSO_NEGADO');return await r.json();
  }
  if((req.headers.get('Content-Type')||'').startsWith('multipart/form-data')){
   const form=await req.formData();token=String(form.get('token')||'');session_id=String(form.get('session_id')||'');
   const experience_id=String(form.get('experience_id')||''),material_code=String(form.get('material_code')||''),kind=String(form.get('kind')||'');
   const permission=await rpc('file_prepare',{experience_id,material_code,kind});
   const file=form.get('file');if(!(file instanceof File))throw Error('ARQUIVO_INVALIDO');
   if(file.size>MAX_BYTES)throw Error('TAMANHO_INVALIDO');
   const bytes=new Uint8Array(await file.arrayBuffer()),mime=inspectFile(bytes,file.type,kind);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
   const path=permission.prefix+'/'+crypto.randomUUID();
   const upload=await fetch(url+'/storage/v1/object/por-escrito-e23/'+path,{method:'POST',headers:{...serverHeaders,'Content-Type':mime,'x-upsert':'false'},body:bytes});
   if(!upload.ok)throw Error('ARQUIVO_NAO_RECEBIDO');
   const record=await rpc('file_register',{experience_id,material_code,kind,path,name:file.name,mime,bytes:bytes.length,sha256:hash});
   return response({id:record.id,sha256:hash});
  }
  const data=await req.json();token=data.token;session_id=data.session_id;
  const file=await rpc('file_access',{file_id:data.file_id});
  const signed=await fetch(url+'/storage/v1/object/sign/'+file.bucket+'/'+file.path,{method:'POST',headers:{...serverHeaders,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:300})});
  if(!signed.ok)throw Error('ARQUIVO_INDISPONIVEL');
  const result=await signed.json();return response({url:url+'/storage/v1'+result.signedURL,name:file.name,mime:file.mime,expires_in:300});
 }catch(error){const code=error instanceof Error?error.message:'FALHA';const allowed=['ACESSO_NEGADO','ARQUIVO_INVALIDO','TAMANHO_INVALIDO','PDF_INVALIDO','AUDIO_INVALIDO','TRANSCRICAO_INVALIDA','TIPO_INVALIDO','ARQUIVO_NAO_RECEBIDO','ARQUIVO_INDISPONIVEL'];return response({error:allowed.includes(code)?code:'FALHA'},code==='ACESSO_NEGADO'?403:400);}
});
